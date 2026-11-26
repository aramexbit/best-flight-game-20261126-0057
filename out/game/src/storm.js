// v16: the STORM BATTLE — one localised daytime storm cell, never night.
// A tall spinning tornado/waterspout beside the mid-race rings (5-8),
// offset sideways so it NEVER covers a ring or the runway; a dark storm
// wall on the same side and bright cumulus elsewhere (terrain.js); slanted
// rain inside the cell; cloud-to-sea lightning; flak bursts along the
// outer island corridors; wind gusts that buffet the player's stick in
// live play. A second, smaller waterspout sits ahead of the spawn, so the
// title staging shows the storm too. Pure scenery + gusts: the flight
// model, the course and the sim never read it.

import { STORM } from './config.js';
import { createRandom } from './random.js';

/**
 * The gust at time t (a pure function of time). OpenGame layer 2: the
 * same function createStorm used internally, lifted to module level so
 * a headless test can apply it exactly as main.js does in live play.
 * Cosines, not sines: a sine's integral from phase 0 is (1 - cos),
 * which is >= 0 — a one-sided push that banked the plane right at
 * ~10°/s with no input (v16 live playtest). A cosine's integral is
 * a sine — zero-mean, so the buffet shakes the stick without ever
 * steering the plane. (The auto-level gate fix in flight.js is the
 * other half; this removes the bias itself.)
 */
export function gustAt(t) {
  return {
    roll: (Math.cos(t * 0.9) * 0.7 + Math.cos(t * 1.73) * 0.4) * STORM.gustAmp,
    pitch: Math.cos(t * 0.62 + 1.3) * 0.5 * STORM.gustAmp,
  };
}

