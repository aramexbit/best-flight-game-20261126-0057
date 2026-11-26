// The course: twelve glowing rings strung across the archipelago, ending on a
// runway on the big eastern island. The rings are planned backwards from the
// runway so the last leg is always a clean final approach into the low sun, and
// the spacing adapts so the course always arrives — it never runs out of sea.
// A tall light pillar marks each ring so a pilot who loses the thread can find it.

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
  let y = 150;
  for (let i = 0; i < COURSE.ringCount; i += 1) {
    const legsLeft = COURSE.ringCount - i;
    const dx = approach.x - x;
    const dz = approach.z - z;
    const dist = Math.hypot(dx, dz);
    const stepLen = i === COURSE.ringCount - 1
      ? dist
      : clamp(dist / legsLeft, 120, 400);
    const wander = (1 - i / COURSE.ringCount) * 0.55;
    const heading = headingTo(x, z, approach.x, approach.z) + random.range(-wander, wander);
    x += Math.sin(heading) * stepLen;
    z += -Math.cos(heading) * stepLen;
    const targetY = approach.y + (y - approach.y) * (1 - (i + 1) / COURSE.ringCount);
    y = i === COURSE.ringCount - 1
      ? approach.y
      : clamp(targetY + random.range(-28, 28), COURSE.minRingAlt, COURSE.maxRingAlt);
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

  const first = rings[0];
  const spawnHeading = headingTo(-1700, z, first.x, first.z);
  const spawn = {
    x: first.x - Math.sin(spawnHeading) * 600,
    y: first.y + 10,
    z: first.z + Math.cos(spawnHeading) * 600,
    yaw: spawnHeading,
    speed: 55,
    throttle: 0.7,
  };

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

  return { rings, runway, spawn, approach, nextRing, distanceToNext, checkPass, reset };
}

/** Build the visible rings and their light pillars; returns the group and a refresh(t). */
export function buildRingMeshes(THREE, course) {
  const group = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(COURSE.ringRadius, COURSE.ringTube, 12, 42);
  const nextMat = new THREE.MeshBasicMaterial({ color: PALETTE.ringNext });
  const futureMat = new THREE.MeshBasicMaterial({ color: PALETTE.ring, transparent: true, opacity: 0.55 });
  const doneMat = new THREE.MeshBasicMaterial({ color: PALETTE.hudGood, transparent: true, opacity: 0.5 });
  const beaconGeo = new THREE.CylinderGeometry(1.4, 1.4, 420, 8, 1, true);
  const beaconNext = new THREE.MeshBasicMaterial({
    color: PALETTE.ringNext, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
  });
  const beaconFuture = new THREE.MeshBasicMaterial({
    color: PALETTE.ring, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
  });

  const meshes = course.rings.map((ring) => {
    const mesh = new THREE.Mesh(ringGeo, futureMat);
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(ring.axis.x, ring.axis.y, ring.axis.z),
    );
    group.add(mesh);
    const beacon = new THREE.Mesh(beaconGeo, beaconFuture);
    beacon.position.set(ring.x, ring.y + 150, ring.z);
    group.add(beacon);
    return { mesh, beacon };
  });

  /** Recolour rings by state; the next one pulses so it reads at a glance. */
  function refresh(time) {
    for (let i = 0; i < meshes.length; i += 1) {
      const ring = course.rings[i];
      const { mesh, beacon } = meshes[i];
      if (ring.passed) {
        mesh.material = doneMat;
        beacon.material = beaconFuture;
        beacon.visible = false;
        mesh.scale.setScalar(1);
      } else if (course.nextRing() === ring) {
        mesh.material = nextMat;
        beacon.material = beaconNext;
        beacon.visible = true;
        mesh.scale.setScalar(1 + 0.05 * Math.sin(time * 3.2));
      } else {
        mesh.material = futureMat;
        beacon.material = beaconFuture;
        beacon.visible = true;
        mesh.scale.setScalar(1);
      }
    }
  }

  return { group, refresh };
}
