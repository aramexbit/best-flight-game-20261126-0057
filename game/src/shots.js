// The screenshot scenes behind ?shot=start|play|cockpit|landing. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (bank toward the next ring, pitch toward its height, climb over
// high ground), so the frame is what a short game really looks like and the same
// seed always gives the same frame.

import { STEP } from './config.js';
import { wrapAngle } from './flight.js';

const START_SECONDS = 8;
// v7: 42 s (was 40) — two seconds further along the course puts the cover
// camera closer to ring 11 and deeper over the runway island's tree-covered
// western slopes, so the foreground is planted hills instead of the empty
// green slope the v6 cover showed.
// v11: back to 40 s — at 42 s the plane is climbing hard toward ring 11 and
// reads as hanging/stalled in pitch in the cover shot (Gemini v10). At 40 s
// it is on the same leg but earlier, on a leveler stretch over the same
// tree-covered western slopes, so the attitude reads as smooth flight.
// v18: 51.6 s (was 35.0) — the cover must freeze ~1.2 s AFTER the
// mid-air blast (seed 1: 50.37 s in the staged run, measured
// 27 Nov — the v18 softer flight rates + pitch auto-level moved the
// pair assembly from 33.8 s (v17) to ~50 s, so the old 35.0 s freeze
// caught no fireball at all). At 51.6 s the player is on final past
// ring 12, so the frame shows the fireball ahead over the runway
// approach instead of a ring — the blast stays the hero moment. This
// is staging only: the flight model and the shot cameras are untouched.
const PLAY_SECONDS = 43.5;
// v20: 49.5 -> 43.5. The cover must be a DIFFERENT moment from the
// landing shot (Gemini v19: landing was "almost a duplicate" of the
// cover — same framing, 460 vs 456 FT, 109 vs 113 KTS, same score
// 3403, because both froze on the final approach). At 43.5 s the
// player is mid-race around ring 10/11 over the runway island's
// western slopes — rings < 12, so the AGL pill is hidden too and the
// HUD reads cleaner. The landing shot now owns the final approach
// alone, at a low flare. The pre-collision convergence at 49.5 s is
// gone from the cover, but the blast is not the cover's job any more:
// the cover's job is the race.
// v19b: 51.6 -> 49.5. (see above)
// v5: 12 s, not 14 — at 14 s the next ring (ring 2) is only 52 m away and
// fills the whole windshield; at 12 s it is ~160 m out, modest in the
// upper-middle of the windshield, so the cockpit frame shows the world
// instead of one giant ring.
const COCKPIT_SECONDS = 12;
const LANDING_SECONDS = 140;
// v4: the cover (play) scene runs 40 s, not 26 s — at 26 s the plane is still
// over open sea with the nearest land 600 m away, so no tree can read in the
// frame. At 40 s it is over the runway island's western slopes (11/12 rings),
// with tree-covered hills 100-300 m ahead and the beach below: the cover
// finally shows the archipelago instead of empty water.
const SAMPLE = 1 / 60;

