// Langit Nusantara — Ring Run, a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). v9: the landmark ridges are terrain-hugging
// heightfield patches (peaks with saddles, a sharp crest spine, long valley
// slopes, feet fading to zero at the footprint edge, colours baked toward
// the horizon blue) — the v8 free masses read as flat-roofed floating slabs;
// the clouds are fewer (14) and each one a single tight volume with a thin
// flat base; the cockpit is a full cabin (widened panel with five live dials,
// tall A-pillars, top arch, side walls, wing-root slabs, a lower and closer
// camera); and the title shot follows the key-art composition (narrower
// title card, denser palm beach, fuller palm crowns, fewer beach boulders).
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
// screenshots/ and dossier.json). The v9 screenshots are the four staged scenes (cover, cockpit, title, landing),
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
