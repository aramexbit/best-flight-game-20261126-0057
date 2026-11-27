// Simple pooled particles for the race: smoke puffs, fireballs, shockwave
// rings, debris and wrecks. Plain meshes with transparent materials and
// capped counts — busy, not heavy. One shared canvas texture softens the
// smoke (v17); no shaders, no per-frame allocation of geometries: the
// four shapes are shared, only the materials are per-particle (and
// disposed when the particle dies).
//
// Two kinds of explosion:
//   air  — a mid-air collision: fireball + shockwave + debris + a dozen
//          smoke puffs that fall slowly, so the smoke hangs in the sky.
//   sea/ground — a dive impact: the same blast, plus a burning wreck that
//          stays behind and a thick smoke column rising from it for
//          RACE.smokeColumnSeconds, so the crash is still visible minutes
//          later in the landing shot.

import { RACE, STORM } from './config.js';

export function createEffects(THREE, scene) {
  // v16: SMOOTH smoke balls (SphereGeometry, was detail-0 icosahedron) —
  // the flat facets of the old puffs are exactly the "flat dark
  // hexagonal/octagonal polygons" Gemini saw around every v15 blast.
  const puffGeo = new THREE.SphereGeometry(1, 12, 9);
  const ballGeo = new THREE.SphereGeometry(1, 12, 8);
  // v18: faceted blast geometry — Gemini's fix: the v17 fireball read as
  // "confetti" (smooth spheres + scattered puffs). Icosahedron and
  // dodecahedron facets catch the light as hard shards of fire.
  const facetGeo = new THREE.IcosahedronGeometry(1, 0);
  const facetGeo2 = new THREE.DodecahedronGeometry(1, 0);
  const ringGeo = new THREE.TorusGeometry(1, 0.07, 8, 40);
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const puffs = [];
  const balls = [];
  const rings = [];
  const debris = [];
  const columns = [];
  const flames = [];
  const wrecks = [];
  // v14: split airframe halves (a collided plane torn in two), firework
  // sparks, confetti quads and scheduled firework shows for the finish.
  const halves = [];
  const sparks = [];
  const confettiParts = [];
  const shows = [];
  // v16: flame tongues (stretched additive fire), chained follow-up
  // blasts, burning oil slicks, and one orange flash light that pops
  // on every explosion and lights the clouds/sea/terrain around it.
  const tongues = [];
  const pending = [];
  const slicks = [];
  const flash = new THREE.PointLight(0xff8c1a, 0, 900, 1);
  scene.add(flash);
  let flashLevel = 0;
  // v15: 140 (was 90) — the longer fireball, flame puffs, split-half flame
  // trails and the four coloured slipstream trails all draw from the same
  // pool; 90 evicted fresh explosion smoke mid-blast.
  const PUFF_BUDGET = 140;

  // v17: a soft smoke texture — several blurred radial blobs on a canvas,
  // so smoke puffs read as clouds instead of hard-edged balls (Gemini
  // v17: the blast's charcoal smoke needs soft edges). One texture,
  // shared by every smoke material; the material colour tints it.
  const smokeTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const blobs = [
      [64, 64, 46, 0.85], [38, 52, 30, 0.7], [90, 54, 32, 0.7],
      [52, 88, 28, 0.65], [80, 88, 26, 0.6], [64, 34, 26, 0.55],
    ];
    for (const [x, y, r, a] of blobs) {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${a})`);
      grad.addColorStop(0.7, `rgba(255,255,255,${a * 0.5})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  })();

  function smokePuff(x, y, z, size, opts = {}) {
    if (puffs.length >= PUFF_BUDGET) {
      const old = puffs.shift();
      scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    // v17: the soft smoke texture (see above) — the map fades the
    // sphere's edge to transparent, so puffs read as clouds.
    const mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0x555555,
      transparent: true,
      opacity: opts.opacity ?? 0.55,
      depthWrite: false,
      map: smokeTexture,
    });
    // v21: `opts.flat` — a flattened puff (scale.y = size * flat,
    // random yaw) reads as an irregular billow, not a ball. A round
    // sphere with a soft texture still has a ROUND silhouette, and
    // the v20 crash frame showed the blast smoke as a field of pale
    // balls — the root fix is shape, not opacity.
    const flat = opts.flat ?? 1;
    const mesh = new THREE.Mesh(puffGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.set(size, size * flat, size);
    mesh.rotation.y = Math.random() * Math.PI * 2;
    scene.add(mesh);
    puffs.push({
      mesh,
      life: 0,
      maxLife: opts.life ?? 2.5,
      grow: opts.grow ?? 1.6,
      vel: opts.vel ?? { x: 0, y: 1.2, z: 0 },
      baseOpacity: opts.opacity ?? 0.55,
      flat,
    });
  }

  /** A burning wreck that stays where the rival hit: dark tilted fuselage
   *  and wing, half out of the water, with a small flame flickering on it
   *  while the smoke column rises. */
  function addWreck(x, y, z) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2f3a', roughness: 0.9 });
    const fus = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.9), dark);
    g.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 4.2), dark);
    wing.position.set(0.4, 0.2, 0);
    wing.rotation.z = 0.35;
    g.add(wing);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.9), dark);
    fin.position.set(-1.6, 0.6, 0);
    fin.rotation.z = 0.5;
    g.add(fin);
    g.position.set(x, Math.max(0.8, y), z);
    g.rotation.set(0.15, Math.random() * Math.PI * 2, 0.45);
    scene.add(g);
    wrecks.push(g);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xff7f1a, transparent: true, opacity: 0.9, depthWrite: false,
    });
    const flame = new THREE.Mesh(ballGeo, flameMat);
    flame.position.set(x, Math.max(1.5, y) + 1, z);
    flame.scale.setScalar(1.5);
    scene.add(flame);
    flames.push({ mesh: flame, life: 0, maxLife: RACE.smokeColumnSeconds });
  }

  /**
   * The explosion. v15 — a CLASSIC multi-part explosion (Gemini's fix
   * prompt + the key art): the v14 fireball died in 0.7 s, so the cover
   * froze on a black smoke column. Now the orange shell swells 2 m to
   * ~34 m over 2.2 s (2.8x the 11 m wingspan), the amber core to 18 m
   * over 1.8 s, a white-yellow inner core to 10 m over 1.2 s, eight big
   * orange flame puffs keep the orange alive after the ball fades, and
   * the dark smoke is an irregular billowing cluster of fourteen puffs
   * (#26292E-#3E434B, 0.7 opacity) — NOT a narrow vertical column. The
   * gold shockwave stays a small, faint, short-lived ring (22 m, 1.0 s,
   * 0.5 opacity) — a punctuation mark, never the main event (Gemini
   * v13: the rings read as abstract shock art, not a blast). `air` true
   * means the blast happened in the sky (the smoke falls slowly); false
   * means sea or ground (a wreck and a rising smoke column stay behind).
   */
  function explode(x, y, z, air) {
    // v17: a layered fireball — the three concentric shells are OFFSET
    // from each other, plus two extra lobes, so the blast reads as an
    // irregular blooming fire (Gemini v17: concentric circles look
    // drawn-on), with a yellow-white core, an orange-red mid layer and
    // charcoal smoke at soft edges. The smoke stays dark and outboard
    // of the flame, so the fire is never swallowed by it.
    // v18: three FACETED layers (Gemini's spec) — pale core #FFF3B0,
    // orange #FF9F1C, red shell #E63946 — so the blast reads as one
    // cohesive faceted fireball, not scattered confetti blobs.
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xe63946, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const shell = new THREE.Mesh(facetGeo2, shellMat);
    shell.position.set(x, y, z);
    shell.scale.setScalar(2);
    scene.add(shell);
    // v19 (b): the fireball is BIGGER and LONGER — shell to 42 m over
    // 3.5 s (was 34 m / 2.8 s), core to 24 m (was 18), inner to 14 m
    // (was 10), lobes to 26/20 m (was 20/16). The v18 live playtest
    // never SAW the blast: at 338-400 m a 34 m ball is ~5° wide. A
    // 42 m ball at ≤300 m (the tightened collision gate) is ~8°.
    balls.push({ mesh: shell, life: 0, maxLife: 3.5, from: 2, to: 42 });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xff9f1c, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const core = new THREE.Mesh(facetGeo, coreMat);
    core.position.set(x + 4, y + 2, z + 2);
    core.scale.setScalar(1.2);
    scene.add(core);
    balls.push({ mesh: core, life: 0, maxLife: 2.2, from: 1.2, to: 24 });
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xfff3b0, transparent: true, opacity: 0.98, depthWrite: false,
    });
    const inner = new THREE.Mesh(facetGeo, innerMat);
    inner.position.set(x - 3, y - 1, z - 2);
    inner.scale.setScalar(1);
    scene.add(inner);
    balls.push({ mesh: inner, life: 0, maxLife: 1.5, from: 1, to: 14 });
    // v17: two extra lobes, offset sideways so the silhouette is
    // lopsided — a fireball with a single centre reads as a balloon.
    const lobeAMat = new THREE.MeshBasicMaterial({
      color: 0xff9f1c, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const lobeA = new THREE.Mesh(facetGeo2, lobeAMat);
    lobeA.position.set(x + 9, y - 3, z + 6);
    lobeA.scale.setScalar(1.5);
    scene.add(lobeA);
    balls.push({ mesh: lobeA, life: 0, maxLife: 2.6, from: 1.5, to: 26 });
    const lobeBMat = new THREE.MeshBasicMaterial({
      color: 0xe63946, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const lobeB = new THREE.Mesh(facetGeo, lobeBMat);
    lobeB.position.set(x - 8, y + 4, z - 6);
    lobeB.scale.setScalar(1.2);
    scene.add(lobeB);
    balls.push({ mesh: lobeB, life: 0, maxLife: 2.8, from: 1.2, to: 20 });
    // v16: flame tongues — five stretched additive fire spikes jutting
    // out of the core at random angles, so the blast reads as licking
    // flame, not one smooth ball. They live in their own list because
    // they scale non-uniformly (long, thin) unlike the round balls.
    for (let f = 0; f < 5; f += 1) {
      const tMat = new THREE.MeshBasicMaterial({
        color: f % 2 ? 0xff8c1a : 0xffb52e, transparent: true, opacity: 0.95,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const tongue = new THREE.Mesh(facetGeo, tMat);
      tongue.position.set(x, y, z);
      tongue.scale.set(2, 6, 2);
      tongue.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(tongue);
      tongues.push({ mesh: tongue, life: 0, maxLife: 0.7 + Math.random() * 0.4 });
    }
    // v16: the orange flash — a point light that pops with the blast
    // and decays over ~1 s, so nearby clouds, sea and terrain catch a
    // warm bounce (Gemini's fix prompt: light flash on clouds/terrain).
    flash.position.set(x, y, z);
    flashLevel = 900;
    // v19 (Gemini v18 #1): the shockwave ring is DELETED from the blast
    // — at distance the 22 m torus read as a giant transparent bubble /
    // circle in the sky, the single most-named artefact of the v18
    // blind test. The splash ring on the water surface (splash()) stays:
    // a flat ring on the sea reads as water, not as a sky bubble.
    // Debris: sixteen dark shards and eight burning ones at 10-26 m/s
    // (Gemini's fix prompt: 24-36 outward-streaking ember/flame chunks),
    // so the blast reads as shrapnel, not a clean puff. The shards are
    // CHUNKY (v18: 1.2 x 0.8 x 0.8, was elongated 2.0 x 0.45 x 0.45) in
    // slate #334155 and red #C82828, tumbling with gravity — angled
    // fragments, not streaks.
    // v19b: SMALLER shards (0.4-1.0 m, was 0.7-2.0) and fewer of them
    // (24, was 32). The blast sits ~25 m from the player and the chase
    // camera ~14 m from the blast, so 2 m shards flying outward at
    // 10-26 m/s reach the camera in under a second and read as giant
    // coloured slabs splashed across the HUD corner (v19 cover shot).
    // Sub-metre shards at the same speeds still streak and read as
    // shrapnel, without filling the frame.
    for (let d = 0; d < 24; d += 1) {
      const burning = d < 8;
      const mat = new THREE.MeshBasicMaterial({
        color: burning ? 0xff9e1b : (d % 2 ? 0x334155 : 0xc82828),
        transparent: true, opacity: 1, depthWrite: false,
      });
      const piece = new THREE.Mesh(debrisGeo, mat);
      const s = 0.4 + Math.random() * 0.6;
      piece.scale.set(s * 1.2, s * 0.8, s * 0.8);
      piece.position.set(x, y, z);
      piece.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(piece);
      const a = Math.random() * Math.PI * 2;
      const up = 6 + Math.random() * 12;
      const out = 10 + Math.random() * 16;
      debris.push({
        mesh: piece,
        life: 0,
        maxLife: 2.5,
        vel: { x: Math.cos(a) * out, y: up, z: Math.sin(a) * out },
        spin: {
          x: (Math.random() - 0.5) * 9,
          y: (Math.random() - 0.5) * 9,
          z: (Math.random() - 0.5) * 9,
        },
      });
    }
    // Smoke: fourteen DARK puffs in an irregular billowing cluster
    // (#26292E-#3E434B) that frames the fire instead of swallowing it
    // — NOT a narrow vertical column. Falling slowly if the blast was
    // in the air, rising if it hit the sea or the ground. v17: the
    // puffs are smaller, thinner (0.55) and spread wider (±30 m) with
    // the soft texture, so the fire shows through them.
    // v18: slate smoke (#475569 / #64748B / #CBD5E1, Gemini's spec) —
    // the old near-black puffs read as confetti flecks against the fire.
    // v19 (Gemini v18 #2): the blast smoke is CAPPED — life 6-8 s
    // (was 8-12), grow 0.5 (was 0.8). A puff at 2.5-4 m growing
    // 0.8/s for 12 s reaches ~24 m across; fourteen of those read as
    // giant clouds piling into the HUD. Capped puffs top out near 8 m.
    // v20: the pale #CBD5E1 puffs are OUT (replaced by mid-slate
    // #7A8CA0) and the cluster is TIGHTER (±18 m horizontal, ±12 m
    // vertical, was ±30/±20) — the v20 live crash frame showed the
    // pale puffs scattered wide over the grass reading as big
    // translucent BUBBLES (the same "pale bubbles on the slope" the
    // v19 live playtest named, a third bubble source the v19 fix
    // missed: emitSmoke + cloud lobes were fixed, blast smoke was
    // not). Dark-to-mid slate puffs clustered on the fireball read as
    // smoke; pale spheres floating apart read as bubbles.
    // v20 (rev 3): opacity 0.85 (was 0.55) and the lightest colour
    // dropped — the rev-2 crash frame still showed pale spheres: at
    // 0.55 over bright sand/grass the mid-slate washes out to pale
    // grey, and a pale translucent sphere IS a bubble. At 0.85 the
    // dark slate stays dark enough to read as smoke (the soft radial
    // texture keeps the soft edges Gemini v17 asked for; the smooth
    // spheres stay, so no return to the faceted "flat dark polygons"
    // of v15).
    // v21: EIGHT puffs, not fourteen — near-black slate
    // (#1E293B/#334155, was mid-slate #475569/#64748B), FLATTENED
    // (flat 0.55) and TIGHTER (±10 m horizontal, ±8 m vertical, was
    // ±18/±12). The v20 rev-3 crash frame still showed ~8-10 pale
    // balls: fourteen round mid-grey spheres scattered wide over
    // bright grass read as bubbles whatever their opacity. Fewer,
    // darker, flattened puffs clustered ON the fireball read as
    // soot, not a bubble field.
    const smokeColors = [0x1e293b, 0x334155];
    for (let p = 0; p < 8; p += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 16,
        z + (Math.random() - 0.5) * 20,
        1.8 + Math.random() * 1.0,
        {
          color: smokeColors[p % smokeColors.length],
          life: 6 + Math.random() * 2,
          grow: 0.5,
          flat: 0.55,
          vel: {
            x: (Math.random() - 0.5) * 5,
            y: air ? -2 - Math.random() * 1.5 : 2 + Math.random() * 2,
            z: (Math.random() - 0.5) * 5,
          },
          opacity: 0.85,
        },
      );
    }
    // Flame puffs: eight big orange puffs that outlive the fireball, so
    // the orange keeps burning after the ball fades instead of the frame
    // going all smoke.
    for (let f = 0; f < 8; f += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 6,
        z + (Math.random() - 0.5) * 10,
        4 + Math.random() * 2,
        {
          color: 0xff7f1a,
          life: 2.5 + Math.random() * 0.5,
          grow: 1.4,
          vel: { x: (Math.random() - 0.5) * 3, y: 1 + Math.random(), z: (Math.random() - 0.5) * 3 },
          opacity: 0.9,
        },
      );
    }
    if (!air) {
      addWreck(x, y, z);
      columns.push({ x, y, z, t: 0, dur: RACE.smokeColumnSeconds, timer: 0 });
    }
  }

  /**
   * v16: a CHAIN explosion — the first blast plus two staggered
   * follow-ups 0.15-0.35 s later, offset 15-30 m in different
   * directions, so the blast blooms as 2-3 distinct fireballs across
   * depth instead of one merged blob (Gemini's v16 build prompt).
   * The pending list is drained in update(dt).
   */
  function explodeChain(x, y, z, air) {
    explode(x, y, z, air);
    pending.push({
      t: 0, at: 0.18,
      x: x + 18 + Math.random() * 12, y: y - 6 + Math.random() * 12, z: z + 14 + Math.random() * 10,
      air,
    });
    pending.push({
      t: 0, at: 0.36,
      x: x - 20 - Math.random() * 10, y: y + 4 + Math.random() * 10, z: z - 16 - Math.random() * 12,
      air,
    });
  }

  /**
   * v16: FLAK — one small dark-orange burst for the storm battle's
   * outer corridors: a short orange ball, four dark puffs and a few
   * embers, no wreck, no column. Half the size of a full explosion,
   * so it reads as distant anti-aircraft fire, not a second crash.
   */
  function flak(x, y, z) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff9f1c, transparent: true, opacity: 0.9, depthWrite: false,
    });
    const ball = new THREE.Mesh(ballGeo, mat);
    ball.position.set(x, y, z);
    ball.scale.setScalar(1);
    scene.add(ball);
    balls.push({ mesh: ball, life: 0, maxLife: 0.9, from: 1, to: 9 });
    for (let p = 0; p < 4; p += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 6,
        z + (Math.random() - 0.5) * 8,
        2 + Math.random() * 1.5,
        {
          color: p % 2 ? 0x64748b : 0x475569, life: 3 + Math.random() * 2,
          grow: 1.1, vel: { x: (Math.random() - 0.5) * 3, y: 1, z: (Math.random() - 0.5) * 3 },
          opacity: 0.65,
        },
      );
    }
    for (let d = 0; d < 5; d += 1) {
      const ember = new THREE.Mesh(debrisGeo, new THREE.MeshBasicMaterial({
        color: 0xff9e1b, transparent: true, opacity: 1, depthWrite: false,
      }));
      ember.scale.setScalar(0.4 + Math.random() * 0.5);
      ember.position.set(x, y, z);
      scene.add(ember);
      const a = Math.random() * Math.PI * 2;
      debris.push({
        mesh: ember, life: 0, maxLife: 1.2,
        vel: { x: Math.cos(a) * (4 + Math.random() * 6), y: 2 + Math.random() * 6, z: Math.sin(a) * (4 + Math.random() * 6) },
        spin: { x: 4, y: 4, z: 4 },
      });
    }
    flash.position.set(x, y, z);
    flashLevel = Math.max(flashLevel, 300);
  }

  /**
   * v16: a SEA SPLASH — a white crown where a diving rival hits the
   * water: rising white puffs plus a flat expanding ring on the
   * surface, so the impact reads as water, not just fire.
   */
  function splash(x, z) {
    for (let p = 0; p < 8; p += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 6,
        2 + Math.random() * 3,
        z + (Math.random() - 0.5) * 6,
        1.5 + Math.random(),
        {
          color: 0xf4feff, life: 1.2 + Math.random() * 0.6, grow: 2.2,
          vel: { x: (Math.random() - 0.5) * 4, y: 6 + Math.random() * 6, z: (Math.random() - 0.5) * 4 },
          opacity: 0.85,
        },
      );
    }
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.set(x, 1.2, z);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(2);
    scene.add(ring);
    rings.push({ mesh: ring, life: 0, maxLife: 1.4, from: 2, to: 26, baseOpacity: 0.7 });
  }

  /**
   * v16: a BURNING OIL SLICK — a dark disc with a flickering orange
   * rim floating on the sea where the wreck went down, drifting
   * slowly with the wind for STORM.slickSeconds.
   */
  function oilSlick(x, z) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(11, 20),
      new THREE.MeshBasicMaterial({ color: 0x14161c, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    g.add(disc);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(10, 0.5, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xff7f1a, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.2;
    g.add(rim);
    g.position.set(x, 1.0, z);
    scene.add(g);
    slicks.push({ group: g, rim, life: 0, maxLife: STORM.slickSeconds });
  }

  /**
   * v14: a collided plane TORN IN TWO. The front half (nose + cabin +
   * wing + spinner) and the rear half (tail taper + fin + stabiliser) fly
   * apart at ~30 m/s along the plane's own axis, tumbling end over end,
   * trailing dark smoke and orange flame, falling slowly (gravity -3.5, so
   * they hang in the frame for the full 8 s instead of dropping out of
   * sight). `livery` is { body, accent } hex colours; `yaw` is the
   * plane's heading so the halves separate fore/aft, not sideways.
   * The halves live 8 s and fall gently, so they are still tumbling and
   * smoking in the cover frame ~7 s after the blast.
   */
  function explodeSplit(x, y, z, yaw, livery) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: livery.body, roughness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: livery.accent, roughness: 0.6 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#2a2f3a', roughness: 0.9 });
    const dirX = Math.sin(yaw);
    const dirZ = -Math.cos(yaw);
    // Front half: nose + cabin + high wing + spinner, ~4 m long.
    const front = new THREE.Group();
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 2.2), bodyMat);
    nose.position.set(0, 0, 1.1);
    front.add(nose);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.6), bodyMat);
    cabin.position.set(0, 0, -0.8);
    front.add(cabin);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.0), accentMat);
    wing.position.set(0, 0.55, -0.6);
    front.add(wing);
    const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), accentMat);
    spinner.position.set(0, 0, 2.3);
    front.add(spinner);
    // Rear half: tapering tail + tall fin + stabiliser, ~3 m long.
    const rear = new THREE.Group();
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 2.6), bodyMat);
    tail.position.set(0, 0.1, -1.3);
    rear.add(tail);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.6, 1.1), accentMat);
    fin.position.set(0, 0.9, -2.2);
    rear.add(fin);
    const stab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.8), bodyMat);
    stab.position.set(0, 0.2, -2.4);
    rear.add(stab);
    // A charred break face on each half, so the split reads as torn metal.
    const breakF = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.15), darkMat);
    breakF.position.set(0, 0, -1.7);
    front.add(breakF);
    const breakR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.15), darkMat);
    breakR.position.set(0, 0.1, 0.05);
    rear.add(breakR);
    for (const [group, sign] of [[front, 1], [rear, -1]]) {
      group.position.set(x, y, z);
      group.rotation.y = yaw;
      scene.add(group);
      // v16: the halves fly apart HARDER (36 m/s, was 30) and split
      // SIDEWAYS too (±10 m/s perpendicular) — in v15 they separated
      // along the camera's view axis, so from the chase camera they
      // stacked into one shape and Gemini could not read two halves.
      const perpX = Math.cos(yaw);
      const perpZ = Math.sin(yaw);
      halves.push({
        group,
        life: 0,
        maxLife: 8,
        vel: {
          x: dirX * 36 * sign + perpX * 10 * sign + (Math.random() - 0.5) * 6,
          y: 6 + Math.random() * 6,
          z: dirZ * 36 * sign + perpZ * 10 * sign + (Math.random() - 0.5) * 6,
        },
        spin: {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 5,
          z: (Math.random() - 0.5) * 5,
        },
        smokeTimer: 0,
      });
    }
  }

  /** v14: one firework burst — a flash plus coloured sparks flying out. */
  function firework(x, y, z, color) {
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false,
    });
    const flash = new THREE.Mesh(ballGeo, flashMat);
    flash.position.set(x, y, z);
    flash.scale.setScalar(1);
    scene.add(flash);
    balls.push({ mesh: flash, life: 0, maxLife: 0.4, from: 1, to: 6 });
    for (let s = 0; s < 14; s += 1) {
      const a = Math.random() * Math.PI * 2;
      const e = (Math.random() - 0.5) * Math.PI;
      const sp = 18 + Math.random() * 14;
      const mat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 1, depthWrite: false,
      });
      const spark = new THREE.Mesh(ballGeo, mat);
      spark.position.set(x, y, z);
      spark.scale.setScalar(0.5);
      scene.add(spark);
      sparks.push({
        mesh: spark,
        life: 0,
        maxLife: 1.4 + Math.random() * 0.4,
        vel: {
          x: Math.cos(a) * Math.cos(e) * sp,
          y: Math.sin(e) * sp,
          z: Math.sin(a) * Math.cos(e) * sp,
        },
      });
    }
  }

  /** v14: six firework bursts, staggered over ~3 s, above the runway. */
  function fireworkShow(x, y, z) {
    const colors = [0xffd52a, 0xff5d4d, 0x00e5ff, 0x7dff9a, 0xffffff, 0xff9800];
    for (let i = 0; i < 6; i += 1) {
      shows.push({
        t: 0,
        at: i * 0.55,
        x: x + (Math.random() - 0.5) * 120,
        y: y + 60 + Math.random() * 40,
        z: z + (Math.random() - 0.5) * 120,
        color: colors[i % colors.length],
        fired: false,
      });
    }
  }

  /** v14: confetti — seventy bright quads drifting down over the finish. */
  function confetti(x, y, z) {
    const colors = [0xffd52a, 0xff5d4d, 0x00e5ff, 0x7dff9a, 0xffffff, 0xff9800, 0xc83c32];
    for (let i = 0; i < 70; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        color: colors[i % colors.length],
        transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide,
      });
      const quad = new THREE.Mesh(debrisGeo, mat);
      quad.scale.set(0.5, 0.5, 0.08);
      quad.position.set(
        x + (Math.random() - 0.5) * 30,
        y + Math.random() * 12,
        z + (Math.random() - 0.5) * 30,
      );
      quad.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(quad);
      confettiParts.push({
        mesh: quad,
        life: 0,
        maxLife: 5,
        vel: { x: (Math.random() - 0.5) * 3, y: -2 - Math.random() * 2, z: (Math.random() - 0.5) * 3 },
        spin: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 8 },
      });
    }
  }

  /** Advance every particle one fixed step, and retire the dead. */
  function update(dt) {
    // v16: chained follow-up blasts fire on their schedule.
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      pending[i].t += dt;
      if (pending[i].t >= pending[i].at) {
        const p = pending[i];
        pending.splice(i, 1);
        explode(p.x, p.y, p.z, p.air);
      }
    }
    // v16: the orange flash decays fast (~1 s) — a pop, not a lamp.
    if (flashLevel > 0.5) {
      flashLevel *= Math.exp(-dt * 4.5);
      flash.intensity = flashLevel;
    } else {
      flash.intensity = 0;
    }
    for (let i = puffs.length - 1; i >= 0; i -= 1) {
      const p = puffs[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
        puffs.splice(i, 1);
        continue;
      }
      const k = p.life / p.maxLife;
      // v16: smoke drifts with the storm wind, so the blast smoke
      // trails downwind instead of hanging in a still column.
      p.mesh.position.x += (p.vel.x + STORM.windX * 0.5) * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += (p.vel.z + STORM.windZ * 0.5) * dt;
      // v21: a flattened puff grows flattened (the uniform
      // setScalar above would un-flatten it back into a ball).
      const ns = p.mesh.scale.x + p.grow * dt;
      p.mesh.scale.set(ns, ns * (p.flat ?? 1), ns);
      p.mesh.material.opacity = p.baseOpacity * (1 - k);
    }
    // v16: flame tongues stretch out, then shrink and die fast.
    for (let i = tongues.length - 1; i >= 0; i -= 1) {
      const t = tongues[i];
      t.life += dt;
      if (t.life >= t.maxLife) {
        scene.remove(t.mesh);
        t.mesh.material.dispose();
        tongues.splice(i, 1);
        continue;
      }
      const k = t.life / t.maxLife;
      const s = 2 + k * 14;
      t.mesh.scale.set(s * 0.5, s, s * 0.5);
      t.mesh.material.opacity = 0.95 * (1 - k);
    }
    // v16: oil slicks drift with the wind, flicker, and fade out.
    for (let i = slicks.length - 1; i >= 0; i -= 1) {
      const s = slicks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        scene.remove(s.group);
        s.group.traverse((child) => {
          if (child.material) child.material.dispose();
        });
        slicks.splice(i, 1);
        continue;
      }
      s.group.position.x += STORM.windX * 0.4 * dt;
      s.group.position.z += STORM.windZ * 0.4 * dt;
      s.rim.material.opacity = 0.55 + Math.sin(s.life * 9) * 0.35;
      if (s.life > s.maxLife - 5) {
        s.group.traverse((child) => {
          if (child.material) child.material.opacity = Math.max(0, (s.maxLife - s.life) / 5) * 0.85;
        });
      }
    }
    for (let i = balls.length - 1; i >= 0; i -= 1) {
      const b = balls[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        scene.remove(b.mesh);
        b.mesh.material.dispose();
        balls.splice(i, 1);
        continue;
      }
      const k = b.life / b.maxLife;
      b.mesh.scale.setScalar(b.from + (b.to - b.from) * k);
      // v15 (fix): the fireball fades on a (1 - k^2) curve, not linear —
      // it stays bright orange through the first half of its life (the
      // cover freezes ~1.2 s after the blast) instead of washing out to
      // a faint bubble while the dark smoke is still fresh.
      b.mesh.material.opacity = 0.95 * (1 - k * k);
    }
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const r = rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        scene.remove(r.mesh);
        r.mesh.material.dispose();
        rings.splice(i, 1);
        continue;
      }
      const k = r.life / r.maxLife;
      r.mesh.scale.setScalar(r.from + (r.to - r.from) * k);
      r.mesh.material.opacity = (r.baseOpacity ?? 0.85) * (1 - k);
    }
    for (let i = debris.length - 1; i >= 0; i -= 1) {
      const d = debris[i];
      d.life += dt;
      d.vel.y -= 18 * dt;
      d.mesh.position.x += d.vel.x * dt;
      d.mesh.position.y += d.vel.y * dt;
      d.mesh.position.z += d.vel.z * dt;
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      if (d.life >= d.maxLife || d.mesh.position.y < 0.5) {
        scene.remove(d.mesh);
        d.mesh.material.dispose();
        debris.splice(i, 1);
        continue;
      }
      if (d.life > d.maxLife - 0.5) {
        d.mesh.material.opacity = Math.max(0, (d.maxLife - d.life) / 0.5);
      }
    }
    // Smoke columns: a fresh puff every 0.25 s, climbing as the column
    // rises, so the column reads as one thick rising stack.
    for (let i = columns.length - 1; i >= 0; i -= 1) {
      const c = columns[i];
      c.t += dt;
      c.timer += dt;
      if (c.timer >= 0.25) {
        c.timer = 0;
        const h = (c.t / c.dur) * 42;
        // v19: the column puffs are spread wider (±6 m, was ±3) and
        // grow slower (1.0, was 1.4), so the column reads as one thick
        // rising stack instead of a chain of separate beads.
        smokePuff(
          c.x + (Math.random() - 0.5) * 6,
          c.y + h,
          c.z + (Math.random() - 0.5) * 6,
          2 + Math.random() * 1.5,
          // v21: darker (#334155, was #475569) + flattened (0.6) —
          // the column puffs are the same bubble family as the blast
          // smoke; the crash frame's pale balls came from both.
          { color: 0x334155, life: 4, grow: 1.0, flat: 0.6, vel: { x: 0, y: 2.5, z: 0 }, opacity: 0.8 },
        );
      }
      if (c.t >= c.dur) columns.splice(i, 1);
    }
    // v14: split halves — tumble, fall slowly, trail dark smoke + flame.
    // They live 8 s (was 5) and fall gently (gravity -3.5, was -6): the
    // collision fires ~7 s before the cover shot freezes at 41 s, so the
    // halves must still be in the frame, tumbling and smoking, when the
    // cover is taken — not already gone or in the sea.
    for (let i = halves.length - 1; i >= 0; i -= 1) {
      const h = halves[i];
      h.life += dt;
      h.vel.y -= 3.5 * dt;
      h.group.position.x += h.vel.x * dt;
      h.group.position.y += h.vel.y * dt;
      h.group.position.z += h.vel.z * dt;
      h.group.rotation.x += h.spin.x * dt;
      h.group.rotation.y += h.spin.y * dt;
      h.group.rotation.z += h.spin.z * dt;
      h.smokeTimer += dt;
      // v15 (fix): a smoke puff every 0.25 s (was 0.12) — the two halves
      // separate along the camera's view axis, so their trails stacked
      // into one black chimney above the fireball in the v15 cover shot.
      // Half the puffs still reads as burning wreckage, without the stack.
      if (h.smokeTimer >= 0.25) {
        h.smokeTimer = 0;
        const p = h.group.position;
        // v19: the halves' trail puffs are bigger and softer (2.5-4 m,
        // grow 1.6, opacity 0.6 — was 2-3 m / 1.2 / 0.8), so the two
        // trails merge into one burning ribbon instead of a bead-chain
        // that reads as a wire behind each half.
        smokePuff(p.x, p.y, p.z, 2.5 + Math.random() * 1.5, {
          color: 0x475569, life: 3, grow: 1.6,
          vel: { x: 0, y: 0.5, z: 0 }, opacity: 0.6,
        });
      }
      if (h.life >= h.maxLife || h.group.position.y < 1) {
        scene.remove(h.group);
        h.group.traverse((child) => {
          if (child.material) child.material.dispose();
        });
        halves.splice(i, 1);
      }
    }
    // v14: firework sparks — fly out, slow, fade.
    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const s = sparks[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        scene.remove(s.mesh);
        s.mesh.material.dispose();
        sparks.splice(i, 1);
        continue;
      }
      s.vel.y -= 6 * dt;
      s.mesh.position.x += s.vel.x * dt;
      s.mesh.position.y += s.vel.y * dt;
      s.mesh.position.z += s.vel.z * dt;
      s.mesh.material.opacity = 1 - s.life / s.maxLife;
    }
    // v14: confetti — drift down, flutter, fade at the end.
    for (let i = confettiParts.length - 1; i >= 0; i -= 1) {
      const c = confettiParts[i];
      c.life += dt;
      if (c.life >= c.maxLife) {
        scene.remove(c.mesh);
        c.mesh.material.dispose();
        confettiParts.splice(i, 1);
        continue;
      }
      c.mesh.position.x += c.vel.x * dt + Math.sin(c.life * 6) * 0.6 * dt;
      c.mesh.position.y += c.vel.y * dt;
      c.mesh.position.z += c.vel.z * dt;
      c.mesh.rotation.x += c.spin.x * dt;
      c.mesh.rotation.y += c.spin.y * dt;
      c.mesh.rotation.z += c.spin.z * dt;
      if (c.life > c.maxLife - 1) {
        c.mesh.material.opacity = Math.max(0, (c.maxLife - c.life) / 1);
      }
    }
    // v14: scheduled firework bursts.
    for (let i = shows.length - 1; i >= 0; i -= 1) {
      const s = shows[i];
      s.t += dt;
      if (!s.fired && s.t >= s.at) {
        s.fired = true;
        firework(s.x, s.y, s.z, s.color);
      }
      if (s.fired && s.t >= s.at + 2) shows.splice(i, 1);
    }
    for (let i = flames.length - 1; i >= 0; i -= 1) {
      const f = flames[i];
      f.life += dt;
      if (f.life >= f.maxLife) {
        scene.remove(f.mesh);
        f.mesh.material.dispose();
        flames.splice(i, 1);
        continue;
      }
      f.mesh.scale.setScalar(1.2 + Math.sin(f.life * 23) * 0.5 + Math.random() * 0.3);
      f.mesh.material.opacity = 0.9 * (1 - f.life / f.maxLife);
    }
  }

  /** Remove everything (restart): puffs, blasts, debris, flames, wrecks,
   *  split halves, sparks, confetti and scheduled shows. */
  function clear() {
    for (const p of puffs) { scene.remove(p.mesh); p.mesh.material.dispose(); }
    for (const b of balls) { scene.remove(b.mesh); b.mesh.material.dispose(); }
    for (const r of rings) { scene.remove(r.mesh); r.mesh.material.dispose(); }
    for (const d of debris) { scene.remove(d.mesh); d.mesh.material.dispose(); }
    for (const f of flames) { scene.remove(f.mesh); f.mesh.material.dispose(); }
    for (const t of tongues) { scene.remove(t.mesh); t.mesh.material.dispose(); }
    for (const s of slicks) {
      scene.remove(s.group);
      s.group.traverse((child) => {
        if (child.material) child.material.dispose();
      });
    }
    for (const h of halves) {
      scene.remove(h.group);
      h.group.traverse((child) => {
        if (child.material) child.material.dispose();
      });
    }
    for (const s of sparks) { scene.remove(s.mesh); s.mesh.material.dispose(); }
    for (const c of confettiParts) { scene.remove(c.mesh); c.mesh.material.dispose(); }
    for (const w of wrecks) {
      scene.remove(w);
      w.traverse((child) => {
        if (child.material) child.material.dispose();
      });
    }
    puffs.length = 0;
    balls.length = 0;
    rings.length = 0;
    debris.length = 0;
    columns.length = 0;
    flames.length = 0;
    halves.length = 0;
    sparks.length = 0;
    confettiParts.length = 0;
    shows.length = 0;
    wrecks.length = 0;
    tongues.length = 0;
    pending.length = 0;
    slicks.length = 0;
    flashLevel = 0;
    flash.intensity = 0;
  }

  return { smokePuff, explode, explodeSplit, explodeChain, flak, splash, oilSlick, fireworkShow, confetti, update, clear };
}
