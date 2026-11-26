# Langit Nusantara — Ring Run: Verification Checklist (v17)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

## Course & rings

- [x] **12 rings all above ground (none inside terrain/hills).**
  Proof: `probe-v17.mjs` clearance seeds 1–3 — ringMin 92 / 56.2 /
  74.1 m, legMin 116.1 / 51.3 / 94.8 m (leg clearance = min terrain
  clearance along the straight spawn→ring legs). Sim flies 12/12 rings
  on seeds 1–12 (no ring unreachable). (`/tmp/probe-v17c.log`)

## Explosion

- [x] **Collision explosion clearly visible from afar (fireball + smoke,
  not a pile of dark circles).**
  Proof: cover screenshot `screenshots/1-cover.jpg` — layered
  orange/yellow fireball + grey smoke + debris beside ring 10, ring NOT
  covered. Live probe Phase A (run 3): blast at t=24.5, 257 m away,
  facing 0.89, HUD "💥 MID-AIR COLLISION!" + screenshot
  `live-shots/v17-live-blast.jpg`. Player-crash blast (Phase A4): 3
  fireball meshes at impact, 5 at +1.5 s. (`/tmp/probe-v17-live3.log`)

## Storm

- [x] **Tornado visible in camera view along the course.**
  Proof: title screenshot `screenshots/3-start.jpg` (tornado + dark
  cloud + rain behind the title) and cockpit screenshot
  `screenshots/2-cockpit.jpg` (tornado + cumulonimbus + rain ahead).
  Storm check: tornado 260 m from the course, 31 storm meshes, rain
  1 line segment. (`/tmp/probe-v17c.log`)

## Shadows

- [x] **5 plane shadows (ours + 4 rivals).**
  Proof: live probe Phase C (runs 1 and 3): count=5, all `vis=true`
  (player + BIRU/KUNING/HIJAU/ORANYE ellipses on the ground).
  (`/tmp/probe-v17-live3.log`)

## HUD

- [x] **HUD not clipped, race position readable.**
  Proof: HUD right edge 1266 < viewport 1280 (no overflow) in every
  probe run. Screenshots show POSITION 1/5 (cover, landing) and 3/5
  (cockpit), RING n/12 chip, ring pointer pill "RING 10 · 105 m".
  (`/tmp/probe-v17c.log`, `screenshots/*.jpg`)

- [x] **Instruction text contrast (dark navy #132238, not white on
  bright sky).**
  Proof: title screenshot `screenshots/3-start.jpg` — the three rules
  ("Fly through all 12 glowing rings…", "Centre a ring for a bonus…",
  "Slow down too much…") in dark navy on a light translucent pill,
  readable against bright sky. CSS: `#title-rules .rule { color:
  #132238 }` (`game/index.html:88`). User instruction 26 Nov 23:49 WIB.

## Cockpit

- [x] **Cockpit enclosed, 5 dials readable, pillars not heavy.**
  Proof: cockpit screenshot `screenshots/2-cockpit.jpg` — 5 dials with
  12/3/6/9 numerals and orange needles, labels clear of the "6"
  (label moved to y=296), pillars slimmed 0.11→0.07 m. Windshield,
  glareshield and console read as separate built parts.

## Runway

- [x] **Runway flat, blending into the terrain, no step.**
  Proof: landing screenshot `screenshots/4-landing.jpg` — asphalt strip
  with markings sits on the mown airfield plateau, grass fading into
  the hills with no raised edge. Code: runwayBlend plateau spans the
  strip + 60 m past each end, fading 250–360 m (v14/v16). Live probe
  Phase B (run 3): RACE COMPLETE, touchdown on the centreline
  (lat 0 the whole final), no terrain strike.
  (`/tmp/probe-v17-live3.log`)

## Clouds

- [x] **Clouds physically sensible and story-coherent (one dark storm
  wall, bright clouds elsewhere, no grey discs).**
  Proof: title / cockpit / cover screenshots — one dark cumulonimbus
  mass + tornado on the storm side, white multi-puff cumulus elsewhere,
  blue sky between. Storm wall: 7 lobes, dark greys `#55677a /
  #64748a / #47586a`, opacity 0.98. No flat grey discs anywhere in
  frame.

## 3-tier sim (Layer 1) — `sim-3tier.mjs`, pure Node

- [x] **Reference (autopilot) passes 12 rings AND lands.**
  Proof: `node sim-3tier.mjs` exit 0 — Reference 12/12 rings, landed,
  finished, score 3409, time 59.8 s, touchdown (1282, 96, 119) on the
  runway (centre 1250, 120, height 94). The landing uses the probe's
  'land' regulator (VS-hold + heading-hold, idle throttle); the
  pursuit autopilot alone levels off and never touches down.
- [x] **Weak (noisy input) gets some rings, does not finish.**
  Proof: same run — Weak 6/12 rings, no finish, score 1098, still
  flying at 300 s. The Weak model is a 0.5 s reaction lag + a
  slowly-wandering bias (new every 2 s) + 8% lets-go; white per-step
  noise alone still passed 12/12, and a 1.5 s lag crashed it (0 rings).
