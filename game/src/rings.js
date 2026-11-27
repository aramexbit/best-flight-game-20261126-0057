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
  // v21c (user 27 Nov 10:17): LOW START — the walk starts low and
  // climbs toward the 145 m approach, so the early rings sit low
  // between the ridge islands and the course CLIMBS out of the sea
  // instead of cruising flat at 150 m. The clearance pass still lifts
  // any ring whose ground is too close.
  // v22: LINEAR climb — the v21 exponential lerp front-loaded the
  // climb (58→74→100: +16, +26 m steps) and the Weak pilot could
  // not track it (Weak 4/12, stuck orbiting ring 5 for 150+ s).
  // The course now climbs in even ~8 m steps from 50 m to the 145 m
  // approach, so the opening is a gentle staircase. The ramp starts
  // at 50 (not 55) so ring 1 lands at ~58 m — inside the 40-60 m
  // AGL low-start band test 22 guards. Early altitude jitter is
  // ±2 m (was ±12): with a 7.9 m base step, ±12 jitter could still
  // make a 32 m step, so the early opening must actually BE gentle,
  // not just average gentle. Rings 6+ keep the ±28 m jitter — the
  // challenge stays. Headless test 25 guards the early steps (<= 10 m).
  let y = 50;
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
    // v21: the FIRST legs are gentler for LONGER — rings 1-5 (was
    // 1-3): wander 0.12 rad and altitude jitter ±12 m. The v20 live
    // playtest failed ring 5 in 3/3 tap-steered flights (closest 76 m,
    // then the gap ballooned to 1-1.5 km): ring 5 is the first real
    // turn (wander jumps to 0.165 rad at i=3, 0.147 at i=4), and a
    // tapping pilot turns ~2-3°/s — not enough for a 17° course
    // change in one 206 m leg. Rings 1-5 now turn at most ~0.12 rad
    // per leg, so the opening is a gentle slalom a tap pilot can
    // follow; rings 6+ keep the full wander, so the course still
    // snakes. The legs stay ~206 m (the v19 lesson: a higher floor
    // collapses the final leg). Headless test 17 proves a tap pilot
    // passes ring 5; test 18 guards the leg lengths + turns.
    const early = i < 5;
    const wander = (1 - i / COURSE.ringCount) * (early ? 0.12 : 0.22);
    const heading = headingTo(x, z, approach.x, approach.z) + random.range(-wander, wander);
    x += Math.sin(heading) * stepLen;
    z += -Math.cos(heading) * stepLen;
    const targetY = 50 + (approach.y - 50) * (i + 1) / COURSE.ringCount;
    y = i === COURSE.ringCount - 1
      ? approach.y
      : clamp(targetY + random.range(early ? -2 : -28, early ? 2 : 28), COURSE.minRingAlt, COURSE.maxRingAlt);
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
      // v22: opening rings (1-5) are 16 m, the rest 13 m (config).
      radius: early ? COURSE.ringRadiusEarly : COURSE.ringRadius,
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
    // 20 m over the ring's OWN radius (v22: early rings are 16 m, so
    // their floor is ground + 36): on a steep slope the triangulated
    // mesh can sit a few metres above the analytic height, and the
    // ring's lower rim must stay clear of that too.
    const floor = ground + ring.radius + 20;
    if (ring.y < floor) ring.y = floor;
  }

  const first = rings[0];
  const spawnHeading = headingTo(-1700, startZ, first.x, first.z);
  const spawnX = first.x - Math.sin(spawnHeading) * 600;
  const spawnZ = first.z + Math.cos(spawnHeading) * 600;
  // v21c: LOW START — the plane spawns ~50 m above the sea/beach
  // (ground + 50), NOT 10 m above ring 1. The leg-clearance pass
  // below may lift ring 1 over the island skirt at the course's
  // start, but the spawn itself stays low: the opening is a low
  // climb out of the sea, then the course climbs through the hills.
  const spawn = {
    x: spawnX,
    y: islandHeightAt(islands, seed, spawnX, spawnZ) + 50,
    z: spawnZ,
    yaw: spawnHeading,
    speed: 55,
    throttle: 0.7,
  };

  // v16: leg clearance — the v15 live playtest crashed into a hill 4 s
  // after start: the spawn-to-ring-1 straight line crossed a ridge
  // higher than both endpoints (the ring floor only clears the ground
  // AT the ring, and the spawn sits 10 m above ring 1). Sample every
  // leg; if the terrain under the straight line rises within 25 m of
  // it, lift the destination ring so the line clears. The spawn follows
  // ring 1 up, so the first leg starts above the ridge too. Capped at
  // +120 m per ring, so no ring floats absurdly high.
  // v21c: the margin is 25 m (was 45). At the low start (50 m AGL)
  // a 45 m margin lifts ring 1 to 60 m — the line from the 50 m
  // spawn is only 35 m above the 14.5 m island skirt, so the pass
  // lifts the ring and the first leg CLIMBS. A climbing first leg
  // makes the autopilot's pitch positive, and the Weak pilot's
  // +/-0.5 bias then climbs much harder than it descends (the
  // autopilot pitch + bias is +0.8 up, -0.1 down) — the plane
  // rockets to 300-500 m and orbits ring 1 forever (sim Weak 0/12).
  // At 25 m the low line (35 m above the skirt) needs no lift, ring
  // 1 stays at its walk altitude (~51 m), the first leg is LEVEL,
  // the autopilot's pitch is ~0 and the Weak bias porpoises
  // symmetrically around the ring, as it did on the high course
  // (Weak 7/12). The ring floor (ground + 33) still guarantees every
  // ring clears its own ground, so 25 m here is a backstop, not the
  // primary clearance.
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
        const need = islandHeightAt(islands, seed, gx, gz) + 25 - lineY;
        if (need > lift) lift = need;
      }
      if (lift > 0) rings[i - 1].y += Math.min(120, lift);
    }
    // v21c: the spawn sits AT ring 1's altitude (was ground + 50,
    // then the old `spawn.y = rings[0].y + 10`). The first leg is
    // LEVEL, so the autopilot's pitch is ~0 and the Weak pilot's
    // +/-0.5 bias porpoises symmetrically around the ring, as it
    // did on the high course (Weak 7/12). A spawn 8-10 m BELOW ring
    // 1 makes the autopilot climb, and the climb + the bias is
    // asymmetric (input +0.8 up, -0.1 down) while the pitch loop
    // (gain 2.2, delayed 0.5-1.5 s in the Weak model) saturates to
    // full pitch-up after the opening descent — the plane rockets
    // to 300-500 m and orbits ring 1 forever (sim Weak 0/12). The
    // spawn is still LOW (ring 1 is at ~58 m over the sea, AGL
    // ~58 m — inside the user's 40-60 m band) and the course
    // climbs after ring 1; only the first 600 m is level.
    spawn.y = rings[0].y;
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

  // v21c: STEEP RIDGES flanking the course (user 27 Nov 10:17) — the
  // seed-1 course flies over open sea the whole way (ground 0-15 m
  // under rings 1-11, nothing within 200 m), so the "low start
  // between hills" needs real hills. Two pairs of narrow, tall ridge
  // islands flank the FINAL ring positions (450 m perpendicular, so
  // their skirts add < 2 m under the rings and the low course stays
  // low, while their 280-320 m crests fill the frame's edges): pair
  // A flanks ring 3, pair B ring 9. Placed HERE (not in
  // planIslands) because they must flank the ACTUAL course — fixed
  // positions break other seeds (seed 10's course runs over a fixed
  // southern ridge: ring 3 sits on it at ground 134 m, the leg
  // climbs 100 m in 203 m, the autopilot overshoots and crashes
  // into the ridge). Idempotent: createCourse runs once per rival
  // on the same islands array, so a ridge is only added if no
  // island already sits within 100 m of it.
  function addRidge(x, z, radius, height) {
    for (const isl of islands) {
      if (Math.hypot(isl.x - x, isl.z - z) < 100) return;
    }
    islands.push({ x, z, radius, height });
  }
  function flank(idx, offset, radius, height) {
    const a = rings[Math.max(0, idx - 1)];
    const b = rings[Math.min(rings.length - 1, idx + 1)];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const r = rings[idx];
    addRidge(r.x + px * offset, r.z + pz * offset, radius, height);
    addRidge(r.x - px * offset, r.z - pz * offset, radius, height);
  }
  flank(2, 450, 260, 300);
  flank(8, 450, 280, 320);

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
  // v22: TWO torus sizes — the opening rings (1-5) are 16 m, the rest
  // 13 m, and the visual torus MUST match the pass radius, or the
  // player flies through a hoop that looks bigger than the gate (or
  // clips a hoop that looks smaller). One geometry per size.
  const ringGeoEarly = new THREE.TorusGeometry(COURSE.ringRadiusEarly, 0.75, 12, 64);
  const ringGeo = new THREE.TorusGeometry(COURSE.ringRadius, 0.75, 12, 64);
  // v3: a thin outer glow layer around each ring (a fatter, faint torus in the
  // same gold), so the ring reads as light, not as a painted hoop.
  const glowGeoEarly = new THREE.TorusGeometry(COURSE.ringRadiusEarly, 0.75 * 2.0, 10, 64);
  const glowGeo = new THREE.TorusGeometry(COURSE.ringRadius, 0.75 * 2.0, 10, 64);
  const glowMat = new THREE.MeshBasicMaterial({
    color: PALETTE.ring, transparent: true, opacity: 0.20, depthWrite: false,
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
    const big = ring.radius > COURSE.ringRadius;
    const mesh = new THREE.Mesh(big ? ringGeoEarly : ringGeo, futureMat);
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(ring.axis.x, ring.axis.y, ring.axis.z),
    );
    group.add(mesh);
    const glow = new THREE.Mesh(big ? glowGeoEarly : glowGeo, glowMat);
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
        // v21: the next ring's glow is DAMPED (0.20-0.24, was
        // 0.28-0.34, tube 2.0x, was 2.6x) — the v20 live playtest saw
        // a "giant pale yellow translucent ring in the sky" that read
        // as a bubble; a thinner, fainter glow still reads as light
        // without filling the sky.
        glowMat.opacity = 0.20 + 0.04 * Math.sin(time * 3.2);
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
    // flying toward. v22: the sparkle cloud is built at the 13 m radius,
    // so it scales to the next ring's own radius (16 m for the opening
    // rings) — otherwise the sparkles orbit inside the big hoop.
    if (next) {
      const idx = course.rings.indexOf(next);
      sparkleGroup.visible = true;
      sparkleGroup.position.copy(meshes[idx].mesh.position);
      sparkleGroup.quaternion.copy(meshes[idx].mesh.quaternion);
      sparkleGroup.scale.setScalar(next.radius / COURSE.ringRadius);
      sparkles.rotation.z = time * 0.6;
    } else {
      sparkleGroup.visible = false;
    }
  }

  return { group, refresh };
}
