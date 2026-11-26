// Headless tests (OpenGame layer 2) — pure Node, no browser.
// The logic under test lives in pure modules (flight.js, rings.js,
// collision.js, storm.js gustAt) — no Three.js, no DOM, no rendering.
//
//   1. Heading holds with no input (the v16 bug: the plane turned right
//      ~10°/s with no input, 0/12 rings in live playtest).
//   2. Heading holds with no stick input + the live-play gust applied
//      (the exact v16 failure mode: gust on the stick, auto-level gate).
//   3. Ring detection: a plane through the ring centre counts; a clear
//      miss does not; a near-miss is a near-miss.
//   4. Collision gate: two crossing rivals fire; far rivals do not;
//      the player-relative second chance (relFire) fires on its terms.
//   5. Pitch holds with no stick input + gust (v18: the v17 live
//      playtest missed ring 1 by 28-45 m "ke kiri/atas" — pitch trim
//      locked up and gust pitch random-walked it, no pitch auto-level).
//   6. No-input straight flight passes ring 1 (v18: a human flying
//      straight from spawn must clear ring 1 — the autopilot's 12/12
//      is not enough on its own).
//
// Run: node test/headless.test.mjs   (exit 0 = all pass)
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { planIslands, createGroundAt } from '../game/src/terrain.js';
import { createCourse } from '../game/src/rings.js';
import { createFlight } from '../game/src/flight.js';
import { STEP } from '../game/src/config.js';
import { gustAt } from '../game/src/storm.js';
import { collisionGate } from '../game/src/collision.js';

const SEED = 1;
const FLAT_GROUND = () => 0; // heading tests fly over flat ground on purpose
const clamp1 = (v) => (v < -1 ? -1 : v > 1 ? 1 : v);
const deg = (rad) => (rad * 180) / Math.PI;

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

function buildCourse() {
  const islands = planIslands(createRandom(SEED));
  return createCourse(createRandom(SEED + 7), SEED, islands);
}

// --- 1. Heading holds with no input -------------------------------------
check('heading holds with zero input (20 s)', () => {
  const course = buildCourse();
  const flight = createFlight(course.spawn);
  const s = flight.state;
  const yaw0 = s.yaw;
  for (let i = 0; i < 20 / STEP; i += 1) {
    flight.step(STEP, { pitch: 0, roll: 0, yaw: 0, throttle: 0 }, FLAT_GROUND, null);
  }
  assert.equal(s.status, 'flying');
  const drift = Math.abs(s.yaw - yaw0);
  console.log(`  drift=${deg(drift).toFixed(2)}° roll=${s.roll.toFixed(3)}`);
  assert.ok(drift < 0.05, `heading drifted ${deg(drift).toFixed(2)}° (limit 3°)`);
});

// --- 2. Heading holds with no stick input + live-play gust --------------
// This is the v16 regression: main.js adds the gust to the stick roll,
// so input.roll was never exactly 0 and the auto-level gate never fired
// — the sine gust's integral banked the plane right and it turned
// ~10°/s. v17 fixes both halves (cosine gust + stickRoll gate); with
// the gust applied exactly as main.js does, the heading must still hold.
check('heading holds with zero stick + gust applied (20 s)', () => {
  const course = buildCourse();
  const flight = createFlight(course.spawn);
  const s = flight.state;
  const yaw0 = s.yaw;
  for (let i = 0; i < 20 / STEP; i += 1) {
    const gust = gustAt(s.elapsed);
    flight.step(STEP, {
      pitch: clamp1(0 + gust.pitch),
      roll: clamp1(0 + gust.roll),
      yaw: 0,
      throttle: 0,
      stickRoll: 0, // raw stick: hands off (main.js passes this on final; here always)
      stickPitch: 0, // v18: raw pitch stick, same gate as stickRoll
    }, FLAT_GROUND, null);
  }
  assert.equal(s.status, 'flying');
  const drift = Math.abs(s.yaw - yaw0);
  console.log(`  drift=${deg(drift).toFixed(2)}° roll=${s.roll.toFixed(3)}`);
  assert.ok(drift < 0.05, `heading drifted ${deg(drift).toFixed(2)}° (limit 3°)`);
});

