// Simple pooled particles for the race: smoke puffs, fireballs, shockwave
// rings, debris and wrecks. Plain meshes with transparent materials and
// capped counts — busy, not heavy. No textures, no shaders, no per-frame
// allocation of geometries: the four shapes are shared, only the materials
// are per-particle (and disposed when the particle dies).
//
// Two kinds of explosion:
//   air  — a mid-air collision: fireball + shockwave + debris + a dozen
//          smoke puffs that fall slowly, so the smoke hangs in the sky.
//   sea/ground — a dive impact: the same blast, plus a burning wreck that
//          stays behind and a thick smoke column rising from it for
//          RACE.smokeColumnSeconds, so the crash is still visible minutes
//          later in the landing shot.

import { RACE } from './config.js';

export function createEffects(THREE, scene) {
  const puffGeo = new THREE.IcosahedronGeometry(1, 0);
  const ballGeo = new THREE.SphereGeometry(1, 12, 8);
  const ringGeo = new THREE.TorusGeometry(1, 0.07, 8, 40);
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const puffs = [];
  const balls = [];
  const rings = [];
  const debris = [];
  const columns = [];
  const flames = [];
  const wrecks = [];
  const PUFF_BUDGET = 90;

  function smokePuff(x, y, z, size, opts = {}) {
    if (puffs.length >= PUFF_BUDGET) {
      const old = puffs.shift();
      scene.remove(old.mesh);
      old.mesh.material.dispose();
    }
    const mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0x555555,
      transparent: true,
      opacity: opts.opacity ?? 0.55,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(puffGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(size);
    scene.add(mesh);
    puffs.push({
      mesh,
      life: 0,
      maxLife: opts.life ?? 2.5,
      grow: opts.grow ?? 1.6,
      vel: opts.vel ?? { x: 0, y: 1.2, z: 0 },
      baseOpacity: opts.opacity ?? 0.55,
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
   * The explosion. A fireball that swells from 2 m to ~15 m in 0.6 s,
   * a shockwave ring expanding to ~44 m in 1.5 s, twelve shards of debris
   * flung out with gravity, and a dozen smoke puffs. `air` true means the
   * blast happened in the sky (the smoke falls slowly); false means sea
   * or ground (a wreck and a rising smoke column stay behind).
   */
  function explode(x, y, z, air) {
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xff7f1a, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const shell = new THREE.Mesh(ballGeo, shellMat);
    shell.position.set(x, y, z);
    shell.scale.setScalar(2);
    scene.add(shell);
    balls.push({ mesh: shell, life: 0, maxLife: 0.6, from: 2, to: 15 });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffd52a, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const core = new THREE.Mesh(ballGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(1.2);
    scene.add(core);
    balls.push({ mesh: core, life: 0, maxLife: 0.45, from: 1.2, to: 8 });
    // Shockwave: one flat ring and one upright ring, so the blast reads
    // from any camera angle.
    for (const tilt of [0, Math.PI / 2]) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe65c, transparent: true, opacity: 0.85, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, mat);
      ring.position.set(x, y, z);
      ring.rotation.x = tilt === 0 ? -Math.PI / 2 : 0;
      ring.rotation.y = tilt === 0 ? 0 : Math.random() * Math.PI;
      ring.scale.setScalar(2);
      scene.add(ring);
      rings.push({ mesh: ring, life: 0, maxLife: 1.5, from: 2, to: 44 });
    }
    // Debris: ten dark shards and two burning ones.
    for (let d = 0; d < 12; d += 1) {
      const burning = d < 2;
      const mat = new THREE.MeshBasicMaterial({
        color: burning ? 0xff7f1a : 0x22242a,
        transparent: true, opacity: 1, depthWrite: false,
      });
      const piece = new THREE.Mesh(debrisGeo, mat);
      const s = 0.5 + Math.random() * 1.1;
      piece.scale.set(s, s * 0.6, s * 0.8);
      piece.position.set(x, y, z);
      piece.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(piece);
      const a = Math.random() * Math.PI * 2;
      const up = 8 + Math.random() * 18;
      const out = 10 + Math.random() * 22;
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
    // Smoke: a dozen puffs — falling slowly if the blast was in the air,
    // rising if it hit the sea or the ground.
    for (let p = 0; p < 12; p += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 6,
        y + (Math.random() - 0.5) * 4,
        z + (Math.random() - 0.5) * 6,
        2.5 + Math.random() * 2,
        {
          color: 0x3a3a3a,
          life: 6 + Math.random() * 3,
          grow: 1.1,
          vel: {
            x: (Math.random() - 0.5) * 4,
            y: air ? -3 - Math.random() * 2 : 2 + Math.random() * 2,
            z: (Math.random() - 0.5) * 4,
          },
          opacity: 0.75,
        },
      );
    }
    if (!air) {
      addWreck(x, y, z);
      columns.push({ x, y, z, t: 0, dur: RACE.smokeColumnSeconds, timer: 0 });
    }
  }

  /** Advance every particle one fixed step, and retire the dead. */
  function update(dt) {
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
      p.mesh.position.x += p.vel.x * dt;
      p.mesh.position.y += p.vel.y * dt;
      p.mesh.position.z += p.vel.z * dt;
      p.mesh.scale.setScalar(p.mesh.scale.x + p.grow * dt);
      p.mesh.material.opacity = p.baseOpacity * (1 - k);
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
      b.mesh.material.opacity = 0.95 * (1 - k);
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
      r.mesh.material.opacity = 0.85 * (1 - k);
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
        smokePuff(
          c.x + (Math.random() - 0.5) * 3,
          c.y + h,
          c.z + (Math.random() - 0.5) * 3,
          2 + Math.random() * 1.5,
          { color: 0x3a3a3a, life: 4, grow: 1.4, vel: { x: 0, y: 2.5, z: 0 }, opacity: 0.7 },
        );
      }
      if (c.t >= c.dur) columns.splice(i, 1);
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

  /** Remove everything (restart): puffs, blasts, debris, flames, wrecks. */
  function clear() {
    for (const p of puffs) { scene.remove(p.mesh); p.mesh.material.dispose(); }
    for (const b of balls) { scene.remove(b.mesh); b.mesh.material.dispose(); }
    for (const r of rings) { scene.remove(r.mesh); r.mesh.material.dispose(); }
    for (const d of debris) { scene.remove(d.mesh); d.mesh.material.dispose(); }
    for (const f of flames) { scene.remove(f.mesh); f.mesh.material.dispose(); }
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
    wrecks.length = 0;
  }

  return { smokePuff, explode, update, clear };
}
