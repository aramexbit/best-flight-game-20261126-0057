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
const terrain = buildTerrain(THREE, seed, islands, course.runway);
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
    nextDist: course.distanceToNext(s.x, s.y, s.z),
    stalled: s.stalled,
  };
}

function runShot(name) {
  const scene = stageShot(name, { flight, course, terrain });
  renderer.setCameraMode(scene.camera === 'cockpit' ? CAMERA_COCKPIT : CAMERA_CHASE);
  planeApi.setCockpitMode(scene.camera === 'cockpit');
  hud.hidePanels();
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
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let cameraMode = CAMERA_CHASE;
  let muted = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    flight.reset(course.spawn);
    course.reset();
    accumulator = 0;
    screen = 'play';
    hud.hidePanels();
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
      // behind the panel.
      const s = flight.state;
      const prev = { x: s.x, y: s.y, z: s.z };
      s.yaw += 0.12 * STEP;
      const fwd = { x: Math.sin(s.yaw), y: 0, z: -Math.cos(s.yaw) };
      s.x += fwd.x * 42 * STEP;
      s.z += fwd.z * 42 * STEP;
      s.y = 190 + Math.sin(s.elapsed * 0.25) * 12;
      s.elapsed += STEP;
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
      hud.showMessage(left === 0 ? 'ALL RINGS — LAND ON THE RUNWAY' : `RING ${s.ringsPassed}/${COURSE.ringCount}  +${pass.bonus}`, 2.2);
    } else if (pass && pass.nearMiss) {
      s.score += pass.bonus;
      hud.showMessage('NEAR MISS +10', 1.2);
    }
    if (events & EVENT_FUEL_EMPTY) hud.showMessage('FUEL EMPTY — GLIDING', 3);
    if (events & EVENT_LAND) endGame(true);
    else if (events & EVENT_CRASH) endGame(false);
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
  announce('Langit Nusantara. Press Space or click to fly.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
