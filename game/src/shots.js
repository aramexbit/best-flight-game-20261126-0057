// The screenshot scenes behind ?shot=start|play|cockpit|landing. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (bank toward the next ring, pitch toward its height, climb over
// high ground), so the frame is what a short game really looks like and the same
// seed always gives the same frame.

import { STEP } from './config.js';
import { wrapAngle } from './flight.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const COCKPIT_SECONDS = 14;
const LANDING_SECONDS = 140;
const SAMPLE = 1 / 60;

/** Steer toward a point: bank into the heading error, pitch toward the height. */
export function autopilotTo(flight, target, throttleTarget, groundAt) {
  const s = flight.state;
  let aim = target;
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
    const carrot = along < -80 ? along + 150 : 80;
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
  // Gentle hands: a shallow bank and a soft pitch keep the turn from overshooting.
  // Slow down to turn tight when the nose is a long way off the target.
  let pitchInput = Math.max(-1, Math.min(1, (desiredPitch - s.pitch) * 2.2));
  // Terrain ahead: sample several points along the nose and climb out of the
  // way of the highest of them before the ground does the deciding. One sample
  // is too easy to fool on a rugged ridge.
  let highest = -Infinity;
  for (const d of [80, 160, 240, 340]) {
    const gx = s.x + Math.sin(s.yaw) * d;
    const gz = s.z - Math.cos(s.yaw) * d;
    highest = Math.max(highest, groundAt(gx, gz));
  }
  if (highest + 45 > s.y) pitchInput = Math.max(pitchInput, 0.9);
  const slowTurn = Math.abs(headingError) > 0.6 ? 0.45 : throttleTarget;
  // Bank with damping: steer by the heading error, but subtract the bank
  // already held, so the wings level the moment the nose is right instead of
  // holding a full bank for seconds after the turn is done and overshooting.
  const rollInput = Math.max(-1, Math.min(1, headingError * 1.6 - s.roll * 1.5));
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
 */
export function stageShot(name, game) {
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
      const distToRunway = Math.hypot(runway.x - s.x, runway.z - s.z);
      target = distToRunway > 300
        ? { x: runway.x - runway.dirX * 260, y: runway.height + 45, z: runway.z - runway.dirZ * 260 }
        : { x: runway.x, y: runway.height + 6, z: runway.z };
      throttleTarget = 0.3;
      if (distToRunway < 160 && s.y < runway.height + 55) break;
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
  }
  const screen = name === 'start' ? 'title' : 'play';
  return { screen, camera, best: s.score, landed };
}
