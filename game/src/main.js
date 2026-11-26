// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over — plus a transient 'crashing' beat (v19) between the crash and
// the game-over panel, so the fireball is seen on a wide camera first.
// C switches chase/cockpit, M mutes, R restarts a finished run.
//
// ?seed=N fixes the islands and the course. ?shot=start|play|cockpit|landing
// (with &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import * as THREE from '../vendor/three.module.min.js';
import { BEST_KEY, COURSE, SCORE, STEP } from './config.js';
import { createRandom } from './random.js';
import { planIslands, buildTerrain } from './terrain.js';
import { createCourse, buildRingMeshes } from './rings.js';
import { createFlight, headingOf, EVENT_CRASH, EVENT_FUEL_EMPTY, EVENT_LAND } from './flight.js';
import { buildPlane } from './plane.js';
import { createRenderer, CAMERA_CHASE, CAMERA_COCKPIT } from './render.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createRivals } from './rivals.js';
import { createEffects } from './effects.js';
import { createStorm } from './storm.js';
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { stageShot, autopilotTo } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

// The world is built once, from the seed: islands, course, terrain, rings, plane.
const islands = planIslands(createRandom(seed));
const course = createCourse(createRandom(seed + 7), seed, islands);
const terrain = buildTerrain(THREE, seed, islands, course.runway, course);
window.__vegCounts = terrain.vegCounts || null;
const ringMeshes = buildRingMeshes(THREE, course);
const planeApi = buildPlane(THREE);
const renderer = createRenderer(canvas, THREE, {
  terrain: terrain.group,
  rings: ringMeshes.group,
  plane: planeApi.group,
});
const flight = createFlight(course.spawn);
const hud = createHud();
const audio = createAudio();
// v13: the race — four AI rivals in the same Caravan airframe, and the
// explosion/smoke system they crash into. The rivals fly the same
// 12-ring course and never touch the player; the effects are visual only.
const effects = createEffects(THREE, renderer.scene);
const rivals = createRivals(THREE, seed, islands, effects);
renderer.scene.add(rivals.group);
// v16: the storm battle — tornado, storm wall, rain, lightning, flak.
const storm = createStorm(THREE, seed, course, islands, terrain.groundAt, effects);
renderer.scene.add(storm.group);

// v14: debug handles for the probe (probe-v14.mjs) — the live world, the
// autopilot helper and a log of race events (collisions, with time and
// position), so a full run can be verified from outside the page.
// v17: the renderer is exposed so the probes can project the next ring
// through the chase camera and check the HUD arrow points where the
// ring actually is on screen.
window.__debug = { flight, course, terrain, rivals, effects, storm, renderer };
window.__autopilotTo = autopilotTo;
window.__raceEvents = [];
window.__scene = renderer.scene;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function hudView() {
  const s = flight.state;
  // v17: the ring pointer is computed in the CAMERA's frame (screen
  // space) — the old version used the horizontal bearing only, so the
  // arrow said 'up' while the ring sat at the left edge of the frame
  // (the chase camera's yaw lags the plane's in a turn, and elevation
  // was ignored). The first v17 try used the PLANE's frame instead,
  // which tilts with pitch: the probe measured the arrow 67° off the
  // ring's screen position (ring up-left, arrow down-left). The camera
  // is what the player sees, so the arrow is the ring's direction
  // decomposed into the camera's forward/right/up axes (from its
  // quaternion). If the ring is behind the camera (fwd < 0) the arrow
  // points down (180°); otherwise the angle is atan2(right, up) — 0°
  // is straight up on screen, +90° is hard right, -90° hard left.
  const next = course.nextRing();
  let ringDir = null;
  if (next) {
    const cam = renderer.camera;
    const q = cam.quaternion;
    // Rotate a vector by the camera quaternion (three.js formula).
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
    const up = applyQ(0, 1, 0);
    const right = applyQ(1, 0, 0);
    const dx = next.x - cam.position.x;
    const dy = next.y - cam.position.y;
    const dz = next.z - cam.position.z;
    const dist = Math.hypot(dx, dy, dz) || 1;
    const f = (dx * fwd.x + dy * fwd.y + dz * fwd.z) / dist;
    const r = (dx * right.x + dy * right.y + dz * right.z) / dist;
    const u = (dx * up.x + dy * up.y + dz * up.z) / dist;
    ringDir = f < 0 ? 180 : Math.atan2(r, u) * 180 / Math.PI;
  }
  // v19 (Gemini v19 #4): the AGL / glide cue for the final approach —
  // height above ground in feet and the glide alignment against a 3°
  // slope (ideal height = distance to the threshold x tan(3°)).
  const rw = course.runway;
  const groundY = terrain.groundAt(s.x, s.z);
  const aglM = Math.max(0, s.y - Math.max(groundY, 0.6));
  const distRwy = Math.hypot(rw.x - s.x, rw.z - s.z);
  const idealH = distRwy * 0.0524;
  const dev = (s.y - rw.height) - idealH;
  const glide = Math.abs(dev) < 15 ? 'ON GLIDE' : dev > 0 ? 'HIGH' : 'LOW';
  return {
    heading: headingOf(s.yaw),
    pitch: s.pitch,
    roll: s.roll,
    altM: Math.max(0, s.y),
    speedMs: s.speed,
    fuel: s.fuel,
    throttle: s.throttle,
    time: s.elapsed,
    score: s.score,
    rings: s.ringsPassed,
    ringTotal: COURSE.ringCount,
    pos: rivals.playerPosition(flight, course),
    nextDist: course.distanceToNext(s.x, s.y, s.z),
    stalled: s.stalled,
    ringDir,
    ringNum: s.ringsPassed + 1,
    aglFt: aglM * 3.28084,
    distRwy,
    glide,
  };
}

