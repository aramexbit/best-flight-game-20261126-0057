# Langit Nusantara — Ring Run: Asset List (v20)

Everything is procedural / generated in code — there are no downloaded
image, audio, or model files. This list is what the game builds at runtime
so a future version can check nothing is missing or renamed.

## Code modules (`game/src/`)

| File | What it builds / does |
|---|---|
| `config.js` | All tuning numbers + PALETTE (single source of truth) (v19: fog #9CC8E8, pitchRate 0.9 / pitchLevel 0.30, COURSE legMin 120 / legMax 480 — ringSpacing + spacingJitter deleted) |
| `random.js` | Seeded RNG (`createRandom`) + value noise (`createNoise`) |
| `terrain.js` | 9 islands, ground mesh, beach tiers, palms/trees/rocks, runway plateau, clouds, sailboats, lighthouse, beach houses, airfield props (v18: slate cliffs, 2.5–3× denser mid-course foliage, runway 09 canvas-texture numbers, fuel truck; v19: SEG 192, mottle 0.012, turnaround pads + PAPI + striped windsock, clouds fully opaque + smaller lobes, plant scale 0.8–1.35× + random yaw; v20: tree/palm burial −0.15 m, ground discs tilted to the terrain normal at +0.08, ridge detail softened 0.2→0.12 / detail2 ±8%, landmark spine 0.22→0.10, cloud lobes more/smaller/tighter — base 14–18 × 30–45 m, top 10–13 × 20–30 m) |
| `rings.js` | 12 rings (torus + glow), runway + spawn planning, `checkPass` (v19: stepLen = clamp(dist/legsLeft, legMin, legMax), wander 0.22 rad, glow only on the NEXT ring; v20: rings 1–3 wander 0.12 rad + altitude jitter ±12 m, next-ring glow pulses 0.28+0.06·sin(time·3.2); v21: rings 1–5 forgiving (wander 0.12, jitter ±12 m), glow damped 2.0x/0.20, leg-clearance margin 45→25 m, walk starts y 55 (low start), spawn = ring 1's altitude (level first leg); v21c: STEEP RIDGES flank the final ring positions 450 m perpendicular (pair A ring 3 r260 h300, pair B ring 9 r280 h320) — course-aware, idempotent, appended at the end of createCourse) |
| `flight.js` | Pure flight model (thrust/drag/stall/bank/landing) — no Three.js (v18: pitch auto-level on raw `stickPitch`, softer rates; v21b: finish-zone softEnough speed < 62, VS < 12, pitch < 0.45 — the landing-to-win fix) |
| `shots.js` | `autopilotTo` (steering) + staged screenshot scenes (v19: PLAY_SECONDS 49.5 — pre-collision convergence, not the blast; v20: PLAY_SECONDS 43.5 — mid-race ring 10/11, landing freeze 250 m/+30 m with a rebuilt glidepath (far +25 m, near +4 m) and a relaxed terrain guard for point targets; v21: PLAY_SECONDS 31.0 (ring 8 over the shoreline) then 20.0 (v21c — ring 4 over the turquoise sea, flanked by ridge pair A + spout3); autopilotTo terrain guard proportional + path-based (carrot + midpoint + 80 m ahead, margin 25 m) for the low course) |
| `rivals.js` | 4 rival planes, race, collision pair, showcase flybys, dive/clip crashes (v18: navy-pill number markers, crash-position latch, dimmer slipstream; v19: marker pill y 3.2 m, flattened emitSmoke, slipstream/flyby/showcase trails bigger + softer; v20: marker pill 4.0×1.7 m at y+2.9 m; v21: `setMarkersVisible` (title hides tags), `tornadoAt` kill — a rival inside a tornado's cylinder explodes (explodeChain + explodeSplit) and is out `RACE.tornadoOutDelay` 12 s, `playerPosition` skips tornado-killed rivals, `debugTeleport` for the live probe) |
| `effects.js` | Fireball, smoke, debris, shockwave, splash, oil slick, flak, confetti, fireworks (v18: 3-layer faceted explosion, slate smoke, chunky debris; v19: shockwave DELETED, fireball shell 42 m / 3.5 s, blast smoke capped, debris 0.4–1.0 m × 24; v21: blast smoke 8 near-black FLATTENED puffs (flat 0.55, #1E293B/#334155), smokePuff `flat` option) |
| `storm.js` | Tornado/waterspout, storm wall, rain, lightning, gusts (`gustAt`) (v18: darker/wider funnel, second anvil tier, rain `#E0F2FE` 0.45; v19: 12-segment vortex, taper 4→46 m, dark slate #3B4652/#586675, 18 debris flecks, faceted anvil, rain `#E6F4FF` 0.35; v20: anvil 4 lobes 100–140 m at y 320–350 #6B7E92/#8296A8, wall 6 lobes 100–150 m anchor 220 m off-course, funnel #46545F opacity 0.9, spray crown 5 puffs + 18 m ring, spout2 750 m/320 m at 0.45 scale, wall/anvil SMOOTH-shaded detail 1; v21: funnel outer opacity 0.45 + darker counter-rotating inner + 3 helix rings, wall 10 lobes anchor 320 m, anvil 6 lobes y 290–315, spout2 1100/450 m scale 0.4; v21c: FIVE tornadoes (main r45, spout2 r25, spout3 near ring 4 r35, spout4 near ring 9 r30, spout5 near ring 10 r25) + `tornadoAt(x,y,z,tornadoes)` pure kill test + `tornadoes` list, 4 rain systems (350/200/250/250 streaks), lightning in a RANDOM cell every 3–7 s, second storm wall at spout4; v21d: STORM DECK (~15 flat dark lobes rx 90–130 m y ~248 m base ~196 m #0F172A/#1E293B/#334155 along the course polyline) + 3 course rain systems (rings 1–4/5–8/9–12, 250 streaks, 0.32) + lightning near the RINGS too (random tornado OR random ring, every 2–5 s, flash 0.2 s) + `storm.flash(x,z)` for a staged bolt at the next ring) |
| `plane.js` | Caravan mesh (fuselage, wings, prop, cockpit + 5 dials) (v18: `taperedPrism` faceted + tapered airframe, slim pillars, light dial faces + navy label badges; v19: dials redrawn — 84 px numbers at radius 120, shorter ticks, badge 150×52, needle #E53935, labels IAS/VSI, VSI 6th gauge, trim #242B35, glareshield accent #C93B2B; v20: dials redrawn at 1024 px with real instrument scales (IAS 0/25/50/75/100, ALT 0/225/450/675/900, VSI −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W no badge), numbers 96 px at radius 380, needle shortened (tip 0.1325 m), prop disc #8a9199 opacity max 0.25 radius 1.7 m, cheatline 0.30 m, red wingtips to 5.8 m) |
| `render.js` | Renderer, chase/cockpit cameras, shadows, sky dome, sun (v18: chase offset + look target on yaw-only horizontal forward; v18b: chase lerp rate 8 + height floor plane.y + 2.5 m; v18c: chase feedforward — chasePos translates by the plane's displacement each draw — + lerp on real frame dt; v19: sun-offset shadow cap 50 m + contact shadows under all 5 planes, setGauges passes verticalSpeed; v20: contact shadows darker/bigger — opacity 0.75, scale 10 m + agl×0.03, AGL < 160 m — cockpit camera 0.35 m back) |
| `hud.js` | HUD panels, ring pointer, messages, race position (v18: message timer on real frame time; v19: message textContent cleared when the timer expires + `#hud-agl` AGL/glide pill; v20: ring toast 4.0 s) |
| `input.js` | Keyboard input |
| `audio.js` | WebAudio: engine hum, chime, boom, fanfare (synthesised, no files) |
| `main.js` | Game loop, title, end screens, gust application, final assist (v18: passes `stickPitch`, R restarts from play/paused/over, C switches camera while paused, staging camera 28, −34, 6.5; v18c: live `draw()` gets the real frame dt instead of fixed 1/60; v19: `hudView()` gains aglFt/distRwy/glide, crash camera pulls wide + transient `crashing` state 1.5 s; v20: ring toast 4.0 s, crash camera `setChase(48, -12, 30, 40)` + terrain-clamped height + `crashing` beat 3.0 s, landing camera 16/−3/3.0 FOV 55) |
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
  PAPI (4 boxes by the west threshold).
- **Audio:** all synthesised with WebAudio oscillators/noise — no audio
  files.

## Test / verification files (repo root)

| File | Purpose |
|---|---|
| `sim-3tier.mjs` | 3-tier headless sim (Reference / Weak / Idle + v21b "manual" human-landing route), pure Node |
| `test/headless.test.mjs` | Headless tests: heading, ring, collision gate, pitch-hold, no-input ring 1, pitch-tap symmetry, ring 1→2 spacing, 400 m no-fire gate, tap-rate-limited ring-2 pilot (test 15), toast-worthy ring-1 bonus (test 16), tap-rate-limited ring-5 pilot (test 17), early-leg turn angles (test 18), human landing at 0.3 throttle (test 19), full-throttle crash + steep −11 landing (test 20), tornadoAt kill cylinder (test 21), low start + ridges (test 22) (Node, 22 tests) |
| `probe-v21-live.mjs` | Live keyboard probe v21 (spawn + gear hidden + hero camera, hands-off, chase camera, no-input ring 1 + toast, R/C, ring 2 with held keys, ring 5 with TAPS, chase 3/4 angle, blast + message-clear, straight blast, crash, shadows, teleport landing, manual landing from ring 12 (B2), tornado kill (A11)) |
| `probe-v20-live.mjs` | Live keyboard probe v20 (hands-off, chase camera, no-input ring 1 + toast, R/C, ring 2 with held keys, ring 2 with TAPS, blast + message-clear, crash, shadows, landing; gear hidden on title) |
| `probe-v19-live.mjs` | Live keyboard probe v19 (kept for reference) |
| `probe-v18-live.mjs` | Live keyboard probe v18 (kept for reference) |
| `probe-v18-a5.mjs` | Focused chase-camera re-check (turns + steep climb, incl. camera-to-plane distance; v18c: 120/120 good, maxDist 12 m) |
| `shots.mjs` + `shots.json` | 4 staged screenshots (seed 1) |
| `verification.md` | Written checklist — checked only with proof |
| `design/plan.md`, `design/style.md`, `design/assets.md` | This design set |

## Screenshots (`screenshots/`)

`1-cover.jpg` (mid-race at 43.5 s — ring 10/11, player on the final
leg over the runway island, rivals closing, storm visible),
`2-cockpit.jpg`, `3-start.jpg` (title),
`4-landing.jpg` (low flare at 47 s — 250 m out, +25 m, "09" + piano
keys filling the frame) — seed 1, regenerated whenever the game changes.
Live-probe frames in `live-shots/` (`v20-live-blast.jpg`,
`v20-live-blast-15.jpg`, `v20-live-crash.jpg`, `v20-live-crash-15.jpg`,
`v20-live-ring2.jpg`, `v20-live-ring2-tap.jpg`, `v20-live-finish-a/b.jpg`,
`v20-live-cam-turn.jpg`, `v20-live-cam-climb.jpg`,
`v20-live-noinput-ring1.jpg`, `v20-live-handsoff.jpg`).

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
