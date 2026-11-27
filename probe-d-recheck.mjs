// probe-d-recheck.mjs — focused re-check of probe phase D (title orbit) for v22.
// The rerun's D-orbit measurement was INVALID, not a game bug: the probe
// computes rate = dyaw * 60 / frames, which assumes ONE fixed step per
// rAF frame. The real loop (main.js, lines 28/686-700) is a fixed-STEP
// accumulator: frameDt is CLAMPED to MAX_FRAME = 0.25 s, and each frame
// runs up to 15 steps (0.25 / STEP). Under starvation every frame is
// clamped, so game time per frame is exactly 0.25 s — NOT 1/60 s.
// The orbit itself (main.js title branch) adds s.yaw += 0.22 * STEP per
// step, so the rate is 0.22 rad/s BY CONSTRUCTION; what the probe must
// verify is that the branch RUNS (yaw advances, roll 0.42, y 98-122)
// and that the accumulator executes steps. The correct rate under
// starvation is dyaw / (frames * 0.25):
//   rerun:  dyaw 0.165, frames 3  -> 0.165 / 0.75  = 0.22 rad/s
//   this re-check (first attempt): dyaw 0.275, frames 5 -> 0.275 / 1.25 = 0.22 rad/s
// (state.elapsed is USELESS as a clock on the title screen — main.js
// line 259 resets it to 0 every frame, so the first version of this
// script, which measured against elapsed, reported INVALID.)
// Usage: node probe-d-recheck.mjs > out/v22-probe-d-recheck.log 2>&1; echo exit=$?
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8915;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await sleep(1000);
  // Yaw rate under starvation: each rAF frame contributes at most
  // MAX_FRAME = 0.25 s of game time (the accumulator clamp), so
  // game time = frames * 0.25 and rate = dyaw / (frames * 0.25).
  // (When the browser is fast the clamp never binds and the rate is
  // dyaw / real seconds instead — frames >= 60 in 3 s means fast.)
  const orbit = await page.evaluate(() => new Promise((resolve) => {
    const D = window.__debug;
    const s0 = D.flight.state;
    const yaw0 = s0.yaw;
    let frames = 0;
    const tick = () => { frames += 1; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    setTimeout(() => {
      const s = D.flight.state;
      let dy = s.yaw - yaw0;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const gameTime = frames < 30 ? frames * 0.25 : 3;
      resolve({ roll: s.roll, y: s.y, dyaw: dy, frames, gameTime, rate: dy / gameTime });
    }, 3000);
  }));
  const pass = orbit.frames >= 1 && orbit.dyaw > 0.1
    && orbit.roll >= 0.35 && orbit.roll <= 0.5
    && orbit.rate >= 0.20 && orbit.rate <= 0.24
    && orbit.y >= 95 && orbit.y <= 125;
  console.log('phase D orbit (clamp-aware recheck): ' + JSON.stringify(orbit) + ' PASS=' + pass);
  console.log('errors: ' + (errors.length ? errors.join(' | ') : 'none'));
  if (!pass) process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill();
}
