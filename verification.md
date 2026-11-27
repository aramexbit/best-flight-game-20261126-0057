# Langit Nusantara — Ring Run: Verification Checklist (v20)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

## What changed in v20 (vs v19) — all patched on top of v19

- [x] **(a) Course start forgiving + tap pilot proven.** Rings 1–3:
  wander 0.22 → 0.12 rad, altitude jitter ±28 → ±12 m (rings 4+
  unchanged). New headless test 15: a tap-rate-limited pilot (stick
  live 0.2 s per 0.5 s, throttle held) passes ring 2 in 11.7 s
  (limit 30 s). Live proof: probe phase A9 — the FIRST live tap
  driver (fixed 1 tick in 3 at full deflection) FAILED, 0 rings in
  30 s: a 250 ms full-deflection pulse banks ~0.22 rad and never
  converges with a 500 ms dead time. Rev 2 replaces it with a
  sigma-delta PWM tap driver — the autopilot's continuous stick
  value becomes on/off key pulses at the 250 ms tick, averaging to
  the proportional value (the same model as headless test 15). The
  focused re-probe (`/tmp/probe-a9-v20.mjs`, runtime restart killed
  the run before its log was written, but the screenshot on disk
  proves the pass) shows **RING 2/12 +165 at ~0:15, score 308,
  RING 3 · 120 m, POSITION 2/5** (`live-shots/v20-live-ring2-tap.jpg`,
  105,796 byte) — the tap pilot passes ring 2 live. Honest caveat:
  only ONE PWM-tap pass is screenshot-proven (the second attempt's
  log was lost to the restart); the headless test 15 remains the
  repeatable proof. (rings.js, test/headless.test.mjs,
  probe-v20-live.mjs)
- [x] **(b) Crash camera held longer + clamped clear of terrain.**
  `crashing` beat 1.5 → 3.0 s (the fireball lives 3.5 s), camera
  `setChase(48, -12, 30, 40)` (was 45/-10/20) with the height lifted
  until the camera's own position clears the terrain behind the wreck
  by 4 m — the v19 live playtest saw the fireball for 1.5 s and then
  the camera pressed against the hillside. Live proof: probe phase
  A4 screenshots. (main.js)
- [x] **(c) Contact shadows darker/bigger.** Opacity 0.55 → 0.75,
  scale 8 + agl×0.02 → 10 + agl×0.03, visible below 160 m AGL (was
  120). The v19 live playtest identified only 1 of 9 code-visible
  shadows. Proof: cover + landing shots — a dark ellipse under the
  plane on the grass/runway; live proof: probe phase C count.
  (render.js)
- [x] **(d) Gear button hidden on the title.** `body.title-open
  #btn-gear { display: none; }` — the v19 live playtest still saw
  the round sun/gear button top-right (v19 only hid Fuel + 0/12).
  Proof: title shot — no button top-right; live proof: probe phase D
  checks `getComputedStyle(#btn-gear).display === 'none'` on the
  title. (game/index.html)
- [x] **(e) Ring toast unmissable.** Duration 2.2 → 4.0 s, font
  34 → 40 px — the v19 live playtest passed ring 1 (score 122) with
  NO toast visible in any screenshot. New headless test 16: a centre
  pass pays 150 (100 ring + 50 centre), a half-radius pass pays 125
  (≥ 120). Live proof: probe phase A6 reads `#hud-msg` right after
  the pass. (main.js, hud.js, game/index.html,
  test/headless.test.mjs)
- [x] **(f) Storm reads as weather, not black rock.** Anvil: 4 lobes
  of 100–140 m at y 320–350 (was 5 of 140–200 m at y 375–425),
  colours #6B7E92/#8296A8 (was #3B4652/#586675); wall: 6 lobes of
  100–150 m, anchor 150 → 220 m off the course, colours
  #5F7285/#71849A/#5A6C7E; funnel #46545F opacity 0.9 (was #3B4652 /
  0.95); spray crown 5 puffs + 18 m ring (was 3 + 14 m); spout2 moved
  to 750 m along / 320 m to the side at 0.45 scale (was 500/180/0.55)
  so it no longer pierces ring 1. Second pass (f2): the wall/anvil
  lobes use SMOOTH shading, detail 1 (was flat detail 0) — the first
  v20 screenshots showed the lightened anvil STILL reading as a black
  cut rock behind the title: hard facet steps on a dark surface are
  the problem, not just the colour. Proof: title + cockpit shots —
  the storm is now a smooth grey cloud mass with a striped funnel and
  rain; the white cumulus banks keep their flat-shaded style.
  (storm.js)