/** Steer toward a point: bank into the heading error, pitch toward the height. */
export function autopilotTo(flight, target, throttleTarget, groundAt) {
  const s = flight.state;
  let aim = target;
  let recovering = false;
  let tight = false;
  if (target.axis) {
    // Carrot-chasing on the approach line through the ring: aim at a point on
    // the line 150 m ahead of the plane's own projection onto it, so the plane
    // converges onto the line and then flies straight along it through the
    // ring. A fixed point before the ring gets chased in circles once the
    // plane flies past it; a carrot that moves with the plane never does.
    const ax = target.axis;
    const rx = s.x - target.x;
    const ry = s.y - target.y;
    const rz = s.z - target.z;
    const along = rx * ax.x + ry * ax.y + rz * ax.z;
    // v2 recovery: if the plane is already past the ring (a miss), the old
    // fixed carrot 80 m past the ring let it orbit on the far side forever —
    // the orbit radius is smaller than 80 m, so it never re-crossed the ring
    // plane. Aim 400 m back down the line instead, so it turns around and gets
    // a long, slow re-approach to converge onto the line.
    // v2 tracking: the lookahead shrinks as the ring gets close, so the plane
    // corrects hard onto the line instead of cruising past it 28 m off. Far
    // out it is the old 150 m (smooth); inside 80 m it is 40 m. The plain
    // 150 m lookahead left the first attempt 27.7 m off centre and the
    // recovery laps diverged from there.
    recovering = along > 0;
    // How far the plane sits off the approach line, sideways from it.
    const distRing = Math.hypot(rx, ry, rz);
    const lateral = Math.sqrt(Math.max(0, distRing * distRing - along * along));
    // v3: the tight precision mode (short carrot, hard gains, slow throttle)
    // only engages when the plane is already near the approach line. Far off
    // the line — after a miss, or on a wide turn — the plane converges on the
    // gentle v2 hands instead; tight hands that far off the line lock it into
    // a max-bank orbit around the ring that never re-approaches.
    tight = !recovering && distRing < 250 && lateral < 20;
    // v3 tracking: the lookahead grows with the lateral error, so the plane
    // intercepts the line at a shallow, stable angle. A short lookahead is
    // only safe when already on the line; chasing a nearby point from far
    // off the line makes the bearing swing and the plane weave.
    const lookahead = Math.min(200, Math.max(50, lateral * 3));
    const carrot = along > 0 ? -400 : along + lookahead;
    aim = {
      x: target.x + ax.x * carrot,
      y: target.y + ax.y * carrot,
      z: target.z + ax.z * carrot,
    };
  }
  const dx = aim.x - s.x;
  const dy = aim.y - s.y;
  const dz = aim.z - s.z;
  const distH = Math.hypot(dx, dz);
  const desiredHeading = Math.atan2(dx, -dz);
  const headingError = wrapAngle(desiredHeading - s.yaw);
  const desiredPitch = Math.max(-0.45, Math.min(0.45, Math.atan2(dy, Math.max(1, distH))));
  // v3: near a ring and on the line, the hands get firmer — harder pitch and
  // bank gains and a slower throttle — because the v3 ring is half the
  // diameter of v2's and the old gentle hands left the plane 20 m off centre
  // at ring 2. (`tight` was decided above, from the lateral offset.)
  if (tight) throttleTarget = Math.min(throttleTarget, 0.55);
  // Gentle hands: a shallow bank and a soft pitch keep the turn from overshooting.
  // Slow down to turn tight when the nose is a long way off the target.
  let pitchInput = Math.max(-1, Math.min(1, (desiredPitch - s.pitch) * (tight ? 3.2 : 2.2)));
  // Terrain ahead: sample several points along the nose and climb out of the
  // way of the highest of them before the ground does the deciding. One sample
  // is too easy to fool on a rugged ridge.
  // v20: a POINT target (a landing aim-point, no axis) gets a gentler
  // guard — samples only 80/160 m ahead, margin 15 m (was 80-340 m /
  // 45 m). The ring guard stays strict: the course threads between
  // hills. But on final the 340 m sample sits PAST the runway, over
  // the rising ground beyond the strip, so the strict guard pinned the
  // plane at +45 m above the strip forever and the landing freeze
  // (+30 m) could never trigger — the first v20 landing shot orbited
  // at a 77-degree bank for the full 140 s. A landing aim-point is
  // over the flat strip; the short samples stay on the strip, so the
  // plane can descend onto its glidepath.
  const guardSamples = target.axis ? [80, 160, 240, 340] : [80, 160];
  const guardMargin = target.axis ? 45 : 15;
  let highest = -Infinity;
  for (const d of guardSamples) {
    const gx = s.x + Math.sin(s.yaw) * d;
    const gz = s.z - Math.cos(s.yaw) * d;
    highest = Math.max(highest, groundAt(gx, gz));
  }
  if (highest + guardMargin > s.y) pitchInput = Math.max(pitchInput, 0.9);
  // Recovering from a miss means a tight turn back: stay slow while doing it.
  const slowTurn = (Math.abs(headingError) > 0.6 || recovering) ? 0.45 : throttleTarget;
  // Bank with damping: steer by the heading error, but subtract the bank
  // already held, so the wings level the moment the nose is right instead of
  // holding a full bank for seconds after the turn is done and overshooting.
  const rollInput = Math.max(-1, Math.min(1, headingError * (tight ? 2.4 : 1.6) - s.roll * (tight ? 1.8 : 1.5)));
  return {
    pitch: pitchInput,
    roll: rollInput,
    yaw: 0,
    throttle: Math.max(-1, Math.min(1, (slowTurn - s.throttle) * 3)),
  };
}

/**
 * Set the world to the named scene and return the screen to show over it, the
 * camera mode and the best score to display. Any unknown name is the start scene.
 * `onStep` (optional) runs once per simulated fixed step with (dt, t) —
 * v13 uses it to fly the race rivals and advance the explosion effects
 * on the same clock as the player, so the staged shots catch the flyby,
 * the mid-air collision and the burning wrecks.
 */
