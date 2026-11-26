# Langit Nusantara — Ring Run: Asset List (v19)

Everything is procedural / generated in code — there are no downloaded
image, audio, or model files. This list is what the game builds at runtime
so a future version can check nothing is missing or renamed.

## Code modules (`game/src/`)

| File | What it builds / does |
|---|---|
| `config.js` | All tuning numbers + PALETTE (single source of truth) (v19: fog #9CC8E8, pitchRate 0.9 / pitchLevel 0.30, COURSE legMin 120 / legMax 480 — ringSpacing + spacingJitter deleted) |
| `random.js` | Seeded RNG (`createRandom`) + value noise (`createNoise`) |
| `terrain.js` | 9 islands, ground mesh, beach tiers, palms/trees/rocks, runway plateau, clouds, sailboats, lighthouse, beach houses, airfield props (v18: slate cliffs, 2.5–3× denser mid-course foliage, runway 09 canvas-texture numbers, fuel truck; v19: SEG 192, mottle 0.012, turnaround pads + PAPI + striped windsock, clouds fully opaque + smaller lobes, plant scale 0.8–1.35× + random yaw) |
| `rings.js` | 12 rings (torus + glow), runway + spawn planning, `checkPass` (v19: stepLen = clamp(dist/legsLeft, legMin, legMax), wander 0.22 rad, glow only on the NEXT ring) |
| `flight.js` | Pure flight model (thrust/drag/stall/bank/landing) — no Three.js (v18: pitch auto-level on raw `stickPitch`, softer rates) |
| `shots.js` | `autopilotTo` (steering) + staged screenshot scenes (v19: PLAY_SECONDS 49.5 — pre-collision convergence, not the blast) |
| `rivals.js` | 4 rival planes, race, collision pair, showcase flybys, dive/clip crashes (v18: navy-pill number markers, crash-position latch, dimmer slipstream; v19: marker pill y 3.2 m, flattened emitSmoke, slipstream/flyby/showcase trails bigger + softer) |
| `effects.js` | Fireball, smoke, debris, shockwave, splash, oil slick, flak, confetti, fireworks (v18: 3-layer faceted explosion, slate smoke, chunky debris; v19: shockwave DELETED, fireball shell 42 m / 3.5 s, blast smoke capped, debris 0.4–1.0 m × 24) |
| `storm.js` | Tornado/waterspout, storm wall, rain, lightning, gusts (`gustAt`) (v18: darker/wider funnel, second anvil tier, rain `#E0F2FE` 0.45; v19: 12-segment vortex, taper 4→46 m, dark slate #3B4652/#586675, 18 debris flecks, faceted anvil, rain `#E6F4FF` 0.35) |
| `plane.js` | Caravan mesh (fuselage, wings, prop, cockpit + 5 dials) (v18: `taperedPrism` faceted + tapered airframe, slim pillars, light dial faces + navy label badges; v19: dials redrawn — 84 px numbers at radius 120, shorter ticks, badge 150×52, needle #E53935, labels IAS/VSI, VSI 6th gauge, trim #242B35, glareshield accent #C93B2B) |
| `render.js` | Renderer, chase/cockpit cameras, shadows, sky dome, sun (v18: chase offset + look target on yaw-only horizontal forward; v18b: chase lerp rate 8 + height floor plane.y + 2.5 m; v18c: chase feedforward — chasePos translates by the plane's displacement each draw — + lerp on real frame dt; v19: sun-offset shadow cap 50 m + contact shadows under all 5 planes, setGauges passes verticalSpeed) |
| `hud.js` | HUD panels, ring pointer, messages, race position (v18: message timer on real frame time; v19: message textContent cleared when the timer expires + `#hud-agl` AGL/glide pill) |
| `input.js` | Keyboard input |
| `audio.js` | WebAudio: engine hum, chime, boom, fanfare (synthesised, no files) |
| `main.js` | Game loop, title, end screens, gust application, final assist (v18: passes `stickPitch`, R restarts from play/paused/over, C switches camera while paused, staging camera 28, −34, 6.5; v18c: live `draw()` gets the real frame dt instead of fixed 1/60; v19: `hudView()` gains aglFt/distRwy/glide, crash camera pulls wide + transient `crashing` state 1.5 s) |
| `collision.js` | Pure collision-gate logic (extracted from rivals.js, v17) — Node-testable (v19: blastDist 80–300 m, facing >0.88 / >0.75) |

## Vendored libraries (`game/`)

| File | Notes |
|---|---|
| `three.module.js` (r160) | Three.js, vendored — never re-downloaded |
| `index.html` | Page + all CSS (HUD, title, key-caps, pills) |
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
- **Storm:** tornado (12-segment vortex, taper 4→46 m, dark slate
  #3B4652/#586675, 18 rotating debris flecks), second anvil tier
  (5 lobes), storm-wall lobes (dark spheres), rain (line segments,
  #E6F4FF 0.35), lightning (line bolt).
- **Clouds:** 4 banks × 3 multi-puff cumulus (white lobes, FULLY
  OPAQUE, base 40–60 m / lower 30–50 m / top 25–40 m) + the dark
  cumulonimbus wall.
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
| `sim-3tier.mjs` | 3-tier headless sim (Reference / Weak / Idle), pure Node |
| `test/headless.test.mjs` | Headless tests: heading, ring, collision gate, pitch-hold, no-input ring 1, pitch-tap symmetry, ring 1→2 spacing, 400 m no-fire gate (Node, 14 tests) |
| `probe-v18.mjs` | Browser sim probe (seeds 1–12, cover race, arrow, storm) |
| `probe-v19-live.mjs` | Live keyboard probe (hands-off, chase camera, no-input ring 1, R/C, ring 2 with held keys, blast + message-clear, crash, shadows, landing) |
| `probe-v18-live.mjs` | Live keyboard probe v18 (kept for reference) |
| `probe-v18-a5.mjs` | Focused chase-camera re-check (turns + steep climb, incl. camera-to-plane distance; v18c: 120/120 good, maxDist 12 m) |
| `shots.mjs` + `shots.json` | 4 staged screenshots (seed 1) |
| `verification.md` | Written checklist — checked only with proof |
| `design/plan.md`, `design/style.md`, `design/assets.md` | This design set |

## Screenshots (`screenshots/`)

`1-cover.jpg` (pre-collision convergence at 49.5 s — player on the
final leg, rivals closing on the meet point, storm visible),
`2-cockpit.jpg`, `3-start.jpg` (title),
`4-landing.jpg` — seed 1, regenerated whenever the game changes.
Live-probe frames in `live-shots/` (`v19-live-blast.jpg`,
`v19-live-blast-15.jpg`, `v19-live-crash.jpg`, `v19-live-crash-15.jpg`,
`v19-live-ring2.jpg`, `v19-live-finish-a/b.jpg`, `v19-live-cam-turn.jpg`,
`v19-live-cam-climb.jpg`, `v19-live-noinput-ring1.jpg`,
`v19-live-handsoff.jpg`).

## Verification evidence (where the proof lives)

- **In the repo:** `verification.md` (the checklist), `sim-3tier.mjs`,
  `test/headless.test.mjs`, `probe-v18.mjs`, `probe-v19-live.mjs`,
  `screenshots/*.jpg`, `live-shots/`.
- **Outside the repo (ephemeral):** probe logs in `/tmp`
  (`probe-v19*.log`, `probe-v18-live*.log`, `shots-v19.log`,
  `bundle-v19.log`) — these are the run records cited in
  `verification.md`; they do not survive a VM restart, so the numbers
  that matter are copied into `verification.md`.
- **Scratch, never committed:** `diag-v17.mjs` (a one-off diagnostic
  for the first probe failure) — deleted before commit.