function runShot(name) {
  // The staged run flies the race too: rivals and effects step with the
  // player, so the cover catches the flyby and the collisions and the
  // landing catches the burning wreck.
  const scene = stageShot(name, { flight, course, terrain }, (dt, t) => {
    rivals.update(dt, t, flight, course, terrain.groundAt, course.runway, audio, (amp) => renderer.triggerShake(amp),
      (kind, detail) => window.__raceEvents.push({ kind, time: t, ...detail }));
    effects.update(dt);
    // v16: the storm lives on the same staged clock — the cover
    // catches the tornado, the rain and the flak at the right age.
    storm.update(dt, t);
  });
  renderer.setCameraMode(scene.camera === 'cockpit' ? CAMERA_COCKPIT : CAMERA_CHASE);
  planeApi.setCockpitMode(scene.camera === 'cockpit');
  // Framing per shot (v7): the cover (play) camera is close and low
  // (13 m back, 4.5 m up, FOV 68) so the tree-covered foreground fills
  // the frame instead of empty green slope, and the landing camera is
  // closer and lower still (12 m back, 2.2 m up, FOV 52) so the threshold
  // sits below the plane in clear view; the cover chase rides high so
  // the plane drops toward the lower third of the frame and the next
  // ring, the runway and the landmark ridges sit in the middle.
  // v8: the landing chase rides 4.5 m to the side (lateral -4.5, was 0),
  // so the plane sits right of centre in the frame and the "09" runway
  // number on the centreline shows beside the fuselage instead of hiding
  // under its belly (Gemini v7). The freeze window is untouched
  // (300 m / +50 m, proven in v6) — only the camera moves, not the
  // approach.
  // v17: lateral -2 (was -4) — the v16 live playtest found the plane
  // sliding out of frame in banks; pulling it toward centre keeps it
  // in frame on final.
  // v12: lateral -2.0 (was -4.5) — the v11 plane still sat offset to the
  // right and slightly banked in the landing frame; closer to centre it
  // reads as on the centreline with level wings, and "09" still shows
  // beside the fuselage instead of hiding under it.
  // v13: cover and landing chase ride 5-6 m to the side (a 3/4 rear
  // angle, was straight behind) — from straight behind the plane reads
  // as a tube + tall fin, a rocket; from the side the cabin windows, the
  // high wing and the struts read at a glance, so it is a plane.
  // v9: lateral -30 (was -24) — the scene sits a touch further right, so
  // the first ring clears the (now narrower) title card's right edge.
  // v18: staging pushed further right and up (lateral -34, height 6.5) —
  // Gemini's fix: the storm and the rings sat BEHIND the instruction pill
  // on the title screen, so the staging camera steps aside and up.
  if (name === 'start') { renderer.setFov(62); renderer.setChase(28, -34, 6.5); }
  else if (name === 'play') { renderer.setFov(68); renderer.setChase(13, -6, 4.5); }
  else if (name === 'cockpit') { renderer.setFov(66); }
  // v14: landing chase pulled back a touch (14 m back, 2.6 m up, was
  // 12 m / 2.2 m) and closer to centre (lateral -4, was -5) — in v13 the
  // player's plane sat too big and too close in the landing frame and
  // covered part of the runway; a step back shows the whole strip.
  else if (name === 'landing') { renderer.setFov(52); renderer.setChase(14, -2, 2.6); }
  hud.hidePanels();
  // The title shot is a frozen moment, not a running game: the clock reads 0:00.
  if (scene.screen === 'title') flight.state.elapsed = 0;
  // The landing shot is the end of the run: say so, so the frame reads as an
  // objective and not just another ring.
  if (name === 'landing' && flight.state.ringsPassed >= COURSE.ringCount) {
    hud.showObjective('LAND ON THE RUNWAY');
  }
  // The instruments always show the staged flight, even behind the title panel.
  hud.update(hudView(), 0);
  if (scene.screen === 'title') {
    hud.showPanel('title');
  }
  let painted = 0;
  function paint() {
    // v15: the rivals ride along for their shadows (rivals.debug() gives
    // the four positions; the group is visible in every staged shot).
    renderer.draw(flight, planeApi, ringMeshes, terrain, 1 / 60, performance.now() / 1000,
      rivals.group.visible ? rivals.debug() : []);
    painted += 1;
    // v17: refresh the HUD after the first draw — hudView's ring
    // pointer is computed from the chase camera, and the camera is
    // only positioned by draw(). The hud.update above ran before any
    // draw, so its arrow came from the camera's initial pose.
    if (painted === 1) hud.update(hudView(), 0);
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  // v16: the canvas takes keyboard focus at boot, so Space restarts the
  // run without a canvas click first (v15 playtest: Space sometimes did
  // nothing until the canvas was clicked — the Start button kept the
  // focus). Focus returns to the canvas on every start and game over
  // too (see startGame/endGame).
  canvas.focus();
  // v15: expose the live input for the probe — the deterministic W/S key
  // test dispatches real keydown events and reads pitch() back, so the
  // key mapping itself (not just the flight model) is verified end to end.
  window.__debug.input = input;
  let screen = 'title';
  let titleTime = 0;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let cameraMode = CAMERA_CHASE;
  let muted = false;
  // v19 (c): the crash beat — seconds left on the wide camera before
  // the "Crashed!" panel appears.
  let crashTimer = 0;

  // v11: the title screen's Start button and settings gear are real buttons
  // on the overlay, not the canvas — the canvas pointerdown listener in
  // input.js never sees their clicks, so they get their own handlers here.
  // Start begins the flight exactly like Space; the gear toggles sound
  // (the same mute as the M key) and works before the audio context exists,
  // because audio.setMuted stores the flag for the first start() call.
  const startBtn = document.getElementById('btn-start');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (screen === 'title' || screen === 'over') startGame();
    });
  }
  const gearBtn = document.getElementById('btn-gear');
  if (gearBtn) {
    gearBtn.addEventListener('click', () => {
      muted = !muted;
      audio.setMuted(muted);
      announce(muted ? 'Sound off.' : 'Sound on.');
    });
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    flight.reset(course.spawn);
    course.reset();
    rivals.reset();
    effects.clear();
    rivals.group.visible = true;
    accumulator = 0;
    screen = 'play';
    hud.hidePanels();
    // v3: back to the flight framing once the player starts.
    // v17: closer and lower (11 m back, 4.2 m up, lateral -3.5, FOV 62,
    // look-ahead 22 m) — the v16 live playtest found the plane small
    // and lost in the frame at 16 m / FOV 65, and the chase camera
    // facing the nose was a misread of that small, drifting plane.
    renderer.setFov(62);
    renderer.setChase(11, -3.5, 4.2, 22);
    audio.start();
    // v16: focus the canvas, so Space (restart) works without a click
    // even after the Start button was clicked.
    canvas.focus();
    announce('Flying. Twelve rings, then land on the runway.');
    hud.showMessage('FLY THROUGH RING 1', 3);
  }

  function endGame(landed) {
    screen = 'over';
    audio.stopEngine();
    let lines;
    if (landed) {
      const timeBonus = Math.max(0, Math.round((COURSE.parTime - flight.state.elapsed) * SCORE.timeBonusPerSecond));
      const smooth = Math.abs(flight.state.verticalSpeed) < 3 ? SCORE.smoothLanding : 0;
      flight.state.score += SCORE.landing + smooth + timeBonus;
      const mins = Math.floor(flight.state.elapsed / 60);
      const secs = Math.floor(flight.state.elapsed % 60);
      const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
      if (flight.state.ringsPassed >= COURSE.ringCount) {
        // v14: THE FINISH — the user landed after all 12 rings and got
        // nothing at all in v13, so the finish is now a moment: a
        // RACE COMPLETE banner, fireworks over the runway, confetti over
        // the plane, a fanfare, and a results panel with the race
        // position, score and time.
        hud.setOverTitle('🏁 RACE COMPLETE!');
        lines = [
          `Position ${rivals.playerPosition(flight, course)}`,
          `Score ${flight.state.score}`,
          `Time ${timeStr}`,
          `Best ${Math.max(best, flight.state.score)}`,
        ];
        effects.fireworkShow(course.runway.x, course.runway.height, course.runway.z);
        effects.confetti(flight.state.x, flight.state.y + 4, flight.state.z);
        audio.fanfare();
        announce('Race complete!');
      } else {
        hud.setOverTitle('Landed!');
        lines = [
          `Landed! +${SCORE.landing} landing${smooth ? `, +${smooth} smooth` : ''}${timeBonus ? `, +${timeBonus} time` : ''}`,
          `Score ${flight.state.score}`,
          `Best ${Math.max(best, flight.state.score)}`,
        ];
        audio.landChord();
        announce('Landed on the runway.');
      }
    } else {
      hud.setOverTitle('Crashed!');
      lines = [
        `Crashed after ${flight.state.ringsPassed} of ${COURSE.ringCount} rings`,
        `Score ${flight.state.score}`,
        `Best ${Math.max(best, flight.state.score)}`,
      ];
      audio.thud();
      announce('Crashed.');
    }
    if (flight.state.score > best) {
      best = flight.state.score;
      saveBest(best);
    }
    hud.setOverLines(lines);
    hud.showPanel('over');
    // v16: focus the canvas, so Space restarts without a click first.
    canvas.focus();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === 'title' || screen === 'over')) startGame();
    else if (actions & ACTION_PAUSE && screen === 'play') {
      screen = 'paused';
      hud.showPanel('pause');
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === 'paused') {
      screen = 'play';
      hud.hidePanels();
      announce('Flying.');
    }
    // v18: C also switches the camera while paused (v17 live playtest:
    // C did nothing on the pause screen), and R restarts from play,
    // paused or over (v17: R only worked on the game-over screen — the
    // live playtest could not restart mid-flight at all).
    if (actions & ACTION_CAMERA && (screen === 'play' || screen === 'paused')) {
      cameraMode = cameraMode === CAMERA_CHASE ? CAMERA_COCKPIT : CAMERA_CHASE;
      renderer.setCameraMode(cameraMode);
      planeApi.setCockpitMode(cameraMode === CAMERA_COCKPIT);
      hud.showMessage(cameraMode === CAMERA_COCKPIT ? 'COCKPIT VIEW' : 'CHASE VIEW', 1.5);
    }
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
      hud.showMessage(muted ? 'SOUND OFF' : 'SOUND ON', 1.2);
    }
    if (actions & ACTION_RESTART && (screen === 'play' || screen === 'paused' || screen === 'over')) startGame();
  }

  function step() {
    if (screen === 'title') {
      // The title screen flies itself: a slow autopilot orbit so the world is alive
      // behind the panel. v2: the flight clock stays frozen at 0:00 until the
      // player starts — the title orbit runs on its own clock instead.
      // v13: the rivals sit out the title screen (they would hover at the
      // start line in the air behind the panel).
      rivals.group.visible = false;
      effects.update(STEP);
      // v16: the storm drifts behind the title too, so the title screen
      // shows the tornado and the rain while the plane orbits.
      storm.update(STEP, titleTime);
      const s = flight.state;
      const prev = { x: s.x, y: s.y, z: s.z };
      s.yaw += 0.12 * STEP;
      const fwd = { x: Math.sin(s.yaw), y: 0, z: -Math.cos(s.yaw) };
      s.x += fwd.x * 42 * STEP;
      s.z += fwd.z * 42 * STEP;
      titleTime += STEP;
      s.y = 190 + Math.sin(titleTime * 0.25) * 12;
      s.speed = 42;
      void prev;
      return;
    }
    const s = flight.state;
    const prev = { x: s.x, y: s.y, z: s.z };
    // v16: storm gusts buffet the stick in live play only (the staged
    // sim never passes through here, so sim scores do not move).
    // v17: the gust is added to the stick ONLY when the player is
    // actually holding it — the RAW stick value (input.roll() with no
    // gust) is what flight.js uses to decide whether to auto-level.
    // The v16 bug: the gust was folded into input.roll, so the raw
    // value was never 0 in live play, auto-level never engaged, and
    // the gust's DC bias banked the plane right ~10°/s with no input
    // (v16 live playtest: 360° of uncommanded right turn in 36 s).
    // The gust itself is zero-mean since v17 (cosines in storm.js).
    const gust = storm.gustAt(s.elapsed);
    const clamp1 = (v) => Math.max(-1, Math.min(1, v));
    const rawRoll = input.roll();
    // v18: the raw pitch stick, passed to flight.js so the pitch
    // auto-level can read it (same pattern as stickRoll above).
    const rawPitch = input.pitch();
    // v17: FINAL-APPROACH ASSIST (cross-track fix). Once all 12 rings
    // are passed and the plane is within 700 m of the runway below
    // 200 m AGL, a gentle helper steers the wings level and the nose
    // onto the centreline: roll toward level (-roll * 0.9), off the
    // centreline (-lat * 0.004) and onto the runway heading
    // (+herr * 0.5). It is blended at 0.6 with the player's own input,
    // and the gust is scaled to 0.2 — the player still flies the
    // landing, but the v16 drift (92 m off-centreline, crash at the
    // threshold) no longer ends the run. The flight model has no wind
    // drift; the "wind" that pushed players off was the gust bias.
    const runway = course.runway;
    const dxR = runway.x - s.x;
    const dzR = runway.z - s.z;
    const distR = Math.hypot(dxR, dzR);
    const agl = s.y - Math.max(terrain.groundAt(s.x, s.z), 0.6);
    const onFinal = s.ringsPassed >= COURSE.ringCount && distR < 700 && agl < 200;
    let rollInput = rawRoll;
    let gustScale = 1;
    if (onFinal) {
      // Steer at a point 500 m beyond the runway centre along its
      // direction (the probe's land driver proved steering at the
      // centre itself goes hypersensitive at close range).
      const farX = runway.x + runway.dirX * 500;
      const farZ = runway.z + runway.dirZ * 500;
      const targetYaw = Math.atan2(farX - s.x, -(farZ - s.z));
      let herr = targetYaw - s.yaw;
      herr = Math.atan2(Math.sin(herr), Math.cos(herr));
      // Lateral offset from the centreline (metres, + = right of the
      // approach direction): right = (-dirZ, dirX).
      const lat = -(s.x - runway.x) * runway.dirZ + (s.z - runway.z) * runway.dirX;
      const assistRoll = Math.max(-0.5, Math.min(0.5, -s.roll * 0.9 - lat * 0.004 + herr * 0.5));
      rollInput = clamp1(rawRoll + assistRoll * 0.6);
      gustScale = 0.2;
    }
    const events = flight.step(STEP, {
      pitch: clamp1(rawPitch + gust.pitch),
      roll: clamp1(rollInput + gust.roll * gustScale),
      yaw: input.yaw(),
      throttle: input.throttle(),
      stickRoll: onFinal ? rollInput : rawRoll,
      stickPitch: rawPitch,
    }, terrain.groundAt, course.runway);
    const pass = course.checkPass(prev, s);
    if (pass && pass.passed) {
      s.ringsPassed += 1;
      s.score += pass.bonus;
      s.lastBonus = pass.bonus;
      audio.chime();
      const left = COURSE.ringCount - s.ringsPassed;
      if (left === 0) hud.showObjective('ALL RINGS — LAND ON THE RUNWAY');
      else hud.showMessage(`RING ${s.ringsPassed}/${COURSE.ringCount}  +${pass.bonus}`, 2.2);
    } else if (pass && pass.nearMiss) {
      s.score += pass.bonus;
      hud.showMessage('NEAR MISS +10', 1.2);
    }
    if (events & EVENT_FUEL_EMPTY) hud.showMessage('FUEL EMPTY — GLIDING', 3);
    if (events & EVENT_LAND) endGame(true);
    else if (events & EVENT_CRASH) {
      // v17: the player's own crash finally explodes — a fireball at
      // the wreck, boom and shake (v16 live playtest: two crashes
      // showed only a 'Crashed!' panel over an intact plane).
      // v19 (c): the crash camera pulls WIDE (45 m back, 20 m up) and
      // the "Crashed!" panel waits 1.5 s — the v18 live playtest saw
      // no fireball at all: the chase camera sat 11 m behind the plane
      // and flew INTO the fireball/terrain, so the screen filled with
      // orange polygons. A wide camera sees the fireball as an object.
      effects.explode(s.x, s.y + 3, s.z, false);
      audio.boom();
      renderer.triggerShake(0.6);
      renderer.setChase(45, -10, 20, 40);
      screen = 'crashing';
      crashTimer = 1.5;
      announce('Crashed.');
    }
    // v13: the race flies with the player — rivals step on the player's
    // clock, and the explosion smoke advances on the same fixed step.
    // v14: the collision callback — when rivals.js fires the mid-air
    // collision, log it, flash the HUD, boom and shake, so the player
    // KNOWS a blast went off even if it is at the edge of view (the
    // user's playtest report: no explosion ever seen while playing).
    rivals.update(STEP, s.elapsed, flight, course, terrain.groundAt, course.runway, audio, (amp) => renderer.triggerShake(amp),
      (kind, detail) => {
        window.__raceEvents.push({ kind, time: s.elapsed, ...detail });
        if (kind === 'collision') {
          hud.showMessage('💥 MID-AIR COLLISION!', 2.5);
          audio.boom();
          renderer.triggerShake(0.5);
        }
      });
    effects.update(STEP);
    storm.update(STEP, s.elapsed);
    audio.update(s.throttle, s.speed);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    // v18: the HUD message timer runs on REAL frame time now, not a
    // fixed 1/60 per frame — at low FPS the v17 "2.5 s" collision
    // message lingered 15-40 real seconds in the live playtest.
    const frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += frameDt;
    last = now;
    handleActions();
    if (screen === 'title' || screen === 'play') {
      while (accumulator >= STEP && (screen === 'title' || screen === 'play')) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // v14: the effects keep advancing on the game-over screen, so the
      // finish fireworks and confetti animate behind the results panel
      // instead of freezing on their first frame.
      // v16: the storm keeps moving there too.
      if (screen === 'over') {
        effects.update(1 / 60);
        storm.update(1 / 60, flight.state.elapsed);
      }
      // v19 (c): the crash beat — the fireball burns for 1.5 s on the
      // wide camera before the "Crashed!" panel appears.
      if (screen === 'crashing') {
        crashTimer -= frameDt;
        effects.update(1 / 60);
        storm.update(1 / 60, flight.state.elapsed);
        if (crashTimer <= 0) endGame(false);
      }
    }
    hud.update(hudView(), frameDt);
    // v15: the live draw gets the rivals too, so their blob shadows track
    // them in play — hidden on the title screen, where the pack sits out.
    // v18c: draw gets the REAL frame dt now, not a fixed 1/60 — the chase
    // camera lerp inside draw() ran once per rendered frame with a fixed
    // 1/60 dt while the sim advanced several steps per frame at low FPS,
    // so the camera lagged 25-150 m behind the plane in live play (the
    // plane read as a tiny speck dead-centre in frame, NDC angle 3.5 deg,
    // while the staged shots showed it big). The sim still steps on the
    // fixed STEP accumulator above; only the visuals use real time.
    renderer.draw(flight, planeApi, ringMeshes, terrain, frameDt, now / 1000,
      rivals.group.visible ? rivals.debug() : []);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      hud.showPanel('pause');
      announce('Paused.');
    }
  });

  hud.showPanel('title');
  // v4: the title orbit is framed closer and from the side, aircraft clearly
  // right of the panel (same framing as the title screenshot).
  // v9: lateral -30 (was -24), matching the screenshot framing.
  // v11: the framing is unchanged — the new title UI (top bar, wider info
  // card, objective pills, Start button) was laid out around this shot,
  // not the other way round; the ring still clears the card's right edge
  // and the plane still banks right of centre.
  // v18: same staging as the title shot (lateral -34, height 6.5).
  renderer.setFov(62);
  renderer.setChase(28, -34, 6.5);
  announce('Langit Nusantara. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
