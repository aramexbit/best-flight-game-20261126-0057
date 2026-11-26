# Langit Nusantara — Ring Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/aramexbit/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/aramexbit/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A bright daytime flight game: fly a propeller tourer through 12 glowing rings over a tropical archipelago, then land on the runway of the big eastern island. Three.js, fully offline — no network requests, no assets to download. Version 12 is the Caravan rebuild and the molded cabin: the airframe is now a Cessna 208-style bush plane (boxy cabin with four windows a side, high wing with dihedral and red struts, tall fin with a red cap, compact tapered tail — no rocket cone), the cockpit is one single molded cabin shell (curved side walls with real window cutouts, a three-piece headliner, a shaped glareshield, a yoke with a throttle quadrant), the sky carries layered cloud banks, and the runway has symmetric mesh-snapped shoulders with white edge lines on both sides. The title-screen key-cap badges are yellow with navy text, as the user chose. Version 11's vibrant premium grade stays: bright blue sky #168BFA, tropical turquoise sea #00C5D9 with real depth (bright shallows into deep azure) and wave arcs, vivid green grass #42B83C, warm cream sand #E8D39A, deep navy UI panels #063C85 with cyan glow outlines and glossy yellow/orange buttons. The title screen follows a polished reference mockup — top bar with Fuel pill, star counter and gear; navy info card with an island thumbnail, icon rules and key-cap badges; three objective pills; a big glossy yellow Start button — under the LANGIT NUSANTARA title, with the live 3D archipelago behind it. The rings are thick gold with sparkle particles, and the bay holds sailboats, a lighthouse and beach houses. HUD panels are deep navy at 0.88 opacity, so they stay readable against any sky.

## How to play

- **W/S** pitch, **A/D** roll, **Q/E** rudder, **Shift/Ctrl** throttle.
- **C** switches chase / cockpit view, **M** mutes, **P** pauses, **R** restarts.
- Centre a ring for a bonus and a streak. Watch the fuel gauge — an empty tank means gliding. Fly too slow and the wing stalls: nose down, throttle up.
- Land slow, level and on the strip for the landing bonus and a time bonus.

## Features

- Arcade flight model with thrust, drag, climb cost, stall and banked turns.
- Seeded procedural archipelago: 9 islands, ridged heightmap terrain with a dry-grass patchwork and a graded dirt apron around the runway, turquoise shallows with reef lines and a speckled water surface, drifting stylised cumulus clusters (faceted multi-lobe, flat base, bumpy top), midday sun and haze. Clustered 3D trees, palms, boulders and shrubs — every trunk snapped to the rendered ground and grounded by a soft shadow disc — plus dense jungle canopies, clustered coastal cliffs and a soft sand-to-grass shoreline. A strict clear zone keeps every tree, bush and rock off the runway strip and the approach cone. Two mountain ridges give the horizon its silhouette: one across the strait past the far threshold, one along the southern shore — each a terrain-hugging range with summits, saddles, a sharp crest spine, colour blotches and rocky crest tors, colours fading toward the horizon blue. `?seed=N` rebuilds the same world.
- 12-ring course planned from the runway backwards, with a pulsing next-ring indicator, thick golden rings and sparkle particles orbiting the next gate.
- Full HUD: altitude (ft), speed (kts), heading compass strip, attitude ball, fuel and throttle bars, timer, score, ring counter — deep navy panels with cyan glow outlines.
- Procedural Web Audio: engine drone, wind, ring chimes, landing chord — no audio files.
- Chase and cockpit cameras — the cockpit is a real 3D molded cabin with labelled dials (ticks, numbers, redline), a big steering wheel on a shrouded column with a throttle quadrant, a shaped glareshield, a curved canopy bow with struts and glazing, a three-piece headliner roof meeting the side walls, and side windows as real cutouts in solid door panels — title / pause / game-over screens, best score in localStorage. The airframe is a Cessna 208-style bush plane: boxy cabin with four windows a side and a red cheatline, high wing with dihedral and red struts, tall stepped fin with a red cap, wide stabiliser, compact tapered tail and a fixed tricycle gear, with the prop disc visible from the chase camera. A big soft blob shadow follows the plane over land and sea.
- The runway island is a working airfield: full markings, tyre marks and a speckled asphalt surface, symmetric mesh-snapped sand shoulders with white edge lines on both sides, flush light fixtures, a dirt taxiway on both sides, an apron, a hangar, a fuel shed with drums and a windsock, ringed by dense trees.
- Deterministic screenshot scenes: `?shot=start|play|cockpit|landing&seed=N`.

## Run it

Serve locally with `node serve.ts`, then open http://localhost:8080.

Screenshots are produced deterministically from the game itself with `node shots.mjs` — it serves the game, flies the course with a scripted autopilot, and writes four JPEGs to `screenshots/`.

## Competition

Built for [best flight game — make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) ($500, closes 28 Nov 2026 07:57 WIB).
