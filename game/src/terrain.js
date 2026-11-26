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
    h += isl.height * bump * detail;
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
    const c = 1 - smoothstep(COURSE.runwayWidth / 2 - 6, COURSE.runwayWidth / 2 + 55, Math.abs(across));
    return a * c;
  }

  function groundAt(x, z) {
    const h = islandHeight(islands, fbm, x, z);
    const b = runwayBlend(x, z);
    return b > 0 ? h * (1 - b) + runway.height * b : h;
  }

  // --- Land: a displaced grid with vertex colours by height and slope. ---
  const SEG = 120;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(PALETTE.sand);
  const grass = new THREE.Color(PALETTE.grass);
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
    if (h < 5) tmp.copy(sand);
    else if (h < 150) tmp.copy(grass).lerp(forest, Math.max(0, fbm(x * 0.004, z * 0.004, 2)) * 0.7);
    else if (h < 270) tmp.copy(forest).lerp(rock, Math.min(1, slope / 26));
    else if (h < 350) tmp.copy(rock);
    else tmp.copy(rock).lerp(snow, Math.min(1, (h - 350) / 40));
    if (slope > 30) tmp.lerp(rock, 0.55);
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

  // --- Runway: a dark strip with a pale centre line, laid on the flattened land. ---
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(COURSE.runwayLength, COURSE.runwayWidth),
    new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.9 }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.rotation.z = -Math.atan2(dirZ, dirX);
  strip.position.set(runway.x, runway.height + 0.4, runway.z);
  group.add(strip);
  const lineGeo = new THREE.PlaneGeometry(COURSE.runwayLength - 40, 1.6);
  const lineMat = new THREE.MeshStandardMaterial({ color: '#f5f0dc', roughness: 0.8 });
  for (let i = -3; i <= 3; i += 1) {
    const dash = new THREE.Mesh(lineGeo, lineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.rotation.z = -Math.atan2(dirZ, dirX);
    const along = i * 42;
    dash.position.set(
      runway.x + dirX * along,
      runway.height + 0.55,
      runway.z + dirZ * along,
    );
    group.add(dash);
  }

  // --- Sea: one big calm plane just above the land's zero line. ---
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.size * 0.85, 48),
    new THREE.MeshStandardMaterial({
      color: PALETTE.sea, roughness: 0.32, metalness: 0.12, transparent: true, opacity: 0.94,
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.6;
  group.add(sea);

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
  // of grey rock.
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
      puff.scale.set(s * 1.6, s * 0.55, s);
      puff.position.set(cloudRandom.range(-70, 70), cloudRandom.range(-8, 8), cloudRandom.range(-40, 40));
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