- [x] **(f2) Blast smoke no longer reads as bubbles (rev 2, after the
  full v20 probe).** The v20 live crash frame showed the explosion
  smoke as ~8 big pale translucent spheres scattered over the grass
  — the same "pale bubbles on the slope" the v19 live playtest
  named, a THIRD bubble source the v19 fix missed (emitSmoke +
  cloud lobes were fixed, blast smoke was not; it also appears in
  the v19 crash frame). Root cause: the pale #CBD5E1 puffs (every
  3rd puff) + the wide ±30 m / ±20 m spread + perfect smooth
  spheres with a soft radial texture = isolated pale balls floating
  apart from the fire. Fix: pale #CBD5E1 replaced by mid-slate
  #7A8CA0 (smoke is now #475569 / #64748B / #7A8CA0 only), cluster
  tightened to ±18 m horizontal / ±12 m vertical (was ±30/±20),
  initial size 2.5–4 → 2–3.5 m — dark-to-mid slate puffs clustered
  on the fireball read as smoke. Proof: focused crash re-probe
  (see the live-probe section below). (effects.js)
- [x] **Trees planted, shadows hug the slope, mountains softened,
  clouds merged.** Tree/palm burial −0.15 m (trunks never float on a
  slope crest), bush +0.05·s; ground discs tilt to the local terrain
  normal (was flat) at +0.08 (was +0.15) — the v19 "floating/offset
  shadow" is gone; ridge detail 0.2 → 0.12, detail2 ±12% → ±8%,
  landmark spine 0.22 → 0.10 (no more pinched peaks); cloud lobes
  more/smaller/tighter (base 14–18 × 30–45 m, top 10–13 × 20–30 m,
  lower 5–6 × 25–40 m). Proof: cover + landing shots — trees sit in
  the grass, discs under the trunks, layered rolling ridges, banks of
  many small puffs. (terrain.js)
- [x] **Dials redrawn at 1024 px with real instrument scales.**
  Canvas 512 → 1024, numbers 96 px at radius 380 (HDG 110 px), real
  scales on the −120°..+120° sweep (IAS 0/25/50/75/100, ALT
  0/225/450/675/900, VSI −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W
  with NO badge — the 360° HDG needle would cover a bottom label),
  tick major 430→470 / minor 445→470, redline r 480 on IAS/RPM only,
  badge 210×72 at y 800 (below the needle sweep), needle shortened
  (Box 0.042×0.155, tip 0.1325 m), anisotropy 8. Cockpit camera
  pulled back 0.1 → 0.35 m so the leftmost dial is no longer clipped.
  Proof: cockpit shot — 5 dials with readable numbers and red
  needles, all in frame. (plane.js, render.js)
- [x] **Prop disc no longer a pale bubble.** Colour #d8d8d8 →
  #8a9199, opacity max 0.45 → 0.25, radius 1.85 → 1.7 m; `update()`
  opacity `min(0.25, throttle*0.25)`. Livery contrast up: cheatline
  0.22 → 0.30 m, red wingtips to 5.8 m (was 5.5), nav lamps at 5.8 m.
  Proof: cover shot — the disc is a subtle grey blur at the nose, the
  red wingtips/cheatline pop against the sky. (plane.js)
- [x] **Rival tags compact.** Pill 5.0×2.1 → 4.0×1.7 m, y+3.2 →
  +2.9 m (hugs the fin top instead of hovering). Proof: cockpit shot
  — #3/#5 as compact navy pills, no debug-box look. (rivals.js)
- [x] **Title card: sharp SVG icons + Gemini's 3 concise lines.**
  "Fly through all 12 glowing rings, then land on Runway 09." /
  "Hit ring centres for bonus points; watch fuel and airspeed." /
  "Avoid stalling at low speed and navigate clear of the storm." —
  with a gold ring, a red/gold target and a blue storm cloud + gold
  bolt (the old fuel-pump pictogram and abstract lightning read as
  small/blurry/misaligned). Proof: title shot — three crisp icons,
  three readable lines. (game/index.html)
