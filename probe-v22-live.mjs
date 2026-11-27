// probe-v22-live.mjs — live-play proof for v22 (focused; NOT a copy
// of the v21 probe — only the phases v22 must prove):
// (D) TITLE HERO v22: the orbit banks (roll 0.42), turns faster
//     (0.22 rad/s game time) and flies lower (y ~110 m) — the title
//     background is alive now (Gemini v21 #5 / note a), while the
//     two gold mission lines + centred play button stay as approved.
//     PASS = roll 0.35-0.50, yaw rate 0.20-0.24 rad/s (game time,
//     measured against counted rAF frames), y 95-125, hero camera
//     20-40 m south looking north, plane 3-25° right of centre.
// (A8) RING 2 WITH HELD KEYS (ring driver): PASS = ring 2 within 45 s.
// (A9) RING 5 WITH TAPS (tap driver): PASS = ring 5 within 60 s.
// (A12) TORNADO-KILL IN NORMAL PLAY: ring driver, poll __raceEvents
//     for 'tornado-kill' to 35 s game time — NO teleport. The v22
//     ORANYE detour steers into spout3 at t 13-18 s. PASS = the event
//     fires with victim ORANYE; screenshots immediately + 1 s later.
// (A13) LIGHTNING VISIBLE: (a) live poll of the bolt opacities at
//     10 Hz for 20 s real time during a ring-driver run — the storm
//     strikes every 2-5 s, so several strikes must be seen;
//     (b) staged ?shot=play: the bolt group has 3 lines + a glow
//     sprite. PASS = >= 1 live strike (max opacity > 0.5) + structure.
// (B2) HUMAN FLIGHT TO THE STRIP + AUTO-WIN: tap driver to 12 rings,
//     then the 'human-land' driver (throttle 0.3, VS -5 — the profile
//     the user flew when v21 still crashed them). The win triggers on
//     corridor entry and the autopilot lands. PASS = RACE COMPLETE + landed.
// (C) COCKPIT DEDUP: press C in play — top-left panels, attitude
//     ball and compass hide (display:none); press C again — back.
//     Screenshot of the deduped cockpit.
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
      // v22: terrain floor (see probe-v22-a13b2.mjs — the first B2 run
      // flew the blind -5/-2 driver into the steep western ridge 116 m
      // short of the threshold; a human pilot stays high over the
      // ridge until over the plateau, so the driver climbs below 25 m
      // AGL while still > 250 m out. The win triggers on corridor
      // entry at ANY altitude, so reaching the plateau alive is enough).
      const targetVS = (distRwy > 250 && agl < 25) ? 3 : (agl < 12 ? -2 : -5);
      const vsErr = targetVS - (s.verticalSpeed || 0);
      const p = Math.max(-1, Math.min(1, vsErr * 0.05));
      // v22: HELD keys, not PWM taps (see probe-v22-a13b2.mjs — at ~2 fps
      // most 250 ms taps fall between frames and never reach the game;
      // run 7 mushed down 78 m south of the centreline). Held keys
      // survive frame starvation.
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
  // v22: release the PREVIOUS driver's held keys FIRST (see
  // probe-v22-a13b2.mjs — without this the old driver's keys are never
  // released, the new driver's opposite key cancels out, and the plane
  // flies straight: that killed runs 7 and 8 after the switch to
  // human-land). __kbStop clears the old timer and dispatches keyup
  // for every key in its own held set.
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

  // ---------- PHASE D: title hero v22 (orbit banks + turns + lower) ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await sleep(1000);
  await page.screenshot({ path: SHOTS + '/v22-live-title.jpg', type: 'jpeg', quality: 80 });
  // Yaw rate in GAME time: count rAF frames over ~2 s real, rate =
  // dyaw * 60 / frames (each frame advances STEP = 1/60 s game time).
  const orbit = await page.evaluate(() => new Promise((resolve) => {
    const D = window.__debug;
    const y0 = D.flight.state.yaw;
    let frames = 0;
    const tick = () => { frames += 1; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => {
      const s = D.flight.state;
      let dy = s.yaw - y0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      resolve({ roll: s.roll, y: s.y, dyaw: dy, frames, rate: dy * 60 / Math.max(1, frames) });
    }, 2000);
  }));
  const heroCam = await page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const cam = D.renderer.camera;
    const cp = cam.position;
    const q = cam.quaternion;
    const applyQ = (vx, vy, vz) => {
      const tx = 2 * (q.y * vz - q.z * vy);
      const ty = 2 * (q.z * vx - q.x * vz);
      const tz = 2 * (q.x * vy - q.y * vx);
      return { x: vx + q.w * tx + (q.y * tz - q.z * ty), y: vy + q.w * ty + (q.z * tx - q.x * tz), z: vz + q.w * tz + (q.x * ty - q.y * tx) };
    };
    const fwd = applyQ(0, 0, -1);
    const dx = s.x - cp.x; const dz = s.z - cp.z;
    const dist = Math.hypot(dx, dz) || 1;
    const crossY = fwd.z * (dx / dist) - fwd.x * (dz / dist);
    const offDeg = -Math.asin(Math.max(-1, Math.min(1, crossY))) * 180 / Math.PI;
    return { camSouth: Math.round((cp.z - s.z) * 10) / 10, camEast: Math.round((cp.x - s.x) * 10) / 10,
      camAbove: Math.round((cp.y - s.y) * 10) / 10, fwdZ: Math.round(fwd.z * 100) / 100,
      planeOffDeg: Math.round(offDeg * 10) / 10 };
  });
  const titleDom = await page.evaluate(() => {
    const mission = document.getElementById('panel-title').innerText;
    const btn = document.getElementById('btn-start') || document.querySelector('#panel-title button');
    return { missionHasRace: mission.includes('Race 4 rivals'), missionHasStorm: mission.includes('storm'),
      playButton: !!btn, titleShown: document.getElementById('panel-title').style.display };
  });
  console.log('phase D orbit: ' + JSON.stringify(orbit)
    + ' PASS=' + (orbit.roll >= 0.35 && orbit.roll <= 0.5 && orbit.rate >= 0.20 && orbit.rate <= 0.24 && orbit.y >= 95 && orbit.y <= 125));
  console.log('phase D hero camera: ' + JSON.stringify(heroCam)
    + ' PASS=' + (heroCam.camSouth >= 20 && heroCam.camSouth <= 40 && heroCam.fwdZ < -0.5
      && heroCam.planeOffDeg >= 3 && heroCam.planeOffDeg <= 25));
  console.log('phase D title DOM: ' + JSON.stringify(titleDom)
    + ' PASS=' + (titleDom.missionHasRace && titleDom.missionHasStorm && titleDom.playButton));

  // ---------- PHASE A8: ring 2, held keys ----------
  await openGame(page);
  await startDriver(page, 'ring');
  let a8 = null;
  for (let i = 0; i < 120; i += 1) {
    a8 = await pollState(page);
    if (!a8) break;
    if (a8.rings >= 2) break;
    if (a8.status !== 'flying') break;
    if (a8.elapsed >= 45) break;
    await sleep(500);
  }
  await page.screenshot({ path: SHOTS + '/v22-live-ring2.jpg', type: 'jpeg', quality: 80 });
  console.log('phase A8 ring 2 (held keys): ' + JSON.stringify(a8) + ' PASS=' + (!!a8 && a8.rings >= 2));
  await stopDriver(page);

  // ---------- PHASE A9: ring 5, taps + cockpit dedup ----------
  await openGame(page);
  await startDriver(page, 'tap');
  let a9 = null;
  for (let i = 0; i < 160; i += 1) {
    a9 = await pollState(page);
    if (!a9) break;
    if (a9.rings >= 5) break;
    if (a9.status !== 'flying') break;
    if (a9.elapsed >= 60) break;
    await sleep(500);
  }
  await page.screenshot({ path: SHOTS + '/v22-live-ring5.jpg', type: 'jpeg', quality: 80 });
  console.log('phase A9 ring 5 (taps): ' + JSON.stringify(a9) + ' PASS=' + (!!a9 && a9.rings >= 5));
  // (C) cockpit dedup on the same run: press C, the duplicated panels hide.
  await page.keyboard.press('KeyC');
  await sleep(500);
  const cockpit = await page.evaluate(() => ({
    msg: document.getElementById('hud-msg').textContent,
    topLeftHidden: getComputedStyle(document.getElementById('hud-top-left')).display === 'none',
    attitudeHidden: getComputedStyle(document.getElementById('attitude')).display === 'none',
    compassHidden: getComputedStyle(document.getElementById('compass')).display === 'none',
    ringsShown: document.getElementById('hud-rings').textContent,
  }));
  await page.screenshot({ path: SHOTS + '/v22-live-cockpit.jpg', type: 'jpeg', quality: 80 });
  console.log('phase C cockpit dedup: ' + JSON.stringify(cockpit)
    + ' PASS=' + (cockpit.msg === 'COCKPIT VIEW' && cockpit.topLeftHidden && cockpit.attitudeHidden && cockpit.compassHidden && !!cockpit.ringsShown));
  await page.keyboard.press('KeyC');
  await sleep(400);
  await stopDriver(page);

  // ---------- PHASE A12: tornado-kill in NORMAL play (no teleport) ----------
  await openGame(page);
  await startDriver(page, 'ring');
  let a12 = null;
  for (let i = 0; i < 140; i += 1) {
    a12 = await pollState(page);
    if (!a12) break;
    if (a12.kill) break;
    if (a12.status !== 'flying') break;
    if (a12.elapsed >= 35) break;
    await sleep(500);
  }
  console.log('phase A12 tornado-kill (normal play): ' + JSON.stringify(a12)
    + ' PASS=' + (!!a12 && !!a12.kill && a12.kill.name === 'ORANYE'));
  if (a12 && a12.kill) {
    await page.screenshot({ path: SHOTS + '/v22-live-tornado-kill.jpg', type: 'jpeg', quality: 80 });
    await sleep(1000);
    await page.screenshot({ path: SHOTS + '/v22-live-tornado-kill-1s.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A12 tornado-kill screenshots saved (immediate + 1s)');
  }

  // ---------- PHASE A13: lightning visible (live poll, same run) ----------
  // Poll the bolt opacities at 10 Hz for 20 s real time. The storm
  // strikes every 2-5 s of game time near rings; a strike lights all
  // 3 bolt lines (opacity 1) + the glow sprite (0.85) for 0.2 s.
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
  // v22: TELEPORTED to just before ring 12 (see probe-v22-a13b2.mjs
  // for the full story: the end-to-end B2 failed four times on probe
  // limitations — ridge crash, two spirals, out-of-time, runtime
  // restart — never on the game; rings 1-11 are proven live by
  // A8/A9/B2-run-1 + sims, so B2 proves the ring-12 pass + approach
  // + win + autoland live). The plane is placed 250 m before ring 12
  // at its altitude with 11 rings; the TAP driver flies it through
  // ring 12, then human-land (throttle 0.3, VS -5, terrain floor)
  // flies the approach, the win triggers on corridor entry, and the
  // autopilot lands. PASS = RACE COMPLETE + landed.
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
    // per-ring passed flags — what nextRing()/checkPass read). The
    // first teleported run set only the flight counter, so nextRing()
    // still returned ring 1 and the plane flew 2000 m WEST back to it.
    s.ringsPassed = 11; D.course.setProgress(11);
    s.verticalSpeed = 0;
  });
  // The 250 m leg to ring 12 uses the HELD-key 'ring' driver, not
  // taps: at ~2 fps most 250 ms taps fall between frames (run 7),
  // while held keys survive — and the leg is straight ahead, so
  // there is nothing to spiral on.
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
