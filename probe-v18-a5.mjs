// probe-v18-a5.mjs — FOCUSED re-check of Phase A5 only (chase camera
// through turns + steep climb), run after the v18 camera-height fix
// (render.js: lerp rate 8 + height floor plane.y + 2.5). The full live
// probe's A5 failed pre-fix (30/120 bad samples, min above -8 m); this
// script re-verifies the fix alone instead of re-running the whole
// ~12 min live probe. Prints the same A5 summary line.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const SHOTS = GAME_DIR + '/live-shots';
const PORT = 8915;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Same in-page keyboard driver as probe-v18-live.mjs ('ring' mode).
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
  window.__kbTimer = setInterval(() => {
    const D = window.__debug;
    if (!D) return;
    const s = D.flight.state;
    if (s.status !== 'flying') { for (const c of [...held]) setKey(c, false); return; }
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
    setKey('KeyW', input.pitch > 0.1);
    setKey('KeyS', input.pitch < -0.1);
    setKey('KeyD', input.roll > 0.1);
    setKey('KeyA', input.roll < -0.1);
    setKey('ShiftLeft', input.throttle > 0.65);
    setKey('ControlLeft', input.throttle < 0.35);
  }, 250);
};
window.__kbStop = () => {
  if (window.__kbTimer) { clearInterval(window.__kbTimer); window.__kbTimer = null; }
  if (window.__kbHeld) { for (const c of [...window.__kbHeld]) window.__kbSetKey(c, false); }
};
`;
async function sampleCamera(page) {
  return page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const cp = D.renderer.camera.position;
    const fx = Math.sin(s.yaw); const fz = -Math.cos(s.yaw);
    const dx = cp.x - s.x; const dz = cp.z - s.z;
    const hDist = Math.hypot(dx, dz) || 1;
    return { elapsed: s.elapsed, status: s.status,
      dot: (dx * fx + dz * fz) / hDist, above: cp.y - s.y,
      // v18c: camera-to-plane distance — the chase lag metric. Pre-fix the
      // camera sat 25-150 m behind the plane at low FPS (plane a tiny
      // speck dead-centre in frame); with the feedforward + real-dt lerp
      // it should hold near the 12.3 m chase geometry at any FPS.
      dist: Math.hypot(cp.x - s.x, cp.y - s.y, cp.z - s.z),
      pitch: s.pitch, yawDeg: Math.round(((s.yaw * 180 / Math.PI) % 360 + 360) % 360), rings: s.ringsPassed };
  }).catch(() => null);
}
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await page.evaluate(DRIVER_SRC);
  await page.evaluate(() => window.__kbDrive('ring'));
  let camSamples = 0;
  let camBad = 0;
  let minDot = 1;
  let minAbove = 99;
  let maxPitch = 0;
  let maxDist = 0;
  for (let i = 0; i < 120; i += 1) {
    const c = await sampleCamera(page);
    if (!c) break;
    if (c.status !== 'flying') break;
    camSamples += 1;
    minDot = Math.min(minDot, c.dot);
    minAbove = Math.min(minAbove, c.above);
    maxPitch = Math.max(maxPitch, c.pitch);
    maxDist = Math.max(maxDist, c.dist);
    if (c.dot >= 0 || c.above <= 2) { camBad += 1; console.log('phase A5 BAD camera sample ' + JSON.stringify(c)); }
    if (i === 40) await page.screenshot({ path: SHOTS + '/v18-live-cam-turn2.jpg', type: 'jpeg', quality: 80 });
    if (c.elapsed >= 40) break;
    await sleep(500);
  }
  await page.evaluate(() => window.__kbStop && window.__kbStop());
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await sleep(3000);
  const climbCam = await sampleCamera(page);
  await page.screenshot({ path: SHOTS + '/v18-live-cam-climb2.jpg', type: 'jpeg', quality: 80 });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  console.log('phase A5 (re-check, post-fix) chase camera: samples=' + camSamples + ' bad=' + camBad
    + ' minDot=' + minDot.toFixed(2) + ' minAboveM=' + Math.round(minAbove)
    + ' maxDistM=' + Math.round(maxDist)
    + ' maxPitch=' + maxPitch.toFixed(2) + ' climbCam=' + JSON.stringify(climbCam)
    + ' PASS=' + (camBad === 0 && climbCam && climbCam.dot < 0 && climbCam.above > 2));
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
