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
  renderer.toneMappingExposure = 1.05;

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
      tmpUp.set(0, 1, 0);
      camera.position.set(
        s.x - tmpForward.x * 0.45,
        s.y + 1.08,
        s.z - tmpForward.z * 0.45,
      );
      lookTarget.set(s.x + tmpForward.x * 60, s.y + tmpForward.y * 60, s.z + tmpForward.z * 60);
      camera.up.copy(tmpUp);
      camera.lookAt(lookTarget);
      camera.rotateZ(-s.roll);
    } else {
      // Chase: hover behind and above, eased so it never snaps, looking ahead.
      const want = new THREE.Vector3(
        s.x - tmpForward.x * 15,
        s.y - tmpForward.y * 15 + 4.5,
        s.z - tmpForward.z * 15,
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

    ringsApi.refresh(time);
    terrainApi.update(dt);
    renderer.render(scene, camera);
  }

  return { draw, setCameraMode, get mode() { return mode; } };
}
