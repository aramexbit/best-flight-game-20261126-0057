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
//
// v17: the blast COMES TO THE PLAYER — the meeting point tracks them
// (player-relative when off-course, ring-tied otherwise), the pair
// flies with a chase boost, and the fire floor is 40 s at facing > 0.7,
// so a fast straight player sees the collision (v16 probe A2: no blast
// in 75 s). Scripted dives/clips reposition 250 m ahead of the player
// when far away, and showcase flybys sweep the view from 46 s on, so
// rivals are seen regularly even off-course (v16 live playtest: rivals
// were almost never in frame).

import { COURSE, RACE } from './config.js';
import { createRandom } from './random.js';
import { createFlight, EVENT_CRASH, EVENT_LAND } from './flight.js';
import { collisionGate } from './collision.js';
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
  c.width = 192;
  c.height = 80;
  const x = c.getContext('2d');
  // v18: a compact navy pill with a gold border and white text — Gemini's
  // fix: the big round pink/blue pins read as default UI markers. The
  // pill is the HUD's navy (#063C85) with a 1.5 px gold (#FACC15) border.
  // The `color` argument is kept for the slipstream trail, not the badge.
  const w = 192; const h = 80; const r = 38;
  x.beginPath();
  x.moveTo(r + 2, 2);
  x.lineTo(w - r - 2, 2);
  x.arcTo(w - 2, 2, w - 2, h - 2, r);
  x.lineTo(w - 2, h - r - 2);
  x.arcTo(w - 2, h - 2, r + 2, h - 2, r);
  x.lineTo(r + 2, h - 2);
  x.arcTo(2, h - 2, 2, r + 2, r);
  x.lineTo(2, r + 2);
  x.arcTo(2, 2, r + 2, 2, r);
  x.closePath();
  x.fillStyle = '#063C85';
  x.fill();
  x.lineWidth = 4;
  x.strokeStyle = '#FACC15';
  x.stroke();
  x.fillStyle = '#ffffff';
  x.font = '900 44px system-ui, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 96, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  // v18: pill 5.0 x 2.1 m (192:80 aspect) — compact, reads as a race
  // number without hiding the plane it marks.
  sprite.scale.set(5.0, 2.1, 1);
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
  // v17: when the meeting point was last (re-)anchored, so the tracking
  // re-anchor in 'holding' cannot yank the point faster than the pair
  // can fly to it (see below).
  let lastAnchorAt = -999;
  // v17: when the next showcase flyby may start (see update()).
  let nextShowcaseAt = RACE.showcaseAt;

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

  // v17: the player's distance to the course polyline (spawn -> rings ->
  // runway), in metres. The sim player tracks the line within ~50 m; a
  // straight off-course player is hundreds of metres away — the
  // discriminator for the early player-relative converge.
  function offCourse(ps, course) {
    const pts = [{ x: course.spawn.x, z: course.spawn.z },
      ...course.rings.map((r) => ({ x: r.x, z: r.z })),
      { x: course.runway.x, z: course.runway.z }];
    let minD = Infinity;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const ax = pts[i].x; const az = pts[i].z;
      const bx = pts[i + 1].x; const bz = pts[i + 1].z;
      const dx = bx - ax; const dz = bz - az;
      const len2 = dx * dx + dz * dz || 1;
      let t = ((ps.x - ax) * dx + (ps.z - az) * dz) / len2;
      t = Math.max(0, Math.min(1, t));
      minD = Math.min(minD, Math.hypot(ps.x - (ax + dx * t), ps.z - (az + dz * t)));
    }
    return minD;
  }

  // v17 (fix, live probe A2): the next ring is BEHIND the player — they
  // flew straight past it without going through it. The polyline
  // distance alone cannot see this: the seed-1 course snakes so gently
  // that a straight player stays within 400 m of the polyline for 44 s
  // (offCourse 156 m at t=25), so the old offCourse-only trigger never
  // fired and the pair chased ring points the player never visited.
  // A ring 100+ m behind the heading is a player who has overshot it.
  function nextRingBehind(ps, pf, course) {
    const ring = course.nextRing();
    if (!ring) return false;
    const along = (ring.x - ps.x) * pf.x + (ring.z - ps.z) * pf.z;
    return along < -100;
  }

  // v17: off-course = far from the polyline OR has overshot the next ring.
  function isOffCourse(ps, pf, course) {
    return offCourse(ps, course) > RACE.collisionOffCourse || nextRingBehind(ps, pf, course);
  }

  // v17: the meeting-point rule, in one place. A player far off the
  // course gets a point 250 m ahead of THEM (the blast comes to the
  // player); a player on the course gets the ring + LEAD point, 60 m
  // past the ring and 45 m to the SIDE of the ring line, so the
  // fireball sits BESIDE the next ring instead of swallowing it
  // (Gemini v17: the blast must not cover the ring). Altitude is the
  // course band (next ring + 80 m), never the player's own altitude —
  // a climbing player once stranded the pair 480 m below them (A2).
  function anchorFor(ps, pf, course, runway) {
    const nextRing = course.nextRing();
    const courseY = nextRing ? nextRing.y : runway.height + 60;
    const anchorY = Math.min(ps.y + 15, courseY + 80);
    const lead = leadFor(ps, pf, course.rings);
    // Course done (or nearly): anchor ahead of the player, not on a
    // ring behind them (v15 seed-11 fix, kept).
    if (ps.ringsPassed + lead >= course.rings.length) {
      return { x: ps.x + pf.x * 400, y: anchorY, z: ps.z + pf.z * 400, playerRel: true };
    }
    if (isOffCourse(ps, pf, course)) {
      // v17 (fix, live probe A2): 2000 m ahead, not 250 m. The pair
      // flies ~120 m/s and only closes ~32 m/s on a fast straight
      // player (88 m/s), so a 250 m anchor is passed by the player
      // (~2.8 s) long before the pair arrives (~6 s) — and the
      // re-anchor then leapfrogged it forward again, forever, so the
      // blast never fired in 75 s. A 2000 m lead gives the pair time
      // to arrive and HOLD while the player is still 100-400 m out,
      // so the fire gates can align.
      return { x: ps.x + pf.x * 2000, y: anchorY, z: ps.z + pf.z * 2000, playerRel: true };
    }
    const idx = Math.min(course.rings.length - 1, ps.ringsPassed + lead);
    const ring = course.rings[idx];
    const ax = ring.axis;
    // 45 m sideways off the ring line (perp = (-az, ax) in the ground plane).
    const perpX = -ax.z;
    const perpZ = ax.x;
    return {
      x: ring.x + ax.x * 60 + perpX * 45,
      y: ring.y + 25,
      z: ring.z + ax.z * 60 + perpZ * 45,
      playerRel: false,
    };
  }

  // v17: put a rival ahead of the player, at the player's altitude and
  // heading, so a scripted crash happens where the player is looking.
  // No-op when the rival is already within 400 m (the sim / on-course
  // case — the staged shots are untouched).
  function repositionAhead(r, ps, pf, dist) {
    const s = r.flight.state;
    if (Math.hypot(s.x - ps.x, s.y - ps.y, s.z - ps.z) <= 400) return;
    s.x = ps.x + pf.x * dist;
    s.z = ps.z + pf.z * dist;
    s.y = ps.y;
    s.yaw = ps.yaw;
    s.pitch = 0;
    s.roll = 0;
    s.speed = 55;
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
      crashRings: null, crashDist: null,
      trailColor: MARKER_COLOR_HEX[i], showcaseSide: 1,
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
    r.flight.state.maxSpeedBoost = 0;
    r.flight.state.thrustBoost = 1;
    r.api.group.visible = false;
    if (r.marker) r.marker.visible = false;
  }

  /** A rival's race progress (rings passed + distance to its next objective). */
  function raceProgress(r) {
    const rs = r.flight.state;
    const rNext = r.course.nextRing();
    const rDist = rNext
      ? r.course.distanceToNext(rs.x, rs.y, rs.z)
      : Math.hypot(rs.x - r.course.runway.x, rs.y - r.course.runway.y, rs.z - r.course.runway.z);
    return { rings: rs.ringsPassed, dist: rDist };
  }

  // v18: latch a rival's race progress the moment it crashes — a crashed
  // rival keeps counting at its crash position until it respawns behind
  // the player. The old code skipped crashed rivals entirely, so the
  // player jumped 5/5 -> 2/5 the instant the pair collided and fell back
  // to 5/5 when they respawned (v17 live playtest).
  function latchCrash(r) {
    const p = raceProgress(r);
    r.crashRings = p.rings;
    r.crashDist = p.dist;
  }

  function respawn(r, ps, pf) {
    const s = r.flight.state;
    // v18: the crash latch clears on respawn — the rival rejoins behind
    // the player and counts live again from here.
    r.crashRings = null;
    r.crashDist = null;
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
    s.maxSpeedBoost = 0;
    s.thrustBoost = 1;
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
    latchCrash(r);
    r.state = 'diving';
    r.stateT = 0;
    r.crashed[kind] = true;
    const f = forwardOf(s.yaw);
    r.vel = { x: f.x * s.speed, y: 0, z: f.z * s.speed };
  }

  function startSpin(r) {
    latchCrash(r);
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
    // v17: showcase flybys — from RACE.showcaseAt on, every
    // RACE.showcaseEvery seconds the nearest free rival (BIRU/ORANYE
    // with its scripted events done) sweeps across the player's view
    // 170 m ahead, so the pack is seen regularly even off-course
    // (v16 live playtest: rivals were almost never in frame).
    if (time >= nextShowcaseAt) {
      nextShowcaseAt = time + RACE.showcaseEvery;
      let best = null;
      let bestD = Infinity;
      for (const o of rivals) {
        if (o.state !== 'racing') continue;
        const scriptedDone = o.name === 'BIRU'
          ? (o.crashed.dive && o.flybyDone)
          : o.name === 'ORANYE' ? o.crashed.clip : false;
        if (!scriptedDone) continue;
        const d = Math.hypot(o.flight.state.x - ps.x, o.flight.state.y - ps.y, o.flight.state.z - ps.z);
        if (d < bestD) { bestD = d; best = o; }
      }
      if (best) {
        best.state = 'showcase';
        best.stateT = 0;
        best.showcaseSide = (best.showcaseSide || 1) * -1;
      }
    }
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
          // v17: if BIRU is far from the player (>400 m), the dive
          // happens somewhere the player never looks — reposition it
          // 250 m ahead of the player first, so the dive and the
          // explosion are seen. On the course (sim / on-course player)
          // BIRU is already within 400 m, so the staged cockpit shot
          // at 12 s is untouched.
          repositionAhead(r, ps, pf, 250);
          startDive(r, 'dive');
        } else if (r.name === 'ORANYE' && !r.crashed.clip && time >= RACE.clipCrashAt) {
          // v17: same — the wing-clip explosion must happen where the
          // player is looking, not behind them on the course.
          repositionAhead(r, ps, pf, 250);
          startSpin(r);
        } else if ((r.name === 'KUNING' || r.name === 'HIJAU') && !r.crashed.collision
          && (time >= RACE.collisionAt - 14 || (time >= 20 && nearAnchor(ps, pf, playerCourse))
            || (time >= RACE.collisionEarlyAt && ps.speed > 70 && isOffCourse(ps, pf, playerCourse)))) {
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
            sharedMeetPoint = anchorFor(ps, pf, playerCourse, runway);
            lastAnchorAt = time;
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
        // v17: chase boost — the pair flies ~120 m/s while converging
        // (thrust x1.8, cap +35), so they close on a fast straight
        // player instead of trailing at ~65 m/s (v16 probe A2). Cleared
        // when they start holding, when they fire, and on hide/respawn.
        // v17 (fix, live probe A2): a player-relative (off-course) meet
        // point is 2000 m ahead, so the pair must close a big deficit
        // on a fast player — give them a much bigger boost (~156 m/s,
        // thrust x3.0, cap +85) there, or they arrive after the player
        // has already passed the point, forever.
        if (r.meetPoint && r.meetPoint.playerRel) {
          r.flight.state.maxSpeedBoost = 85;
          r.flight.state.thrustBoost = 3.0;
        } else {
          r.flight.state.maxSpeedBoost = 35;
          r.flight.state.thrustBoost = 1.8;
        }
        const ev = r.flight.step(
          dt, autopilotTo(r.flight, r.meetPoint, 1.0, groundAt), groundAt, runway,
        );
        if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          latchCrash(r);
          hide(r, RACE.respawnDelay);
        } else {
          const dMeet = Math.hypot(s.x - r.meetPoint.x, s.y - r.meetPoint.y, s.z - r.meetPoint.z);
          if (dMeet < 120) {
            r.state = 'holding';
            r.stateT = 0;
            r.flight.state.maxSpeedBoost = 0;
            r.flight.state.thrustBoost = 1;
          }
        }
      } else if (r.state === 'holding') {
        // v17: the meeting point TRACKS the player. The old rule
        // re-anchored to a course-tied point whenever the player flew
        // past it, and the one player-relative re-anchor fired ONCE
        // (55 s) — a fast straight player outran the pair for good
        // (v16 probe A2: no blast in 75 s). Now anchorFor() picks the
        // point — player-relative when off-course, ring-tied otherwise
        // — and it is re-anchored whenever it goes stale (player flew
        // past it, or >400 m away), with at least 3 s between
        // re-anchors so the pair can close. The pair flies with a chase
        // boost while converging, so they catch a fast player.
        // v17 (fix): NO periodic re-anchor. The first v17 build moved
        // the point every 6 s while the player was still >150 m away —
        // as the player advanced rings the point jumped ~430 m forward
        // each time, faster than the pair could close, so the blast
        // slipped from 33.8 s (v16) to ~39 s and missed the 35 s cover
        // freeze. The point moves only when it goes stale.
        // v17 (fix, live probe A2): a player-relative anchor is
        // SUPPOSED to be far ahead (2000 m lead) — distMp > 400 is
        // normal there, not stale, and re-anchoring on it leapfrogged
        // the point forward faster than the pair could close, so the
        // blast never fired. A player-relative point moves only when
        // the player flew past it (alongMp < -50) or got very far from
        // it (distMp > 2500 — further than the lead itself, so the
        // player must have turned away; 800 was tried first and fired
        // the moment the pair arrived, while the player was still
        // ~1100 m out, leapfrogging the point forever). A course-tied
        // point keeps the old rule.
        const alongMp = (r.meetPoint.x - ps.x) * pf.x + (r.meetPoint.z - ps.z) * pf.z;
        const distMp = Math.hypot(ps.x - r.meetPoint.x, ps.y - r.meetPoint.y, ps.z - r.meetPoint.z);
        const stale = r.meetPoint.playerRel
          ? (alongMp < -50 || distMp > 2500)
          : (distMp > 400 || alongMp < -50);
        if (stale && time - lastAnchorAt > 3) {
          sharedMeetPoint = anchorFor(ps, pf, playerCourse, runway);
          lastAnchorAt = time;
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
        // OpenGame layer 2: the fire gates live in collision.js (pure,
        // headless-testable). The numbers there ARE these gates — the
        // v14 near-point rule, the v15 in-view rule, the v16 facing
        // > 0.85 rule, the v15 lateFire window and the v17 relFire.
        const { fire, lateFire, relFire } = collisionGate({
          rPos: s,
          oPos: other ? other.flight.state : null,
          playerPos: ps,
          playerFwd: pf,
          meetPoint: r.meetPoint,
          time,
        });
        if (fire || lateFire || relFire) {
          // v17: the chase boost ends with the collision.
          r.flight.state.maxSpeedBoost = 0;
          r.flight.state.thrustBoost = 1;
          other.flight.state.maxSpeedBoost = 0;
          other.flight.state.thrustBoost = 1;
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
            latchCrash(rv);
            rv.state = 'tumbling';
            rv.stateT = 0;
            rv.crashed.collision = true;
            rv.spinAngle = 0;
          }
          if (onEvent) onEvent('collision', { x: mx, y: my, z: mz });
          if (onShake) onShake(0.5);
        } else if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          latchCrash(r);
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
          latchCrash(r);
          hide(r, RACE.respawnDelay);
        }
      } else if (r.state === 'showcase') {
        // v17: cross the player's view — the target sweeps from one
        // side to the other 170 m ahead over 6 s, so the rival is in
        // the frame the whole pass. Then resync to the player's rings
        // and race on.
        const progress = Math.min(1, r.stateT / 6);
        const side = r.showcaseSide || 1;
        const target = {
          x: ps.x + pf.x * 170 + pr.x * side * 130 * (1 - 2 * progress),
          y: ps.y + 4,
          z: ps.z + pf.z * 170 + pr.z * side * 130 * (1 - 2 * progress),
        };
        const ev = r.flight.step(dt, autopilotTo(r.flight, target, 0.95, groundAt), groundAt, runway);
        r.trailT += dt;
        if (r.trailT >= 0.25) {
          r.trailT = 0;
          const f = forwardOf(s.yaw);
          effects.smokePuff(s.x - f.x * 4, s.y - 0.1, s.z - f.z * 4, 0.8, {
            color: r.trailColor, life: 1.1, grow: 1.0,
            vel: { x: -f.x * 6, y: 0.2, z: -f.z * 6 }, opacity: 0.20,
          });
        }
        if (r.stateT >= 6) {
          const n = ps.ringsPassed;
          r.course.setProgress(n);
          s.ringsPassed = n;
          r.state = 'racing';
          r.stateT = 0;
        } else if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          latchCrash(r);
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
        // v18: size 0.8, opacity 0.20 — the v17 cockpit shot still had
        // a pink wash low-centre from the trail.
        r.trailT += dt;
        if (r.trailT >= 0.25) {
          r.trailT = 0;
          const f = forwardOf(s.yaw);
          effects.smokePuff(s.x - f.x * 4, s.y - 0.1, s.z - f.z * 4, 0.8, {
            color: r.trailColor,
            life: 1.1, grow: 1.0,
            vel: { x: -f.x * 6, y: 0.2, z: -f.z * 6 }, opacity: 0.20,
          });
        }
        if (ev & EVENT_CRASH) {
          effects.explode(s.x, s.y, s.z, false);
          latchCrash(r);
          hide(r, RACE.respawnDelay);
        } else if (ev & EVENT_LAND) {
          // Finished the race — out for the rest of the run.
          latchCrash(r);
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
      // v18: a crashed rival counts at its LATCHED crash position (see
      // latchCrash) until it respawns — the old code skipped crashed
      // rivals entirely, so the player jumped 5/5 -> 2/5 on the collision
      // and back to 5/5 on respawn.
      const crashed = r.state === 'gone' || r.state === 'diving' || r.state === 'spinning' || r.state === 'tumbling';
      const latched = crashed && r.crashRings !== null && r.crashRings !== undefined;
      const rs = r.flight.state;
      const rRings = latched ? r.crashRings : rs.ringsPassed;
      const rDist = latched ? r.crashDist : raceProgress(r).dist;
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
      r.crashRings = null;
      r.crashDist = null;
      r.api.group.visible = true;
      syncMesh(r);
    }
    // v14: the shared collision point resets with the pack.
    // v17: the anchor clock and the showcase clock reset too.
    sharedMeetPoint = null;
    lastAnchorAt = -999;
    nextShowcaseAt = RACE.showcaseAt;
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
