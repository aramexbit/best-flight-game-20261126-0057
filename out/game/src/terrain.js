// The archipelago: seeded islands rising out of a teal sea, golden-hour sky and
// drifting clouds. The height function is pure maths, so the mesh, the flight
// model's ground checks and the course planner all agree on where the land is.
// The runway island is flattened into a strip before the mesh is built, so a
// landing there is exact rather than approximate.

import { COURSE, PALETTE, WORLD } from './config.js';
import { createNoise, createRandom } from './random.js';

/** Place the islands: a big one near the centre-east for the runway, the rest spread out. */
export function planIslands(random) {
  const islands = [];
  const half = WORLD.size / 2 - 420;
  // The runway island is the biggest and sits east of centre, so the course flies
  // west-to-east into the low sun.
  islands.push({ x: 1250, z: 120, radius: 780, height: WORLD.maxHeight * 0.62 });
  for (let i = 1; i < WORLD.islandCount; i += 1) {
    const angle = (i / (WORLD.islandCount - 1)) * Math.PI * 2 + random.range(-0.4, 0.4);
    const dist = random.range(900, 1750);
    islands.push({
      x: Math.cos(angle) * dist + random.range(-220, 220),
      z: Math.sin(angle) * dist + random.range(-220, 220),
      radius: random.range(300, 640),
      height: random.range(150, WORLD.maxHeight),
    });
  }
  // Keep the islands from piling on top of each other.
  for (let i = 1; i < islands.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const dx = islands[i].x - islands[j].x;
      const dz = islands[i].z - islands[j].z;
      const min = (islands[i].radius + islands[j].radius) * 0.55;
      const d = Math.hypot(dx, dz);
      if (d < min && d > 1) {
        islands[i].x += (dx / d) * (min - d);
        islands[i].z += (dz / d) * (min - d);
      }
    }
  }
  return islands;
}

/** The raw island height at (x, z), before any runway flattening. */
function islandHeight(islands, fbm, x, z) {
  let h = 0;
  for (let i = 0; i < islands.length; i += 1) {
    const isl = islands[i];
    const dx = x - isl.x;
    const dz = z - isl.z;
    const d2 = (dx * dx + dz * dz) / (isl.radius * isl.radius);
    if (d2 > 4) continue;
    const bump = Math.exp(-d2 * 2.1);
    const detail = 0.62 + 0.38 * fbm(x * 0.0016 + i * 7.3, z * 0.0016 - i * 3.1, 3);
    // v3: a second, higher-frequency detail term, so the big smooth bump breaks
    // into distinct low-poly hills instead of one unbroken green dome.
    const detail2 = 0.85 + 0.15 * fbm(x * 0.006 + i * 3.7, z * 0.006 - i * 5.9, 2);
    h += isl.height * bump * detail * detail2;
  }
  return h;
}

function smoothstep(a, b, t) {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
}

/**
 * The raw island height at one point, rebuilt from the seed alone so the course
 * planner and the mesh builder always agree, whatever order they run in.
 */
export function islandHeightAt(islands, seed, x, z) {
  return islandHeight(islands, createNoise(createRandom(seed)), x, z);
}

// A 3x5 block font for runway numbers: each digit is 3 columns by 5 rows of
// small white slabs, laid out flat with the digit tops toward local -Z, so the
// caller rotates the group to face the approach that uses that threshold.
const RUNWAY_DIGITS = {
  '0': ['111', '101', '101', '101', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '9': ['111', '101', '111', '001', '111'],
};

function buildRunwayNumber(THREE, text, mat) {
  const group = new THREE.Group();
  const cell = 1.2;
  const blockGeo = new THREE.PlaneGeometry(cell * 0.92, cell * 0.92);
  const totalW = text.length * 3 * cell + (text.length - 1) * cell;
  for (let d = 0; d < text.length; d += 1) {
    const glyph = RUNWAY_DIGITS[text[d]];
    if (!glyph) continue;
    const x0 = -totalW / 2 + d * 4 * cell;
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 3; c += 1) {
        if (glyph[r][c] !== '1') continue;
        const block = new THREE.Mesh(blockGeo, mat);
        block.rotation.x = -Math.PI / 2;
        block.position.set(x0 + (c + 0.5) * cell, 0, -2.5 * cell + (r + 0.5) * cell);
        group.add(block);
      }
    }
  }
  return group;
}

