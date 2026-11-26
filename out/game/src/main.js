// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over. C switches chase/cockpit, M mutes, R restarts a finished run.
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
import { ACTION_CAMERA, ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { stageShot } from './shots.js';

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
  };
}

function runShot(name) {
  // The staged run flies the race too: rivals and effects step with the
  // player, so the cover catches the flyby and the collisions and the
  // landing catches the burning wreck.
  const scene = stageShot(name, { flight, course, terrain }, (dt, t) => {
    rivals.update(dt, t, flight, course, terrain.groundAt, course.runway, audio, (amp) => renderer.triggerShake(amp));
    effects.update(dt);
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
  if (name === 'start') { renderer.setFov(62); renderer.setChase(28, -30, 4.5); }
  else if (name === 'play') { renderer.setFov(68); renderer.setChase(13, -6, 4.5); }
  else if (name === 'cockpit') { renderer.setFov(66); }
  else if (name === 'landing') { renderer.setFov(52); renderer.setChase(12, -5, 2.2); }
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
    renderer.draw(flight, planeApi, ringMeshes, terrain, 1 / 60, performance.now() / 1000);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let titleTime = 0;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let cameraMode = CAMERA_CHASE;
  let muted = false;

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
    // v3: back to the flight framing (wide chase) once the player starts.
    renderer.setFov(65);
    renderer.setChase(16, 0, 4.5);
    audio.start();
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
      lines = [
        `Landed! +${SCORE.landing} landing${smooth ? `, +${smooth} smooth` : ''}${timeBonus ? `, +${timeBonus} time` : ''}`,
        `Score ${flight.state.score}`,
        `Best ${Math.max(best, flight.state.score)}`,
      ];
      audio.landChord();
      announce('Landed on the runway.');
    } else {
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
    if (actions & ACTION_CAMERA && screen === 'play') {
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
    if (actions & ACTION_RESTART && screen === 'over') startGame();
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
    const events = flight.step(STEP, {
      pitch: input.pitch(),
      roll: input.roll(),
      yaw: input.yaw(),
      throttle: input.throttle(),
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
    else if (events & EVENT_CRASH) endGame(false);
    // v13: the race flies with the player — rivals step on the player's
    // clock, and the explosion smoke advances on the same fixed step.
    rivals.update(STEP, s.elapsed, flight, course, terrain.groundAt, course.runway, audio, (amp) => renderer.triggerShake(amp));
    effects.update(STEP);
    audio.update(s.throttle, s.speed);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === 'title' || screen === 'play') {
      while (accumulator >= STEP && (screen === 'title' || screen === 'play')) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    hud.update(hudView(), 1 / 60);
    renderer.draw(flight, planeApi, ringMeshes, terrain, 1 / 60, now / 1000);
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
  renderer.setFov(62);
  renderer.setChase(28, -30, 4.5);
  announce('Langit Nusantara. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
