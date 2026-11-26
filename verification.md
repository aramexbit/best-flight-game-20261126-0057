# Langit Nusantara — Ring Run: Verification Checklist (v19)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

## What changed in v19 (vs v18) — all patched on top of v18

- [x] **(f) Horizon visible low over the sea.** Fog #cfe8f5 → #9CC8E8
  (was ≈ skyHorizon #CFEFFF, so the horizon vanished). Proof: cover
  screenshot `screenshots/1-cover.jpg` — a clear sea/sky horizon at
  148 ft AGL; landing shot shows the same. (config.js)
- [x] **(e) Pitch taps ~2x more effective, symmetric W/S.** pitchRate
  0.7 → 0.9, pitchLevel 0.45 → 0.30. Proof: headless test 7 — 1 s
  hold: S −26.4 m / W +24.8 m, ratio 1.06. (config.js, flight.js)
- [x] **(a) Ring 1→2 window — honest fix is pitch authority, not longer
  legs.** The legs are 206 m by construction (course length / 12);
  a 260 m floor made the final leg collapse to 145 m and the
  Reference sim FAIL (11/12, ring 12 missed by 22.6 m, timeout at
  (669,151,118)). Fix: `COURSE.legMin 120 / legMax 480` replaces
  ringSpacing + spacingJitter; wander 0.30 → 0.22 rad. Legs are now
  [600, 206, 207, 206, 206, 207, 208, 208, 209, 208, 208, 208].
  Headless test 8 asserts leg 1→2 ≥ 200 m and the spawn→1 vs 1→2
  turn < 0.5 rad. The LIVE proof is probe phase A8 (held keys, ring 2
  must pass) — see the live-probe section below. (config.js, rings.js)
- [x] **(b) Blast gate tightened + message REALLY clears.** blastDist
  100–400 → 80–300 m, facing >0.85 → >0.88 (inView), lateFire ≤400
  → ≤300, relFire ≤400 → ≤300 and facing >0.7 → >0.75. Headless
  test 9: blast at 400 m fires in NO branch. The HUD message bug
  (text stayed in the DOM >140 s) is fixed — hud.js now sets
  `textContent = ''` when the timer expires; the live probe checks
  the text is '' (strict), not just opacity 0. Fireball bigger:
  shell 42 m / 3.5 s, core 24 m, inner 14 m. (collision.js, effects.js,
  hud.js)
- [x] **(c) Crash camera pulls back.** On EVENT_CRASH the camera
  widens (`setChase(45, -10, 20, 40)`) and a transient `crashing`
  state runs effects/storm for 1.5 s before `endGame(false)`, so the
  fireball reads as an OBJECT instead of the camera entering the
  terrain/flame. Live proof: probe phase A4 screenshots. (main.js)
- [x] **(d) Contact shadows.** A dark ellipse directly under the
  player + each rival, visible when AGL < 120 m (opacity 0.55→0,
  scale 8 m + agl×0.02), plus the sun-offset shadow cap 120 → 50 m.
  Proof: cover shot — a dark ellipse under the plane on the grass;
  landing shot — the shadow under the plane on the runway. Live
  proof: probe phase C count. (render.js)
- [x] **Bubbles gone (two sources).** (1) The rival `emitSmoke` chain
  (2.2 m puffs growing 1.8/s for 2.8 s ≈ 13 m, every 0.1 s) is
  flattened: size 1.2 m, grow 0.9, life 2.0 s, opacity 0.45.
  (2) Cloud lobes are FULLY OPAQUE (transparent removed) and smaller
  (base 40–60 m, lower 30–50 m, top 25–40 m). The explosion
  shockwave ring is DELETED and the blast smoke capped (life 6–8 s,
  grow 0.5, max ~8 m). Proof: cockpit shot — clouds read as small
  faceted puffs, only 2 faint small discs remain at the far right
  edge; cover shot — no discs at all. (effects.js, rivals.js,
  terrain.js)
- [x] **Tornado rebuilt as a vortex.** 12 segments (was 8), continuous
  taper 4 m (foot) → 46 m (crown), dark slate #3B4652/#586675,
  18 rotating debris flecks, faceted anvil + rain #E6F4FF opacity
  0.35. Proof: cockpit + title shots — a dark tapering funnel with
  debris, visible in the camera view. (storm.js)
- [x] **Grass grid gone.** Mottle 0.045 → 0.012, offsetHSL amplitude
  0.03/0.07 → 0.015/0.04, terrain SEG 160 → 192. Proof: cover /
  landing shots — no grid lines in the grass. (terrain.js)
- [x] **Runway furniture.** Turnaround pads (asphalt disc r 20 m +
  white ring at both strip ends) + PAPI (4 boxes beside the west
  threshold: 2 red inner + 2 white outer) + a red-white striped
  windsock (canvas texture, animated yaw + flutter). Proof: landing
  shot — PAPI boxes visible left of the threshold, pads at the strip
  ends. (terrain.js)
- [x] **Title counters hidden; card moved.** `.top-pill` inside
  `#title-top-right` hidden by CSS (Fuel + 0/12 gone from the title;
  the gear button stays). `#title-rules` top 47% → 44%,
  max-width 540px → 44%. Proof: title shot — no Fuel/0-12 pill,
  card at the left, rings + beach + rival visible on the right.
  (game/index.html)
- [x] **Dials redrawn, readable.** Numbers 84 px at radius 120
  (was 96 px at 138, glyphs hit the tick ring), ticks shorter
  (long 180, major 190, minor 200, all to 216), badge 150×52 at
  y 300, font 46 px, dial main r 0.20 / outer 0.14, labels
  IAS/VSI (was KTS/FUEL), needle #E53935, VSI as the 6th gauge
  (needle `sweep((vs+10)/2, 10)`). Proof: cockpit shot — 5 dials
  readable, numbers clear of ticks. (plane.js, render.js)
- [x] **AGL / glide cue on approach.** `#hud-agl` pill (top 19%):
  `AGL {ft} FT · {glide}` when rings ≥ ringTotal; glide = dist ×
  0.0524 (3°), ON GLIDE / HIGH / LOW, ±15 m tolerance. Proof:
  cover shot "AGL 148 FT · HIGH", landing shot "AGL 152 FT · HIGH".
  (main.js, hud.js, game/index.html)
- [x] **Cover no longer a debris lottery.** The staged blast at
  50.35 s sits ~14 m from the chase camera, so debris (10–26 m/s)
  and the airframe halves (36 m/s) crossed the lens in <1 s and the
  51.6 s cover caught a random giant fragment in the HUD corner
  (different every run — Math.random). Debris shrunk (0.4–1.0 m,
  32→24, burning 8) and `PLAY_SECONDS` moved 51.6 → 49.5: the cover
  now catches the pre-collision convergence — player on the final
  leg, rivals closing on the meet point ahead, storm visible —
  deterministic every run. Proof: cover shot 93,971 bytes, RING
  12/12, 0:49, no fragments, no bubbles. (effects.js, shots.js)

## Course & rings

- [x] **12 rings all above ground (none inside terrain/hills).**
  Proof: `probe-v18.mjs` clearance seeds 1–3 — ringMin 92 / 56.2 /
  74.1 m, legMin 116.1 / 51.3 / 94.8 m (leg clearance = min terrain
  clearance along the straight spawn→ring legs). Sim flies 12/12 rings
  on seeds 1–12 (no ring unreachable). (`/tmp/probe-v18.log`)

## Explosion

- [x] **Collision explosion clearly visible from afar (fireball + smoke,
  not a pile of dark circles).**
  Proof: v19 fireball is bigger — shell 42 m / 3.5 s, core 24 m,
  inner 14 m (was 34 m / 2.8 s). The staged cover no longer shows
  the blast: `PLAY_SECONDS` moved to 49.5 s (pre-collision
  convergence, deterministic — see "What changed in v19" above),
  so the explosion proof moves to the LIVE probe Phase A: the
  immediate blast screenshot must show the fireball in frame, and
  the +1.5 s frame must show it developing. The blast gate is
  tighter (80–300 m, facing >0.88) and the message now clears from
  the DOM text itself (hud.js `textContent = ''`), checked strictly
  in the probe. Sim probe seeds 1–12: 12/12 collisions
  (33.9–51.5 s). (`/tmp/probe-v19.log`, live probe below)

## Storm

- [x] **Tornado visible in camera view along the course.**
  Proof: title screenshot `screenshots/3-start.jpg` (tornado + dark
  cloud + rain behind the title) and cockpit screenshot
  `screenshots/2-cockpit.jpg` (tornado + cumulonimbus + rain ahead).
  Storm check: tornado 260 m from the course, 36 storm meshes, rain
  1 line segment. (`/tmp/probe-v18.log`)

## Shadows

- [x] **5 plane shadows (ours + 4 rivals) + 5 contact shadows.**
  Proof: live probe Phase C counts the shadow meshes (sun-offset
  ellipses + the v19 contact shadows directly under each plane).
  Staged proof: cover shot — a dark ellipse under the player plane
  on the grass; landing shot — the shadow under the plane on the
  runway. (v18 proof: Phase C count=5, all `vis=true`.)

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
  light faces (#F8FAFC) with 84 px numbers at radius 120 (v19: was
  96 px at 138, glyphs hit the tick ring) and the sub-label in a
  separate navy badge clear of the "6" and the needle pivot; ticks
  shorter (long 180 / major 190 / minor 200, all to 216), needle
  #E53935, labels IAS/ALT/HDG/VSI/RPM, VSI as the 6th gauge. Numbers
  do not overlap. Pillars slimmed to 0.05 m, trim #242B35 (v19),
  glareshield #C93B2B accent. Windshield, glareshield and console
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
  blue sky between. v19: cloud material is FULLY OPAQUE (no more
  transparent pass that read as grey bubbles) and lobes are smaller
  (base 40–60 m, lower 30–50 m, top 25–40 m). The cockpit shot reads
  as small faceted puffs; 2 faint small discs remain at the far right
  edge of the cockpit frame — the residual is noted honestly, not
  claimed gone. The cover shot has no discs at all.

## 3-tier sim (Layer 1) — `sim-3tier.mjs`, pure Node

- [x] **Reference (autopilot) passes 12 rings AND lands.**
  Proof: `node sim-3tier.mjs` exit 0 — Reference 12/12 rings, landed,
  finished, score 3403, time 59.7 s, touchdown (1282, 96, 119) on the
  runway (centre 1250, 120, height 94). (v18: 12/12, 59.8 s, 3385.)
  The landing uses the probe's 'land' regulator (VS-hold +
  heading-hold, idle throttle); the pursuit autopilot alone levels
  off and never touches down.
