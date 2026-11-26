// Take the four screenshots and smoke-test the live game: start the server,
// open each ?shot= scene in headless Chromium, wait for window.__shotReady,
// capture a JPEG, then play a few seconds of the real game with the keyboard
// and check the HUD numbers move. Prints only short status lines, no paths.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const OUT_DIR = GAME_DIR + '/screenshots';
const PORT = 8902;
mkdirSync(OUT_DIR, { recursive: true });

const shots = JSON.parse(readFileSync(GAME_DIR + '/shots.json', 'utf8'));
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  for (const shot of shots) {
    await page.goto('http://localhost:' + PORT + '/index.html' + shot.query, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: OUT_DIR + '/' + shot.name, type: 'jpeg', quality: 82 });
    const hudState = await page.evaluate(() => ({
      rings: document.getElementById('hud-rings').textContent,
      score: document.getElementById('hud-score').textContent,
      time: document.getElementById('hud-time').textContent,
      msg: document.getElementById('hud-msg').textContent,
    }));
    console.log('shot', shot.name, 'ok', statSync(OUT_DIR + '/' + shot.name).size, 'bytes', JSON.stringify(hudState));
  }

  // Playtest: title -> Space starts -> hold throttle + roll, HUD must move.
  await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(800);
  // v2: on the title screen the clock must sit at 0:00 and the HUD must be
  // dimmed behind the panel; once play starts the clock has to move.
  const before = await page.evaluate(() => ({
    alt: document.getElementById('hud-alt').textContent,
    spd: document.getElementById('hud-spd').textContent,
    rings: document.getElementById('hud-rings').textContent,
    time: document.getElementById('hud-time').textContent,
    titleShown: document.getElementById('panel-title').style.display,
    hudDimmed: document.body.classList.contains('title-open'),
  }));
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('ShiftLeft');
  const after = await page.evaluate(() => ({
    alt: document.getElementById('hud-alt').textContent,
    spd: document.getElementById('hud-spd').textContent,
    rings: document.getElementById('hud-rings').textContent,
    time: document.getElementById('hud-time').textContent,
    titleHidden: document.getElementById('panel-title').style.display,
    hudDimmed: document.body.classList.contains('title-open'),
  }));
  console.log('playtest before', JSON.stringify(before));
  console.log('playtest after', JSON.stringify(after));
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
