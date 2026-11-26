# Langit Nusantara — Ring Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/aramexbit/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/aramexbit/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A bright daytime flight game: fly a propeller tourer through 12 glowing rings over a tropical archipelago, then land on the runway of the big eastern island. Three.js, fully offline — no network requests, no assets to download. Version 6 adds a richer tropical world — patchwork terrain, denser jungle and beach foliage, a framed cockpit with labelled dials and a yoke, a bigger ground shadow, and a cohesive airfield cluster.

## How to play

- **W/S** pitch, **A/D** roll, **Q/E** rudder, **Shift/Ctrl** throttle.
- **C** switches chase / cockpit view, **M** mutes, **P** pauses, **R** restarts.
- Centre a ring for a bonus and a streak. Watch the fuel gauge — an empty tank means gliding. Fly too slow and the wing stalls: nose down, throttle up.
- Land slow, level and on the strip for the landing bonus and a time bonus.

## Features

- Arcade flight model with thrust, drag, climb cost, stall and banked turns.
- Seeded procedural archipelago: 9 islands, ridged heightmap terrain with a dry-grass patchwork and a graded dirt apron around the runway, turquoise shallows with reef lines and a speckled water surface, drifting volumetric clouds, midday sun and haze. Clustered 3D trees, palms, boulders and shrubs — every trunk snapped to the rendered ground — plus dense jungle canopies, clustered coastal cliffs and a soft sand-to-grass shoreline. `?seed=N` rebuilds the same world.
- 12-ring course planned from the runway backwards, with a pulsing next-ring indicator.
- Full HUD: altitude (ft), speed (kts), heading compass strip, attitude ball, fuel and throttle bars, timer, score, ring counter.
- Procedural Web Audio: engine drone, wind, ring chimes, landing chord — no audio files.
- Chase and cockpit cameras — the cockpit is a real 3D console with labelled dials (ticks, numbers, redline), a canopy frame, side walls and a control yoke, under a sloped glareshield — title / pause / game-over screens, best score in localStorage. A big soft blob shadow follows the plane over land and sea.
- The runway island is a working airfield: full markings, tyre marks and a speckled asphalt surface, flush light fixtures, a dirt taxiway, an apron, a hangar, a fuel shed with drums and a windsock, ringed by dense trees.
- Deterministic screenshot scenes: `?shot=start|play|cockpit|landing&seed=N`.

## Run it

Serve locally with `node serve.ts`, then open http://localhost:8080.

Screenshots are produced deterministically from the game itself with `node shots.mjs` — it serves the game, flies the course with a scripted autopilot, and writes four JPEGs to `screenshots/`.

## Competition

Built for [best flight game — make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) ($500, closes 28 Nov 2026 07:57 WIB).