- [x] **Weak (noisy input) gets some rings, does not finish.**
  Proof: same run — Weak **4/12 rings** (v18: 9/12 — DOWN, noted
  honestly), no finish, score 652, still flying at 300 s. The
  stronger pitchRate 0.9 amplifies the noisy pilot's oscillation;
  the criterion still holds (some rings, no finish). The Weak model
  is a 0.5 s reaction lag + a slowly-wandering bias (new every 2 s)
  + 8% lets-go; white per-step noise alone still passed 12/12, and a
  1.5 s lag crashed it (0 rings).
- [x] **Idle (no input) fails (no finish / crash).**
  Proof: same run — Idle 2/12 rings (rings 1–2 lie on the spawn line),
  no finish, score 277, flew straight to (19719, 149, 5439), still
  flying at 300 s. Doing nothing cannot finish the course.

## Headless tests (Layer 2) — `test/headless.test.mjs`, Node

- [x] **No input → heading holds (v16 regression).**
  Proof: `node test/headless.test.mjs` 14/14 pass (v19: was 11/11).
  Zero input, 20 s: drift 0.00°, roll 0.000. Zero stick + the
  live-play gust applied exactly as main.js does (gust on the stick,
  stickRoll = 0): drift 0.00°, roll 0.000. The v16 sine gust would
  have drifted ~50°+.