export function createStorm(THREE, seed, course, islands, groundAt, effects) {
  const group = new THREE.Group();
  const rnd = createRandom(seed + 1601);

  // --- Anchor: beside ring 6, offset sideways from the course line. ---
  // Try both sides; prefer the sea side (a waterspout with spray at its
  // base), fall back to land. The offset (260 m) keeps the funnel clear
  // of every ring centre and the runway sightline.
  const ring6 = course.rings[5];
  const ring7 = course.rings[6];
  const ax = ring7.x - ring6.x;
  const az = ring7.z - ring6.z;
  const alen = Math.hypot(ax, az) || 1;
  const perpX = -az / alen;
  const perpZ = ax / alen;
  const midX = (ring6.x + ring7.x) / 2;
  const midZ = (ring6.z + ring7.z) / 2;
  let side = 1;
  if (groundAt(midX + perpX * 260, midZ + perpZ * 260) > 3
    && groundAt(midX - perpX * 260, midZ - perpZ * 260) <= 3) side = -1;
  const cellX = midX + perpX * 260 * side;
  const cellZ = midZ + perpZ * 260 * side;
  const cellGround = groundAt(cellX, cellZ);
  const baseY = Math.max(0.6, cellGround);

  // --- The tornado: 8 stacked open cone segments, wide at the top, ---
  // narrow at the base, spinning as one group with a slow wobble, plus
  // a white spray crown churning at its foot.
  // v17: the funnel is DARKER grey-blue, not pale white — the v16
  // funnel read as a thin white wisp with almost no contrast against
  // the bright sky (Gemini v16: "funnel tornado + hujan pucat, kontras
  // rendah"). A storm funnel is dark slate against daylight.
  const funnelMat = new THREE.MeshStandardMaterial({
    color: 0x9fb2c2, roughness: 0.9, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
  });
  const funnelDark = new THREE.MeshStandardMaterial({
    color: 0x7e93a8, roughness: 0.9, transparent: true, opacity: 0.9, side: THREE.DoubleSide,
  });
  function buildFunnel(scale) {
    const funnel = new THREE.Group();
    const segs = 8;
    for (let i = 0; i < segs; i += 1) {
      const rBot = (4 + i * 3.2) * scale;
      const rTop = (6 + i * 3.2) * scale;
      const h = 34 * scale;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, h, 10, 1, true),
        i % 2 ? funnelDark : funnelMat,
      );
      seg.position.y = (i * 32 + 17) * scale;
      // A slight spiral offset per segment, so the funnel reads as
      // twisting, not a straight stack of cups.
      seg.position.x = Math.sin(i * 0.9) * 2.5 * scale;
      seg.position.z = Math.cos(i * 0.9) * 2.5 * scale;
      funnel.add(seg);
    }
    // Spray crown at the foot: three flat white puffs churning on the
    // surface the funnel touches.
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0xf4feff, transparent: true, opacity: 0.7, depthWrite: false,
    });
    const sprayGeo = new THREE.SphereGeometry(1, 10, 6);
    for (let s = 0; s < 3; s += 1) {
      const spray = new THREE.Mesh(sprayGeo, sprayMat);
      spray.scale.set(16 * scale, 3.5 * scale, 16 * scale);
      spray.position.set(
        Math.cos(s * 2.1) * 6 * scale, 2.5 * scale + s * 1.5, Math.sin(s * 2.1) * 6 * scale,
      );
      funnel.add(spray);
    }
    // v17: a spray RING on the surface at the funnel's foot — a flat
    // white ring, so the waterspout reads as churning water, not a
    // smooth cone touching a flat sea (Gemini v17: tornado needs a
    // spray ring at its base).
    const sprayRing = new THREE.Mesh(
      new THREE.TorusGeometry(14 * scale, 1.4 * scale, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xf4feff, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    sprayRing.rotation.x = -Math.PI / 2;
    sprayRing.position.y = 1.5 * scale;
    funnel.add(sprayRing);
    return funnel;
  }
  const funnel = buildFunnel(1);
  funnel.position.set(cellX, baseY, cellZ);
  group.add(funnel);

  // --- Second waterspout ahead of the spawn (title staging). ---
  // 500 m along the course from the spawn, 180 m to the side: inside the
  // title camera's view, clear of ring 1 (600 m out, on the line).
  const spawn = course.spawn;
  const sfx = Math.sin(spawn.yaw);
  const sfz = -Math.cos(spawn.yaw);
  const spx = Math.cos(spawn.yaw);
  const spz = Math.sin(spawn.yaw);
  const spout2 = buildFunnel(0.55);
  const s2x = spawn.x + sfx * 500 + spx * 180;
  const s2z = spawn.z + sfz * 500 + spz * 180;
  spout2.position.set(s2x, Math.max(0.6, groundAt(s2x, s2z)), s2z);
  group.add(spout2);

  // --- The storm wall: ONE dark bank hugging the tornado side. ---
  // Seven overlapping rounded lobes in slate blue-grey, in an arc along
  // the course behind the funnel — a wall, not scattered puffs. The
  // bright cumulus banks (terrain.js) stay on the clear side.
  // v17: the lobes are BIGGER, DARKER and packed TIGHTER (spacing 80 m,
  // was 110) — the v16 wall read as a row of separate grey oval blobs,
  // one of which looked like a floating dark rock (Gemini v16). A storm
  // wall is one merged dark mass.
  const wall = new THREE.Group();
  const wallMats = [
    new THREE.MeshLambertMaterial({ color: 0x55677a, transparent: true, opacity: 0.98 }),
    new THREE.MeshLambertMaterial({ color: 0x64748a, transparent: true, opacity: 0.98 }),
    new THREE.MeshLambertMaterial({ color: 0x47586a, transparent: true, opacity: 0.98 }),
  ];
  const lobeGeo = new THREE.IcosahedronGeometry(1, 1);
  const wallAnchor = { x: cellX + perpX * 150 * side, z: cellZ + perpZ * 150 * side };
  for (let i = 0; i < 7; i += 1) {
    const lobe = new THREE.Mesh(lobeGeo, wallMats[i % wallMats.length]);
    const rx = 120 + rnd.range(0, 60);
    lobe.scale.set(rx, rx * rnd.range(0.5, 0.65), rx * rnd.range(0.75, 1.0));
    lobe.position.set(
      wallAnchor.x + (ax / alen) * (i - 3) * 80 + rnd.range(-20, 20),
      290 + rnd.range(-15, 45),
      wallAnchor.z + (az / alen) * (i - 3) * 80 + rnd.range(-20, 20),
    );
    lobe.rotation.y = rnd.range(0, Math.PI * 2);
    wall.add(lobe);
  }
  group.add(wall);

  // --- Slanted rain inside the cell: 350 streaks in a box over the ---
  // funnel, falling fast and slanting along the wind vector, wrapping
  // back to the top. A LineSegments cloud, no per-frame allocation.
  const RAIN_N = 350;
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainSeed = [];
  for (let i = 0; i < RAIN_N; i += 1) {
    rainSeed.push({
      x: cellX + rnd.range(-250, 250),
      y: 40 + rnd.range(0, 320),
      z: cellZ + rnd.range(-250, 250),
    });
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({
    color: 0xbcd8ee, transparent: true, opacity: 0.6,
  }));
  group.add(rain);
  function writeRain() {
    for (let i = 0; i < RAIN_N; i += 1) {
      const r = rainSeed[i];
      rainPos[i * 6] = r.x;
      rainPos[i * 6 + 1] = r.y;
      rainPos[i * 6 + 2] = r.z;
      rainPos[i * 6 + 3] = r.x + STORM.windX * 1.4;
      rainPos[i * 6 + 4] = r.y - 22;
      rainPos[i * 6 + 5] = r.z + STORM.windZ * 1.4;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  writeRain();

  // --- Lightning: one jagged bolt, rebuilt at a random spot in the ---
  // cell on each flash, plus a cold flash light. Daytime only: the
  // bolt and light are brief (0.12 s), the sky stays bright.
  const BOLT_PTS = 9;
  const boltPos = new Float32Array(BOLT_PTS * 3);
  const boltGeo = new THREE.BufferGeometry();
  boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPos, 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({
    color: 0xfff6b0, transparent: true, opacity: 0,
  }));
  group.add(bolt);
  const boltLight = new THREE.PointLight(0xcfe4ff, 0, 1200, 1);
  group.add(boltLight);
  let boltTimer = 3 + rnd.range(0, 3);
  let boltLife = 0;
  function strike() {
    const bx = cellX + rnd.range(-150, 150);
    const bz = cellZ + rnd.range(-150, 150);
    const topY = 330;
    const botY = Math.max(1, groundAt(bx, bz));
    for (let i = 0; i < BOLT_PTS; i += 1) {
      const k = i / (BOLT_PTS - 1);
      boltPos[i * 3] = bx + (rnd.range(-1, 1) * 22) * Math.sin(k * Math.PI);
      boltPos[i * 3 + 1] = topY + (botY - topY) * k;
      boltPos[i * 3 + 2] = bz + (rnd.range(-1, 1) * 22) * Math.sin(k * Math.PI);
    }
    boltGeo.attributes.position.needsUpdate = true;
    bolt.material.opacity = 1;
    boltLight.position.set(bx, (topY + botY) / 2, bz);
    boltLight.intensity = 700;
    boltLife = 0.12;
  }

  // --- Flak: a burst every STORM.flakEvery seconds on an outer ---
  // corridor — 300-500 m sideways off a mid-course ring, never on the
  // ring line, so the sightline to the next ring stays clean.
  let flakTimer = 4;

  function update(dt, t) {
    funnel.rotation.y += dt * 2.2;
    funnel.rotation.z = Math.sin(t * 0.5) * 0.03;
    spout2.rotation.y -= dt * 1.8;
    // The wall breathes slowly with the wind, ±30 m around its anchor.
    wall.position.x = Math.sin(t * 0.02) * 30;
    wall.position.z = Math.cos(t * 0.017) * 30;
    // Rain falls and drifts with the wind, wrapping to the top.
    for (let i = 0; i < RAIN_N; i += 1) {
      const r = rainSeed[i];
      r.y -= 55 * dt;
      r.x += STORM.windX * dt;
      r.z += STORM.windZ * dt;
      if (r.y < 40) {
        r.y = 360;
        r.x = cellX + rnd.range(-250, 250);
        r.z = cellZ + rnd.range(-250, 250);
      }
    }
    writeRain();
    // Lightning: random strikes every 4-9 s, a 0.12 s flash.
    boltTimer -= dt;
    if (boltTimer <= 0) {
      strike();
      boltTimer = 4 + rnd.range(0, 5);
    }
    if (boltLife > 0) {
      boltLife -= dt;
      if (boltLife <= 0) {
        bolt.material.opacity = 0;
        boltLight.intensity = 0;
      }
    }
    // Flak rhythm.
    flakTimer -= dt;
    if (flakTimer <= 0) {
      flakTimer = STORM.flakEvery;
      const idx = 3 + Math.floor(Math.random() * 7);
      const ring = course.rings[Math.min(idx, course.rings.length - 1)];
      const off = (300 + Math.random() * 200) * (Math.random() < 0.5 ? -1 : 1);
      effects.flak(
        ring.x + perpX * off,
        ring.y + (Math.random() * 70 - 30),
        ring.z + perpZ * off,
      );
    }
  }

  // OpenGame layer 2: gustAt is now the module-level export above;
  // the returned object still exposes it, so main.js is unchanged.
  return { group, update, gustAt, anchor: { x: cellX, z: cellZ } };
}
