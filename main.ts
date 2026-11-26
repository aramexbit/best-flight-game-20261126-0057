// Langit Nusantara — Ring Run, a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). v18: the Gemini v17 blind-test fixes + the five
// v17 live-playtest P0s. The Caravan is faceted + tapered now (nose
// 1.0→0.42, wings tapered chord 1.6→1.15 with 3° dihedral, red tapered
// wingtips, wing struts, tapered stabiliser, dark wheels, flatShading),
// the cockpit has slimmer pillars (0.05 m), trim #273244, a dark
// glareshield and dial faces on a light face with the sub-label in a
// separate navy badge (numbers never overlap), the terrain is 2.5–3x
// denser mid-course (hero groves, ring 3–5 groves, 320 bushes) with slate
// cliffs and a deeper sea, runway 09 is dark asphalt #2B303A with sharp
// canvas-texture "09"/"27" numbers and a fuel truck on the apron, the
// explosion is a 3-layer faceted fireball (#FFF3B0/#FF9F1C/#E63946) with
// slate smoke and chunky debris, and the storm has a second anvil tier
// with a darker wider tornado. Flight: pitch auto-levels on the raw
// stick (hands-off pitch holds 0.000 rad; a locked trim decays in 5 s),
// softer tap rates, and the chase camera uses a yaw-only horizontal
// forward — the v16/v17 live bug that dropped the camera below the plane
// at steep pitch, staring at its nose, is gone. Ring 1 was NOT moved:
// the spawn line already crosses it ~10 m from centre; the v17 misses
// were trim lock-in + gust pitch random-walk, now fixed (no-input flight
// passes ring 1 at 7.4 s). The collision message clears in ~2.5 s of
// real time (was 15–40 s live), R restarts from play/paused/over, C
// switches camera while paused, and crashed rivals keep a latched race
// position instead of jumping 5/5 → 2/5 → 5/5. v18c: the chase camera
// also got a feedforward (it translates with the plane's own
// displacement each draw) and the live draw runs on the real frame dt
// — the A5 numbers had passed on behind+above while the camera still
// sat 25–150 m behind the plane at low FPS, so the plane read as a
// tiny speck in live play; the re-check holds maxDist 12 m (chase
// geometry 12.3 m) through turns and a steep climb. Title: structured navy-
// bordered instruction card, text still dark navy #132238, hero title
// with a navy outline, key-cap sub-labels on navy pills, rival badges
// as compact navy pills. v16: STORM BATTLE in broad daylight — no weapons,
// no night. A tornado (260 m lateral of the course, beside rings 5-8, never
// covering a ring or the runway) plus a second waterspout, a dark storm-cell
// wall, slanting rain, cloud-to-sea lightning, flak in the outer corridor
// and gusts that rock the plane and bend the palms. Explosions chain (2-3
// fireballs 0.15-0.35 s apart), a damaged rival smokes black, dives into
// the sea and leaves a burning oil slick, and an ace rival cuts across the
// player's path with a slipstream. The collision is player-relative now
// (re-anchored from 55 s, every 10 s, 220 m ahead of the player), so a
// keyboard player flying straight still sees the blast. A gold ring-pointer
// pill shows the next ring's bearing and distance, spawn heading is
// terrain-checked (no hill crash 4 s after start), and Space restarts
// without a canvas click. v14: the race STAYS IN VIEW. The four rivals all
// start AHEAD of the player (50/35/25/15 m) and faster (speedBias 1.10-1.15,
// the low end of Gemini's 1.15-1.30x fix-prompt range), so the player
// chases the pack from behind and sees them the whole run; the mid-air
// collision is no longer a fixed 40.8 s clock at fixed ring 11 —
// KUNING and HIJAU converge on a point tied to the player's live progress
// (player's ring + 3), HOLD there orbiting, and collide only once the player
// closes to 250 m (backstop 60 s / 800 m), so the blast goes off IN FRONT of
// the player, in view. The blast is a classic explosion now: a big orange
// fireball to 26 m, twenty dark smoke puffs, 28 debris shards, a small faint
// shockwave — and both airframes are TORN IN TWO, front and rear halves
// tumbling away burning and smoking for 8 s. A HUD flash ("MID-AIR
// COLLISION!"), a boom and a camera shake announce it. The rings are
// clearance-checked: every ring sits at least 20 m above the terrain (the
// user's playtest found ring 3 buried in a hillside; Gemini's fix prompt
// asks for 18-25 m). The cover freezes 1.5 s after the blast (35.5 s),
// so the split halves and fresh smoke fill the frame ahead of the player.
// all 12 rings shows "RACE COMPLETE!" with fireworks over the runway,
// confetti, a fanfare and a results panel (position, score, time). The
// cockpit closes tighter (bigger dial numerals at 100 px with anisotropy 8,
// darker narrower headliner, second rear arch, glassier glazing, corner
// gussets) and the dive flies straight for its first 1.5 s, so no rival
// ever overlaps the cockpit frame. The cloud skirts are DELETED — the flat
// grey discs Gemini saw in all four v13 shots are gone, replaced by
// rounded lower lobes in cool blue-grey #d7e2ee; the banks merge tighter. The runway blend is wider still (60 m flat shoulders,
// 250 m fades) so the strip sits flush in the grass. v13's race stays:
// five planes, dive crash, ring-clip spin, near-miss flyby with whoosh and
// shake, POS x/5 HUD, the v12 Caravan and the 3/4 rear chase cameras.
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
// v14 probe: probe-v14.mjs checks ring clearance against the real mesh,
// the full-run race (collision timing, split halves, rival visibility)
// and a live-play keyboard run, and verifies the W/S pitch direction.
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
// screenshots/ and dossier.json). The v16 screenshots are the four staged scenes (cover, cockpit, title, landing),
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
