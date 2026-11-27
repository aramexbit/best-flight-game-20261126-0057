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

/**
 * v21c (user 27 Nov 10:17): is the point (x, y, z) inside any
 * tornado's kill cylinder? Pure function (no THREE) so a headless
 * test can prove it and rivals.js can call it every step. A tornado
 * kills by 2D distance (inside its radius) AND height (between its
 * foot, baseY, and its crown, 264 m x scale — the funnel is 12
 * segments of 22 m). Returns the tornado or null. The PLAYER is
 * never tested against this (the user: the player keeps the storm
 * danger as now — gusts — the tornado kill is a RIVAL mechanic).
 */
export function tornadoAt(x, y, z, tornadoes) {
  for (const t of tornadoes) {
    const dx = x - t.x;
    const dz = z - t.z;
    if (dx * dx + dz * dz > t.radius * t.radius) continue;
    if (y < t.baseY || y > t.baseY + 264 * t.scale) continue;
    return t;
  }
  return null;
}

/** A point offset sideways from a ring, on the north/south side of the course. */
function spoutPos(course, ringIdx, offset, north) {
  const a = course.rings[Math.max(0, ringIdx - 1)];
  const b = course.rings[Math.min(course.rings.length - 1, ringIdx + 1)];
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  const r = course.rings[ringIdx];
  const c1 = { x: r.x + px * offset, z: r.z + pz * offset };
  const c2 = { x: r.x - px * offset, z: r.z - pz * offset };
  if (north) return c1.z < c2.z ? c1 : c2;
  return c1.z > c2.z ? c1 : c2;
}

/**
 * v22: the tornado LAYOUT as pure data — every waterspout's position,
 * kill radius and scale, computed from the course + ground only (no
 * THREE, no randomness), so a headless test can prove the geometry
 * (spout3's distance from ring 4, the ORANYE detour target inside its
 * kill cylinder) and createStorm just builds funnels from it. Each
 * cell has an `id`: main, spout2 (title), spout3 (ring 4), spout4
 * (ring 9, cover), spout5 (ring 10). The side/perp orientation of
 * the main cell is returned too, for the storm wall (createStorm).
 */
export function tornadoCells(course, groundAt) {
  // The main cell anchors beside ring 6, offset sideways from the
  // course line. Try both sides; prefer the sea side (a waterspout
  // with spray at its base), fall back to land. The offset (260 m)
  // keeps the funnel clear of every ring centre and the runway
  // sightline.
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
  const baseY = Math.max(0.6, groundAt(cellX, cellZ));
  // Second waterspout ahead of the spawn (title staging): 1100 m
  // along the course from the spawn, 450 m to the side, at 0.4 scale.
  const spawn = course.spawn;
  const sfx = Math.sin(spawn.yaw);
  const sfz = -Math.cos(spawn.yaw);
  const spx = Math.cos(spawn.yaw);
  const spz = Math.sin(spawn.yaw);
  const s2x = spawn.x + sfx * 1100 + spx * 450;
  const s2z = spawn.z + sfz * 1100 + spz * 450;
  const s2baseY = Math.max(0.6, groundAt(s2x, s2z));
  // v22: spout3 sits 60 m (was 70 m) from ring 4 — closer, so the
  // scripted ORANYE detour (rivals.js) reaches its 35 m kill radius
  // on a short detour and the kill fires ~15 s into the race, ahead
  // of the player near ring 4.
  const s3p = spoutPos(course, 3, 60, true);
  const s3baseY = Math.max(0.6, groundAt(s3p.x, s3p.z));
  const s4p = spoutPos(course, 8, 200, false);
  const s4baseY = Math.max(0.6, groundAt(s4p.x, s4p.z));
  const s5p = spoutPos(course, 9, 260, true);
  const s5baseY = Math.max(0.6, groundAt(s5p.x, s5p.z));
  const cells = [
    { id: 'main', x: cellX, z: cellZ, baseY, radius: 45, scale: 1 },
    { id: 'spout2', x: s2x, z: s2z, baseY: s2baseY, radius: 25, scale: 0.4 },
    { id: 'spout3', x: s3p.x, z: s3p.z, baseY: s3baseY, radius: 35, scale: 0.55 },
    { id: 'spout4', x: s4p.x, z: s4p.z, baseY: s4baseY, radius: 30, scale: 0.6 },
    { id: 'spout5', x: s5p.x, z: s5p.z, baseY: s5baseY, radius: 25, scale: 0.5 },
  ];
  return { cells, side, perpX, perpZ };
}

