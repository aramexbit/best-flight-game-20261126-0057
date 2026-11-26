// probe-v15-live3.mjs — live-play proof, round 3. Round 2's Node-side
// controller polled every ~250 ms wall (~0.085 s game): each held poll
// kicked the pitch state by a big step, so the plane porpoised +-50 m
// and sat on ring 3 for 39 s without threading it. This version drives
// the keys from INSIDE the page, one sigma-delta modulator step per
// animation frame (requestAnimationFrame): the average deflection per
// frame matches the autopilot's continuous command, and the keys go
// through the same window keydown/keyup path a human player's keys do
// (input.js `held` set). Node only watches for events and screenshots.
// (A) fly with keys to the mid-air blast, screenshot at blast+1.5 s.
// (B) finish end-to-end: safe teleport to short final, fly the keys to
// touchdown, verify RACE COMPLETE + panel + fireworks/confetti.
// v15 (fix, round 3c): flare cap (-0.12 rad within 12 m of the strip) +
// gentler gain (1.5) + slower final speed (35) — round 3b touched down
// at -9.5 m/s sink and crashed (gentle limit is 8 m/s).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8912;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Install the in-page per-frame key controller. Returns 'ok'.
async function installController(page) {
  return page.evaluate(() => {
    if (window.__probeCtrlRaf) cancelAnimationFrame(window.__probeCtrlRaf);
    const held = new Set();
    const acc = { up: 0, down: 0, right: 0, left: 0, thrUp: 0, thrDown: 0 };
    function setKey(code, down) {
      if (down && !held.has(code)) { held.add(code); window.dispatchEvent(new KeyboardEvent('keydown', { code })); }
      if (!down && held.has(code)) { held.delete(code); window.dispatchEvent(new KeyboardEvent('keyup', { code })); }
    }
    function releaseAll() { for (const c of [...held]) setKey(c, false); }
    function duty(slot, v) {
      if (v <= 0.02) return false;
      acc[slot] += v;
      if (acc[slot] >= 1) { acc[slot] -= 1; return true; }
      return false;
    }
    function tick() {
      try {
        const D = window.__debug;
        const s = D.flight.state;
        if (!D || s.status !== 'flying') { releaseAll(); }
        else {
          const ring = D.course.nextRing();
          let input;
          if (!ring) {
            // FINAL APPROACH: custom steering, NOT autopilotTo. Its
            // terrain-avoidance override (shots.js: pitch +0.9 when the
            // highest ground within 340 m ahead is within 45 m below the
            // plane) fires constantly on final — the hills past the runway
            // — so the plane can never descend: it porpoised +-25 m/s and
            // flew over the strip at 40 m (round 3, phase B3). The final
            // is over flat airfield (ground ~93-94), so no avoidance is
            // needed. v15 (fix, round 3b): aim at a point 100 m PAST the
            // threshold at ground level (runway height + 1), NOT at the
            // threshold at height + 6 — aiming at height + 6 makes the
            // plane converge to level flight 6 m above the strip and
            // orbit the runway forever (it flew over the centre at 99 m
            // and never touched down). The glide path to (+100 m, +1 m)
            // meets the ground ~95 m past the threshold, inside the
            // strip and the finish zone, at pitch ~-0.11 and sink ~4.4
            // m/s — inside the gentle limits (0.35 pitch, 8 m/s sink).
            // A human player does exactly this with the S key; the
            // override lives only in the probe helper, not in the game
            // (flight.js applies the input directly).
            const rw = D.course.runway;
            const tx = rw.x + rw.dirX * 100, tz = rw.z + rw.dirZ * 100, ty = rw.height + 1;
            const dx = tx - s.x, dz = tz - s.z;
            const distH = Math.hypot(dx, dz);
            const desiredHeading = Math.atan2(dx, -dz);
            let headingError = desiredHeading - s.yaw;
            while (headingError > Math.PI) headingError -= 2 * Math.PI;
            while (headingError < -Math.PI) headingError += 2 * Math.PI;
            const desiredPitch = (() => {
              const raw = Math.atan2(ty - s.y, Math.max(1, distH));
              // Flare: within 12 m of the strip, never descend steeper than
              // -0.12 rad (sink ~4.2 m/s at 35 m/s) — the gentle limit is
              // 8 m/s, and the pitch-state ripple adds ~0.1 rad on top of
              // the commanded value, so the raw glide (-0.11) is fine but
              // the steepening near the target point (-0.23, round 3b)
              // touched down at -9.5 m/s and crashed.
              const cap = s.y < rw.height + 12 ? -0.12 : -0.25;
              return Math.max(cap, Math.min(0.1, raw));
            })();
            const pitchInput = Math.max(-1, Math.min(1, (desiredPitch - s.pitch) * 1.5));
            const rollInput = Math.max(-1, Math.min(1, headingError * 2.0));
            const thrDelta = Math.max(-1, Math.min(1, (35 - s.speed) * 0.05));
            input = { pitch: pitchInput, roll: rollInput, throttle: thrDelta };
          } else {
            input = window.__autopilotTo(D.flight, ring, 0.72, D.terrain.groundAt);
          }
          setKey('KeyW', duty('up', input.pitch > 0 ? input.pitch : 0));
          setKey('KeyS', duty('down', input.pitch < 0 ? -input.pitch : 0));
          setKey('KeyD', duty('right', input.roll > 0 ? input.roll : 0));
          setKey('KeyA', duty('left', input.roll < 0 ? -input.roll : 0));
          setKey('ShiftLeft', duty('thrUp', input.throttle > 0 ? input.throttle : 0));
          setKey('ControlLeft', duty('thrDown', input.throttle < 0 ? -input.throttle : 0));
        }
      } catch (e) { /* keep flying */ }
      window.__probeCtrlRaf = requestAnimationFrame(tick);
    }
    window.__probeCtrl = { stop() { cancelAnimationFrame(window.__probeCtrlRaf); releaseAll(); } };
    window.__probeCtrlRaf = requestAnimationFrame(tick);
    return 'ok';
  });
}

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- PHASE A3: fly with keys until the mid-air collision ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  console.log('phase A3 controller: ' + await installController(page));
  let blast = null;
  let lastState = null;
  let lastLog = -10;
  for (let i = 0; i < 400; i += 1) {
    lastState = await page.evaluate(() => {
      const s = window.__debug.flight.state;
      return { elapsed: s.elapsed, rings: s.ringsPassed, status: s.status, speed: s.speed, y: s.y };
    });
    const ev = await page.evaluate(() => window.__raceEvents.find((e) => e.kind === 'collision') || null);
    if (ev) { blast = ev; break; }
    if (lastState.status !== 'flying') break;
    if (lastState.elapsed > 100) break;
    if (lastState.elapsed - lastLog >= 5) {
      lastLog = lastState.elapsed;
      console.log('phase A3 t=' + lastState.elapsed.toFixed(0) + ' rings=' + lastState.rings + ' spd=' + Math.round(lastState.speed) + ' y=' + Math.round(lastState.y));
    }
    await sleep(500);
  }
  await page.evaluate(() => window.__probeCtrl && window.__probeCtrl.stop());
  if (blast) {
    console.log('phase A3 blast t=' + blast.time.toFixed(1) + ' at (' + Math.round(blast.x) + ',' + Math.round(blast.y) + ',' + Math.round(blast.z) + ') player rings=' + lastState.rings);
    for (let i = 0; i < 60; i += 1) {
      const el = await page.evaluate(() => window.__debug.flight.state.elapsed);
      if (el >= blast.time + 1.5) break;
      await sleep(100);
    }
    const hud = await page.evaluate(() => ({
      msg: (document.querySelector('#hud-msg') || {}).textContent || '',
      body: document.body.innerText.includes('MID-AIR COLLISION'),
      elapsed: window.__debug.flight.state.elapsed,
      rings: window.__debug.flight.state.ringsPassed,
    }));
    await page.screenshot({ path: '/tmp/v15-live-blast.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A3 shot: elapsed=' + hud.elapsed.toFixed(1) + ' rings=' + hud.rings + ' hudMsg=' + JSON.stringify(hud.msg) + ' bodyHasCollisionText=' + hud.body);
  } else {
    console.log('phase A3 NO BLAST: lastState=' + JSON.stringify(lastState) + ' events=' + await page.evaluate(() => JSON.stringify(window.__raceEvents)));
  }

  // ---------- PHASE B3: finish end-to-end ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const tp = await page.evaluate(() => {
    const D = window.__debug;
    const rw = D.course.runway;
    const s = D.flight.state;
    const bx = rw.x - rw.dirX * 250;
    const bz = rw.z - rw.dirZ * 250;
    const g = D.terrain.groundAt(bx, bz);
    s.x = bx; s.z = bz;
    s.y = Math.max(rw.height, g) + 40;
    s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
    s.pitch = 0; s.roll = 0; s.speed = 38; s.verticalSpeed = 0;
    D.course.setProgress(12);
    s.ringsPassed = 12;
    return { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z),
      ground: Math.round(g), rwH: Math.round(rw.height), rings: s.ringsPassed };
  });
  console.log('phase B3 teleported to short final: ' + JSON.stringify(tp));
  console.log('phase B3 controller: ' + await installController(page));
  let over = null;
  let lastB = null;
  let lastLogB = -10;
  for (let i = 0; i < 240; i += 1) {
    lastB = await page.evaluate(() => {
      const D = window.__debug;
      const s = D.flight.state;
      const rw = D.course.runway;
      return { elapsed: s.elapsed, status: s.status, y: s.y, speed: s.speed,
        vs: s.verticalSpeed, distRw: Math.round(Math.hypot(rw.x - s.x, rw.z - s.z)) };
    });
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt.includes('RACE COMPLETE')) { over = 'RACE COMPLETE'; break; }
    if (txt.includes('Landed!')) { over = 'Landed (no race complete)'; break; }
    if (txt.includes('Crashed!')) { over = 'Crashed'; break; }
    if (lastB.status !== 'flying') { over = 'status=' + lastB.status; break; }
    if (lastB.elapsed > 60) { over = 'TIMEOUT 60s'; break; }
    if (lastB.elapsed - lastLogB >= 2) {
      lastLogB = lastB.elapsed;
      console.log('phase B3 t=' + lastB.elapsed.toFixed(0) + ' y=' + Math.round(lastB.y) + ' spd=' + Math.round(lastB.speed) + ' vs=' + lastB.vs.toFixed(1) + ' distRw=' + lastB.distRw);
    }
    await sleep(500);
  }
  await page.evaluate(() => window.__probeCtrl && window.__probeCtrl.stop());
  console.log('phase B3 over=' + over + ' lastState=' + JSON.stringify(lastB));
  if (over === 'RACE COMPLETE') {
    await page.screenshot({ path: '/tmp/v15-live-finish-a.jpg', type: 'jpeg', quality: 80 });
    const panel = await page.evaluate(() => ({
      title: (document.querySelector('#over-title') || {}).textContent || '',
      lines: (document.querySelector('#over-lines') || {}).textContent || '',
    }));
    console.log('phase B3 panel: ' + JSON.stringify(panel));
    await sleep(2000);
    await page.screenshot({ path: '/tmp/v15-live-finish-b.jpg', type: 'jpeg', quality: 80 });
    console.log('phase B3 finish screenshots saved (immediate + 2s)');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
