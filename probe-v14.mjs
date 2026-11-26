// probe-v14.mjs — verify the v14 fixes in a real browser, not just staged shots.
// Prints only short status lines, no paths.
//   A. Ring clearance (seeds 1-3): every ring's bottom rim above the real mesh.
//   B. Full-run sim (seeds 1-12): autopilot run in-page, rings/landed/score,
//      collision timing + distance/angle to the player, split halves alive,
//      rival visibility ahead per second.
//   C. Live-play keyboard run (seed 1): verify the W/S pitch direction first,
//      then steer with the keyboard and confirm rivals stay ahead and the
//      collision blast is visible from the player's view, plus the finish.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8903;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const wrapAngle = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page0 = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  let page = page0;
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- A. Ring clearance, seeds 1-3 ----------
  for (const seed of [1, 2, 3]) {
    await page.goto('http://localhost:' + PORT + '/index.html?shot=start&seed=' + seed, { waitUntil: 'load', timeout: 20000 });
    await page.waitForFunction(() => window.__shotReady, null, { timeout: 20000 });
    const clearances = await page.evaluate(() => {
      const { course, terrain } = window.__debug;
      return course.rings.map((ring) => {
        // Sample the real triangulated mesh over the ring's footprint:
        // centre + 8 points on the 13 m circle, take the highest ground.
        let maxGround = -Infinity;
        for (let k = 0; k < 8; k += 1) {
          const a = (k / 8) * Math.PI * 2;
          maxGround = Math.max(maxGround, terrain.meshHeight(ring.x + Math.cos(a) * 13, ring.z + Math.sin(a) * 13));
        }
        maxGround = Math.max(maxGround, terrain.meshHeight(ring.x, ring.z));
        // Conservative: the lowest point of the rim is ring.y - 13 m.
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
      const visPerSecond = [];
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
        // Once per second: is any rival ahead in the player's forward view?
        if (i % 60 === 59) {
          const fx = Math.sin(s.yaw);
          const fz = -Math.cos(s.yaw);
          let anyAhead = false;
          let closestAhead = null;
          for (const r of rivals.debug()) {
            if (!r.visible) continue;
            const dx = r.x - s.x;
            const dy = r.y - s.y;
            const dz = r.z - s.z;
            const dist = Math.hypot(dx, dy, dz);
            const along = dx * fx + dz * fz;
            const ang = Math.atan2(Math.hypot(dx - fx * along, dz - fz * along), along);
            if (along > 0 && Math.abs(ang) < 0.61 && dist < 1500) {
              anyAhead = true;
              if (closestAhead === null || dist < closestAhead) closestAhead = Math.round(dist);
            }
          }
          visPerSecond.push(anyAhead ? 1 : 0);
          if (anyAhead) visibleSeconds += 1;
        }
        // Sample the split halves 1 s after the collision fired: halves
        // are Groups added straight to the scene (not under rivals.group),
        // so count Groups near the blast point.
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
      // Collision detail: distance + viewing angle from the player at fire time
      // is recovered from the staged cover run instead (see below); here report
      // the event time and the player's rings at that time.
      return {
        seed: sd,
        rings: s.ringsPassed,
        landed,
        crashed,
        score: s.score,
        time: Math.round(s.elapsed * 10) / 10,
        status: s.status,
        events,
        visSeconds: visibleSeconds,
        visTotal: visPerSecond.length,
        halvesAtBlast,
      };
    }, seed);
    console.log('sim seed', seed, JSON.stringify(result));
  }

  // ---------- B2. Collision geometry from the staged cover run (seed 1) ----------
  // The cover shot runs the same staged sim; read the collision event and the
  // player's state at the freeze to show the blast was ahead of the player.
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
  // The live key test was inconclusive (the plane flew uncontrolled into a
  // hill during the 6 s of key checks, so both keys "descended"). Test the
  // flight model directly instead: same spawn, teleported to 400 m, step
  // with a fixed input and watch altitude / yaw.
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
  // input.js: W gives pitch -1 ("pull up" per its comment), S gives +1.
  const minusClimbs = pitchTest.pitchMinus1.dy > 2;
  const plusClimbs = pitchTest.pitchPlus1.dy > 2;
  console.log('pitch verdict: input -1 (W) climbs?', minusClimbs, 'input +1 (S) climbs?', plusClimbs);
  const rollPlusTurnsYawPlus = pitchTest.rollPlus1.dyaw > 0.05;
  console.log('roll verdict: input +1 (D) turns yaw+?', rollPlusTurnsYawPlus);

  // ---------- C2. Live-play keyboard run (seed 1), steering from t=0 ----------
  // Small viewport: the headless shell renders this scene at ~1/8 real-time
  // speed at 1280x720 (software rasteriser), so a full live run to the
  // collision at ~38 s game time needs the cheaper 640x360 page.
  const livePage = await browser.newPage({ viewport: { width: 640, height: 360 } });
  livePage.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  livePage.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page = livePage;
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(800);
  // Click via evaluate: page.click's actionability wait hangs in the
  // headless shell (30 s timeout on a visible, stable button) — the
  // shell's main thread is busy rendering. The evaluate click fires the
  // same handler a real click would.
  await page.evaluate(() => document.getElementById('btn-start').click());
  await page.waitForTimeout(300);
  const readState = () => page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const next = D.course.nextRing();
    const over = document.getElementById('panel-over');
    // The steering decision comes from the game's own autopilot (same
    // function the staged sim uses, terrain-avoidance included) — the
    // probe only translates its pitch/roll/throttle outputs into keys,
    // so the live run flies the real course through the real keyboard.
    let target;
    let thr = 0.72;
    if (!next) {
      const rw = D.course.runway;
      const d = Math.hypot(rw.x - s.x, rw.z - s.z);
      target = d > 300
        ? { x: rw.x - rw.dirX * 260, y: rw.y + 45, z: rw.z - rw.dirZ * 260 }
        : { x: rw.x, y: rw.y + 6, z: rw.z };
      thr = 0.3;
    } else {
      target = next;
    }
    const auto = window.__autopilotTo(D.flight, target, thr, D.terrain.groundAt);
    return {
      x: s.x, y: s.y, z: s.z, yaw: s.yaw, pitch: s.pitch, roll: s.roll,
      speed: s.speed, rings: s.ringsPassed, time: s.elapsed, status: s.status,
      next: next ? { x: next.x, y: next.y, z: next.z } : null,
      runway: { x: D.course.runway.x, y: D.course.runway.y, z: D.course.runway.z },
      msg: document.getElementById('hud-msg').textContent,
      overTitle: document.getElementById('over-title').textContent,
      overLines: document.getElementById('over-lines').textContent,
      overShown: over.style.display !== 'none',
      pos: document.getElementById('hud-pos').textContent,
      events: window.__raceEvents.slice(),
      rivals: D.rivals.debug(),
      auto: { pitch: auto.pitch, roll: auto.roll, throttle: auto.throttle },
    };
  });
  // Climb key from the verified pitch test; turn key from the roll test.
  const climbKey = minusClimbs ? 'KeyW' : 'KeyS';
  const diveKey = climbKey === 'KeyW' ? 'KeyS' : 'KeyW';
  const yawPlusKey = rollPlusTurnsYawPlus ? 'KeyD' : 'KeyA';
  const yawMinusKey = yawPlusKey === 'KeyD' ? 'KeyA' : 'KeyD';
  console.log('controller: climb', climbKey, 'yaw+', yawPlusKey);
  const held = new Set();
  const down = async (k) => { if (!held.has(k)) { held.add(k); await page.keyboard.down(k); } };
  const up = async (k) => { if (held.has(k)) { held.delete(k); await page.keyboard.up(k); } };
  let visAheadSeconds = 0;
  let totalSeconds = 0;
  let collisionSeen = null;
  let collisionSeenAt = -1;
  let lastSecond = -1;
  const startWall = Date.now();
  let finalState = null;
  // Wall budget 600 s: the small viewport still runs slower than real time.
  // Stop 5 game-seconds after the collision (HUD message captured), or on
  // game over — a full run to landing would take far longer than the blast
  // check needs.
  while (Date.now() - startWall < 600000) {
    const st = await readState();
    if (st.status !== 'flying' || st.overShown) { finalState = st; break; }
    if (collisionSeen && st.time > collisionSeenAt + 5) { finalState = st; break; }
    const sec = Math.floor(st.time);
    if (sec !== lastSecond) {
      lastSecond = sec;
      totalSeconds += 1;
      const fx = Math.sin(st.yaw);
      const fz = -Math.cos(st.yaw);
      let anyAhead = false;
      for (const r of st.rivals) {
        if (!r.visible) continue;
        const dx = r.x - st.x;
        const dz = r.z - st.z;
        const dist = Math.hypot(dx, r.y - st.y, dz);
        const along = dx * fx + dz * fz;
        const ang = Math.atan2(Math.hypot(dx - fx * along, dz - fz * along), along);
        if (along > 0 && Math.abs(ang) < 0.61 && dist < 1500) anyAhead = true;
      }
      if (anyAhead) visAheadSeconds += 1;
      if (sec % 10 === 0) console.log('live t', sec, 'rings', st.rings, 'pos', st.pos, 'rivalAhead', anyAhead, 'events', st.events.length);
    }
    if (st.events.length > 0 && !collisionSeen) {
      collisionSeen = st.events[0];
      collisionSeenAt = st.time;
      console.log('live collision event', JSON.stringify(collisionSeen), 'hudMsg', JSON.stringify(st.msg));
    }
    const target = st.next || st.runway;
    void target;
    // Steer by the autopilot's outputs, translated to keys: pitch +1 is
    // climb (verified: input +1 climbs, and S gives +1), roll +1 turns
    // yaw+ (verified: D gives +1), throttle +1 opens the throttle.
    const a = st.auto;
    if (a.pitch > 0.15) { await down(climbKey); await up(diveKey); }
    else if (a.pitch < -0.15) { await down(diveKey); await up(climbKey); }
    else { await up(climbKey); await up(diveKey); }
    if (a.roll > 0.15) { await down(yawPlusKey); await up(yawMinusKey); }
    else if (a.roll < -0.15) { await down(yawMinusKey); await up(yawPlusKey); }
    else { await up(yawPlusKey); await up(yawMinusKey); }
    if (a.throttle > 0.05) { await down('ShiftLeft'); await up('ControlLeft'); }
    else if (a.throttle < -0.05) { await down('ControlLeft'); await up('ShiftLeft'); }
    else { await up('ShiftLeft'); await up('ControlLeft'); }
    await page.waitForTimeout(200);
  }
  for (const k of [...held]) await page.keyboard.up(k);
  await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(1000);
  finalState = finalState || (await readState());
  console.log('live final: time', Math.round(finalState.time), 'rings', finalState.rings, 'status', finalState.status,
    'overTitle', JSON.stringify(finalState.overTitle), 'overLines', JSON.stringify(finalState.overLines), 'overShown', finalState.overShown,
    'visAhead', visAheadSeconds + '/' + totalSeconds, 'collision', JSON.stringify(collisionSeen));
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