// --- 3. Ring detection ---------------------------------------------------
check('ring-centre pass counts', () => {
  const course = buildCourse();
  const ring = course.nextRing();
  assert.ok(ring, 'expected a next ring');
  const ax = ring.axis;
  const prev = { x: ring.x - ax.x * 10, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 };
  const pos = { x: ring.x + ax.x * 10, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 };
  const pass = course.checkPass(prev, pos);
  assert.ok(pass && pass.passed, `expected a pass, got ${JSON.stringify(pass)}`);
  assert.ok(pass.bonus > 0, 'expected a positive bonus');
  console.log(`  ring 1 centre=${pass.centre.toFixed(2)} m bonus=${pass.bonus}`);
});

check('clear miss does not count', () => {
  const course = buildCourse();
  const ring = course.nextRing();
  const ax = ring.axis;
  // 50 m off-centre, across the ring plane: far outside the 1.7x near-miss band.
  const perp = { x: -ax.z, y: 0, z: ax.x };
  const prev = { x: ring.x - ax.x * 10 + perp.x * 50, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 + perp.z * 50 };
  const pos = { x: ring.x + ax.x * 10 + perp.x * 50, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 + perp.z * 50 };
  const pass = course.checkPass(prev, pos);
  assert.ok(pass && !pass.passed && !pass.nearMiss, `expected no pass, got ${JSON.stringify(pass)}`);
  console.log(`  centre=${pass.centre.toFixed(2)} m (radius ${ring.radius} m)`);
});

check('near-miss (15 m off-centre) is a near-miss', () => {
  const course = buildCourse();
  const ring = course.nextRing();
  const ax = ring.axis;
  const perp = { x: -ax.z, y: 0, z: ax.x };
  const prev = { x: ring.x - ax.x * 10 + perp.x * 15, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 + perp.z * 15 };
  const pos = { x: ring.x + ax.x * 10 + perp.x * 15, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 + perp.z * 15 };
  const pass = course.checkPass(prev, pos);
  assert.ok(pass && !pass.passed && pass.nearMiss, `expected a near-miss, got ${JSON.stringify(pass)}`);
  console.log(`  centre=${pass.centre.toFixed(2)} m bonus=${pass.bonus}`);
});

// --- 4. Collision gate ---------------------------------------------------
const M = { x: 0, y: 150, z: 0 }; // meeting point
const FWD_X = { x: 1, z: 0 }; // player facing +x

check('crossing rivals fire (both near, player facing, in view)', () => {
  const g = collisionGate({
    rPos: { x: 10, y: 150, z: 0 }, oPos: { x: -10, y: 150, z: 0 },
    playerPos: { x: -200, y: 150, z: 0 }, playerFwd: FWD_X, meetPoint: M, time: 35,
  });
  console.log(`  blastDist=${g.blastDist.toFixed(0)} m facing=${g.facing.toFixed(2)}`);
  assert.equal(g.fire, true);
});

check('far rivals do not fire', () => {
  const g = collisionGate({
    rPos: { x: 300, y: 150, z: 0 }, oPos: { x: 310, y: 150, z: 0 },
    playerPos: { x: -200, y: 150, z: 0 }, playerFwd: FWD_X, meetPoint: M, time: 50,
  });
  assert.equal(g.fire, false);
  assert.equal(g.lateFire, false);
  assert.equal(g.relFire, false);
});

check('relFire fires on its terms (both <130 m, facing 0.8, t>=40)', () => {
  const g = collisionGate({
    rPos: { x: 100, y: 150, z: 0 }, oPos: { x: -100, y: 150, z: 0 },
    playerPos: { x: -200, y: 150, z: 0 }, playerFwd: { x: 0.8, z: 0.6 }, meetPoint: M, time: 45,
  });
  console.log(`  blastDist=${g.blastDist.toFixed(0)} m facing=${g.facing.toFixed(2)}`);
  assert.equal(g.fire, false); // facing 0.8 < 0.85 and rivals >80 m
  assert.equal(g.relFire, true);
});

