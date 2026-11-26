// probe-v16-live.mjs — live-play proof for v16: (A) the mid-air blast
// visible on screen while flying with KEYBOARD input only (autopilot
// logic translated to W/S/A/D/Shift key presses, like a human player);
// (A2) the v16 player-relative blast: fly STRAIGHT with no ring
// steering at all (only a pull-up when a hill looms, like a human),
// the collision must still come to the player after 55 s;
// (B) the finish sequence end-to-end; (C) five shadow meshes;
// (D) camera-forward at start, spawn leg clearance, HUD overflow,
// ring pointer. Prints short status lines.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const PORT = 8910;
const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: GAME_DIR, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const errors = [];
let browser;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- keyboard autopilot, IN-PAGE driver: the CDP polling controller
// reacted once per ~1-2 s of game time (headless software rendering
// runs the game at ~0.6x real time and each evaluate round-trips ~1 s),
// so the plane banked hard and orbited — it never passed ring 1 in
// 90 s (live probe run 2: NO BLAST). A 100 ms in-page interval reads
// the same __autopilotTo the sim uses and dispatches real
// KeyboardEvents (code-based, no isTrusted check in input.js) through
// the game's own key handlers — the game cannot tell them from a
// physical keyboard, and the control loop is ~20x faster. The probe
// loop below only POLLS state (2 Hz) and never touches keys.
const DRIVER_SRC = `
window.__kbDrive = (mode) => {
  if (window.__kbTimer) clearInterval(window.__kbTimer);
  window.__kbMode = mode;
  const held = new Set();
  const setKey = (code, down) => {
    if (down && !held.has(code)) { held.add(code); window.dispatchEvent(new KeyboardEvent('keydown', { code })); }
    if (!down && held.has(code)) { held.delete(code); window.dispatchEvent(new KeyboardEvent('keyup', { code })); }
  };
  window.__kbSetKey = setKey;
  window.__kbHeld = held;
  // Sigma-delta PWM for the REGULATOR modes ('straight', 'land') only.
  // The ring mode stays binary (run 6: 9 rings) — PWM there orbited the
  // ring (run 5). Regulators need proportional control: a heading error
  // of 5° wants a gentle bank, not full deflection.
  const acc = { pitch: 0, roll: 0 };
  const pwm = (axis, value) => {
    acc[axis] += value;
    if (acc[axis] >= 0.5) { acc[axis] -= 1; return 1; }
    if (acc[axis] <= -0.5) { acc[axis] += 1; return -1; }
    return 0;
  };
  window.__kbTimer = setInterval(() => {
    const D = window.__debug;
    if (!D) return;
    const s = D.flight.state;
    if (s.status !== 'flying') { for (const c of [...held]) setKey(c, false); return; }
    if (window.__kbMode === 'straight') {
      // NO ring steering: HEADING-HOLD + ALTITUDE-HOLD on the spawn
      // heading (proportional, PWM'd) + BANK-LEVELLING. The fixed-target
      // pursuit spiralled (run 6: 3.4 left turns, roll -1.35) and the
      // heading-only hold still departed into a spiral dive (run 7:
      // crash 52.8 s, roll -1.16) — once banked steeply the plane loses
      // lift, pitch-up only tightens the turn, and the heading loop
      // cannot recover it. The roll input now levels the wings FIRST
      // (-roll*2) and steers the heading second (herr*1.0), so a bank
      // can never build. Target 200 m (not 149): a 50 m margin over
      // the course terrain, plus a climb override when a hill looms.
      const sp = D.course.spawn;
      let herr = sp.yaw - s.yaw;
      herr = Math.atan2(Math.sin(herr), Math.cos(herr));
      const r = pwm('roll', Math.max(-1, Math.min(1, -s.roll * 2 + herr * 1.0)));
      setKey('KeyD', r > 0); setKey('KeyA', r < 0);
      const aheadX = s.x + Math.sin(s.yaw) * 220;
      const aheadZ = s.z - Math.cos(s.yaw) * 220;
      const groundAhead = D.terrain.groundAt(aheadX, aheadZ);
      const climbHill = groundAhead + 60 > s.y;
      const altErr = 200 - s.y;
      const p = pwm('pitch', Math.max(-1, Math.min(1, altErr * 0.05)));
      setKey('KeyW', climbHill || p > 0);
      setKey('KeyS', !climbHill && p < 0);
      setKey('ShiftLeft', true);
      setKey('ControlLeft', false);
      return;
    }
    if (window.__kbMode === 'land') {
      // VERTICAL-SPEED-HOLD + HEADING-HOLD to the runway centre. The
      // pursuit autopilot porpoised on final (run 3-5: vs ±30-44 m/s)
      // and the slow CDP controller crashed (run 6: 6 s) — a position
      // pursuit overshoots the glidepath with binary keys. A regulator
      // holds a gentle descent (-5 m/s, flare -1.5 below 15 m AGL) and
      // steers at the runway centre. Throttle comes from autopilotTo.
      const rw = D.course.runway;
      const g = D.terrain.groundAt(s.x, s.z);
      const agl = s.y - g;
      const d = Math.hypot(rw.x - s.x, rw.z - s.z);
      const targetVS = agl < 15 ? -1.5 : (d > 300 ? -4 : -6);
      const vsErr = targetVS - (s.verticalSpeed || 0);
      const p = pwm('pitch', Math.max(-1, Math.min(1, vsErr * 0.08)));
      setKey('KeyW', p > 0); setKey('KeyS', p < 0);
      // v16 (fix, run 7): steer at a point 500 m BEYOND the runway
      // centre along the runway direction, not at the centre itself.
      // Steering at the centre makes the bearing hypersensitive at
      // close range — the plane drifted 85 m off centreline, the
      // heading error blew up, it banked hard right (roll 1.35) at
      // AGL 7 and struck the ground beside the strip. A distant point
      // keeps the bearing stable all the way down.
      const farX = rw.x + rw.dirX * 500;
      const farZ = rw.z + rw.dirZ * 500;
      const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
      let herr = targetYaw - s.yaw;
      herr = Math.atan2(Math.sin(herr), Math.cos(herr));
      const r = pwm('roll', Math.max(-1, Math.min(1, herr * 1.5)));
      setKey('KeyD', r > 0); setKey('KeyA', r < 0);
      const input = window.__autopilotTo(D.flight, { x: rw.x, y: rw.height + 6, z: rw.z }, 0.3, D.terrain.groundAt);
      setKey('ShiftLeft', input.throttle > 0.65);
      setKey('ControlLeft', input.throttle < 0.35);
      return;
    }
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
    // v16: BINARY keys (run 4). PWM (run 5) made the plane settle into
    // a stable orbit around the next ring instead of flying through it.
    setKey('KeyW', input.pitch > 0.1);
    setKey('KeyS', input.pitch < -0.1);
    setKey('KeyD', input.roll > 0.1);
    setKey('KeyA', input.roll < -0.1);
    setKey('ShiftLeft', input.throttle > 0.65);
    setKey('ControlLeft', input.throttle < 0.35);
  }, 250);
  // v16 (fix, live probe run 3): 100 ms made the binary keys chatter at
  // ~16 Hz and the plane porpoised ±30 m/s on final, never landing
  // (Phase B TIMEOUT). The v15 CDP controller that landed in 9.13 s ran
  // at ~4 Hz — a slower key decision lets the airframe respond instead
  // of chasing the input. 250 ms keeps the ring flying (the in-page
  // driver has no evaluate round-trip, unlike the CDP controller).
};
window.__kbStop = () => {
  if (window.__kbTimer) { clearInterval(window.__kbTimer); window.__kbTimer = null; }
  if (window.__kbHeld) { for (const c of [...window.__kbHeld]) window.__kbSetKey(c, false); }
};
`;
async function startDriver(page, mode) {
  await page.evaluate(DRIVER_SRC);
  await page.evaluate((m) => window.__kbDrive(m), mode);
}
async function stopDriver(page) {
  await page.evaluate(() => window.__kbStop && window.__kbStop()).catch(() => {});
}
// One evaluate per poll: state + collision event + over-panel flags.
async function pollState(page) {
  return page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const txt = document.body.innerText;
    return { elapsed: s.elapsed, rings: s.ringsPassed, status: s.status,
      speed: s.speed, x: s.x, y: s.y, z: s.z, yaw: s.yaw, roll: s.roll,
      ev: window.__raceEvents.find((e) => e.kind === 'collision') || null,
      raceComplete: txt.includes('RACE COMPLETE'), landed: txt.includes('Landed!'),
      crashed: txt.includes('Crashed!') };
  }).catch(() => null);
}

