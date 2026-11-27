// Win-trigger + autopilot-landing sim (v22 auto-win, user 27 Nov 15:09 WIB).
// REPLACES sim-land-profiles.mjs + sim-landing-gemini.mjs, which asserted
// the superseded touchdown tiers (the v22 P0 numbers, then Gemini's
// 78 m/s / -16.5 m/s / hard landing) — both deleted with this redesign.
// The win is now a POSITION check, not a touchdown check: after all 12
// rings, crossing into the Runway 09 corridor (|dx| < 250 m, |lat| < 40 m)
// triggers the win and the autopilot lands the plane. The player's plane
// must NEVER explode during the autopilot landing, in ANY condition —
// so the WIN profiles below include a 90 m/s dive and a 150 m high entry,
// and the NEGATIVE profiles prove the win is still gated (rings < 12,
// ground contact short of the strip, ditching in the sea).
//
// Run: node sim-win-autoland.mjs   (exit 0 = all profiles match)
import { createRandom } from './game/src/random.js';
import { planIslands, createGroundAt } from './game/src/terrain.js';
import { createCourse } from './game/src/rings.js';
import { createFlight } from './game/src/flight.js';
import { STEP, COURSE } from './game/src/config.js';

const SEED = 1;

function buildWorld() {
  const islands = planIslands(createRandom(SEED));
  const course = createCourse(createRandom(SEED + 7), SEED, islands);
  const groundAt = createGroundAt(islands, SEED, course.runway);
  return { course, groundAt };
}

// Place the plane at (x, z, agl) with a given state, then step with the
// pitch/roll FROZEN (stickPitch/stickRoll held nonzero so the auto-level
// never fires) until it stops flying (landed/crashed) or maxTime passes.
// The freeze holds the descent until the win triggers; after that the
// autopilot input replaces the passed input (flight.js ignores the
// player's input once autoLanding is set), so the frozen stick cannot
// fight the autoland. Returns the final state + win/landing telemetry.
function flyToWin({ x, z, agl, speed, vs, roll = 0, throttle = 0.3, rings = COURSE.ringCount, yaw = null, maxTime = 60 }) {
  const { course, groundAt } = buildWorld();
  const rw = course.runway;
  const flight = createFlight(course.spawn);
  const s = flight.state;
  const g = groundAt(x, z);
  s.x = x; s.y = g + agl; s.z = z;
  s.yaw = yaw !== null ? yaw : Math.atan2(rw.dirX, -rw.dirZ);
  s.pitch = Math.asin(Math.max(-1, Math.min(1, vs / speed)));
  s.roll = roll;
  s.speed = speed;
  s.throttle = throttle;
  s.ringsPassed = rings;
  s.verticalSpeed = vs;
  let winAt = null;
  for (let i = 0; i < maxTime / STEP; i += 1) {
    if (s.status !== 'flying') break;
    flight.step(STEP, { pitch: 0, roll: 0, yaw: 0, throttle: 0, stickPitch: 1, stickRoll: 1 }, groundAt, rw);
    if (s.autoLanding && winAt === null) winAt = s.elapsed;
  }
  return { s, rw, ground: g, winAt };
}

function tdLog(tag, r) {
  const t = r.s.touchdown;
  console.log(`  ${tag}: status=${r.s.status} autoLanding=${r.s.autoLanding} kind=${r.s.landingKind} winAt=${r.winAt === null ? '-' : r.winAt.toFixed(1) + 's'}`
    + ` td=${t ? `${t.branch} dx${t.dx}/lat${t.lat} spd${t.speed} VS${t.vs} gnd${t.ground}` : '-'}`
    + ` final=(${Math.round(r.s.x - r.rw.x)},${Math.round(r.s.z - r.rw.z)}) t=${r.s.elapsed.toFixed(1)}s`);
}

let passed = 0;
let failed = 0;
function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`FAIL ${name}: ${e.message}`);
  }
}

function expectWin(tag, r) {
  if (r.winAt === null) throw new Error(`${tag}: win never triggered (autoLanding false)`);
  if (r.s.status !== 'landed') throw new Error(`${tag}: status=${r.s.status} (expected landed)`);
  if (r.s.landingKind !== 'autoland') throw new Error(`${tag}: kind=${r.s.landingKind} (expected autoland)`);
  if (!r.s.touchdown || r.s.touchdown.branch !== 'WIN') throw new Error(`${tag}: branch=${r.s.touchdown ? r.s.touchdown.branch : '-'} (expected WIN)`);
}

function expectCrash(tag, r) {
  if (r.s.status !== 'crashed') throw new Error(`${tag}: status=${r.s.status} (expected crashed)`);
  if (!r.s.touchdown || r.s.touchdown.branch !== 'CRASH') throw new Error(`${tag}: branch=${r.s.touchdown ? r.s.touchdown.branch : '-'} (expected CRASH)`);
}

const { course, groundAt } = buildWorld();
const rw = course.runway;
const rwyHeading = Math.atan2(rw.dirX, -rw.dirZ);

