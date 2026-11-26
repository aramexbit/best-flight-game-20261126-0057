// The race: four AI rivals in the same Caravan airframe with different
// liveries, flying the same 12-ring course as the player. They weave,
// bank and rubber-band around the player so the pack stays together and
// the chase camera always has company — and a few of them crash, loudly,
// on a scripted schedule, because a race with no drama is just a parade.
// Rivals never touch the player: no collision, no effect on the player's
// flight model — they are visual competition only. The player's mission
// is unchanged: 12 rings, then land.
//
// The scripted crashes are keyed to run time (RACE in config.js), so the
// same seed and the same player line give the same race every run:
//   R1 BIRU    dives at 10 s — the cockpit shot at 12 s catches it
//              smoking ahead; then it rejoins and does the near-miss
//              flyby down the player's left side at 39-42 s, so the cover
//              shot at 41 s catches it overtaking.
//   R4 ORANYE  clips ring 11 at 35 s, spins, dives and hits the sea at
//              ~41 s — the dive and its smoke trail cross the player's
//              path during the run, but the wreck itself lands ~180 m
//              behind the player, so it is NOT in the cover frame (the
//              chase camera looks forward). The cover's visible crashes
//              are BIRU's dive (cockpit shot) and the mid-air collision.
//   R2 KUNING + R3 HIJAU cross paths and collide mid-air at ~40.8 s —
//              the cover shot catches the fireball, the shockwave ring
//              and both rivals tumbling with smoke.
// A crashed rival is out for RACE.respawnDelay seconds, then rejoins
// ahead of the player (see respawn), so the race never ends — and so the
// landing shot, which freezes only seconds after the collision, still
// has the race in its frame.

import { COURSE, RACE } from './config.js';
import { createRandom } from './random.js';
import { createFlight, EVENT_CRASH, EVENT_LAND } from './flight.js';
import { createCourse } from './rings.js';
import { buildPlane } from './plane.js';
import { autopilotTo } from './shots.js';

const LIVERIES = [
  { name: 'BIRU', main: '#E8EEF2', accent: '#2563EB', speedBias: 1.02, weave: 0.0 },
  { name: 'KUNING', main: '#FFD52A', accent: '#22242a', speedBias: 0.99, weave: 2.1 },
  { name: 'HIJAU', main: '#F2E5C5', accent: '#2E9E33', speedBias: 1.0, weave: 4.2 },
  { name: 'ORANYE', main: '#F2E5C5', accent: '#FF7F2A', speedBias: 0.97, weave: 1.3 },
];

