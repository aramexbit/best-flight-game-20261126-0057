# Langit Nusantara — Ring Run: Verification Checklist (v18)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

## Course & rings

- [x] **12 rings all above ground (none inside terrain/hills).**
  Proof: `probe-v18.mjs` clearance seeds 1–3 — ringMin 92 / 56.2 /
  74.1 m, legMin 116.1 / 51.3 / 94.8 m (leg clearance = min terrain
  clearance along the straight spawn→ring legs). Sim flies 12/12 rings
  on seeds 1–12 (no ring unreachable). (`/tmp/probe-v18.log`)

## Explosion

- [x] **Collision explosion clearly visible from afar (fireball + smoke,
  not a pile of dark circles).**
  Proof: cover screenshot `screenshots/1-cover.jpg` — 3-layer faceted
  fireball (#FFF3B0/#FF9F1C/#E63946) + slate smoke + chunky red debris
  over the runway approach, 1.2 s after the staged blast (50.37 s);
  14 fireball meshes counted at the freeze. The v18 freeze had to move
  35.0 → 51.6 s: the softer flight rates + pitch auto-level moved the
  pair assembly from 33.8 s (v17) to 50.37 s (measured, diag
  `/tmp/diag-cover516-v18.log`); the old freeze caught NO fireball.
  Live probe Phase A: blast at t=53.1, 338 m away, facing 0.92, HUD
  "💥 MID-AIR COLLISION!" + screenshot `live-shots/v18-live-blast.jpg`.
  The message cleared by +4.5 s (opacity 0) — the v17 15–40 s linger
  is fixed. Rival visibility 14/19. Player-crash blast (Phase A4):
  3 fireball meshes at impact, 5 at +1.5 s. (`/tmp/probe-v18-live.log`)

## Storm

- [x] **Tornado visible in camera view along the course.**
  Proof: title screenshot `screenshots/3-start.jpg` (tornado + dark
  cloud + rain behind the title) and cockpit screenshot
  `screenshots/2-cockpit.jpg` (tornado + cumulonimbus + rain ahead).
  Storm check: tornado 260 m from the course, 36 storm meshes, rain
  1 line segment. (`/tmp/probe-v18.log`)

## Shadows

- [x] **5 plane shadows (ours + 4 rivals).**
  Proof: live probe Phase C: count=5, all `vis=true` (player +
  BIRU/KUNING/HIJAU/ORANYE ellipses on the ground).
  (`/tmp/probe-v18-live.log`)

## HUD

- [x] **HUD not clipped, race position readable.**
  Proof: HUD right edge 1266 < viewport 1280 (no overflow) in every
  probe run. Screenshots show POSITION 1/5 (cover, landing) and 2/5
  (cockpit), RING n/12 chip, ring pointer pill "RING 10 · 106 m".
  (`/tmp/probe-v18.log`, `screenshots/*.jpg`)

- [x] **Instruction text contrast (dark navy #132238, not white on
  bright sky).**
  Proof: title screenshot `screenshots/3-start.jpg` — the three rules
  ("Fly through all 12 glowing rings…", "Centre a ring for a bonus…",
  "Slow down too much…") in dark navy on a light translucent pill,
  readable against bright sky. CSS: `#title-rules .rule { color:
  #132238 }` (`game/index.html:88`). User instruction 26 Nov 23:49 WIB.

## Cockpit

- [x] **Cockpit enclosed, 5 dials readable, pillars not heavy.**
  Proof: cockpit screenshot `screenshots/2-cockpit.jpg` — 5 dials on
  light faces (#F8FAFC) with 96 px numbers at radius 138 and the
  sub-label in a separate navy badge clear of the "6" and the needle
  pivot; numbers do not overlap. Pillars slimmed to 0.05 m, trim
  #273244, glareshield #1E293B. Windshield, glareshield and console
  read as separate built parts. (The leftmost dial is half-clipped by
  the frame edge in the staged shot; the 5 dials are all present.)

## Runway

- [x] **Runway flat, blending into the terrain, no step.**
  Proof: landing screenshot `screenshots/4-landing.jpg` — dark asphalt
  strip #2B303A with sharp "09" (canvas texture, anisotropy 8),
  dashed centreline and piano keys sits on the mown airfield plateau,
  grass fading into the hills with no raised edge; fuel truck on the
  apron. Code: runwayBlend plateau spans the strip + 60 m past each
  end, fading 250–360 m (v14/v16). Live probe Phase B: RACE COMPLETE
  in 15.08 s, Position 1/5, Score 2999, touchdown (1113.2, 95.6, 120),
  lat 0 the whole final, roll 0, Space restart without canvas click
  works. (`/tmp/probe-v18-live.log`)

## Clouds

- [x] **Clouds physically sensible and story-coherent (one dark storm
  wall, bright clouds elsewhere, no grey discs).**
  Proof: title / cockpit / cover screenshots — one dark cumulonimbus
  mass + tornado on the storm side, white multi-puff cumulus elsewhere,
  blue sky between. Storm wall: 7 lobes, dark greys `#55677a /
  #64748a / #47586a`, opacity 0.98, plus a second anvil tier (5 lobes,
  y 360–430, `#334155 / #475569`, v18). No flat grey discs anywhere in
  frame.

## 3-tier sim (Layer 1) — `sim-3tier.mjs`, pure Node

- [x] **Reference (autopilot) passes 12 rings AND lands.**
  Proof: `node sim-3tier.mjs` exit 0 — Reference 12/12 rings, landed,
  finished, score 3385, time 59.8 s, touchdown (1280, 96, 119) on the
  runway (centre 1250, 120, height 94). The landing uses the probe's
  'land' regulator (VS-hold + heading-hold, idle throttle); the
  pursuit autopilot alone levels off and never touches down.
- [x] **Weak (noisy input) gets some rings, does not finish.**
  Proof: same run — Weak 9/12 rings (was 6/12 in v17 — the softer
  controls + pitch auto-level help a noisy pilot), no finish, score
  1953, still flying at 300 s. The Weak model is a 0.5 s reaction lag
  + a slowly-wandering bias (new every 2 s) + 8% lets-go; white
  per-step noise alone still passed 12/12, and a 1.5 s lag crashed
  it (0 rings).
- [x] **Idle (no input) fails (no finish / crash).**
  Proof: same run — Idle 2/12 rings (rings 1–2 lie on the spawn line),
  no finish, score 262, flew straight to (19719, 149, 5439), still
  flying at 300 s. Doing nothing cannot finish the course.

## Headless tests (Layer 2) — `test/headless.test.mjs`, Node

- [x] **No input → heading holds (v16 regression).**
  Proof: `node test/headless.test.mjs` 11/11 pass. Zero input, 20 s:
  drift 0.00°, roll 0.000. Zero stick + the live-play gust applied
  exactly as main.js does (gust on the stick, stickRoll = 0): drift
  0.00°, roll 0.000. The v16 sine gust would have drifted ~50°+.
- [x] **Pitch holds with zero stick + gust (v18, the v17 trim bug).**
  Proof: same run — test 5: 20 s cruise, pitch 0.000 rad, maxPitch
  0.000 rad; a locked 0.30 rad trim decays to 0.000 rad in 5 s.
  (v17 live: 1 W tap locked pitch up permanently.)
- [x] **No-input straight flight passes ring 1 (v18).**
  Proof: same run — test 6: rings=1 at 7.4 s, status flying. (v17
  live: 0/12 rings, ring 1 missed by 28–45 m — trim lock-in + gust
  pitch random-walk, fixed by the pitch auto-level. Ring 1 was NOT
  moved: the spawn line already crosses it ~10 m from centre.)
- [x] **Ring-centre pass counts (and a clear miss does not).**
  Proof: same run — centre pass (0.00 m off-centre) counts, bonus
  150; clear miss (49.99 m off-centre) does not count; near-miss
  (15.00 m off-centre) is a near-miss, bonus 10.
- [x] **Crossing rivals fire the collision gate (and far rivals do not).**
  Proof: same run — both rivals <80 m, player 200 m away facing
  1.00: fire = true (blastDist 200 m). Rivals 300 m away: no fire.
  relFire on its terms (both <130 m, facing 0.80, t=45): relFire =
  true, fire = false. No partner rival: no fire.

## Live probe (v18, run 1 — `/tmp/probe-v18-live.log`, exit 0, errors: none)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 148.75, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  PRE-FIX FAIL in this run: 30/120 bad samples, min above −8 m —
  the dot was always < 0 (behind ✓) but the camera sank below the
  plane in climbs (fixed-1/60 lerp vs several sim steps per frame at
  low FPS); climbCam above 0.09 m. FIXED in render.js (lerp rate 8 +
  height floor plane.y + 2.5 m, syntax OK). RE-CHECK 1
  (`probe-v18-a5.mjs`, `/tmp/probe-v18-a5.log`, exit 0): samples=120
  bad=0 minDot −1.00 minAboveM 3 maxPitch 0.36, climbCam dot −0.65
  above 2.5 m, PASS=true — BUT the re-check screenshots then showed
  the plane INVISIBLE in live chase view (v18-live-cam-turn2/climb2,
  v18-live-start/blast): the numbers only proved behind+above, never
  DISTANCE. Diagnosis (27 Nov, NDC projection + 3x-scale + hide
  bisection, scratch scripts since deleted): the plane group was
  visible, at the right position, dead-centre in frame (NDC angle
  3.5°) — but the camera sat 25–150 m behind it instead of the 12.3 m
  chase geometry, because the lerp ran once per rendered frame with a
  fixed 1/60 dt while the sim advanced several steps per frame at low
  FPS, so the plane read as a 30–80 px speck lost in the storm
  clutter (and ~10 m lag even at 60 fps — the "plane small/lost" of
  the v16/v17 playtests). FIXED v18c in render.js + main.js:
  feedforward (chasePos translates by the plane's own displacement
  each draw) + the live draw gets the REAL frame dt (staged shots
  still pass 1/60, unchanged). RE-CHECK 2 (`probe-v18-a5.mjs`,
  `/tmp/probe-v18-a5c.log`, exit 0, errors none): samples=120 bad=0
  minDot −0.96 minAboveM 4 **maxDistM 12** maxPitch 0.37, climbCam
  dot −0.95 above 4.2 m **dist 12.27 m** pitch 0.51, PASS=true — and
  the new cam-turn2/climb2 screenshots show the plane BIG and clearly
  visible in chase view (turn: plane over the sea toward ring 2,
  "RING 1/12 +143"; climb: plane fills the lower frame from
  behind/above in a steep W climb, sky ahead — expected at pitch 0.51).
- [x] **No-input straight flight passes ring 1 (A6).** rings=1 at
  8.75 s, y 149, still flying.
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring blast visible (A) + message clears in ~2.5 s real time.**
  Blast t=53.1 (rings 7), 338 m, facing 0.92, HUD "💥 MID-AIR
  COLLISION!" at +1.5 s, message opacity 0 by +4.5 s. Rival
  visibility 14/19. (Later than v17's 37.6–41.1 s — the pair
  re-anchored twice as the player turned away from the first point,
  then fired once both held and the player faced it; the gates work,
  the assembly is slower.)
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=40.0 (player 0 rings, offCourse 187 m). The player-relative
  anchor (834, 163, 340) held from t=18.5 with NO re-anchor leapfrog;
  pair holding at t=35.7 (dMeet 92/90). Rival visibility 14/14.
- [x] **Player crash explodes (A4).** CRASH at t=29.8, 3 fireball
  meshes at impact, 5 at +1.5 s, "Crashed!" panel. (Slower to crash
  than v17: the pitch auto-level levels the −0.5 nose-down teleport,
  so the plane cruises at ~30 m until a hill rises into it — the
  crash still explodes.)
- [x] **Finish end-to-end (B).** RACE COMPLETE in 15.08 s, Position
  1/5, Score 2999, touchdown (1113.2, 95.6, 120), lat 0 the whole
  final, roll 0, Space restart without canvas click works.
- [x] **5 shadows (C).** count=5, all `vis=true`.
- [x] **Spawn / HUD (D).** spawnY 149, heading 105°, minClear 137.5 m,
  ring1Dist 600; camera-behind dot −0.999, above 4.2 m; HUD right
  edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas focused.

Note: phases A2/A4/C/B loaded fresh pages AFTER the mid-run render.js
camera-floor fix, so they ran on the fixed code; phases D/A3/A5/A6/A7/A
ran on the pre-fix code. The fix touches only the chase-camera
tracking, so the A/A2/A4/C/B results stand; only A5 needed the
focused re-check above.

## Final gates (before commit)

- [x] 4 screenshots regenerated from the final code, byte-new vs v17.
  (Clean re-run `node shots.mjs`, `/tmp/shots-v18c.log`, exit 0,
  errors none, after the v18c camera fix: cover 97,894, cockpit
  126,466, start 120,672, landing 96,099 — all byte-new vs v17
  (89,452 / 123,369 / 114,840 / 94,112). Cover: plane on final over
  the runway, blast smoke + red debris top-right, RING 12/12 Score
  3385 0:51 Position 1/5. Cockpit: 5 dials readable, no number
  overlap, navy ALT/HDG badges, rivals #3/#4/#5 as navy pills,
  tornado + rain, ring 3 at 184 m (leftmost dial half-clipped by the
  frame edge — carried-over framing flaw, dials still readable).
  Title: gold navy-outlined title, white instruction card navy border
  + dark navy text readable, yellow key-caps with navy pill
  sub-labels, Start button, storm + rings behind the card's right
  edge. Landing: "LAND ON THE RUNWAY", dark asphalt #2B303A, "09"
  readable, dashed centreline, piano keys — plane still VERY BIG in
  the centre foreground covering much of the runway, the v17/v18
  framing criticism carried over. The v18c feedforward shifted the
  staged chase framing by ~1–2 m only; cockpit byte-identical to the
  pre-v18c run.)
- [x] Entrypoint run twice, byte-identical.
  (Re-run after the v18c camera fix: `MAKEFUN_OUTPUT_DIR=/tmp/out-v18c-a|b
  node main.ts` twice, exit 0; `diff -r` exit 0, both dirs 2,257,591
  bytes, dossier.json sha256
  d13f4c02ec80e881bb3a061f0f42def9245919e39c48fb074605a55852673761 in
  both. Pre-v18c run: sha 819573ea…, 2,261,287 bytes — the delta is
  the v18c code change + the deleted scratch diag scripts.)
- [x] Bundle dry-run `--repo` exit 0.
  (Re-run after the v18c fix, `/tmp/bundle-v18c.log`, exit 0, 114 s.
  22 session files found incl. this builder session (ff36b035, 302
  turns, 1204 lines). Standard warnings only: "0 usage rows attached"
  — the known turn-boundary issue (usage rows for the running turn
  are written when the turn ends; the coordinator re-runs the SELECT
  + bundle next turn) — and "repo.dirty" (resolved by the commit
  below). Missing --mcp/--provider/--effort flags are for the real
  submit bundle, handled by the coordinator. As in the v18 run, the
  bundle ran while main.ts was edited mid-run; it validates the
  transcript record, not game code — exit 0 stands.)
- [x] `node sim-3tier.mjs` all three routes as specified above.
  (Reference 12/12 + landed 59.8 s; Weak 9/12 no finish; Idle 2/12
  no finish. Exit 0.)
- [x] `node test/headless.test.mjs` all tests pass. (11/11.)
- [x] Local git commit.
  (Commit 1: v18 code + probes + docs. Commit 2: this checklist update.
  Both exit 0. Push by the coordinator — the builder does not push/submit.)