check('no partner rival: no fire', () => {
  const g = collisionGate({
    rPos: { x: 10, y: 150, z: 0 }, oPos: null,
    playerPos: { x: -200, y: 150, z: 0 }, playerFwd: FWD_X, meetPoint: M, time: 35,
  });
  assert.equal(g.fire, false);
  assert.equal(g.lateFire, false);
  assert.equal(g.relFire, false);
});

// --- 5. Pitch holds with no stick input + gust -------------------------
// v18: the v17 live playtest missed ring 1 by 28-45 m "ke kiri/atas" —
// a W tap locked the climb (pitchRate 0.9, no pitch auto-level) and the
// gust pitch random-walked the trim. With the pitch auto-level gated on
// the raw stick (stickPitch), hands off + gust must keep the nose level.
check('pitch holds with zero stick + gust applied (20 s, cruise)', () => {
  const course = buildCourse();
  const flight = createFlight(course.spawn);
  const s = flight.state;
  let maxPitch = 0;
  for (let i = 0; i < 20 / STEP; i += 1) {
    const gust = gustAt(s.elapsed);
    flight.step(STEP, {
      pitch: clamp1(0 + gust.pitch),
      roll: clamp1(0 + gust.roll),
      yaw: 0,
      throttle: 0.7,
      stickRoll: 0,
      stickPitch: 0,
    }, FLAT_GROUND, null);
    maxPitch = Math.max(maxPitch, Math.abs(s.pitch));
  }
  assert.equal(s.status, 'flying');
  console.log(`  pitch=${s.pitch.toFixed(3)} rad maxPitch=${maxPitch.toFixed(3)} rad`);
  assert.ok(Math.abs(s.pitch) < 0.1, `pitch drifted to ${s.pitch.toFixed(3)} rad (limit 0.1)`);
  assert.ok(maxPitch < 0.15, `pitch peaked at ${maxPitch.toFixed(3)} rad (limit 0.15)`);
  // A locked-in trim (the v17 bug: one W tap locked the climb forever)
  // must decay back to level hands-off, at the pitchLevel rate.
  s.pitch = 0.3;
  for (let i = 0; i < 5 / STEP; i += 1) {
    const gust = gustAt(s.elapsed);
    flight.step(STEP, {
      pitch: clamp1(0 + gust.pitch),
      roll: clamp1(0 + gust.roll),
      yaw: 0,
      throttle: 0.7,
      stickRoll: 0,
      stickPitch: 0,
    }, FLAT_GROUND, null);
  }
  console.log(`  trim 0.30 rad decayed to ${s.pitch.toFixed(3)} rad in 5 s`);
  assert.ok(Math.abs(s.pitch) < 0.05, `locked trim did not decay (pitch ${s.pitch.toFixed(3)} rad, limit 0.05)`);
});

// --- 6. No-input straight flight passes ring 1 -------------------------
check('no-input straight flight passes ring 1', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const flight = createFlight(course.spawn);
  const s = flight.state;
  let rings = 0;
  for (let i = 0; i < 30 / STEP; i += 1) {
    if (s.status !== 'flying') break;
    const prev = { x: s.x, y: s.y, z: s.z };
    const gust = gustAt(s.elapsed);
    flight.step(STEP, {
      pitch: clamp1(0 + gust.pitch),
      roll: clamp1(0 + gust.roll),
      yaw: 0,
      throttle: 0.7,
      stickRoll: 0,
      stickPitch: 0,
    }, groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) rings += 1;
    if (rings >= 1) break;
  }
  console.log(`  rings=${rings} time=${s.elapsed.toFixed(1)} s status=${s.status}`);
  assert.ok(rings >= 1, `straight flight passed ${rings} rings in 30 s (expected >= 1)`);
});

console.log(`\n${passed}/11 headless tests passed`);
if (process.exitCode) console.log('HEADLESS TESTS: FAIL');
else console.log('HEADLESS TESTS: ALL PASS');
