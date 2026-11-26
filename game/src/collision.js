// Pure collision-gate logic for the mid-air collision (OpenGame layer 2).
// Extracted verbatim from rivals.js (the 'holding' branch) so it can be
// tested in Node without Three.js or a browser. rivals.js calls this and
// acts on the result — the numbers here ARE the game's gates, single
// source of truth: change them here and the game changes too.
//
// Live-verified (v17): the relFire branch fires for a fast straight
// player — live probe runs 6 and 7 both show the STRAIGHT blast at
// t=40.0 s, after the pair held a player-relative anchor (facing 0.77
// in run 7). The headless tests (test/headless.test.mjs) cover all
// three branches plus the no-partner case.
//
// Inputs are plain positions (no game objects):
//   rPos      — this rival's {x, y, z}
//   oPos      — the partner rival's {x, y, z} (null when there is none)
//   playerPos — the player's {x, y, z}
//   playerFwd — the player's forward unit vector {x, z} (ground plane)
//   meetPoint — the shared meeting point {x, y, z}
//   time      — game time in seconds
// Returns { fire, lateFire, relFire, blastDist, facing, playerDist,
//   rNear, oNear, rNearLate, oNearLate }.
import { RACE } from './config.js';

export function collisionGate({ rPos, oPos, playerPos, playerFwd, meetPoint, time }) {
  const hasPartner = !!oPos;
  const playerDist = Math.hypot(
    playerPos.x - meetPoint.x, playerPos.y - meetPoint.y, playerPos.z - meetPoint.z,
  );
  // Fire only when BOTH rivals are actually near the point (within
  // 80 m), so the blast midpoint sits between two planes that are
  // really meeting — not between two dots 200 m apart in empty sky.
  const rNear = Math.hypot(
    rPos.x - meetPoint.x, rPos.y - meetPoint.y, rPos.z - meetPoint.z,
  ) < 80;
  const oNear = hasPartner && Math.hypot(
    oPos.x - meetPoint.x, oPos.y - meetPoint.y, oPos.z - meetPoint.z,
  ) < 80;
  // The blast must be IN VIEW — 100-400 m ahead of the player, inside
  // a ~32° forward cone — so the fireball fills the windshield instead
  // of going off behind the camera or a kilometre away.
  let blastDist = Infinity;
  let facing = -1;
  if (hasPartner) {
    const mx = (rPos.x + oPos.x) / 2;
    const mz = (rPos.z + oPos.z) / 2;
    blastDist = Math.hypot(mx - playerPos.x, rPos.y - playerPos.y, mz - playerPos.z);
    if (blastDist > 0.01) {
      facing = ((mx - playerPos.x) * playerFwd.x + (mz - playerPos.z) * playerFwd.z) / blastDist;
    }
  }
  const inView = blastDist >= 100 && blastDist <= 400 && facing > 0.85;
  const fire = hasPartner && rNear && oNear && inView
    && ((playerDist < RACE.collisionTriggerDist)
      || (time >= RACE.collisionFallbackAt && playerDist < RACE.collisionCloseDist && facing > 0.85));
  // Second-chance window (from 45 s on): both rivals within 130 m of
  // the point and the blast midpoint 50-400 m ahead in view.
  const rNearLate = Math.hypot(
    rPos.x - meetPoint.x, rPos.y - meetPoint.y, rPos.z - meetPoint.z,
  ) < 130;
  const oNearLate = hasPartner && Math.hypot(
    oPos.x - meetPoint.x, oPos.y - meetPoint.y, oPos.z - meetPoint.z,
  ) < 130;
  const lateFire = hasPartner && rNearLate && oNearLate && time >= 45
    && blastDist >= 50 && blastDist <= 400 && facing > 0.85 && playerDist < 350;
  // Player-relative fire: the point was anchored ahead of the player,
  // so no playerDist gate is needed. Floor 40 s, facing > 0.7.
  const relFire = hasPartner && rNearLate && oNearLate && time >= RACE.collisionPlayerRelAt
    && blastDist >= 50 && blastDist <= 400 && facing > 0.7;
  return {
    fire: !!fire, lateFire: !!lateFire, relFire: !!relFire,
    blastDist, facing, playerDist,
    rNear: !!rNear, oNear: !!oNear, rNearLate: !!rNearLate, oNearLate: !!oNearLate,
  };
}
