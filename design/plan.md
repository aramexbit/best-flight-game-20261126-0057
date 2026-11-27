# Langit Nusantara — Ring Run: v20 Plan

Competition: make.fun "Make the best flight game", $500 (top 50 share).
Deadline: **Saturday 28 Nov 2026, 07:57 WIB**. Repo: `best-flight-game-20261126-0057`.

## The game (unchanged since v11)

A Three.js daytime flight game. You fly a Cessna 208 Caravan (Susi Air
livery) over a tropical archipelago, racing 4 rivals through **12 glowing
rings**, then landing on the runway. Chase cam (3/4 rear) + cockpit cam (C).
Controls: W/S pitch (W climbs), A/D roll, Q/E rudder, Shift/Ctrl throttle,
Space start, P pause, R restart, M sound. HUD is never faked: altitude,
speed, heading, time, score, race position, ring pointer.

## Why v18 exists

Blind test v17 (Gemini) verdict NO — but scores UP vs v16 across the
board (Cover 5.2 / Cockpit 4.5 / Title 5.8 / Landing 6.0). The remaining
criticism: the plane is a stack of rectangular blocks (flat slab wings /
tail, no taper), the explosion reads as confetti, the terrain is flat
green with sparse foliage, dial text overlaps, the cockpit framing is
heavy, the storm clouds are grey blobs, and the title has no emblem.
Live playtest v17 (27 Nov 02:13–02:28 WIB) added five P0 findings the
seed screenshots never showed: (a) the chase camera still faced the
plane's nose live (camera dropped BELOW the plane at steep locked-up
pitch — the chase offset used the full 3D forward); (b) 0/12 rings —
ring 1 missed by 28–45 m (trim lock-in + gust pitch random-walk, not
ring position); (c) the blast message lingered 15–40 s live (the HUD
timer ran on a fixed 1/60 per frame); (d) R and Space did not restart
mid-flight, C did not switch camera while paused; (e) tap controls too
coarse (1 W tap locked pitch up permanently).

## What v18 changes (patch on v17, never a rebuild)

