// probe-v15-live.mjs — live-play proof for v15: (A) the mid-air blast
// visible on screen while flying with KEYBOARD input only (autopilot
// logic translated to W/S/A/D/Shift key presses, like a human player);
// (B) the finish sequence end-to-end: teleport to short final with
// 12/12 rings, fly the keys to touchdown, verify RACE COMPLETE +
// results panel + fireworks/confetti render; (C) five shadow meshes
// (player + 4 rivals) in the live scene. Prints short status lines.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8910;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- keyboard autopilot: poll the in-page autopilot, hold keys like a player
async function makeController(page) {
  const held = new Set();
  async function setKey(code, down) {
    if (down && !held.has(code)) { held.add(code); await page.keyboard.down(code); }
    if (!down && held.has(code)) { held.delete(code); await page.keyboard.up(code); }
  }
  async function releaseAll() {
    for (const code of [...held]) await page.keyboard.up(code);
    held.clear();
  }
  async function step() {
    const st = await page.evaluate(() => {
      const D = window.__debug;
      const s = D.flight.state;
      if (!D || s.status !== 'flying') return null;
      const ring = D.course.nextRing();
      let target; let thr;
      if (!ring) {
        const rw = D.course.runway;
        const d = Math.hypot(rw.x - s.x, rw.z - s.z);
        target = d > 300
          ? { x: rw.x - rw.dirX * 260, y: rw.height + 45, z: rw.z - rw.dirZ * 260 }
          : { x: rw.x, y: rw.height + 6, z: rw.z };
        thr = 0.3;
      } else { target = ring; thr = 0.72; }
      const input = window.__autopilotTo(D.flight, target, thr, D.terrain.groundAt);
      return { pitch: input.pitch, roll: input.roll, throttle: input.throttle,
        elapsed: s.elapsed, rings: s.ringsPassed, status: s.status, speed: s.speed };
    }).catch(() => null);
    if (!st) { await releaseAll(); return null; }
    await setKey('KeyW', st.pitch > 0.15);
    await setKey('KeyS', st.pitch < -0.15);
    await setKey('KeyD', st.roll > 0.15);
    await setKey('KeyA', st.roll < -0.15);
    await setKey('ShiftLeft', st.throttle > 0.65);
    await setKey('ControlLeft', st.throttle < 0.35);
    return st;
  }
  return { step, releaseAll };
}

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- PHASE A: fly with keys until the mid-air collision ----------
  // v15 (fix): the LIVE game runs only with NO ?shot= param (main.js:
  // `if (shot) runShot(shot); else runGame()`). The first version of this
  // probe loaded ?shot=start, which is a FROZEN staged frame — elapsed
  // stayed 0 for 900 polls and no blast could ever happen. Load the plain
  // live page and wait for window.__debug instead of __shotReady.
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const started = await page.evaluate(() => window.__debug.flight.state.status);
  console.log('phase A started, status=' + started);
  const ctrl = await makeController(page);
  let blast = null;
  let lastState = null;
  for (let i = 0; i < 900; i += 1) {
    lastState = await ctrl.step();
    const ev = await page.evaluate(() => window.__raceEvents.find((e) => e.kind === 'collision') || null);
    if (ev) { blast = ev; break; }
    if (lastState && lastState.status !== 'flying') break;
    if (lastState && lastState.elapsed > 90) break;
    await sleep(120);
  }
  await ctrl.releaseAll();
  if (blast) {
    console.log('phase A blast event t=' + blast.time.toFixed(1) + ' at (' + Math.round(blast.x) + ',' + Math.round(blast.y) + ',' + Math.round(blast.z) + ') player rings=' + (lastState ? lastState.rings : '?'));
    // wait until 1.5 s of game time after the blast, then screenshot
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
    console.log('phase A shot: elapsed=' + hud.elapsed.toFixed(1) + ' rings=' + hud.rings + ' hudMsg=' + JSON.stringify(hud.msg) + ' bodyHasCollisionText=' + hud.body);
  } else {
    console.log('phase A NO BLAST: lastState=' + JSON.stringify(lastState) + ' events=' + await page.evaluate(() => JSON.stringify(window.__raceEvents)));
  }

  // ---------- PHASE C: five shadows in the live scene ----------
  // v15 (fix): CircleGeometry + map alone matches 461 meshes — the ground
  // discs under every tree/palm (20 segments) and the cockpit dial faces
  // (24 segments, tiny). Plane blob shadows are the only ones with 24
  // segments AND a world scale above 5 (mesh.scale 7.5 x 5.5 m).
  const shadows = await page.evaluate(() => {
    const out = [];
    window.__scene.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.segments === 24
        && o.material && o.material.map && o.scale.x > 5) {
        // THREE is module-scoped, not a page global — reuse the
        // position vector's constructor to get a Vector3.
        const w = new o.position.constructor();
        o.getWorldPosition(w);
        out.push({ x: Math.round(w.x), y: Math.round(w.y), z: Math.round(w.z), vis: o.visible });
      }
    });
    return out;
  });
  console.log('phase C shadows: count=' + shadows.length + ' ' + JSON.stringify(shadows));

  // ---------- PHASE B: finish end-to-end (live page, no ?shot=) ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const tp = await page.evaluate(() => {
    const D = window.__debug;
    const rw = D.course.runway;
    const s = D.flight.state;
    s.x = rw.x - rw.dirX * 250;
    s.z = rw.z - rw.dirZ * 250;
    s.y = rw.height + 40;
    s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
    s.pitch = 0; s.roll = 0; s.speed = 40; s.verticalSpeed = 0;
    D.course.setProgress(12);
    s.ringsPassed = 12;
    return { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z), yaw: +s.yaw.toFixed(2), rings: s.ringsPassed };
  });
  console.log('phase B teleported to short final: ' + JSON.stringify(tp));
  const ctrlB = await makeController(page);
  let over = null;
  let lastB = null;
  for (let i = 0; i < 600; i += 1) {
    lastB = await ctrlB.step();
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt.includes('RACE COMPLETE')) { over = 'RACE COMPLETE'; break; }
    if (txt.includes('Landed!')) { over = 'Landed (no race complete)'; break; }
    if (txt.includes('Crashed!')) { over = 'Crashed'; break; }
    if (lastB && lastB.status !== 'flying') { over = 'status=' + lastB.status; break; }
    if (lastB && lastB.elapsed > 60) { over = 'TIMEOUT 60s'; break; }
    await sleep(120);
  }
  await ctrlB.releaseAll();
  console.log('phase B over=' + over + ' lastState=' + JSON.stringify(lastB));
  if (over === 'RACE COMPLETE') {
    await page.screenshot({ path: '/tmp/v15-live-finish-a.jpg', type: 'jpeg', quality: 80 });
    const panel = await page.evaluate(() => ({
      title: (document.querySelector('#over-title') || {}).textContent || '',
      lines: (document.querySelector('#over-lines') || {}).textContent || '',
    }));
    console.log('phase B panel: ' + JSON.stringify(panel));
    await sleep(2000);
    await page.screenshot({ path: '/tmp/v15-live-finish-b.jpg', type: 'jpeg', quality: 80 });
    console.log('phase B finish screenshots saved (immediate + 2s)');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
