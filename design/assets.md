# Langit Nusantara — Ring Run: Asset List (v20)

Everything is procedural / generated in code — there are no downloaded
image, audio, or model files. This list is what the game builds at runtime
so a future version can check nothing is missing or renamed.

## Code modules (`game/src/`)

| File | What it builds / does |
|---|---|
| `config.js` | All tuning numbers + PALETTE (single source of truth) (v19: fog #9CC8E8, pitchRate 0.9 / pitchLevel 0.30, COURSE legMin 120 / legMax 480 — ringSpacing + spacingJitter deleted; v22: COURSE.ringRadiusEarly 16 (rings 1–5 16 m, 6–12 13 m), SCORE.hardLandingPenalty 100 REMOVED in the auto-win redesign; v24: COURSE.winCorridorLat 40 (win corridor lateral half-width, was hard-coded 24 m in flight.js)) |
| `random.js` | Seeded RNG (`createRandom`) + value noise (`createNoise`) |
| `terrain.js` | 9 islands, ground mesh, beach tiers, palms/trees/rocks, runway plateau, clouds, sailboats, lighthouse, beach houses, airfield props (v18: slate cliffs, 2.5–3× denser mid-course foliage, runway 09 canvas-texture numbers, fuel truck; v19: SEG 192, mottle 0.012, turnaround pads + PAPI + striped windsock, clouds fully opaque + smaller lobes, plant scale 0.8–1.35× + random yaw; v20: tree/palm burial −0.15 m, ground discs tilted to the terrain normal at +0.08, ridge detail softened 0.2→0.12 / detail2 ±8%, landmark spine 0.22→0.10, cloud lobes more/smaller/tighter — base 14–18 × 30–45 m, top 10–13 × 20–30 m; v22: sea texture drift in update() (offset 0.008/0.004 per s), PAPI lenses 1.6×0.7×1.6 m on 1.0 m posts, approach domes 0.5 m + crossbar row 300 m out, 12 m control tower by the hangar, parked static Caravan on the apron (buildPlane reused — terrain.js now imports plane.js), airfield tree belt 40 → 60 trees, band 80–200 m; v24: approach valley — approachValleyAt + valleyFloorAt + carveValley (32 m floor to x=970, ~64 m at x=1000, strip untouched, applied after the runway blend in createGroundAt AND buildTerrain groundAt)) |
| `rings.js` | 12 rings (torus + glow), runway + spawn planning, `checkPass` (v19: stepLen = clamp(dist/legsLeft, legMin, legMax), wander 0.22 rad, glow only on the NEXT ring; v20: rings 1–3 wander 0.12 rad + altitude jitter ±12 m, next-ring glow pulses 0.28+0.06·sin(time·3.2); v21: rings 1–5 forgiving (wander 0.12, jitter ±12 m), glow damped 2.0x/0.20, leg-clearance margin 45→25 m, walk starts y 55 (low start), spawn = ring 1's altitude (level first leg); v21c: STEEP RIDGES flank the final ring positions 450 m perpendicular (pair A ring 3 r260 h300, pair B ring 9 r280 h320) — course-aware, idempotent, appended at the end of createCourse; v22: rings 1–5 radius 16 m (COURSE.ringRadiusEarly), linear climb (50 m → approach, even ~7.9 m steps), early altitude jitter ±2 m, clearance floor uses each ring's own radius, two torus + two glow geometries chosen per ring, sparkle group scales to the next ring's radius) |
| `flight.js` | Pure flight model (thrust/drag/stall/bank/landing) — no Three.js (v18: pitch auto-level on raw `stickPitch`, softer rates; v21b: finish-zone softEnough speed < 62, VS < 12, pitch < 0.45 — the landing-to-win fix; v22 AUTO-WIN (replaces the Gemini tiers): win triggers on entering the runway 09 corridor (|dx| < 250 m, |lat| < 24 m) after 12/12 rings — no speed/VS/pitch threshold; `state.autoLanding` + `[win]` log; autoland input (VS-hold −9/−7/−2.5, heading-hold + cross-track roll, throttle idle) replaces the player input; ground contact pins the plane + a pinned ROLLOUT block bleeds speed 6 m/s per s to 'landed' below 8 m/s; crash checks DISABLED after the win; `state.touchdown` telemetry + console log on every ground contact (branch WIN/CRASH), `state.landingKind` 'autoland' | null; v24: win corridor uses COURSE.winCorridorLat (40 m) + pure `finalAssistPullUp(y, vs, groundAhead)` for the onFinal pull-up assist) |
| `shots.js` | `autopilotTo` (steering) + staged screenshot scenes (v19: PLAY_SECONDS 49.5 — pre-collision convergence, not the blast; v20: PLAY_SECONDS 43.5 — mid-race ring 10/11, landing freeze 250 m/+30 m with a rebuilt glidepath (far +25 m, near +4 m) and a relaxed terrain guard for point targets; v21: PLAY_SECONDS 31.0 (ring 8 over the shoreline) then 20.0 (v21c — ring 4 over the turquoise sea, flanked by ridge pair A + spout3); autopilotTo terrain guard proportional + path-based (carrot + midpoint + 80 m ahead, margin 25 m) for the low course; v23: staged scene `blast` (BLAST_SECONDS 20 — upper bound only, freezes at tornado-kill + 0.5 s; `onStep` may return false → break) |
| `rivals.js` | 4 rival planes, race, collision pair, showcase flybys, dive/clip crashes (v18: navy-pill number markers, crash-position latch, dimmer slipstream; v19: marker pill y 3.2 m, flattened emitSmoke, slipstream/flyby/showcase trails bigger + softer; v20: marker pill 4.0×1.7 m at y+2.9 m; v21: `setMarkersVisible` (title hides tags), `tornadoAt` kill — a rival inside a tornado's cylinder explodes (explodeChain + explodeSplit) and is out `RACE.tornadoOutDelay` 12 s, `playerPosition` skips tornado-killed rivals, `debugTeleport` for the live probe; v22: ORANYE tornado DETOUR (t 13–18 s, full-throttle dash to 20 m from spout3 toward ring 4, inside the 35 m kill radius — kill at t 16.32 s), marker pill 3.2×1.36 m at y+2.7 m opacity 0.9, `tornadoDetourDone` flag, FINAL-EVENT GATE (`playerOnFinal` pauses the scripted dive/clip/collision/tornado-kill triggers once the player has 12/12 rings), `onEvent('rival-crash', …)` at all 4 explosion points so crashes are announced by team name) |
| `effects.js` | Fireball, smoke, debris, shockwave, splash, oil slick, flak, confetti, fireworks (v18: 3-layer faceted explosion, slate smoke, chunky debris; v19: shockwave DELETED, fireball shell 42 m / 3.5 s, blast smoke capped, debris 0.4–1.0 m × 24; v21: blast smoke 8 near-black FLATTENED puffs (flat 0.55, #1E293B/#334155), smokePuff `flat` option) |
| `storm.js` | Tornado/waterspout, storm wall, rain, lightning, gusts (`gustAt`) (v18: darker/wider funnel, second anvil tier, rain `#E0F2FE` 0.45; v19: 12-segment vortex, taper 4→46 m, dark slate #3B4652/#586675, 18 debris flecks, faceted anvil, rain `#E6F4FF` 0.35; v20: anvil 4 lobes 100–140 m at y 320–350 #6B7E92/#8296A8, wall 6 lobes 100–150 m anchor 220 m off-course, funnel #46545F opacity 0.9, spray crown 5 puffs + 18 m ring, spout2 750 m/320 m at 0.45 scale, wall/anvil SMOOTH-shaded detail 1; v21: funnel outer opacity 0.45 + darker counter-rotating inner + 3 helix rings, wall 10 lobes anchor 320 m, anvil 6 lobes y 290–315, spout2 1100/450 m scale 0.4; v21c: FIVE tornadoes (main r45, spout2 r25, spout3 near ring 4 r35, spout4 near ring 9 r30, spout5 near ring 10 r25) + `tornadoAt(x,y,z,tornadoes)` pure kill test + `tornadoes` list, 4 rain systems (350/200/250/250 streaks), lightning in a RANDOM cell every 3–7 s, second storm wall at spout4; v21d: STORM DECK (~15 flat dark lobes rx 90–130 m y ~248 m base ~196 m #0F172A/#1E293B/#334155 along the course polyline) + 3 course rain systems (rings 1–4/5–8/9–12, 250 streaks, 0.32) + lightning near the RINGS too (random tornado OR random ring, every 2–5 s, flash 0.2 s) + `storm.flash(x,z)` for a staged bolt at the next ring; v22: `tornadoCells(course, groundAt)` pure exported layout (all 5 cells with `id`; spout3 60 m from ring 4), funnel rebuilt (segment overlap +4×scale, smooth outer SHEATH cone 48→6 m / 264 m / opacity 0.22 DoubleSide, CROWN puff cluster 3 dark slate puffs), DECK WIDER (~45 lobes in clusters of 3 — centre rx 120–160 m + two satellites ±60–120 m — ~400 m wide, y ~262 m, base ~192 m), rain 30 m streaks slant ×2.2, 300 streaks per course system, 0.38 + sea SPLASH rings (4 cells × 8 rings, 5→40 m over 2.5 s), lightning THREE parallel jagged lines (main + 2 echoes ±2.5 m) + radial-gradient glow sprite + flash light 1500, `bolts` + `boltGlow` exposed on the storm object; v24: bolts are TUBES (core TubeGeometry r 1.8 m + halo TubeGeometry r 5 m/0.35, rebuilt per strike), glow sprite 320 m/0.95, flash light 4000 (distance 2000), live flash 0.35 s) |
| `plane.js` | Caravan mesh (fuselage, wings, prop, cockpit + 5 dials) (v18: `taperedPrism` faceted + tapered airframe, slim pillars, light dial faces + navy label badges; v19: dials redrawn — 84 px numbers at radius 120, shorter ticks, badge 150×52, needle #E53935, labels IAS/VSI, VSI 6th gauge, trim #242B35, glareshield accent #C93B2B; v20: dials redrawn at 1024 px with real instrument scales (IAS 0/25/50/75/100, ALT 0/225/450/675/900, VSI −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W no badge), numbers 96 px at radius 380, needle shortened (tip 0.1325 m), prop disc #8a9199 opacity max 0.25 radius 1.7 m, cheatline 0.30 m, red wingtips to 5.8 m; v22: trim #3a4149, arch tube 0.035 → 0.03 m) |
| `render.js` | Renderer, chase/cockpit cameras, shadows, sky dome, sun (v18: chase offset + look target on yaw-only horizontal forward; v18b: chase lerp rate 8 + height floor plane.y + 2.5 m; v18c: chase feedforward — chasePos translates by the plane's displacement each draw — + lerp on real frame dt; v19: sun-offset shadow cap 50 m + contact shadows under all 5 planes, setGauges passes verticalSpeed; v20: contact shadows darker/bigger — opacity 0.75, scale 10 m + agl×0.03, AGL < 160 m — cockpit camera 0.35 m back) |
| `hud.js` | HUD panels, ring pointer, messages, race position (v18: message timer on real frame time; v19: message textContent cleared when the timer expires + `#hud-agl` AGL/glide pill; v20: ring toast 4.0 s; v22: `setCockpitHud(on)` hides the duplicated DOM panels in cockpit view; the AGL pill becomes the WIN cue after 12/12 — `SPD {kt} KT · AGL {ft} FT · {glide} · {AUTOLAND READY | FLY OVER RUNWAY 09 TO WIN}`, green when lined up on final, gold otherwise, "AUTOPILOT LANDING…" once the win has triggered; v24: `stableRingDir` (pure, exported) — ±15° deadband + 0.5 s steady-hold, ring change adopts at once) |
| `input.js` | Keyboard input |
| `audio.js` | WebAudio: engine hum, chime, boom, fanfare (synthesised, no files) |
| `main.js` | Game loop, title, end screens, gust application, final assist (v18: passes `stickPitch`, R restarts from play/paused/over, C switches camera while paused, staging camera 28, −34, 6.5; v18c: live `draw()` gets the real frame dt instead of fixed 1/60; v19: `hudView()` gains aglFt/distRwy/glide, crash camera pulls wide + transient `crashing` state 1.5 s; v20: ring toast 4.0 s, crash camera `setChase(48, -12, 30, 40)` + terrain-clamped height + `crashing` beat 3.0 s, landing camera 16/−3/3.0 FOV 55; v22: title orbit (yaw 0.22 rad/s, bank 0.42 rad, y 190 → 110 m), `hudView()` gains spdKt / vsMs / aligned / onFinal / autoLanding for the WIN cue, endGame adds the autoland line ("Autopilot landing — smooth touchdown!"), FINISH toast + chime on the first autoLanding frame, collision message names the teams ("💥 KUNING + HIJAU MID-AIR COLLISION!"), 'rival-crash' handler announces "💥 <name> CRASHED!", objectives say "FLY OVER THE RUNWAY TO WIN", `hud.setCockpitHud` called at the C toggle, startGame and runShot; v23: runShot `blastKillT` + live-exact tornado-kill handler (gold message + boom + shake) + freeze at kill+0.5 s; blast camera cover FOV 68 `setChase(13,-6,4.5)`; header `?shot=...|blast`; v24: runShot blast also `storm.flash(nextRing)` on the tornado-kill; the pre-paint `hud.update(hudView(), 0)` in runShot is REMOVED (it seeded the stabiliser with the camera's initial pose — only the post-draw update in paint() remains); onFinal pull-up assist (ground sampled 150 m ahead, `finalAssistPullUp`, blend 0.6; stickPitch carries pitchInput onFinal)) |
| `collision.js` | Pure collision-gate logic (extracted from rivals.js, v17) — Node-testable (v19: blastDist 80–300 m, facing >0.88 / >0.75) |

## Vendored libraries (`game/`)

| File | Notes |
|---|---|
| `three.module.js` (r160) | Three.js, vendored — never re-downloaded |
| `index.html` | Page + all CSS (HUD, title, key-caps, pills) (v20: gear button hidden on the title, ring toast 40 px, title rules = Gemini's 3 concise lines with sharp SVG icons — gold ring, red/gold target, blue storm cloud + gold bolt) |
| `main.js` (entry) | Boots the game from `game/src/main.js` |

## Generated at runtime (no source files)

- **Terrain:** island heightfield (seeded fbm), vertex-coloured mesh
  (sand/grass/forest/rock/dirt/airfield by height + slope), sea plane
  with depth colours, reef band, wave arcs.
- **Rings:** torus geometry + emissive glow disc, gold `#FFD52A`.
- **Planes:** faceted/tapered Caravan (player) + 4 rivals (same mesh,
  different livery colours + number badges `#2`–`#5` as navy-pill sprites).
- **Cockpit:** 3 grey panels + 5 dial faces (canvas textures: numbers,
  needles, labels in navy badges) + 0.05 m pillars + canopy bow.
- **Storm:** FIVE tornadoes (main cell r45 scale 1 + spout2 r25 scale
  0.4 + spout3 near ring 4 r35 scale 0.55 + spout4 near ring 9 r30
  scale 0.6 + spout5 near ring 10 r25 scale 0.5), each a
  12-segment translucent layered vortex (outer #46545F opacity
  0.45 + darker counter-rotating inner funnel + 3 helix rings,
  18 rotating debris flecks, spray crown 5 puffs + 18 m ring),
  storm-wall lobes (smooth-shaded grey-blue, 10 lobes 60–85 m,
  anchor 320 m off-course + a second 6-lobe wall at spout4) +
  anvil (6 lobes 70–100 m at y 290–315, #4A5A6A/#5A6C7E/#42525F,
  smooth-shaded), rain (4 systems, line segments, #E6F4FF
  0.3–0.35, 350/200/250/250 streaks), lightning (line bolt, in a
  random cell every 3–7 s). A rival inside a tornado's cylinder
  explodes (chain fireball + two torn-apart burning halves).
  v22: the funnel adds a smooth outer SHEATH cone (48→6 m, 264 m,
  opacity 0.22, DoubleSide) + a CROWN puff cluster (3 dark slate
  puffs) at the top; the DECK is ~45 lobes in clusters of 3
  (centre rx 120–160 m + two satellites ±60–120 m, ~400 m wide,
  y ~262 m, base ~192 m); rain is 30 m streaks, slant ×2.2, 300
  per course system, 0.38, + sea SPLASH rings (4 cells × 8 rings,
  5→40 m over 2.5 s); lightning is THREE parallel jagged lines
  (main + 2 echoes ±2.5 m) + a radial-gradient glow sprite +
  flash light 1500.
- **Clouds:** 4 banks × 3 multi-puff cumulus (white lobes, FULLY
  OPAQUE, base 14–18 × 30–45 m / lower 5–6 × 25–40 m / top 10–13 ×
  20–30 m) + the dark cumulonimbus wall.
- **Effects:** fireball shells (faceted icosahedron/dodecahedron,
  `#FFF3B0 / #FF9F1C / #E63946`, shell 42 m / 3.5 s), smoke puffs
  (slate radial-gradient texture, capped), chunky debris (slate/red
  boxes, 0.4–1.0 m × 24), confetti + fireworks (end screen). The
  shockwave ring is DELETED in v19.
- **Airfield:** runway slab + markings (canvas texture), "09"/"27" number
  planes (512×256 canvas, anisotropy 8), edge-light fixtures, windsock
  (pole + red-white striped cone, animated), hangar, fuel shed + drums,
  fuel truck, taxiway slabs, fence + truck + terminal hut,
  turnaround pads (asphalt disc r 20 m + white ring, both ends),
  PAPI (4 boxes by the west threshold). v22: PAPI lenses 1.6×0.7×
  1.6 m on 1.0 m posts, approach domes 0.5 m + a crossbar row 300 m
  out, a 12 m control tower (concrete shaft + glass cab + red roof)
  by the hangar, a parked static Caravan on the apron, 60 airfield
  trees (band 80–200 m).
- **Audio:** all synthesised with WebAudio oscillators/noise — no audio
  files.

## Test / verification files (repo root)

| File | Purpose |
|---|---|
| `sim-3tier.mjs` | 3-tier headless sim (Reference / Weak / Idle + v21b "manual" human-landing route), pure Node |
| `sim-win-autoland.mjs` | 15 auto-win profiles (v22, deterministic — 10 WIN profiles from various speeds/heights/angles + 4 negative profiles: 11 rings no win, 300 m short crash, sea ditch crash, 0 rings crash; v24: +1 profile — the ring-12 dive after ring 12, VS -14.5 from 145 m full throttle, WIN at t=3.6 s touchdown dx -239/lat 2), pure Node |
| `test/headless.test.mjs` | Headless tests: heading, ring, collision gate, pitch-hold, no-input ring 1, pitch-tap symmetry, ring 1→2 spacing, 400 m no-fire gate, tap-rate-limited ring-2 pilot (test 15), toast-worthy ring-1 bonus (test 16), tap-rate-limited ring-5 pilot (test 17), early-leg turn angles (test 18), human flight to the strip wins as autoland (test 19), full-throttle arrival wins + steep −11 wins (test 20, v22 auto-win), tornadoAt kill cylinder (test 21), low start + ridges (test 22), rings under the deck (test 23), 16 m early rings + linear climb (tests 24–25), tornadoCells + spout3 detour target (test 27), throttle-on/steep/dive wins + off-centreline/sea crashes + lat +20 wins (tests 28–30), win guards — dive wins, 0 rings crashes, VS −32 wins, 11 rings no win, 300 m short crashes (test 31), ORANYE detour flown (test 32), ALT·MSL + WIN cue + cockpit dedup (test 33), manual until the win / autopilot only after it (test 34, v22) (Node, 39 tests — v24: tests 35 valley profile 32.0/63.8/90.3, 36 ring-12 dive WIN, 37 lat +35 WIN, 38 stabiliser hold, 39 pull-up assist values, 40 lightning tubes source-level) |
| `probe-v22-live.mjs` | Live keyboard probe v22 (port 8914): title hero orbit (D), ring 2 held keys (A8), ring 5 taps (A9), cockpit dedup (C), tornado-kill in NORMAL play (A12), lightning visible (A13 — live bolt poll + staged cover bolt), human flight to the strip + auto-win (B2) |
| `probe-v21-live.mjs` | Live keyboard probe v21 (spawn + gear hidden + hero camera, hands-off, chase camera, no-input ring 1 + toast, R/C, ring 2 with held keys, ring 5 with TAPS, chase 3/4 angle, blast + message-clear, straight blast, crash, shadows, teleport landing, manual landing from ring 12 (B2), tornado kill (A11)) |
| `probe-v20-live.mjs` | Live keyboard probe v20 (hands-off, chase camera, no-input ring 1 + toast, R/C, ring 2 with held keys, ring 2 with TAPS, blast + message-clear, crash, shadows, landing; gear hidden on title) |
| `probe-v19-live.mjs` | Live keyboard probe v19 (kept for reference) |
| `probe-v18-live.mjs` | Live keyboard probe v18 (kept for reference) |
| `probe-v18-a5.mjs` | Focused chase-camera re-check (turns + steep climb, incl. camera-to-plane distance; v18c: 120/120 good, maxDist 12 m) |
| `shots.mjs` + `shots.json` | 5 staged screenshots (seed 1; v23: `5-blast.jpg` tornado-kill ORANYE + blast assertion — event `tornado-kill` name ORANYE + `hud-msg` contains `DESTROYED BY THE TORNADO`) |
| `verification.md` | Written checklist — checked only with proof |
| `design/plan.md`, `design/style.md`, `design/assets.md` | This design set |

## Screenshots (`screenshots/`)

`1-cover.jpg` (v24: the blast — tornado-kill ORANYE, fireball + gold message + a thick white lightning column, 128.720 byte, sha256 158d9955…; v23's 5-blast.jpg was swapped in as the cover at the user's 27 Nov 20:02 decision and 5-blast.jpg deleted),
`2-cockpit.jpg` (v24: 123.249 byte — thick zigzag bolt left of ring 3),
`3-start.jpg` (title, v24: 99.578 byte — layout final, untouched),
`4-landing.jpg` (low flare at 47 s — 250 m out, +25 m, "09" + piano
keys filling the frame, v24: 112.384 byte) —
seed 1, regenerated whenever the game changes.
Live-probe frames in `live-shots/` (`v20-live-blast.jpg`,
`v20-live-blast-15.jpg`, `v20-live-crash.jpg`, `v20-live-crash-15.jpg`,
`v20-live-ring2.jpg`, `v20-live-ring2-tap.jpg`, `v20-live-finish-a/b.jpg`,
`v20-live-cam-turn.jpg`, `v20-live-cam-climb.jpg`,
`v20-live-noinput-ring1.jpg`, `v20-live-handsoff.jpg`,
`v22-live-tornado-kill.jpg`, `v22-live-tornado-kill-1s.jpg`).

## Verification evidence (where the proof lives)

- **In the repo:** `verification.md` (the checklist), `sim-3tier.mjs`,
  `test/headless.test.mjs`, `probe-v18.mjs`, `probe-v20-live.mjs`,
  `screenshots/*.jpg`, `live-shots/`.
- **Outside the repo (ephemeral):** probe logs in `/tmp`
  (`probe-v20*.log`, `probe-v19*.log`, `probe-v18-live*.log`, `shots-v20.log`,
  `bundle-v20.log`) — these are the run records cited in
  `verification.md`; they do not survive a VM restart, so the numbers
  that matter are copied into `verification.md`.
- **Scratch, never committed:** `diag-v17.mjs` (a one-off diagnostic
  for the first probe failure) — deleted before commit.
  `diag-landing-v20.mjs` (the headless trace that proved the first v20
  landing freeze could never trigger — the strict terrain guard pinned
  the plane at +45 m) — deleted before commit.
  `probe-v21-seeds.mjs` + `probe-v21-landdiag.mjs` (v21 scratch probes
  in /tmp: the seed 1–12 full-run sim + the landing diagnostic that
  proved the old probe regulator could never land — it held altitude
  at the runway-height+6 target and orbited at 11–34 m AGL; the probe
  now uses the sim-3tier landing regulator) — deleted before commit.
  `probe-v21-live.mjs` (the live probe, phases D-hero/A3/A5/A6/A7/A8/
  A9-ring5-taps/A10-chase-3/4/A/A2/A4-crash/C/B/B2-manual-landing) —
  COMMITTED, it is the v21 verification record, like
  probe-v20-live.mjs before it.