- [x] **Idle (no input) fails (no finish / crash).**
  Proof: same run — Idle 2/12 rings (rings 1–2 lie on the spawn line),
  no finish, score 262, flew straight to (19719, 149, 5439), still
  flying at 300 s. Doing nothing cannot finish the course.

## Headless tests (Layer 2) — `test/headless.test.mjs`, Node

- [x] **No input → heading holds (v16 regression).**
  Proof: `node test/headless.test.mjs` 9/9 pass. Zero input, 20 s:
  drift 0.00°, roll 0.000. Zero stick + the live-play gust applied
  exactly as main.js does (gust on the stick, stickRoll = 0): drift
  0.00°, roll 0.000. The v16 sine gust would have drifted ~50°+.
- [x] **Ring-centre pass counts (and a clear miss does not).**
  Proof: same run — centre pass (0.00 m off-centre) counts, bonus
  150; clear miss (49.99 m off-centre) does not count; near-miss
  (15.00 m off-centre) is a near-miss, bonus 10.
- [x] **Crossing rivals fire the collision gate (and far rivals do not).**
  Proof: same run — both rivals <80 m, player 200 m away facing
  1.00: fire = true (blastDist 200 m). Rivals 300 m away: no fire.
  relFire on its terms (both <130 m, facing 0.80, t=45): relFire =
  true, fire = false. No partner rival: no fire.

## Live probe (run 6, after the A2 `distMp > 2500` fix)

- [x] **Hands-off holds heading (A3).** Run 6: 0° drift in 20 s.
- [x] **Ring blast visible (A).** Run 6: t=41.1, 234 m, facing 0.96,
  HUD "💥 MID-AIR COLLISION!". Rival visibility 10/15.
- [x] **Fast straight player sees a blast (A2).** Run 6: STRAIGHT
  blast t=40.0 (player 81.9 m/s, 0 rings, offCourse 193 m). The pair
  converged to the player-relative anchor (720, 129, 310) at t=20.5
  (dMeet ~1120), held it from t=32.4 (dMeet 68) with NO re-anchor
  leapfrog, and fired at t=40.0. Rival visibility 12/13. (Runs 1–3:
  NO BLAST; run 4: the `distMp > 800` re-anchor leapfrogged the point
  every time the pair arrived — fixed to `distMp > 2500`.)
- [x] **Player crash explodes (A4).** Run 6: 3 fireball meshes at
  impact, 5 at +1.5 s.
- [x] **Finish end-to-end (B).** Run 6: RACE COMPLETE in 12.6 s,
  Position 1/5, Score 2774, touchdown (1050.8, 95.6, 120), lat 0 the
  whole final, roll 0, Space restart without canvas click works.
- [x] **5 shadows (C).** Run 6: count=5, all `vis=true`.
  (`/tmp/probe-v17-live6.log`, exit 0, errors: none)

Run 7 (after the Layer 2 extractions) re-verified everything: D PASS,
A3 0° drift, A blast t=37.6 (240 m, facing 0.77, HUD "💥 MID-AIR
COLLISION!"), A2 STRAIGHT blast t=40.0 (rival visibility 14/14), A4
3→5 fireball meshes, C count=5 all vis=true, B RACE COMPLETE in
13.1 s (Position 1/5, Score 3019, touchdown (1080.5, 95.6, 120),
lat 0, roll 0, Space restart works). Errors: none, exit 0.
(`/tmp/probe-v17-live7.log`)

## Final gates (before commit)

- [x] 4 screenshots regenerated from the final code, byte-new vs v16.
  Cover 89,452 (v16 98,466), cockpit 123,369 (119,511), start
  114,840 (119,292), landing 94,112 (94,870). Viewed: cover has the
  layered fireball beside ring 10; cockpit has 5 readable dials and
  rivals #2–#5 separated; title has navy #132238 rules on a light
  pill; landing is aligned on the centreline with "09" readable.
  (`screenshots/*.jpg`, regenerated after the Layer 2 extractions)
- [x] Entrypoint run twice, byte-identical.
  (`MAKEFUN_OUTPUT_DIR=out node main.ts` twice, exit 0; dossier.json
  sha a54d4427051bd0a5a0c09cf6396f96bda8c7c46039308647e32aaa367ddf4c3e,
  both dirs 2,195,391 bytes.)
- [x] Bundle dry-run `--repo` exit 0.
  (`node <kit>/cli/makefun.mjs bundle --repo . --dry-run`, exit 0.
  Standard warnings only: "0 usage rows attached" — the known
  turn-boundary issue (usage rows for the running turn are written
  when the turn ends; the coordinator re-runs the SELECT + bundle
  next turn) — and "repo.dirty" (resolved by the commit below).)
- [x] `node sim-3tier.mjs` all three routes as specified above.
  (Reference 12/12 + landed 59.8 s; Weak 6/12 no finish; Idle 2/12
  no finish. Exit 0.)
- [x] `node test/headless.test.mjs` all tests pass. (9/9.)
- [ ] Local git commit.