/**
 * Build the world. `runway` is {x, z, dirX, dirZ, height} from the course planner.
 * Returns the Three.js group, a groundAt(x, z) that matches the mesh, and update(dt).
 */
export function buildTerrain(THREE, seed, islands, runway) {
  const fbm = createNoise(createRandom(seed));
  const group = new THREE.Group();

  // The runway strip, in its own frame: along the strip and across it.
  const dirX = runway.dirX;
  const dirZ = runway.dirZ;
  const perpX = -dirZ;
  const perpZ = dirX;
  function runwayBlend(x, z) {
    const rx = x - runway.x;
    const rz = z - runway.z;
    const along = rx * dirX + rz * dirZ;
    const across = rx * perpX + rz * perpZ;
    const a = 1 - smoothstep(COURSE.runwayLength / 2 - 30, COURSE.runwayLength / 2 + 60, Math.abs(along));
    // v3: the flat zone spans the full strip width (it used to start fading
    // 6 m inside the edge, so the terrain poked through the strip's edges by
    // a hair); the shoulders sit on the blend just outside the strip.
    const c = 1 - smoothstep(COURSE.runwayWidth / 2, COURSE.runwayWidth / 2 + 55, Math.abs(across));
    return a * c;
  }

  function groundAt(x, z) {
    const h = islandHeight(islands, fbm, x, z);
    const b = runwayBlend(x, z);
    return b > 0 ? h * (1 - b) + runway.height * b : h;
  }

  // --- Land: a displaced grid with vertex colours by height and slope. ---
  // v3: 160 segments (was 120), so the hills and the shoreline resolve finer.
  const SEG = 160;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(PALETTE.sand);
  const grass = new THREE.Color(PALETTE.grass);
  const grassLight = new THREE.Color(PALETTE.grassLight);
  const forest = new THREE.Color(PALETTE.forest);
  const rock = new THREE.Color(PALETTE.rock);
  const snow = new THREE.Color(PALETTE.snow);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = groundAt(x, z);
    pos.setY(i, h);
    // Slope from a small finite difference, for rock on steep faces.
    const slope = Math.abs(groundAt(x + 24, z) - h) + Math.abs(groundAt(x, z + 24) - h);
    const jitter = fbm(x * 0.01, z * 0.01, 2) * 0.08;
    // v2: a wet-sand band at the waterline and a wider beach, so the sea-to-land
    // edge reads as a shore instead of a hard cut; steep faces turn to rock
    // sooner, so they no longer sit as flat dark-green slabs in the foreground.
    if (h < 2.5) tmp.copy(sand).offsetHSL(0, 0.05, -0.08);
    else if (h < 8) tmp.copy(sand);
    else if (h < 150) {
      // v3: light-grass patches break the flat green, then forest in the folds.
      tmp.copy(grass).lerp(grassLight, Math.max(0, fbm(x * 0.006 + 4.2, z * 0.006 - 2.8, 2)) * 0.6);
      tmp.lerp(forest, Math.max(0, fbm(x * 0.004, z * 0.004, 2)) * 0.7);
    }
    else if (h < 270) tmp.copy(forest).lerp(rock, Math.min(1, slope / 22));
    else if (h < 350) tmp.copy(rock);
    else tmp.copy(rock).lerp(snow, Math.min(1, (h - 350) / 40));
    if (slope > 22) tmp.lerp(rock, 0.55);
    tmp.offsetHSL(0, 0, jitter);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, metalness: 0,
  }));
  group.add(land);

  // --- Runway, v3: a full airport strip, not a dark line. Asphalt #555A55,
  // 450 m x 28 m, flat, with 3 m sand shoulders each side; white edge lines;
  // a dashed centreline (12 m dashes, 18 m gaps); six piano-key threshold
  // stripes at each end; aiming points 30 m beyond each threshold; the runway
  // number at each threshold ("09" west, "27" east, built from a 3x5 block
  // font); edge lights (white, red at the far end, green at the threshold)
  // and a short approach-light row before the western threshold — so the
  // runway reads from its shape and markings first, not from tiny lights. ---
  const stripAngle = -Math.atan2(dirZ, dirX);
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(COURSE.runwayLength, COURSE.runwayWidth),
    new THREE.MeshStandardMaterial({ color: '#555A55', roughness: 0.85 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.rotation.z = stripAngle;
  strip.position.set(runway.x, runway.height + 0.3, runway.z);
  group.add(strip);
  // Sand shoulders, 3 m each side, level with the strip.
  const shoulderMat = new THREE.MeshStandardMaterial({ color: '#BBA77F', roughness: 0.95 });
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.PlaneGeometry(COURSE.runwayLength, COURSE.runwayShoulder),
      shoulderMat,
    );
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.rotation.z = stripAngle;
    shoulder.position.set(
      runway.x + perpX * side * (COURSE.runwayWidth / 2 + COURSE.runwayShoulder / 2),
      runway.height + 0.3,
      runway.z + perpZ * side * (COURSE.runwayWidth / 2 + COURSE.runwayShoulder / 2),
    );
    group.add(shoulder);
  }
  // Pale edge lines the full length, just inside the strip edges.
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#f5f0dc', roughness: 0.8 });
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(COURSE.runwayLength - 8, 0.6), edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.rotation.z = stripAngle;
    edge.position.set(
      runway.x + perpX * side * (COURSE.runwayWidth / 2 - 1.6),
      runway.height + 0.45,
      runway.z + perpZ * side * (COURSE.runwayWidth / 2 - 1.6),
    );
    group.add(edge);
  }
  // Centreline: 12 m dashes with 18 m gaps, kept clear of the aiming points.
  const dashGeo = new THREE.PlaneGeometry(12, 0.6);
  for (let along = -COURSE.runwayLength / 2 + 70; along <= COURSE.runwayLength / 2 - 70; along += 30) {
    const dash = new THREE.Mesh(dashGeo, edgeMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = stripAngle;
    dash.position.set(
      runway.x + dirX * along,
      runway.height + 0.45,
      runway.z + dirZ * along,
    );
    group.add(dash);
  }
  // Threshold piano keys (six 2 m stripes), aiming points and the runway
  // number at each end, in order from the threshold inward.
  const keyGeo = new THREE.PlaneGeometry(2.2, 2.5);
  for (const end of [-1, 1]) {
    for (let k = 0; k < 6; k += 1) {
      const key = new THREE.Mesh(keyGeo, edgeMat);
      key.rotation.x = -Math.PI / 2;
      key.rotation.z = stripAngle;
      key.position.set(
        runway.x + dirX * end * (COURSE.runwayLength / 2 - 12) + perpX * (-9.75 + k * 3.9),
        runway.height + 0.45,
        runway.z + dirZ * end * (COURSE.runwayLength / 2 - 12) + perpZ * (-9.75 + k * 3.9),
      );
      group.add(key);
    }
    // Aiming points: two large white rectangles 30 m beyond the threshold.
    for (const side of [-1, 1]) {
      const aim = new THREE.Mesh(new THREE.PlaneGeometry(18, 3), edgeMat);
      aim.rotation.x = -Math.PI / 2;
      aim.rotation.z = stripAngle;
      aim.position.set(
        runway.x + dirX * end * (COURSE.runwayLength / 2 - 42) + perpX * side * 7,
        runway.height + 0.45,
        runway.z + dirZ * end * (COURSE.runwayLength / 2 - 42) + perpZ * side * 7,
      );
      group.add(aim);
    }
    // Runway number, readable from the approach that uses this threshold.
    const num = buildRunwayNumber(THREE, end < 0 ? '09' : '27', edgeMat);
    num.rotation.y = Math.atan2(end * dirX, end * dirZ);
    num.position.set(
      runway.x + dirX * end * (COURSE.runwayLength / 2 - 26),
      runway.height + 0.45,
      runway.z + dirZ * end * (COURSE.runwayLength / 2 - 26),
    );
    group.add(num);
  }
  // Edge lights: white along the sides, red at the far (east) end, green at
  // the threshold (west) end — the colours a pilot expects on final approach.
  const lightGeo = new THREE.SphereGeometry(0.9, 8, 6);
  const whiteLight = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
  const redLight = new THREE.MeshBasicMaterial({ color: 0xff2a1e });
  const greenLight = new THREE.MeshBasicMaterial({ color: 0x2aff5e });
  for (let along = -COURSE.runwayLength / 2 + 6; along <= COURSE.runwayLength / 2 - 6; along += 28) {
    const mat = along > COURSE.runwayLength / 2 - 30 ? redLight
      : along < -COURSE.runwayLength / 2 + 30 ? greenLight : whiteLight;
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(lightGeo, mat);
      lamp.position.set(
        runway.x + dirX * along + perpX * side * (COURSE.runwayWidth / 2 + 1.5),
        runway.height + 1.2,
        runway.z + dirZ * along + perpZ * side * (COURSE.runwayWidth / 2 + 1.5),
      );
      group.add(lamp);
    }
  }
  // Approach lights: a short centreline row before the western threshold,
  // sitting on the ground, with a crossbar halfway out.
  for (const dist of [15, 35, 55]) {
    const ax = runway.x - dirX * (COURSE.runwayLength / 2 + dist);
    const az = runway.z - dirZ * (COURSE.runwayLength / 2 + dist);
    const lamp = new THREE.Mesh(lightGeo, whiteLight);
    lamp.position.set(ax, groundAt(ax, az) + 1.2, az);
    group.add(lamp);
  }
  for (const side of [-4, 0, 4]) {
    const ax = runway.x - dirX * (COURSE.runwayLength / 2 + 35) + perpX * side;
    const az = runway.z - dirZ * (COURSE.runwayLength / 2 + 35) + perpZ * side;
    const lamp = new THREE.Mesh(lightGeo, whiteLight);
    lamp.position.set(ax, groundAt(ax, az) + 1.2, az);
    group.add(lamp);
  }

  // --- Sea: a depth-coloured grid just above the land's zero line. The colour
  // follows the terrain below it — turquoise in the shallows, deep teal
  // offshore — so the coast reads as a shore with a shallow shelf, not a hard
  // dark-green edge (the v2 sea was one flat dark disc). ---
  const SEA_SEG = 160;
  const seaGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, SEA_SEG, SEA_SEG);
  seaGeo.rotateX(-Math.PI / 2);
  const seaPos = seaGeo.attributes.position;
  const seaColors = new Float32Array(seaPos.count * 3);
  const seaShallow = new THREE.Color(PALETTE.seaShallow);
  const seaMid = new THREE.Color(PALETTE.seaMid);
  const seaDeep = new THREE.Color(PALETTE.seaDeep);
  const seaTmp = new THREE.Color();
  for (let i = 0; i < seaPos.count; i += 1) {
    const sx = seaPos.getX(i);
    const sz = seaPos.getZ(i);
    const depth = -groundAt(sx, sz); // positive where the land is below sea level
    if (depth < 3) seaTmp.copy(seaShallow);
    else if (depth < 12) seaTmp.copy(seaShallow).lerp(seaMid, (depth - 3) / 9);
    else if (depth < 40) seaTmp.copy(seaMid).lerp(seaDeep, (depth - 12) / 28);
    else seaTmp.copy(seaDeep);
    seaColors[i * 3] = seaTmp.r;
    seaColors[i * 3 + 1] = seaTmp.g;
    seaColors[i * 3 + 2] = seaTmp.b;
  }
  seaGeo.setAttribute('color', new THREE.BufferAttribute(seaColors, 3));
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.3, metalness: 0.12, transparent: true, opacity: 0.92,
  }));
  sea.position.y = 0.6;
  group.add(sea);

  // --- Palms: a few recognisable tropical silhouettes on the beaches, kept
  // well clear of the runway strip. ---
  const palmRandom = createRandom(seed + 202);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.95 });
  const frondMat = new THREE.MeshStandardMaterial({
    color: PALETTE.forest, roughness: 0.9, side: THREE.DoubleSide,
  });
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 4.5, 6);
  const frondGeo = new THREE.PlaneGeometry(2.4, 0.55);
  let palms = 0;
  for (let tries = 0; tries < 1500 && palms < 22; tries += 1) {
    const px = palmRandom.range(-WORLD.size / 2, WORLD.size / 2);
    const pz = palmRandom.range(-WORLD.size / 2, WORLD.size / 2);
    const ph = groundAt(px, pz);
    if (ph < 3 || ph > 12) continue;
    if (Math.hypot(px - runway.x, pz - runway.z) < 320) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.25;
    trunk.rotation.z = palmRandom.range(-0.18, 0.18);
    palm.add(trunk);
    for (let f = 0; f < 6; f += 1) {
      const a = (f / 6) * Math.PI * 2 + palmRandom.range(-0.2, 0.2);
      const frondArm = new THREE.Group();
      frondArm.rotation.y = -a;
      frondArm.position.set(0, 4.6, 0);
      const frond = new THREE.Mesh(frondGeo, frondMat);
      frond.position.set(1.15, 0, 0);
      frond.rotation.z = -0.5; // droop the outer end down
      frondArm.add(frond);
      palm.add(frondArm);
    }
    palm.position.set(px, ph, pz);
    palm.rotation.y = palmRandom.range(0, Math.PI * 2);
    group.add(palm);
    palms += 1;
  }

  // --- Sky dome: a gradient shader, warm at the horizon, deep blue above. ---
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vPos; void main() { float h = normalize(vPos).y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.55)) : horizon; gl_FragColor = vec4(c, 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(4200, 24, 16), skyMat);
  group.add(sky);

  // --- Sun: a low glowing disc in the west, and the warm light that comes with it. ---
  const sunDir = new THREE.Vector3(-0.62, 0.28, -0.35).normalize();
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(190, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false, transparent: true, opacity: 0.95 }),
  );
  sun.position.copy(sunDir).multiplyScalar(3900);
  sun.lookAt(0, 0, 0);
  group.add(sun);
  const sunLight = new THREE.DirectionalLight(0xffd9a0, 2.4);
  sunLight.position.copy(sunDir).multiplyScalar(1200);
  group.add(sunLight);
  group.add(new THREE.HemisphereLight(0xffc890, 0x2a6f7d, 0.9));

  // --- Clouds: puffs of flattened spheres, drifting slowly across the sky.
  // Unlit and warm-white, so they read as lit cloud against the sunset instead
  // of grey rock. v3: the puffs are flatter, wider and packed tighter, so each
  // cloud is one coherent flat-topped shape instead of a loose floating rock.
  const clouds = [];
  const cloudRandom = createRandom(seed + 101);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: '#fff2df', transparent: true, opacity: 0.92, fog: false,
  });
  const puffGeo = new THREE.IcosahedronGeometry(1, 0);
  for (let i = 0; i < 34; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + cloudRandom.int(0, 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      const s = cloudRandom.range(22, 58);
      puff.scale.set(s * 1.9, s * 0.38, s * 1.1);
      puff.position.set(cloudRandom.range(-42, 42), cloudRandom.range(-5, 5), cloudRandom.range(-24, 24));
      cloud.add(puff);
    }
    cloud.position.set(
      cloudRandom.range(-WORLD.size / 2, WORLD.size / 2),
      cloudRandom.range(300, 520),
      cloudRandom.range(-WORLD.size / 2, WORLD.size / 2),
    );
    cloud.userData.speed = cloudRandom.range(1.5, 4);
    clouds.push(cloud);
    group.add(cloud);
  }

  function update(dt) {
    for (const cloud of clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > WORLD.size / 2 + 200) cloud.position.x = -WORLD.size / 2 - 200;
    }
  }

  return { group, groundAt, update };
}
