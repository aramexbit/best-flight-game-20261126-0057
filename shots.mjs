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
    await page.goto('http://localhost:' + PORT + '/index.html' + shot.query, { waitUntil: 'load', timeout: 60000 });
    // v21c: the cover shot stages 31 s of simulation on a heavier scene
    // (5 tornadoes, 4 rain systems, 13 islands) — it takes ~26 s to
    // become ready in software rendering, past the old 20 s timeout.
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 60000 });
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
    // v23: the blast shot must prove the ORANYE tornado-kill happened in
    // the staged run and its destruction message is up in the frame —
    // otherwise the screenshot would be a mid-race frame with no blast.
    if (shot.name === '5-blast.jpg') {
      const blast = await page.evaluate(() => {
        const evs = window.__raceEvents || [];
        const kill = evs.find((e) => e.kind === 'tornado-kill');
        return {
          kill: kill ? { name: kill.name, time: kill.time } : null,
          msg: document.getElementById('hud-msg').textContent,
        };
      });
      console.log('blast', JSON.stringify(blast));
      if (!blast.kill || blast.kill.name !== 'ORANYE') throw new Error('blast shot: no ORANYE tornado-kill');
      if (!blast.msg.includes('DESTROYED BY THE TORNADO')) throw new Error('blast shot: kill message not visible');
    }
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
  await page.goto('http://localhost:' + PORT + '/index.html', { waitUntil: 'load', timeout: 60000 });
  // v21c: the live title page builds the full scene (5 tornadoes, 4 rain
  // systems, 13 islands) before the main thread frees up — that takes
  // ~26 s in software rendering, and the old 800 ms wait left the
  // #btn-start click timing out (the click's actionability checks need
  // a responsive main thread). Wait for the scene to be built first.
  await page.waitForFunction(() => window.__debug, null, { timeout: 60000 });
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
  // v21c: force + 60 s — the heavier scene (5 tornadoes, 4 rain systems,
  // 13 islands) saturates the main thread in software rendering, so the
  // click's stability/hit-target checks starve and time out at 30 s
  // (the button itself is fine — it shows in the title shot and the
  // v21b run clicked it). force skips those checks; the titleHidden /
  // hudVisible assertions below still prove the click really started it.
  await page.click('#btn-start', { timeout: 60000, force: true });
  // v21c: the HUD only shows after the first frame is drawn once the
  // game starts — on the heavier scene that frame takes longer than
  // the old fixed 500 ms in software rendering, so the startClick
  // read below saw the HUD still hidden. Wait for it to appear.
  await page.waitForFunction(() => {
    const h = document.getElementById('hud');
    const s = getComputedStyle(h);
    return s.opacity !== '0' && s.visibility !== 'hidden';
  }, null, { timeout: 30000 });
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
  // v22: the duplicated panels HIDE in cockpit view (top-left ALT/SPD/HDG,
  // attitude ball, compass) — the 3D dials are the instruments now, and the
  // v21 blind test called the dials + outer HUD "cluttered, clashing".
  // What must stay: time, score, ring progress (upper-right), the ring
  // pointer, objective, messages, fuel/throttle. The hidden panels'
  // textContent still exists in the DOM (display:none only), so the
  // reads below still work. Pressing C flashes "COCKPIT VIEW" in the
  // message line for 1.5 s, which is how this check proves the camera
  // actually switched.
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
      // v22: the duplicated panels hide in cockpit view (the 3D dials
      // are the instruments); their textContent still exists in the
      // DOM, so `alt` above still reads — only the display hides.
      topLeftHidden: getComputedStyle(document.getElementById('hud-top-left')).display === 'none',
      attitudeHidden: getComputedStyle(document.getElementById('attitude')).display === 'none',
      compassHidden: getComputedStyle(document.getElementById('compass')).display === 'none',
    };
  });
  console.log('cockpit hud', JSON.stringify(cockpitHud));
  if (cockpitHud.msg !== 'COCKPIT VIEW') throw new Error('cockpit mode did not engage');
  if (!cockpitHud.hudVisible) throw new Error('HUD hidden in cockpit mode');
  if (!cockpitHud.time || cockpitHud.time === '0:00') throw new Error('TIME missing in cockpit HUD');
  if (!cockpitHud.score) throw new Error('SCORE missing in cockpit HUD');
  if (!cockpitHud.rings) throw new Error('RING missing in cockpit HUD');
  if (!cockpitHud.topLeftHidden) throw new Error('cockpit dedup: top-left ALT/SPD/HDG panels should hide in cockpit view');
  if (!cockpitHud.attitudeHidden) throw new Error('cockpit dedup: attitude ball should hide in cockpit view');
  if (!cockpitHud.compassHidden) throw new Error('cockpit dedup: compass should hide in cockpit view');
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(400);
  // v22: toggling back to chase restores the panels.
  const chaseHud = await page.evaluate(() => ({
    topLeftShown: getComputedStyle(document.getElementById('hud-top-left')).display !== 'none',
    msg: document.getElementById('hud-msg').textContent,
  }));
  console.log('chase hud after toggle back', JSON.stringify(chaseHud));
  if (!chaseHud.topLeftShown) throw new Error('cockpit dedup: top-left panels should return in chase view');
  if (chaseHud.msg !== 'CHASE VIEW') throw new Error('camera did not toggle back to chase view');
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
