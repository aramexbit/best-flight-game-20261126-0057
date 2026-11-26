// probe-v15-seed11.mjs — why seed 11 never fires the mid-air collision.
// In-page sim, one line per game-second: rival states, distances to the
// shared meeting point, player distance to it, blast midpoint distance
// and facing. Prints only short status lines, no paths.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8909;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=11', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
  const log = await page.evaluate(() => {
    const D = window.__debug;
    const { flight, course, terrain, rivals, effects } = D;
    const autopilotTo = window.__autopilotTo;
    window.__raceEvents.length = 0;
    flight.reset(course.spawn);
    course.reset();
    rivals.reset();
    effects.clear();
    const lines = [];
    const STEP = 1 / 60;
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
      if (pass && pass.passed) { s.ringsPassed += 1; s.score += pass.bonus; }
      rivals.update(STEP, t, flight, course, terrain.groundAt, course.runway, null, null,
        (kind, detail) => { window.__raceEvents.push({ kind, time: t, ...detail }); });
      effects.update(STEP);
      if (i % 60 === 59) {
        const dbg = rivals.debug();
        const k = dbg.find((r) => r.name === 'KUNING');
        const h = dbg.find((r) => r.name === 'HIJAU');
        const mp = k.meetPoint || h.meetPoint;
        const pf = { x: Math.sin(s.yaw), z: -Math.cos(s.yaw) };
        let row = `t=${Math.round(t)} rings=${s.ringsPassed} K=${k.state} H=${h.state}`;
        if (mp) {
          const dK = Math.round(Math.hypot(k.x - mp.x, k.y - mp.y, k.z - mp.z));
          const dH = Math.round(Math.hypot(h.x - mp.x, h.y - mp.y, h.z - mp.z));
          const pDist = Math.round(Math.hypot(s.x - mp.x, s.y - mp.y, s.z - mp.z));
          const mx = (k.x + h.x) / 2;
          const mz = (k.z + h.z) / 2;
          const bDist = Math.round(Math.hypot(mx - s.x, k.y - s.y, mz - s.z));
          const facing = bDist > 0 ? Math.round((((mx - s.x) * pf.x + (mz - s.z) * pf.z) / bDist) * 100) / 100 : -1;
          const alongMp = Math.round((mp.x - s.x) * pf.x + (mp.z - s.z) * pf.z);
          row += ` dK=${dK} dH=${dH} pDist=${pDist} bDist=${bDist} facing=${facing} alongMp=${alongMp}`;
        } else {
          row += ' noMeetPoint';
        }
        row += ` events=${window.__raceEvents.length}`;
        lines.push(row);
        if (window.__raceEvents.length > 0) break;
      }
    }
    return lines;
  });
  for (const line of log) console.log(line);
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');

// FINDING (26 Nov ~20:10 WIB): seed 11 never fired before the fix because
// (a) HIJAU converges from ~1057 m while KUNING starts at ~610 m, so the
// pair arrives at the meeting point at different times and the player
// passes the point while they are still looping ~100 m around it (the
// holding orbit is a wide autopilot loop, not a hover); (b) after ring 12
// the re-anchor clamped to ring 12, so it re-anchored to the same point
// behind the player and the in-view gates (facing > 0.6, blastDist
// 100-400) could never align. FIXED in rivals.js: clamped re-anchors
// now put the point 400 m ahead of the player, plus a second-chance
// window (t >= 45 s, both rivals within 130 m, blast 50-400 m in view).
// Seed 11 now fires at t=51.1 s; seeds 1-10/12 still fire at 33.4-34.1 s.
