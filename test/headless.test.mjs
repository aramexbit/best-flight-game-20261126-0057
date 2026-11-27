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
//  15. Tap-rate-limited pilot passes ring 2 (v20 — see test 15 below).
//  16. Ring-1 pass pays a toast-worthy bonus (v20 — see test 16 below).
//  17. A tap-rate-limited pilot (PWM stick) passes ring 5 (v21: the
//      v20 live playtest failed ring 5 in 3/3 tap flights — the first
//      real turn. The course now turns gently through ring 5, and
//      this test proves a tapping pilot can follow it).
//  18. Legs 1-5 are long and gentle (v21: guards the ring-5
//      softening — every early leg >= 200 m, every turn into rings
//      2-5 < 29°).
//  19. A human landing at throttle 0.3, VS -5, wings level, on the
//      strip, WINS (v21b: the user's manual landing crashed on speed
//      alone — 107 kts vs the 50 m/s finish-zone cap — so the
//      finish-zone tolerances are now 62 m/s / 12 m/s / 0.45 rad).
//  20. A full-throttle arrival still crashes, and the natural steep
//      descent from ring 12 (VS -11) at throttle 0.3 now lands (v21b:
//      the widened window must not make every arrival a win).
// Run: node test/headless.test.mjs   (exit 0 = all pass)
import assert from 'node:assert/strict';
import { createRandom } from '../game/src/random.js';
import { planIslands, createGroundAt } from '../game/src/terrain.js';
import { createCourse } from '../game/src/rings.js';
import { createFlight } from '../game/src/flight.js';
import { STEP, COURSE } from '../game/src/config.js';
import { gustAt, tornadoAt } from '../game/src/storm.js';
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

// --- 17. Tap-rate-limited pilot passes ring 5 -------------------------
// v21: the v20 live playtest failed ring 5 in 3 of 3 flights with
// TAPS (closest 76 m, then the gap ballooned to 1-1.5 km): ring 5 is
// the first real turn, and a tapping pilot turns ~2-3°/s. The course
// now turns gently through ring 5 (wander 0.12 rad, jitter ±12 m on
// rings 1-5), and the same tap pilot that passes ring 2 (test 15)
// must pass ring 5 within 45 s.
check('tap-rate-limited pilot (0.2 s on / 0.5 s) passes ring 5 in 45 s', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const flight = createFlight(course.spawn);
  const s = flight.state;
  let rings = 0;
  for (let i = 0; i < 45 / STEP; i += 1) {
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
    const gust = gustAt(s.elapsed);
    applied.pitch = clamp1(applied.pitch + gust.pitch);
    applied.roll = clamp1(applied.roll + gust.roll);
    const prev = { x: s.x, y: s.y, z: s.z };
    flight.step(STEP, applied, groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) rings += 1;
    if (rings >= 5) break;
  }
  console.log(`  rings=${rings} time=${s.elapsed.toFixed(1)} s status=${s.status}`);
  assert.ok(rings >= 5, `tap pilot passed ${rings} rings in 45 s (expected >= 5)`);
});

// --- 18. Early legs are long and gentle --------------------------------
// v21: guards the ring-5 softening (rings.js early = i < 5): every leg
// from spawn through ring 5 must be >= 200 m, and every turn into
// rings 2-5 must stay < 29° (0.5 rad).
check('legs 1-5 >= 200 m with turns < 29 deg into rings 2-5', () => {
  const course = buildCourse();
  const pts = [{ x: course.spawn.x, y: course.spawn.y, z: course.spawn.z }, ...course.rings];
  const legs = [];
  for (let i = 1; i < pts.length; i += 1) {
    legs.push(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z));
  }
  let maxTurn = 0;
  for (let i = 1; i <= 4; i += 1) {
    const hA = Math.atan2(pts[i].x - pts[i - 1].x, -(pts[i].z - pts[i - 1].z));
    const hB = Math.atan2(pts[i + 1].x - pts[i].x, -(pts[i + 1].z - pts[i].z));
    let turn = Math.abs(hB - hA);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    maxTurn = Math.max(maxTurn, turn);
  }
  console.log(`  legs1-5=[${legs.slice(0, 5).map((l) => Math.round(l)).join(', ')}] maxTurn=${(maxTurn * 180 / Math.PI).toFixed(1)}°`);
  for (let i = 0; i < 5; i += 1) assert.ok(legs[i] >= 200, `leg ${i + 1} is ${legs[i].toFixed(0)} m (limit 200 m)`);
  assert.ok(maxTurn < 0.5, `sharpest early turn is ${(maxTurn * 180 / Math.PI).toFixed(1)}° (limit 29°)`);
});