export function createRivals(THREE, seed, islands, effects) {
  const group = new THREE.Group();

  function forwardOf(yaw) {
    return { x: Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
  }

  const rivals = LIVERIES.map((liv, i) => {
    const api = buildPlane(THREE, { main: liv.main, accent: liv.accent });
    group.add(api.group);
    // Each rival runs its own course instance: identical rings (same seed),
    // but its own nextIndex and streak, so its progress is independent of
    // the player's and of the other rivals'.
    const course = createCourse(createRandom(seed + 7), seed, islands);
    const flight = createFlight(course.spawn);
    // Stagger the start line: BIRU starts 25 m AHEAD of the player, the
    // rest 80-240 m behind, so the race reads as spread out from the
    // first second — and so the cockpit shot at 12 s catches BIRU ahead
    // in the windshield. 50 m was tried first: at 12 s BIRU was 44 m
    // ahead, a tiny dark blob the cockpit camera could not read as a
    // plane. At 25 m it is ~19 m ahead at 12 s — big enough to read as
    // a rival plane without blocking the ring (it sits ~9 m right of
    // the player's line). BIRU leads at the start, so the cockpit HUD
    // honestly reads 2/5; it dives at 11.5 s and the player retakes
    // the lead.
    const fx = Math.sin(course.spawn.yaw);
    const fz = -Math.cos(course.spawn.yaw);
    const back = i === 0 ? -25 : i * 80;
    flight.state.x -= fx * back;
    flight.state.z -= fz * back;
    return {
      name: liv.name, livery: liv, api, flight, course,
      state: 'racing', stateT: 0,
      speedBias: liv.speedBias, weavePhase: liv.weave,
      crashed: { dive: false, clip: false, collision: false },
      flybyDone: false, flybyTriggered: false, prevAlong: -999,
      spinAngle: 0, vel: { x: 0, y: 0, z: 0 },
      smokeT: 0, respawnT: 0, meetPoint: null,
    };
  });

  /** Put the mesh where the flight state says it is (player-style pose). */
  function syncMesh(r) {
    const s = r.flight.state;
    r.api.group.position.set(s.x, s.y, s.z);
    r.api.group.rotation.y = -s.yaw;
    r.api.group.rotation.x = s.pitch;
    r.api.group.rotation.z = -s.roll;
  }

  /** A smoke puff from the rival's tail, every 0.1 s while it is in trouble. */
  function emitSmoke(r, dt) {
    r.smokeT += dt;
    if (r.smokeT < 0.1) return;
    r.smokeT = 0;
    const s = r.flight.state;
    const f = forwardOf(s.yaw);
    effects.smokePuff(s.x - f.x * 3, s.y - 0.2, s.z - f.z * 3, 2.2, {
      color: 0x4a4a4a, life: 2.8, grow: 1.8,
      vel: { x: -f.x * 4, y: 0.8, z: -f.z * 4 }, opacity: 0.65,
    });
  }

  function hide(r, delay) {
    r.state = 'gone';
    r.stateT = 0;
    r.respawnT = delay;
    r.api.group.visible = false;
  }

  function respawn(r, ps, pf) {
    const s = r.flight.state;
    // Rejoin on the player's heading, at the player's altitude, on the
    // course line — spread out by rival index, so the pack reads as
    // spread across the sky instead of stacked on one point. Two cases.
    // While the course still has rings (BIRU's respawn after its dive),
    // the rival rejoins BEHIND the player (15 m, on the line): behind,
    // on the line, it flies forward through its next ring and rejoins
    // the pack by the flyby window at 32 s. Ahead would overshoot the
    // next ring and trigger the autopilot's 400 m backwards recovery.
    // When the course is done (the landing-shot respawns), the rival
    // rejoins AHEAD of the player instead (see below), because the
    // landing shot freezes at ~47 s and a rival behind the player is
    // behind the chase camera — invisible.
    // Ring progress syncs to the player's EXACT progress (not one ring
    // behind): the next ring is the player's next ring, AHEAD of the
    // respawn point. One ring behind was tried first and made the rival
    // fly BACKWARDS to a ring behind it, losing ~10 s. Both the course
    // (setProgress) and the flight state's ringsPassed counter must be
    // set — the counter is what playerPosition and the HUD read.
    const n = ps.ringsPassed;
    r.course.setProgress(n);
    s.ringsPassed = n;
    const i = rivals.indexOf(r);
    // No lateral offset anywhere: a rival respawned off the course line
    // has to turn back onto it, and with the next ring only 20-50 m
    // ahead it misses the ring and falls behind. (A 60 m lateral offset
    // was tried: BIRU respawned off the line and flew north, away from
    // the course, and was 881 m behind by 32 s.) The rivals spread along
    // the course instead, which reads as depth in the frame.
    const next = r.course.nextRing();
    let ahead;
    let lateral;
    const pr = { x: Math.cos(ps.yaw), y: 0, z: Math.sin(ps.yaw) };
    if (!next) {
      // Course done (the landing-shot respawns): rejoin AHEAD of the
      // player (120-240 m by index), on the course line — the landing
      // shot freezes at ~47 s, only seconds after the mid-air collision,
      // and the respawned rivals must be ahead to be in the frame (a
      // rival respawned BESIDE the player is 25 m to the side, 12 m from
      // the chase camera — ~64° off-axis, outside the 26° half-FOV, so
      // it is invisible; beside was tried and the landing frame showed
      // no rivals). They count as ahead for POS (the tie-break now uses
      // distance to the runway when the course is done), so the landing
      // HUD honestly reads 4/5 — the player was 1/5 through the race,
      // then the crashed rivals rejoined ahead of it on final.
      ahead = 120 + i * 40;
      lateral = 0;
    } else {
      // Rings still to fly (BIRU's respawn after its dive): rejoin
      // BEHIND the player (15 m, on the course line, no lateral
      // offset). Behind, on the line, the rival flies forward through
      // its next ring and rejoins the pack — ahead would overshoot the
      // next ring and trigger the autopilot's 400 m backwards recovery.
      // 15 m (not 30 m) so it is close enough to reach the flyby shadow
      // by ~38 s and be settled on the player's left at 41 s.
      ahead = -15;
      lateral = 0;
    }
    s.x = ps.x + pf.x * ahead + pr.x * lateral;
    s.y = ps.y;
    s.z = ps.z + pf.z * ahead + pr.z * lateral;
    s.yaw = ps.yaw;
    s.pitch = 0;
    s.roll = 0;
    s.speed = 55;
    s.throttle = 0.7;
    s.fuel = 1;
    s.status = 'flying';
    s.stalled = false;
    r.state = 'racing';
    r.stateT = 0;
    r.spinAngle = 0;
    r.api.group.visible = true;
    syncMesh(r);
  }

  function startDive(r, kind) {
    const s = r.flight.state;
    r.state = 'diving';
    r.stateT = 0;
    r.crashed[kind] = true;
    const f = forwardOf(s.yaw);
    r.vel = { x: f.x * s.speed, y: 0, z: f.z * s.speed };
  }

  function startSpin(r) {
    r.state = 'spinning';
    r.stateT = 0;
    r.crashed.clip = true;
    r.spinAngle = 0;
  }

  /**
   * One fixed step for the whole pack. `player` is the player's flight
   * object, `playerCourse` its course; `groundAt` and `runway` are the
   * terrain's. `audio` and `onShake` are for the flyby whoosh and camera
   * shake. Rivals read the player, they never write to it.
   */
  function update(dt, time, player, playerCourse, groundAt, runway, audio, onShake) {
    const ps = player.state;
    const pf = forwardOf(ps.yaw);
    const pr = { x: Math.cos(ps.yaw), y: 0, z: Math.sin(ps.yaw) };
    for (const r of rivals) {
      const s = r.flight.state;
      r.stateT += dt;
      if (r.state === 'gone') {
        r.respawnT -= dt;
        if (r.respawnT <= 0 && r.respawnT + dt > 0) respawn(r, ps, pf);
        continue;
      }
      // --- scripted triggers, racing state only ---
      if (r.state === 'racing') {
        if (r.name === 'BIRU' && !r.crashed.dive && time >= RACE.diveCrashAt) {
          startDive(r, 'dive');
        } else if (r.name === 'ORANYE' && !r.crashed.clip && time >= RACE.clipCrashAt) {
          startSpin(r);
        } else if ((r.name === 'KUNING' || r.name === 'HIJAU') && !r.crashed.collision
          && time >= RACE.collisionAt - 10) {
          // Converge on a FIXED point on the course for the last ~10 s,
          // then collide: 60 m past ring 11, 25 m up. The rivals fall
          // ~60 m short of the meeting point in the 10 s they have, so
          // the blast lands near ring 11 itself — ~64 m ahead of the
          // staged player in the cover frame (the staged player is ~64 m
          // from ring 11 at 41 s), a 15 m fireball that reads clearly
          // just past the ring. 200 m was tried first (blast ~330 m
          // ahead, too far to read); 120 m next (blast ~184 m ahead,
          // still too small). A meeting point from the player's live
          // position goes stale (the player flies 65 m/s, so a point
          // fixed 6 s early ends up ~390 m behind the player, out of
          // frame). Ring 11 + 25 m was tried too: the blast landed 30 m
          // from the player, on top of it. (Note: the Node probe runs
          // ~1 s ahead of the staged run, so in the probe this blast
          // reads ~40 m BEHIND the player — the staged screenshot is the
          // ground truth, not the probe.)
          r.state = 'converging';
          r.stateT = 0;
          const ring11 = r.course.rings[10];
          const ax = ring11.axis;
          r.meetPoint = { x: ring11.x + ax.x * 60, y: ring11.y + 25, z: ring11.z + ax.z * 60 };
        } else if (r.name === 'BIRU' && !r.flybyDone && time >= RACE.flybyAt - 5 && time <= RACE.flybyAt + 3) {
          // The flyby starts 5 s early. 7 s was tried first: BIRU reached
          // the shadow at ~39 s, overshot it, and by 41 s had drifted
          // 37 m left of the player — outside the chase camera's FOV, so
          // the cover showed no flyby. Starting at 34 s, BIRU is still
          // closing on the shadow at 41 s (closest then, not yet
          // overshooting), on the player's left in the frame.
          r.state = 'flyby';
          r.stateT = 0;
        }
      }

      // --- state machine ---
      if (r.state === 'converging') {
        // Both rivals steer for the same meeting point ahead of the player,
        // at full throttle — they need every metre per second to reach a
        // point 200 m past ring 11 in the ~10 s they have.
        const ev = r.flight.step(
          dt, autopilotTo(r.flight, r.meetPoint, 1.0, groundAt), groundAt, runway,
        );
        if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          hide(r, RACE.respawnDelay);
        } else if (time >= RACE.collisionAt) {
          // The collision: fireball + shockwave + debris in the sky, and
          // both rivals tumble away trailing smoke. The explosion point is
          // the midpoint of the two rivals, wherever they actually are.
          const other = rivals.find((o) => o !== r && (o.name === 'KUNING' || o.name === 'HIJAU') && o.state === 'converging');
          const mx = other ? (s.x + other.flight.state.x) / 2 : s.x;
          const my = other ? (s.y + other.flight.state.y) / 2 : s.y;
          const mz = other ? (s.z + other.flight.state.z) / 2 : s.z;
          effects.explode(mx, my, mz, true);
          const f = forwardOf(s.yaw);
          r.vel = { x: f.x * 30, y: 8, z: f.z * 30 };
          r.state = 'tumbling';
          r.stateT = 0;
          r.crashed.collision = true;
          r.spinAngle = 0;
        }
      } else if (r.state === 'spinning') {
        // Clipped the ring edge: the airframe rolls violently for two
        // seconds, trailing smoke, then the nose drops into a dive.
        r.spinAngle += 9 * dt;
        const f = forwardOf(s.yaw);
        s.x += f.x * s.speed * 0.8 * dt;
        s.z += f.z * s.speed * 0.8 * dt;
        s.y -= 4 * dt;
        emitSmoke(r, dt);
        if (r.stateT >= 2) startDive(r, 'clip');
      } else if (r.state === 'diving') {
        // Nose down, smoke on, until the sea or the ground ends it.
        // The fall is gentle (7 m/s², was 14): a steeper dive drops
        // 33 m in the first 2 s, so the cockpit shot at 12 s catches the
        // rival already under the dashboard, invisible. At 7 m/s² it is
        // still in the windshield at 12 s, nosing down with smoke, and
        // it still reaches the sea a few seconds later.
        s.pitch = Math.max(-0.6, s.pitch - dt * 1.2);
        s.roll = Math.sin(time * 3) * 0.3;
        const f = forwardOf(s.yaw);
        r.vel.y -= 7 * dt;
        s.x += f.x * s.speed * dt;
        s.z += f.z * s.speed * dt;
        s.y += r.vel.y * dt;
        emitSmoke(r, dt);
        if (s.y <= groundAt(s.x, s.z) + 2) {
          effects.explode(s.x, Math.max(1, groundAt(s.x, s.z) + 1), s.z, false);
          hide(r, RACE.respawnDelay);
        }
      } else if (r.state === 'tumbling') {
        // After the mid-air collision: falling, spinning, smoking.
        r.vel.y -= 22 * dt;
        s.x += r.vel.x * dt;
        s.y += r.vel.y * dt;
        s.z += r.vel.z * dt;
        r.spinAngle += 8 * dt;
        emitSmoke(r, dt);
        if (r.stateT >= 2.5) hide(r, RACE.respawnDelay);
      } else if (r.state === 'flyby') {
        // Near-miss, single phase: chase the shadow position — 8 m to
        // the player's left, 20 m ahead, 2 m higher — at 0.95 throttle,
        // slowing to 0.7 once within 30 m so it settles on the shadow
        // instead of overshooting it. A fixed staging point was tried
        // first (80 m before ring 11): the autopilot ORBITS a fixed
        // point instead of holding at it, so BIRU ended up 126 m north
        // of the staging point and 176 m behind the player at 41 s —
        // invisible in the cover. Chasing the moving shadow directly,
        // BIRU closes the ~60 m gap in ~6 s and is on the player's left
        // by ~38 s, in the cover frame at 41 s.
        const target = { x: ps.x - pr.x * 8 + pf.x * 20, y: ps.y + 2, z: ps.z - pr.z * 8 + pf.z * 20 };
        const distToTarget = Math.hypot(target.x - s.x, target.y - s.y, target.z - s.z);
        const along = (s.x - ps.x) * pf.x + (s.z - ps.z) * pf.z;
        // The whoosh + camera shake fire the first time the two planes
        // pass each other (the along-offset changes sign, either way —
        // BIRU overtaking the player, or the player overtaking BIRU).
        // The -999 guard stops a false trigger on the first flyby step:
        // prevAlong starts at -999, which reads as "was behind" even
        // when BIRU entered the flyby already ahead.
        if (!r.flybyTriggered && r.prevAlong !== -999 && r.prevAlong !== null
          && ((r.prevAlong < 0 && along >= 0) || (r.prevAlong > 0 && along <= 0))
          && time >= RACE.flybyAt - 7 && time <= RACE.flybyAt + 3) {
          r.flybyTriggered = true;
          if (audio && audio.whoosh) audio.whoosh();
          if (onShake) onShake(0.18);
        }
        r.prevAlong = along;
        const ev = r.flight.step(dt, autopilotTo(r.flight, target, distToTarget < 60 ? 0.7 : 0.95, groundAt), groundAt, runway);
        if (time > RACE.flybyAt + 3) {
          // Back to racing — but the flyby flew BIRU off its course, so
          // resync its ring progress to the player's (its next ring is
          // the player's next ring, ahead of it), or it would backtrack
          // to a ring behind it.
          const n = ps.ringsPassed;
          r.course.setProgress(n);
          s.ringsPassed = n;
          r.state = 'racing';
          r.stateT = 0;
          r.flybyDone = true;
        } else if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          hide(r, RACE.respawnDelay);
        }
      } else {
        // Racing: the same autopilot the player uses, aimed at the rival's
        // own next ring with a sinusoidal lateral weave, and a rubber-band
        // throttle that pulls the pack back together when it strings out.
        // The weave shrinks as the ring gets close — a full 22 m weave at
        // the ring would aim outside its 13 m radius, so the rival would
        // orbit the ring forever and never pass it. Far out it weaves
        // wide; on final it aims dead centre.
        const next = r.course.nextRing();
        let target = next;
        let holding = false;
        if (next) {
          const idx = r.course.rings.indexOf(next);
          const prev = idx > 0 ? r.course.rings[idx - 1] : r.course.spawn;
          const dx = next.x - prev.x;
          const dz = next.z - prev.z;
          const len = Math.hypot(dx, dz) || 1;
          const px = -dz / len;
          const pz = dx / len;
          const distRing = Math.hypot(next.x - s.x, next.y - s.y, next.z - s.z);
          const weaveAmp = Math.min(22, distRing * 0.12);
          const weave = Math.sin(time * 0.6 + r.weavePhase) * weaveAmp;
          target = { x: next.x + px * weave, y: next.y, z: next.z + pz * weave, axis: next.axis };
        } else {
          // Course finished: hold in a wide orbit around the runway.
          // Rivals never land — the player's landing is the only one
          // that matters, and the landing shot needs rivals still in
          // the air near the strip (without this, every rival lands
          // and vanishes before the landing frame freezes at ~60-70 s,
          // since the 140 s in shots.js is only a cap, not the freeze
          // time). The target circles the runway at 300 m radius,
          // 40 m above the strip, so the autopilot flies a steady
          // holding pattern instead of touching down.
          holding = true;
          const ang = time * 0.15;
          target = { x: runway.x + Math.cos(ang) * 300, y: runway.height + 40, z: runway.z + Math.sin(ang) * 300 };
        }
        // Tight pack: within 120 m of the player the rival flies its own
        // speed; further out it brakes (ahead) or goes full throttle
        // (behind), so the scripted flyby and collision always find the
        // pack near the player instead of strung out over a kilometre.
        // In the holding pattern the throttle is fixed — the rubber-band
        // would surge and brake the orbit for no reason.
        const gap = (s.x - ps.x) * pf.x + (s.z - ps.z) * pf.z;
        const throttle = holding ? 0.6 : gap > 120 ? 0.5 : gap < -120 ? 1.0 : 0.72 * r.speedBias;
        const prev = { x: s.x, y: s.y, z: s.z };
        const ev = r.flight.step(dt, autopilotTo(r.flight, target, throttle, groundAt), groundAt, runway);
        const pass = r.course.checkPass(prev, s);
        if (pass && pass.passed) s.ringsPassed += 1;
        if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          hide(r, RACE.respawnDelay);
        } else if (ev & EVENT_LAND) {
          // Finished the race — out for the rest of the run.
          hide(r, 9999);
        }
      }
      // --- mesh ---
      if (r.state === 'gone') continue;
      syncMesh(r);
      if (r.state === 'spinning' || r.state === 'tumbling') {
        r.api.group.rotation.z += r.spinAngle;
        r.api.group.rotation.x += r.spinAngle * 0.4;
      }
      r.api.update(dt, r.flight.state.throttle, time);
    }
  }

  /** The player's race position, "3/5": rivals still racing and ahead of
   *  the player on rings, then on distance to the next objective. Crashed
   *  rivals are out and do not count. When the course is done the next
   *  objective is the runway itself — distanceToNext returns 0 with no
   *  next ring, which would tie every finished rival with the player and
   *  hide a rival that is genuinely ahead on final approach. */
  function playerPosition(player, playerCourse) {
    const ps = player.state;
    const pRings = ps.ringsPassed;
    const pNext = playerCourse.nextRing();
    const pDist = pNext
      ? playerCourse.distanceToNext(ps.x, ps.y, ps.z)
      : Math.hypot(ps.x - playerCourse.runway.x, ps.y - playerCourse.runway.y, ps.z - playerCourse.runway.z);
    let ahead = 0;
    for (const r of rivals) {
      if (r.state === 'gone' || r.state === 'diving' || r.state === 'spinning' || r.state === 'tumbling') continue;
      const rs = r.flight.state;
      const rRings = rs.ringsPassed;
      const rNext = r.course.nextRing();
      const rDist = rNext
        ? r.course.distanceToNext(rs.x, rs.y, rs.z)
        : Math.hypot(rs.x - r.course.runway.x, rs.y - r.course.runway.y, rs.z - r.course.runway.z);
      if (rRings > pRings || (rRings === pRings && rDist < pDist)) ahead += 1;
    }
    return `${ahead + 1}/5`;
  }

  /** Back to the start line: fresh pack, no crashes, all visible. */
  function reset() {
    for (let i = 0; i < rivals.length; i += 1) {
      const r = rivals[i];
      const course = createCourse(createRandom(seed + 7), seed, islands);
      r.course = course;
      const flight = createFlight(course.spawn);
      const fx = Math.sin(course.spawn.yaw);
      const fz = -Math.cos(course.spawn.yaw);
      // Same stagger as creation: BIRU 25 m ahead, the rest behind.
      const back = i === 0 ? -25 : i * 80;
      flight.state.x -= fx * back;
      flight.state.z -= fz * back;
      r.flight = flight;
      r.state = 'racing';
      r.stateT = 0;
      r.crashed = { dive: false, clip: false, collision: false };
      r.flybyDone = false;
      r.flybyTriggered = false;
      r.prevAlong = -999;
      r.spinAngle = 0;
      r.respawnT = 0;
      r.meetPoint = null;
      r.api.group.visible = true;
      syncMesh(r);
    }
  }

  for (const r of rivals) syncMesh(r);
  return {
    group, update, playerPosition, reset,
    /** Debug: each rival's name, state, rings and position (for the sim probe). */
    debug() {
      return rivals.map((r) => ({
        name: r.name,
        state: r.state,
        rings: r.flight.state.ringsPassed,
        x: r.flight.state.x,
        y: r.flight.state.y,
        z: r.flight.state.z,
        visible: r.api.group.visible,
      }));
    },
  };
}