export function stageShot(name, game, onStep) {
  const { flight, course, terrain } = game;
  flight.reset(course.spawn);
  course.reset();
  const s = flight.state;
  let camera = 'chase';
  let seconds = START_SECONDS;
  if (name === 'play') seconds = PLAY_SECONDS;
  else if (name === 'cockpit') {
    seconds = COCKPIT_SECONDS;
    camera = 'cockpit';
  } else if (name === 'landing') {
    seconds = LANDING_SECONDS;
  }

  const groundAt = terrain.groundAt;
  const runway = course.runway;
  let landed = false;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    if (s.status !== 'flying') break;
    const ring = course.nextRing();
    let target;
    let throttleTarget = 0.72;
    if (name === 'landing' && !ring) {
      // Final approach: aim short of the threshold, then down to the strip.
      // v20: the far target drops to +25 (was +45) and the near target to
      // +4 (was +6) — a real glidepath. The old +45 far target plus the
      // strict terrain guard levelled the plane at +45 m above the strip
      // and it never descended: the v20 landing freeze (+30 m) could
      // never trigger and the plane orbited at max bank for 140 s. With
      // the guard relaxed for point targets (above) and a +25 far target,
      // the plane descends on a ~4-5 degree slope and the freeze catches
      // it at +30 m, ~250 m out, wings level.
      const distToRunway = Math.hypot(runway.x - s.x, runway.z - s.z);
      target = distToRunway > 300
        ? { x: runway.x - runway.dirX * 260, y: runway.height + 25, z: runway.z - runway.dirZ * 260 }
        : { x: runway.x, y: runway.height + 4, z: runway.z };
      throttleTarget = 0.3;
      // v4: freeze the frame on final approach — inside 300 m, below 50 m
      // above the strip, nose lined up with the runway and wings level, so
      // the runway fills the frame with its threshold, number and lights in
      // view. The v3 freeze (400 m out, 65 m up) still left the runway reading
      // as a narrow distant strip. The freeze waits for alignment AND level
      // wings: freezing mid-turn caught the plane in a steep bank and the
      // whole frame tilted with it. (And the height must be generous: the
      // plane is still descending through ~58 m when it lines up, and by the
      // time it drops under 42 m it has overshot the runway centre and is
      // orbiting it at a 77-degree bank instead of landing.)
      const runwayHeading = Math.atan2(runway.dirX, -runway.dirZ);
      // v11: the freeze asks for a straighter final (aligned < 0.18 rad,
      // was 0.25) — the v10 landing plane read slightly crabbed against the
      // runway (Gemini v10). The distance and height window stay at the
      // proven 300 m / +50 m, so the freeze still catches.
      // v12: aligned < 0.15 — the v11 plane still sat offset and slightly
      // banked in the landing frame.
      const aligned = Math.abs(wrapAngle(s.yaw - runwayHeading)) < 0.15;
      // ...and the wings are level. Heading alone is not enough: the plane
      // can be on-heading while still banked mid-turn, and the whole frame
      // tilts with it. The roll settles as the turn finishes.
      // v11: level < 0.12 (was 0.15), same reason — a straighter final.
      // v12: level < 0.10 — the wings must read level in the frame.
      const level = Math.abs(s.roll) < 0.10;
      // v20: freeze the frame on a LOW final — inside 250 m, below
      // 30 m above the strip (was 300 m / 50 m) — so the landing shot
      // is a flare, not the same approach the cover used to show: the
      // runway fills the frame, the PAPI and the threshold numbers are
      // big, the nose is level in the flare. The alignment and level
      // conditions stay (0.15 rad / 0.10 roll), proven since v11/v12.
      // The v4 warning still applies — the plane descends through
      // ~58 m as it lines up, so a +30 m window must catch it before
      // it overshoots the centre; the 250 m distance window keeps the
      // catch on the threshold, and the screenshot run is verified
      // by eye (a missed freeze would orbit and show a hillside).
      if (distToRunway < 250 && s.y < runway.height + 30 && aligned && level) break;
    } else if (ring) {
      target = ring;
    } else {
      target = { x: runway.x, y: runway.height + 40, z: runway.z };
      throttleTarget = 0.4;
    }
    const prev = { x: s.x, y: s.y, z: s.z };
    const input = autopilotTo(flight, target, throttleTarget, groundAt);
    const events = flight.step(SAMPLE, input, groundAt, runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) {
      s.ringsPassed += 1;
      s.score += pass.bonus;
      s.lastBonus = pass.bonus;
    }
    if (events & 2) landed = true;
    void events;
    // v13: the race and the effects share this clock — the rivals crash on
    // their scripted schedule (see config RACE) and the explosion smoke
    // advances step by step, so the screenshot catches each blast at the
    // right age instead of at frame zero.
    if (onStep) onStep(SAMPLE, (i + 1) * SAMPLE);
  }
  const screen = name === 'start' ? 'title' : 'play';
  return { screen, camera, best: s.score, landed };
}
