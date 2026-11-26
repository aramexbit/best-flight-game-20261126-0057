// The Three.js view: one renderer, one scene, two cameras. Chase hangs behind and
// above the plane and leans into the bank a little, so the horizon tilts the way
// a pilot feels it; cockpit bolts the camera to the pilot's head and lets the
// world roll around it. The plane, the rings and the terrain are handed in as
// groups and this file only moves them.

import { PALETTE, WORLD } from './config.js';
import { headingOf } from './flight.js';

export const CAMERA_CHASE = 'chase';
export const CAMERA_COCKPIT = 'cockpit';

export function createRenderer(canvas, THREE, groups) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(PALETTE.skyHorizon);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // v3: exposure 1.15 (blueprint). v4: the daytime sky is bright on its own —
  // the exposure stays 1.15, and the screenshots will tell if it needs a nudge.
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fogNear, WORLD.fogFar);
  scene.add(groups.terrain);
  scene.add(groups.rings);
  scene.add(groups.plane);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 9000);
  const chasePos = new THREE.Vector3(0, 200, 0);
  const lookTarget = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();

  let mode = CAMERA_CHASE;
  let firstFrame = true;
  // Chase framing, set per scene by the game (title / flight / landing each
  // want their own distance, lateral offset and height — see the blueprint).
  let chaseDist = 15;
  let chaseLateral = 0;
  let chaseHeight = 4.5;

  /** Field of view in degrees; the title wants it wider, the landing narrower. */
  function setFov(fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  /** Chase camera geometry: metres behind, sideways and above the plane. */
  function setChase(dist, lateral, height) {
    chaseDist = dist;
    chaseLateral = lateral;
    chaseHeight = height;
    firstFrame = true;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function setCameraMode(next) {
    mode = next;
    firstFrame = true;
  }

  /**
   * Move everything for one frame. `flight` is the flight state; `planeApi` drives
   * the prop; `ringsApi` refreshes the ring colours; `terrainApi` drifts clouds.
   */
  function draw(flight, planeApi, ringsApi, terrainApi, dt, time) {
    const s = flight.state;
    const p = groups.plane;

    // The plane itself: position plus yaw/pitch/roll, in the order the model uses.
    p.position.set(s.x, s.y, s.z);
    p.rotation.y = -s.yaw;
    p.rotation.x = s.pitch;
    p.rotation.z = -s.roll;
    planeApi.update(dt, s.throttle, time);
    // The dashboard needles follow the flight, every frame, in both views.
    if (planeApi.setGauges) planeApi.setGauges(s.y, s.speed, headingOf(s.yaw));

    tmpForward.set(Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));

    if (mode === CAMERA_COCKPIT) {
      // Pilot's head: high and a touch back, so the nose sits low in the frame
      // instead of filling it, and the dashboard reads at the bottom.
      // The camera turns with the plane, so the horizon rolls as the wings do.
      // v4: the head sits higher (+1.25, was +1.08) and further back (0.75 m,
      // was 0.45), and the camera aims a touch down (3.5 m below level at 60 m
      // out), so the whole dashboard — all three dials — fits inside the frame
      // with room to spare. The v3 head cropped the dials in half. The aim-down
      // also lifts the next ring into the upper-middle of the windshield,
      // instead of letting it fill the whole central view.
      tmpUp.set(0, 1, 0);
      camera.position.set(
        s.x - tmpForward.x * 0.75,
        s.y + 1.25,
        s.z - tmpForward.z * 0.75,
      );
      lookTarget.set(s.x + tmpForward.x * 60, s.y + tmpForward.y * 60 - 3.5, s.z + tmpForward.z * 60);
      camera.up.copy(tmpUp);
      camera.lookAt(lookTarget);
      // v3: only 30% of the bank reaches the camera. The v2 shot rolled the
      // horizon with the full bank, so the dashboard sat at a wild angle and
      // the horizon was extremely tilted; the pilot's head stays mostly level.
      camera.rotateZ(-s.roll * 0.3);
    } else {
      // Chase: hover behind and above, eased so it never snaps, looking ahead.
      // The lateral offset slides the plane across the frame (negative puts
      // it to the right) without changing where the camera looks.
      const rightX = Math.cos(s.yaw);
      const rightZ = Math.sin(s.yaw);
      const want = new THREE.Vector3(
        s.x - tmpForward.x * chaseDist + rightX * chaseLateral,
        s.y - tmpForward.y * chaseDist + chaseHeight,
        s.z - tmpForward.z * chaseDist + rightZ * chaseLateral,
      );
      if (firstFrame) {
        chasePos.copy(want);
        firstFrame = false;
      } else {
        const k = 1 - Math.exp(-dt * 4.5);
        chasePos.lerp(want, k);
      }
      camera.position.copy(chasePos);
      lookTarget.set(s.x + tmpForward.x * 34, s.y + tmpForward.y * 34, s.z + tmpForward.z * 34);
      camera.up.set(0, 1, 0);
      camera.lookAt(lookTarget);
      // Lean a third of the bank into the camera so turns feel banked, not flat.
      camera.rotateZ(-s.roll * 0.35);
    }

    // The ring guide chevron fades as the plane closes in, so it needs the
    // plane's position (the flight state carries x, y, z).
    ringsApi.refresh(time, s);
    terrainApi.update(dt);
    renderer.render(scene, camera);
  }

  return { draw, setCameraMode, setFov, setChase, get mode() { return mode; } };
}
