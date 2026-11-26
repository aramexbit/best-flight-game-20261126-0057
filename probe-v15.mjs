// probe-v15.mjs — verify the v15 fixes in a real browser, not staged shots.
// Prints only short status lines, no paths.
//   A. Ring clearance (seeds 1-3): every ring's bottom rim above the mesh.
//   B. Full-run sim (seeds 1-12): autopilot run in-page, rings/landed/score,
//      collision time + split halves alive + rival visibility ahead.
//   B2. Collision geometry from the staged cover run (seed 1).
//   C1. Pitch direction, deterministic in-page test (flight model).
//   C2. Key-mapping test: real keydown events -> input.pitch()/roll(),
//      proving W climbs and S dives after the v15 swap (input.js only).
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8907;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- A. Ring clearance, seeds 1-3 ----------
  for (const seed of [1, 2, 3]) {
    await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=' + seed, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    const clearances = await page.evaluate(() => {
      const { course, terrain } = window.__debug;
      return course.rings.map((ring) => {
        let maxGround = -Infinity;
        for (let k = 0; k < 8; k += 1) {
          const a = (k / 8) * Math.PI * 2;
          maxGround = Math.max(maxGround, terrain.meshHeight(ring.x + Math.cos(a) * 13, ring.z + Math.sin(a) * 13));
        }
        maxGround = Math.max(maxGround, terrain.meshHeight(ring.x, ring.z));
        return Math.round((ring.y - 13 - maxGround) * 10) / 10;
      });
    });
    console.log('clearance seed', seed, JSON.stringify(clearances), 'min', Math.min(...clearances));
  }

  // ---------- B. Full-run sim, seeds 1-12 ----------
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=' + seed, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    const result = await page.evaluate((sd) => {
      const D = window.__debug;
      const { flight, course, terrain, rivals, effects } = D;
      const autopilotTo = window.__autopilotTo;
      window.__raceEvents.length = 0;
      flight.reset(course.spawn);
      course.reset();
      rivals.reset();
      effects.clear();
      const events = [];
      let visibleSeconds = 0;
      let landed = false;
      let crashed = false;
      let halvesAtBlast = null;
      const STEP = 1 / 60;
      const maxSteps = 120 * 60;
      for (let i = 0; i < maxSteps; i += 1) {
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
        if (ev & 2) landed = true;
        if (ev & 1) crashed = true;
        rivals.update(STEP, t, flight, course, terrain.groundAt, course.runway, null, null,
          (kind, detail) => {
            window.__raceEvents.push({ kind, time: t, ...detail });
            events.push({ kind, time: Math.round(t * 10) / 10, x: Math.round(detail.x), y: Math.round(detail.y), z: Math.round(detail.z) });
          });
        effects.update(STEP);
        if (i % 60 === 59) {
          const fx = Math.sin(s.yaw);
          const fz = -Math.cos(s.yaw);
          let anyAhead = false;
          for (const r of rivals.debug()) {
            if (!r.visible) continue;
            const dx = r.x - s.x;
            const dy = r.y - s.y;
            const dz = r.z - s.z;
            const dist = Math.hypot(dx, dy, dz);
            const along = dx * fx + dz * fz;
            const ang = Math.atan2(Math.hypot(dx - fx * along, dz - fz * along), along);
            if (along > 0 && Math.abs(ang) < 0.61 && dist < 1500) anyAhead = true;
          }
          if (anyAhead) visibleSeconds += 1;
        }
        if (events.length > 0 && halvesAtBlast === null && t >= events[0].time + 1) {
          const blast = events[0];
          let count = 0;
          for (const child of window.__scene.children) {
            if (child.type !== 'Group') continue;
            const d = Math.hypot(child.position.x - blast.x, child.position.y - blast.y, child.position.z - blast.z);
            if (d < 150) count += 1;
          }
          halvesAtBlast = count;
        }
      }
      const s = flight.state;
      return {
        seed: sd, rings: s.ringsPassed, landed, crashed, score: s.score,
        time: Math.round(s.elapsed * 10) / 10, status: s.status,
        events, visSeconds: visibleSeconds, halvesAtBlast,
      };
    }, seed);
    console.log('sim seed', seed, JSON.stringify(result));
  }

  // ---------- B2. Collision geometry from the staged cover run (seed 1) ----------
  await page.goto('http://localhost:' + PORT + '/index.html?shot=play&seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
  const coverRace = await page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    return {
      events: window.__raceEvents,
      player: { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z), yaw: Math.round(s.yaw * 100) / 100, rings: s.ringsPassed, time: Math.round(s.elapsed * 10) / 10 },
      rivals: D.rivals.debug(),
    };
  });
  console.log('cover race', JSON.stringify(coverRace));

  // ---------- C1. Pitch/roll direction, deterministic in-page test ----------
  await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
  const pitchTest = await page.evaluate(() => {
    const D = window.__debug;
    const { flight, course, terrain } = D;
    const STEP = 1 / 60;
    function run(input, seconds) {
      flight.reset(course.spawn);
      const s = flight.state;
      s.y = 400;
      const y0 = s.y;
      const yaw0 = s.yaw;
      for (let i = 0; i < seconds * 60; i += 1) {
        flight.step(STEP, input, terrain.groundAt, course.runway);
      }
      return { dy: Math.round((s.y - y0) * 10) / 10, dyaw: Math.round((s.yaw - yaw0) * 100) / 100 };
    }
    return {
      pitchMinus1: run({ pitch: -1, roll: 0, yaw: 0, throttle: 0 }, 2),
      pitchPlus1: run({ pitch: 1, roll: 0, yaw: 0, throttle: 0 }, 2),
      rollPlus1: run({ pitch: 0, roll: 1, yaw: 0, throttle: 0 }, 1),
      rollMinus1: run({ pitch: 0, roll: -1, yaw: 0, throttle: 0 }, 1),
    };
  });
  console.log('pitch test', JSON.stringify(pitchTest));
  // v15: the MODEL is unchanged (flight.js untouched) — input +1 still
  // climbs, -1 still dives. What changed is the KEY mapping (input.js):
  // W now gives +1, S gives -1. The key test below proves the mapping.
  console.log('model verdict: input -1 climbs?', pitchTest.pitchMinus1.dy > 2, 'input +1 climbs?', pitchTest.pitchPlus1.dy > 2);

  // ---------- C2. Key-mapping test: real keydown events -> pitch()/roll() ----------
  // The live game (no ?shot) runs runGame, so window.__debug.input exists.
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.input, null, { timeout: 30000 });
  const keyTest = await page.evaluate(() => {
    const input = window.__debug.input;
    const out = {};
    const press = (code) => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      const r = { pitch: input.pitch(), roll: input.roll() };
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      return r;
    };
    out.W = press('KeyW');
    out.S = press('KeyS');
    out.A = press('KeyA');
    out.D = press('KeyD');
    out.Up = press('ArrowUp');
    out.Down = press('ArrowDown');
    out.none = { pitch: input.pitch(), roll: input.roll() };
    return out;
  });
  console.log('key test', JSON.stringify(keyTest));
  console.log('key verdict: W climbs?', keyTest.W.pitch === 1, 'S dives?', keyTest.S.pitch === -1,
    'D rolls right?', keyTest.D.roll === 1, 'A rolls left?', keyTest.A.roll === -1);
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
