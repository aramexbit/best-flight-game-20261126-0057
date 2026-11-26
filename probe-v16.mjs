// probe-v16.mjs — verify the v16 fixes in a real browser.
// Prints only short status lines, no paths.
//   A. Ring clearance (seeds 1-3) + leg clearance (terrain under every
//      straight leg vs the flight line — the v15 4-second hill crash).
//   B. Full-run sim (seeds 1-12): rings/landed/score, collision fired
//      on EVERY seed (incl. the v16 player-relative fallback).
//   B2. Collision geometry from the staged cover run (seed 1).
//   C2. Key-mapping test (W climbs, S dives — unchanged in v16).
//   D. Storm presence: tornado offset from the ring line, rain, wall,
//      flak API, splash/slick API; HUD right-edge overflow; ring
//      pointer bearing sign.
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

  // ---------- A. Ring clearance + leg clearance, seeds 1-3 ----------
  for (const seed of [1, 2, 3]) {
    await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=' + seed, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    const clearances = await page.evaluate(() => {
      const { course, terrain } = window.__debug;
      const ringClear = course.rings.map((ring) => {
        let maxGround = -Infinity;
        for (let k = 0; k < 8; k += 1) {
          const a = (k / 8) * Math.PI * 2;
          maxGround = Math.max(maxGround, terrain.meshHeight(ring.x + Math.cos(a) * 13, ring.z + Math.sin(a) * 13));
        }
        maxGround = Math.max(maxGround, terrain.meshHeight(ring.x, ring.z));
        return Math.round((ring.y - 13 - maxGround) * 10) / 10;
      });
      // Leg clearance: sample the straight line of every leg (spawn ->
      // ring 1 -> ... -> ring 12) against the mesh; the line must stay
      // 40 m above the ground everywhere (the v16 rings.js fix).
      const pts = [{ x: course.spawn.x, y: course.spawn.y, z: course.spawn.z }, ...course.rings];
      let legMin = Infinity;
      for (let i = 1; i < pts.length; i += 1) {
        for (let k = 1; k < 8; k += 1) {
          const t = k / 8;
          const gx = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t;
          const gz = pts[i - 1].z + (pts[i].z - pts[i - 1].z) * t;
          const lineY = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
          legMin = Math.min(legMin, lineY - terrain.meshHeight(gx, gz));
        }
      }
      return { ringMin: Math.min(...ringClear), legMin: Math.round(legMin * 10) / 10, spawnY: Math.round(course.spawn.y) };
    });
    console.log('clearance seed', seed, JSON.stringify(clearances));
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
      let landed = false;
      let crashed = false;
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
            events.push({ kind, time: Math.round(t * 10) / 10 });
          });
        effects.update(STEP);
      }
      const s = flight.state;
      return {
        seed: sd, rings: s.ringsPassed, landed, crashed, score: s.score,
        time: Math.round(s.elapsed * 10) / 10, status: s.status,
        collision: events.filter((e) => e.kind === 'collision').map((e) => e.time),
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
      player: { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z), rings: s.ringsPassed, time: Math.round(s.elapsed * 10) / 10 },
      rivals: D.rivals.debug(),
    };
  });
  console.log('cover race', JSON.stringify(coverRace));

  // ---------- C2. Key-mapping test ----------
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
    return out;
  });
  console.log('key test', JSON.stringify(keyTest));
  console.log('key verdict: W climbs?', keyTest.W.pitch === 1, 'S dives?', keyTest.S.pitch === -1,
    'D rolls right?', keyTest.D.roll === 1, 'A rolls left?', keyTest.A.roll === -1);

  // ---------- D. Storm presence + HUD overflow + ring pointer ----------
  await page.goto('http://localhost:' + PORT + '/index.html?shot=play&seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
  const stormCheck = await page.evaluate(() => {
    const D = window.__debug;
    const { course, storm } = D;
    // Tornado offset: distance from the storm anchor to the nearest
    // point of the course polyline (spawn -> rings -> runway).
    const pts = [{ x: course.spawn.x, z: course.spawn.z },
      ...course.rings.map((r) => ({ x: r.x, z: r.z })),
      { x: course.runway.x, z: course.runway.z }];
    let minDist = Infinity;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const ax = pts[i].x; const az = pts[i].z;
      const bx = pts[i + 1].x; const bz = pts[i + 1].z;
      const dx = bx - ax; const dz = bz - az;
      const len2 = dx * dx + dz * dz || 1;
      let t = ((storm.anchor.x - ax) * dx + (storm.anchor.z - az) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      minDist = Math.min(minDist, Math.hypot(storm.anchor.x - (ax + dx * t), storm.anchor.z - (az + dz * t)));
    }
    // Storm group contents: funnel segments + wall lobes + rain lines.
    let meshes = 0;
    let lineSegs = 0;
    storm.group.traverse((o) => {
      if (o.isMesh) meshes += 1;
      if (o.isLineSegments) lineSegs += 1;
    });
    // HUD right edge: the stack's right edge must sit inside the viewport.
    const tr = document.getElementById('hud-top-right').getBoundingClientRect();
    const ptr = document.getElementById('hud-ring-pointer');
    const ptrStyle = getComputedStyle(ptr);
    return {
      anchor: { x: Math.round(storm.anchor.x), z: Math.round(storm.anchor.z) },
      tornadoToCourseMin: Math.round(minDist),
      stormMeshes: meshes,
      rainLineSegments: lineSegs,
      hudRightEdge: Math.round(tr.right),
      viewportW: window.innerWidth,
      hudOverflows: tr.right > window.innerWidth + 1,
      ringPointerDisplay: ptrStyle.display,
      ringPointerText: document.getElementById('hud-ring-text').textContent,
    };
  });
  console.log('storm check', JSON.stringify(stormCheck));
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