**Flight / fairness (the P0 fixes)**
- Pitch auto-level gated on the raw stick (`stickPitch`, same pattern
  as v17's `stickRoll`): hands-off pitch holds at 0.000 rad for 20 s
  with the live gust applied; a locked 0.30 rad trim decays to 0 in
  5 s. Softer rates (pitchRate 0.9→0.7, rollRate 1.9→1.5, autoLevel
  0.55→0.7) so tap corrections can aim at rings.
- Ring 1 was NOT moved: the spawn geometry is exact (600 m back,
  spawn.y = ring1.y + 10, radius 13 m — straight flight crosses ~10 m
  from centre, a pass). The misses were the trim/gust random-walk,
  now fixed. New headless test 6: no-input straight flight passes
  ring 1 at 7.4 s.
- Chase camera uses a yaw-only horizontal forward (the old full-3D
  forward dropped the camera below the plane at steep pitch); the
  look target keeps half the pitch. Staging camera shifted right/up
  (28, −34, 6.5) so storm/rings are not behind the instruction pill.
  v18b: the chase lerp also got a HEIGHT FLOOR (camera never below
  plane.y + 2.5 m) + rate 8 — the fixed-1/60 lerp lagged up to 8 m
  below the plane in climbs at low FPS (live probe A5 pre-fix:
  30/120 bad samples, min above −8 m), the belly-in-frame complaint
  in a new shape. v18c: the A5 numbers then passed (behind + above)
  but the plane was STILL invisible in live chase screenshots — the
  numbers never measured DISTANCE, and the camera sat 25–150 m behind
  the plane at low FPS (diagnosed by NDC projection + a 3x-scale test:
  plane dead-centre in frame, angle 3.5°, but a 30–80 px speck). Fix:
  feedforward — chasePos translates by the plane's own displacement
  each draw, so straight flight has zero steady-state lag at any FPS
  — and the live draw gets the REAL frame dt (staged shots still pass
  1/60). A5 re-check 2: 120/120 good, maxDist 12 m (chase geometry
  12.3 m), climbCam dist 12.27 m at pitch 0.51.
- HUD message timer runs on real frame time (was fixed 1/60 per
  frame): the collision message clears in ~2.5 s of real time.
- R restarts from play / paused / over; C switches camera while
  paused.
- Race position latch: crashed rivals keep their latched position
  (rings + distance at the crash) instead of dropping out of the
  `ahead` count — the v17 5/5 → 2/5 → 5/5 jump.

**Visuals (Gemini v18 prompt, per scene)**
- Caravan faceted + tapered (`taperedPrism` helper): nose taper
  1.0→0.42, dark-windowed cabin #1E293B, wings tapered chord 1.6→1.15
  (0.72) with 3° dihedral, red tapered wingtips, wing struts, tapered
  stabiliser halves + red tips, dark wheels #1F2937, flatShading.
- Cockpit: pillars 0.05, trim #273244, glareshield #1E293B, red trim
  0.025; dial faces redrawn on a light face (#F8FAFC) with 96 px
  numbers at radius 138 and the sub-label in a separate navy badge
  clear of the "6" and the needle pivot.
- Terrain: slate cliffs #64748B/#4B5563, sand beach y 0–1.6, sea
  shallow #00C5D9 → deep #0284C7; foliage 2.5–3× denser mid-course
  (hero groves 26, ring 3–5 groves 16 each, bushes 320, tufts 160),
  runway corridor kept clear.
- Runway 09: asphalt #2B303A + dark underlay, "09"/"27" from a
  512×256 canvas texture (bold 180 px, anisotropy 8), 0.8 m edge +
  centreline dashes, fuel truck on the apron by the shed.
- Explosion 3-layer faceted: core #FFF3B0 / #FF9F1C / #E63946
  icosahedron/dodecahedron, slate smoke #475569/#64748B/#CBD5E1,
  chunky debris #334155/#C82828 with gravity.
- Storm: darker funnel (#8BA0B5/#6B7F92, wider), second anvil tier
  (5 lobes, y 360–430, #334155/#475569), rain #E0F2FE at 0.45.
- Title: instruction card structured (rgba(248,250,252,0.92), 2 px
  #063C85 border, radius 16, padding 18×22) — text STAYS navy
  #132238 (user instruction); hero title gets a navy outline;
  key-cap sub-labels get a navy pill backing (rgba(6,60,133,0.78),
  radius 999 px); rival #2–#5 markers are compact navy pills (1.5 px
  #FACC15 border, white text), not big round pins. Slipstream trail
  dimmed (opacity 0.20, size 0.8) — the pink wash in the cockpit view.

## Why v19 exists

Blind test v18 (Gemini) verdict NO — Cover 5.2 (flat) / Cockpit 5.8
(+1.3) / Title 6.4 (+0.6) / Landing 5.5 (−0.5). The criticism: giant
transparent bubble/circle artefacts in the sky; giant faceted cloud /
smoke masses colliding with the HUD; the yellow rival + its smoke trail
reading as a ribbon/wire; grid lines in the grass; dials still cramped;
the tornado a stack of cylinders; rival pills floating; the instruction
card covering the action; in-flight HUD counters on the title screen;
marshmallow clouds without shadows; a landing with no ground shadow;
an incohesive airfield (no PAPI / glide-slope). Live playtest v18
(27 Nov 03:58–04:14 WIB) added six P0 findings the seed screenshots
never showed: (a) ring 2 never passed in 5 flights (closest 212 m —
the 1→2 window is ~250 m, 3–4 s at 147 kts); (b) the rival blast never
seen live (message 2×, text surviving >140 s in the DOM, including
after "Crashed!"); (c) the player crash shows no fireball (the camera
enters the terrain/flame); (d) only 1 shadow live (v17 saw 5);
(e) pitch taps very weak (6× S only −41 ft); (f) at 192–77 ft over
the sea the background is uniform pale blue — no horizon, no sea.

## What v19 changes (patch on v18, never a rebuild)

**Flight / fairness (the P0 fixes)**
- Pitch authority (finding (e)): pitchRate 0.7 → 0.9, pitchLevel
  0.45 → 0.30. Headless test 7: 1 s hold, S −26.4 m / W +24.8 m,
  ratio 1.06 — taps ~2× more effective, symmetric.
- Ring 1→2 (finding (a)): the honest fix is the pitch authority
  above, NOT longer legs — the legs are 206 m by construction
  (course length / 12). A first attempt (ringSpacing 370 + a 260 m
  floor) collapsed the final leg to 145 m and the Reference sim
  FAILED (11/12, ring 12 missed by 22.6 m). The fix: `COURSE.legMin
  120 / legMax 480` replaces ringSpacing + spacingJitter; wander
  0.30 → 0.22 rad. Legs now [600, 206, 207, 206, 206, 207, 208, 208,
  209, 208, 208, 208]. New headless test 8 (leg 1→2 ≥ 200 m, turn
  < 0.5 rad) + live probe phase A8 (ring 2 with HELD keys).
- Blast gate (finding (b)): blastDist 100–400 → 80–300 m, facing
  >0.85 → >0.88; lateFire/relFire ≤400 → ≤300, relFire facing >0.7
  → >0.75. New headless test 9: 400 m fires in NO branch. Fireball
  bigger (shell 42 m / 3.5 s). The HUD message bug is fixed at the
  root — hud.js now sets `textContent = ''` when the timer expires
  (v18 only set opacity 0); the live probe checks the text is ''
  (strict).
- Crash camera (finding (c)): on EVENT_CRASH the camera pulls wide
  (`setChase(45, -10, 20, 40)`) and a transient `crashing` state
  advances effects/storm for 1.5 s before `endGame(false)` — the
  fireball reads as an OBJECT. Live proof: probe phase A4 shots.
- Contact shadows (finding (d)): a dark ellipse directly under the
  player + each rival, visible below 120 m AGL (opacity 0.55→0,
  scale 8 m + agl×0.02); sun-offset shadow cap 120 → 50 m.
- Horizon (finding (f)): fog #cfe8f5 → #9CC8E8 (was ≈ skyHorizon
  #CFEFFF, so the horizon vanished at low altitude over the sea).

**Visuals (Gemini v19 prompt, per scene)**
- Bubbles: TWO real sources found. (1) Rival `emitSmoke` — 2.2 m
  puffs growing 1.8/s for 2.8 s (≈13 m), emitted every 0.1 s, a
  chain of giant grey bubbles — flattened (size 1.2 m, grow 0.9,
  life 2.0 s, opacity 0.45). (2) Cloud lobes seen edge-on (75–95 m,
  1.5–1.7 km, opacity 0.95 + a transparent pass + JPEG) read as
  grey bubbles — cloud material is now FULLY OPAQUE and lobes are
  smaller (base 40–60 m, lower 30–50 m, top 25–40 m). The explosion
  shockwave ring is DELETED; blast smoke capped (life 6–8 s, grow
  0.5, max ~8 m); explosion debris shrunk (0.4–1.0 m, 32→24).
- Tornado rebuilt as a vortex: 12 segments, continuous taper 4 m
  (foot) → 46 m (crown), dark slate #3B4652/#586675, 18 rotating
  debris flecks, faceted anvil, rain #E6F4FF opacity 0.35.
- Grass grid: mottle 0.045 → 0.012, offsetHSL amplitude 0.03/0.07
  → 0.015/0.04, terrain SEG 160 → 192.
- Runway furniture: turnaround pads (asphalt disc r 20 m + white
  ring, both strip ends) + PAPI (4 boxes by the west threshold:
  2 red inner + 2 white outer) + a red-white striped windsock
  (animated yaw + flutter).
- Dials redrawn: numbers 84 px at radius 120 (was 96 px at 138 —
  glyphs hit the tick ring), ticks shorter (long 180 / major 190 /
  minor 200, all to 216), badge 150×52 at y 300, font 46 px, dial
  main r 0.20 / outer 0.14, labels IAS/VSI (was KTS/FUEL), needle
  #E53935, VSI as the 6th gauge, trim #242B35, glareshield accent
  #C93B2B.
- Title: `.top-pill` in `#title-top-right` hidden by CSS (Fuel +
  0/12 gone from the title; the gear button stays). `#title-rules`
  top 47% → 44%, max-width 540px → 44%.
- AGL / glide cue: `#hud-agl` pill (top 19%) — `AGL {ft} FT ·
  {glide}` on approach (rings ≥ ringTotal), glide = dist × 0.0524
  (3°), ON GLIDE / HIGH / LOW, ±15 m tolerance.
- Cover framing: `PLAY_SECONDS` 51.6 → 49.5. The staged blast at
  50.35 s sits ~14 m from the chase camera, so debris and the
  airframe halves crossed the lens in <1 s and the 51.6 s cover
  caught a random giant fragment in the HUD corner (different every
  run — Math.random). The cover now catches the pre-collision
  convergence (player on the final leg, rivals closing on the meet
  point, storm visible) — deterministic every run.

## Why v20 exists

Blind test v19 (Gemini) verdict NO — Cover 5.5 / Cockpit 5.0 (−0.8) /
Title 6.5 (+0.1) / Landing 5.5. The criticism: the cover angle is a
flat rear silhouette, the plane blends into the sky, the prop is a
blur, tree shadows float/offset on slopes, the mountains are sharp
and pinched, the runway sits on a ridge back, the cover HUD is busy
(AGL pill, heading tape, control hints); the cockpit dials STILL read
as canvas noise (overlapping/generic clock faces), the storm is a pile
of black polygons, rival tags look like debug markers, the canopy
frame is heavy; the title's bullet icons are small/blurry/misaligned,
bullet 3 rambles, the storm sits behind the title, a ring is cut by a
rival badge; the landing is ALMOST A DUPLICATE of the cover (same
framing, 460 vs 456 FT, 109 vs 113 KTS, same score 3403) — drop one of
the four screenshots. Live playtest v19 (27 Nov 06:21–06:36 WIB)
added seven P0 findings the seed screenshots never showed: (a) ring 2
never passed in 3 tap flights (gap grew to 3.7–4.5 km, closest 186 m
— the browser tool can only tap, not hold; the 1→2 leg is 206 m);
(b) the blast fired at 0:41 and the player's plane crashed itself at
0:42 — no fireball in frame, and the crash camera ended pressed
against the hillside with pale bubbles on the slope; (c) only 1 of 9
code-visible shadows identifiable live; (d) the round sun/gear button
still visible on the title screen; (e) no toast visible when ring 1
passed (only the score/counter changed); (f) the giant faceted black
storm anvil sits exactly over ring 1 (piercing its centre) and behind
the title text, and the white faceted clouds read as floating rocks;
(g) the Weak sim fell 9/12 → 4/12 (pitchRate 0.9 amplifies the noisy
pilot's oscillation).

## What v20 changes (patch on v19, never a rebuild)

**Flight / fairness (the P0 fixes)**
- Ring 2 forgiving (finding (a)): rings 1–3 wander 0.22 → 0.12 rad,
  altitude jitter ±28 → ±12 m (rings 4+ unchanged). New headless
  test 15: a tap-rate-limited pilot (stick live 0.2 s per 0.5 s,
  throttle held) passes ring 2 in 11.7 s (limit 30 s). Live probe
  phase A9: the same with a 33%-duty tap driver.
- Crash camera (finding (b)): `crashing` beat 1.5 → 3.0 s (the
  fireball lives 3.5 s), camera `setChase(48, -12, 30, 40)` with the
  height lifted until the camera clears the terrain behind the wreck
  by 4 m — it can never end up inside the slope. Live proof: probe
  phase A4.
- Contact shadows (finding (c)): opacity 0.55 → 0.75, scale 8 +
  agl×0.02 → 10 + agl×0.03, visible below 160 m AGL (was 120).
- Gear hidden on title (finding (d)): `body.title-open #btn-gear
  { display: none; }` (v19 only hid Fuel + 0/12).
- Ring toast (finding (e)): 2.2 → 4.0 s, font 34 → 40 px. New
  headless test 16: centre pass pays 150, half-radius pass 125.
- Weak sim (finding (g)): 4/12 → 7/12 (score 652 → 1375) — the
  gentler early course helps the noisy pilot recover; Reference stays
  12/12 + landed (59.6 s, 3406).

**Visuals (Gemini v20 prompt, per scene)**
- Dials redrawn at 1024 px with REAL instrument scales on the
  −120°..+120° sweep (IAS 0/25/50/75/100, ALT 0/225/450/675/900, VSI
  −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W with NO badge — the 360°
  HDG needle would cover a bottom label), numbers 96 px at radius
  380 (HDG 110 px), ticks major 430→470 / minor 445→470, redline r
  480 on IAS/RPM only, badge 210×72 at y 800, needle shortened (tip
  0.1325 m), anisotropy 8. Cockpit camera pulled back 0.1 → 0.35 m
  so the leftmost dial is no longer clipped.
- Storm reads as weather (finding (f)): anvil 4 lobes of 100–140 m
  at y 320–350 (was 5 of 140–200 m at y 375–425), colours
  #6B7E92/#8296A8; wall 6 lobes of 100–150 m, anchor 150 → 220 m off
  the course; funnel #46545F opacity 0.9; spray crown 5 puffs + 18 m
  ring; spout2 moved to 750 m along / 320 m aside at 0.45 scale (was
  500/180/0.55) so it no longer pierces ring 1. Second pass: the
  wall/anvil lobes use SMOOTH shading, detail 1 (was flat detail 0)
  — the first v20 screenshots showed the lightened anvil STILL
  reading as a black cut rock: hard facet steps on a dark surface are
  the problem, not just the colour.
- Trees planted: burial −0.15 m; ground discs tilt to the terrain
  normal at +0.08 (was flat at +0.15); mountains softened (ridge
  detail 0.2 → 0.12, detail2 ±12% → ±8%, landmark spine 0.22 →
  0.10); cloud lobes more/smaller/tighter (base 14–18 × 30–45 m, top
  10–13 × 20–30 m).
- Prop disc no longer a pale bubble: #8a9199, opacity max 0.25
  (was #d8d8d8 / 0.45), radius 1.7 m; livery contrast up (cheatline
  0.30 m, red wingtips to 5.8 m).
- Rival tags compact: pill 4.0×1.7 m at y+2.9 (was 5.0×2.1 at +3.2).
- Title card: sharp SVG icons (gold ring, red/gold target, blue
  storm cloud + gold bolt) + Gemini's 3 concise lines; gear hidden.
- Landing is a LOW flare, truly different from the cover:
  `PLAY_SECONDS` 49.5 → 43.5 (cover: mid-race ring 10/11, AGL pill
  hidden since rings < 12); landing freeze 300 m/+50 m → 250 m/+30 m
  with the glidepath rebuilt (far target +45 → +25 m, near +6 → +4 m)
  and the autopilot terrain guard relaxed for point targets (samples
  80/160 m, margin 15 m). The first v20 landing shot FAILED the
  freeze — the strict guard pinned the plane at +45 m and it orbited
  at a 77° bank for the full 140 s — diagnosed with a headless trace
  and fixed at the root. The freeze now triggers at t=47.2 s (250 m,
  +25 m, aligned 3.7°, roll 4.6°). Landing camera 16/−3/3.0 FOV 55.
- Ring glow pulses 0.28+0.06·sin(time·3.2) (was flat 0.22).

## What v20 does NOT change

Caravan shape, 3/4 camera, race system, 12-ring + land mission, yellow
key-caps, no "Press Space" line, daytime, v11 premium palette, W climbs
(never invert).

## Verification (OpenGame 4-layer, this version)

1. **3-tier sim** (`sim-3tier.mjs`, pure Node, real game logic):
   Reference (autopilot) must pass 12 rings AND land; Weak (noisy input)
   gets some rings, no finish; Idle (no input) must fail. Must pass before
   v20 is declared ready. v20 run: Reference 12/12 + landed, score 3406,
   59.6 s; Weak 7/12, score 1375 (UP from v19's 4/12 — the gentler early
   course helps the noisy pilot recover); Idle 3/12, score 427.
2. **Headless tests** (`test/headless.test.mjs`, Node): heading holds with
   no input (+ gust applied, the v16 regression); ring-centre pass counts;
   crossing rivals fire the collision gate; v18 adds pitch-hold with
   zero stick + gust (test 5) and no-input straight flight passes ring 1
   (test 6); v19 adds pitch-tap symmetry (test 7), ring 1→2 spacing
   (test 8) and the 400 m no-fire gate (test 9); v20 adds the
   tap-rate-limited ring-2 pilot (test 15) and the toast-worthy ring-1
   bonus (test 16). 16/16 pass. Logic lives in pure modules
   (`flight.js`, `rings.js`, `collision.js`, `storm.js` gust) — no browser.
3. **Checklist** (`verification.md`): every item checked only with proof
   (screenshot / sim / test), never a claim.
4. **This design doc set**: plan + style + asset list, so the direction
   does not drift mid-build.

## Submit rule

Submit only on the user's explicit order per version, after screenshots +
an outside blind test. v20 is not submitted by the builder.

## v21 (Gemini v20 blind-test fixes + v20 live-playtest P0s)

- Cover is a NEW moment (31.0 s, ring 8 over the shoreline) — never a runway
  approach duplicating the landing. The AGL pill hides on the cover
  (rings < 12), which also resolves the ALT-vs-AGL confusion.
- Clouds: smooth-shaded multi-puff cumulus (detail-1), never faceted
  polyhedra. Tornado: translucent layered vortex (outer 0.45 + darker
  counter-rotating inner funnel + 3 helix rings + spray), never a solid
  grey cone. Storm wall/anvil pushed 100 m out, spout2 to 1100/450 m.
- Cockpit: a real ATTITUDE gauge (live horizon disc), VSI as a blue bug
  on the ALT dial, dark bezels, darker faces, no struts, no red trims,
  light glareshield rim highlight, sloped shell-grey throttle pedestal.
- LIVE chase is the cover's 3/4 (13 m / −6 m ≈ 25°); live A10
  measures median 24.8° off dead-rear (min 22.8°, max 26.6°). Rings
  1–5 forgiving; tap pilot passes ring 5 (test 17: 20.9 s; live A9:
  the full probe's run stalled at ring 3 once, the focused diag
  passed ring 5 in 23.5 s — the PWM tap driver is marginal, it
  wobbles ±25° in heading and can orbit a ring on an unlucky gust).
- Crash camera 60 m back looking AT the wreck + terrain clamp; blast
  smoke 8 near-black FLATTENED puffs (shape fix, not opacity).
  The A4 camera-distance check was fixed to measure from the ACTUAL
  crash point (the plane flies ~2 km past the teleport before it
  hits the ground; the first run measured 2085 m from the teleport).
- Rival shadows 1.3x / 1.25x. Title hides rival markers. Prop disc is
  a ring texture (1.55 m). Next-ring glow damped (2.0x / 0.20).
- v21b LANDING FIX: a real manual landing crashed on touchdown (old
  finish-zone caps speed < 50, VS < 8 — below a human's natural
  approach). The finish-zone window is now speed < 62, VS < 12,
  pitch < 0.45; the onRunway gentle path is untouched. Tests 19+20
  + sim "manual" route (12/12 + landed 53.5 s, 3410) prove it.
- v21b–v21h TITLE FINAL (the user's decision, 27 Nov 09:49–09:55
  WIB, approved mockup): the title is MODERN — centred gold title,
  ALL-GOLD mission text above a big circular gold play button +
  START, six light glass control chips across the bottom, NO side
  box, NO logo, NO gear. The live background is a HERO camera
  (south of the plane, looking north — the storm stays out of
  frame, the plane reads large at the right, clear of the button).
- Verification: headless 20/20, sim-3tier ALL PASS (Reference 12/12 +
  landed 59.6 s score 3410; Weak 7/12; Idle 3/12; manual 12/12 +
  landed 53.5 s score 3410), sim seeds 1–12 12/12 + landed +
  collisions 12/12 (scores 3369–3422), live probe
  probe-v21-live.mjs (phases D-hero/A3/A5/A6/A7/A8/A9-ring5-taps/
  A10-3/4/A/A2/A4-crash/C/B/B2-manual-landing). v21 is not submitted
  by the builder.
- v21c LOW START + STEEP RIDGES (user 27 Nov 10:17): spawn AGL
  ~57.7 m over the sea (minRingAlt 45, walk starts y 55, spawn =
  ring 1's altitude so the first leg is level); the course climbs
  62 → 145 m to the approach. Two pairs of narrow, tall ridge
  islands (r 260–280 m, h 300–320 m) flank the FINAL ring positions
  450 m perpendicular (pair A ring 3, pair B ring 9) — placed at the
  end of createCourse, course-aware, idempotent. Fixed positions
  were tried and rejected (seed 10's course runs over a fixed
  southern ridge and crashes). The autopilot terrain guard in
  shots.js is proportional + path-based for the low course.
- v21c DENSE STORM + TORNADO-KILLS-RIVAL (user 27 Nov 10:17 +
  10:23): 5 tornadoes along the whole course (main cell r45,
  spout2 r25, spout3 near ring 4 r35 — the close killer, spout4
  near ring 9 r30 — the cover tornado, spout5 near ring 10 r25),
  all OFF the ring line; 4 rain systems; lightning in a random
  cell every 3–7 s; a second storm wall at spout4. A rival that
  enters a tornado's cylinder EXPLODES (explodeChain fireball +
  explodeSplit torn-apart halves, tumbling, burning) and is out
  12 s (tornadoOutDelay) — the player's position improves the
  moment it dies, and the HUD shows "🌪️ <name> DESTROYED BY THE
  TORNADO!" + boom + shake. The player is never tested against
  the tornadoes (the gusts are the player's storm danger, as now).
  Readability is kept: no tornado covers a ring or the player line.
- v21c verification: headless 22/22 (tests 21 tornadoAt cylinder +
  22 low start/ridges), sim-3tier ALL PASS (Reference 12/12 +
  landed 60.1 s 3410; Weak 4/12 — below the v21 brief's 7/12
  floor, honest caveat, the low course is harder for a struggling
  player; Idle 1/12 crashed; Manual 12/12 + landed 54.0 s 3410),
  sim seeds 1–12 12/12 + landed (scores 3381–3422). The shots.mjs
  harness timeouts were raised 20 s → 60 s (the heavier scene
  takes ~26 s to become ready in software rendering) + the
  playtest waits for window.__debug before clicking Start. The
- v21d STORM DECK + RINGS UNDER BLACK CLOUDS (user 27 Nov 11:49):
  a black cumulonimbus DECK ceilings the whole course (~15 flat
  dark lobes, rx 90–130 m, y-scale 0.3–0.4, y ~248 m, base ~196 m,
  #0F172A/#1E293B/#334155, opaque, spaced ~220 m along the course
  polyline) — the storm sky is dominant, not a few blobs. The
  rings (60–159 m, top 172 m) sit UNDER the deck, in rain: 3 new
  course rain systems (rings 1–4, 5–8, 9–12, 250 streaks each,
  0.32) join the 4 cell systems (7 systems, ~1,800 streaks).
  Lightning strikes near the rings too (random tornado OR random
  ring, ~70% ring strikes), every 2–5 s, flash 0.2 s. The staged
  cover/cockpit shots fire a real bolt at the next ring
  (storm.flash()) so the frame shows lightning by the ring. The
  title stays clean (the hero camera looks north; the deck is
  south + east, behind the camera) and the landing stays a
  clear-sky flare (the deck is overhead, out of the FOV 55°
  frame). Headless 23/23 (test 23: rings below the deck).
  Sim-3tier ALL PASS (unchanged numbers — the deck/rain/lightning
  are visual only).
  live probe gains phase A11 (tornado kill, visual screenshot).

## v22 (Gemini v21 blind-test fixes + user P0 landing bug + wider storm deck)

- Blind test v21 (Gemini) verdict NO — Cover 5.5 / Cockpit 5.0 /
  Title 5.0 / Landing 6.0. The criticism: storm clouds + funnel
  like coarse faceted grey blobs/cones, rain thin and disconnected
  from sky/water; the cockpit a boxy flat-shaded frame with gaps,
  dials cluttered, clashing with the outer HUD; the title empty /
  pasted-together, the plane parked awkwardly on the shoreline,
  two subtitle lines competing with the horizon/sand; the landing
  terrain a flat green slab with sparse small trees, ALT 378 FT
  vs AGL 81 FT reading as contradictory. Live playtest v21
  (27 Nov 13:20–13:53) added: lightning NEVER visible in any
  screenshot; tornado-kill NOT observed in ±8 min of normal play
  (rivals stayed in formation); ring 2 missed 6/6 on the random
  course; manual landing never reached by the tester. And the
  user's own playtest 27 Nov 14:04: "finishnya masih hancur,
  tidak menang" — a manual landing to win STILL crashed on v21,
  although the probe landed. The user's playtest decides pass.
- RINGS FORGIVING (v22): rings 1–5 radius 13 → 16 m (rings 6–12
  stay 13 m); the climb is now LINEAR (50 m → approach ~145 m in
  even ~7.9 m steps — the old exponential climb made +16/+26 m
  jumps); early altitude jitter ±12 → ±2 m. The Weak sim returns
  4/12 → 9/12 (score 666 → 2102), above the 7/12 floor. New
  headless tests 24 (16 m early rings, 15 m off-centre counts) +
  25 (early steps 0–10 m). Course (seed 1): rings
  y = [57, 66, 75, 82, 90, 102, 87, 124, 101, 133, 152, 145].
- STORM (v22, Gemini + user 27 Nov 14:06 "awan hitam LEBIH
  LEBAR"): the deck is now ~400 m WIDE — every course position
  grows a CLUSTER of 3 overlapping puffs (centre lobe rx 120–160
  m + two satellites ±60–120 m sideways), ~45 lobes, raised to
  y ~262 m so the deeper lobes (base ~192 m) still clear the
  highest ring top (172 m). The funnel is rebuilt as a vortex:
  segment overlap +4×scale, a smooth outer SHEATH cone (48→6 m,
  264 m, opacity 0.22, DoubleSide) unifying the silhouette, and a
  CROWN puff cluster at the top (3 dark slate puffs). Rain: 30 m
  streaks, wind slant ×2.2, 300 streaks per course system, 0.38 —
  plus SPLASH rings on the sea (4 cells × 8 rings, growing 5→40 m
  over 2.5 s where ground ≤ 2 m). Lightning is now THREE parallel
  jagged lines (main + 2 echoes ±2.5 m) + a radial-gradient glow
  sprite at the strike midpoint + flash light 700 → 1500, so a
  strike reads as one ~5 m thick bolt. `tornadoCells(course,
  groundAt)` is a pure exported layout (all 5 cells with `id`);
  spout3 moved 70 → 60 m from ring 4. New headless test 27
  (spout3 55–75 m from ring 4; the detour target is inside its
  kill cylinder).
- RIVALS (v22): ORANYE now DETOURS into the tornado in NORMAL
  play — at t 13–18 s it dashes full-throttle to the point 20 m
  from spout3 toward ring 4 (inside the 35 m kill radius, at
  ring-4 altitude) and is killed there (headless test 32: kill
  at t = 16.32 s, spout3, y 81.0, ring 4 y 81.8, 3 rings passed).
  Rival badges are subtler (sprite 3.2×1.36 m, float 2.7 m,
  opacity 0.9).
- COCKPIT DEDUP + ALT·MSL (v22, Gemini): in cockpit mode the
  duplicated DOM HUD panels hide (body `cockpit-view` + 
  `hud.setCockpitHud(on)` — top-left ALT/SPD/HDG, attitude ball,
  compass; the ring pointer, objective, messages, score/time and
  fuel/throttle stay). The altitude panel reads "ALT · MSL"
  (the v21 "ALT 378 FT" vs "AGL 81 FT" contradiction is labelled
  away). Trim #242B35 → #3a4149, arch tube 0.035 → 0.03 m.
- TITLE BACKGROUND (v22, Gemini — note (a): the two gold mission
  lines are the user's final decision and STAY): the title camera
  now ORBITS — yaw 0.22 rad/s, bank 0.42 rad, y 190 → 110 m — so
  the sea/beaches/hills fill the frame behind the gold text and
  the play button; the sea texture drifts (offset 0.008/0.004/s).
- LANDING ENVIRONMENT (v22, Gemini): PAPI lenses 1.6×0.7×1.6 m
  on 1.0 m posts; approach-light domes 0.5 m + a NEW crossbar row
  at 300 m out (5 lights across the centreline); a 12 m CONTROL
  TOWER by the hangar (concrete shaft + glass cab + red roof);
  a PARKED static Caravan on the apron (buildPlane reused);
  the airfield tree belt 40 → 60 trees, band 80–200 m (airport
  veg count 60 in the staged shots).
- AUTO-WIN + AUTOPILOT LANDING (v22, user decision 27 Nov 15:09 —
  REPLACES the Gemini manual-landing fix above, which was
  implemented, verified, then REMOVED): user: "ga usah mendarat
  — ketika sudah berada di atas aspal garis finish otomatis
  menang... buat tidak mendarat saja asal sudah berada di garis
  finish otomatis menang dan secara autopilot mendarat dengan
  mulus." The 15:11 clarification changes the diagnosis: the
  PLAYER's plane never exploded — what exploded were RIVAL planes
  (scripted dive/clip/collision/tornado-kill); the player's plane
  stayed intact but WIN never triggered. So the real bug was the
  win condition, not the player's touchdown. The Gemini numbers
  (speed 78, VS −16.5, hard landing, cushion, tiers) are NO
  LONGER used for the win condition; sim-land-profiles +
  sim-landing-gemini are DELETED as superseded. The new design:
  - After 12/12 rings, the moment the plane enters the runway 09
    corridor (|dx| < 250 m, |lat| < 24 m) the win triggers
    (`state.autoLanding`, logged `[win] {...}`) — NO speed/VS/
    pitch threshold at all. **User clarification 27 Nov 15:46 —
    MANUAL until ring 12, autopilot ONLY after the win:** the
    player flies manual from the start to ring 12 (rings, racing
    the other teams, dodging storm/tornadoes — all manual as
    usual); the autopilot takes over ONLY after the win triggers,
    for the smooth landing alone. In code this is already the
    case: the autoland input replacement lives inside `if
    (state.autoLanding)` (flight.js line 174) and `autoLanding`
    is set only by the win trigger — before the win the player's
    input passes through untouched. Proven by headless test 34
    (11 rings: dive obeyed → crash, no rescue; climb input
    climbs +69.3 m in 2 s; 12 rings: the same dive ignored →
    autoland WIN).
  - The AUTOPILOT takes over the input: steep VS-hold −9/−7/−2.5
    (measured: the gentle −6/−5/−1.5 descent floats ~500 m
    longer), heading-hold + cross-track roll law (never a far
    steering point — the first build steered 500 m past the
    centre and the plane touched down banked −0.58..−0.81 rad
    turning back), throttle idle. Ground contact pins the plane
    to the deck, speed bleeds 6 m/s per s, pitch/roll damped to 0,
    a pinned ROLLOUT block (without it the rollout stretched ~300
    m over the eastern downslope) ends the run below 8 m/s →
    'landed' + EVENT_LAND + touchdown telemetry branch 'WIN'
    kind 'autoland'.
  - Crash checks are DISABLED after the win triggers — the plane
    can NEVER explode during the autopilot landing, in any
    condition. Crash checks during the race (rings, terrain,
    tornado, rivals) are UNCHANGED.
  - Rival explosions are ALWAYS the other teams' planes (user
    15:13: "Efek dramatisnya itu ledakan pesawat musuh, bukan
    pesawat kita" + "bukan pesawat musuh tapi pesawat team lain
    karena itu bukan pesawat tempur") — the final-event gate
    pauses scripted rival explosions once the player has 12/12
    rings (rivals.js `playerOnFinal`), and rival crashes are
    announced by team name ("💥 KUNING + HIJAU MID-AIR
    COLLISION!", "💥 <name> CRASHED!"). No "musuh/enemy" text
    anywhere in the game (verified by grep — only "angle of
    attack", a flight term).
  - HUD WIN cue after 12/12 (hud.js + main.js hudView): `SPD
    {kt} KT · AGL {ft} FT · {glide} · {AUTOLAND READY | FLY OVER
    RUNWAY 09 TO WIN}`, green when lined up on final, gold
    otherwise, "AUTOPILOT LANDING…" once the win has triggered.
    The objectives now say "FLY OVER THE RUNWAY TO WIN"; the
    endGame panel adds "Autopilot landing — smooth touchdown!".
  - `state.landingKind`: 'autoland' | null (the old
    runway/finish/hard/offfield tiers are gone).
  - Score: `hardLandingPenalty: 100` REMOVED from config.js.
  - VERIFICATION: sim-win-autoland 14/14 ALL PASS (10 WIN
    profiles incl. 68 m/s fast, 90 m/s dive, VS −32 plunge,
    150 m high entry, 30° angled entry — all WIN, wings level at
    touchdown, roll 0–0.02 rad; 4 negative profiles: 11 rings no
    win, 300 m short crash, sea ditch crash, 0 rings crash).
    Headless 32/32 (tests 19/20/28–31 rewritten for the win;
    test 33 now asserts the WIN cue + the old VS-zone colours
    and TOUCHDOWN READY are GONE). Sim-3tier ALL PASS (Reference
    12/12 landed 58.8 s score 3411; Weak 9/12 score 2102; Idle
    crashed 39.4 s; Manual 12/12 landed 57.5 s).
  - HONEST CAVEATS (v22): fast/high entries (68–90 m/s, 60–150 m
    AGL) touch down LONG — dx 769–955, ground 4–11 m (eastern
    slope/beach, ~500–700 m past the strip end) — still smooth
    wins, wings level, never a crash; realistic entries touch
    down on/just past the strip (dx 2–291, ground 90.3).
- Verification: headless 32/32, sim-3tier ALL PASS, sim-win-
  autoland ALL PASS 14/14, shots.mjs exit 0 (4 new screenshots,
  errors none), live probe probe-v22-live.mjs (phases D-title/
  A8-ring2-held/A9-ring5-taps/C-cockpit-dedup/A12-tornado-kill-
  normal-play/A13-lightning/B2-human-flight-to-the-strip +
  auto-win). v22 is not submitted by the builder.
  Deadline 28 Nov 07:57 WIB — v22 is the LAST big iteration.
