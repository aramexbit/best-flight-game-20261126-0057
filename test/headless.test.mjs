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
//  19. A human flight to the strip at throttle 0.3, VS -5, WINS
//      after 12 rings (v22 auto-win: the win triggers on corridor
//      entry, the autopilot lands — there is no manual touchdown
//      and no speed/VS threshold any more).
//  20. v22 auto-win: a full-throttle LEVEL arrival WINS (the win
//      triggers over the strip, the autopilot lands it as
//      'autoland'); the steep -11 m/s descent at 0.3 also wins.
//      A diving arrival (speed 85+ / VS -25) wins too now — the
//      autopilot never explodes, in any condition (tested in 31).
//  24. Early rings are 16 m and a 15 m off-centre ring-2 crossing
//      counts (v22: Weak diag near-misses at 14.6-19.7 m must pass).
//  25. Linear climb: early ring steps are all <= 10 m (v22).
//  27. tornadoCells: spout3 near ring 4; the ORANYE detour target
//      (20 m from spout3 toward ring 4) is inside its kill cylinder.
//  28. Throttle-on level arrival (75 m/s, VS -5, 12 rings) WINS as
//      'autoland' (v22 auto-win — the exact profile that crashed
//      the user's own landing on v21; the win triggers the moment
//      the plane is over the strip, and the autopilot lands it).
//  29. Steep descents win: VS -14 from 300 m short and VS -18 from
//      320 m short fly into the corridor and win; an 80 m/s /
//      VS -20 dive over the strip wins too — the autopilot never
//      explodes, in any condition. Telemetry branch asserted (WIN).
//  30. Lateral + water: a touchdown 60 m off the centreline
//      CRASHES (it is not over the asphalt); 100 m off the
//      centreline on land CRASHES; a gentle touchdown in the open
//      sea CRASHES; flying over the strip at lat +20 WINS as
//      'autoland'.
//  31. Guards: a 95 m/s dive over the strip WINS (the autopilot
//      saves it); a fast touchdown on the strip BEFORE all 12 rings
//      crashes (the win stays gated to 12 rings); a touchdown 300 m
//      short of the strip crashes; flying over the strip with 11
//      rings does NOT trigger the win (still flying after 3 s).
//  32. The ORANYE detour, flown: a rival starting 15 m ahead of the
//      player, racing at ~0.88 throttle and dashing full-throttle at
//      the detour target in t 13-18 s, is KILLED by spout3 inside the
//      window, at ring-4 altitude (v22 — the v21 kill only ever fired
//      in the probe; this proves the scripted detour reaches the
//      funnel in normal play).
//  33. ALT vs AGL read consistent (v22): the top-left altitude
//      panel is labelled "ALT · MSL" (not bare ALTITUDE); after
//      12/12 the AGL pill becomes the WIN cue — SPD in knots, AGL
//      in feet, glide verdict, "AUTOLAND READY" when lined up on
//      final / "FLY OVER RUNWAY 09 TO WIN" otherwise, and
//      "AUTOPILOT LANDING…" once the win has triggered — fed by
//      main.js hudView's spdKt / aligned / autoLanding fields; and
//      the cockpit HUD dedup (hud.setCockpitHud +
//      body.cockpit-view rules) is wired at the C toggle, startGame
//      and the staged cockpit shot.
//  34. Manual until the win, autopilot ONLY after it (v22, user
//      27 Nov 15:46): with 11 rings the player's dive over the
//      strip is OBEYED (it crashes — no rescue) and a climb input
//      actually climbs the plane; with 12 rings the SAME dive is
//      IGNORED once the win triggers and the autopilot lands it.
//  35. v24 approach valley: the ground is carved to ~32 m at x=950
//      and ~64 m at x=1000 on the centreline, the strip threshold
//      at x=1025 is untouched, and 110 m off the centreline the
//      ridge still stands — a notch, not a flattening.
//  36. v24 dive after ring 12 (VS -14.5 from 145 m, full throttle)
//      reaches the corridor alive and WINS (the v22 live-playtest
//      crash, replayed exactly — on v23 terrain it died at x=945).
//  37. v24 widened corridor: lat +35 wins as autoland (lat +60
//      still crashes, test 30).
//  38. v24 ring pointer holds: a raw angle flickering 0<->180 for
//      2 s never flips the shown arrow; a steady 180 flips only
//      after a 0.5 s hold; jitter within ±10° never moves it; a
//      new ring adopts at once.
//  39. v24 final pull-up assist: full bias on a steep dive with the
//      ground 10 m below, zero when high or climbing, small and
//      positive on a gentle descent.
//  40. v24 lightning tubes: core + halo TubeGeometry, 320 m glow,
//      4000 light, 0.35 s flash — with the probe-facing shape kept
//      (3 echoes, line.material.opacity as the strike signal).
// Run: node test/headless.test.mjs   (exit 0 = all pass)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRandom } from '../game/src/random.js';
import { planIslands, createGroundAt } from '../game/src/terrain.js';
import { createCourse } from '../game/src/rings.js';
import { createFlight, finalAssistPullUp } from '../game/src/flight.js';
import { stableRingDir } from '../game/src/hud.js';
import { STEP, COURSE } from '../game/src/config.js';
import { gustAt, tornadoAt, tornadoCells } from '../game/src/storm.js';
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

