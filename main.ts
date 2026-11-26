// Langit Nusantara — Ring Run, a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). v13: the RACE — five planes on the same 12-ring
// course, the player Caravan plus four AI rivals (blue, yellow, green,
// orange liveries) that weave, bank and rubber-band around the player, with
// scripted drama: a dive crash at 10 s, a ring-clip spin into the sea at
// ~40 s, a mid-air collision at 40.8 s (fireball, shockwave, debris, falling
// smoke), a near-miss flyby at 39-42 s with a whoosh and camera shake, and a
// final-approach sea crash at ~130 s — every crash a real explosion with a
// burning wreck and a smoke column, and the race HUD shows POS x/5. The
// v12 Caravan stays (boxy cabin, high wing, tapered tail) but reads as a
// plane from behind now: shorter wider fin, stronger dihedral with thicker
// roots and bigger red tips, a bigger blur disc and red spinner, a longer
// tail taper, a wider stabiliser and visible gear — and the cover/landing
// chase cameras ride 5-6 m to the side, a 3/4 rear angle. The runway sits
// on a flattened pad blended into the grass, the cockpit is a fuller
// enclosed cabin (thin glareshield brow, bigger brighter dials, taller side
// walls, longer headliner), the cloud banks merge into wide flat masses,
// and the airfield grows a fence, a pickup truck and a terminal hut.
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
// screenshots/ and dossier.json). The v13 screenshots are the four staged scenes (cover, cockpit, title, landing),
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