export function createStorm(THREE, seed, course, islands, groundAt, effects) {
  const group = new THREE.Group();
  const rnd = createRandom(seed + 1601);

  // --- The tornado layout (pure data — tornadoCells above). ---
  // `tornadoes` is the kill list (rivals.js) and the lightning cells.
  // `radius` is the KILL radius, not the visible funnel — the vortex
  // winds reach past the condensation funnel, and the crown is 46 m
  // x scale wide at the top. The player is never tested against it.
  const layout = tornadoCells(course, groundAt);
  const tornadoes = layout.cells;
  const { side, perpX, perpZ } = layout;
  const byId = (id) => tornadoes.find((t) => t.id === id);
  const main = byId('main');
  const cellX = main.x;
  const cellZ = main.z;
  const baseY = main.baseY;
  // The along-course direction (for the wall / anvil / deck placement).
  const ring6 = course.rings[5];
  const ring7 = course.rings[6];
  const ax = ring7.x - ring6.x;
  const az = ring7.z - ring6.z;
  const alen = Math.hypot(ax, az) || 1;
  const spawn = course.spawn;

  // --- The tornado: 12 stacked open cone segments, wide at the top, ---
  // narrow at the base, spinning as one group with a slow wobble, plus
  // a white spray crown churning at its foot.
  // v17: the funnel is DARKER grey-blue, not pale white — the v16
  // funnel read as a thin white wisp with almost no contrast against
  // the bright sky (Gemini v16: "funnel tornado + hujan pucat, kontras
  // rendah"). A storm funnel is dark slate against daylight.
  // v18: the funnel is darker still (#8ba0b5 / #6b7f92, was #9fb2c2 /
  // #7e93a8) and wider — Gemini's fix: the v17 funnel still read as a
  // straight pale cone, not a rotating storm column.
  // v19 (Gemini v18 #5): the 8 stacked cylinders STILL read as a stack
  // of cups — the steps between segments were visible and the 2.2 rad/s
  // spin of a smooth cone is invisible. Now 12 segments with a
  // CONTINUOUS taper (4 m at the foot to 46 m at the crown), darker
  // slate #3B4652 / #586675, and 18 spinning debris flecks on the
  // cone surface + at the base, so the rotation is readable from any
  // angle and the funnel reads as a vortex, not a stack.
  // v21 (Gemini v21 #1): the funnel is a SOFT VOLUMETRIC vortex,
  // not a solid cone — the outer layer is TRANSLUCENT (opacity 0.45,
  // was 0.9), so the sky shows through it and the hard "party-hat"
  // silhouette is gone; a second, narrower INNER funnel (0.55x the
  // radius, darker, opacity 0.6) spins the OTHER way, so the two
  // layers counter-rotate and the twist is readable; and three thin
  // helix rings wrap the funnel at 1/4, 1/2 and 3/4 height, tilted —
  // the "multi-ringed, twisting vortex" Gemini asked for. The debris
  // flecks + spray crown + spray ring stay (they already read as
  // churning spray at the base).
  const funnelMat = new THREE.MeshStandardMaterial({
    color: 0x46545f, roughness: 0.9, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  });
  const funnelDark = new THREE.MeshStandardMaterial({
    color: 0x5f707e, roughness: 0.9, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  });
  const funnelInnerMat = new THREE.MeshStandardMaterial({
    color: 0x2f3a45, roughness: 0.9, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  });
  function buildFunnel(scale) {
    const funnel = new THREE.Group();
    const segs = 12;
    const step = 22 * scale;
    for (let i = 0; i < segs; i += 1) {
      // Continuous taper: 4 m at the foot, 46 m at the crown.
      const rBot = (4 + 3.5 * i) * scale;
      const rTop = (4 + 3.5 * (i + 1)) * scale;
      // v22: segments OVERLAP by 4 m (was 1.5 m) — the v21 cover
      // shot still showed the horizontal segment steps on the right
      // tornado (a faceted grey cone with visible steps). Together
      // with the sheath below, the funnel reads as one vortex.
      const h = step + 4 * scale;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, h, 10, 1, true),
        i % 2 ? funnelDark : funnelMat,
      );
      seg.position.y = (i + 0.5) * step;
      // A slight spiral offset per segment, so the funnel reads as
      // twisting, not a straight stack of cups.
      seg.position.x = Math.sin(i * 0.9) * 2.5 * scale;
      seg.position.z = Math.cos(i * 0.9) * 2.5 * scale;
      funnel.add(seg);
    }
    // v21: the inner vortex — a narrower cone (0.55x the outer
    // radius) in darker slate at 0.6 opacity, so the funnel has
    // depth: a translucent outer sheath over a darker twisting core.
    // It is built as a second funnel group so update() can spin it
    // the other way (counter-rotation reads as a vortex, not a
    // spinning cone).
    const inner = new THREE.Group();
    for (let i = 0; i < segs; i += 1) {
      const rBot = (4 + 3.5 * i) * scale * 0.55;
      const rTop = (4 + 3.5 * (i + 1)) * scale * 0.55;
      const h = step + 4 * scale;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, h, 10, 1, true),
        funnelInnerMat,
      );
      seg.position.y = (i + 0.5) * step;
      seg.position.x = Math.sin(i * 0.9 + 0.6) * 1.4 * scale;
      seg.position.z = Math.cos(i * 0.9 + 0.6) * 1.4 * scale;
      inner.add(seg);
    }
    funnel.add(inner);
    funnel.userData.inner = inner;
    // v22: the outer SHEATH — one smooth open cone (translucent
    // 0.22) over the whole funnel, slightly wider than the segments,
    // so the stacked segments read as one continuous vortex instead
    // of a stack of cups (Gemini v21: faceted grey cone with visible
    // horizontal segment steps). It is smooth and faint; the
    // counter-rotating inner funnel + helix rings + debris still
    // carry the twist.
    const sheath = new THREE.Mesh(
      new THREE.CylinderGeometry(48 * scale, 6 * scale, 264 * scale, 12, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x46545f, roughness: 0.9, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    sheath.position.y = 132 * scale;
    funnel.add(sheath);
    // v21: three helix rings — thin translucent bands wrapping the
    // funnel at 1/4, 1/2 and 3/4 height, tilted, so the vortex reads
    // as multi-ringed and twisting instead of one smooth cone.
    const helixMat = new THREE.MeshBasicMaterial({
      color: 0xcfd8e3, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let hI = 0; hI < 3; hI += 1) {
      const hy = (0.25 + hI * 0.25) * 264 * scale;
      const hr = (4 + 3.5 * (hy / (22 * scale))) * scale * 1.05;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(hr, 1.6 * scale, 6, 28), helixMat);
      ring.rotation.x = Math.PI / 2 - 0.18;
      ring.rotation.y = hI * 0.9;
      ring.position.y = hy;
      funnel.add(ring);
    }
    // Spinning debris flecks on the cone surface — the funnel's spin
    // is otherwise invisible on a smooth cone. 10 flecks spiral up
    // the cone (radius follows the taper), 8 churn at the base.
    const fleckMat = new THREE.MeshStandardMaterial({ color: 0x2f3a45, roughness: 1 });
    const fleckGeo = new THREE.DodecahedronGeometry(1.2 * scale, 0);
    for (let f = 0; f < 10; f += 1) {
      const y = (20 + f * 22) * scale;
      const r = (4 + 3.5 * (y / (22 * scale))) * scale + 1.5 * scale;
      const a = f * 0.9 + y * 0.008;
      const fleck = new THREE.Mesh(fleckGeo, fleckMat);
      fleck.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      fleck.rotation.set(f * 1.1, f * 0.7, f * 1.3);
      funnel.add(fleck);
    }
    for (let f = 0; f < 8; f += 1) {
      const a = f * 0.8;
      const r = (8 + (f % 3) * 5) * scale;
      const fleck = new THREE.Mesh(fleckGeo, fleckMat);
      fleck.scale.setScalar(0.8 + (f % 3) * 0.3);
      fleck.position.set(Math.cos(a) * r, (2 + (f % 2) * 4) * scale, Math.sin(a) * r);
      fleck.rotation.set(f * 0.9, f * 1.4, f * 0.5);
      funnel.add(fleck);
    }
    // v20: a bigger spray crown at the foot — 5 puffs (was 3) — so
    // the vortex reads as churning dust/spray where it meets the sea,
    // not a clean cone touching down.
    const sprayMat = new THREE.MeshBasicMaterial({
      color: 0xf4feff, transparent: true, opacity: 0.7, depthWrite: false,
    });
    const sprayGeo = new THREE.SphereGeometry(1, 10, 6);
    for (let s = 0; s < 5; s += 1) {
      const spray = new THREE.Mesh(sprayGeo, sprayMat);
      spray.scale.set(16 * scale, 3.5 * scale, 16 * scale);
      spray.position.set(
        Math.cos(s * 1.26) * 6 * scale, 2.5 * scale + (s % 2) * 1.5, Math.sin(s * 1.26) * 6 * scale,
      );
      funnel.add(spray);
    }
    // v17: a spray RING on the surface at the funnel's foot — a flat
    // white ring, so the waterspout reads as churning water, not a
    // smooth cone touching a flat sea (Gemini v17: tornado needs a
    // spray ring at its base). v20: 18 m (was 14), matching the bigger crown.
    const sprayRing = new THREE.Mesh(
      new THREE.TorusGeometry(18 * scale, 1.4 * scale, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xf4feff, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    sprayRing.rotation.x = -Math.PI / 2;
    sprayRing.position.y = 1.5 * scale;
    funnel.add(sprayRing);
    // v22: a CROWN puff cluster at the funnel top — three dark
    // cloud puffs where the vortex meets the deck, so the funnel
    // does not end in a clean cut cone tip against the sky (Gemini
    // v21). Same dark slate family as the storm deck lobes.
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e3a47, roughness: 1, flatShading: false });
    const crownGeo = new THREE.IcosahedronGeometry(1, 1);
    for (let c = 0; c < 3; c += 1) {
      const puff = new THREE.Mesh(crownGeo, crownMat);
      const pr = (18 + c * 6) * scale;
      puff.scale.set(pr, pr * 0.55, pr * 0.8);
      puff.position.set(
        Math.cos(c * 2.1) * 12 * scale,
        (238 + c * 12) * scale,
        Math.sin(c * 2.1) * 12 * scale,
      );
      funnel.add(puff);
    }
    return funnel;
  }
  const funnel = buildFunnel(1);
  funnel.position.set(cellX, baseY, cellZ);
  group.add(funnel);

  // --- The other four funnels, built from the layout above. ---
  // spout2 (title staging, 0.4 scale) sits 1100 m along the course
  // from the spawn, 450 m to the side — far enough to read as a
  // distant column, not a spike over the beach (Gemini v20 title
  // critique). spout3 (ring 4, 60 m off, 0.55) arms the early
  // course; spout4 (ring 9, 200 m, 0.6) is the cover tornado;
  // spout5 (ring 10, 260 m, 0.5) arms the final stretch. All stay
  // OFF the ring line (the nearest is 60 m from a ring centre, the
  // kill radius 35 m), so no ring and no player line is ever
  // covered — the coordinator's readability rule.
  const spout2 = buildFunnel(0.4);
  const s2 = byId('spout2');
  spout2.position.set(s2.x, s2.baseY, s2.z);
  group.add(spout2);
  const s3p = byId('spout3');
  const spout3 = buildFunnel(0.55);
  spout3.position.set(s3p.x, s3p.baseY, s3p.z);
  group.add(spout3);
  const s4p = byId('spout4');
  const spout4 = buildFunnel(0.6);
  spout4.position.set(s4p.x, s4p.baseY, s4p.z);
  group.add(spout4);
  const s5p = byId('spout5');
  const spout5 = buildFunnel(0.5);
  spout5.position.set(s5p.x, s5p.baseY, s5p.z);
  group.add(spout5);

  // --- The storm wall: ONE dark bank hugging the tornado side. ---
  // Seven overlapping rounded lobes in slate blue-grey, in an arc along
  // the course behind the funnel — a wall, not scattered puffs. The
  // bright cumulus banks (terrain.js) stay on the clear side.
  // v17: the lobes are BIGGER, DARKER and packed TIGHTER (spacing 80 m,
  // was 110) — the v16 wall read as a row of separate grey oval blobs,
  // one of which looked like a floating dark rock (Gemini v16). A storm
  // wall is one merged dark mass.
  const wall = new THREE.Group();
  // v19 (Gemini v18 #5): the wall and anvil lobes are FACETED
  // (IcosahedronGeometry detail 0 + flatShading) in Gemini's dark
  // crown colours #3B4652 / #586675 — the smooth detail-1 lobes read
  // as separate grey oval blobs / floating rocks; faceted slabs merge
  // into one thunderhead mass.
  // v20 (f2): the storm lobes use SMOOTH shading (flatShading false,
  // detail 1, was flat detail 0) — the first v20 screenshots showed the
  // lightened anvil STILL reading as a black cut rock behind the title:
  // the problem was never just the colour, it is hard facet steps on a
  // dark surface. Smooth-shaded mid grey-blue reads as cloud volume;
  // the white cumulus banks keep their flat-shaded style (bright
  // facets read as cloud, dark facets read as rock).
  const wallMats = [
    new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x5a6c7e, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x42525f, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
  ];
  const lobeGeo = new THREE.IcosahedronGeometry(1, 1);
  // v21: the wall anchor moves FURTHER out (perp 320 m, was 220) and
  // the bank sits LOWER (y ~250, was ~280) — the v20 wall/anvil sat
  // behind the title text ("NUSANTARA") and read as lumpy grey blobs
  // over the hero. Further out + lower puts the dark bank at the
  // frame's right edge, below the title band, in the title shot —
  // while in flight it still reads as the storm cell beside the
  // course. The bank itself is now TEN smaller, FLATTER lobes
  // (rx 60-85 m, y-scale 0.35-0.45, spacing 45 m, was 6 lobes of
  // 100-150 m at 80 m) — a continuous dark thunderhead bank, not a
  // row of separate grey balls. A real storm bank is dark; smooth
  // shading keeps it cloud, not rock (the v20 lesson).
  const wallAnchor = { x: cellX + perpX * 320 * side, z: cellZ + perpZ * 320 * side };
  for (let i = 0; i < 10; i += 1) {
    const lobe = new THREE.Mesh(lobeGeo, wallMats[i % wallMats.length]);
    const rx = 60 + rnd.range(0, 25);
    lobe.scale.set(rx, rx * rnd.range(0.35, 0.45), rx * rnd.range(0.75, 1.0));
    lobe.position.set(
      wallAnchor.x + (ax / alen) * (i - 4.5) * 45 + rnd.range(-12, 12),
      250 + rnd.range(-12, 30),
      wallAnchor.z + (az / alen) * (i - 4.5) * 45 + rnd.range(-12, 12),
    );
    lobe.rotation.y = rnd.range(0, Math.PI * 2);
    wall.add(lobe);
  }
  // v21: the anvil is a SPREADING SHELF now — 6 flatter lobes
  // (rx 70-100 m, y-scale 0.3-0.4, y 290-315, was 4 lobes of
  // 100-140 m at y 320-350) above the same pushed-out anchor, so it
  // reads as the storm's spreading top, not a blob over the title.
  const anvilMats = [
    new THREE.MeshStandardMaterial({ color: 0x6b7e92, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x8296a8, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
  ];
  for (let i = 0; i < 6; i += 1) {
    const lobe = new THREE.Mesh(lobeGeo, anvilMats[i % anvilMats.length]);
    const rx = 70 + rnd.range(0, 30);
    lobe.scale.set(rx, rx * rnd.range(0.3, 0.4), rx * rnd.range(0.7, 0.95));
    lobe.position.set(
      wallAnchor.x + (ax / alen) * (i - 2.5) * 80 + rnd.range(-20, 20),
      290 + rnd.range(-8, 25),
      wallAnchor.z + (az / alen) * (i - 2.5) * 80 + rnd.range(-20, 20),
    );
    lobe.rotation.y = rnd.range(0, Math.PI * 2);
    wall.add(lobe);
  }
  // v21c: a SECOND, smaller storm wall at spout4 (ring 9) — six
  // flatter lobes (rx 50-70 m, y-scale 0.35-0.45) on an anchor 250 m
  // south of the spout, y ~235-250, so the mid-course has its own
  // dark thunderhead bank instead of one wall at the main cell.
  // Same group, so it breathes with the main wall.
  for (let i = 0; i < 6; i += 1) {
    const lobe = new THREE.Mesh(lobeGeo, wallMats[i % wallMats.length]);
    const rx = 50 + rnd.range(0, 20);
    lobe.scale.set(rx, rx * rnd.range(0.35, 0.45), rx * rnd.range(0.75, 1.0));
    lobe.position.set(
      s4p.x + (ax / alen) * (i - 2.5) * 40 + rnd.range(-10, 10),
      240 + rnd.range(-10, 15),
      s4p.z + 250 + (az / alen) * (i - 2.5) * 40 + rnd.range(-10, 10),
    );
    lobe.rotation.y = rnd.range(0, Math.PI * 2);
    wall.add(lobe);
  }
  // v21d: the STORM DECK — a black cumulonimbus ceiling over the
  // WHOLE course (user 27 Nov 11:49). The storm sky must feel
  // DOMINANT, not a few blobs, and the rings must sit UNDER black
  // clouds so flying through a ring feels like rain + lightning.
  // v22 (user 27 Nov 14:06: make the black deck WIDER): each
  // position along the course polyline now grows a CLUSTER of three
  // overlapping puffs — a big centre lobe (rx 120-160 m) plus two
  // satellites offset sideways ±(60-120) m — so the deck is ~400 m
  // wide, not one lobe wide, and reads as a cloud MASS instead of a
  // row of separate smooth ellipsoids (Gemini v21: coarse faceted
  // blobs). Spacing tightens to 200 m (was 220). The deck rides at
  // y ~262 m (was 248): the bigger lobes are deeper (ry up to 58 m),
  // so the ceiling rises to keep its base ~192 m — still 20 m above
  // the highest ring top (172 m), so the rings stay readable under
  // the black clouds and the deck never covers a ring or the plane
  // (the coordinator's rule). The deck is DARK (#0F172A / #1E293B /
  // #334155, opaque) — black rain clouds, not grey puffs. It lives
  // in the `wall` group so it breathes with the storm (±30 m). The
  // title stays clean: the hero camera looks NORTH from the spawn
  // and the course/deck run SOUTH + EAST, behind the camera.
  const deckMats = [
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 1, flatShading: false, transparent: true, opacity: 0.98 }),
  ];
  {
    const pts = [{ x: spawn.x, z: spawn.z },
      ...course.rings.map((r) => ({ x: r.x, z: r.z })),
      { x: course.runway.x, z: course.runway.z }];
    let acc = 0;
    let deckIdx = 0;
    const SPACING = 200;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / (segLen || 1);
      const dz = (b.z - a.z) / (segLen || 1);
      const px = -dz;
      const pz = dx;
      let d = SPACING - acc;
      while (d < segLen) {
        const cx = a.x + dx * d + px * rnd.range(-40, 40);
        const cz = a.z + dz * d + pz * rnd.range(-40, 40);
        const cy = 262 + rnd.range(-12, 12);
        // Centre lobe + two sideways satellites: one cluster reads
        // as a single thunderhead mass ~400 m wide.
        const puffs = [
          { off: 0, rx: 120 + rnd.range(0, 40), ys: rnd.range(0.28, 0.36), dy: 0 },
          { off: 60 + rnd.range(0, 60), rx: 70 + rnd.range(0, 40), ys: rnd.range(0.3, 0.4), dy: rnd.range(-15, 15) },
          { off: -(60 + rnd.range(0, 60)), rx: 70 + rnd.range(0, 40), ys: rnd.range(0.3, 0.4), dy: rnd.range(-15, 15) },
        ];
        for (const p of puffs) {
          const lobe = new THREE.Mesh(lobeGeo, deckMats[deckIdx % deckMats.length]);
          lobe.scale.set(p.rx, p.rx * p.ys, p.rx * rnd.range(0.8, 1.05));
          lobe.position.set(
            cx + px * p.off + dx * rnd.range(-40, 40),
            cy + p.dy,
            cz + pz * p.off + dz * rnd.range(-40, 40),
          );
          lobe.rotation.y = rnd.range(0, Math.PI * 2);
          wall.add(lobe);
          deckIdx += 1;
        }
        d += SPACING;
      }
      acc = (acc + segLen) % SPACING;
    }
  }
  group.add(wall);

  // --- Slanted rain inside the cells: one streak system per storm ---
  // cell, falling fast and slanting along the wind vector, wrapping
  // back to the top. A LineSegments cloud each, no per-frame allocation.
  // v21c (user 27 Nov 10:17 + 10:23): rain falls over FOUR cells now
  // (the main cell + spouts 3-5), not just the main cell — rain along
  // the whole course. The main cell keeps its exact 350-streak box
  // (±250 m, opacity 0.35); spout3 (close to the course) gets a
  // narrower box (±150 m, 200 streaks, fainter 0.3) so its rain stays
  // near the tornado instead of washing over the ring line; spouts
  // 4-5 get ±200 m, 250 streaks, 0.35.
  const rains = [];
  function makeRain(cx, cz, n, opacity, spread) {
    const seed = [];
    for (let i = 0; i < n; i += 1) {
      seed.push({
        x: cx + rnd.range(-spread, spread),
        y: 40 + rnd.range(0, 320),
        z: cz + rnd.range(-spread, spread),
      });
    }
    const pos = new Float32Array(n * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      // v18: pale ice-blue rain #E0F2FE at 0.45 opacity (was #BCD8EE at
      // 0.6) — Gemini's spec: the rain reads as bright streaks against
      // the dark cell, not grey smears.
      // v19: #E6F4FF at 0.35 opacity — lighter and fainter still, so the
      // rain reads as weather, not as bright scratches on the sky.
      color: 0xe6f4ff, transparent: true, opacity,
    }));
    group.add(line);
    const sys = { cx, cz, n, spread, seed, pos, geo, line };
    rains.push(sys);
    return sys;
  }
  function writeRain(sys) {
    for (let i = 0; i < sys.n; i += 1) {
      const r = sys.seed[i];
      sys.pos[i * 6] = r.x;
      sys.pos[i * 6 + 1] = r.y;
      sys.pos[i * 6 + 2] = r.z;
      // v22: streaks are LONGER (30 m, was 22) and slant harder
      // with the wind (x2.2, was x1.4) — Gemini v21: the v21 rain
      // was thin and disconnected from the sky/water. Thicker,
      // wind-blown streaks read as a storm, not scratches.
      sys.pos[i * 6 + 3] = r.x + STORM.windX * 2.2;
      sys.pos[i * 6 + 4] = r.y - 30;
      sys.pos[i * 6 + 5] = r.z + STORM.windZ * 2.2;
    }
    sys.geo.attributes.position.needsUpdate = true;
  }
  makeRain(cellX, cellZ, 350, 0.35, 250);
  makeRain(s3p.x, s3p.z, 200, 0.3, 150);
  makeRain(s4p.x, s4p.z, 250, 0.35, 200);
  makeRain(s5p.x, s5p.z, 250, 0.35, 200);
  // v21d: COURSE RAIN — rain falls under the deck along the whole
  // course (user 27 Nov 11:49), so the player flies through rain
  // when passing the rings. Three systems (rings 1-4, 5-8, 9-12),
  // each centred on its segment's midpoint, spread ±250 m, 300
  // streaks (v22, was 250), 0.38 opacity (was 0.32). The streaks
  // are thin/translucent — they add weather around the rings
  // without covering them.
  {
    const segMid = (i0, i1) => {
      const a = course.rings[i0];
      const b = course.rings[i1];
      return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    };
    const m1 = segMid(0, 3);
    makeRain(m1.x, m1.z, 300, 0.38, 250);
    const m2 = segMid(4, 7);
    makeRain(m2.x, m2.z, 300, 0.38, 250);
    const m3 = segMid(8, 11);
    makeRain(m3.x, m3.z, 300, 0.38, 250);
  }
  for (const sys of rains) writeRain(sys);

  // v22: SPLASH RINGS on the sea under the storm cells — expanding,
  // fading white rings where the rain hammers the water, so the
  // storm reads on the sea surface too (Gemini v21: rain disconnected
  // from the water). 4 cells x 8 rings, placed only where groundAt
  // <= 2 (open sea); a ring grows 5 -> 40 m and fades over ~2.5 s,
  // then respawns at a new random spot under its cell.
  const splashCells = [
    { x: cellX, z: cellZ },
    { x: s3p.x, z: s3p.z },
    { x: s4p.x, z: s4p.z },
    { x: s5p.x, z: s5p.z },
  ];
  const splashes = [];
  function placeSplash(sp) {
    for (let tries = 0; tries < 8; tries += 1) {
      const x = sp.cell.x + rnd.range(-180, 180);
      const z = sp.cell.z + rnd.range(-180, 180);
      if (groundAt(x, z) <= 2) {
        sp.mesh.position.x = x;
        sp.mesh.position.z = z;
        sp.mesh.visible = true;
        return;
      }
    }
    sp.mesh.visible = false;
  }
  {
    const splashGeo = new THREE.RingGeometry(0.85, 1, 24);
    const splashMat = new THREE.MeshBasicMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    for (const cell of splashCells) {
      for (let i = 0; i < 8; i += 1) {
        const ring = new THREE.Mesh(splashGeo, splashMat.clone());
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.5;
        ring.visible = false;
        group.add(ring);
        const sp = { mesh: ring, cell, age: rnd.range(0, 2.5), life: 2.5 };
        placeSplash(sp);
        splashes.push(sp);
      }
    }
  }

  // --- Lightning: three parallel jagged bolts + a glow sprite, ---
  // rebuilt at a random spot in the cell on each flash, plus a cold
  // flash light. Daytime only: the bolts and light are brief (0.2 s),
  // the sky stays bright.
  // v22: the v21 bolt was a single 1 px white zigzag, barely visible
  // in any screenshot (the v21 live playtest saw NO lightning in
  // 8 min). Now the strike is three parallel lines (the main bolt
  // plus two echoes offset ±2.5 m, so the bolt reads ~5 m thick) with
  // a radial glow sprite at the strike midpoint (~150 m, additive),
  // and the flash light is 1500 (was 700) — lightning must be
  // unmissable in a screenshot.
  const BOLT_PTS = 9;
  const BOLT_ECHOES = [-2.5, 0, 2.5];
  const bolts = BOLT_ECHOES.map(() => {
    const pos = new Float32Array(BOLT_PTS * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xfff6b0, transparent: true, opacity: 0,
    }));
    group.add(line);
    return { pos, geo, line };
  });
  const boltLight = new THREE.PointLight(0xcfe4ff, 0, 1200, 1);
  group.add(boltLight);
  // The glow sprite: a soft radial-gradient canvas texture, additive.
  const boltGlow = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,250,200,0.9)');
    g.addColorStop(0.35, 'rgba(200,220,255,0.45)');
    g.addColorStop(1, 'rgba(200,220,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    spr.scale.set(150, 150, 1);
    group.add(spr);
    return spr;
  })();
  let boltTimer = 2 + rnd.range(0, 2);
  let boltLife = 0;
  function strike(bx, bz, life) {
    // v21d: the bolt strikes NEAR THE RINGS too (user 27 Nov 11:49)
    // — the target is a random tornado cell OR a random ring, so the
    // lightning falls around the rings the player is flying through
    // (70% of strikes are ring strikes: 12 rings vs 5 tornadoes).
    // The bolt drops from y 330 through the deck (base ~192 m) past
    // the ring to the ground. Strikes come every 2-5 s now (was
    // 3-7 s) and the flash lasts 0.2 s (was 0.12 s) — more lightning
    // to feel, still a brief daytime flash.
    // `flash(x, z)` (below) passes explicit coordinates for a staged
    // screenshot; live play calls strike() with no arguments.
    if (bx === undefined) {
      const targets = [...tornadoes, ...course.rings];
      const cell = targets[Math.floor(rnd.range(0, targets.length))];
      bx = cell.x + rnd.range(-150, 150);
      bz = cell.z + rnd.range(-150, 150);
    }
    const topY = 330;
    const botY = Math.max(1, groundAt(bx, bz));
    // One jagged path, three parallel lines: the echoes follow the
    // main bolt with a fixed lateral offset, so the strike reads as
    // one thick bolt instead of three separate zigzags.
    const jitterX = [];
    const jitterZ = [];
    for (let i = 0; i < BOLT_PTS; i += 1) {
      const k = i / (BOLT_PTS - 1);
      const env = Math.sin(k * Math.PI);
      jitterX.push((rnd.range(-1, 1) * 22) * env);
      jitterZ.push((rnd.range(-1, 1) * 22) * env);
    }
    for (let e = 0; e < bolts.length; e += 1) {
      const off = BOLT_ECHOES[e];
      for (let i = 0; i < BOLT_PTS; i += 1) {
        const k = i / (BOLT_PTS - 1);
        bolts[e].pos[i * 3] = bx + jitterX[i] + off;
        bolts[e].pos[i * 3 + 1] = topY + (botY - topY) * k;
        bolts[e].pos[i * 3 + 2] = bz + jitterZ[i] + off * 0.6;
      }
      bolts[e].geo.attributes.position.needsUpdate = true;
      bolts[e].line.material.opacity = 1;
    }
    boltGlow.position.set(bx, (topY + botY) / 2, bz);
    boltGlow.material.opacity = 0.85;
    boltLight.position.set(bx, (topY + botY) / 2, bz);
    boltLight.intensity = 1500;
    boltLife = life || 0.2;
  }

  // v21d: force a strike at (x, z) for a staged screenshot — the bolt
  // is a real game element (the same strike() as live play), just
  // timed for the capture so the frame shows lightning by the next
  // ring. The bolt lands ~60 m east / 40 m north of the ring (beside
  // it, not through it) and stays lit 1.5 s, so it is still visible
  // when the screenshot is taken ~700 ms after __shotReady (the
  // staged shot does not call update() after staging, so the bolt
  // does not fade). Live play never calls this.
  function flash(x, z) {
    strike(x + 60, z - 40, 1.5);
  }

  // --- Flak: a burst every STORM.flakEvery seconds on an outer ---
  // corridor — 300-500 m sideways off a mid-course ring, never on the
  // ring line, so the sightline to the next ring stays clean.
  let flakTimer = 4;

  function update(dt, t) {
    funnel.rotation.y += dt * 2.2;
    // v21: the inner vortex counter-rotates (faster, the other way),
    // so the two layers twist against each other — a vortex, not a
    // spinning cone.
    if (funnel.userData.inner) funnel.userData.inner.rotation.y -= dt * 3.1;
    if (spout2.userData.inner) spout2.userData.inner.rotation.y -= dt * 2.6;
    funnel.rotation.z = Math.sin(t * 0.5) * 0.03;
    spout2.rotation.y -= dt * 1.8;
    // v21c: the three new spouts spin too (outer + counter-rotating inner).
    spout3.rotation.y += dt * 2.0;
    if (spout3.userData.inner) spout3.userData.inner.rotation.y -= dt * 2.8;
    spout4.rotation.y += dt * 2.1;
    if (spout4.userData.inner) spout4.userData.inner.rotation.y -= dt * 2.9;
    spout5.rotation.y += dt * 1.9;
    if (spout5.userData.inner) spout5.userData.inner.rotation.y -= dt * 2.7;
    // The wall breathes slowly with the wind, ±30 m around its anchor.
    wall.position.x = Math.sin(t * 0.02) * 30;
    wall.position.z = Math.cos(t * 0.017) * 30;
    // Rain falls and drifts with the wind, wrapping to the top — every cell.
    for (const sys of rains) {
      for (let i = 0; i < sys.n; i += 1) {
        const r = sys.seed[i];
        r.y -= 55 * dt;
        r.x += STORM.windX * dt;
        r.z += STORM.windZ * dt;
        if (r.y < 40) {
          r.y = 360;
          r.x = sys.cx + rnd.range(-sys.spread, sys.spread);
          r.z = sys.cz + rnd.range(-sys.spread, sys.spread);
        }
      }
      writeRain(sys);
    }
    // Lightning: random strikes every 2-5 s, a 0.2 s flash (v21d).
    boltTimer -= dt;
    if (boltTimer <= 0) {
      strike();
      boltTimer = 2 + rnd.range(0, 3);
    }
    // Splash rings expand + fade under the storm cells.
    for (const sp of splashes) {
      sp.age += dt;
      if (sp.age >= sp.life) {
        sp.age = 0;
        placeSplash(sp);
      }
      if (sp.mesh.visible) {
        const k = sp.age / sp.life;
        const s = 5 + k * 35;
        sp.mesh.scale.set(s, s, 1);
        sp.mesh.material.opacity = 0.5 * (1 - k);
      }
    }
    if (boltLife > 0) {
      boltLife -= dt;
      if (boltLife <= 0) {
        for (const b of bolts) b.line.material.opacity = 0;
        boltGlow.material.opacity = 0;
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
  // v21c: `tornadoes` is the kill list (rivals.js) and the lightning
  // cells — {id, x, z, baseY, radius, scale} per tornado.
  // v21d: `flash` forces a strike for a staged screenshot (main.js runShot).
  // v22: `bolts` (the 3 bolt lines) + `boltGlow` are exposed for the
  // live probe (A13: lightning must be visible) — main.js ignores them.
  return { group, update, gustAt, anchor: { x: cellX, z: cellZ }, tornadoes, flash, bolts, boltGlow };
}
