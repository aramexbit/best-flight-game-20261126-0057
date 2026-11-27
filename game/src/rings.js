// The course: twelve glowing rings strung across the archipelago, ending on a
// runway on the big eastern island. The rings are planned backwards from the
// runway so the last leg is always a clean final approach into the low sun, and
// the spacing adapts so the course always arrives — it never runs out of sea.
// The next ring pulses bright and the HUD shows the distance to it, so a pilot
// who loses the thread can find it; there are no light pillars (v2 removed
// them — they read as debug graphics).

import { COURSE, PALETTE, SCORE } from './config.js';
import { islandHeightAt } from './terrain.js';

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Heading (yaw) that points from (x, z) toward (tx, tz). */
function headingTo(x, z, tx, tz) {
  return Math.atan2(tx - x, -(tz - z));
}

export function createCourse(random, seed, islands) {
  // The runway sits on the big island, pointing east, so the final approach flies
  // into the sunset. Its height is measured from the island itself.
  const home = islands[0];
  const runway = {
    x: home.x,
    z: home.z,
    dirX: 1,
    dirZ: 0,
    height: Math.max(18, islandHeightAt(islands, seed, home.x, home.z) * 0.85),
  };
  const approach = {
    x: runway.x - runway.dirX * COURSE.runwayPastRing,
    z: runway.z - runway.dirZ * COURSE.runwayPastRing,
    y: runway.height + 55,
  };

  // Walk from a western start toward the approach point, wandering early and
  // homing in late, so the course snakes between the islands.
  const rings = [];
  let x = -1700;
  let z = random.range(-500, 500);
  // v3: remember the walk's starting z. The loop below mutates `z` all the
  // way to the last ring, and the spawn heading used to be computed from that
  // mutated value — so the spawn pointed the plane ~80 degrees away from the
  // course's first leg, a turn no autopilot (and no human) can make in one
  // 224 m leg. The spawn must line up with the walk's first step instead.
  const startZ = z;
  let y = 150;
  for (let i = 0; i < COURSE.ringCount; i += 1) {
    const legsLeft = COURSE.ringCount - i;
    const dx = approach.x - x;
    const dz = approach.z - z;
    const dist = Math.hypot(dx, dz);
    const stepLen = i === COURSE.ringCount - 1
      ? dist
      // v19 (a): was clamp(dist / legsLeft, 120, 400). The legs come out
      // ~250 m, 3-4 s at 147 kts, so a player who just cleared ring 1
      // has little time to turn for ring 2 (v18 live playtest: 0/12,
      // closest 212 m, then the gap grew). The fix is NOT a higher
      // floor — v19's first attempt (260) made the walk overshoot the
      // approach and collapsed the final leg to 145 m, which the
      // Reference autopilot could not line up on (missed ring 12 by
      // 22.6 m). The fix is the pitch authority (test 7 proves a tap
      // moves ~2x more altitude now); the legs stay natural.
      : clamp(dist / legsLeft, COURSE.legMin, COURSE.legMax);
    // v20 (a): the FIRST legs are gentler — wander 0.12 rad (was
    // 0.22) and altitude jitter ±12 m (was ±28) for rings 1-3, so ring
    // 2 sits nearly straight ahead of ring 1 at nearly the same
    // altitude. The v19 live playtest failed ring 2 in 3/3 tap-steered
    // flights (closest 186 m, then the gap grew to kilometres): the
    // 206 m leg gives only ~3.7 s, and a ±28 m altitude step plus a
    // 0.22 rad wander is more correction than tap steering can make in
    // that time. The later rings keep the full wander/jitter, so the
    // course still snakes — only the opening is forgiving. The legs
    // stay ~206 m (legMin/legMax untouched — the v19 lesson: a higher
    // floor collapses the final leg).
    const early = i < 3;
    const wander = (1 - i / COURSE.ringCount) * (early ? 0.12 : 0.22);
    const heading = headingTo(x, z, approach.x, approach.z) + random.range(-wander, wander);
    x += Math.sin(heading) * stepLen;
    z += -Math.cos(heading) * stepLen;
    const targetY = approach.y + (y - approach.y) * (1 - (i + 1) / COURSE.ringCount);
    y = i === COURSE.ringCount - 1
      ? approach.y
      : clamp(targetY + random.range(early ? -12 : -28, early ? 12 : 28), COURSE.minRingAlt, COURSE.maxRingAlt);
    const nextHeading = i === COURSE.ringCount - 1
      ? Math.atan2(runway.dirX, -runway.dirZ)
      : headingTo(x, z, approach.x, approach.z);
    rings.push({
      x,
      y,
      z,
      // The facing is fixed below, once the spawn is known: each ring faces the
      // pilot flying in from the previous point, never the runway.
      axis: { x: 0, y: 0, z: -1 },
      radius: COURSE.ringRadius,
      passed: false,
    });
  }

  // v14: clearance pass — the user's own playtest found ring 3 buried in a
  // hillside, so every ring is lifted until its whole opening clears the
  // ground. The check uses the analytic island height (the same function
  // the terrain mesh is built from) with a 20 m margin over the 13 m ring
  // radius (Gemini's fix prompt asks for 18-25 m; 20 m sits in the middle
  // of that range), so the bottom of the ring sits at least 20 m above
  // the slope even where the analytic height and the triangulated mesh
  // disagree. The spawn is computed below from the (possibly lifted)
  // first ring, so the player still starts 10 m above ring 1.
  for (const ring of rings) {
    const ground = islandHeightAt(islands, seed, ring.x, ring.z);
    // 20 m over the ring radius: on a steep slope the triangulated mesh
    // can sit a few metres above the analytic height, and the ring's lower
    // rim must stay clear of that too.
    const floor = ground + COURSE.ringRadius + 20;
    if (ring.y < floor) ring.y = floor;
  }

  const first = rings[0];
  const spawnHeading = headingTo(-1700, startZ, first.x, first.z);
  const spawn = {
    x: first.x - Math.sin(spawnHeading) * 600,
    y: first.y + 10,
    z: first.z + Math.cos(spawnHeading) * 600,
    yaw: spawnHeading,
    speed: 55,
    throttle: 0.7,
  };

  // v16: leg clearance — the v15 live playtest crashed into a hill 4 s
  // after start: the spawn-to-ring-1 straight line crossed a ridge
  // higher than both endpoints (the ring floor only clears the ground
  // AT the ring, and the spawn sits 10 m above ring 1). Sample every
  // leg; if the terrain under the straight line rises within 45 m of
  // it, lift the destination ring so the line clears. The spawn follows
  // ring 1 up, so the first leg starts above the ridge too. Capped at
  // +120 m per ring, so no ring floats absurdly high.
  {
    const pts = [{ x: spawn.x, y: spawn.y, z: spawn.z }, ...rings];
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      let lift = 0;
      for (let k = 1; k < 8; k += 1) {
        const t = k / 8;
        const gx = a.x + (b.x - a.x) * t;
        const gz = a.z + (b.z - a.z) * t;
        const lineY = a.y + (b.y - a.y) * t;
        const need = islandHeightAt(islands, seed, gx, gz) + 45 - lineY;
        if (need > lift) lift = need;
      }
      if (lift > 0) rings[i - 1].y += Math.min(120, lift);
    }
    spawn.y = rings[0].y + 10;
  }

  // Face every ring along the leg that flies into it, so the opening is square
  // to the approach instead of tilted away from it.
  for (let i = 0; i < rings.length; i += 1) {
    const prev = i === 0 ? spawn : rings[i - 1];
    const dx = rings[i].x - prev.x;
    const dy = rings[i].y - prev.y;
    const dz = rings[i].z - prev.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    rings[i].axis = { x: dx / len, y: dy / len, z: dz / len };
  }

  let nextIndex = 0;
  let streak = 0;

  function nextRing() {
    return nextIndex < rings.length ? rings[nextIndex] : null;
  }

  function distanceToNext(px, py, pz) {
    const ring = nextRing();
    if (!ring) return 0;
    return Math.hypot(ring.x - px, ring.y - py, ring.z - pz);
  }

  /**
   * Check the segment the plane just flew for a crossing of the next ring's plane.
   * Returns null, or { passed, nearMiss, ring, centre, bonus }.
   */
  function checkPass(prev, pos) {
    const ring = nextRing();
    if (!ring) return null;
    const d0 = (prev.x - ring.x) * ring.axis.x + (prev.y - ring.y) * ring.axis.y + (prev.z - ring.z) * ring.axis.z;
    const d1 = (pos.x - ring.x) * ring.axis.x + (pos.y - ring.y) * ring.axis.y + (pos.z - ring.z) * ring.axis.z;
    // The axis points along the flight into the ring, so a crossing goes from
    // a negative dot (still before the ring plane) to a positive one (past it).
    if (d0 >= 0 || d1 < 0) return null;
    const t = d0 / (d0 - d1);
    const cx = prev.x + (pos.x - prev.x) * t;
    const cy = prev.y + (pos.y - prev.y) * t;
    const cz = prev.z + (pos.z - prev.z) * t;
    const centre = Math.hypot(cx - ring.x, cy - ring.y, cz - ring.z);
    if (centre <= ring.radius) {
      ring.passed = true;
      nextIndex += 1;
      const centreBonus = Math.round(SCORE.centreBonus * (1 - centre / ring.radius));
      streak += 1;
      const bonus = SCORE.ring + centreBonus + (streak - 1) * SCORE.streakStep;
      return { passed: true, nearMiss: false, ring: nextIndex, centre, bonus };
    }
    if (centre <= ring.radius * 1.7) {
      return { passed: false, nearMiss: true, ring: nextIndex + 1, centre, bonus: 10 };
    }
    return { passed: false, nearMiss: false, ring: nextIndex + 1, centre, bonus: 0 };
  }

  function reset() {
    for (const ring of rings) ring.passed = false;
    nextIndex = 0;
    streak = 0;
  }

  /**
   * v13: jump the course to `passed` rings (for a respawning rival that
   * rejoins behind the player — its next ring becomes the player's next
   * ring minus one, instead of a ring hundreds of metres behind it that
   * it would have to fly backwards to reach).
   */
  function setProgress(passed) {
    nextIndex = Math.max(0, Math.min(passed, rings.length));
    for (let i = 0; i < rings.length; i += 1) rings[i].passed = i < nextIndex;
    streak = 0;
  }

  return { rings, runway, spawn, approach, nextRing, distanceToNext, checkPass, reset, setProgress };
}

