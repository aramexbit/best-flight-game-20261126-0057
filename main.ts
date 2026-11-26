// Langit Nusantara — Ring Run, a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). v12: the Caravan rebuild and the molded cabin —
// the airframe is now a Cessna 208-style bush plane (boxy cabin with four
// windows a side, high wing with dihedral and red struts, tall fin with a
// red cap, compact tapered tail, no rocket cone) and the cockpit is one
// single molded cabin shell (curved side walls with real window cutouts,
// a three-piece headliner, a shaped glareshield, a yoke with a throttle
// quadrant); the sky carries layered cloud banks, the runway has symmetric
// mesh-snapped shoulders with white edge lines on both sides, and the
// title-screen key-cap badges are yellow with navy text, as the user chose.
// The v11 vibrant premium grade stays: bright blue sky #168BFA, tropical
// turquoise sea #00C5D9, vivid green grass #42B83C, warm cream sand
// #E8D39A, deep navy UI panels #063C85 with cyan glow outlines, glossy
// yellow/orange buttons; the title screen follows the polished reference
// mockup (top bar with Fuel pill, star counter and gear; navy info card
// with island thumbnail, icon rules and key-cap badges; objective pills;
// big yellow Start button) with the game title LANGIT NUSANTARA and no
// RESCUE FLIGHT branding; the rings are thick gold with sparkle particles;
// the sea has real depth (turquoise shallows to deep azure) and wave arcs;
// sailboats, a lighthouse and beach houses fill the bay.
// The game is
// this directory's game/ folder: plain static browser loads offline
// (game/index.html and its ES modules, plus the vendored Three.js build
// under game/vendor/, no network request at all).
// This program hands it in: it copies game/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json, the summary the judge reads,
// with the vendored make.fun library. Put 3 or 4 PNG or JPEG screenshots in
// screenshots/ (the first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json). The v12 screenshots are the four staged scenes (cover, cockpit, title, landing),
// each a real render of the shipped game at 1280x720, JPEG quality 82, all under 256 KiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