try {
  browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // ---------- PHASE D (first, on the live page): camera forward, spawn clearance, HUD ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  const spawnCheck = await page.evaluate(() => {
    const D = window.__debug;
    const { course, terrain } = D;
    // Terrain under the first 400 m of the spawn heading vs spawn height.
    const s = course.spawn;
    let minClear = Infinity;
    for (let d = 0; d <= 400; d += 20) {
      const gx = s.x + Math.sin(s.yaw) * d;
      const gz = s.z - Math.cos(s.yaw) * d;
      minClear = Math.min(minClear, s.y - terrain.meshHeight(gx, gz));
    }
    return { spawnY: Math.round(s.y), headingDeg: Math.round(((s.yaw * 180 / Math.PI) % 360 + 360) % 360),
      minClearAhead400: Math.round(minClear * 10) / 10, ring1Dist: Math.round(course.distanceToNext(s.x, s.y, s.z)) };
  });
  console.log('phase D spawn check', JSON.stringify(spawnCheck));
  await page.keyboard.press('Space');
  await sleep(700);
  // Camera-forward check: the player plane must be seen FROM BEHIND
  // (tail + fin toward the camera) with the next ring ahead of it.
  await page.screenshot({ path: '/tmp/v16-live-start.jpg', type: 'jpeg', quality: 80 });
  const hudCheck = await page.evaluate(() => {
    const tr = document.getElementById('hud-top-right').getBoundingClientRect();
    const ptr = document.getElementById('hud-ring-pointer');
    return {
      hudRightEdge: Math.round(tr.right), viewportW: window.innerWidth,
      hudOverflows: tr.right > window.innerWidth + 1,
      ringPointerDisplay: getComputedStyle(ptr).display,
      ringPointerText: document.getElementById('hud-ring-text').textContent,
      ringPointerArrow: document.getElementById('hud-ring-arrow').style.transform,
      canvasFocused: document.activeElement && document.activeElement.id === 'game',
    };
  });
  console.log('phase D hud check', JSON.stringify(hudCheck));

  // ---------- PHASE A: fly with keys until the mid-air collision ----------
  await startDriver(page, 'ring');
  let blast = null;
  let lastState = null;
  for (let i = 0; i < 300; i += 1) {
    lastState = await pollState(page);
    if (!lastState) break;
    if (lastState.ev) { blast = lastState.ev; break; }
    if (lastState.status !== 'flying') break;
    if (lastState.elapsed > 75) break;
    // v16 (diag, live probe run 3): log the collision pair's state so a
    // no-blast run can be told apart (pair still converging vs holding
    // with the player out of the fire window vs orbit too wide).
    if (i % 20 === 0) {
      const d = await page.evaluate(() => {
        try {
          const D = window.__debug;
          const s = D.flight.state;
          const fx = Math.sin(s.yaw); const fz = -Math.cos(s.yaw);
          const out = { t: +s.elapsed.toFixed(1), rings: s.ringsPassed,
            px: Math.round(s.x), py: Math.round(s.y), pz: Math.round(s.z) };
          // v16: rivals is an OBJECT with debug(), not an array (run 4
          // diag failed with "D.rivals.find is not a function").
          const dbg = D.rivals.debug();
          const k = dbg.find((r) => r.name === 'KUNING');
          const h = dbg.find((r) => r.name === 'HIJAU');
          for (const [nm, r] of [['K', k], ['H', h]]) {
            if (!r) { out[nm] = null; continue; }
            const mp = r.meetPoint;
            out[nm] = { st: r.state,
              dMeet: mp ? Math.round(Math.hypot(r.x - mp.x, r.y - mp.y, r.z - mp.z)) : null,
              mp: mp ? { x: Math.round(mp.x), y: Math.round(mp.y), z: Math.round(mp.z) } : null };
          }
          if (k && h && k.meetPoint) {
            const mx = (k.x + h.x) / 2; const mz = (k.z + h.z) / 2;
            const bd = Math.hypot(mx - s.x, k.y - s.y, mz - s.z);
            out.pDist = Math.round(Math.hypot(s.x - k.meetPoint.x, s.y - k.meetPoint.y, s.z - k.meetPoint.z));
            out.bDist = Math.round(bd);
            out.face = bd > 0.01 ? +(((mx - s.x) * fx + (mz - s.z) * fz) / bd).toFixed(2) : -1;
          }
          return out;
        } catch (e) { return { err: String(e && e.message || e) }; }
      }).catch(() => null);
      if (d) console.log('phase A pair diag ' + JSON.stringify(d));
    }
    await sleep(500);
  }
  await stopDriver(page);
  if (blast) {
    console.log('phase A blast event t=' + blast.time.toFixed(1) + ' at (' + Math.round(blast.x) + ',' + Math.round(blast.y) + ',' + Math.round(blast.z) + ') player rings=' + (lastState ? lastState.rings : '?'));
    // v16 (fix): screenshot IMMEDIATELY — the fireball's bright phase
    // is ~2.8 s and the keyboard player turns fast, so waiting for
    // blast+1.5 s overshot to +4.2 s in the first run (fireball gone,
    // blast out of frame). Capture the moment first, then the +1.5 s
    // frame for the record.
    const atFire = await page.evaluate((b) => {
      const D = window.__debug;
      const s = D.flight.state;
      const dx = b.x - s.x; const dy = b.y - s.y; const dz = b.z - s.z;
      const dist = Math.hypot(dx, dy, dz);
      const fx = Math.sin(s.yaw); const fz = -Math.cos(s.yaw);
      const facing = dist > 0.01 ? (dx * fx + dz * fz) / dist : -1;
      return { elapsed: +s.elapsed.toFixed(1), rings: s.ringsPassed,
        blastDist: Math.round(dist), facing: +facing.toFixed(2),
        x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z) };
    }, blast);
    await page.screenshot({ path: '/tmp/v16-live-blast.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A shot immediate: ' + JSON.stringify(atFire));
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
    await page.screenshot({ path: '/tmp/v16-live-blast-15.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A shot +1.5s: elapsed=' + hud.elapsed.toFixed(1) + ' rings=' + hud.rings + ' hudMsg=' + JSON.stringify(hud.msg) + ' bodyHasCollisionText=' + hud.body);
  } else {
    console.log('phase A NO BLAST: lastState=' + JSON.stringify(lastState) + ' events=' + await page.evaluate(() => JSON.stringify(window.__raceEvents)));
  }

  // ---------- PHASE A2: straight flight, no ring steering ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await startDriver(page, 'straight');
  let blast2 = null;
  let last2 = null;
  for (let i = 0; i < 300; i += 1) {
    last2 = await pollState(page);
    if (!last2) break;
    if (last2.ev) { blast2 = last2.ev; break; }
    if (last2.status !== 'flying') break;
    if (last2.elapsed > 75) break;
    await sleep(500);
  }
  await stopDriver(page);
  if (blast2) {
    const offCourse = await page.evaluate((b) => {
      const D = window.__debug;
      const s = D.flight.state;
      const pts = [{ x: D.course.spawn.x, z: D.course.spawn.z },
        ...D.course.rings.map((r) => ({ x: r.x, z: r.z }))];
      let minD = Infinity;
      for (let i = 0; i < pts.length - 1; i += 1) {
        const ax = pts[i].x; const az = pts[i].z;
        const bx = pts[i + 1].x; const bz = pts[i + 1].z;
        const dx = bx - ax; const dz = bz - az;
        const len2 = dx * dx + dz * dz || 1;
        let t = ((s.x - ax) * dx + (s.z - az) * dz) / len2;
        t = Math.max(0, Math.min(1, t));
        minD = Math.min(minD, Math.hypot(s.x - (ax + dx * t), s.z - (az + dz * t)));
      }
      return { offCourseM: Math.round(minD), rings: s.ringsPassed, elapsed: Math.round(s.elapsed * 10) / 10 };
    }, blast2);
    for (let i = 0; i < 60; i += 1) {
      const el = await page.evaluate(() => window.__debug.flight.state.elapsed);
      if (el >= blast2.time + 1.2) break;
      await sleep(100);
    }
    await page.screenshot({ path: '/tmp/v16-live-blast-straight.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A2 STRAIGHT blast t=' + blast2.time.toFixed(1) + ' ' + JSON.stringify(offCourse));
  } else {
    console.log('phase A2 NO BLAST: lastState=' + JSON.stringify(last2));
  }

  // ---------- PHASE C: five shadows in the live scene ----------
  const shadows = await page.evaluate(() => {
    const out = [];
    window.__scene.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.segments === 24
        && o.material && o.material.map && o.scale.x > 5) {
        const w = new o.position.constructor();
        o.getWorldPosition(w);
        out.push({ x: Math.round(w.x), y: Math.round(w.y), z: Math.round(w.z), vis: o.visible });
      }
    });
    return out;
  }).catch(() => []);
  console.log('phase C shadows: count=' + shadows.length + ' ' + JSON.stringify(shadows));

  // ---------- PHASE B: finish end-to-end (live page, no ?shot=) ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const tp = await page.evaluate(() => {
    const D = window.__debug;
    const rw = D.course.runway;
    const s = D.flight.state;
    s.x = rw.x - rw.dirX * 250;
    s.z = rw.z - rw.dirZ * 250;
    s.y = rw.height + 40;
    s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
    s.pitch = 0; s.roll = 0; s.speed = 40; s.verticalSpeed = 0;
    D.course.setProgress(12);
    s.ringsPassed = 12;
    return { x: Math.round(s.x), y: Math.round(s.y), z: Math.round(s.z), yaw: +s.yaw.toFixed(2), rings: s.ringsPassed };
  });
  console.log('phase B teleported to short final: ' + JSON.stringify(tp));
  await startDriver(page, 'land');
  let over = null;
  let lastB = null;
  for (let i = 0; i < 300; i += 1) {
    lastB = await pollState(page);
    if (!lastB) { over = 'poll lost'; break; }
    // v16 (diag): log altitude/speed/AGL every ~10 polls so a crash on
    // final can be told apart (terrain strike vs stall vs gust upset).
    if (i % 10 === 0) {
      const diag = await page.evaluate(() => {
        const D = window.__debug;
        const s = D.flight.state;
        const g = D.terrain.groundAt(s.x, s.z);
        return { t: +s.elapsed.toFixed(1), y: Math.round(s.y), agl: Math.round(s.y - g),
          spd: Math.round(s.speed), vs: +(s.verticalSpeed || 0).toFixed(1), status: s.status };
      }).catch(() => null);
      if (diag) console.log('phase B diag ' + JSON.stringify(diag));
    }
    if (lastB.raceComplete) { over = 'RACE COMPLETE'; break; }
    if (lastB.landed) { over = 'Landed (no race complete)'; break; }
    if (lastB.crashed) { over = 'Crashed'; break; }
    if (lastB.status !== 'flying') { over = 'status=' + lastB.status; break; }
    if (lastB.elapsed > 60) { over = 'TIMEOUT 60s'; break; }
    await sleep(500);
  }
  await stopDriver(page);
  console.log('phase B over=' + over + ' lastState=' + JSON.stringify(lastB));
  if (over === 'RACE COMPLETE') {
    await page.screenshot({ path: '/tmp/v16-live-finish-a.jpg', type: 'jpeg', quality: 80 });
    const panel = await page.evaluate(() => ({
      title: (document.querySelector('#over-title') || {}).textContent || '',
      lines: (document.querySelector('#over-lines') || {}).textContent || '',
    }));
    console.log('phase B panel: ' + JSON.stringify(panel));
    await sleep(2000);
    await page.screenshot({ path: '/tmp/v16-live-finish-b.jpg', type: 'jpeg', quality: 80 });
    console.log('phase B finish screenshots saved (immediate + 2s)');
    // v16: Space restart WITHOUT clicking the canvas first.
    await page.keyboard.press('Space');
    await sleep(600);
    const restarted = await page.evaluate(() => ({
      overHidden: document.getElementById('panel-over').style.display,
      status: window.__debug.flight.state.status,
      time: window.__debug.flight.state.elapsed,
    }));
    console.log('phase B space restart (no canvas click): ' + JSON.stringify(restarted));
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
console.log('errors:', errors.length ? errors.join(' | ') : 'none');