check('near-miss (20 m off-centre) is a near-miss', () => {
  const course = buildCourse();
  const ring = course.nextRing();
  const ax = ring.axis;
  // v22: ring 1 is 16 m now (was 13), so the near-miss probe moves
  // from 15 m to 20 m off-centre — 15 m is a PASS through the bigger
  // opening, and 20 m sits inside the 1.7x near-miss band (27.2 m).
  const perp = { x: -ax.z, y: 0, z: ax.x };
  const prev = { x: ring.x - ax.x * 10 + perp.x * 20, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 + perp.z * 20 };
  const pos = { x: ring.x + ax.x * 10 + perp.x * 20, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 + perp.z * 20 };
  const pass = course.checkPass(prev, pos);
  assert.ok(pass && !pass.passed && pass.nearMiss, `expected a near-miss, got ${JSON.stringify(pass)}`);
  console.log(`  centre=${pass.centre.toFixed(2)} m bonus=${pass.bonus} (ring radius ${ring.radius} m)`);
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

// --- 19 + 20. Human flights to the strip after ring 12 (v22 auto-win) --
// The user's own playtest (27 Nov 09:39 WIB) crashed on a manual
// landing to win — and the 27 Nov 15:11 clarification says the
// player's plane never exploded at all; the win simply never
// triggered. So there is no manual touchdown any more: the human
// controller below flies the plane TO the strip (the sim's land
// regulator with a human's throttle + VS targets: cross-track roll
// aiming 500 m PAST the runway, VS-hold pitch, throttle slewed to
// a target), the win triggers on corridor entry, and the autopilot
// lands. The tests assert the WIN (autoLanding + 'autoland' +
// branch WIN), not just "landed".
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

check('human flight to the strip at throttle 0.3, VS -5, wins after 12 rings', () => {
  const { s, runway } = flyRingsThenLand(-5, 0.3);
  console.log(`  status=${s.status} autoLanding=${s.autoLanding} kind=${s.landingKind} branch=${s.touchdown ? s.touchdown.branch : '-'} rings=${s.ringsPassed} td(x${Math.round(s.x - runway.x)}/z${Math.round(s.z - runway.z)}) spd=${Math.round(s.speed * 1.94)} kts VS=${s.verticalSpeed.toFixed(1)}`);
  assert.equal(s.ringsPassed, 12, `passed ${s.ringsPassed} rings (expected 12)`);
  assert.equal(s.autoLanding, true, 'win should have triggered over the runway (autoLanding)');
  assert.equal(s.status, 'landed', `human flight at 0.3 throttle ${s.status} (expected landed)`);
  assert.equal(s.landingKind, 'autoland', `human flight kind=${s.landingKind} (expected autoland)`);
  assert.equal(s.touchdown.branch, 'WIN', `human flight branch=${s.touchdown.branch} (expected WIN)`);
});

check('full-throttle LEVEL arrival wins; steep -11 m/s at 0.3 wins', () => {
  const fast = flyRingsThenLand(-5, 0.72);
  console.log(`  full-throttle level: status=${fast.s.status} autoLanding=${fast.s.autoLanding} kind=${fast.s.landingKind} branch=${fast.s.touchdown ? fast.s.touchdown.branch : '-'} spd=${Math.round(fast.s.speed * 1.94)} kts`);
  assert.equal(fast.s.status, 'landed', `full-throttle level arrival ${fast.s.status} (expected landed)`);
  // v22 auto-win: a throttle-on arrival WINS instead of crashing
  // (v21: the 62 m/s cap killed it at 75 m/s). The win triggers
  // over the strip and the autopilot lands it — the kind is
  // 'autoland' and the branch is WIN, whatever the approach was.
  assert.equal(fast.s.autoLanding, true, 'full-throttle level arrival should have triggered the win');
  assert.equal(fast.s.touchdown.branch, 'WIN', `full-throttle level arrival branch=${fast.s.touchdown.branch} (expected WIN)`);
  assert.equal(fast.s.landingKind, 'autoland', `full-throttle level arrival kind=${fast.s.landingKind} (expected autoland)`);
  const steep = flyRingsThenLand(-11, 0.3);
  console.log(`  steep -11: status=${steep.s.status} kind=${steep.s.landingKind} branch=${steep.s.touchdown ? steep.s.touchdown.branch : '-'} spd=${Math.round(steep.s.speed * 1.94)} kts VS=${steep.s.verticalSpeed.toFixed(1)}`);
  assert.equal(steep.s.status, 'landed', `steep -11 m/s at 0.3 throttle ${steep.s.status} (expected landed)`);
  assert.equal(steep.s.landingKind, 'autoland', `steep -11 kind=${steep.s.landingKind} (expected autoland)`);
  assert.equal(steep.s.touchdown.branch, 'WIN', `steep -11 branch=${steep.s.touchdown.branch} (expected WIN)`);
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
// The storm deck's base is ~192 m (v22: lobe y 262, deepest lobe
// 58 m); every ring's top (y + ring radius) must sit below it, so
// the rings are UNDER the black clouds and stay readable — a
// regression guard: if the course is ever raised, this fails before
// the rings poke into the deck.
check('rings sit below the storm deck base', () => {
  const course = buildCourse();
  let maxTop = -Infinity;
  for (const r of course.rings) maxTop = Math.max(maxTop, r.y + r.radius);
  console.log(`  highest ring top=${maxTop.toFixed(1)} (deck base ~192)`);
  assert.ok(maxTop < 190, `highest ring top ${maxTop.toFixed(1)} (expected < 190, below the deck base ~192)`);
});

// --- 24. Early rings are forgiving (v22) --------------------------------
// Rings 1-5 are 16 m (was 13 m): a 15 m off-centre crossing of ring 2
// COUNTS as a pass now (it was a near-miss at 13 m — the Weak diag's
// ring-3 misses at 14.6/15.1 m and ring-4's at 18.5 m are the same
// story). Rings 6-12 stay 13 m.
check('early rings are 16 m and a 15 m off-centre ring-2 crossing counts', () => {
  const course = buildCourse();
  for (let i = 0; i < 5; i += 1) {
    assert.equal(course.rings[i].radius, 16, `ring ${i + 1} radius ${course.rings[i].radius} (expected 16)`);
  }
  for (let i = 5; i < 12; i += 1) {
    assert.equal(course.rings[i].radius, 13, `ring ${i + 1} radius ${course.rings[i].radius} (expected 13)`);
  }
  course.setProgress(1); // next ring is ring 2
  const ring = course.nextRing();
  const ax = ring.axis;
  const perp = { x: -ax.z, y: 0, z: ax.x };
  const prev = { x: ring.x - ax.x * 10 + perp.x * 15, y: ring.y - ax.y * 10, z: ring.z - ax.z * 10 + perp.z * 15 };
  const pos = { x: ring.x + ax.x * 10 + perp.x * 15, y: ring.y + ax.y * 10, z: ring.z + ax.z * 10 + perp.z * 15 };
  const pass = course.checkPass(prev, pos);
  assert.ok(pass && pass.passed, `15 m off-centre ring 2 expected a pass, got ${JSON.stringify(pass)}`);
  console.log(`  ring 2 centre=${pass.centre.toFixed(2)} m radius=${ring.radius} m — counts`);
});

// --- 25. Linear climb (v22) ----------------------------------------------
// The course climbs in even ~8 m steps (was +16, +26 m jumps from the
// exponential lerp): every step between consecutive EARLY rings
// (1-2, 2-3, 3-4, 4-5) is <= 10 m, so the Weak pilot can track the
// climb instead of orbiting ring 5. Final heights (after the clearance
// passes) are what the pilot flies, so they are what is measured.
check('linear climb: early ring steps are all <= 10 m', () => {
  const course = buildCourse();
  const ys = course.rings.slice(0, 5).map((r) => r.y);
  console.log(`  early ring heights: ${ys.map((v) => v.toFixed(1)).join(', ')}`);
  for (let i = 1; i < 5; i += 1) {
    const step = ys[i] - ys[i - 1];
    assert.ok(step >= 0 && step <= 10, `ring ${i} -> ${i + 1} step ${step.toFixed(1)} m (expected 0..10)`);
  }
});

// --- 26. (no new check — existing test 17, tap pilot passes ring 5, is
// the guard for the gentle opening; it still passes on the v22 course.)

// --- 27. tornadoCells geometry (v22: ORANYE detour target) ----------
// spout3 sits 55-75 m from ring 4, and the scripted detour target —
// 20 m from spout3 toward ring 4, at ring-4 altitude — is inside
// spout3's kill cylinder (radius 35 m, height band baseY..baseY +
// 264 x 0.55), so the ORANYE tornado kill fires in normal play.
// A point 40 m out (past the 35 m radius) is safe.
check('tornadoCells: spout3 near ring 4; detour target inside its kill cylinder', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const { cells } = tornadoCells(course, groundAt);
  assert.equal(cells.length, 5, `tornado cells ${cells.length} (expected 5)`);
  const s3 = cells.find((c) => c.id === 'spout3');
  assert.ok(s3, 'spout3 must exist');
  const ring4 = course.rings[3];
  const d = Math.hypot(s3.x - ring4.x, s3.z - ring4.z);
  console.log(`  spout3-ring4 dist=${d.toFixed(1)} radius=${s3.radius} scale=${s3.scale} baseY=${s3.baseY.toFixed(1)} ring4 y=${ring4.y.toFixed(1)}`);
  assert.ok(d >= 55 && d <= 75, `spout3 ${d.toFixed(1)} m from ring 4 (expected 55-75)`);
  const ux = (ring4.x - s3.x) / d;
  const uz = (ring4.z - s3.z) / d;
  const hit = tornadoAt(s3.x + ux * 20, ring4.y, s3.z + uz * 20, cells);
  assert.ok(hit && hit.id === 'spout3', `detour target 20 m from spout3 should kill (got ${hit ? hit.id : 'null'})`);
  const safe = tornadoAt(s3.x + ux * 40, ring4.y, s3.z + uz * 40, cells);
  assert.equal(safe, null, `40 m from spout3 (past radius 35) should be safe, got ${safe ? safe.id : 'null'}`);
});

// --- 28-31. v22 auto-win, unit level ---------------------------------
// Teleport the plane above the ground at (x, z) with a given state,
// then step with the pitch/roll FROZEN (stickPitch/stickRoll held
// nonzero so the auto-level never fires — zero input would level
// the wings and float a shallow descent forever) until it stops
// flying. VS at touchdown is speed * sin(pitch); the helper derives
// pitch from the wanted VS. The freeze holds the descent until the
// win triggers; after that flight.js ignores the passed input and
// the autopilot lands. Deterministic, no course flight needed.
function touchdownAt(x, z, { speed, vs, roll = 0, throttle = 0.3, rings = 12, height = 2.0, maxTime = 30 }) {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const flight = createFlight(course.spawn);
  const s = flight.state;
  const g = groundAt(x, z);
  // height m above the ground (default 2.0 m — 0.4 m above the
  // touchdown line: the plane touches down within ~0.1 s, before it
  // can fly on to ground that falls away — at 3 m a shallow descent
  // over the cliff edge east of the runway never catches the dropping
  // terrain (the first v22 run of test 30 stayed 'flying' for the
  // full 5 s for exactly this). Taller placements (30 m) fly INTO the
  // corridor before touching down, so the win triggers mid-flight.
  // The loop runs maxTime seconds: the autopilot rollout needs a few
  // seconds after touchdown, so the cap is 30 s (was 5).
  s.x = x; s.y = g + height; s.z = z;
  s.yaw = Math.atan2(course.runway.dirX, -course.runway.dirZ);
  s.pitch = Math.asin(Math.max(-1, Math.min(1, vs / speed)));
  s.roll = roll;
  s.speed = speed;
  s.throttle = throttle;
  s.ringsPassed = rings;
  s.verticalSpeed = vs;
  for (let i = 0; i < maxTime / STEP; i += 1) {
    if (s.status !== 'flying') break;
    flight.step(STEP, { pitch: 0, roll: 0, yaw: 0, throttle: 0, stickPitch: 1, stickRoll: 1 }, groundAt, course.runway);
  }
  return { s, runway: course.runway, ground: g };
}

function tdLog(tag, r) {
  const t = r.s.touchdown;
  console.log(`  ${tag}: status=${r.s.status} autoLanding=${r.s.autoLanding} kind=${r.s.landingKind} branch=${t ? t.branch : '-'} spd=${r.s.speed.toFixed(1)} VS=${r.s.verticalSpeed.toFixed(1)} pitch=${r.s.pitch.toFixed(2)} roll=${r.s.roll.toFixed(2)} gnd=${r.ground.toFixed(1)}`);
}

// --- 28. Throttle-on level arrival wins (v22 auto-win) ----------------
check('throttle-on level arrival (75 m/s, VS -5, 12 rings) wins as autoland', () => {
  const course = buildCourse();
  const rw = course.runway;
  const r = touchdownAt(rw.x, rw.z, { speed: 75, vs: -5 });
  tdLog('75 m/s on strip', r);
  assert.equal(r.s.autoLanding, true, 'win should have triggered over the strip');
  assert.equal(r.s.status, 'landed', `throttle-on arrival ${r.s.status} (expected landed)`);
  assert.equal(r.s.landingKind, 'autoland', `throttle-on arrival kind=${r.s.landingKind} (expected autoland)`);
  assert.equal(r.s.touchdown.branch, 'WIN', `throttle-on arrival branch=${r.s.touchdown.branch} (expected WIN)`);
});

// --- 29. Steep descents + dives win (v22 auto-win) ---------------------
// v24: the VS -18 case starts 60 m up, not 30 — its start point
// (320 m short) sits over the new approach valley floor (32 m, was
// the 90 m ridge), so "30 m up" on v24 terrain starts at y=62 and
// the plane meets the valley's rising end bank before the corridor
// (a plane that enters the valley that low and that steep SHOULD
// crash — the notch is not a tunnel). At 60 m up (y=92) the same
// steep descent reaches the corridor alive and wins, which is what
// this profile asserts.
check('steep descents win (VS -14 / -18 from short); 80 m/s VS -20 dive wins', () => {
  const course = buildCourse();
  const rw = course.runway;
  const s14 = touchdownAt(rw.x - 270, rw.z, { speed: 60, vs: -14, height: 30 });
  tdLog('VS -14, 270 m short, 30 m up', s14);
  assert.equal(s14.s.autoLanding, true, 'VS -14 should have triggered the win on corridor entry');
  assert.equal(s14.s.status, 'landed', `VS -14 ${s14.s.status} (expected landed)`);
  assert.equal(s14.s.landingKind, 'autoland', `VS -14 kind=${s14.s.landingKind} (expected autoland)`);
  assert.equal(s14.s.touchdown.branch, 'WIN', `VS -14 branch=${s14.s.touchdown.branch} (expected WIN)`);
  const s18 = touchdownAt(rw.x - 320, rw.z, { speed: 61, vs: -18, height: 60 });
  tdLog('VS -18, 320 m short, 60 m up', s18);
  assert.equal(s18.s.autoLanding, true, 'VS -18 should have triggered the win on corridor entry');
  assert.equal(s18.s.status, 'landed', `VS -18 ${s18.s.status} (expected landed)`);
  assert.equal(s18.s.landingKind, 'autoland', `VS -18 kind=${s18.s.landingKind} (expected autoland)`);
  assert.equal(s18.s.touchdown.branch, 'WIN', `VS -18 branch=${s18.s.touchdown.branch} (expected WIN)`);
  const dive = touchdownAt(rw.x, rw.z, { speed: 80, vs: -20 });
  tdLog('80 m/s VS -20', dive);
  assert.equal(dive.s.autoLanding, true, '80 m/s dive should have triggered the win over the strip');
  assert.equal(dive.s.status, 'landed', `dive ${dive.s.status} (expected landed — the autopilot never explodes)`);
  assert.equal(dive.s.landingKind, 'autoland', `dive kind=${dive.s.landingKind} (expected autoland)`);
  assert.equal(dive.s.touchdown.branch, 'WIN', `dive branch=${dive.s.touchdown.branch} (expected WIN)`);
});

// --- 30. Lateral + water: off-asphalt touchdowns crash; lat +20 wins ---
check('60 m off centreline crashes; 100 m off crashes; sea crashes; lat +20 wins', () => {
  const course = buildCourse();
  const rw = course.runway;
  const off = touchdownAt(rw.x, rw.z + 60, { speed: 55, vs: -5 });
  tdLog('60 m off centreline', off);
  assert.equal(off.s.autoLanding, false, '60 m off centreline should NOT trigger the win (outside the corridor)');
  assert.equal(off.s.status, 'crashed', `60 m off centreline ${off.s.status} (expected crashed — not over the asphalt)`);
  assert.equal(off.s.touchdown.branch, 'CRASH', `60 m off centreline branch=${off.s.touchdown.branch} (expected CRASH)`);
  const field = touchdownAt(rw.x, rw.z + 100, { speed: 55, vs: -5 });
  tdLog('100 m off centreline, on land', field);
  assert.ok(field.ground > 2, `off-field ground ${field.ground.toFixed(1)} (expected land > 2)`);
  assert.equal(field.s.status, 'crashed', `100 m off centreline ${field.s.status} (expected crashed)`);
  assert.equal(field.s.touchdown.branch, 'CRASH', `100 m off centreline branch=${field.s.touchdown.branch} (expected CRASH)`);
  const sea = touchdownAt(-2000, -2000, { speed: 55, vs: -5 });
  tdLog('open sea', sea);
  assert.equal(sea.ground, 0, `sea ground ${sea.ground} (expected 0)`);
  assert.equal(sea.s.status, 'crashed', `sea ditching ${sea.s.status} (expected crashed)`);
  assert.equal(sea.s.landingKind, null, `sea ditching kind=${sea.s.landingKind} (expected null)`);
  const lat20 = touchdownAt(rw.x, rw.z + 20, { speed: 55, vs: -5, height: 30 });
  tdLog('lat +20, 30 m up', lat20);
  assert.equal(lat20.s.autoLanding, true, 'lat +20 (inside the corridor) should trigger the win');
  assert.equal(lat20.s.status, 'landed', `lat +20 ${lat20.s.status} (expected landed)`);
  assert.equal(lat20.s.landingKind, 'autoland', `lat +20 kind=${lat20.s.landingKind} (expected autoland)`);
  assert.equal(lat20.s.touchdown.branch, 'WIN', `lat +20 branch=${lat20.s.touchdown.branch} (expected WIN)`);
});

// --- 31. Guards: dives win, the win stays gated ------------------------
check('95 m/s dive wins; fast touchdown before 12 rings crashes; VS -32 wins; 11 rings no win; 300 m short crashes', () => {
  const course = buildCourse();
  const rw = course.runway;
  const dive = touchdownAt(rw.x, rw.z, { speed: 95, vs: -10 });
  tdLog('95 m/s dive', dive);
  assert.equal(dive.s.autoLanding, true, '95 m/s dive should have triggered the win over the strip');
  assert.equal(dive.s.status, 'landed', `95 m/s dive ${dive.s.status} (expected landed — the autopilot never explodes)`);
  assert.equal(dive.s.landingKind, 'autoland', `95 m/s dive kind=${dive.s.landingKind} (expected autoland)`);
  assert.equal(dive.s.touchdown.branch, 'WIN', `95 m/s dive branch=${dive.s.touchdown.branch} (expected WIN)`);
  const early = touchdownAt(rw.x, rw.z, { speed: 55, vs: -5, rings: 0 });
  tdLog('55 m/s, 0 rings', early);
  assert.equal(early.s.status, 'crashed', `fast touchdown with 0 rings ${early.s.status} (expected crashed — the win stays gated to 12 rings)`);
  assert.equal(early.s.touchdown.branch, 'CRASH', `0 rings branch=${early.s.touchdown.branch} (expected CRASH)`);
  const plunge = touchdownAt(rw.x, rw.z, { speed: 55, vs: -32 });
  tdLog('VS -32', plunge);
  assert.equal(plunge.s.autoLanding, true, 'VS -32 should have triggered the win over the strip');
  assert.equal(plunge.s.status, 'landed', `VS -32 ${plunge.s.status} (expected landed — the autopilot never explodes)`);
  assert.equal(plunge.s.landingKind, 'autoland', `VS -32 kind=${plunge.s.landingKind} (expected autoland)`);
  assert.equal(plunge.s.touchdown.branch, 'WIN', `VS -32 branch=${plunge.s.touchdown.branch} (expected WIN)`);
  const noWin = touchdownAt(rw.x, rw.z, { speed: 55, vs: 0, rings: 11, height: 40, maxTime: 3 });
  tdLog('11 rings, level, 40 m up', noWin);
  assert.equal(noWin.s.autoLanding, false, '11 rings should NOT trigger the win');
  assert.equal(noWin.s.status, 'flying', `11 rings ${noWin.s.status} (expected flying — no win, no touchdown)`);
  const short = touchdownAt(rw.x - 300, rw.z, { speed: 55, vs: -5 });
  tdLog('300 m short', short);
  assert.equal(short.s.status, 'crashed', `300 m short ${short.s.status} (expected crashed — ground contact before the finish line)`);
  assert.equal(short.s.touchdown.branch, 'CRASH', `300 m short branch=${short.s.touchdown.branch} (expected CRASH)`);
});

// --- 32. ORANYE detour, flown (v22 — tornado-kill in normal play) -----
// The scripted detour from rivals.js, replayed flight-level: ORANYE
// starts 15 m ahead of the player, races its rings at ~0.88 throttle
// (its 1.22 speed bias against the pack), then in t 13-18 s dashes
// full-throttle at the point 20 m from spout3 toward ring 4. The kill
// must fire inside the window, in spout3, at ring-4 altitude — the
// v21 kill only ever fired in the probe (teleported), at the frame's
// left edge; this is the geometry proof the live probe A12 then
// confirms visually.
check('ORANYE detour: full-throttle dash at spout3 kills inside t 13-18 s', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const { cells } = tornadoCells(course, groundAt);
  const s3 = cells.find((c) => c.id === 'spout3');
  const ring4 = course.rings[3];
  const flight = createFlight(course.spawn);
  const s = flight.state;
  const fx = Math.sin(course.spawn.yaw);
  const fz = -Math.cos(course.spawn.yaw);
  s.x += fx * 15;
  s.z += fz * 15;
  let prev = { x: s.x, y: s.y, z: s.z };
  let kill = null;
  while (s.elapsed < 30 && s.status === 'flying') {
    let target;
    let throttle;
    if (s.elapsed >= 13 && s.elapsed <= 18) {
      const d = Math.hypot(ring4.x - s3.x, ring4.z - s3.z) || 1;
      target = {
        x: s3.x + (ring4.x - s3.x) / d * 20,
        y: ring4.y,
        z: s3.z + (ring4.z - s3.z) / d * 20,
      };
      throttle = 1.0;
    } else {
      target = course.nextRing() || { x: course.runway.x, y: course.runway.height + 40, z: course.runway.z };
      throttle = 0.88;
    }
    flight.step(STEP, autopilotTo(flight, target, throttle, groundAt), groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) s.ringsPassed += 1;
    prev = { x: s.x, y: s.y, z: s.z };
    const hit = tornadoAt(s.x, s.y, s.z, cells);
    if (hit) { kill = { t: s.elapsed, id: hit.id, y: s.y }; break; }
  }
  console.log(`  kill at t=${kill ? kill.t.toFixed(2) : 'NONE'} id=${kill ? kill.id : '-'} y=${kill ? kill.y.toFixed(1) : '-'} (ring4 y=${ring4.y.toFixed(1)}) rings=${s.ringsPassed}`);
  assert.ok(kill, 'ORANYE should be killed by a tornado during the detour window');
  assert.equal(kill.id, 'spout3', `kill should be spout3 (got ${kill.id})`);
  assert.ok(kill.t >= 13 && kill.t <= 18, `kill at t=${kill.t.toFixed(2)} (expected inside the 13-18 s detour window)`);
  assert.ok(Math.abs(kill.y - ring4.y) < 15, `kill altitude ${kill.y.toFixed(1)} vs ring 4 ${ring4.y.toFixed(1)} (expected within 15 m)`);
  assert.ok(s.ringsPassed >= 2, `ORANYE passed ${s.ringsPassed} rings before the kill (expected >= 2 — it races first, then detours)`);
});

// --- 33. ALT · MSL + WIN cue + cockpit HUD dedup (v22 auto-win) --------
// Static checks on the shipped files: the altitude panel reads
// "ALT · MSL" (the v21 landing shot's "ALT 378 FT" against the
// "AGL 81 FT" pill read as contradictory — one is MSL, one is AGL,
// and only the pill said so); after 12/12 the AGL pill becomes the
// WIN cue (SPD in knots, AGL in feet, glide verdict, "AUTOLAND
// READY" when lined up on final / "FLY OVER RUNWAY 09 TO WIN"
// otherwise, "AUTOPILOT LANDING…" once the win has triggered) —
// fed by main.js hudView's spdKt / aligned / autoLanding fields.
// There is no speed/VS threshold any more, so the old VS-zone
// colours and the "TOUCHDOWN READY" string are gone. The cockpit
// dedup is wired (hud.setCockpitHud exported and called at the C
// toggle, startGame and the staged cockpit shot; the
// body.cockpit-view rules hide the duplicated panels).
check('ALT labelled MSL, WIN cue present, cockpit HUD dedup wired', () => {
  const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
  const hudJs = readFileSync(new URL('../game/src/hud.js', import.meta.url), 'utf8');
  const mainJs = readFileSync(new URL('../game/src/main.js', import.meta.url), 'utf8');
  assert.ok(html.includes('<div class="label">ALT · MSL</div>'), 'ALT panel label should read "ALT · MSL"');
  assert.ok(!html.includes('<div class="label">ALTITUDE</div>'), 'bare "ALTITUDE" label should be gone');
  assert.ok(html.includes('id="hud-agl"'), 'AGL pill element should still exist');
  assert.ok(hudJs.includes('AUTOLAND READY'), 'WIN cue should show AUTOLAND READY when lined up on final');
  assert.ok(hudJs.includes('FLY OVER RUNWAY 09 TO WIN'), 'WIN cue should show FLY OVER RUNWAY 09 TO WIN otherwise');
  assert.ok(hudJs.includes('AUTOPILOT LANDING'), 'WIN cue should show AUTOPILOT LANDING once the win has triggered');
  assert.ok(!hudJs.includes('TOUCHDOWN READY'), 'old TOUCHDOWN READY string should be gone (no touchdown threshold any more)');
  assert.ok(!hudJs.includes("vs >= -16.5"), 'old VS-zone colour should be gone (no VS threshold any more)');
  assert.ok(hudJs.includes('SPD ${Math.round(view.spdKt ?? 0)} KT'), 'WIN cue should show SPD in knots');
  assert.ok(hudJs.includes('AGL ${Math.round(view.aglFt)} FT'), 'WIN cue should show AGL in feet');
  assert.ok(mainJs.includes('spdKt: s.speed * 1.94384'), 'main.js hudView should expose speed in knots');
  assert.ok(mainJs.includes('vsMs: s.verticalSpeed'), 'main.js hudView should still expose VS in m/s');
  assert.ok(mainJs.includes('aligned'), 'main.js hudView should compute alignment for the pill');
  assert.ok(mainJs.includes('onFinal: s.ringsPassed >= COURSE.ringCount'), 'main.js hudView should compute onFinal after 12/12');
  assert.ok(mainJs.includes('autoLanding: s.autoLanding'), 'main.js hudView should expose autoLanding for the pill');
  assert.ok(html.includes('body.cockpit-view #hud-top-left'), 'cockpit-view CSS should hide the top-left panels');
  assert.ok(html.includes('body.cockpit-view #attitude'), 'cockpit-view CSS should hide the attitude ball');
  assert.ok(html.includes('body.cockpit-view #compass'), 'cockpit-view CSS should hide the compass');
  assert.ok(hudJs.includes('function setCockpitHud(on)'), 'hud.js should define setCockpitHud');
  assert.ok(hudJs.includes('setCockpitHud }'), 'hud.js should export setCockpitHud');
  const calls = (mainJs.match(/hud\.setCockpitHud\(/g) || []).length;
  assert.ok(calls >= 3, `main.js should call hud.setCockpitHud at the C toggle, startGame and runShot (found ${calls})`);
  assert.ok(mainJs.includes('aglFt'), 'main.js hudView should still compute AGL in feet for the pill');
  console.log(`  ALT · MSL label OK; WIN cue OK (SPD/AGL/AUTOLAND READY/AUTOPILOT LANDING); cockpit-view CSS OK; setCockpitHud calls in main.js: ${calls}`);
});

// --- 34. Manual until the win; autopilot ONLY after it (v22, user 27 Nov 15:46) ---
// The user clarified (27 Nov 15:46 WIB): the player flies MANUAL from
// the start to ring 12 (rings, racing the other teams, dodging the
// storm/tornadoes — all manual as usual). ONLY the win is automatic:
// after 12/12 rings and over the finish line (runway 09 asphalt) the
// WIN triggers, then the autopilot takes over ONLY for the smooth
// landing (descend, flare, touchdown, rollout). Manual control during
// the race must NOT change — the autopilot must never engage before
// the win triggers. This test proves both halves at flight level:
// (A) with 11 rings, a sustained player dive + full throttle over the
// strip is OBEYED (the plane dives and crashes — no autoland, no
// rescue); (B) with 12 rings, the SAME player dive + full throttle is
// IGNORED once the win triggers (the autopilot lands it as
// 'autoland'); (C) with 11 rings mid-race, a sustained player climb
// input actually climbs the plane (manual authority intact).
check('manual before the win (11 rings: dive crashes, climb climbs); autopilot only after the win (12 rings: dive ignored, autoland)', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const rw = course.runway;
  const dive = { pitch: -1, roll: 0, yaw: 0, throttle: 1, stickPitch: -1, stickRoll: 0 };
  // (A) 11 rings: the player's dive over the strip is obeyed — no win, no rescue.
  const early = createFlight(course.spawn);
  const se = early.state;
  se.x = rw.x; se.y = groundAt(rw.x, rw.z) + 40; se.z = rw.z;
  se.yaw = Math.atan2(rw.dirX, -rw.dirZ); se.pitch = 0; se.roll = 0;
  se.speed = 55; se.throttle = 0.3; se.ringsPassed = 11; se.verticalSpeed = 0;
  for (let i = 0; i < 30 / STEP; i += 1) {
    if (se.status !== 'flying') break;
    early.step(STEP, dive, groundAt, rw);
  }
  console.log(`  11 rings dive: status=${se.status} autoLanding=${se.autoLanding} kind=${se.landingKind} branch=${se.touchdown ? se.touchdown.branch : '-'}`);
  assert.equal(se.autoLanding, false, 'autopilot must NOT engage before 12 rings');
  assert.equal(se.status, 'crashed', `11-ring dive ${se.status} (expected crashed — the player's input is obeyed, no rescue)`);
  // (B) 12 rings: the SAME dive is ignored once the win triggers — the autopilot lands it.
  const late = createFlight(course.spawn);
  const sl = late.state;
  sl.x = rw.x; sl.y = groundAt(rw.x, rw.z) + 40; sl.z = rw.z;
  sl.yaw = Math.atan2(rw.dirX, -rw.dirZ); sl.pitch = 0; sl.roll = 0;
  sl.speed = 55; sl.throttle = 0.3; sl.ringsPassed = 12; sl.verticalSpeed = 0;
  for (let i = 0; i < 30 / STEP; i += 1) {
    if (sl.status !== 'flying') break;
    late.step(STEP, dive, groundAt, rw);
  }
  console.log(`  12 rings dive: status=${sl.status} autoLanding=${sl.autoLanding} kind=${sl.landingKind} branch=${sl.touchdown ? sl.touchdown.branch : '-'} spd=${sl.speed.toFixed(1)}`);
  assert.equal(sl.autoLanding, true, 'win should have triggered over the strip at 12 rings');
  assert.equal(sl.status, 'landed', `12-ring dive ${sl.status} (expected landed — the autopilot ignores the dive and lands)`);
  assert.equal(sl.landingKind, 'autoland', `12-ring dive kind=${sl.landingKind} (expected autoland)`);
  assert.equal(sl.touchdown.branch, 'WIN', `12-ring dive branch=${sl.touchdown.branch} (expected WIN)`);
  // (C) 11 rings mid-race: a sustained player climb input actually climbs the plane.
  const climb = createFlight(course.spawn);
  const sc = climb.state;
  sc.x = rw.x - 1000; sc.y = groundAt(rw.x - 1000, rw.z) + 60; sc.z = rw.z;
  sc.yaw = Math.atan2(rw.dirX, -rw.dirZ); sc.pitch = 0; sc.roll = 0;
  sc.speed = 55; sc.throttle = 0.5; sc.ringsPassed = 11; sc.verticalSpeed = 0;
  const y0 = sc.y;
  for (let i = 0; i < 2 / STEP; i += 1) {
    climb.step(STEP, { pitch: 1, roll: 0, yaw: 0, throttle: 0, stickPitch: 1, stickRoll: 0 }, groundAt, rw);
  }
  console.log(`  11 rings climb: y ${y0.toFixed(1)} -> ${sc.y.toFixed(1)} (+${(sc.y - y0).toFixed(1)} m) autoLanding=${sc.autoLanding} status=${sc.status}`);
  assert.ok(sc.y > y0 + 5, `player climb input should gain altitude (y ${y0.toFixed(1)} -> ${sc.y.toFixed(1)})`);
  assert.equal(sc.autoLanding, false, 'autopilot must NOT engage mid-race');
  assert.equal(sc.status, 'flying', `climb run ${sc.status} (expected flying)`);
});

// --- 35. v24 approach valley: the notch, measured ----------------------
// The v22 live-playtest crash was a terrain fact (ridge 90 m at
// x=950-1000 on the centreline) as much as a flying fact. The valley
// carves the centreline to a 32 m floor at x=950 and ~64 m at x=1000
// (under the dive line, ~78 m), leaves the strip threshold at x=1025
// exactly at runway height, and leaves the ridge standing 110 m off
// the centreline — a notch, not a flattening.
// REVISION (v24 final): measured x950=32.0, x1000=63.8, x1025=90.3,
// off-centreline(+110)=88.3 — the assertions above hold with margin.
// The live B2 probe flew this notch and landed (dx +73, lat -1.4).
check('v24 approach valley: ~32 m at x=950, ~64 m at x=1000, strip intact at x=1025, ridge stands off-centreline', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const rw = course.runway;
  const g950 = groundAt(rw.x - 300, rw.z);
  const g1000 = groundAt(rw.x - 250, rw.z);
  const g1025 = groundAt(rw.x - 225, rw.z);
  const gOff = groundAt(rw.x - 300, rw.z + 110);
  console.log(`  valley: x950=${g950.toFixed(1)} x1000=${g1000.toFixed(1)} x1025=${g1025.toFixed(1)} off-centreline(+110)=${gOff.toFixed(1)} (was 90.2/90.3/90.3)`);
  assert.ok(g950 > 28 && g950 < 36, `valley floor at x=950 ${g950.toFixed(1)} (expected ~32)`);
  assert.ok(g1000 > 58 && g1000 < 70, `valley at x=1000 ${g1000.toFixed(1)} (expected ~64, under the dive line ~78)`);
  assert.ok(Math.abs(g1025 - rw.height) < 0.5, `strip threshold x=1025 ${g1025.toFixed(1)} vs runway height ${rw.height.toFixed(1)} (expected untouched)`);
  assert.ok(gOff > 75, `110 m off the centreline the ridge stands (${gOff.toFixed(1)} — the valley is a notch, not a flattening)`);
});

// --- 36. v24 dive after ring 12 wins (the v22 crash, replayed) ---------
// Ring 12 (729, 145), speed 60, VS -14.5, throttle full, pitch frozen
// (the sim profile, at flight level): on v23 terrain this flew into
// the ridge at x=945 (dx -305). The valley must carry it into the
// corridor alive; the win then triggers and the autopilot lands it.
check('v24 dive after ring 12 (VS -14.5 from 145 m, full throttle) reaches the corridor alive and wins', () => {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  const rw = course.runway;
  const r12 = course.rings[11];
  const flight = createFlight(course.spawn);
  const s = flight.state;
  s.x = r12.x; s.y = r12.y; s.z = r12.z;
  s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
  s.pitch = Math.asin(-14.5 / 60);
  s.roll = 0; s.speed = 60; s.throttle = 1.0; s.ringsPassed = 12; s.verticalSpeed = -14.5;
  for (let i = 0; i < 60 / STEP; i += 1) {
    if (s.status !== 'flying') break;
    flight.step(STEP, { pitch: 0, roll: 0, yaw: 0, throttle: 0, stickPitch: 1, stickRoll: 1 }, groundAt, rw);
  }
  console.log(`  ring-12 dive: status=${s.status} autoLanding=${s.autoLanding} kind=${s.landingKind} branch=${s.touchdown ? s.touchdown.branch : '-'} td=(${s.touchdown ? s.touchdown.dx : '-'}/${s.touchdown ? s.touchdown.lat : '-'})`);
  assert.equal(s.autoLanding, true, 'ring-12 dive should have triggered the win on corridor entry');
  assert.equal(s.status, 'landed', `ring-12 dive ${s.status} (expected landed — the valley carries it in)`);
  assert.equal(s.landingKind, 'autoland', `ring-12 dive kind=${s.landingKind} (expected autoland)`);
  assert.equal(s.touchdown.branch, 'WIN', `ring-12 dive branch=${s.touchdown.branch} (expected WIN)`);
});

// --- 37. v24 widened corridor: lat +35 wins ----------------------------
check('v24 widened corridor: lat +35 wins as autoland (lat +60 still crashes, test 30)', () => {
  const course = buildCourse();
  const rw = course.runway;
  const lat35 = touchdownAt(rw.x, rw.z + 35, { speed: 55, vs: -5, height: 30 });
  tdLog('lat +35, 30 m up', lat35);
  assert.equal(lat35.s.autoLanding, true, 'lat +35 (inside the widened 40 m corridor) should trigger the win');
  assert.equal(lat35.s.status, 'landed', `lat +35 ${lat35.s.status} (expected landed)`);
  assert.equal(lat35.s.landingKind, 'autoland', `lat +35 kind=${lat35.s.landingKind} (expected autoland)`);
  assert.equal(lat35.s.touchdown.branch, 'WIN', `lat +35 branch=${lat35.s.touchdown.branch} (expected WIN)`);
});

// --- 38. v24 ring pointer holds (stableRingDir, pure) -------------------
check('v24 ring pointer holds: flicker never flips in 2 s; steady flips after 0.5 s; jitter never moves it', () => {
  const st = { shown: null, cand: null, candSince: 0, ringNum: 0 };
  // First sighting adopts at once.
  assert.equal(stableRingDir(0, st, 0, 1), 0);
  // Raw flickers 0 <-> 180 every 0.1 s for 2 s (the camera-boundary
  // flip the live playtest saw): the shown arrow must never move.
  let shown = 0;
  for (let t = 0.1; t <= 2.0; t += 0.1) {
    const raw = (Math.round(t * 10) % 2 === 0) ? 0 : 180;
    shown = stableRingDir(raw, st, t, 1);
  }
  assert.equal(shown, 0, `flickering raw 0<->180 should hold the arrow at 0 (got ${shown})`);
  // A STEADY 180 for 1 s: still 0 at 0.4 s, flipped by 0.6 s.
  assert.equal(stableRingDir(180, st, 2.1, 1), 0);
  assert.equal(stableRingDir(180, st, 2.4, 1), 0);
  assert.equal(stableRingDir(180, st, 2.6, 1), 180);
  // Jitter within ±10 deg of the shown 180 never moves it.
  assert.equal(stableRingDir(172, st, 2.7, 1), 180);
  assert.equal(stableRingDir(188, st, 2.8, 1), 180);
  // A new ring adopts its raw at once, whatever the old arrow was.
  assert.equal(stableRingDir(-90, st, 2.9, 2), -90);
  console.log('  flicker 2 s: held 0; steady 180: flipped at 2.6 s (0.5 s hold); jitter ±10: held 180; ring change: adopted -90 at once');
});

// --- 39. v24 final pull-up assist (pure) -------------------------------
check('v24 final pull-up assist: full bias on a steep dive at the ridge, zero level or high', () => {
  // Steep dive, ground 10 m below: full pull-up.
  assert.ok(finalAssistPullUp(100, -14, 90) > 0.9, `dive clearance 10 VS -14 should be ~1 (got ${finalAssistPullUp(100, -14, 90)})`);
  // Same dive 40 m above the ground ahead: nothing.
  assert.equal(finalAssistPullUp(130, -14, 90), 0);
  // Climbing over the ridge: nothing, even close.
  assert.equal(finalAssistPullUp(100, 2, 90), 0);
  // Gentle descent, 20 m clearance: a small positive bias.
  const gentle = finalAssistPullUp(110, -5, 90);
  assert.ok(gentle > 0 && gentle < 0.4, `gentle descent clearance 20 VS -5 should be small positive (got ${gentle})`);
  console.log(`  dive/10m=${finalAssistPullUp(100, -14, 90).toFixed(2)} high/40m=0 climb=0 gentle/20m=${gentle.toFixed(2)}`);
});

// --- 40. v24 lightning tubes (source-level, like test 33) --------------
// createStorm needs THREE + document, so the tube geometry is asserted
// on the shipped source (the live A13 probe + the screenshots prove it
// renders); the probe-facing shape is asserted too.
// REVISION (v24 final): live A13 poll counted 22 strikes in 20 s
// (maxOp 1, 3 lines + glow + 5 tornadoes) — the most of any version;
// A13b staged glowOp 0.95. The tubes are what the frames show: a
// thick white column on the cover, a thick zigzag in the cockpit.
check('v24 lightning tubes: core+halo TubeGeometry, 320 m glow, 4000 light, 0.35 s flash; probe shape kept', () => {
  const stormJs = readFileSync(new URL('../game/src/storm.js', import.meta.url), 'utf8');
  assert.ok(stormJs.includes('new THREE.TubeGeometry(path, 48, 1.8, 6, false)'), 'core tube should be TubeGeometry radius 1.8');
  assert.ok(stormJs.includes('new THREE.TubeGeometry(path, 32, 5, 6, false)'), 'halo tube should be TubeGeometry radius 5');
  assert.ok(stormJs.includes('bolts[e].halo.material.opacity = 0.35'), 'halo should light at 0.35');
  assert.ok(stormJs.includes('spr.scale.set(320, 320, 1)'), 'glow sprite should be 320 m');
  assert.ok(stormJs.includes('boltGlow.material.opacity = 0.95'), 'glow should light at 0.95');
  assert.ok(stormJs.includes('boltLight.intensity = 4000'), 'flash light should be 4000');
  assert.ok(stormJs.includes('new THREE.PointLight(0xcfe4ff, 0, 2000, 1)'), 'flash light distance should be 2000');
  assert.ok(stormJs.includes('boltLife = life || 0.35'), 'live flash should last 0.35 s');
  assert.ok(stormJs.includes('BOLT_ECHOES = [-2.5, 0, 2.5]'), 'still 3 bolt echoes (the probe reads bolts.length === 3)');
  assert.ok(stormJs.includes('bolts[e].line.material.opacity = 1'), 'core material opacity is still the probe strike signal');
  console.log('  tubes core 1.8 m + halo 5 m/0.35; glow 320 m/0.95; light 4000/2000; flash 0.35 s; 3 echoes kept');
});

console.log(`\n${passed}/39 headless tests passed`);
if (process.exitCode) console.log('HEADLESS TESTS: FAIL');
else console.log('HEADLESS TESTS: ALL PASS');
