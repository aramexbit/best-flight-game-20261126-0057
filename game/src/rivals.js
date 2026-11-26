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
//   R1 BIRU    dives at 11.5 s — the cockpit shot at 12 s catches it
//              smoking ahead, flying straight for the first 1.5 s; then
//              it rejoins and does the near-miss flyby down the player's
//              left side at 39-42 s, so the cover shot at 41 s catches
//              it overtaking.
//   R4 ORANYE  clips ring 11 at 35 s, spins, dives and hits the sea at
//              ~41 s — the dive and its smoke trail cross the player's
//              path during the run, but the wreck itself lands ~180 m
//              behind the player, so it is NOT in the cover frame (the
//              chase camera looks forward). The cover's visible crashes
//              are BIRU's dive (cockpit shot) and the mid-air collision.
//   R2 KUNING + R3 HIJAU converge from ~26.8 s on a point tied to the
//              player's live progress (player's ring + LEAD: 3 when the
//              player faces ring + 3, 1 otherwise), HOLD there orbiting, and
//              RACE.collisionTriggerDist (backstop: 60 s / 600 m) — the
//              cover shot catches the fireball, the dark smoke and both
//              airframes TORN IN TWO, tumbling and burning. v13 fired
//              the collision on a fixed 40.8 s clock at fixed ring 11,
//              so on a real player's line it went off kilometres away
//              and nobody ever saw it.
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
  // v14: speedBias up across the pack (was 1.02/0.99/1.00/0.97) — the
  // rivals must LEAD the player from the start, visibly ahead of it, not
  // trail behind where the chase camera never sees them.
  // Gemini's fix prompt asks for 1.15-1.30x player cruise speed
  // (145-165 KTS vs the player's 110-130). v15 uses the TOP of that
  // range — the user asked for rivals FASTER than the player so the
  // blast is seen — 1.28/1.26/1.24/1.22; the sim must still pass 12/12
  // rings on every seed, or the values come back down.
  { name: 'BIRU', main: '#E8EEF2', accent: '#2563EB', speedBias: 1.28, weave: 0.0 },
  { name: 'KUNING', main: '#FFD52A', accent: '#22242a', speedBias: 1.26, weave: 2.1 },
  { name: 'HIJAU', main: '#F2E5C5', accent: '#2E9E33', speedBias: 1.24, weave: 4.2 },
  { name: 'ORANYE', main: '#F2E5C5', accent: '#FF7F2A', speedBias: 1.22, weave: 1.3 },
];

// v15: race-number markers — one floating sprite per rival (#2-#5 in
// Gemini's marker colours: cyan, violet, lime, coral), so each rival
// reads as a numbered racer in the pack instead of anonymous traffic.
// The same colours are the slipstream-trail colours.
const MARKER_COLORS = ['#00E5FF', '#A855F7', '#A3E635', '#FF3B6B'];
const MARKER_COLOR_HEX = [0x00e5ff, 0xa855f7, 0xa3e635, 0xff3b6b];
function makeMarkerSprite(THREE, text, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const x = c.getContext('2d');
  x.beginPath();
  x.arc(64, 64, 56, 0, Math.PI * 2);
  x.fillStyle = color;
  x.fill();
  x.lineWidth = 8;
  x.strokeStyle = '#ffffff';
  x.stroke();
  x.fillStyle = '#132238';
  x.font = '900 64px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  // v15 (fix): scale 3.5 m (was 9) — at 9 m the disc subtended ~20° at
  // race distance and COVERED the rival, the ring and half the cockpit
  // windshield in the v15 shots; a 3.5 m badge reads as a race number
  // without hiding the plane it marks.
  sprite.scale.set(3.5, 3.5, 1);
  return sprite;
}

