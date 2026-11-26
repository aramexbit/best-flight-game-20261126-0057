// probe-v19-live.mjs — live-play proof for v19 (copy of the v18 probe,
// same phases A/A2/A3/A4/A5/A6/A7/B/C/D, plus the v19 additions):
// (A8) RING 2 WITH HELD KEYS: the ring driver holds keys (250 ms
// decisions, not taps) and must pass ring 2 — the v18 live playtest
// passed ring 2 in 0 of 5 flights (closest 212 m); the v19 fix is the
// pitch authority (pitchRate 0.9 / pitchLevel 0.30), not longer legs
// (the legs are 206 m by construction, 12 rings over ~2.5 km).
// (A) the blast message must now clear from the DOM text itself
// (v19 hud.js: textContent = '' when the timer expires — the v18
// check only needed opacity 0, and live play showed the text
// surviving >140 s in innerText). (A4) the crash camera pulls back
// (v19 main.js 'crashing' state, 1.5 s) so the fireball reads as an
// object. (C) the contact shadows (v19 render.js) join the count —
// five sun-offset + five contact shadows. Screenshots go to
// live-shots/ as v19-live-*. Prints short status lines.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('/home/hatch/workspace/xe-audit/sdk/node_modules/playwright');

const GAME_DIR = '/home/hatch/workspace/makefun/best-flight-game-20261126-0057';
const SHOTS = GAME_DIR + '/live-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const PORT = 8911;
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
      // v17 (fix): gentler descent (-3 / -3.5, flare -1.2 below 12 m)
      // and a lower VS-hold gain (0.05, was 0.08). The old -6 m/s
      // target with gain 0.08 porpoised (VS -13.9, then a hard flare
      // that ballooned the plane past the runway, 92 m off-centreline
      // in v16). Idle throttle on final — a landing is flown
      // power-off, not on autopilotTo's cruise throttle.
      const targetVS = agl < 12 ? -1.2 : (d > 300 ? -3 : -3.5);
      const vsErr = targetVS - (s.verticalSpeed || 0);
      const p = pwm('pitch', Math.max(-1, Math.min(1, vsErr * 0.05)));
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
      // v17: level the wings FIRST (-roll*2) and correct cross-track
      // (-lat*0.01) — the v16 driver banked hard right at AGL 7 and
      // struck the ground 92 m off-centreline. The in-game final
      // approach assist (main.js) helps too, but the driver must fly
      // a clean final on its own.
      const lat = -(s.x - rw.x) * rw.dirZ + (s.z - rw.z) * rw.dirX;
      const r = pwm('roll', Math.max(-1, Math.min(1, -s.roll * 2 - lat * 0.01 + herr * 1.5)));
      setKey('KeyD', r > 0); setKey('KeyA', r < 0);
      // Idle throttle on final (power-off landing).
      setKey('ShiftLeft', false);
      setKey('ControlLeft', true);
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
// Rival visibility: how many rivals are inside the chase camera's
// frame right now (angle from the camera forward < 35°, dist < 1500 m).
async function sampleRivals(page) {
  return page.evaluate(() => {
    const D = window.__debug;
    const cam = D.renderer.camera;
    const q = cam.quaternion;
    const applyQ = (vx, vy, vz) => {
      const tx = 2 * (q.y * vz - q.z * vy);
      const ty = 2 * (q.z * vx - q.x * vz);
      const tz = 2 * (q.x * vy - q.y * vx);
      return {
        x: vx + q.w * tx + (q.y * tz - q.z * ty),
        y: vy + q.w * ty + (q.z * tx - q.x * tz),
        z: vz + q.w * tz + (q.x * ty - q.y * tx),
      };
    };
    const fwd = applyQ(0, 0, -1);
    const cp = cam.position;
    const inFrame = [];
    for (const r of D.rivals.debug()) {
      if (!r.visible) continue;
      const dx = r.x - cp.x; const dy = r.y - cp.y; const dz = r.z - cp.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 1500) continue;
      const f = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / dist;
      if (f > Math.cos(35 * Math.PI / 180)) inFrame.push(r.name);
    }
    return inFrame;
  }).catch(() => null);
}
// Chase-camera check: the camera must sit BEHIND the plane (dot of the
// camera offset along the heading < 0) and ABOVE it (camY - planeY > 2).
// The v16+v17 live bug dropped the camera UNDER the plane at steep pitch
// (dot still negative, but the camera stared up at the prop from below).
async function sampleCamera(page) {
  return page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const cp = D.renderer.camera.position;
    const fx = Math.sin(s.yaw); const fz = -Math.cos(s.yaw);
    const dx = cp.x - s.x; const dz = cp.z - s.z;
    const hDist = Math.hypot(dx, dz) || 1;
    return { elapsed: s.elapsed, status: s.status,
      dot: (dx * fx + dz * fz) / hDist, above: cp.y - s.y,
      pitch: s.pitch, yawDeg: Math.round(((s.yaw * 180 / Math.PI) % 360 + 360) % 360), rings: s.ringsPassed };
  }).catch(() => null);
}
// Fireball meshes in the scene: faceted explosion balls (v18: icosahedron
// / dodecahedron, #FFF3B0 / #FF9F1C / #E63946) plus burning debris embers.
// Rings are torus, clouds are icosahedra in other colours, smoke is slate
// — only the blast matches.
async function countFireballMeshes(page) {
  return page.evaluate(() => {
    const fire = new Set([0xe63946, 0xff9f1c, 0xfff3b0, 0xff9e1b]);
    const geoTypes = new Set(['IcosahedronGeometry', 'DodecahedronGeometry', 'SphereGeometry']);
    let n = 0;
    window.__scene.traverse((o) => {
      if (o.isMesh && o.geometry && geoTypes.has(o.geometry.type)
        && o.material && o.material.color && fire.has(o.material.color.getHex())
        && o.visible && o.scale.x > 1.5) n += 1;
    });
    return n;
  }).catch(() => -1);
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
  await page.screenshot({ path: SHOTS + '/v19-live-start.jpg', type: 'jpeg', quality: 80 });
  const camD = await sampleCamera(page);
  console.log('phase D camera-behind check', JSON.stringify(camD));
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

  // ---------- PHASE A3: HANDS-OFF — no keys for 20 s of game time ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const yaw0 = await page.evaluate(() => window.__debug.flight.state.yaw);
  let maxDrift = 0;
  let maxRoll = 0;
  let maxPitch3 = 0;
  let end3 = null;
  for (let i = 0; i < 140; i += 1) {
    const st = await page.evaluate(() => {
      const s = window.__debug.flight.state;
      return { elapsed: s.elapsed, yaw: s.yaw, roll: s.roll, pitch: s.pitch, status: s.status, y: s.y, speed: s.speed };
    }).catch(() => null);
    if (!st) break;
    let d = (st.yaw - yaw0) * 180 / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    maxDrift = Math.max(maxDrift, Math.abs(d));
    maxRoll = Math.max(maxRoll, Math.abs(st.roll));
    maxPitch3 = Math.max(maxPitch3, Math.abs(st.pitch));
    end3 = st;
    if (st.status !== 'flying') break;
    if (st.elapsed >= 20) break;
    await sleep(500);
  }
  await page.screenshot({ path: SHOTS + '/v19-live-handsoff.jpg', type: 'jpeg', quality: 80 });
  console.log('phase A3 hands-off 20s: maxHeadingDriftDeg=' + Math.round(maxDrift * 10) / 10
    + ' maxRoll=' + Math.round(maxRoll * 100) / 100
    + ' maxPitch=' + Math.round(maxPitch3 * 100) / 100
    + ' end=' + JSON.stringify(end3)
    + ' PASS=' + (maxDrift < 15 && end3 && end3.status === 'flying'));

  // ---------- PHASE A5 (v18): chase camera through turns + steep climb ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await startDriver(page, 'ring');
  let camSamples = 0;
  let camBad = 0;
  let minDot = 1;
  let minAbove = 99;
  let maxPitch5 = 0;
  for (let i = 0; i < 120; i += 1) {
    const c = await sampleCamera(page);
    if (!c) break;
    if (c.status !== 'flying') break;
    camSamples += 1;
    minDot = Math.min(minDot, c.dot);
    minAbove = Math.min(minAbove, c.above);
    maxPitch5 = Math.max(maxPitch5, c.pitch);
    if (c.dot >= 0 || c.above <= 2) { camBad += 1; console.log('phase A5 BAD camera sample ' + JSON.stringify(c)); }
    if (i === 40) await page.screenshot({ path: SHOTS + '/v19-live-cam-turn.jpg', type: 'jpeg', quality: 80 });
    if (c.elapsed >= 40) break;
    await sleep(500);
  }
  // Steep climb: stop the driver, hold W 3 s real, sample the camera mid-climb.
  await stopDriver(page);
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })));
  await sleep(3000);
  const climbCam = await sampleCamera(page);
  await page.screenshot({ path: SHOTS + '/v19-live-cam-climb.jpg', type: 'jpeg', quality: 80 });
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })));
  console.log('phase A5 chase camera: samples=' + camSamples + ' bad=' + camBad
    + ' minDot=' + minDot.toFixed(2) + ' minAboveM=' + Math.round(minAbove)
    + ' maxPitch=' + maxPitch5.toFixed(2) + ' climbCam=' + JSON.stringify(climbCam)
    + ' PASS=' + (camBad === 0 && climbCam && climbCam.dot < 0 && climbCam.above > 2));

  // ---------- PHASE A6 (v18): no-input straight flight must pass ring 1 ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  let rings6 = 0;
  let end6 = null;
  for (let i = 0; i < 120; i += 1) {
    const st = await page.evaluate(() => {
      const s = window.__debug.flight.state;
      return { elapsed: s.elapsed, rings: s.ringsPassed, status: s.status, y: Math.round(s.y) };
    }).catch(() => null);
    if (!st) break;
    rings6 = st.rings;
    end6 = st;
    if (st.rings >= 1) break;
    if (st.status !== 'flying') break;
    if (st.elapsed >= 30) break;
    await sleep(500);
  }
  await page.screenshot({ path: SHOTS + '/v19-live-noinput-ring1.jpg', type: 'jpeg', quality: 80 });
  console.log('phase A6 no-input ring 1: rings=' + rings6 + ' end=' + JSON.stringify(end6) + ' PASS=' + (rings6 >= 1));

  // ---------- PHASE A7 (v18): R restarts mid-flight; C switches camera while paused ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await startDriver(page, 'ring');
  let t7 = null;
  for (let i = 0; i < 60; i += 1) {
    const el = await page.evaluate(() => window.__debug.flight.state.elapsed).catch(() => null);
    if (el === null || el >= 8) { t7 = el; break; }
    await sleep(500);
  }
  await stopDriver(page);
  await page.keyboard.press('KeyR');
  await sleep(600);
  const restart7 = await page.evaluate(() => ({
    elapsed: +window.__debug.flight.state.elapsed.toFixed(1),
    rings: window.__debug.flight.state.ringsPassed,
    status: window.__debug.flight.state.status,
    overHidden: (document.getElementById('panel-over') || { style: {} }).style.display || 'n/a',
  }));
  console.log('phase A7 R restart mid-flight (flew ' + (t7 === null ? '?' : t7.toFixed(1)) + ' s first): ' + JSON.stringify(restart7)
    + ' PASS=' + (restart7.elapsed < 2 && restart7.rings === 0 && restart7.status === 'flying'));
  // C while paused: P to pause, C must switch the camera (HUD message).
  await page.keyboard.press('KeyP');
  await sleep(400);
  await page.keyboard.press('KeyC');
  await sleep(400);
  const camPause = await page.evaluate(() => ({
    msg: (document.querySelector('#hud-msg') || {}).textContent || '',
    paused: (document.getElementById('panel-pause') || { style: {} }).style.display || 'n/a',
  }));
  console.log('phase A7 C while paused: ' + JSON.stringify(camPause)
    + ' PASS=' + (camPause.msg === 'COCKPIT VIEW' || camPause.msg === 'CHASE VIEW'));
  await page.keyboard.press('KeyP');
  await sleep(300);

  // ---------- PHASE A8 (v19): RING 2 WITH HELD KEYS ----------
  // The v18 live playtest passed ring 2 in 0 of 5 flights (closest
  // 212 m). The ring driver holds keys (250 ms decisions, the same
  // in-page driver as phase A — not taps), so this is the held-key
  // proof the v19 pitch fix (pitchRate 0.9 / pitchLevel 0.30) was
  // built for. PASS = ring 2 passed within 30 s of game time.
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await startDriver(page, 'ring');
  let rings8 = 0;
  let ring2At = null;
  let minDist2 = Infinity;
  let end8 = null;
  for (let i = 0; i < 120; i += 1) {
    const st = await page.evaluate(() => {
      const D = window.__debug;
      const s = D.flight.state;
      return { elapsed: s.elapsed, rings: s.ringsPassed, status: s.status,
        distNext: D.course.distanceToNext(s.x, s.y, s.z) };
    }).catch(() => null);
    if (!st) break;
    rings8 = st.rings;
    end8 = st;
    if (st.rings === 1) minDist2 = Math.min(minDist2, st.distNext);
    if (st.rings >= 2 && ring2At === null) {
      ring2At = st.elapsed;
      await page.screenshot({ path: SHOTS + '/v19-live-ring2.jpg', type: 'jpeg', quality: 80 });
      break;
    }
    if (st.status !== 'flying') break;
    if (st.elapsed >= 30) break;
    await sleep(500);
  }
  await stopDriver(page);
  console.log('phase A8 ring 2 held keys: rings=' + rings8
    + ' ring2At=' + (ring2At === null ? 'never' : ring2At.toFixed(1) + 's')
    + ' minDistToRing2=' + (minDist2 === Infinity ? 'n/a' : Math.round(minDist2) + 'm')
    + ' end=' + JSON.stringify(end8) + ' PASS=' + (rings8 >= 2));

  // ---------- PHASE A: fly with keys until the mid-air collision ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  await startDriver(page, 'ring');
  let blast = null;
  let lastState = null;
  let visSamples = 0;
  let visWithRival = 0;
  for (let i = 0; i < 300; i += 1) {
    lastState = await pollState(page);
    if (!lastState) break;
    if (lastState.ev) { blast = lastState.ev; break; }
    if (lastState.status !== 'flying') break;
    if (lastState.elapsed > 75) break;
    // Rival visibility sample every ~5 s of real time.
    if (i % 10 === 0) {
      const vis = await sampleRivals(page);
      if (vis) { visSamples += 1; if (vis.length > 0) visWithRival += 1; }
    }
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
  console.log('phase A rival visibility: samples=' + visSamples + ' withRivalInFrame=' + visWithRival);
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
    await page.screenshot({ path: SHOTS + '/v19-live-blast.jpg', type: 'jpeg', quality: 80 });
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
    await page.screenshot({ path: SHOTS + '/v19-live-blast-15.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A shot +1.5s: elapsed=' + hud.elapsed.toFixed(1) + ' rings=' + hud.rings + ' hudMsg=' + JSON.stringify(hud.msg) + ' bodyHasCollisionText=' + hud.body);
    // v19: the collision message must clear from the DOM TEXT itself
    // (hud.js now sets textContent = '' when the timer expires). The
    // v18 check only needed opacity 0, and live play showed the text
    // surviving >140 s in innerText (including after 'Crashed!').
    // Strict now: the text must be gone, not merely invisible.
    await sleep(3000);
    const msgAfter = await page.evaluate(() => {
      const m = document.querySelector('#hud-msg');
      return { text: m ? m.textContent : '', opacity: m ? getComputedStyle(m).opacity : 'n/a' };
    });
    console.log('phase A msg +4.5s after blast: ' + JSON.stringify(msgAfter)
      + ' PASS=' + (msgAfter.text === ''));
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
  let vis2Samples = 0;
  let vis2WithRival = 0;
  for (let i = 0; i < 300; i += 1) {
    last2 = await pollState(page);
    if (!last2) break;
    if (last2.ev) { blast2 = last2.ev; break; }
    if (last2.status !== 'flying') break;
    if (last2.elapsed > 75) break;
    if (i % 10 === 0) {
      const vis = await sampleRivals(page);
      if (vis) { vis2Samples += 1; if (vis.length > 0) vis2WithRival += 1; }
    }
    // v17 (diag): same pair-state log as Phase A, so a no-blast A2 run
    // shows whether the pair converged, where the meeting point is,
    // and how far they are from it.
    if (i % 20 === 0) {
      const d = await page.evaluate(() => {
        try {
          const D = window.__debug;
          const s = D.flight.state;
          const out = { t: +s.elapsed.toFixed(1), rings: s.ringsPassed,
            px: Math.round(s.x), py: Math.round(s.y), pz: Math.round(s.z) };
          const dbg = D.rivals.debug();
          const k = dbg.find((r) => r.name === 'KUNING');
          const h = dbg.find((r) => r.name === 'HIJAU');
          for (const [nm, r] of [['K', k], ['H', h]]) {
            if (!r) { out[nm] = null; continue; }
            const mp = r.meetPoint;
            out[nm] = { st: r.state,
              dMeet: mp ? Math.round(Math.hypot(r.x - mp.x, r.y - mp.y, r.z - mp.z)) : null,
              mp: mp ? { x: Math.round(mp.x), y: Math.round(mp.y), z: Math.round(mp.z), pr: !!mp.playerRel } : null };
          }
          return out;
        } catch (e) { return null; }
      }).catch(() => null);
      if (d) console.log('phase A2 pair diag ' + JSON.stringify(d));
    }
    await sleep(500);
  }
  await stopDriver(page);
  console.log('phase A2 rival visibility: samples=' + vis2Samples + ' withRivalInFrame=' + vis2WithRival);
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
    await page.screenshot({ path: SHOTS + '/v19-live-blast-straight.jpg', type: 'jpeg', quality: 80 });
    console.log('phase A2 STRAIGHT blast t=' + blast2.time.toFixed(1) + ' ' + JSON.stringify(offCourse));
  } else {
    console.log('phase A2 NO BLAST: lastState=' + JSON.stringify(last2));
  }

  // ---------- PHASE A4: crash blast — teleport over a hill, nose down ----------
  await page.goto('http://localhost:' + PORT + '/index.html?seed=1', { waitUntil: 'load', timeout: 20000 });
  await page.waitForFunction(() => window.__debug && window.__debug.flight, null, { timeout: 20000 });
  await page.keyboard.press('Space');
  await sleep(500);
  const tp4 = await page.evaluate(() => {
    const D = window.__debug;
    const s = D.flight.state;
    const sp = D.course.spawn;
    const tx = sp.x + Math.sin(sp.yaw) * 500;
    const tz = sp.z - Math.cos(sp.yaw) * 500;
    const g = D.terrain.groundAt(tx, tz);
    s.x = tx; s.z = tz; s.y = g + 30;
    s.yaw = sp.yaw; s.pitch = -0.5; s.roll = 0; s.speed = 60; s.verticalSpeed = 0;
    return { x: Math.round(tx), y: Math.round(s.y), z: Math.round(tz), ground: Math.round(g) };
  });
  console.log('phase A4 teleported 30 m over a hill, nose down: ' + JSON.stringify(tp4));
  let crashed4 = null;
  for (let i = 0; i < 150; i += 1) {
    const st = await page.evaluate(() => {
      const s = window.__debug.flight.state;
      return { elapsed: s.elapsed, status: s.status, y: Math.round(s.y) };
    }).catch(() => null);
    if (!st) break;
    if (st.status !== 'flying') { crashed4 = st; break; }
    await sleep(100);
  }
  if (crashed4) {
    const fire0 = await countFireballMeshes(page);
    // v19 (c, diag-crash): the fireball sits dead-centre in frame
    // (NDC ~0.09,-0.21, 49 m from the wide crash camera) — exactly
    // where the "Crashed!" panel covers it — and headless screenshot
    // latency exceeds the 1.5 s crashing beat, so every unmodified
    // capture lands after the panel appears (only the fireball's lower
    // orange edge peeks out). Hide ONLY the panel for the capture (the
    // game is untouched; at 60 fps the player sees the fireball for
    // 1.5 s before the panel appears). This isolates the camera
    // framing, which is what (c) is about.
    const hidePanel = () => page.evaluate(() => {
      const p = document.getElementById('panel-over');
      if (p) p.style.display = 'none';
      return p ? 'hidden' : 'no-panel';
    }).catch(() => 'err');
    console.log('phase A4 hide panel: ' + await hidePanel());
    await page.screenshot({ path: SHOTS + '/v19-live-crash.jpg', type: 'jpeg', quality: 80 });
    // The over screen keeps the effects advancing in real time, so
    // +1.5 s is a real-time wait (the flight clock is frozen).
    await sleep(1500);
    const fire15 = await countFireballMeshes(page);
    console.log('phase A4 hide panel: ' + await hidePanel());
    await page.screenshot({ path: SHOTS + '/v19-live-crash-15.jpg', type: 'jpeg', quality: 80 });
    const panel4 = await page.evaluate(() => ({
      crashed: document.body.innerText.includes('Crashed!'),
      elapsed: window.__debug.flight.state.elapsed,
    }));
    console.log('phase A4 CRASH at t=' + crashed4.elapsed.toFixed(1)
      + ' fireballMeshes immediate=' + fire0 + ' +1.5s=' + fire15
      + ' panel=' + JSON.stringify(panel4));
  } else {
    console.log('phase A4 NO CRASH in 15 s');
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
    // v17 (fix): a normal short final, not a slam-dunk. 250 m out at
    // 40 m AGL is a 9° glidepath — the old driver dived at -6 m/s,
    // flared hard, ballooned and floated past the runway (crash at
    // x=1699). 600 m out at 30 m AGL is ~4.5°, a -3 m/s descent the
    // regulator can track to a touchdown at the threshold.
    s.x = rw.x - rw.dirX * 600;
    s.z = rw.z - rw.dirZ * 600;
    s.y = rw.height + 30;
    s.yaw = Math.atan2(rw.dirX, -rw.dirZ);
    s.pitch = 0; s.roll = 0; s.speed = 38; s.verticalSpeed = 0;
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
        const rw = D.course.runway;
        // Cross-track from the runway centreline (metres, + = right).
        const lat = -(s.x - rw.x) * rw.dirZ + (s.z - rw.z) * rw.dirX;
        return { t: +s.elapsed.toFixed(1), y: Math.round(s.y), agl: Math.round(s.y - g),
          spd: Math.round(s.speed), vs: +(s.verticalSpeed || 0).toFixed(1), status: s.status,
          lat: Math.round(lat), roll: +s.roll.toFixed(2) };
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
    await page.screenshot({ path: SHOTS + '/v19-live-finish-a.jpg', type: 'jpeg', quality: 80 });
    const panel = await page.evaluate(() => ({
      title: (document.querySelector('#over-title') || {}).textContent || '',
      lines: (document.querySelector('#over-lines') || {}).textContent || '',
    }));
    console.log('phase B panel: ' + JSON.stringify(panel));
    await sleep(2000);
    await page.screenshot({ path: SHOTS + '/v19-live-finish-b.jpg', type: 'jpeg', quality: 80 });
    console.log('phase B finish screenshots saved (immediate + 2s)');
    // v16: Space restart WITHOUT clicking the canvas first.
    await page.keyboard.press('Space');
    await sleep(600);
    const restarted = await page.evaluate(() => ({
      overHidden: (document.getElementById('panel-over') || { style: {} }).style.display || 'n/a',
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
