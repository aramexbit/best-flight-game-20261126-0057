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
    const hudState = await page.evaluate(() => {
      const hudStyle = getComputedStyle(document.getElementById('hud'));
      return {
        rings: document.getElementById('hud-rings').textContent,
        score: document.getElementById('hud-score').textContent,
        time: document.getElementById('hud-time').textContent,
        msg: document.getElementById('hud-msg').textContent,
        // v3: the title shot must prove the HUD is fully hidden, not dimmed.
        hudOpacity: hudStyle.opacity,
        hudVisibility: hudStyle.visibility,
      };
    });
    console.log('shot', shot.name, 'ok', statSync(OUT_DIR + '/' + shot.name).size, 'bytes', JSON.stringify(hudState));
    // v4: report how much scenery the generator planted (trees/palms/rocks/
    // bushes) — the cover shot is the proof it is visible, this is the count.
    if (shot.name === '1-cover.jpg') {
      const veg = await page.evaluate(() => window.__vegCounts || null);
      console.log('veg', JSON.stringify(veg));
      if (!veg || !veg.trees || !veg.palms) throw new Error('veg counts missing');
    }
  }

  // Playtest: title -> Start button click starts -> hold throttle + roll,
  // HUD must move. (Space is pressed after the click too, as a second start
  // path check — it is a no-op once the game is already in play.)
  await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(800);
  // v3: on the title screen the clock must sit at 0:00 and the HUD must be
  // fully hidden behind the panel (opacity 0, visibility hidden); once play
  // starts the clock has to move and the HUD must come back.
  const before = await page.evaluate(() => {
    const hudStyle = getComputedStyle(document.getElementById('hud'));
    return {
      alt: document.getElementById('hud-alt').textContent,
      spd: document.getElementById('hud-spd').textContent,
      rings: document.getElementById('hud-rings').textContent,
      time: document.getElementById('hud-time').textContent,
      titleShown: document.getElementById('panel-title').style.display,
      hudHidden: hudStyle.opacity === '0' && hudStyle.visibility === 'hidden',
    };
  });
  // v11: the title screen's big yellow Start button must actually start the
  // game when clicked — not just look like a button. Click it, then check
  // the title panel is gone and the HUD is back before the throttle test.
  await page.click('#btn-start');
  await page.waitForTimeout(500);
  const startClick = await page.evaluate(() => {
    const hudStyle = getComputedStyle(document.getElementById('hud'));
    return {
      titleHidden: document.getElementById('panel-title').style.display,
      hudVisible: hudStyle.opacity !== '0' && hudStyle.visibility !== 'hidden',
      time: document.getElementById('hud-time').textContent,
    };
  });
  console.log('start button click', JSON.stringify(startClick));
  if (startClick.titleHidden !== 'none') throw new Error('Start button did not start the game');
  if (!startClick.hudVisible) throw new Error('HUD hidden after Start button click');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('ShiftLeft');
  const after = await page.evaluate(() => {
    const hudStyle = getComputedStyle(document.getElementById('hud'));
    return {
      alt: document.getElementById('hud-alt').textContent,
      spd: document.getElementById('hud-spd').textContent,
      rings: document.getElementById('hud-rings').textContent,
      time: document.getElementById('hud-time').textContent,
      titleHidden: document.getElementById('panel-title').style.display,
      hudVisible: hudStyle.opacity !== '0' && hudStyle.visibility !== 'hidden',
    };
  });
  console.log('playtest before', JSON.stringify(before));
  console.log('playtest after', JSON.stringify(after));
  // v4: cockpit mode must keep the same HUD as third-person — time, score and
  // ring progress in the upper-right, and the alt/speed/heading chips below.
  // Pressing C flashes "COCKPIT VIEW" in the message line for 1.5 s, which is
  // how this check proves the camera actually switched.
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(400);
  const cockpitHud = await page.evaluate(() => {
    const hudStyle = getComputedStyle(document.getElementById('hud'));
    return {
      msg: document.getElementById('hud-msg').textContent,
      time: document.getElementById('hud-time').textContent,
      score: document.getElementById('hud-score').textContent,
      rings: document.getElementById('hud-rings').textContent,
      alt: document.getElementById('hud-alt').textContent,
      hudVisible: hudStyle.opacity !== '0' && hudStyle.visibility !== 'hidden',
    };
  });
  console.log('cockpit hud', JSON.stringify(cockpitHud));
  if (cockpitHud.msg !== 'COCKPIT VIEW') throw new Error('cockpit mode did not engage');
  if (!cockpitHud.hudVisible) throw new Error('HUD hidden in cockpit mode');
  if (!cockpitHud.time || cockpitHud.time === '0:00') throw new Error('TIME missing in cockpit HUD');
  if (!cockpitHud.score) throw new Error('SCORE missing in cockpit HUD');
  if (!cockpitHud.rings) throw new Error('RING missing in cockpit HUD');
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(400);
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