// --- 19 + 20. Human landings after ring 12 (v21b) --------------------
// The user's own playtest (27 Nov 09:39 WIB) crashed on a manual
// landing to win. The reproduction proved a wings-level,
// on-centreline, on-strip touchdown at throttle 0.3 fails on speed
// alone (107 kts = 55 m/s vs the 50 m/s finish-zone cap — the plane
// cruises at 105 kts at throttle 0.3, so a human who slows down
// naturally still arrives too fast), and the natural descent from
// ring 12 (55 m over ~300 m) at cruise speed is VS -11 m/s vs the
// 8 cap. The finish-zone tolerances are now 62 m/s / 12 m/s /
// 0.45 rad pitch. The human controller below is the sim's land
// regulator with a human's throttle + VS targets: cross-track roll
// (aim 500 m PAST the runway, never at the centre — aiming at the
// centre makes the target jump behind the plane once it flies past
// it and commands a max-bank U-turn), VS-hold pitch, throttle
// slewed to a target (Shift/Ctrl held).
function humanLandInput(flight, runway, targetVS, throttleTarget) {
  const s = flight.state;
  const farX = runway.x + runway.dirX * 500;
  const farZ = runway.z + runway.dirZ * 500;
  const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
  let herr = targetYaw - s.yaw;
  herr = Math.atan2(Math.sin(herr), Math.cos(herr));
  const lat = -(s.x - runway.x) * runway.dirZ + (s.z - runway.z) * runway.dirX;
  const roll = clamp1(-s.roll * 2 - lat * 0.01 + herr * 1.5);
  const pitch = clamp1((targetVS - (s.verticalSpeed || 0)) * 0.05);
  const thrErr = throttleTarget - s.throttle;
  const throttle = Math.abs(thrErr) < 0.05 ? 0 : Math.sign(thrErr);
  return { pitch, roll, yaw: 0, throttle, stickRoll: roll, stickPitch: pitch };
}

// Fly the autopilot through all 12 rings, then land with the human
// profile (targetVS, throttleTarget). Returns the final state.
function flyRingsThenLand(targetVS, throttleTarget) {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const flight = createFlight(course.spawn);
  const s = flight.state;
  let prev = { x: s.x, y: s.y, z: s.z };
  for (let i = 0; i < 300 / STEP; i += 1) {
    if (s.status !== 'flying') break;
    const ring = course.nextRing();
    const input = ring
      ? autopilotTo(flight, ring, 0.72, groundAt)
      : humanLandInput(flight, course.runway, targetVS, throttleTarget);
    flight.step(STEP, input, groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) s.ringsPassed += 1;
    prev = { x: s.x, y: s.y, z: s.z };
  }
  return { s, runway: course.runway };
}

check('human landing at throttle 0.3, VS -5, wins after 12 rings', () => {
  const { s, runway } = flyRingsThenLand(-5, 0.3);
  console.log(`  status=${s.status} rings=${s.ringsPassed} td(x${Math.round(s.x - runway.x)}/z${Math.round(s.z - runway.z)}) spd=${Math.round(s.speed * 1.94)} kts VS=${s.verticalSpeed.toFixed(1)}`);
  assert.equal(s.ringsPassed, 12, `passed ${s.ringsPassed} rings (expected 12)`);
  assert.equal(s.status, 'landed', `human landing at 0.3 throttle ${s.status} (expected landed)`);
});

check('full-throttle arrival still crashes; steep -11 m/s at 0.3 lands', () => {
  const fast = flyRingsThenLand(-5, 0.72);
  console.log(`  full-throttle: status=${fast.s.status} spd=${Math.round(fast.s.speed * 1.94)} kts`);
  assert.equal(fast.s.status, 'crashed', `full-throttle arrival ${fast.s.status} (expected crashed)`);
  const steep = flyRingsThenLand(-11, 0.3);
  console.log(`  steep -11: status=${steep.s.status} spd=${Math.round(steep.s.speed * 1.94)} kts VS=${steep.s.verticalSpeed.toFixed(1)}`);
  assert.equal(steep.s.status, 'landed', `steep -11 m/s landing at 0.3 throttle ${steep.s.status} (expected landed)`);
});