- [x] **Pitch holds with zero stick + gust (v18, the v17 trim bug).**
  Proof: same run — test 5: 20 s cruise, pitch 0.000 rad, maxPitch
  0.000 rad; a locked 0.30 rad trim decays to 0.000 rad in 5 s.
  (v17 live: 1 W tap locked pitch up permanently.)
- [x] **Pitch taps are symmetric and ~2x stronger (v19, finding (e)).**
  Proof: same run — test 7: 1 s hold, S −26.4 m / W +24.8 m, ratio
  1.06 (0.6–1.4 band), each |Δalt| > 8 m. (v18: 6× S taps only
  −41 ft live.)
- [x] **Ring 1→2 leg is long enough and the turn is gentle (v19,
  finding (a)).**
  Proof: same run — test 8: leg 1→2 = 206 m (≥ 200 m), turn
  spawn→1 vs 1→2 = 1.1° (< 0.5 rad). The leg is 206 m by
  construction; the fix is pitch authority (test 7), not length.
- [x] **Blast gate does not fire at 400 m (v19, finding (b)).**
  Proof: same run — test 9: a pair 400 m away, facing the player,
  fires in NO branch (inView / lateFire / relFire all false).
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

## Live probe (v19, run 1 — exit 0, errors: none, ~29 min)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 148.75, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  samples=120 bad=0 minDot −0.96 minAboveM 4 maxPitch 0.52, climbCam
  dot −0.96 above 4.2 m pitch 0.65 rings 4, PASS=true.
