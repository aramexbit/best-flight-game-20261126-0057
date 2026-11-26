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
    status: 'flying',
    stalled: false,
    verticalSpeed: 0,
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
    state.status = 'flying';
    state.stalled = false;
    state.verticalSpeed = 0;
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

    // Throttle and fuel. An empty tank means the engine is out: glide, don't climb.
    state.throttle = clamp(state.throttle + input.throttle * PLANE.throttleRate * dt, 0, 1);
    if (state.fuel > 0) {
      state.fuel = Math.max(0, state.fuel - state.throttle * dt / PLANE.fuelSeconds);
      if (state.fuel === 0 && !fuelWarned) {
        fuelWarned = true;
        events |= EVENT_FUEL_EMPTY;
      }
    }
    const thrust = state.fuel > 0 ? state.throttle * PLANE.thrust : 0;

    // How much authority the stick has: mushy below stall speed, full above it.
    const authority = clamp(state.speed / PLANE.stallSpeed, 0.35, 1);
    state.pitch = clamp(state.pitch + input.pitch * PLANE.pitchRate * authority * dt, -1.1, 1.1);
    state.roll = clamp(state.roll + input.roll * PLANE.rollRate * authority * dt, -1.35, 1.35);
    if (input.roll === 0) {
      // Hands off the stick and the wings ease back toward level.
      const level = PLANE.autoLevel * dt;
      state.roll = Math.abs(state.roll) <= level ? 0 : state.roll - Math.sign(state.roll) * level;
    }

    // A banked turn pulls the nose around; the rudder adds a little direct yaw.
    const speedFactor = clamp(state.speed / PLANE.cruiseSpeed, 0.3, 1.25);
    state.yaw += Math.sin(state.roll) * PLANE.turnRate * speedFactor * dt;
    state.yaw += input.yaw * 0.28 * authority * dt;

    // Speed: thrust minus drag, minus the cost of climbing, plus the gift of diving.
    let accel = thrust - PLANE.drag * state.speed * state.speed - PLANE.climbCost * Math.sin(state.pitch);
    if (state.speed > PLANE.maxSpeed) accel -= (state.speed - PLANE.maxSpeed) * 0.8;
    state.speed = Math.max(0, state.speed + accel * dt);

    // Stall: below the magic number the wing quits, the nose drops and the plane sinks.
    state.stalled = state.speed < PLANE.stallSpeed;
    if (state.stalled) {
      const deficit = 1 - state.speed / PLANE.stallSpeed;
      state.pitch = Math.max(-1.1, state.pitch - 0.7 * deficit * dt);
      state.y -= (PLANE.stallSpeed - state.speed) * 0.45 * dt;
    }

    const fwd = forwardOf(state.yaw, state.pitch);
    const prevY = state.y;
    state.x += fwd.x * state.speed * dt;
    state.y += fwd.y * state.speed * dt;
    state.z += fwd.z * state.speed * dt;
    state.verticalSpeed = (state.y - prevY) / dt;

    // Soft ceiling: the sky ends at 900 m and the nose is pushed gently down there.
    if (state.y > 900) {
      state.y = 900;
      if (state.pitch > 0) state.pitch = Math.max(0, state.pitch - 0.5 * dt);
    }

    // Ground and water. Touching down is only a landing on the runway, slow and level.
    // v15: the window is wider and gentler than v14 — the user's own
    // playtest never saw the finish at all, and a casual pilot lands
    // slightly long, slightly wide and slightly fast. The strip counts
    // with its shoulders and a 40 m overshoot, and "gentle" is 48 m/s
    // (was 42), 0.45 roll / 0.35 pitch (was 0.35 / 0.28), 8 m/s sink
    // (was 6). A hard touchdown off the strip is still a crash.
    const ground = groundAt(state.x, state.z);
    if (state.y <= ground + 1.6) {
      const onRunway = runway !== null
        && Math.abs(state.x - runway.x) < COURSE.runwayLength / 2 + 40
        && Math.abs(state.z - runway.z) < COURSE.runwayWidth / 2 + 20;
      const gentle = state.speed < 48 && Math.abs(state.roll) < 0.45
        && Math.abs(state.pitch) < 0.35 && Math.abs(state.verticalSpeed) < 8;
      // v15: the FINISH ZONE — after all 12 rings, a soft touchdown
      // anywhere in the extended airfield box (80 m past the strip,
      // 30 m to each side) counts as a landing too. The player flew
      // the whole course; the finish must not be lost to a touchdown
      // 20 m wide of the centreline.
      const inFinishZone = runway !== null && state.ringsPassed >= COURSE.ringCount
        && Math.abs(state.x - runway.x) < COURSE.runwayLength / 2 + 80
        && Math.abs(state.z - runway.z) < COURSE.runwayWidth / 2 + 30;
      const softEnough = state.speed < 50 && Math.abs(state.roll) < 0.45
        && Math.abs(state.pitch) < 0.35 && Math.abs(state.verticalSpeed) < 8;
      state.y = ground + 1.6;
      if ((onRunway && gentle) || (inFinishZone && softEnough)) {
        state.status = 'landed';
        state.speed = Math.max(0, state.speed - 30 * dt);
        events |= EVENT_LAND;
      } else {
        state.status = 'crashed';
        events |= EVENT_CRASH;
      }
    }
    return events;
  }

  return { state, reset, step };
}
