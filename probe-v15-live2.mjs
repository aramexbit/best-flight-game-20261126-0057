// probe-v15-live2.mjs — live-play proof, round 2. The round-1 controller
// held keys CONTINUOUSLY (bang-bang): the autopilot asks for pitch/roll
// ~0.2-0.5, the keys give +-1, so the plane banked at full rate and
// circled for 91 s with 0 rings; and it treated the throttle DELTA
// (-1..1, input.js) as an absolute 0..1, so it held Control almost the
// whole flight. This version uses a sigma-delta modulator: each poll adds
// |value| to an accumulator and holds the key only when it crosses 1, so
// the AVERAGE deflection matches the autopilot's continuous command.
// (A) fly with keys to the mid-air blast, screenshot at blast+1.5 s.
// (B) finish end-to-end: safe teleport to short final (y above local
// terrain, not inside a hill — round 1 teleported into terrain and
// crashed instantly), fly the keys to touchdown, verify RACE COMPLETE +
// panel + fireworks/confetti. One retry from the threshold if it crashes.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8911;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makeController(page) {
  const held = new Set();
  const acc = { up: 0, down: 0, right: 0, left: 0, thrUp: 0, thrDown: 0 };
  async function setKey(code, down) {
    if (down && !held.has(code)) { held.add(code); await page.keyboard.down(code); }
    if (!down && held.has(code)) { held.delete(code); await page.keyboard.up(code); }
  }
  async function releaseAll() {
    for (const code of [...held]) await page.keyboard.up(code);
    held.clear();
  }
  function duty(slot, v) {
    if (v <= 0.02) return false;
    acc[slot] += v;
    if (acc[slot] >= 1) { acc[slot] -= 1; return true; }
    return false;
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
        elapsed: s.elapsed, rings: s.ringsPassed, status: s.status, speed: s.speed,
        y: s.y, vs: s.verticalSpeed };
    }).catch(() => null);
    if (!st) { await releaseAll(); return null; }
    await setKey('KeyW', duty('up', st.pitch > 0 ? st.pitch : 0));
    await setKey('KeyS', duty('down', st.pitch < 0 ? -st.pitch : 0));
    await setKey('KeyD', duty('right', st.roll > 0 ? st.roll : 0));
    await setKey('KeyA', duty('left', st.roll < 0 ? -st.roll : 0));
    await setKey('ShiftLeft', duty('thrUp', st.throttle > 0 ? st.throttle : 0));
    await setKey('ControlLeft', duty('thrDown', st.throttle < 0 ? -st.throttle : 0));
    return st;
  }
  return { step, releaseAll };
}

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- PHASE A2: fly with keys until the mid-air collision ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  console.log('phase A2 started, status=' + await page.evaluate(() => window.__debug.flight.state.status));
  const ctrl = await makeController(page);
  let blast = null;
  let lastState = null;
  let lastLog = -10;
  for (let i = 0; i < 1200; i += 1) {
    lastState = await ctrl.step();
    const ev = await page.evaluate(() => window.__raceEvents.find((e) => e.kind === 'collision') || null);
    if (ev) { blast = ev; break; }
    if (lastState && lastState.status !== 'flying') break;
    if (lastState && lastState.elapsed > 100) break;
    if (lastState && lastState.elapsed - lastLog >= 5) {
      lastLog = lastState.elapsed;
      console.log('phase A2 t=' + lastState.elapsed.toFixed(0) + ' rings=' + lastState.rings + ' spd=' + Math.round(lastState.speed) + ' y=' + Math.round(lastState.y));
    }
    await sleep(150);
  }
  await ctrl.releaseAll();
  if (blast) {
    console.log('phase A2 blast t=' + blast.time.toFixed(1) + ' at (' + Math.round(blast.x) + ',' + Math.round(blast.y) + ',' + Math.round(blast.z) + ') player rings=' + (lastState ? lastState.rings : '?'));
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
    console.log('phase A2 shot: elapsed=' + hud.elapsed.toFixed(1) + ' rings=' + hud.rings + ' hudMsg=' + JSON.stringify(hud.msg) + ' bodyHasCollisionText=' + hud.body);
  } else {
    console.log('phase A2 NO BLAST: lastState=' + JSON.stringify(lastState) + ' events=' + await page.evaluate(() => JSON.stringify(window.__raceEvents)));
  }

  // ---------- PHASE B2: finish end-to-end ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  async function teleportShortFinal(dist, alt) {
    return page.evaluate(({ dist, alt }) => {
      const D = window.__debug;
      const rw = D.course.runway;
      const s = D.flight.state;
      const bx = rw.x - rw.dirX * dist;
      const bz = rw.z - rw.dirZ * dist;
      const g = D.terrain.groundAt(bx, bz);
      s.x = bx; s.z = bz;
      s.y = Math.max(rw.height, g) + alt;
      s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
      s.pitch = 0; s.roll = 0; s.speed = 38; s.verticalSpeed = 0;
      s.status = 'flying';
      D.course.setProgress(12);
      s.ringsPassed = 12;
      return { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z),
        ground: Math.round(g), rwH: Math.round(rw.height), rings: s.ringsPassed };
    }, { dist, alt });
  }
  async function flyToTouchdown(tag) {
    const ctrlB = await makeController(page);
    let over = null;
    let lastB = null;
    let lastLogB = -10;
    for (let i = 0; i < 600; i += 1) {
      lastB = await ctrlB.step();
      const txt = await page.evaluate(() => document.body.innerText);
      if (txt.includes('RACE COMPLETE')) { over = 'RACE COMPLETE'; break; }
      if (txt.includes('Landed!')) { over = 'Landed (no race complete)'; break; }
      if (txt.includes('Crashed!')) { over = 'Crashed'; break; }
      if (lastB && lastB.status !== 'flying') { over = 'status=' + lastB.status; break; }
      if (lastB && lastB.elapsed > 60) { over = 'TIMEOUT 60s'; break; }
      if (lastB && lastB.elapsed - lastLogB >= 2) {
        lastLogB = lastB.elapsed;
        const d = await page.evaluate(() => {
          const D = window.__debug;
          const rw = D.course.runway;
          const s = D.flight.state;
          return Math.round(Math.hypot(rw.x - s.x, rw.z - s.z));
        });
        console.log(tag + ' t=' + lastB.elapsed.toFixed(0) + ' y=' + Math.round(lastB.y) + ' spd=' + Math.round(lastB.speed) + ' vs=' + lastB.vs.toFixed(1) + ' distRw=' + d);
      }
      await sleep(150);
    }
    await ctrlB.releaseAll();
    console.log(tag + ' over=' + over + ' lastState=' + JSON.stringify(lastB));
    return over;
  }
  const tp1 = await teleportShortFinal(250, 40);
  console.log('phase B2 attempt 1 teleported: ' + JSON.stringify(tp1));
  let over = await flyToTouchdown('phase B2 att1');
  if (over !== 'RACE COMPLETE') {
    console.log('phase B2 attempt 1 did not finish (' + over + '), retry from the threshold');
    await page.keyboard.press('KeyR');
    await sleep(500);
    await page.keyboard.press('Space');
    await sleep(500);
    const tp2 = await teleportShortFinal(40, 8);
    console.log('phase B2 attempt 2 teleported: ' + JSON.stringify(tp2));
    over = await flyToTouchdown('phase B2 att2');
  }
  if (over === 'RACE COMPLETE') {
    await page.screenshot({ path: '/tmp/v15-live-finish-a.jpg', type: 'jpeg', quality: 80 });
    const panel = await page.evaluate(() => ({
      title: (document.querySelector('#over-title') || {}).textContent || '',
      lines: (document.querySelector('#over-lines') || {}).textContent || '',
    }));
    console.log('phase B2 panel: ' + JSON.stringify(panel));
    await sleep(2000);
    await page.screenshot({ path: '/tmp/v15-live-finish-b.jpg', type: 'jpeg', quality: 80 });
    console.log('phase B2 finish screenshots saved (immediate + 2s)');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