- [x] **Landing is a LOW flare, truly different from the cover.**
  `PLAY_SECONDS` 49.5 → 43.5 (cover: mid-race ring 10/11, AGL pill
  hidden since rings < 12 — cleaner HUD); landing freeze 300 m/+50 m
  → 250 m/+30 m with the landing glidepath rebuilt (far target +45 →
  +25 m, near +6 → +4 m) and the autopilot terrain guard relaxed for
  point targets (samples 80/160 m, margin 15 m — was 80–340 m/45 m).
  The first v20 landing shot FAILED the freeze: the strict guard
  pinned the plane at +45 m above the strip and it orbited at a
  77° bank for the full 140 s (HUD 2:20, steep bank, no runway in
  frame) — diagnosed with a headless trace (`/tmp/diag-landing-v20.mjs`:
  the plane flew a perfect final at +45 m, aligned 0.8°, roll −0.1°,
  and never descended). After the fix the freeze triggers at t=47.2 s
  (250 m, +25 m, aligned 3.7°, roll 4.6°). Landing camera 14/−2/2.6
  FOV 52 → 16/−3/3.0 FOV 55. Proof: landing shot 100,444 bytes,
  0:47, "LAND ON THE RUNWAY" + "AGL 81 FT · ON GLIDE" — the runway
  fills the frame, "09" + piano keys big, plane level over the
  centreline — vs the cover (0:43, 469 FT, 129 KTS, "AGL 290 FT ·
  HIGH", runway a distant strip). Different moment, altitude, speed
  and composition; the score is the same (3406) in both because no
  ring is passed between them — noted honestly. (shots.js, main.js)
- [x] **Ring glow pulses.** The next ring's glow torus pulses
  0.28+0.06·sin(time·3.2) (was flat 0.22). Proof: cockpit shot —
  the next ring glows gold against the terrain. (rings.js)

## What changed in v19 (vs v18) — kept as history

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
  finished, score 3406, time 59.6 s, touchdown (1282, 92, 119) on the
  runway (centre 1250, 120, height 94). (v19: 12/12, 59.7 s, 3403.)
  The landing uses the probe's 'land' regulator (VS-hold +
  heading-hold, idle throttle); the pursuit autopilot alone levels
  off and never touches down.
- [x] **Weak (noisy input) gets some rings, does not finish.**
  Proof: same run — Weak **7/12 rings** (v19: 4/12 — UP, honestly),
  no finish, score 1375, still flying at 300 s. The gentler early
  course (wander 0.12 rad, jitter ±12 m on rings 1–3) helps the noisy
  pilot recover instead of oscillating away. The criterion still holds
  (some rings, no finish). The Weak model is a 0.5 s reaction lag + a
  slowly-wandering bias (new every 2 s) + 8% lets-go; white per-step
  noise alone still passed 12/12, and a 1.5 s lag crashed it (0 rings).
- [x] **Idle (no input) fails (no finish / crash).**
  Proof: same run — Idle 3/12 rings (rings 1–3 lie near the spawn
  line), no finish, score 427, flew straight to (19958, 155, 4468),
  still flying at 300 s. Doing nothing cannot finish the course.

## Headless tests (Layer 2) — `test/headless.test.mjs`, Node

- [x] **No input → heading holds (v16 regression).**
  Proof: `node test/headless.test.mjs` 16/16 pass (v20: was 14/14).
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
- [x] **Tap-rate-limited pilot passes ring 2 (v20, finding (a)).**
  Proof: same run — test 15: stick live 0.2 s per 0.5 s (40% duty),
  throttle held, rings=2 at 11.7 s (limit 30 s), still flying. The
  v19 live playtest failed ring 2 in 3/3 tap flights; the forgiving
  early course (wander 0.12 rad, jitter ±12 m) is what makes this
  possible. Live proof: probe phase A9 (33% duty tap driver).
- [x] **Ring-1 pass pays a toast-worthy bonus (v20, finding (e)).**
  Proof: same run — test 16: centre pass bonus=150 (100 ring + 50
  centre), half-radius pass bonus=125 (≥ 120). The 4.0 s toast
  "RING 1/12 +bonus" announces a real number. Live proof: probe
  phase A6 reads the toast text right after the pass.
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

## Live probe (v20 — exit 0, errors: none, ~30 min)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 154.8, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  samples=120 bad=0 minDot −0.96 minAboveM 4 maxPitch 0.45, climbCam
  dot −0.96 above 4.2 m pitch 0.65 rings 2, PASS=true.
- [x] **No-input straight flight passes ring 1 + toast visible (A6).**
  rings=1 at 8.75 s, y 155, still flying. The toast reads
  `#hud-msg` = "RING 1/12  +112", opacity 1 — the probe's own
  PASS flag read false only because its check string used ONE space
  ("RING 1/12 +") while main.js's template writes TWO ("RING 1/12
  +112"); the toast itself is proven by the DOM text AND by the
  live screenshot `live-shots/v20-live-noinput-ring1.jpg` (105,845
  byte), where "RING 1/12 +112" stands big in gold across the
  middle of the frame, with ring 2 ahead (97 m), the funnel + smooth
  grey storm cloud, rain, and rivals #4/#5 as compact navy pills.
  (The check string was fixed in the probe file afterwards.)
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring 2 with HELD keys (A8).** rings=2, ring2At=13.3 s,
  minDistToRing2=11 m, PASS=true. (v19: 13.8 s / 10 m and 13.5 s /
  13 m — the same forgiving course.)
