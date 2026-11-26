// probe-v14-diag.mjs — diagnose why the mid-air collision never fires on
// seeds 5 and 9. Same in-page sim as probe-v14, but logs the collision
// state every 5 s: each rival's state, distance to the meeting point,
// player distance to the meeting point, and any rival crash.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8904;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  for (const seed of [5, 9]) {
    await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=' + seed, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    const lines = await page.evaluate((sd) => {
      const D = window.__debug;
      const { flight, course, terrain, rivals, effects } = D;
      const autopilotTo = window.__autopilotTo;
      window.__raceEvents.length = 0;
      flight.reset(course.spawn);
      course.reset();
      rivals.reset();
      effects.clear();
      const out = [];
      const STEP = 1 / 60;
      const log = [];
      for (let i = 0; i < 120 * 60; i += 1) {
        const s = flight.state;
        if (s.status !== 'flying') break;
        const t = (i + 1) * STEP;
        const ring = course.nextRing();
        let target;
        let throttleTarget = 0.72;
        if (!ring) {
          const runway = course.runway;
          const distToRunway = Math.hypot(runway.x - s.x, runway.z - s.z);
          target = distToRunway > 300
            ? { x: runway.x - runway.dirX * 260, y: runway.height + 45, z: runway.z - runway.dirZ * 260 }
            : { x: runway.x, y: runway.height + 6, z: runway.z };
          throttleTarget = 0.3;
        } else {
          target = ring;
        }
        const prev = { x: s.x, y: s.y, z: s.z };
        const input = autopilotTo(flight, target, throttleTarget, terrain.groundAt);
        const ev = flight.step(STEP, input, terrain.groundAt, course.runway);
        const pass = course.checkPass(prev, s);
        if (pass && pass.passed) {
          s.ringsPassed += 1;
          s.score += pass.bonus;
        }
        const before = {};
        for (const r of rivals.debug()) before[r.name] = r.state;
        rivals.update(STEP, t, flight, course, terrain.groundAt, course.runway, null, null,
          (kind, detail) => {
            window.__raceEvents.push({ kind, time: t, ...detail });
            log.push('t=' + Math.round(t) + ' EVENT ' + kind);
          });
        effects.update(STEP);
        for (const r of rivals.debug()) {
          if (before[r.name] !== r.state) log.push('t=' + Math.round(t * 10) / 10 + ' ' + r.name + ' ' + before[r.name] + '->' + r.state);
        }
        if (i % 300 === 299) {
          const dbg = rivals.debug();
          const k = dbg.find((r) => r.name === 'KUNING');
          const h = dbg.find((r) => r.name === 'HIJAU');
          const mp = k.meetPoint || h.meetPoint;
          const d = (r) => (r.meetPoint
            ? Math.round(Math.hypot(r.x - r.meetPoint.x, r.y - r.meetPoint.y, r.z - r.meetPoint.z))
            : null);
          const pDist = mp ? Math.round(Math.hypot(s.x - mp.x, s.y - mp.y, s.z - mp.z)) : null;
          out.push('t=' + Math.round(t) + ' prings=' + s.ringsPassed
            + ' K:' + k.state + '(' + d(k) + 'm) H:' + h.state + '(' + d(h) + 'm)'
            + ' playerDist=' + pDist + 'm');
        }
      }
      return { seed: sd, log, sample: out, events: window.__raceEvents };
    }, seed);
    console.log('diag seed', seed, 'events', JSON.stringify(lines.events));
    for (const l of lines.log) console.log(' ', l);
    for (const l of lines.sample) console.log(' ', l);
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('done');
