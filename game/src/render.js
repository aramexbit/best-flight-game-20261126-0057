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
  // v11: 1.22 — the vibrant premium grade needs the extra brightness so the
  // bright blue sky, turquoise sea and vivid grass read as saturated, not
  // washed by the ACES curve.
  renderer.toneMappingExposure = 1.22;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, WORLD.fogNear, WORLD.fogFar);
  scene.add(groups.terrain);
  scene.add(groups.rings);
  scene.add(groups.plane);

  // v5: the plane's blob shadow — a soft dark ellipse on the ground below the
  // plane. The v4 shots had no shadow at all, so the plane read as floating
  // and its altitude was unreadable. A radial-gradient canvas texture gives
  // the soft edge; the ellipse scales up and fades as the plane climbs, and
  // stays aligned with the wings, so the eye can read height at a glance.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  // v17: a harder-edged gradient (solid core to 50%, then a fast falloff)
  // so the shadow reads as a dark disc, not a faint haze — the v16 live
  // playtest saw at most one soft grey oval.
  grad.addColorStop(0, 'rgba(0,0,0,0.95)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGroup = new THREE.Group();
  const shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowGroup.add(shadowMesh);
  scene.add(shadowGroup);

  // v15: one blob shadow per rival — the user counted five planes and
  // one shadow, so each rival gets the same soft radial texture as the
  // player, with its own material so opacity fades independently.
  const rivalShadows = [];
  for (let i = 0; i < 4; i += 1) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    g.add(m);
    scene.add(g);
    rivalShadows.push({ group: g, mesh: m });
  }

  // v19 (d): CONTACT shadows — a dark ellipse directly under each
  // plane, visible only below 120 m AGL, fading with height. The
  // sun-offset shadow alone lands up to 50 m away from the plane and
  // reads as a separate dark patch; the contact shadow is what makes
  // a low plane (and the landing shot) read as touching the ground.
  // The v18 live playtest saw only ONE shadow in the whole frame —
  // the sun-offset shadows sat off-frame, and nothing anchored the
  // planes to the ground below them.
  const contactMesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  contactMesh.rotation.x = -Math.PI / 2;
  scene.add(contactMesh);
  const rivalContacts = [];
  for (let i = 0; i < 4; i += 1) {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 24),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    rivalContacts.push(m);
  }
  function placeContact(mesh, terrainApi, x, y, z, visible) {
    if (!visible) { mesh.visible = false; return; }
    const groundY = terrainApi && terrainApi.groundAt ? terrainApi.groundAt(x, z) : 0;
    const floorY = Math.max(groundY, 0.6);
    const agl = Math.max(0, y - floorY);
    if (agl > 120) { mesh.visible = false; return; }
    mesh.visible = true;
    mesh.position.set(x, floorY + 0.4, z);
    const sc = 8 + agl * 0.02;
    mesh.scale.set(sc, sc * 0.72, 1);
    mesh.material.opacity = 0.55 * (1 - agl / 120);
  }

  // v15: shared blob-shadow placement — the sun offset, growth and fade
  // are identical for the player and the rivals, so one helper places
  // any plane's shadow on the ground below it. `yaw` aligns the ellipse
  // with the wings; a hidden plane hides its shadow too.
  function placeShadow(group, mesh, terrainApi, x, y, z, yaw, visible) {
    if (!visible) { group.visible = false; return; }
    group.visible = true;
    const sunDir = terrainApi && terrainApi.sunDir ? terrainApi.sunDir : null;
    const sunElev = sunDir ? Math.asin(Math.max(0.1, Math.min(0.99, sunDir.y))) : 0.8;
    const sunH = sunDir ? Math.hypot(sunDir.x, sunDir.z) : 1;
    const groundY0 = terrainApi && terrainApi.groundAt ? terrainApi.groundAt(x, z) : 0;
    const altRough = Math.max(0, y - Math.max(groundY0, 0.6));
    // v17: the sun offset is CAPPED at 120 m — at cruise altitude the
    // uncapped offset (~260 m) put the shadow out of the frame, so the
    // plane looked shadowless. A capped offset keeps it ahead of the
    // plane where the camera can see it.
    // v19 (d): the cap drops to 50 m — the v18 live playtest still saw
    // only one shadow: at 120 m the offset shadow lands far from the
    // plane, often out of frame or on a distant hill. At 50 m it stays
    // near the plane, and the contact shadow (above) anchors the
    // plane to the ground directly below it.
    const offLen = Math.min(50, altRough / Math.tan(sunElev));
    const shadowX = x + (sunDir ? -sunDir.x / sunH * offLen : 0);
    const shadowZ = z + (sunDir ? -sunDir.z / sunH * offLen : 0);
    const floorY = Math.max(terrainApi && terrainApi.groundAt ? terrainApi.groundAt(shadowX, shadowZ) : 0, 0.6);
    const altAbove = Math.max(0, y - floorY);
    const shadowScale = 1 + altAbove * 0.004;
    group.position.set(shadowX, floorY + 0.5, shadowZ);
    group.rotation.y = -yaw;
    mesh.scale.set(9 * shadowScale, 6.5 * shadowScale, 1);
    // v17: darker (0.75 max) and a 0.3 floor, fading slower (0.0008/m)
    // — the v16 shadow (0.6 max, 0.405 at 150 m) was invisible live.
    mesh.material.opacity = Math.max(0.3, Math.min(0.75, 0.75 - altAbove * 0.0008));
  }

  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 9000);
  const chasePos = new THREE.Vector3(0, 200, 0);
  const lookTarget = new THREE.Vector3();
  const tmpForward = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();

  let mode = CAMERA_CHASE;
  let firstFrame = true;
  // v18c: the plane's position on the previous draw, for the chase
  // feedforward (see draw()). Reset whenever the camera is re-aimed so
  // a teleport (title orbit -> spawn on start) never injects a stale jump.
  let prevPlaneX = 0;
  let prevPlaneY = 0;
  let prevPlaneZ = 0;
  let prevPlaneValid = false;
  // Chase framing, set per scene by the game (title / flight / landing each
  // want their own distance, lateral offset and height — see the blueprint).
  let chaseDist = 15;
  let chaseLateral = 0;
  let chaseHeight = 4.5;
  // v17: how far ahead the chase camera looks (metres). The title
  // keeps 34 m; live flight uses 22 m, so the plane sits bigger and
  // the world ahead stays in frame.
  let chaseLookAhead = 34;

  // v13: camera shake amplitude in metres — set by triggerShake (a
  // near-miss flyby jolts the camera), decaying fast in draw so it reads
  // as a jolt, not a wobble.
  let shakeAmp = 0;
  function triggerShake(amp) {
    shakeAmp = Math.max(shakeAmp, amp);
  }

  /** Field of view in degrees; the title wants it wider, the landing narrower. */
  function setFov(fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  /** Chase camera geometry: metres behind, sideways and above the plane.
   * `lookAhead` (v17) is how far ahead the camera looks — shorter pulls
   * the plane bigger in frame and keeps the world ahead visible. */
  function setChase(dist, lateral, height, lookAhead = 34) {
    chaseDist = dist;
    chaseLateral = lateral;
    chaseHeight = height;
    chaseLookAhead = lookAhead;
    firstFrame = true;
    prevPlaneValid = false;
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
    prevPlaneValid = false;
  }

  /**
   * Move everything for one frame. `flight` is the flight state; `planeApi` drives
   * the prop; `ringsApi` refreshes the ring colours; `terrainApi` drifts clouds.
   */
  function draw(flight, planeApi, ringsApi, terrainApi, dt, time, rivalStates) {
    const s = flight.state;
    const p = groups.plane;

    // v18c: the plane's displacement since the last draw, for the chase
    // feedforward below. Tracked in both camera modes so switching back
    // to chase never inherits a stale jump.
    const planeDx = prevPlaneValid ? s.x - prevPlaneX : 0;
    const planeDy = prevPlaneValid ? s.y - prevPlaneY : 0;
    const planeDz = prevPlaneValid ? s.z - prevPlaneZ : 0;
    prevPlaneX = s.x;
    prevPlaneY = s.y;
    prevPlaneZ = s.z;
    prevPlaneValid = true;

    // The plane itself: position plus yaw/pitch/roll, in the order the model uses.
    p.position.set(s.x, s.y, s.z);
    p.rotation.y = -s.yaw;
    p.rotation.x = s.pitch;
    p.rotation.z = -s.roll;
    planeApi.update(dt, s.throttle, time);
    // The dashboard needles follow the flight, every frame, in both views.
    // v9: throttle and fuel drive the two outer gauges too.
    // v19: the 6th argument is the vertical speed — the left outer gauge
    // is a VSI now (plane.js), not a fuel gauge.
    if (planeApi.setGauges) planeApi.setGauges(s.y, s.speed, headingOf(s.yaw), s.throttle, s.fuel, s.verticalSpeed);

    tmpForward.set(Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));

    if (mode === CAMERA_COCKPIT) {
      // Pilot's head: lower (+0.90, was +1.35) and further forward (0.1 m
      // behind the centre, was 0.9), so the pilot sits close to the panel
      // instead of three metres behind it — the v8 head position left the
      // dashboard a small box spanning a fifth of the frame width, which
      // is why it read as floating. Now the widened v9 panel spans over
      // 40% of the frame width and the dials read at ~100 px. The camera
      // aims further down (-6.5 m at 60 m out, was -3.2) to keep the panel
      // band in the lower frame while the head sits lower.
      // The camera turns with the plane, so the horizon rolls as the wings do.
      tmpUp.set(0, 1, 0);
      camera.position.set(
        s.x - tmpForward.x * 0.1,
        s.y + 0.9,
        s.z - tmpForward.z * 0.1,
      );
      lookTarget.set(s.x + tmpForward.x * 60, s.y + tmpForward.y * 60 - 6.5, s.z + tmpForward.z * 60);
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
      // v18: the chase offset and look target use the YAW-ONLY horizontal
      // forward, never the pitch-inclusive forward. The old code put the
      // camera at plane - forward*dist, so at steep pitch the forward was
      // mostly vertical and the camera dropped UNDER the plane, looking up
      // at its belly and prop — the v16+v17 live playtests both saw the
      // camera "in front of the plane, staring at its nose" with the
      // world ahead invisible, while the straight-flight seed shots
      // looked fine. Now the camera always sits behind and above the
      // plane, looking forward along the heading, at every pitch and bank;
      // the look target keeps half the pitch so climbs still read.
      const hFwdX = Math.sin(s.yaw);
      const hFwdZ = -Math.cos(s.yaw);
      const want = new THREE.Vector3(
        s.x - hFwdX * chaseDist + rightX * chaseLateral,
        s.y + chaseHeight,
        s.z - hFwdZ * chaseDist + rightZ * chaseLateral,
      );
      if (firstFrame) {
        chasePos.copy(want);
        firstFrame = false;
      } else {
        // v18c: FEEDFORWARD — translate the camera by the plane's own
        // displacement first, so straight flight has zero steady-state
        // lag at ANY frame rate; the lerp below then only smooths the
        // offset error from turns and climbs. Without this, the lerp
        // chased a target running away at 75 m/s: at headless ~5 fps
        // the camera sat 25-150 m behind the plane (diagnosed 27 Nov
        // with NDC projection + a 3x-scale test — the plane was dead
        // centre in frame, angle 3.5 deg, but a 30-80 px speck lost in
        // the storm clutter) and even at 60 fps it lagged ~10 m, which
        // is the "plane small/lost" the v16/v17 playtests kept reporting.
        // The lerp dt is the REAL frame dt in live play now (main.js
        // passes frameDt; staged shots still pass 1/60), so the tracking
        // rate no longer collapses at low FPS either.
        chasePos.x += planeDx;
        chasePos.y += planeDy;
        chasePos.z += planeDz;
        // v17: tighter tracking (6.5, was 4.5) — the camera stays glued
        // to the plane in turns instead of lagging behind and letting
        // the plane drift out of frame.
        // v18: rate 8 (was 6.5) + a HEIGHT FLOOR. The lerp runs once
        // per rendered frame with a FIXED 1/60 dt while the sim can
        // advance several steps per frame at low FPS, so in a climb
        // the camera lagged up to 8 m BELOW the plane (live probe A5:
        // 30/120 bad samples, min above -8 m) — the plane's belly
        // filled the frame and the world ahead vanished, the v16/v17
        // complaint in a new shape. The floor holds the camera at
        // least 2.5 m above the plane at all times; the lerp still
        // governs the rest of the tracking.
        const k = 1 - Math.exp(-dt * 8);
        chasePos.lerp(want, k);
        if (chasePos.y < s.y + 2.5) chasePos.y = s.y + 2.5;
      }
      camera.position.copy(chasePos);
      lookTarget.set(
        s.x + hFwdX * chaseLookAhead,
        s.y + Math.sin(s.pitch) * chaseLookAhead * 0.5,
        s.z + hFwdZ * chaseLookAhead,
      );
      camera.up.set(0, 1, 0);
      camera.lookAt(lookTarget);
      // v17: only 15% of the bank reaches the camera (was 35%) — the
      // world tilted diagonally on every sharp bank in the v16 live
      // playtest, and the plane slid out of frame with it.
      camera.rotateZ(-s.roll * 0.15);
    }

    // v5: blob shadow, placed where the sun actually puts it — offset from the
    // plane's ground point away from the sun by altitude / tan(sun elevation).
    // A shadow straight below the plane is never in frame (the chase camera
    // looks forward, and the ground below the plane sits ~70° down); the
    // sun-offset shadow lands ahead of the plane on the runway and hills,
    // where the camera can see it. v15: the placement now lives in
    // placeShadow() above, shared with the four rival shadows below.
    placeShadow(shadowGroup, shadowMesh, terrainApi, s.x, s.y, s.z, s.yaw, true);
    // v15: the rivals get the same blob shadow as the player (the user
    // counted five planes and one shadow) — same sun offset, same growth
    // and fade with altitude, hidden when the rival is out of the race.
    // rivalStates comes from rivals.debug(); a rival reports no yaw, so
    // its ellipse stays axis-aligned instead of wing-aligned.
    const rivalsList = rivalStates || [];
    for (let i = 0; i < rivalShadows.length; i += 1) {
      const rs = rivalsList[i];
      if (!rs) { rivalShadows[i].group.visible = false; continue; }
      placeShadow(rivalShadows[i].group, rivalShadows[i].mesh, terrainApi, rs.x, rs.y, rs.z, 0, rs.visible);
    }
    // v19 (d): the contact shadows — directly under each plane, so the
    // landing shot and any low pass read the height at a glance.
    placeContact(contactMesh, terrainApi, s.x, s.y, s.z, true);
    for (let i = 0; i < rivalContacts.length; i += 1) {
      const rs = rivalsList[i];
      placeContact(rivalContacts[i], terrainApi, rs ? rs.x : 0, rs ? rs.y : 0, rs ? rs.z : 0, !!rs && rs.visible);
    }

    // v13: camera shake — applied after the lookAt, as a pure translation,
    // so the frame jolts without changing where the camera looks.
    if (shakeAmp > 0.005) {
      camera.position.x += (Math.random() - 0.5) * shakeAmp;
      camera.position.y += (Math.random() - 0.5) * shakeAmp;
      camera.position.z += (Math.random() - 0.5) * shakeAmp;
      shakeAmp *= Math.exp(-dt * 6);
    }

    // The ring guide chevron fades as the plane closes in, so it needs the
    // plane's position (the flight state carries x, y, z).
    ringsApi.refresh(time, s);
    terrainApi.update(dt);
    renderer.render(scene, camera);
  }

  // v17: the live probes project the next ring through this camera to
  // check the HUD arrow points where the ring actually is on screen.
  return { draw, setCameraMode, setFov, setChase, triggerShake, scene, get mode() { return mode; }, get camera() { return camera; } };
}