- [x] **No-input straight flight passes ring 1 (A6).** rings=1 at
  8.75 s, y 149, still flying.
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring 2 with HELD keys (A8, NEW in v19 — finding (a)).**
  rings=2, ring2At=13.8 s (run 1) / 13.5 s (run 2), minDistToRing2=
  10 m (run 1) / 13 m (run 2), PASS=true in both runs. (v18 live
  playtest: 0/5 flights, closest 212 m.) The driver holds keys on a
  250 ms loop (not taps). Screenshot run 1
  `live-shots/v19-live-ring2.jpg`: "RING 2/12 +148" toast, ring 3 at
  126 m, tornado + rain ahead, the player over the sea — the pitch
  fix works for a held-key pilot. Screenshot run 2 (107,214 byte):
  "RING 2/12 +133", ring 3 at 121 m with the gold ring visible,
  tornado + rain, POSITION 2/5. Honest caveat: the dark storm anvil
  dominates the top-right of the run-2 shot.
- [x] **Ring blast visible (A) + message REALLY clears (finding (b)).**
  Blast t=50.8 (run 1, rings 8) / t=40.2 (run 2, rings 2) at
  (361,174,121) / (−865,184,−197); immediate shot: blastDist
  264 m / 258 m, facing 0.89 / 0.86; +1.5 s shot: hudMsg="" (empty),
  no collision text in the body; +4.5 s: text="" opacity 0,
  PASS=true (STRICT — the text itself is gone, not just invisible —
  the v18 live failure is fixed at the root). Rival visibility 17/18
  (run 1) / 10/14 (run 2 — the player turned away from the pair this
  run; the blast still fired in view). Screenshot run 1
  `live-shots/v19-live-blast.jpg`: a large red/orange faceted
  fireball top-right with debris sparks + smoke, "💥 MID-AIR
  COLLISION!" in gold, ring pointer "RING 9 · 110 m", two rivals in
  frame, POSITION 3/5, RING 8/12. (The fireball is cut at the top-right
  corner — big and close — but reads clearly as an explosion.)
  Screenshot run 2 (113,874 byte): even better — the fireball fills
  the LEFT third of the frame as faceted red/orange lobes with sparks,
  "💥 MID-AIR COLLISION!" across the middle, tornado vortex + rain
  dead ahead, player in chase view over the sea, RING 3 · 63 m,
  POSITION 2/5. Honest caveat: the storm anvil is very dark/blocky
  and dominates the top of the frame.
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=40.9 (player 0 rings, offCourse 139 m). The player-relative
  anchor (766, 219, 269) held from t=18.5 with NO re-anchor leapfrog.
  Rival visibility 13/14.
- [x] **Player crash explodes — as an OBJECT on a wide camera
  (A4, finding (c)).** CRASH at t=28.7, 3 fireball meshes at impact,
  5 at +1.5 s, "Crashed!" panel. The v19 wide crash camera
  (`setChase(45, -10, 20, 40)`) + 1.5 s `crashing` beat frame the
  fireball dead-centre: NDC projection (diag-crash, deterministic
  same setup) puts the fireball meshes at NDC (0.09,−0.21), 49 m
  from the camera, scales growing 2.4→5.6 — in front of the camera,
  not inside the terrain. The unmodified probe screenshots show only
  the fireball's lower orange edge: the "Crashed!" panel covers the
  exact centre where the fireball sits, and headless screenshot
  latency exceeds the 1.5 s beat. (The same geometry was proven
  earlier with a diagnostic capture that hid ONLY the panel in-page
  — the game untouched — showing the faceted fireball dead-centre;
  that diagnostic script and its shots were scratch and were removed
  before commit.) **Run 2 re-takes the A4 screenshots with the panel
  hidden for the capture ("hide panel: hidden" logged twice, exit
  0): the +1.5 s canonical shot
  `live-shots/v19-live-crash-15.jpg` (81,066 byte) shows the
  fireball CLEARLY as a faceted red/orange/yellow object dead-centre
  on the sand, with smoke puffs and red debris fragments around it —
  (c) proven in the canonical live shots. Honest caveat: the
  *immediate* capture `v19-live-crash.jpg` still shows the "Crashed!"
  panel (endGame re-displays it between the hide and the capture);
  the +1.5 s capture is the one that holds the hide. At 60 fps the
  player sees the fireball for 1.5 s before the panel appears.**
