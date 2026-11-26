# Langit Nusantara — Ring Run: Asset List (v17)

Everything is procedural / generated in code — there are no downloaded
image, audio, or model files. This list is what the game builds at runtime
so a future version can check nothing is missing or renamed.

## Code modules (`game/src/`)

| File | What it builds / does |
|---|---|
| `config.js` | All tuning numbers + PALETTE (single source of truth) |
| `random.js` | Seeded RNG (`createRandom`) + value noise (`createNoise`) |
| `terrain.js` | 9 islands, ground mesh, beach tiers, palms/trees/rocks, runway plateau, clouds, sailboats, lighthouse, beach houses, airfield props |
| `rings.js` | 12 rings (torus + glow), runway + spawn planning, `checkPass` |
| `flight.js` | Pure flight model (thrust/drag/stall/bank/landing) — no Three.js |
| `shots.js` | `autopilotTo` (steering) + staged screenshot scenes |
| `rivals.js` | 4 rival planes, race, collision pair, showcase flybys, dive/clip crashes |
| `effects.js` | Fireball, smoke, debris, shockwave, splash, oil slick, flak, confetti, fireworks |
| `storm.js` | Tornado/waterspout, storm wall, rain, lightning, gusts (`gustAt`) |
| `plane.js` | Caravan mesh (fuselage, wings, prop, cockpit + 5 dials) |
| `render.js` | Renderer, chase/cockpit cameras, shadows, sky dome, sun |
| `hud.js` | HUD panels, ring pointer, messages, race position |
| `input.js` | Keyboard input |
| `audio.js` | WebAudio: engine hum, chime, boom, fanfare (synthesised, no files) |
| `main.js` | Game loop, title, end screens, gust application, final assist |
| `collision.js` | Pure collision-gate logic (extracted from rivals.js, v17) — Node-testable |

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
- **Planes:** box/cylinder-built Caravan (player) + 4 rivals (same mesh,
  different livery colours + number badges `#2`–`#5` as sprites).
- **Cockpit:** 3 grey panels + 5 dial faces (canvas textures: numbers,
  needles, labels) + slimmer pillars + canopy bow.
- **Storm:** tornado (stacked cone segments), storm-wall lobes (dark
  spheres), rain (line segments), lightning (line bolt).
- **Clouds:** 4 banks × 3 multi-puff cumulus (white lobes) + the dark
  cumulonimbus wall.
- **Effects:** fireball shells (orange/yellow/white spheres), smoke puffs
  (soft radial-gradient texture), debris (elongated boxes), shockwave
  (expanding ring), confetti + fireworks (end screen).
- **Airfield:** runway slab + markings (canvas texture), edge-light
  fixtures, windsock (pole + cone), hangar, fuel shed + drums, taxiway
  slabs, fence + truck + terminal hut.
- **Audio:** all synthesised with WebAudio oscillators/noise — no audio
  files.

## Test / verification files (repo root)

| File | Purpose |
|---|---|
| `sim-3tier.mjs` | 3-tier headless sim (Reference / Weak / Idle), pure Node |
| `test/headless.test.mjs` | Headless tests: heading, ring, collision gate (Node) |
| `probe-v17.mjs` | Browser sim probe (seeds 1–12, cover race, arrow, storm) |
| `probe-v17-live.mjs` | Live keyboard probe (hands-off, blast, crash, shadows, landing) |
| `shots.mjs` + `shots.json` | 4 staged screenshots (seed 1) |
| `verification.md` | Written checklist — checked only with proof |
| `design/plan.md`, `design/style.md`, `design/assets.md` | This design set |

## Screenshots (`screenshots/`)

`1-cover.jpg` (blast + ring 10), `2-cockpit.jpg`, `3-start.jpg` (title),
`4-landing.jpg` — seed 1, regenerated whenever the game changes.
Live-probe frames in `live-shots/` (`v17-live-blast.jpg`,
`v17-live-finish-a/b.jpg`).

## Verification evidence (where the proof lives)

- **In the repo:** `verification.md` (the checklist), `sim-3tier.mjs`,
  `test/headless.test.mjs`, `probe-v17.mjs`, `probe-v17-live.mjs`,
  `screenshots/*.jpg`, `live-shots/`.
- **Outside the repo (ephemeral):** probe logs in `/tmp`
  (`probe-v17*.log`, `probe-v17-live*.log`, `shots-v17.log`,
  `bundle-v17b.log`) — these are the run records cited in
  `verification.md`; they do not survive a VM restart, so the numbers
  that matter are copied into `verification.md`.
- **Scratch, never committed:** `diag-v17.mjs` (a one-off diagnostic
  for the first probe failure) — deleted before commit.
