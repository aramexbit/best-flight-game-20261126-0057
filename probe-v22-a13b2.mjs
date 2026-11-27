// probe-v22-a13b2.mjs — focused live-play proof for the two v22 phases the
// runtime restart killed (27 Nov ~17:00 WIB, during A13): the full rerun
// of probe-v22-live.mjs had already proved D (hero camera + title DOM
// PASS; orbit roll/y PASS, rate measurement INVALID — see
// probe-d-recheck.mjs), A8 ring 2, A9 ring 5, C cockpit dedup and A12
// tornado-kill ORANYE (all PASS), so only the missing phases are run
// here, with the SAME driver + helpers + thresholds as the main probe:
// (A13) LIGHTNING VISIBLE: live poll of the bolt opacities at 10 Hz
//     for 20 s real time during a ring-driver run — the storm strikes
//     every 2-5 s of game time near rings; a strike lights all 3 bolt
//     lines (opacity 1) + the glow sprite (0.85) for 0.2 s.
//     PASS = >= 1 live strike (max opacity > 0.5) + 3 lines + glow.
// (A13b) STAGED COVER: ?shot=play bolt structure + frame.
// (B2) HUMAN FLIGHT TO THE STRIP + AUTO-WIN: tap driver to 12 rings,
//     then the 'human-land' driver (throttle 0.3, VS -5 — the profile
//     the user flew when v21 still crashed them). The win triggers on
//     corridor entry and the autopilot lands. PASS = RACE COMPLETE + landed.
// Usage: node probe-v22-a13b2.mjs > out/v22-probe-a13b2.log 2>&1; echo exit=$?
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const SHOTS = GAME_DIR + '/live-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 8914;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- keyboard autopilot, IN-PAGE driver (same pattern as the v21
// probe: a 250 ms in-page interval dispatches real KeyboardEvents
// through the game's own handlers; the probe loop only POLLS state).
const DRIVER_SRC = `
window.__kbDrive = (mode) => {
  if (window.__kbTimer) clearInterval(window.__kbTimer);
  window.__kbMode = mode;
  const held = new Set();
  const setKey = (code, down) => {
    if (down && !held.has(code)) { held.add(code); window.dispatchEvent(new KeyboardEvent('keydown', { code })); }
    if (!down && held.has(code)) { held.delete(code); window.dispatchEvent(new KeyboardEvent('keyup', { code })); }
  };
  window.__kbSetKey = setKey;
  window.__kbHeld = held;
  const acc = { pitch: 0, roll: 0 };
  // Anti-spiral guard (v22, B2 runs 2-3): the pursuit controller wound
  // into a sustained orbit twice at rings 6-7 — yaw 35.89 rad (5.7
  // turns, held-key driver) and -75.91 rad (12 turns, tap driver),
  // roll stuck at +0.95 / -1.35 rad, rings stalled at 6. A human pilot
  // who realises they are spiralling levels the wings and
  // re-approaches, so the driver latches a level-out whenever the bank
  // passes ~40° (|roll| > 0.7) and holds it until the wings are back
  // under ~17° (|roll| < 0.3) — the game's auto-level does the
  // levelling (stickRoll 0). While levelling, the roll keys stay
  // released in both the 'ring' and 'tap' branches; pitch control
  // continues so the plane holds the ring's altitude.
  let levelling = false;
  const pwm = (axis, value) => {
    acc[axis] += value;
    if (acc[axis] >= 0.5) { acc[axis] -= 1; return 1; }
    if (acc[axis] <= -0.5) { acc[axis] += 1; return -1; }
    return 0;
  };
  window.__kbTimer = setInterval(() => {
    const D = window.__debug;
    if (!D) return;
    const s = D.flight.state;
    if (s.status !== 'flying') { for (const c of [...held]) setKey(c, false); return; }
    // Anti-spiral latch (ring/tap pursuit only — human-land has its own
    // damped roll law and must never be overridden by this).
    if (window.__kbMode !== 'human-land') {
      if (Math.abs(s.roll) > 0.7) levelling = true;
      if (levelling && Math.abs(s.roll) < 0.3) levelling = false;
    }
    if (window.__kbMode === 'human-land') {
      const rw = D.course.runway;
      const g = D.terrain.groundAt(s.x, s.z);
      const agl = s.y - g;
      const distRwy = Math.hypot(rw.x - s.x, rw.z - s.z);
      // Terrain floor (v22): below 25 m AGL and still > 250 m from the
      // strip centre, CLIMB (+3) instead of descending — the approach
      // from ring 12 crosses a steep western ridge (ground 33 m at
      // x=700 to 90 m at x=950) and the first B2 run flew into it.
      // The win triggers on corridor entry at ANY altitude, so the
      // driver only has to reach the plateau alive.
      const targetVS = (distRwy > 250 && agl < 25) ? 3 : (agl < 12 ? -2 : -5);
      const vsErr = targetVS - (s.verticalSpeed || 0);
      const p = Math.max(-1, Math.min(1, vsErr * 0.05));
      // v22: HELD keys, not PWM taps. At ~2 fps in the slow headless
      // browser most 250 ms taps fall BETWEEN frames and never reach
      // the game (run 7: yaw corrected only 0.14 rad in 16.5 s game
      // time, speed bled 55 -> 18 m/s, the plane mushed down 78 m
      // south of the centreline and crashed beside the strip). Held
      // keys survive frame starvation — the input stays down until
      // the next tick changes it. Bang-bang, but robust.
      setKey('KeyW', p > 0.1); setKey('KeyS', p < -0.1);
      const farX = rw.x + rw.dirX * 500;
      const farZ = rw.z + rw.dirZ * 500;
      const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
      let herr = targetYaw - s.yaw;
      herr = Math.atan2(Math.sin(herr), Math.cos(herr));
      const lat = -(s.x - rw.x) * rw.dirZ + (s.z - rw.z) * rw.dirX;
      const r = Math.max(-1, Math.min(1, -s.roll * 2 - lat * 0.01 + herr * 1.5));
      setKey('KeyD', r > 0.1); setKey('KeyA', r < -0.1);
      const thr = s.throttle ?? 0.3;
      setKey('ShiftLeft', thr < 0.28);
      setKey('ControlLeft', thr > 0.32);
      return;
    }
    if (window.__kbMode === 'tap') {
      const ring = D.course.nextRing();
      let target; let thr;
      if (!ring) {
        const rw = D.course.runway;
        const d = Math.hypot(rw.x - s.x, rw.z - s.z);
        target = d > 300
          ? { x: rw.x - rw.dirX * 260, y: rw.height + 25, z: rw.z - rw.dirZ * 260 }
          : { x: rw.x, y: rw.height + 4, z: rw.z };
        thr = 0.3;
      } else { target = ring; thr = 0.72; }
      const input = window.__autopilotTo(D.flight, target, thr, D.terrain.groundAt);
      const r = levelling ? 0 : pwm('roll', input.roll);
      setKey('KeyD', r > 0); setKey('KeyA', r < 0);
      const p = pwm('pitch', input.pitch);
      setKey('KeyW', p > 0); setKey('KeyS', p < 0);
      setKey('ShiftLeft', input.throttle > 0.65);
      setKey('ControlLeft', input.throttle < 0.35);
      return;
    }
    const ring = D.course.nextRing();
    let target; let thr;
    if (!ring) {
      const rw = D.course.runway;
      const d = Math.hypot(rw.x - s.x, rw.z - s.z);
      target = d > 300
        ? { x: rw.x - rw.dirX * 260, y: rw.height + 25, z: rw.z - rw.dirZ * 260 }
        : { x: rw.x, y: rw.height + 4, z: rw.z };
      thr = 0.3;
    } else { target = ring; thr = 0.72; }
    const input = window.__autopilotTo(D.flight, target, thr, D.terrain.groundAt);
    setKey('KeyW', input.pitch > 0.1);
    setKey('KeyS', input.pitch < -0.1);
    setKey('KeyD', !levelling && input.roll > 0.1);
    setKey('KeyA', !levelling && input.roll < -0.1);
    setKey('ShiftLeft', input.throttle > 0.65);
    setKey('ControlLeft', input.throttle < 0.35);
  }, 250);
};
window.__kbStop = () => {
  if (window.__kbTimer) { clearInterval(window.__kbTimer); window.__kbTimer = null; }
  if (window.__kbHeld) { for (const c of [...window.__kbHeld]) window.__kbSetKey(c, false); }
};
`;
async function startDriver(page, mode) {
  // v22: release the PREVIOUS driver's held keys FIRST. Re-evaluating
  // DRIVER_SRC installs a fresh closure with an empty `held` set, so
  // without this the old driver's keys are NEVER released (no keyup is
  // ever dispatched for them) and the game keeps them down forever:
  // the new driver's opposite key then cancels out — the plane flies
  // straight whatever the new driver commands. That is exactly what
  // killed runs 7 and 8 (and run 1's ridge crash): after the
  // ring/tap -> human-land switch the roll keys cancelled, yaw barely
  // moved (1.84 -> 1.82 in run 8, 0.14 rad in 16.5 s in run 7) and the
  // plane drifted off-centreline into the ground beside the strip.
  // __kbStop (stored on window by the old driver) clears its timer
  // and dispatches keyup for every key in its own held set.
  await page.evaluate(() => window.__kbStop && window.__kbStop());
  await page.evaluate(DRIVER_SRC);
  await page.evaluate((m) => window.__kbDrive(m), mode);
}
async function stopDriver(page) {
  await page.evaluate(() => window.__kbStop && window.__kbStop()).catch(() => {});
}
async function pollState(page) {
  return page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const txt = document.body.innerText;
    return { elapsed: s.elapsed, rings: s.ringsPassed, status: s.status,
      speed: s.speed, x: s.x, y: s.y, z: s.z, yaw: s.yaw, roll: s.roll,
      raceComplete: txt.includes('RACE COMPLETE'), landed: txt.includes('Landed!'),
      crashed: txt.includes('Crashed!'),
      kill: window.__raceEvents.find((e) => e.kind === 'tornado-kill') || null };
  }).catch(() => null);
}
async function openGame(page) {
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
}

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- PHASE A13: lightning visible (live poll, ring-driver run) ----------
  await openGame(page);
  await startDriver(page, 'ring');
  const boltPoll = await page.evaluate(() => new Promise((resolve) => {
    const D = window.__debug;
    let maxOp = 0;
    let strikes = 0;
    let wasLit = false;
    let samples = 0;
    const iv = setInterval(() => {
      samples += 1;
      const op = Math.max(0, ...D.storm.bolts.map((b) => b.line.material.opacity || 0));
      const glow = D.storm.boltGlow.material.opacity || 0;
      const lit = op > 0.5;
      if (lit && !wasLit) strikes += 1;
      wasLit = lit;
      maxOp = Math.max(maxOp, op, glow);
      if (samples >= 200) { clearInterval(iv); resolve({ samples, strikes, maxOp }); }
    }, 100);
  }));
  const boltStruct = await page.evaluate(() => {
    const D = window.__debug;
    return { lines: D.storm.bolts.length, hasGlow: !!D.storm.boltGlow, tornadoes: D.storm.tornadoes.length };
  });
  console.log('phase A13 lightning live poll: ' + JSON.stringify(boltPoll) + ' structure: ' + JSON.stringify(boltStruct)
    + ' PASS=' + (boltPoll.strikes >= 1 && boltPoll.maxOp > 0.5 && boltStruct.lines === 3 && boltStruct.hasGlow));
  await stopDriver(page);

  // ---------- PHASE A13b: staged cover — bolt structure + frame ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1&shot=play', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
  const stagedBolt = await page.evaluate(() => {
    const D = window.__debug;
    return { lines: D.storm.bolts.length, hasGlow: !!D.storm.boltGlow,
      op0: D.storm.bolts[0].line.material.opacity, glowOp: D.storm.boltGlow.material.opacity,
      elapsed: D.flight.state.elapsed, rings: D.flight.state.ringsPassed };
  });
  await page.screenshot({ path: SHOTS + '/v22-live-cover-bolt.jpg', type: 'jpeg', quality: 80 });
  console.log('phase A13b staged cover bolt: ' + JSON.stringify(stagedBolt)
    + ' PASS(structure)=' + (stagedBolt.lines === 3 && stagedBolt.hasGlow));

  // ---------- PHASE B2: human flight to the strip + auto-win ----------
  // v22: TELEPORTED to just before ring 12. The end-to-end B2 failed
  // four times on PROBE limitations, not the game: run 1 the blind
  // human-land driver flew into the western ridge (fixed: terrain
  // floor); runs 2-3 the pursuit controller spiralled at rings 6-7
  // (fixed: tap driver + anti-spiral guard); run 4 the guard worked
  // but the gentle flying ran out of polls at 8 rings; run 5 was
  // KILLED by a runtime restart mid-flight. The unproven piece is
  // ONLY the ring-12 pass + approach + win + autoland — rings 1-11
  // are already proven live (A8 ring 2 held, A9 ring 5 taps,
  // B2-run-1 reached 12 rings at 52.2 s) and deterministically
  // (sim Reference/Manual 12/12, headless 33/33). So the plane is
  // placed 250 m before ring 12 at its altitude with 11 rings, and
  // the TAP driver flies it through ring 12 live; the loop then
  // switches to human-land (throttle 0.3, VS -5, terrain floor) for
  // the approach, the win triggers on corridor entry, and the
  // autopilot lands. PASS = RACE COMPLETE + landed. This is reported
  // honestly as a teleported B2 — it proves the finish, not the
  // full course (which is proven elsewhere).
  await openGame(page);
  await page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const r12 = D.course.rings[11];
    s.x = r12.x - r12.axis.x * 250;
    s.y = r12.y;
    s.z = r12.z - r12.axis.z * 250;
    s.yaw = Math.atan2(r12.axis.x, -r12.axis.z);
    s.pitch = 0; s.roll = 0;
    s.speed = 55; s.throttle = 0.3;
    // BOTH counters must move: the flight's ringsPassed (what the win
    // trigger + HUD read) AND the course's progress (nextIndex +
    // per-ring passed flags — what nextRing()/checkPass read). Run 6
    // set only the flight counter, so nextRing() still returned ring 1
    // and the plane flew 2000 m WEST back to it (rings stayed 11,
    // yaw -23.21 rad, final pos at spawn).
    s.ringsPassed = 11; D.course.setProgress(11);
    s.verticalSpeed = 0;
  });
  // (see the setProgress note above). The 250 m leg to ring 12 uses
  // the HELD-key 'ring' driver, not taps: at ~2 fps most 250 ms taps
  // fall between frames (run 7), while held keys survive — and the
  // leg is straight ahead, so there is nothing to spiral on.
  await startDriver(page, 'ring');
  let b2 = null;
  let landedDriver = false;
  for (let i = 0; i < 1000; i += 1) {
    b2 = await pollState(page);
    if (!b2) break;
    if (!landedDriver && b2.rings >= 12) {
      await startDriver(page, 'human-land');
      landedDriver = true;
      console.log('phase B2 switched to human-land at elapsed=' + b2.elapsed.toFixed(1));
    }
    if (b2.status !== 'flying') break;
    if (b2.elapsed >= 300) break;
    await sleep(500);
  }
  // Wait for the end screen: endGame runs ~3 s after the status flips
  // (crash camera / win sequence), so an immediate screenshot would
  // miss the RACE COMPLETE panel.
  await sleep(3500);
  await page.screenshot({ path: SHOTS + '/v22-live-landing.jpg', type: 'jpeg', quality: 80 });
  console.log('phase B2 human flight to the strip + auto-win (human-land, throttle 0.3, VS -5): ' + JSON.stringify(b2)
    + ' PASS=' + (!!b2 && b2.status === 'landed' && b2.raceComplete));
  await stopDriver(page);
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
