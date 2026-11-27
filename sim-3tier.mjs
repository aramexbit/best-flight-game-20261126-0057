// 3-tier headless sim (OpenGame layer 1) — pure Node, no browser.
// Uses the game's REAL logic: createFlight + createCourse + autopilotTo +
// checkPass + the same terrain ground the game flies on. Seed 1, the same
// course as the staged screenshots and the live probes.
//
//   Reference — the autopilot (a skilled player): must pass 12 rings AND land.
//   Weak      — autopilot + seeded noise (a struggling player): some rings, no finish.
//   Idle      — no input at all: must fail (no finish / crash).
//
// Run: node sim-3tier.mjs   (exit 0 only if Reference lands AND Idle fails)
import { createRandom } from './game/src/random.js';
import { planIslands, createGroundAt } from './game/src/terrain.js';
import { createCourse } from './game/src/rings.js';
import { createFlight, EVENT_CRASH, EVENT_LAND } from './game/src/flight.js';
import { autopilotTo } from './game/src/shots.js';
import { STEP, COURSE } from './game/src/config.js';

const SEED = 1;
const MAX_TIME = 300; // s of game time per route
const LAND_TIMEOUT = 90; // s allowed for the landing phase after ring 12

function buildWorld() {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  return { course, groundAt };
}

// Seeded RNG (LCG) so the Weak route is reproducible, run to run.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp1(v) {
  return v < -1 ? -1 : v > 1 ? 1 : v;
}

