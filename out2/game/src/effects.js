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
  // v14: split airframe halves (a collided plane torn in two), firework
  // sparks, confetti quads and scheduled firework shows for the finish.
  const halves = [];
  const sparks = [];
  const confettiParts = [];
  const shows = [];
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
   * The explosion. v14 — a CLASSIC explosion, not an abstract ring: a big
   * orange fireball swelling 2 m to ~26 m, a bright yellow core to ~14 m,
   * and a fat cloud of twenty DARK smoke puffs (near-black, 0.85 opacity,
   * 8-12 s life) that dominates the frame. The gold shockwave is demoted
   * to a small, faint, short-lived ring (22 m, 1.0 s, 0.5 opacity) — a
   * punctuation mark, never the main event (Gemini v13: the rings read as
   * abstract shock art, not a blast). `air` true means the blast happened
   * in the sky (the smoke falls slowly); false means sea or ground (a
   * wreck and a rising smoke column stay behind).
   */
  function explode(x, y, z, air) {
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0xff7f1a, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const shell = new THREE.Mesh(ballGeo, shellMat);
    shell.position.set(x, y, z);
    shell.scale.setScalar(2);
    scene.add(shell);
    balls.push({ mesh: shell, life: 0, maxLife: 0.7, from: 2, to: 26 });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffd52a, transparent: true, opacity: 0.95, depthWrite: false,
    });
    const core = new THREE.Mesh(ballGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(1.2);
    scene.add(core);
    balls.push({ mesh: core, life: 0, maxLife: 0.5, from: 1.2, to: 14 });
    // Shockwave, demoted (v14): one small faint ring, half the old size,
    // gone in a second — the dark smoke and the fire are the explosion now.
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe65c, transparent: true, opacity: 0.5, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.set(x, y, z);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.setScalar(2);
    scene.add(ring);
    rings.push({ mesh: ring, life: 0, maxLife: 1.0, from: 2, to: 22, baseOpacity: 0.5 });
    // Debris: twenty dark shards and eight burning ones (was 12 + 4) —
    // Gemini's fix prompt asks for 25-40 outward-streaking ember/flame
    // chunks in the classic explosion, so the blast reads as shrapnel,
    // not a clean puff.
    for (let d = 0; d < 28; d += 1) {
      const burning = d < 8;
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
    // Smoke: twenty big DARK puffs — the classic explosion's smoke ball.
    // Falling slowly if the blast was in the air, rising if it hit the
    // sea or the ground.
    for (let p = 0; p < 20; p += 1) {
      smokePuff(
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 5,
        z + (Math.random() - 0.5) * 8,
        3.5 + Math.random() * 3,
        {
          color: 0x2e2e2e,
          life: 8 + Math.random() * 4,
          grow: 1.1,
          vel: {
            x: (Math.random() - 0.5) * 4,
            y: air ? -3 - Math.random() * 2 : 2 + Math.random() * 2,
            z: (Math.random() - 0.5) * 4,
          },
          opacity: 0.85,
        },
      );
    }
    if (!air) {
      addWreck(x, y, z);
      columns.push({ x, y, z, t: 0, dur: RACE.smokeColumnSeconds, timer: 0 });
    }
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
      halves.push({
        group,
        life: 0,
        maxLife: 8,
        vel: {
          x: dirX * 30 * sign + (Math.random() - 0.5) * 6,
          y: 6 + Math.random() * 6,
          z: dirZ * 30 * sign + (Math.random() - 0.5) * 6,
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
      if (h.smokeTimer >= 0.12) {
        h.smokeTimer = 0;
        const p = h.group.position;
        smokePuff(p.x, p.y, p.z, 2 + Math.random(), {
          color: 0x2e2e2e, life: 3, grow: 1.2,
          vel: { x: 0, y: 0.5, z: 0 }, opacity: 0.8,
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
  }

  return { smokePuff, explode, explodeSplit, fireworkShow, confetti, update, clear };
}
