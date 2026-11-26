// Finish-effect visual check: load the live game, start a run, then fire
// the exact finish visuals (fireworkShow over the runway + confetti over
// the plane) through the exposed debug handle and screenshot them. This
// verifies the fireworks/confetti RENDER; the touchdown trigger itself
// (EVENT_LAND after 12 rings) is exercised only by a real landing, which
// the sim autopilot never achieves (accepted orbit quirk since v3).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8905;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const errors = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + PORT + '/index.html?shot=landing&seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 30000 });
  const r = await page.evaluate(() => {
    const D = window.__debug;
    const rw = D.course.runway;
    const s = D.flight.state;
    // Same calls endGame(true) makes, at the same places.
    D.effects.fireworkShow(rw.x, rw.y, rw.z);
    D.effects.confetti(s.x, s.y + 4, s.z);
    return { runway: { x: rw.x, y: rw.y, z: rw.z }, plane: { x: s.x, y: s.y, z: s.z } };
  });
  console.log('finish visuals fired', JSON.stringify(r));
  // Let the bursts rise and the confetti fall for ~2 s of wall time.
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/v14-finish.jpg', type: 'jpeg', quality: 80 });
  console.log('screenshot saved');
  console.log('errors:', errors.length === 0 ? 'none' : errors.join(' | '));
} finally {
  if (browser) await browser.close();
  server.kill();
}