export function createRivals(THREE, seed, islands, effects) {
  const group = new THREE.Group();
  // v14 fix: ONE shared meeting point for the collision pair. Each rival
  // used to compute its own point object from the player's live progress,
  // so a rival that re-converged after a crash aimed at a NEW point (the
  // player's ring + 2 by then) while its partner still held at the old
  // one — the pair never met and the collision never fired (seeds 5 and 9
  // in the probe). The first rival to converge fixes the point for the
  // run; the partner reuses it, however late it arrives.
  let sharedMeetPoint = null;
  // v16: when the player-relative re-anchor last fired (see 'holding').
  let lastRelAnchorAt = -999;

  function forwardOf(yaw) {
    return { x: Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
  }

  // v16 (fix, live probe run 6): the collision lead from the player's
  // BEARING, not their ring count. Lead 3 only when the player faces
  // ring + 3 within ~30° (facing > 0.85) — then the pair waits where
  // the player is LOOKING and the fire gates can align. Otherwise
  // lead 1: the pair waits at the ring the player is actually flying
  // toward. A ring-count rule gave lead 3 to a weaving live player
  // (9 rings in 75 s) whose course bent away from ring + 3, so the
  // blast sat behind them and never fired.
  function leadFor(ps, pf, rings) {
    const idx = Math.min(rings.length - 1, ps.ringsPassed + 3);
    const r = rings[idx];
    const dx = r.x - ps.x;
    const dz = r.z - ps.z;
    const d = Math.hypot(dx, dz) || 1;
    const facing = (dx * pf.x + dz * pf.z) / d;
    return facing > 0.85 ? 3 : 1;
  }

  // v16 (fix, live probe run 8): true when the player is within 600 m
  // of the collision anchor (ring + LEAD, 60 m past it) — the pair
  // converges early, while it is still near the player, instead of
  // waiting for the 26.8 s clock while the player flies away.
  function nearAnchor(ps, pf, course) {
    const lead = leadFor(ps, pf, course.rings);
    const idx = Math.min(course.rings.length - 1, ps.ringsPassed + lead);
    const ring = course.rings[idx];
    const ax = ring.axis;
    const axx = ring.x + ax.x * 60;
    const ay = ring.y + 25;
    const az = ring.z + ax.z * 60;
    return Math.hypot(ps.x - axx, ps.y - ay, ps.z - az) < 600;
  }

  // v16: lane separation — each rival owns an altitude band and a
  // lateral offset corridor, so the pack spreads across the sky
  // instead of bunching on one line (Gemini v15: #3 stacked behind
  // #5). The offset fades to zero near the ring (see the racing
  // branch), so every rival still crosses its gate dead centre.
  const LANES = [
    { lat: -28, alt: 14 },
    { lat: 24, alt: -10 },
    { lat: -12, alt: 26 },
    { lat: 34, alt: 6 },
  ];

  const rivals = LIVERIES.map((liv, i) => {
    const api = buildPlane(THREE, { main: liv.main, accent: liv.accent });
    group.add(api.group);
    // v15: the numbered race marker floats above the plane (a sprite on
    // the rivals group, positioned in syncMesh, so it never rolls with
    // the airframe) — #2 BIRU, #3 KUNING, #4 HIJAU, #5 ORANYE.
    const marker = makeMarkerSprite(THREE, `#${i + 2}`, MARKER_COLORS[i]);
    group.add(marker);
    // Each rival runs its own course instance: identical rings (same seed),
    // but its own nextIndex and streak, so its progress is independent of
    // the player's and of the other rivals'.
    const course = createCourse(createRandom(seed + 7), seed, islands);
    const flight = createFlight(course.spawn);
    // Stagger the start line, v14: ALL FOUR rivals start AHEAD of the
    // player (BIRU 50 m, KUNING 35 m, HIJAU 25 m, ORANYE 15 m), spread
    // along the course line — the player chases the pack from behind and
    // sees them the whole run, instead of the pack trailing where the
    // chase camera never looks. (v13: only BIRU ahead at 25 m, the rest
    // 80-240 m behind — the user never saw them while playing.)
    const fx = Math.sin(course.spawn.yaw);
    const fz = -Math.cos(course.spawn.yaw);
    const back = [-50, -35, -25, -15][i];
    flight.state.x -= fx * back;
    flight.state.z -= fz * back;
    return {
      name: liv.name, livery: liv, api, flight, course,
      state: 'racing', stateT: 0,
      speedBias: liv.speedBias, weavePhase: liv.weave,
      crashed: { dive: false, clip: false, collision: false },
      flybyDone: false, flybyTriggered: false, prevAlong: -999,
      spinAngle: 0, vel: { x: 0, y: 0, z: 0 },
      smokeT: 0, trailT: 0, respawnT: 0, meetPoint: null, marker,
      trailColor: MARKER_COLOR_HEX[i],
    };
  });

  /** Put the mesh where the flight state says it is (player-style pose). */
  function syncMesh(r) {
    const s = r.flight.state;
    r.api.group.position.set(s.x, s.y, s.z);
    r.api.group.rotation.y = -s.yaw;
    r.api.group.rotation.x = s.pitch;
    // v16: the DISPLAYED bank caps at ~52° — the flight model's full
    // 77° bank read as a plane on its side in the cockpit shot. The
    // flight state is untouched; only the mesh leans less.
    r.api.group.rotation.z = -Math.max(-0.9, Math.min(0.9, s.roll));
    // v15: the race-number marker floats 4.5 m above the plane in world
    // space (not rolled with the airframe) and hides with its plane.
    // (4.5 m, was 5.5 — with the smaller 3.5 m badge the marker sits
    // closer to the airframe instead of floating high above it.)
    if (r.marker) {
      r.marker.position.set(s.x, s.y + 4.5, s.z);
      r.marker.visible = r.api.group.visible;
    }
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
    if (r.marker) r.marker.visible = false;
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
   * shake. `onEvent` (v14, optional) is called as onEvent(kind, detail)
   * for race events the game should announce — currently 'collision',
   * so main.js can flash the HUD message, play the boom and shake the
   * camera. Rivals read the player, they never write to it.
   */
  function update(dt, time, player, playerCourse, groundAt, runway, audio, onShake, onEvent) {
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
          && (time >= RACE.collisionAt - 14 || (time >= 20 && nearAnchor(ps, pf, playerCourse)))) {
          // Converge on a point on the course AHEAD OF THE PLAYER, not a
          // fixed ring: the player's ring + LEAD, 60 m past it, 25 m up.
          // v13 used fixed ring 11, so on a slow player line the blast
          // went off kilometres ahead (or behind) — the user never saw
          // it. A point tied to the player's live progress stays in
          // front of the player, wherever the player actually is.
          // The point is SHARED (see sharedMeetPoint above): the first
          // rival to converge fixes it, the partner reuses it.
          // v16 (fix, live probe run 8): the converge is PROXIMITY-
          // triggered, not purely time-triggered. The pair stays
          // 'racing' (rubber-banded near the player) until the player
          // is within 600 m of the anchor, then converges — a short
          // flight, so they are HOLDING when the player closes in. The
          // 26.8 s time trigger stays as a backstop (the sim blast at
          // ~34 s is unchanged: the sim player is not within 600 m of
          // the anchor before 26.8 s). A pure time trigger stranded the
          // pair: a fast straight player (A2, 83 m/s) passed ring 3 at
          // ~22 s, but the pair only started converging at 26.8 s and
          // arrived after the player had flown 2 km past the point.
          r.state = 'converging';
          r.stateT = 0;
          if (!sharedMeetPoint) {
            const lead = leadFor(ps, pf, playerCourse.rings);
            const idx = Math.min(playerCourse.rings.length - 1, ps.ringsPassed + lead);
            const ring = playerCourse.rings[idx];
            const ax = ring.axis;
            sharedMeetPoint = { x: ring.x + ax.x * 60, y: ring.y + 25, z: ring.z + ax.z * 60 };
          }
          r.meetPoint = sharedMeetPoint;
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
        // at full throttle. Once a rival gets within 120 m it HOLDS there,
        // orbiting the point, until the collision fires — so the blast
        // waits for the player instead of going off on a clock the player
        // cannot see (v13: the fixed 40.8 s blast fired kilometres away).
        // The fire itself lives in the 'holding' branch: both rivals
        // within 80 m of the point AND the player within trigger range.
        const ev = r.flight.step(
          dt, autopilotTo(r.flight, r.meetPoint, 1.0, groundAt), groundAt, runway,
        );
        if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          hide(r, RACE.respawnDelay);
        } else {
          const dMeet = Math.hypot(s.x - r.meetPoint.x, s.y - r.meetPoint.y, s.z - r.meetPoint.z);
          if (dMeet < 120) {
            r.state = 'holding';
            r.stateT = 0;
          }
        }
      } else if (r.state === 'holding') {
        // v15: keep the meeting point AHEAD of the player. If the player
        // has flown past it (behind them) or is still more than 400 m
        // away, re-anchor it to the player's ring + LEAD (bearing-based:
        // 3 when the player faces ring + 3, 1 otherwise — see the
        // converge note) and send both rivals converging again — the
        // the anchor is 400 m ahead of the player instead — see the fix
        // note below — because re-anchoring to ring 12 again would
        // freeze the point behind a player who has already flown past
        // it (seed 11: no blast in 120 s).
        const alongMp = (r.meetPoint.x - ps.x) * pf.x + (r.meetPoint.z - ps.z) * pf.z;
        const distMp = Math.hypot(ps.x - r.meetPoint.x, ps.y - r.meetPoint.y, ps.z - r.meetPoint.z);
        // v16 (fix, live probe run 2): the player-relative re-anchor fires
        // ONCE (lastRelAnchorAt < 0). Re-anchoring it every 10 s yanked
        // the point away faster than the pair could fly to it, so a
        // straight-flying player never saw the blast. After the one
        // rel-anchor, the point moves only when it goes stale (player
        // flew past it / >400 m away).
        const needRel = time >= RACE.collisionPlayerRelAt && lastRelAnchorAt < 0;
        // v15 (fix, seed 11): when the player's ring + LEAD is past the
        // last ring (ringsPassed >= 12 - LEAD), the ring index CLAMPS
        // the re-anchor re-anchored to the SAME point the player had
        // just flown past, the rivals converged on a point behind the
        // player, and the blast could never fire in view (facing < 0,
        // blastDist < 100) for the rest of the flight. In the clamped
        // case anchor 400 m AHEAD of the player along their heading
        // instead: a point that moves with the player, so the rivals
        // converge on somewhere the player is flying TOWARD and the
        // in-view gates (100-400 m, facing > 0.6) can align during the
        // final approach. 400 m gives the rivals (~5 s to converge from
        // ~440 m) time to arrive before the player covers it (~6 s).
        // v16 (fix, live probe run 2): the 60 s re-anchor cap is GONE.
        // A slow player passes their first ring after 60 s; with the cap
        // the anchor froze behind them and the pair waited at a dead
        // point forever. The re-anchor is bounded by player progress
        // (12 rings) and by staleness, not by the clock.
        if (distMp > 400 || alongMp < -50 || needRel) {
          // v16: the player-relative anchor. From collisionPlayerRelAt
          // on, the point is put 350 m AHEAD of the player (not on the
          // course) — a human who flies straight off-course never comes
          // within 250 m of a course-tied point, so the blast must come
          // to them. 350 m (was 220 m): the player covers 220 m in ~4 s
          // but the pair needs ~5 s to arrive from their holding point,
          // so at 220 m the player had already passed the point when the
          // pair got there. At 350 m the player needs ~6 s to reach it
          // and the pair ~2-3 s, so the pair is holding, in view, when
          // the player closes in.
          // v16: bearing-based lead (same rule as the converge): 3 when
          // the player faces ring + 3, 1 otherwise.
          const lead = leadFor(ps, pf, playerCourse.rings);
          const clamped = ps.ringsPassed + lead >= playerCourse.rings.length;
          // v16 (fix): the player-relative anchor's altitude is CLAMPED
          // to the course band (next ring + 80 m, or runway + 80 m when
          // the course is done). Anchoring at the player's own altitude
          // stranded the blast when a straight-flying player climbed
          // (A2: player at 618 m, anchor at 633 m — the pair could never
          // climb 480 m to it, so no blast in 85 s). The pair flies the
          // course; the point must stay where they can reach it.
          const nextRing = playerCourse.nextRing();
          const courseY = nextRing ? nextRing.y : runway.height + 60;
          const anchorY = Math.min(ps.y + 15, courseY + 80);
          if (needRel) {
            sharedMeetPoint = { x: ps.x + pf.x * 350, y: anchorY, z: ps.z + pf.z * 350 };
            lastRelAnchorAt = time;
          } else if (clamped) {
            sharedMeetPoint = { x: ps.x + pf.x * 400, y: anchorY, z: ps.z + pf.z * 400 };
          } else {
            const idx = Math.min(playerCourse.rings.length - 1, ps.ringsPassed + lead);
            const ring = playerCourse.rings[idx];
            const ax = ring.axis;
            sharedMeetPoint = { x: ring.x + ax.x * 60, y: ring.y + 25, z: ring.z + ax.z * 60 };
          }
          for (const o of rivals) {
            if ((o.name === 'KUNING' || o.name === 'HIJAU') && (o.state === 'holding' || o.state === 'converging')) {
              o.meetPoint = sharedMeetPoint;
              o.state = 'converging';
              o.stateT = 0;
            }
          }
        }
        // Orbit the meeting point (15 m radius, slow 0.25 rad/s, opposite
        // phases so the two rivals cross each other) until the player
        // closes in — then the collision fires IN FRONT of the player, in
        // view. v14 fix 2: the orbit was 25 m at 0.5 rad/s, so the target
        // point raced around at 12.5 m/s and the rivals chased it in a
        // ~118 m radius orbit, 237 m apart — no collision could ever read
        // as two planes meeting. A slow small orbit keeps them near the
        // point; throttle 0.4 (was 0.6) slows the orbit further.
        const ang = time * 0.25 + (r.name === 'HIJAU' ? Math.PI : 0);
        const target = {
          x: r.meetPoint.x + Math.cos(ang) * 15,
          y: r.meetPoint.y,
          z: r.meetPoint.z + Math.sin(ang) * 15,
        };
        const ev = r.flight.step(dt, autopilotTo(r.flight, target, 0.4, groundAt), groundAt, runway);
        // v14 fix 1: the partner lookup compared meetPoint objects by
        // IDENTITY (o.meetPoint === r.meetPoint) — each rival builds its
        // own point object, so the lookup NEVER matched and the collision
        // never fired in any run (the probe caught it: events [] on all
        // 12 seeds). Match on state only: both rivals converge on the
        // same player-relative point in the same frame.
        const other = rivals.find((o) => o !== r && (o.name === 'KUNING' || o.name === 'HIJAU')
          && o.state === 'holding');
        const playerDist = Math.hypot(ps.x - r.meetPoint.x, ps.y - r.meetPoint.y, ps.z - r.meetPoint.z);
        // v14 fix 3: fire only when BOTH rivals are actually near the
        // point (within 80 m), so the blast midpoint sits between two
        // planes that are really meeting — not between two dots 200 m
        // apart in empty sky.
        const rNear = Math.hypot(s.x - r.meetPoint.x, s.y - r.meetPoint.y, s.z - r.meetPoint.z) < 80;
        const oNear = other
          && Math.hypot(other.flight.state.x - r.meetPoint.x, other.flight.state.y - r.meetPoint.y, other.flight.state.z - r.meetPoint.z) < 80;
        // v15: the blast must be IN VIEW — 100-400 m ahead of the player,
        // inside a ~53° forward cone — so the fireball fills the
        // windshield instead of going off behind the camera or a
        // kilometre away (the user's live playtest: the blast fired at
        // the 60 s / 800 m backstop, invisible). The backstop now needs
        // the player within 350 m AND roughly facing the blast.
        // v16 (fix, live probe run 4): facing > 0.6 (≈53°) is WIDER
        // than the chase camera's half-FOV (~35°), so the blast passed
        // the gate at facing 0.7 (45° off-axis) and the fireball was
        // OFF-FRAME — only a smoke wisp at the frame edge, 188 m away.
        // The gates now need facing > 0.85 (≈32°), inside the frame,
        // so the fireball is ON SCREEN when it fires.
        let blastDist = Infinity;
        let facing = -1;
        if (other) {
          const os = other.flight.state;
          const mx = (s.x + os.x) / 2;
          const mz = (s.z + os.z) / 2;
          blastDist = Math.hypot(mx - ps.x, s.y - ps.y, mz - ps.z);
          if (blastDist > 0.01) {
            facing = ((mx - ps.x) * pf.x + (mz - ps.z) * pf.z) / blastDist;
          }
        }
        const inView = blastDist >= 100 && blastDist <= 400 && facing > 0.85;
        const fire = other && rNear && oNear && inView
          && ((playerDist < RACE.collisionTriggerDist)
            || (time >= RACE.collisionFallbackAt && playerDist < RACE.collisionCloseDist && facing > 0.85));
        // v15 (fix, seed 11): second-chance window. The normal gates
        // (both rivals within 80 m, blast 100-400 m ahead) assume the
        // pair settles at the meeting point before the player arrives.
        // On a slow-convergence line the player reaches the point while
        // the rivals are still looping ~100 m around it (their holding
        // orbit is a wide autopilot loop, not a hover), so the window
        // never opens — seed 11 ran 120 s with no blast. From 45 s on,
        // if both rivals are within 130 m of the point and the blast
        // midpoint is 50-400 m ahead in view, fire anyway: a 34 m
        // fireball at 50 m still fills the windshield. Seeds that fire
        // on the normal window (~34 s) never reach this branch, so the
        // cover staging (seed 1 blast ~33.8 s) is untouched.
        const rNearLate = Math.hypot(s.x - r.meetPoint.x, s.y - r.meetPoint.y, s.z - r.meetPoint.z) < 130;
        const oNearLate = other
          && Math.hypot(other.flight.state.x - r.meetPoint.x, other.flight.state.y - r.meetPoint.y, other.flight.state.z - r.meetPoint.z) < 130;
        const lateFire = other && rNearLate && oNearLate && time >= 45
          && blastDist >= 50 && blastDist <= 400 && facing > 0.85 && playerDist < 350;
        // v16: the player-relative fire. The point was anchored 350 m
        // ahead of the player, so no playerDist gate is needed — the
        // in-view gates (50-400 m ahead, facing the blast) ARE the
        // guarantee the fireball fills the windshield. This is what
        // makes the blast visible to a human who flies straight.
        const relFire = other && rNearLate && oNearLate && time >= RACE.collisionPlayerRelAt
          && blastDist >= 50 && blastDist <= 400 && facing > 0.85;
        if (fire || lateFire || relFire) {
          // The collision: big dark-smoke fireball at the midpoint, and
          // BOTH airframes torn in two, tumbling away burning. The other
          // rival is switched to tumbling here too, so the blast only
          // fires once (the loop reaches it next as 'tumbling', not
          // 'holding').
          const os = other.flight.state;
          const mx = (s.x + os.x) / 2;
          const my = (s.y + os.y) / 2;
          const mz = (s.z + os.z) / 2;
          // v16: a CHAIN blast — two staggered follow-up fireballs, so
          // the collision blooms as 2-3 distinct fireballs in depth.
          effects.explodeChain(mx, my, mz, true);
          for (const [rv, st] of [[r, s], [other, os]]) {
            effects.explodeSplit(st.x, st.y, st.z, st.yaw, { body: rv.livery.main, accent: rv.livery.accent });
            const f = forwardOf(st.yaw);
            rv.vel = { x: f.x * 30, y: 8, z: f.z * 30 };
            rv.state = 'tumbling';
            rv.stateT = 0;
            rv.crashed.collision = true;
            rv.spinAngle = 0;
          }
          if (onEvent) onEvent('collision', { x: mx, y: my, z: mz });
          if (onShake) onShake(0.5);
        } else if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          hide(r, RACE.respawnDelay);
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
        // v14: the first 1.5 s of the dive fly STRAIGHT (roll 0) — in v13
        // the sin(time*3) roll started at full amplitude, so the cockpit
        // shot at 12 s caught BIRU already banked hard at the frame edge,
        // which Gemini read as a glitch / another plane overlapping the
        // cockpit. Straight first, then the weave.
        s.roll = r.stateT < 1.5 ? 0 : Math.sin(time * 3) * 0.3;
        const f = forwardOf(s.yaw);
        r.vel.y -= 7 * dt;
        s.x += f.x * s.speed * dt;
        s.z += f.z * s.speed * dt;
        s.y += r.vel.y * dt;
        emitSmoke(r, dt);
        if (s.y <= groundAt(s.x, s.z) + 2) {
          const g = groundAt(s.x, s.z);
          effects.explode(s.x, Math.max(1, g + 1), s.z, false);
          // v16: a sea impact throws a splash crown and leaves a
          // burning oil slick drifting on the waves (Gemini's v16
          // build prompt) — the wreck, the smoke column, the splash
          // and the slick together mark where the rival went down.
          if (g <= 2) {
            effects.splash(s.x, s.z);
            effects.oilSlick(s.x, s.z);
          }
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
        // v16: the ace's slipstream — white streak puffs off the tail
        // while BIRU cuts across, so the flyby reads as speed, not a
        // teleport. (The racing branch's coloured trail is 0.25 s; the
        // flyby streaks every 0.1 s, brighter and white.)
        r.trailT += dt;
        if (r.trailT >= 0.1) {
          r.trailT = 0;
          const f2 = forwardOf(s.yaw);
          effects.smokePuff(s.x - f2.x * 4, s.y - 0.1, s.z - f2.z * 4, 1.2, {
            color: 0xffffff, life: 0.9, grow: 0.8,
            vel: { x: -f2.x * 8, y: 0.2, z: -f2.z * 8 }, opacity: 0.45,
          });
        }
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
          // v14: weave amplitude 12 m max (was 22), shrinking FAST near
          // the ring (0.05/m, was 0.12/m) — the diag showed one rival
          // routinely 800+ m behind the player at converge time because
          // it kept MISSING rings: a 12 m weave at 100 m out still aims
          // up to 12 m off centre on a 13 m ring, so the crossing often
          // lands outside the gate and the 400 m recovery costs ~10 s.
          // With 0.05/m the weave is 5 m at 100 m out and dead centre on
          // final — the weave still reads far out, but the rival actually
          // passes its rings and keeps up with the player.
          const weaveAmp = Math.min(12, distRing * 0.05);
          const weave = Math.sin(time * 0.6 + r.weavePhase) * weaveAmp;
          // v16: lane separation — the rival's altitude band and lateral
          // corridor, scaled by distance so it is full 300 m out and
          // zero at the gate (a 26 m altitude offset at the ring would
          // miss the 13 m gate entirely). Mid-leg the pack reads spread
          // across the sky; on final every rival aims dead centre.
          const lane = LANES[rivals.indexOf(r)];
          const laneScale = Math.min(1, distRing / 300);
          const laneOff = lane.lat * laneScale;
          target = {
            x: next.x + px * (weave + laneOff),
            y: next.y + lane.alt * laneScale,
            z: next.z + pz * (weave + laneOff),
            axis: next.axis,
          };
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
        // v15: coloured slipstream — a small puff in the rival's marker
        // colour every 0.25 s off the tail, so the pack leaves motion
        // cues instead of flying clean and anonymous (Gemini: rivals
        // must read as an active racing pack, not scattered traffic).
        // v15 (fix): size 1.0 (was 1.4) and opacity 0.30 (was 0.45) — a
        // trail puff close to the cockpit camera washed a quarter of
        // the windshield pink in the v15 cockpit shot; smaller and
        // fainter still reads as a motion cue at race distance.
        r.trailT += dt;
        if (r.trailT >= 0.25) {
          r.trailT = 0;
          const f = forwardOf(s.yaw);
          effects.smokePuff(s.x - f.x * 4, s.y - 0.1, s.z - f.z * 4, 1.0, {
            color: r.trailColor,
            life: 1.1, grow: 1.0,
            vel: { x: -f.x * 6, y: 0.2, z: -f.z * 6 }, opacity: 0.30,
          });
        }
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
      // Same stagger as creation (v14): all four ahead of the player —
      // BIRU 50 m, KUNING 35 m, HIJAU 25 m, ORANYE 15 m.
      const back = [-50, -35, -25, -15][i];
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
    // v14: the shared collision point resets with the pack.
    // v16: the player-relative re-anchor clock resets too.
    sharedMeetPoint = null;
    lastRelAnchorAt = -999;
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
        meetPoint: r.meetPoint,
      }));
    },
  };
}