function runRoute(name, policy) {
  const { course, groundAt } = buildWorld();
  const flight = createFlight(course.spawn);
  const runway = course.runway;
  const s = flight.state;
  let prev = { x: s.x, y: s.y, z: s.z };
  let score = 0;
  let landed = false;
  let crashed = false;
  let landPhaseAt = null;
  const rng = makeRng(7);
  const weakBias = { pitch: 0, roll: 0 }; // a struggling player's drift
  const weakDelay = []; // a struggling player's slow reactions (1.5 s lag)
  let steps = 0;
  while (s.elapsed < MAX_TIME && s.status === 'flying') {
    let input;
    if (policy === 'idle') {
      // No input at all: throttle stays at its spawn value (cruise),
      // wings level themselves, heading holds. The plane flies straight.
      input = { pitch: 0, roll: 0, yaw: 0, throttle: 0 };
    } else if (policy === 'weak') {
      // Autopilot + noise: a struggling player who overcorrects and
      // sometimes lets go of the stick entirely.
      const ring = course.nextRing();
      const target = ring || { x: runway.x, y: runway.height + 6, z: runway.z };
      const base = autopilotTo(flight, target, 0.72, groundAt);
      // A struggling player: a slowly-wandering bias (new every 2 s)
      // that fights the autopilot, plus a 1.5 s reaction lag — white
      // per-step noise just averages out and the autopilot still
      // nails every ring.
      weakDelay.push({ pitch: base.pitch, roll: base.roll, throttle: base.throttle });
      const delayed = weakDelay.length > 30
        ? weakDelay.shift()
        : { pitch: 0, roll: 0, throttle: 0.72 };
      if (steps % 120 === 0) {
        weakBias.pitch = (rng() - 0.5) * 1.0;
        weakBias.roll = (rng() - 0.5) * 1.0;
      }
      const r = rng();
      if (r < 0.08) {
        input = { pitch: 0, roll: 0, yaw: 0, throttle: 0 }; // lets go
      } else {
        input = {
          pitch: clamp1(delayed.pitch + weakBias.pitch + (rng() - 0.5) * 0.4),
          roll: clamp1(delayed.roll + weakBias.roll + (rng() - 0.5) * 0.4),
          yaw: 0,
          throttle: delayed.throttle,
        };
      }
    } else if (policy === 'manual') {
      // v21b: a HUMAN landing — the autopilot flies the rings, then
      // a human takes over: throttle slewed to 0.3 (a natural "slow
      // down"), VS -5, cross-track roll (aim 500 m past the runway).
      // The user's own playtest crashed on exactly this profile
      // (107 kts vs the old 50 m/s finish-zone cap); the widened
      // finish-zone tolerances (62 m/s / 12 m/s / 0.45 rad) must let
      // it win. The land regulator (Reference) is the perfect case;
      // this is the human case.
      const ring = course.nextRing();
      if (ring) {
        input = autopilotTo(flight, ring, 0.72, groundAt);
      } else {
        if (landPhaseAt === null) landPhaseAt = s.elapsed;
        const farX = runway.x + runway.dirX * 500;
        const farZ = runway.z + runway.dirZ * 500;
        const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
        let herr = targetYaw - s.yaw;
        herr = Math.atan2(Math.sin(herr), Math.cos(herr));
        const lat = -(s.x - runway.x) * runway.dirZ + (s.z - runway.z) * runway.dirX;
        const roll = clamp1(-s.roll * 2 - lat * 0.01 + herr * 1.5);
        const pitch = clamp1((-5 - (s.verticalSpeed || 0)) * 0.05);
        const thrErr = 0.3 - s.throttle;
        const throttle = Math.abs(thrErr) < 0.05 ? 0 : Math.sign(thrErr);
        input = { pitch, roll, yaw: 0, throttle, stickRoll: roll, stickPitch: pitch };
      }
    } else {
      // Reference: the autopilot, full control.
      const ring = course.nextRing();
      if (ring) {
        input = autopilotTo(flight, ring, 0.72, groundAt);
      } else {
        // All rings done: land with the probe's 'land' regulator
        // (VS-hold + heading-hold to a point 500 m beyond the runway,
        // wings level + cross-track correction, idle throttle) — the
        // pursuit autopilot levels off at its target altitude and never
        // touches down, so it cannot land on its own. Continuous inputs
        // here (no key PWM — the sim has no keyboard).
        if (landPhaseAt === null) landPhaseAt = s.elapsed;
        const g = groundAt(s.x, s.z);
        const agl = s.y - g;
        const d = Math.hypot(runway.x - s.x, runway.z - s.z);
        const targetVS = agl < 12 ? -1.2 : (d > 300 ? -3 : -3.5);
        const vsErr = targetVS - (s.verticalSpeed || 0);
        const pitch = clamp1(vsErr * 0.05);
        const farX = runway.x + runway.dirX * 500;
        const farZ = runway.z + runway.dirZ * 500;
        const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
        let herr = targetYaw - s.yaw;
        herr = Math.atan2(Math.sin(herr), Math.cos(herr));
        const lat = -(s.x - runway.x) * runway.dirZ + (s.z - runway.z) * runway.dirX;
        const roll = clamp1(-s.roll * 2 - lat * 0.01 + herr * 1.5);
        input = { pitch, roll, yaw: 0, throttle: -1 }; // idle (power-off)
      }
    }
    const ev = flight.step(STEP, input, groundAt, runway);
    const pass = course.checkPass(prev, s);
    // The game (main.js) and the probe both increment ringsPassed here —
    // checkPass only reports the pass, it does not count it.
    if (pass && pass.passed) { s.ringsPassed += 1; score += pass.bonus; }
    else if (pass && pass.nearMiss) score += pass.bonus;
    prev = { x: s.x, y: s.y, z: s.z };
    steps += 1;
    if (ev & EVENT_LAND) { landed = true; break; }
    if (ev & EVENT_CRASH) { crashed = true; break; }
    if (landPhaseAt !== null && s.elapsed - landPhaseAt > LAND_TIMEOUT) break;
  }
  const finished = landed && s.ringsPassed >= COURSE.ringCount;
  return {
    route: name,
    rings: s.ringsPassed,
    ringTotal: COURSE.ringCount,
    finished,
    landed,
    crashed,
    status: s.status,
    score,
    time: +s.elapsed.toFixed(1),
    pos: { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z) },
  };
}

const reference = runRoute('reference', 'reference');
const weak = runRoute('weak', 'weak');
const idle = runRoute('idle', 'idle');
const manual = runRoute('manual', 'manual');
for (const r of [reference, weak, idle, manual]) console.log(JSON.stringify(r));

// Pass criteria (the point of the exercise): the course must be
// finishable by a skilled player, and must NOT be finishable by
// doing nothing. Weak must sit between them.
const refOk = reference.finished && reference.rings === 12;
const weakOk = weak.rings > 0 && weak.rings < 12 && !weak.finished;
const idleOk = !idle.finished;
const manualOk = manual.finished && manual.rings === 12;
console.log(`reference: ${refOk ? 'PASS' : 'FAIL'} (must finish 12 rings + land)`);
console.log(`weak: ${weakOk ? 'PASS' : 'FAIL'} (some rings, no finish)`);
console.log(`idle: ${idleOk ? 'PASS' : 'FAIL'} (must not finish)`);
console.log(`manual: ${manualOk ? 'PASS' : 'FAIL'} (human landing at 0.3 throttle must finish 12 rings + land)`);
const allOk = refOk && weakOk && idleOk && manualOk;
console.log(allOk ? 'SIM-3TIER: ALL PASS' : 'SIM-3TIER: FAIL');
process.exit(allOk ? 0 : 1);