/** Build the visible rings, their glow halos and the next-ring guide. */
export function buildRingMeshes(THREE, course) {
  const group = new THREE.Group();
  // v11: a thicker tube (0.75 m, was COURSE.ringTube 0.5) and a stronger
  // glow (2.6x tube, 0.22 opacity, was 2.1x / 0.15) — thick glowing
  // circular geometry with golden light, per the redesign prompt. The pass
  // radius is unchanged (the tube is visual only; createCourse's ringRadius
  // still decides a pass), so the flight model is untouched.
  const ringGeo = new THREE.TorusGeometry(COURSE.ringRadius, 0.75, 12, 64);
  // v3: a thin outer glow layer around each ring (a fatter, faint torus in the
  // same gold), so the ring reads as light, not as a painted hoop.
  const glowGeo = new THREE.TorusGeometry(COURSE.ringRadius, 0.75 * 2.6, 10, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.ring, transparent: true, opacity: 0.22, depthWrite: false,
  });
  const nextMat = new THREE.MeshBasicMaterial({ color: PALETTE.ringNext });
  // v4: future rings at 0.45 (was 0.55) — the distant rings cluttered the sky
  // above the main ring in the v3 cover shot; a touch fainter, they read as
  // the course ahead instead of competing with the gate in front.
  const futureMat = new THREE.MeshBasicMaterial({ color: PALETTE.ring, transparent: true, opacity: 0.45 });
  // Completed rings go muted green-gold (blueprint), not bright green.
  const doneMat = new THREE.MeshBasicMaterial({ color: PALETTE.ringDone, transparent: true, opacity: 0.55 });
  // v2: the light pillars are gone (see below); no beacon geometry is built.

  // v2: no light pillars. The tall beacons read as debug graphics / rendering
  // artefacts to a fresh eye; the next ring's pulse and the HUD distance are
  // the wayfinding now. v4: the chevron is gone too — in the v3 cover shot the
  // little triangle above the ring read as one more stray shape competing with
  // the gate, and the small circles of the future rings already clutter the
  // sky above it. The next ring's pulse and the HUD distance carry the
  // wayfinding on their own.

  const meshes = course.rings.map((ring) => {
    const mesh = new THREE.Mesh(ringGeo, futureMat);
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(ring.axis.x, ring.axis.y, ring.axis.z),
    );
    group.add(mesh);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(mesh.position);
    glow.quaternion.copy(mesh.quaternion);
    group.add(glow);
    return { mesh, glow };
  });

  // v11: golden sparkle particles orbiting the next ring — a slow-spinning
  // cloud of tiny additive gold points scattered on the ring's
  // circumference, so the gate reads as glowing light with a subtle
  // particle effect (the redesign prompt's "subtle particle effects").
  // The points are decorative only: their positions use Math.random once
  // at build and never touch the course, the flight model or any seed.
  const sparkleGroup = new THREE.Group();
  const sparkles = (() => {
    const count = 48;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = COURSE.ringRadius + (Math.random() - 0.5) * 4;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // v11 (iterasi 2): the points wear a soft round glow texture — bare
    // PointsMaterial renders hard white squares, and the first v11 title
    // shot showed the sparkles as white confetti pixels around the ring.
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const dotCtx = dotCanvas.getContext('2d');
    const glow = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.4, 'rgba(255,230,92,0.9)');
    glow.addColorStop(1, 'rgba(255,230,92,0)');
    dotCtx.fillStyle = glow;
    dotCtx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dotCanvas);
    const mat = new THREE.PointsMaterial({
      color: 0xFFE65C, size: 1.6, sizeAttenuation: true, map: dotTex,
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  })();
  sparkleGroup.add(sparkles);
  sparkleGroup.visible = false;
  group.add(sparkleGroup);

  /** Recolour rings by state; the next one pulses so it reads at a glance. */
  function refresh(time, planePos) {
    // v4: planePos is unused now that the chevron is gone — kept in the
    // signature so the renderer call site does not change.
    void planePos;
    const next = course.nextRing();
    for (let i = 0; i < meshes.length; i += 1) {
      const ring = course.rings[i];
      const { mesh, glow } = meshes[i];
      if (ring.passed) {
        mesh.material = doneMat;
        mesh.scale.setScalar(1);
        glow.visible = false;
      } else if (next === ring) {
        mesh.material = nextMat;
        // The final ring pulses a touch harder, so the finish reads as special.
        const pulse = i === meshes.length - 1 ? 0.08 : 0.05;
        mesh.scale.setScalar(1 + pulse * Math.sin(time * 3.2));
        glow.visible = true;
        glow.scale.copy(mesh.scale);
        // v20: the next ring's glow PULSES in opacity too (0.22-0.34),
        // so the gate ahead reads as luminous light with a direction
        // of travel, not a static hoop — Gemini v20 asked for a crisp
        // luminous rim + pulse. The shared glow material is safe to
        // pulse: only the next ring's glow is visible at all.
        glowMat.opacity = 0.28 + 0.06 * Math.sin(time * 3.2);
      } else {
        mesh.material = futureMat;
        mesh.scale.setScalar(1);
        // v19 (Gemini v18 #1): the glow torus on EVERY ring read as a
        // giant transparent bubble/circle in the sky at distance. Only
        // the NEXT ring glows now; future rings are the plain gold hoop.
        glow.visible = false;
        glow.scale.setScalar(1);
      }
    }
    // v11: park the sparkles on the next ring and spin them slowly around
    // its normal, so the particle cloud orbits the gate the plane is
    // flying toward.
    if (next) {
      const idx = course.rings.indexOf(next);
      sparkleGroup.visible = true;
      sparkleGroup.position.copy(meshes[idx].mesh.position);
      sparkleGroup.quaternion.copy(meshes[idx].mesh.quaternion);
      sparkles.rotation.z = time * 0.6;
    } else {
      sparkleGroup.visible = false;
    }
  }

  return { group, refresh };
}
