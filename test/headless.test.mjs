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
//   7. Pitch taps are symmetric and effective (v19: 6x S taps in live
//      play only lost 41 ft — a tap must move the nose, W and S alike).
//   8. Ring 1->2 leg is long and gentle (v19: the 250 m leg gave the
//      player 3-4 s to turn — 0/12 ring 2 in the v18 live playtest).
//   9. The collision gate refuses a blast beyond 300 m (v19: the
//      400 m cap let a ~5° fireball fire that nobody could see).
//  10. A tap-rate-limited pilot (PWM stick) passes ring 2 (v20: the
//      v19 live playtest failed ring 2 in 3/3 tap flights — the course
//      must be forgiving enough for a tapping human, not just for a
//      continuous autopilot).
//  11. A ring-1 pass pays a toast-worthy bonus (v20: the v19 live
//      playtest passed ring 1 with no toast visible — the bonus must
//      be >= 100 so the 4 s toast "RING 1/12 +bonus" means something).
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
import { autopilotTo } from '../game/src/shots.js';

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
  assert.equal(g.fire, false); // facing 0.8 < 0.88 and rivals >80 m
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

// --- 9. Collision gate: too far to see, no fire -----------------------
// v19: the 400 m cap let a blast fire at 338-400 m, where a 34 m
// fireball is ~5° wide — the v18 live playtest never saw it. A
// 400 m blast must not fire on ANY branch now.
check('blast at 400 m does not fire on any branch', () => {
  const g = collisionGate({
    rPos: { x: 10, y: 150, z: 0 }, oPos: { x: -10, y: 150, z: 0 },
    playerPos: { x: -400, y: 150, z: 0 }, playerFwd: FWD_X, meetPoint: M, time: 50,
  });
  console.log(`  blastDist=${g.blastDist.toFixed(0)} m facing=${g.facing.toFixed(2)}`);
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

// --- 7. Pitch taps are symmetric and effective -------------------------
// v19: the v18 live playtest measured 6x S taps = only -41 ft (12x S
// ~-106 ft) — a 0.1 s tap at pitchRate 0.7 pitches ~0.07 rad and the
// 0.45 rad/s level decay wipes it in ~0.15 s. A 1 s hold each way
// must move the nose by a similar amount up and down.
check('pitch hold 1 s: W and S move altitude symmetrically', () => {
  function holdAlt(pitchInput) {
    const course = buildCourse();
    const flight = createFlight(course.spawn);
    const s = flight.state;
    const y0 = s.y;
    for (let i = 0; i < 1.0 / STEP; i += 1) {
      flight.step(STEP, { pitch: pitchInput, roll: 0, yaw: 0, throttle: 0 }, FLAT_GROUND, null);
    }
    return s.y - y0;
  }
  const down = holdAlt(-1);
  const up = holdAlt(1);
  console.log(`  S 1s: ${down.toFixed(1)} m, W 1s: +${up.toFixed(1)} m`);
  assert.ok(down < -8, `S hold only lost ${(-down).toFixed(1)} m (limit 8 m)`);
  assert.ok(up > 8, `W hold only gained ${up.toFixed(1)} m (limit 8 m)`);
  const ratio = Math.abs(down) / Math.abs(up);
  assert.ok(ratio > 0.6 && ratio < 1.4, `pitch taps asymmetric: |S|/|W| = ${ratio.toFixed(2)} (limit 0.6-1.4)`);
});

// --- 8. Ring 1->2 leg is long and gentle --------------------------------
// v19: the v18 live playtest passed ring 2 in 0 of 5 flights (closest
// 212 m, then the gap grew). The leg itself is 206 m by construction —
// 12 rings across a ~2.5 km course cannot run longer legs without the
// walk overshooting the approach and snaking back (a 260 m floor was
// tried and collapsed the final leg to 145 m, failing sim-3tier) —
// so the v19 fix for ring 2 is the PITCH authority (test 7: a tap now
// moves ~2x more altitude, enough to correct the ±28 m step between
// rings in the 2.7 s the leg gives at full throttle), plus the gentler
// wander (0.22 rad). This test guards the structure: the leg must not
// get SHORTER than the natural 206 m floor, and the turn into ring 2
// must stay gentle.
check('ring 1->2 leg >= 200 m with a gentle turn', () => {
  const course = buildCourse();
  const pts = [{ x: course.spawn.x, y: course.spawn.y, z: course.spawn.z }, ...course.rings];
  const legs = [];
  for (let i = 1; i < pts.length; i += 1) {
    legs.push(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
  }
  const leg12 = legs[1];
  const h01 = Math.atan2(pts[1].x - pts[0].x, -(pts[1].z - pts[0].z));
  const h12 = Math.atan2(pts[2].x - pts[1].x, -(pts[2].z - pts[1].z));
  let turn = Math.abs(h12 - h01);
  if (turn > Math.PI) turn = Math.PI * 2 - turn;
  console.log(`  leg1->2=${leg12.toFixed(0)} m turn=${(turn * 180 / Math.PI).toFixed(1)}° legs=[${legs.map((l) => Math.round(l)).join(', ')}]`);
  assert.ok(leg12 >= 200, `ring 1->2 leg is ${leg12.toFixed(0)} m (limit 200 m)`);
  assert.ok(turn < 0.5, `turn into ring 2 is ${(turn * 180 / Math.PI).toFixed(1)}° (limit 29°)`);
});

// --- 15. Tap-rate-limited pilot passes ring 2 --------------------------
// v20 (a): the v19 live playtest failed ring 2 in 3 of 3 flights with
// TAPS (the browser tool can only tap, not hold): the gap grew to
// 3.7-4.5 km. A human taps the stick ~2x/s, so the stick is only live
// ~40% of the time. This test flies the same autopilot but applies its
// stick inputs in 0.2 s pulses every 0.5 s (throttle stays held, as a
// human holds Shift) and must still pass ring 2 within 30 s — the
// course must be forgiving enough for a tapping pilot, not just for a
// continuous autopilot. The v20 course softening (wander 0.12 rad and
// jitter ±12 m on rings 1-3) is what makes this possible.
check('tap-rate-limited pilot (0.2 s on / 0.5 s) passes ring 2 in 30 s', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const flight = createFlight(course.spawn);
  const s = flight.state;
  let rings = 0;
  for (let i = 0; i < 30 / STEP; i += 1) {
    if (s.status !== 'flying') break;
    const t = s.elapsed;
    const on = (t % 0.5) < 0.2; // stick live 0.2 s of every 0.5 s
    const ring = course.nextRing();
    const input = ring ? autopilotTo(flight, ring, 0.72, groundAt) : { pitch: 0, roll: 0, yaw: 0, throttle: 0.3 };
    const applied = {
      pitch: on ? input.pitch : 0,
      roll: on ? input.roll : 0,
      yaw: 0,
      throttle: input.throttle,
      stickRoll: on ? input.roll : 0,
      stickPitch: on ? input.pitch : 0,
    };
    // The gust rides on top of the stick, exactly as main.js applies it.
    const gust = gustAt(s.elapsed);
    applied.pitch = clamp1(applied.pitch + gust.pitch);
    applied.roll = clamp1(applied.roll + gust.roll);
    const prev = { x: s.x, y: s.y, z: s.z };
    flight.step(STEP, applied, groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) rings += 1;
    if (rings >= 2) break;
  }
  console.log(`  rings=${rings} time=${s.elapsed.toFixed(1)} s status=${s.status}`);
  assert.ok(rings >= 2, `tap pilot passed ${rings} rings in 30 s (expected >= 2)`);
});

// --- 16. Ring-1 pass pays a toast-worthy bonus --------------------------
// v20 (e): the v19 live playtest passed ring 1 (score 122) with NO
// toast visible in any screenshot — 2.2 s is shorter than the
// screenshot cadence, so the toast now lasts 4.0 s. The bonus itself
// must be worth announcing: a centre pass pays 150 (100 ring + 50
// centre), a half-radius pass still pays 125.
check('ring 1 centre pass pays 150, half-radius pass pays >= 120', () => {
  const course = buildCourse();
  const ring = course.nextRing();
  const ax = ring.axis;
  const prev = { x: ring.x - ax.x * 10, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 };
  const pos = { x: ring.x + ax.x * 10, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 };
  const centre = course.checkPass(prev, pos);
  assert.ok(centre && centre.passed, `expected a centre pass, got ${JSON.stringify(centre)}`);
  console.log(`  centre pass bonus=${centre.bonus}`);
  assert.equal(centre.bonus, 150, `centre pass bonus is ${centre.bonus} (expected 150)`);

  const course2 = buildCourse();
  const ring2 = course2.nextRing();
  const ax2 = ring2.axis;
  const perp = { x: -ax2.z, y: 0, z: ax2.x };
  const half = ring2.radius * 0.5;
  const prev2 = { x: ring2.x - ax2.x * 10 + perp.x * half, y: ring2.y - ax2.y * 10, z: ring2.z - ax2.z * 10 + perp.z * half };
  const pos2 = { x: ring2.x + ax2.x * 10 + perp.x * half, y: ring2.y + ax2.y * 10, z: ring2.z + ax2.z * 10 + perp.z * half };
  const halfPass = course2.checkPass(prev2, pos2);
  assert.ok(halfPass && halfPass.passed, `expected a half-radius pass, got ${JSON.stringify(halfPass)}`);
  console.log(`  half-radius pass bonus=${halfPass.bonus} (centre=${halfPass.centre.toFixed(1)} m)`);
  assert.ok(halfPass.bonus >= 120, `half-radius pass bonus is ${halfPass.bonus} (limit 120)`);
});

console.log(`\n${passed}/16 headless tests passed`);
if (process.exitCode) console.log('HEADLESS TESTS: FAIL');
else console.log('HEADLESS TESTS: ALL PASS');