// --- 21. Tornado kill cylinder (v21c: user 27 Nov 10:17) ---------------
// A rival inside a tornado's radius AND height band dies; outside the
// radius, above the crown or below the foot it lives. The kill is a
// pure function (storm.js tornadoAt), so this test needs no Three.js.
check('tornado kill cylinder: inside dies, outside and above live', () => {
  const tornadoes = [
    { x: 0, z: 0, baseY: 0, radius: 35, scale: 0.55 },
    { x: 500, z: 0, baseY: 10, radius: 45, scale: 1 },
  ];
  assert.ok(tornadoAt(0, 80, 0, tornadoes), 'centre of spout3 should kill');
  assert.ok(tornadoAt(34, 80, 0, tornadoes), '34 m (inside 35 m radius) should kill');
  assert.equal(tornadoAt(36, 80, 0, tornadoes), null, '36 m (outside 35 m radius) should be safe');
  assert.equal(tornadoAt(0, 200, 0, tornadoes), null, 'above the funnel crown (264 x 0.55 = 145 m) should be safe');
  assert.equal(tornadoAt(0, -5, 0, tornadoes), null, 'below the funnel foot should be safe');
  assert.ok(tornadoAt(500, 100, 40, tornadoes), '40 m inside the 45 m main cell should kill');
  assert.equal(tornadoAt(500, 100, 50, tornadoes), null, '50 m outside the 45 m main cell should be safe');
  console.log('  spout3 r35: 0/34 kill, 36 safe, 200 (above crown) safe; main r45: 40 kill, 50 safe');
});

// --- 22. Low start + steep ridges (v21c: user 27 Nov 10:17) --------------
// Spawn AGL 40-60 m over the sea, early rings low (< 100 m AGL) and the
// course climbing to the approach — and the ridge islands flank the
// early course (steep hill 300 m north of ring 3, sea under the ring).
check('low start: spawn AGL 40-60 m, early rings low and climbing, ridges flank them', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const spawnAGL = course.spawn.y - groundAt(course.spawn.x, course.spawn.z);
  const r1agl = course.rings[0].y - groundAt(course.rings[0].x, course.rings[0].z);
  const r3agl = course.rings[2].y - groundAt(course.rings[2].x, course.rings[2].z);
  console.log(`  spawn AGL=${spawnAGL.toFixed(1)} ring1 AGL=${r1agl.toFixed(1)} ring3 AGL=${r3agl.toFixed(1)} ring12 y=${course.rings[11].y.toFixed(0)}`);
  assert.ok(spawnAGL >= 40 && spawnAGL <= 60, `spawn AGL ${spawnAGL.toFixed(1)} (expected 40-60)`);
  for (let i = 0; i < 3; i += 1) {
    const agl = course.rings[i].y - groundAt(course.rings[i].x, course.rings[i].z);
    assert.ok(agl < 100, `ring ${i + 1} AGL ${agl.toFixed(1)} (expected < 100)`);
  }
  assert.ok(course.rings[11].y > course.rings[0].y + 50, `course climbs: ring12 ${course.rings[11].y.toFixed(0)} vs ring1 ${course.rings[0].y.toFixed(0)}`);
  const r3 = course.rings[2];
  const gUnder = groundAt(r3.x, r3.z);
  const gNorth = groundAt(r3.x, r3.z - 300);
  const gCrest = groundAt(r3.x, r3.z - 450);
  console.log(`  ring3 ground under=${gUnder.toFixed(1)} 300m north=${gNorth.toFixed(1)} 450m north (crest)=${gCrest.toFixed(1)}`);
  assert.ok(gUnder < 5, `ground under ring 3 ${gUnder.toFixed(1)} (expected sea < 5)`);
  assert.ok(gNorth > 60, `ground 300 m north of ring 3 ${gNorth.toFixed(1)} (expected steep hill flank > 60)`);
  assert.ok(gCrest > 120, `ground 450 m north of ring 3 ${gCrest.toFixed(1)} (expected ridge crest > 120)`);
});

// --- 23. Rings sit below the storm deck (v21d: user 27 Nov 11:49) ------
// The storm deck's base is ~196 m (lobe y 248 minus rx x y-scale);
// every ring's top (y + ring radius) must sit below it, so the
// rings are UNDER the black clouds and stay readable — a regression
// guard: if the course is ever raised, this fails before the rings
// poke into the deck.
check('rings sit below the storm deck base', () => {
  const course = buildCourse();
  let maxTop = -Infinity;
  for (const r of course.rings) maxTop = Math.max(maxTop, r.y + COURSE.ringRadius);
  console.log(`  highest ring top=${maxTop.toFixed(1)} (deck base ~196)`);
  assert.ok(maxTop < 190, `highest ring top ${maxTop.toFixed(1)} (expected < 190, below the deck base ~196)`);
});

console.log(`\n${passed}/23 headless tests passed`);
if (process.exitCode) console.log('HEADLESS TESTS: FAIL');
else console.log('HEADLESS TESTS: ALL PASS');