- [x] **Ring 2 with TAPS (A9, NEW in v20 — finding (a)).** The full
  probe's first tap driver (fixed 1 tick in 3 at full deflection)
  FAILED: rings=0 in 30.2 s, distNext 62.4 m — a 250 ms
  full-deflection pulse banks ~0.22 rad and never converges with a
  500 ms dead time. Rev 2 (sigma-delta PWM tap driver, same model as
  headless test 15) PASSED in the focused re-probe
  (`/tmp/probe-a9-v20.mjs`): screenshot
  `live-shots/v20-live-ring2-tap.jpg` (105,796 byte) shows
  **"RING 2/12 +165" at ~0:15, score 308, RING 3 · 120 m, POSITION
  2/5**, the plane banking hard over the sea with the funnel + storm
  cloud ahead. Honest caveat: the focused run was killed by a
  runtime restart before its log was written, so only ONE PWM-tap
  pass is screenshot-proven (the second attempt's log is lost);
  headless test 15 remains the repeatable proof.
- [x] **Ring blast visible (A) + message REALLY clears (finding (b)).**
  Blast t=40.4 (rings 4) at (−380,176,−97); immediate shot:
  blastDist 272 m, facing 0.92; +1.5 s shot: hudMsg="" (empty), no
  collision text in the body; +4.5 s: text="" opacity 0, PASS=true.
  Rival visibility 11/14. Screenshot
  `live-shots/v20-live-blast.jpg` (102,229 byte): a large faceted
  red/orange fireball top-right, "💥 MID-AIR COLLISION!" in gold
  across the middle, the gold ring in frame, a rival mid-frame,
  rain, RING 5 · 112 m, POSITION 2/5 — the blast is unmistakable in
  frame.
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=41.0 (player 0 rings, offCourse 80 m). Rival visibility 13/14.
- [x] **Player crash explodes — as an OBJECT on a wide camera, with
  the camera held off the hillside (A4, finding (c)).** CRASH at
  t=28.9, 3 fireball meshes at impact, 5 at +1.5 s, "Crashed!" panel
  (hidden for the capture). The v20 crash camera
  (`setChase(48, -12, crashHeight, 40)` + terrain clamp, 3.0 s beat)
  frames the fireball dead-centre: the canonical shot
  `live-shots/v20-live-crash-15.jpg` (87,456 byte, rev 3) shows the
  faceted red/orange/yellow fireball dead-centre on the grass with
  red debris fragments around it and a rival overhead — (c) proven
  in the canonical live shots. **Smoke (rev 2 + rev 3):** the full
  probe's crash frame showed the blast smoke as ~8 big PALE
  translucent spheres scattered over the grass — a third bubble
  source the v19 fix missed. Rev 2 removed the pale #CBD5E1 puffs
  and tightened the cluster (±18 m); the re-probe frame still
  showed pale spheres (0.55 opacity over bright sand washes the
  mid-slate out). Rev 3 raised the blast-smoke opacity to 0.85 and
  dropped the lightest colour (smoke now #475569 / #64748B only):
  the final frame's puffs are dark grey, clustered on the
  fireball, and read as smoke around an explosion — a faint
  spherical read remains on close inspection, but the frame reads
  as a blast, not a field of bubbles. Two focused crash re-probes
  (`/tmp/probe-crash-v20.mjs`, exit 0, errors none) both crashed at
  t=29.1 with 3 → 5 fireball meshes.
- [x] **10 shadow meshes (C, finding (d)).** count=10, all
  `vis=true` (5 sun-offset ellipses + 5 contact shadows — the full
  set this time; v19 counted 9 because the crashed player's contact
  shadow was hidden on the crash page). The staged cover/landing
  shots show the dark contact ellipse under the player plane on the
  grass/runway.
- [x] **Gear button hidden on the title (D, finding (d)).**
  `getComputedStyle(#btn-gear).display === 'none'` on the title,
  PASS=true; title shown flex. (v19 only hid Fuel + 0/12.)
- [x] **Finish end-to-end (B).** RACE COMPLETE in 13.00 s,
  Position 1/5, Score 2770, touchdown (1073.2, 91.9, 120), lat 0
  the whole final, roll 0, Space restart without canvas click works.
- [x] **Spawn / HUD (D).** spawnY 155, heading 103°, minClear
  144 m, ring1Dist 600; camera-behind dot −0.95, above 4.2 m; HUD
  right edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas
  focused.

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

- [x] 4 screenshots regenerated from the final code, byte-new vs v19.
  (Clean re-run `node shots.mjs`, exit 0, errors none, after the
  rev-3 smoke fix: cover 82,679, cockpit 118,572, start 112,964,
  landing 101,490 — all byte-new vs v19 (93,971 / 124,699 / 110,947 /
  98,589). Cover: mid-race ring 10/11, RING 12/12 Score 3406 0:43,
  469 FT, 129 KTS, "AGL 290 FT · HIGH", runway far centre-left,
  layered mountains, planted trees, a rival under a white faceted
  cloud top-right, prop disc a subtle grey blur at the nose. Cockpit:
  5 dials readable with real instrument scales + red needles, all in
  frame, ring 3 at 182 m, funnel + diagonal rain, smooth grey storm
  mass (not black rock), rivals #3/#5 as compact navy pills — 2
  faint small discs remain at the far right edge, a faint pink smear
  bottom-left, pill #3 half-clipped at the left edge. Title: gold
  navy-outlined title, white instruction card navy border + 3 sharp
  SVG icons + 3 readable lines, NO gear button top-right, tropical
  beach + planted palms, red rival over the beach, funnel with spray
  ring at its base, smooth grey anvil behind the title (reads as
  cloud, not rock). Landing: "LAND ON THE RUNWAY" + "AGL 81 FT · ON
  GLIDE", 0:47, 377 FT, 109 KTS, runway fills the frame, "09" +
  piano keys big, plane level over the centreline, planted trees both
  sides, hangar right. **Cover vs landing are clearly different:**
  different moments (0:43 vs 0:47), altitudes (469 vs 377 FT),
  speeds (129 vs 109 KTS), angles (runway far vs filling the frame),
  AGL (HIGH vs ON GLIDE). The score is the same (3406) in both
  because no ring is passed between them — noted honestly. Known
  remaining flaws (honest): 2 faint discs at the far right edge of
  the cockpit frame; the anvil still sits behind the title text
  "NUSANTARA"; the crash smoke keeps a faint spherical read on close
  inspection (rev 3); the PWM tap pass is screenshot-proven once
  only (second attempt's log lost to a runtime restart).)
- [x] Entrypoint run twice, byte-identical.
  (`MAKEFUN_OUTPUT_DIR=/tmp/out-v20c-a|b node main.ts` twice, exit 0;
  `diff -r` exit 0, both dirs 2,230,121 bytes, dossier.json sha256
  ad6106680b6666793699ca78d5f11c53a5608528c936416cf3e23c4df20dcbb0
  in both. v19: sha d8ae1e6c…, 2,249,269 bytes — the delta is the
  v20 code + the rev-2/rev-3 smoke edits + the v20 main.ts header.
  An earlier pair was run on the rev-3 code before the header edit
  (2,227,779 byte, sha 1eddfb9a…); the final pair above is on the
  final code.)
- [x] Bundle dry-run `--repo` exit 0.
  (`/tmp/bundle-v20.log`, ~128 s, exit 0. 24 session files found
  (v19: 23 — now includes this builder session). 0 errors. Standard
  warnings only: "0 usage rows attached" — the known turn-boundary
  issue (usage rows for the running turn are written when the turn
  ends; the coordinator re-runs the SELECT + bundle next turn) — and
  "repo.dirty" (resolved by the commit below). The kit CLI was used
  from the extracted kit in the workspace
  (`~/workspace/makefun/best-flight-game-20261126-0057-kit/.../cli/makefun.mjs`);
  /tmp/kit2-restore was wiped by a runtime restart mid-session, the
  workspace kit is intact, nothing was re-downloaded.)
- [x] **`node sim-3tier.mjs` all three routes as specified above.
  (Reference 12/12 + landed 59.6 s skor 3406; Weak 7/12 skor 1375 —
  UP from v19's 4/12, noted honestly; Idle 3/12 skor 427 no finish.
  Exit 0.)
- [x] `node test/headless.test.mjs` all tests pass. (16/16.)
- [x] Local git commit.
  (Commit 1: v20 code + probes + docs + verification + gate entry.
  Commit 2: this checklist update. Both exit 0. Push by the
  coordinator — the builder does not push/submit.)