// --- WIN profiles: every entry over the runway after 12/12 must WIN ---
check('baseline 52 m/s VS -5 over the strip wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 40, speed: 52, vs: -5, throttle: 0.3 });
  tdLog('baseline', r);
  expectWin('baseline', r);
});
check('fast 68 m/s VS -8 wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 40, speed: 68, vs: -8, throttle: 0.35 });
  tdLog('fast', r);
  expectWin('fast', r);
});
check('slow 38 m/s VS -6 wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 30, speed: 38, vs: -6, throttle: 0.15 });
  tdLog('slow', r);
  expectWin('slow', r);
});
check('steep VS -14.5 from 300 m short flies into the corridor and wins', () => {
  const r = flyToWin({ x: rw.x - 300, z: rw.z, agl: 50, speed: 55, vs: -14.5, throttle: 0.2 });
  tdLog('steep', r);
  expectWin('steep', r);
});
check('v24 dive after ring 12 (VS -14.5 from 145 m, full throttle) reaches the corridor alive and wins', () => {
  // The v22 live-playtest crash, replayed exactly: ring 12 (729, 145),
  // speed 60, VS -14.5, throttle full — on v23 terrain this flew into
  // the ridge at x=945 (dx -305, 55 m short of the corridor). The v24
  // approach valley (terrain.js: 32 m floor to x=970, ~64 m at x=1000)
  // must carry it into the corridor alive; the win then triggers and
  // the autopilot lands it (touchdown on the valley's end bank, before
  // the threshold, is still a WIN).
  // REVISION (v24 final): measured WIN at t=3.6 s, x=1001, y=78,
  // touchdown dx -239 / lat 2, kind autoland; 15/15 ALL PASS. The same
  // dive live (B2 probe, ring 12 → human-land → win) landed at 19.9 s,
  // touchdown (1322.9, 91.9, 118.6), dx +73, raceComplete true.
  const r12 = course.rings[11];
  const r = flyToWin({ x: r12.x, z: r12.z, agl: r12.y - groundAt(r12.x, r12.z), speed: 60, vs: -14.5, throttle: 1.0 });
  tdLog('ring-12 dive', r);
  expectWin('ring-12 dive', r);
});
check('shallow VS -5.5 wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 20, speed: 54, vs: -5.5, throttle: 0.1 });
  tdLog('shallow', r);
  expectWin('shallow', r);
});
check('off-centreline lat +20 wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z + 20, agl: 40, speed: 56, vs: -5, throttle: 0.3 });
  tdLog('lat+20', r);
  expectWin('lat+20', r);
});
check('throttle-on 0.75 wins', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 40, speed: 58, vs: -8, throttle: 0.75 });
  tdLog('throttle-on', r);
  expectWin('throttle-on', r);
});
check('dive 90 m/s VS -25 wins — the autopilot never explodes', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 60, speed: 90, vs: -25, throttle: 0.9 });
  tdLog('dive', r);
  expectWin('dive', r);
});
check('high entry 150 m AGL wins (touchdown may be long — recorded, not a crash)', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 150, speed: 55, vs: -5, throttle: 0.3 });
  tdLog('high', r);
  expectWin('high', r);
});
check('angled entry (30 deg off runway heading) wins', () => {
  const r = flyToWin({ x: rw.x - 300, z: rw.z - 40, agl: 40, speed: 55, vs: -5, throttle: 0.3, yaw: rwyHeading + 0.52 });
  tdLog('angled', r);
  expectWin('angled', r);
});

// --- NEGATIVE profiles: the win is still gated ---
check('11 rings over the strip: NO win (still flying after 3 s)', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 40, speed: 55, vs: 0, throttle: 0.3, rings: 11, maxTime: 3 });
  tdLog('11 rings', r);
  if (r.s.autoLanding) throw new Error('11 rings: autoLanding fired (expected false)');
  if (r.s.status !== 'flying') throw new Error(`11 rings: status=${r.s.status} (expected flying)`);
});
check('touchdown 300 m short of the strip crashes', () => {
  const r = flyToWin({ x: rw.x - 300, z: rw.z, agl: 2, speed: 55, vs: -5, throttle: 0.3 });
  tdLog('short', r);
  expectCrash('short', r);
});
check('ditching in the open sea crashes', () => {
  const r = flyToWin({ x: -2000, z: -2000, agl: 2, speed: 55, vs: -5, throttle: 0.3 });
  tdLog('sea', r);
  if (r.ground !== 0) throw new Error(`sea: ground=${r.ground} (expected 0)`);
  expectCrash('sea', r);
});
check('fast touchdown on the strip with 0 rings crashes', () => {
  const r = flyToWin({ x: rw.x, z: rw.z, agl: 2, speed: 55, vs: -5, throttle: 0.3, rings: 0 });
  tdLog('0 rings', r);
  expectCrash('0 rings', r);
});

console.log(`\n${passed}/15 win-autoland profiles passed`);
if (failed > 0) console.log('SIM-WIN-AUTOLAND: FAIL');
else console.log('SIM-WIN-AUTOLAND: ALL PASS');
process.exit(failed > 0 ? 1 : 0);