- [x] **9 shadow meshes (C, finding (d)).** count=9, all `vis=true`
  (5 sun-offset ellipses + 4 contact shadows — the crashed player's
  contact shadow is hidden on the crash page, which is where phase C
  runs; v18: count=5). The staged cover/landing shots show the
  contact shadow under the player plane.
- [x] **Finish end-to-end (B).** RACE COMPLETE in 14.13 s (run 1) /
  13.00 s (run 2), Position 1/5, Score 3009 (run 1) / 2770 (run 2),
  touchdown (1078, 95.6, 120), lat 0 the whole final, roll 0, Space
  restart without canvas click works.
- [x] **Spawn / HUD (D).** spawnY 149, heading 104°, minClear
  137.6 m, ring1Dist 600; camera-behind dot −0.95, above 4.2 m; HUD
  right edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas
  focused.

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

- [x] 4 screenshots regenerated from the final code, byte-new vs v18.
  (Clean re-run `node shots.mjs`, exit 0, errors none, after the
  PLAY_SECONDS 49.5 change: cover 93,971, cockpit 124,699, start
  110,947, landing 98,589 — all byte-new vs v18 (97,894 / 126,466 /
  120,672 / 96,099). Cover: player on final over the runway, RING
  12/12 Score 3403 0:49 Position 1/5, AGL pill "AGL 148 FT · HIGH",
  horizon + sea visible, contact shadow under the plane, two rivals
  in frame, NO debris fragments, NO bubbles. Cockpit: 5 dials
  readable (84 px numbers, needle #E53935, IAS/VSI labels), rivals
  #3/#4/#5 as navy pills, tornado + rain, ring 3 at 184 m — clouds
  read as small faceted puffs, only 2 faint small discs remain at
  the far right edge. Title: gold navy-outlined title, white
  instruction card navy border + dark navy text readable at left
  44%, NO Fuel/0-12 pill (only the gear button), key-caps + Start,
  rings + beach + rival visible on the right. Landing: "LAND ON THE
  RUNWAY" + "AGL 152 FT · HIGH", dark asphalt #2B303A, "09" readable,
  PAPI boxes left of the threshold, contact shadow under the plane
  on the runway. Known remaining flaws (honest): the ring-pointer
  pill overlaps rival #4's pill in the cockpit shot; the storm anvil
  is very dark/blocky; a storm cloud slightly covers "NUSANTARA" on
  the title; a white faceted cloud can still read as a floating rock;
  2 faint small discs remain at the far right edge of the cockpit
  frame; the leftmost dial is half-clipped by the frame edge.)
- [x] Entrypoint run twice, byte-identical.
  (`MAKEFUN_OUTPUT_DIR=/tmp/out-v19-a|b node main.ts` twice, exit 0;
  `diff -r` exit 0, both dirs 2,249,269 bytes, dossier.json sha256
  d8ae1e6c6d819b507cfc098988ce274f1e25e59d6323366c3e1b26d836d8ec10
  in both. v18: sha d13f4c02…, 2,257,591 bytes — the delta is the
  v19 code + main.ts header.)
- [x] Bundle dry-run `--repo` exit 0.
  (`/tmp/bundle-v19.log`, 144 s, exit 0. 23 session files found
  (v18: 22 — now includes this builder session). 0 errors. Standard
  warnings only: "0 usage rows attached" — the known turn-boundary
  issue (usage rows for the running turn are written when the turn
  ends; the coordinator re-runs the SELECT + bundle next turn) — and
  "repo.dirty" (resolved by the commit below). Missing
  --mcp/--provider/--effort flags are for the real submit bundle,
  handled by the coordinator. Note: the kit CLI had to be restored
  from the local backup `best-flight-game-20261126-0057-kit2.bin`
  (8.4 MB gzip, 25 entries) — the extracted kit directory was empty
  and the `*-kit.tar.gz` is corrupt (4,398 bytes, tar exit 2); the kit
  was NOT re-downloaded. The CLI was used from /tmp/kit2-restore;
  the kit directory itself was left untouched.)
- [x] **`node sim-3tier.mjs` all three routes as specified above.
  (Reference 12/12 + landed 59.7 s; Weak 4/12 no finish — DOWN from
  v18's 9/12, noted honestly; Idle 2/12 no finish. Exit 0.)
- [x] `node test/headless.test.mjs` all tests pass. (14/14.)
- [x] Local git commit.
  (Commit 1: v19 code + probes + docs + verification + gate entry.
  Commit 2: this checklist update. Both exit 0. Push by the
  coordinator — the builder does not push/submit.)
