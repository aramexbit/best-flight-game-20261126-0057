// Finish-effect visual check v2: run the LIVE game (loop advancing), put
// the plane on short final over the runway threshold, fire the exact
// finish visuals (fireworkShow over the runway + confetti over the
// plane) and screenshot after the live loop has advanced them. Verifies
// the fireworks/confetti RENDER in live play; the touchdown trigger
// itself (EVENT_LAND after 12 rings) still needs a real landing.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8906;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const errors = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug, null, { timeout: 30000 });
  await page.evaluate(() => { document.getElementById('btn-start').click(); });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const D = window.__debug;
    const rw = D.course.runway;
    const s = D.flight.state;
    // Park the plane on short final, 250 m short of the threshold, so the
    // runway fireworks are in the chase camera's view, as at a real landing.
    // (Runway altitude is runway.height, not .y — .y is undefined and
    // poisons the flight state with NaN.)
    const rwY = rw.height;
    s.x = rw.x - rw.dirX * 250;
    s.y = rwY + 40;
    s.z = rw.z - rw.dirZ * 250;
    s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
    s.speed = 40;
    D.effects.fireworkShow(rw.x, rwY, rw.z);
    D.effects.confetti(s.x, s.y + 4, s.z);
    return { runway: { x: rw.x, y: rwY, z: rw.z }, plane: { x: s.x, y: s.y, z: s.z } };
  });
  console.log('finish visuals fired', JSON.stringify(r));
  // Live loop in the headless shell runs ~1/3 speed: 6 s wall lets the
  // bursts rise and the confetti fall visibly.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: '/tmp/v14-finish2.jpg', type: 'jpeg', quality: 80 });
  console.log('screenshot saved');
  console.log('errors:', errors.length === 0 ? 'none' : errors.join(' | '));
} finally {
  if (browser) await browser.close();
  server.kill();
}
