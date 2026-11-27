// The arcade flight model: thrust, lift from angle of attack, stall, banked turns
// and weathervaning, with no physics library. It is deliberately forgiving — a
// propeller tour plane, not a simulator — but the numbers still bite: fly slow and
// the nose drops, bank hard and the turn tightens, climb at full throttle and the
// speed bleeds away. Pure maths in, plain state out; nothing here knows about
// Three.js, the screen or sound.

import { COURSE, PLANE } from './config.js';

export const EVENT_CRASH = 1;
export const EVENT_LAND = 2;
export const EVENT_FUEL_EMPTY = 4;

const TWO_PI = Math.PI * 2;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Normalise an angle to [-PI, PI]. */
export function wrapAngle(a) {
  while (a > Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

/** Forward unit vector for a yaw/pitch pair. Yaw 0 faces -Z (north), yaw grows east. */
export function forwardOf(yaw, pitch) {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
}

/** Compass heading in degrees, 0 = north, 90 = east, from a yaw angle. */
export function headingOf(yaw) {
  return ((yaw * 180 / Math.PI) % 360 + 360) % 360;
}

/**
 * v24: the final-approach pull-up assist (pure) — how hard the onFinal
 * helper in main.js should pull the nose up (0..1). It fires only
 * while the plane is DESCENDING (vs < 0) with the ground ahead close
 * below (clearance < 25 m): the bias grows as the clearance shrinks
 * and as the descent steepens, so a steep dive at the ridge gets a
 * full pull-up while a level final gets nothing. It never pushes the
 * nose down and never fires while climbing. `groundAhead` is the
 * terrain height ~150 m ahead along the nose (sampled by main.js).
 * REVISION (v24 final, headless test 39): dive at 10 m clearance,
 * VS -14 → 1.00; same dive 40 m up → 0; climbing → 0; gentle descent
 * at 20 m clearance, VS -5 → 0.17. The law is exactly as designed —
 * full pull-up only when it is needed, nothing otherwise.
 */
export function finalAssistPullUp(y, vs, groundAhead) {
  if (vs >= 0) return 0;
  const clearance = y - groundAhead;
  if (clearance >= 25) return 0;
  const proximity = Math.min(1, (25 - clearance) / 15);
  const descent = Math.min(1, -vs / 10);
  return proximity * descent;
}

export function createFlight(spawn) {
  const state = {
    x: spawn.x,
    y: spawn.y,
    z: spawn.z,
    yaw: spawn.yaw,
    pitch: 0,
    roll: 0,
    speed: spawn.speed,
    throttle: spawn.throttle,
    fuel: 1,
    // v17: chase boost for the collision pair (rivals.js) — a boosted
    // rival flies ~120 m/s and can catch a fast straight player. The
    // sim never sets these, so the flight model is untouched there.
    maxSpeedBoost: 0,
    thrustBoost: 1,
    status: 'flying',
    stalled: false,
    verticalSpeed: 0,
    // v22 auto-win (user 27 Nov 15:09 WIB — REPLACES the v22 P0/Gemini
    // touchdown tiers): how the run ended — 'autoland' (the autopilot
    // landing after the win triggered over the runway). main.js
    // reads it for the results panel; null while flying / after a crash.
    landingKind: null,
    // v22 auto-win: after all 12 rings, crossing into the Runway 09
    // corridor IS the win — no manual touchdown, no speed/VS/pitch
    // thresholds. autoLanding is set the moment the plane enters the
    // corridor; from then on step() ignores the player's input and
    // flies the autopilot landing (descent + flare + rollout).
    // rollingOut is set at the first ground contact during the
    // autopilot landing — the plane is pinned to the deck, bleeding
    // speed, and can never crash. main.js reads autoLanding for the
    // FINISH toast and the approach pill.
    autoLanding: false,
    rollingOut: false,
    // v22 Gemini: the last touchdown's full telemetry — speed, VS,
    // pitch, roll, throttle, runway coords, branch (WIN / CRASH)
    // + reason — logged on EVERY ground contact, so automated and
    // manual runs can verify the landing decision instead of
    // guessing from the outcome. Null until the first ground contact.
    touchdown: null,
    elapsed: 0,
    ringsPassed: 0,
    streak: 0,
    score: 0,
    lastBonus: 0,
    message: '',
  };
  let fuelWarned = false;

  function reset(spawnPoint) {
    state.x = spawnPoint.x;
    state.y = spawnPoint.y;
    state.z = spawnPoint.z;
    state.yaw = spawnPoint.yaw;
    state.pitch = 0;
    state.roll = 0;
    state.speed = spawnPoint.speed;
    state.throttle = spawnPoint.throttle;
    state.fuel = 1;
    state.maxSpeedBoost = 0;
    state.thrustBoost = 1;
    state.status = 'flying';
    state.stalled = false;
    state.verticalSpeed = 0;
    state.landingKind = null;
    state.autoLanding = false;
    state.rollingOut = false;
    state.touchdown = null;
    state.elapsed = 0;
    state.ringsPassed = 0;
    state.streak = 0;
    state.score = 0;
    state.lastBonus = 0;
    state.message = '';
    fuelWarned = false;
  }

  /**
   * One fixed step. `input` carries pitch/roll/yaw/throttle in [-1, 1].
   * `groundAt(x, z)` is the terrain height; `runway` describes the landing strip
   * (or null when the plane is nowhere near it). Returns EVENT_* flags.
   */
  function step(dt, input, groundAt, runway) {
    if (state.status !== 'flying') return 0;
    let events = 0;
    state.elapsed += dt;
    // prevY is the position at the END of the previous step —
    // captured HERE, before anything in this step moves the plane.
    // The stall sink below drops y before the integration, so
    // capturing prevY after it would read a y that already sank
    // (stall sink 0.041/frame > the frame's whole descent
    // 0.018/frame) and verticalSpeed would read wrong.
    const prevY = state.y;

    // v22 auto-win (user 27 Nov 15:09 WIB + clarification 15:11):
    // after all 12 rings, crossing into the Runway 09 corridor IS
    // the win — no manual touchdown, no speed/VS/pitch thresholds.
    // The user's own report: the PLAYER's plane never exploded;
    // the explosions were the other teams' planes (scripted race
    // crashes), but the win never triggered. So the win is now a
    // POSITION check, not a touchdown check: the moment the plane
    // is over the runway asphalt (|dx| < 250 m, |lat| <
    // COURSE.winCorridorLat — v24: 40 m, was 24), the autopilot
    // takes over and the plane lands itself. Checked HERE, before any
    // input is applied, so the autopilot owns the very first frame
    // inside the corridor. The '[win]' log line is the telemetry
    // the tests and the probe assert on (the touchdown branch WIN
    // is recorded again at the touchdown, below).
    if (!state.autoLanding && runway !== null && state.ringsPassed >= COURSE.ringCount
      && Math.abs(state.x - runway.x) < COURSE.runwayLength / 2 + 25
      && Math.abs(state.z - runway.z) < COURSE.winCorridorLat) {
      state.autoLanding = true;
      console.log('[win] ' + JSON.stringify({
        t: +state.elapsed.toFixed(1),
        x: Math.round(state.x), y: Math.round(state.y), z: Math.round(state.z),
        dx: Math.round(state.x - runway.x), lat: Math.round(state.z - runway.z),
        speed: +state.speed.toFixed(1), rings: state.ringsPassed,
      }));
    }

    // v22 auto-win: while the autopilot owns the plane, the player's
    // input is REPLACED by the synthesized autoland input — a VS-hold
    // pitch law (-9 m/s above 60 m AGL, -7 below 60 m, flaring to
    // -2.5 for the last 12 m). STEEP on purpose, and measured, not
    // guessed: the gentle -6/-5/-1.5 descent floats the plane at low
    // speed (stall mush + a long -1.5 flare = 8 s at ~25 m/s) and the
    // baseline touched down 779 m past the strip; at -9/-7/-2.5 the
    // same profile touches down 279 m past it. (The "gift of diving"
    // adds speed, but the much shorter time aloft wins by ~500 m.)
    // Plus a heading-hold + cross-track roll law. Throttle is idle
    // the whole way down. Once the wheels are on the deck
    // (rollingOut) the input goes neutral, so the auto-level holds
    // the wings flat and the speed bleeds off. The parameter `input`
    // is reassigned to the effective input, so the rest of the step
    // body is untouched.
    if (state.autoLanding) {
      if (state.rollingOut || runway === null) {
        input = { pitch: 0, roll: 0, yaw: 0, throttle: -1, stickRoll: 0, stickPitch: 0 };
      } else {
        const gHere = groundAt(state.x, state.z);
        const agl = state.y - Math.max(gHere, 0.6);
        const targetVS = agl < 12 ? -2.5 : agl < 60 ? -7 : -9;
        const alPitch = clamp((targetVS - state.verticalSpeed) * 0.05, -1, 1);
        // Heading-hold + cross-track (NOT a far steering point: a
        // point 500 m past the centre FLIPS the heading error once
        // the plane flies past it while still descending, and the
        // first autoland build touched down banked -0.8 rad turning
        // back toward it). The runway heading never flips, so the
        // wings stay level all the way to the deck.
        const rwyHeading = Math.atan2(runway.dirX, -runway.dirZ);
        const herr = wrapAngle(rwyHeading - state.yaw);
        const lat = -(state.x - runway.x) * runway.dirZ + (state.z - runway.z) * runway.dirX;
        const alRoll = clamp(-state.roll * 2 - lat * 0.01 + herr * 1.5, -1, 1);
        input = { pitch: alPitch, roll: alRoll, yaw: 0, throttle: -1, stickRoll: alRoll, stickPitch: alPitch };
      }
    }

    // Throttle and fuel. An empty tank means the engine is out: glide, don't climb.
    state.throttle = clamp(state.throttle + input.throttle * PLANE.throttleRate * dt, 0, 1);
    if (state.fuel > 0) {
      state.fuel = Math.max(0, state.fuel - state.throttle * dt / PLANE.fuelSeconds);
      if (state.fuel === 0 && !fuelWarned) {
        fuelWarned = true;
        events |= EVENT_FUEL_EMPTY;
      }
    }
    const thrust = state.fuel > 0 ? state.throttle * PLANE.thrust * (state.thrustBoost || 1) : 0;

    // How much authority the stick has: mushy below stall speed, full above it.
    const authority = clamp(state.speed / PLANE.stallSpeed, 0.35, 1);
    state.pitch = clamp(state.pitch + input.pitch * PLANE.pitchRate * authority * dt, -1.1, 1.1);
    state.roll = clamp(state.roll + input.roll * PLANE.rollRate * authority * dt, -1.35, 1.35);
    // v17: the auto-level gate reads the RAW stick (stickRoll), not the
    // gust-augmented roll. The live-play gust (main.js) adds a small
    // roll offset to the stick, so input.roll was never exactly 0 in
    // live play — the wings never levelled, the gust's integral banked
    // the plane ~4-8° right on average, and it turned right ~10°/s with
    // no input at all (v16 live playtest: a full 360° in ~36 s, 0/12
    // rings). main.js passes stickRoll; the sim never sets it, so the
    // sim keeps the exact old check (input.roll === 0).
    const stickRoll = input.stickRoll !== undefined ? input.stickRoll : input.roll;
    if (stickRoll === 0) {
      // Hands off the stick and the wings ease back toward level.
      const level = PLANE.autoLevel * dt;
      state.roll = Math.abs(state.roll) <= level ? 0 : state.roll - Math.sign(state.roll) * level;
    }
    // v18: the same gate for PITCH (v17 levelled roll only, so a W tap
    // locked the climb and gust pitch random-walked the trim — the v17
    // live playtest missed ring 1 by 28-45 m "ke kiri/atas" on a straight
    // flight). The gate reads the RAW stick (stickPitch), not the
    // gust-augmented pitch, exactly like stickRoll above. The autopilot
    // passes a nonzero stickPitch whenever it is correcting, and 0 only
    // when it wants level flight, so it is unaffected.
    const stickPitch = input.stickPitch !== undefined ? input.stickPitch : input.pitch;
    if (stickPitch === 0) {
      const level = PLANE.pitchLevel * dt;
      state.pitch = Math.abs(state.pitch) <= level ? 0 : state.pitch - Math.sign(state.pitch) * level;
    }

    // A banked turn pulls the nose around; the rudder adds a little direct yaw.
    const speedFactor = clamp(state.speed / PLANE.cruiseSpeed, 0.3, 1.25);
    state.yaw += Math.sin(state.roll) * PLANE.turnRate * speedFactor * dt;
    state.yaw += input.yaw * 0.28 * authority * dt;

    // Speed: thrust minus drag, minus the cost of climbing, plus the gift of diving.
    let accel = thrust - PLANE.drag * state.speed * state.speed - PLANE.climbCost * Math.sin(state.pitch);
    const speedCap = PLANE.maxSpeed + (state.maxSpeedBoost || 0);
    if (state.speed > speedCap) accel -= (state.speed - speedCap) * 0.8;
    state.speed = Math.max(0, state.speed + accel * dt);

    // Stall: below the magic number the wing quits, the nose drops and the plane sinks.
    state.stalled = state.speed < PLANE.stallSpeed;
    if (state.stalled) {
      const deficit = 1 - state.speed / PLANE.stallSpeed;
      state.pitch = Math.max(-1.1, state.pitch - 0.7 * deficit * dt);
      state.y -= (PLANE.stallSpeed - state.speed) * 0.45 * dt;
    }

    const fwd = forwardOf(state.yaw, state.pitch);
    state.x += fwd.x * state.speed * dt;
    state.y += fwd.y * state.speed * dt;
    state.z += fwd.z * state.speed * dt;
    state.verticalSpeed = (state.y - prevY) / dt;

    // v22 auto-win: the ground-effect cushion is GONE — it belonged
    // to the Gemini touchdown tiers (replaced by the auto-win: the
    // autopilot flies the descent, so no cushion is needed to save
    // a manual flare).

    // Soft ceiling: the sky ends at 900 m and the nose is pushed gently down there.
    if (state.y > 900) {
      state.y = 900;
      if (state.pitch > 0) state.pitch = Math.max(0, state.pitch - 0.5 * dt);
    }

    // v22 auto-win: ROLLOUT — once the wheels are down, the plane
    // stays pinned to the deck EVERY step, even over falling ground.
    // Without this, the pin only fires on contact steps: over the
    // eastern downslope the plane floats between contacts, the
    // rollout stretches ~300 m (measured: baseline final dx 571 vs
    // touchdown dx 279), and the run ends far past the strip. Pinned
    // every step it stops in ~60 m. Speed bleeds 6 m/s², wings
    // level, and the run ends below 8 m/s. The ground block below
    // only ever sees the FIRST contact (which sets rollingOut).
    if (state.rollingOut) {
      const rg = groundAt(state.x, state.z);
      state.y = rg + 1.6;
      state.verticalSpeed = 0;
      state.throttle = 0;
      state.speed = Math.max(0, state.speed - 6 * dt);
      state.pitch += (0 - state.pitch) * Math.min(1, 2 * dt);
      state.roll += (0 - state.roll) * Math.min(1, 2 * dt);
      if (state.speed < 8) {
        state.status = 'landed';
        events |= EVENT_LAND;
      }
      return events;
    }

    // Ground and water. v22 auto-win (user 27 Nov 15:09 WIB +
    // clarification 15:11): there is NO manual touchdown check any
    // more. The win already happened the moment the plane entered
    // the runway corridor (autoLanding, above) — the ground block
    // only decides HOW the run ends. If the autopilot owns the
    // plane, the touchdown is a landing, in ANY condition: the
    // plane is pinned to the deck, its speed bled off, its wings
    // levelled, and it rolls to a stop — it can NEVER explode
    // during the autopilot landing. If the autopilot does NOT own
    // the plane, touching the ground is a crash: the race crash
    // checks stay as before (terrain/sea before all 12 rings, or
    // any ground contact before the finish line — the player must
    // FLY OVER the runway to win). The v21b finish-zone tolerances
    // and the v22 Gemini tiers (WIN 78 / -16.5 / 0.58, HARD 88 /
    // -24 / 0.72) are BOTH gone — the user's 15:09 decision
    // replaces them, and the 15:11 clarification says why: the
    // player's plane never exploded in the first place; the win
    // simply never triggered. What still crashes: ditching in the
    // sea, flying into terrain, and any ground contact before the
    // finish line is crossed with 12 rings.
    const ground = groundAt(state.x, state.z);
    if (state.y <= ground + 1.6) {
      const dxRunway = runway !== null ? state.x - runway.x : 0;
      const latRunway = runway !== null ? state.z - runway.z : 0;
      // Touchdown TELEMETRY on every ground contact — speed, VS,
      // pitch, roll, throttle, runway coords, branch (WIN / CRASH)
      // + reason. The tests and the probe assert on branch + kind.
      const touchdownThrottle = state.throttle;
      const logTouchdown = (branch, kind, reason) => {
        state.touchdown = {
          speed: +state.speed.toFixed(1),
          vs: +state.verticalSpeed.toFixed(1),
          pitch: +state.pitch.toFixed(2),
          roll: +state.roll.toFixed(2),
          throttle: +touchdownThrottle.toFixed(2),
          x: Math.round(state.x),
          z: Math.round(state.z),
          dx: Math.round(dxRunway),
          lat: Math.round(latRunway),
          ground: +ground.toFixed(1),
          rings: state.ringsPassed,
          branch,
          kind,
          reason,
        };
        console.log('[touchdown] ' + JSON.stringify(state.touchdown));
      };
      state.y = ground + 1.6;
      if (state.autoLanding) {
        // The autopilot landing: NEVER a crash, in any condition.
        // Pin to the deck, cut the thrust, bleed the speed (6 m/s²
        // rollout drag — the plane stops in a few seconds), ease the
        // wings level. The first contact logs the touchdown telemetry
        // (branch WIN, kind 'autoland'); the run ends once the speed
        // drops below 8 m/s. A very high entry can touch down long,
        // past the strip end on the plateau — still a smooth win,
        // never an explosion.
        state.rollingOut = true;
        state.throttle = 0;
        state.speed = Math.max(0, state.speed - 6 * dt);
        state.pitch += (0 - state.pitch) * Math.min(1, 2 * dt);
        state.roll += (0 - state.roll) * Math.min(1, 2 * dt);
        if (!state.touchdown) {
          state.landingKind = 'autoland';
          logTouchdown('WIN', 'autoland', 'autopilot landing after crossing the finish line');
        }
        if (state.speed < 8) {
          state.status = 'landed';
          events |= EVENT_LAND;
        }
      } else {
        state.status = 'crashed';
        state.landingKind = null;
        logTouchdown('CRASH', null, state.ringsPassed < COURSE.ringCount ? `ground contact before all 12 rings (${state.ringsPassed}/12)`
          : 'ground contact before the finish line — fly over the runway to win');
        events |= EVENT_CRASH;
      }
    }
    return events;
  }

  return { state, reset, step };
}
