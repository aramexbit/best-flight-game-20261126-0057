// Langit Nusantara — Ring Run, a best-flight-game-20261126-0057 entry (Node 22,
// standard library only). v25-cover-fix: the v25-fix cover was too bright —
// the frozen blast frame holds the staged lightning bolt at PEAK brightness
// (boltLife never decays once staging stops calling update()), so the 320 m
// glow sprite at 0.95 + 4000 light read as a white wall covering the scene
// (ChatGPT v25 cover 7,6: lightning too bright). Fix (storm.js flash() +
// main.js blast branch, staging only): flash(x, z, dim) scales the bolt — the
// blast flash runs dimmed at 0.3 (core 0.65, halo 0.105, glow 0.285, light
// 1200), so the cover now shows a thin soft bolt column and the sea, beach,
// ring and player plane stay readable; the play/cockpit flashes stay full
// strength and live play never calls flash(). Framing unchanged (v23 design:
// fireball left, player plane right). Measured: re-staged cover f00d79aa…
// (140.573 byte), read directly — thin soft bolt column, no white wash.
// Headless 39/39, sim-win-autoland 15/15,
// sim-3tier ALL PASS, entrypoint 2x byte-identical. v25-fix: the v25 yoke's bar + hub + red cap never
// showed in the cockpit shot — they sat INSIDE the console shelf box (its
// front face is ~0.10 m ahead of the bar at that height), so the shot read as
// two separate grips; the first fix (bar to local y -0.055, thicker, shorter
// arms) did not work either. Raising the whole yokeGroup was NOT an option:
// the bar needs +0.09 m to clear the shelf, but that would lift the grip tops
// to dash y -0.02, deep into the 5 dials (bottoms -0.17) — the v16 defect.
// Fix (plane.js only): the bar + hub + cap rise INSIDE the group to local y
// +0.02, clearing the shelf's top surface, while the grips stay at their old
// height (tops dash y -0.11, below the dial bottoms) and meet the bar directly
// (arm stubs deleted). The U now reads in the cockpit shot: two black grips +
// dark bottom bar + grey hub + red cap. 5 dials, panel, flight model and win
// condition (12 rings + autoland) untouched. Headless 39/39, sim-win-autoland
// 15/15, sim-3tier ALL PASS, entrypoint 2x byte-identical. v25: the two user-reported v24 defects, on top of
// v24 (already submitted) — the runway edges made consistent (the tan shoulder
// tops z-fought the dark underlay: both at runway.height + 0.2, so one side read
// tan and the other dark, and the outer white line straddled the same plane and
// read broken — shoulders are now taller/raised, tops 0.3 m clear, the outer
// lines moved out and up 0.21 m clear, edge lights raised to ride the shoulder;
// the v24 valley never touched the strip and the terrain was measured symmetric)
// + the cockpit yoke rebuilt as a Cessna 208 ram's horn (open-top U: flat dark
// bottom bar, two black grips, grey box hub + red cap, thick grey column; the
// full-circle torus is gone for good; the U + hub deflect with roll/pitch in
// setGauges while the column stays fixed). 5 dials, panel, flight model and win
// condition (12 rings + autoland) untouched. Headless 39/39, sim-win-autoland
// 15/15, sim-3tier ALL PASS, entrypoint 2x byte-identical. v24: the three v22 live-playtest fixes, on top of
// v23 (already submitted) — an approach valley carved in the western ridge
// (floor 32 m to x=970, 63.8 m at x=1000, strip untouched at 90.3) + the win
// corridor widened lat 24 → 40 m + a pull-up assist on final (dive/10 m =
// 1.00, high/40 m = 0, climb = 0, gentle/20 m = 0.17), so the steep ring-12
// dive (VS -14.5 from 145 m) that crashed at x=945 now reaches the corridor
// alive and wins — sim WIN at t=3.6 s, touchdown dx -239/lat 2, and live B2
// landed at 19.9 s, touchdown dx +73/lat -1.4; lightning as thick core+halo
// tubes (glow 320 m, flash light 4000, 0.35 s) with a real bolt flashed at
// the next ring in the blast cover too — live A13 poll 22 strikes/20 s,
// cover + cockpit both show a thick readable bolt; and a stabilised ring
// pointer (hysteresis ±15° + 0.5 s hold, so the arrow never flips ▲→▼ in
// a second for one ring — live probe: rotate(-23deg) vs ringDir -22.7°,
// ring up-left at screen (612, 294)). Headless 39/39, sim-win-autoland
// 15/15, sim-3tier ALL PASS (Reference/Manual 12/12 landed).
// v23: a new screenshot — the ORANYE tornado-kill
// frozen 0.5 s after the kill (fireball at full bloom + the gold
// "DESTROYED BY THE TORNADO!" message, the player's plane intact) — staged
// from the same deterministic run as the cover (seed 1). At submit time it
// SWAPPED IN as the cover (1-cover.jpg), replacing the old ring-5 cover, so
// the entry ships 4 shots (blast, cockpit, title, landing) under the scorer's
// 4-shot cap (gate.json), decided by the user 27 Nov 20:02 WIB. v22: the Gemini v21 blind-test fixes + the user's
// auto-win decision (27 Nov 15:09) + the 15:11 clarification + the 15:13
// rival-explosion and "team lain" corrections. Rings 1–5 are forgiving
// (16 m, linear climb, Weak sim 4/12 → 9/12). The storm deck is ~400 m
// wide (~45 lobes in clusters of 3, base ~192 m, rings stay under it), the
// funnel is a smooth-sheathed vortex with a crown, rain is thicker with sea
// splashes, and lightning is three parallel jagged lines + a glow sprite +
// flash light 1500. ORANYE detours into the tornado in normal play (kill at
// t 16.32 s) and rival badges are subtler. The cockpit hides the duplicated
// DOM HUD panels (cockpit-view), the altitude panel reads "ALT · MSL", and
// after 12/12 the pill is the WIN cue (SPD · AGL · AUTOLAND READY / FLY OVER
// RUNWAY 09 TO WIN). The title camera ORBITS (yaw 0.22 rad/s, bank 0.42 rad,
// y 190 → 110 m) behind the two gold mission lines, which STAY as the user
// approved them. The airfield has bigger PAPI, a crossbar row, a control
// tower, a parked Caravan and 60 trees. And the WIN itself is automatic now:
// after 12/12 rings, flying over the runway 09 asphalt triggers the win (no
// speed/VS/pitch threshold — the Gemini 78 / −16.5 / hard-landing numbers were
// built, verified, then REMOVED) and the autopilot lands the plane smoothly
// (steep VS-hold −9/−7/−2.5, heading-hold + cross-track roll, pinned rollout)
// — the plane can NEVER explode during the autopilot landing. The player's
// plane never exploded at all: what the user saw exploding were RIVAL planes,
// and the win simply never triggered. Rival explosions are always the OTHER
// TEAMS' planes (race rivals, never "musuh/enemy"), announced by team name,
// and scripted rival explosions pause once the player has 12/12 rings so the
// win moment is never confused with a rival's fireball. v21: the Gemini v20 blind-test fixes + the
// eleven v20 live-playtest P0s + the v21b landing-to-win fix + the
// v21b–v21h title rebuild (the user's final decision, 27 Nov 09:49–
// 09:55 WIB, approved mockup) + v21c low start + steep ridges + dense
// storm + tornado-kills-rival (user 27 Nov 10:17 + 10:23) + v21d storm
// deck + rings under black clouds + lightning by the rings (user 27
// Nov 11:49). A black cumulonimbus deck (~15 flat dark lobes, base
// ~196 m) now ceilings the whole course and the rings (60–159 m) sit
// UNDER it, in rain (7 systems) with lightning striking by the rings
// every 2–5 s; the staged cover/cockpit shots fire a real bolt at the
// next ring for the capture. The cover
// is a NEW moment (20.0 s, ring 4 over the turquoise sea — steep
// ridge crests + a layered tornado + rain + the next ring ahead,
// score 743) — no longer a runway approach duplicating the landing
// (47.2 s, ring 12/12, score 3410). The spawn is LOW (AGL ~58 m)
// and the course CLIMBS between steep ridge islands (300–320 m
// crests flanking rings 3 and 9). Five tornadoes span the whole
// course; a rival that enters one EXPLODES (chain fireball + torn-
// apart burning halves) and is out 12 s, and the player's position
// improves the moment it dies. The title is MODERN: centred gold title, ALL-GOLD mission text above
// a big circular gold play button + START, six light glass control
// chips across the bottom, NO side box — over a HERO camera (south of
// the plane, looking north; the storm stays out of frame, the plane
// reads large at the right). A manual landing at throttle 0.3 / VS −5
// now WINS (the finish-zone window is speed < 62, VS < 12) instead of
// crashing on the old caps (50 / 8).
// Clouds are smooth-shaded multi-puff cumulus (detail-1, bright tops,
// cool undersides) instead of faceted polyhedra that read as floating
// rocks; the tornado is a translucent layered vortex (outer funnel
// 0.45 opacity, darker counter-rotating inner funnel, 3 helix rings,
// spray crown) instead of a solid grey cone, and the storm wall/anvil
// sit 100 m further out and lower. The cockpit is rebuilt to Gemini's
// spec: a real ATTITUDE gauge (live blue/brown horizon disc behind a
// transparent-window face, fixed aircraft symbol), the VSI as a blue
// bug on the ALT dial, dark bezels (#2E3440) instead of glare-prone
// cream rims, darker dial faces (no blown-out white), bigger numbers,
// no windshield struts, no red panel trims, a light rim highlight on
// the glareshield lip, and a sloped shell-grey throttle pedestal with
// a slot and longer levers. The LIVE chase camera is the cover's 3/4
// geometry (13 m back, 6 m to the side ≈ 25°, look-ahead 24 m) — the
// v20 live camera stayed dead-rear and the nose/prop were invisible.
// Rings 1–5 are forgiving (wander 0.12 rad, jitter ±12 m) so a
// tap-rate-limited pilot passes ring 5 (headless test 17: 20.9 s;
// live phase A9). The crash camera pulls to 60 m and looks AT the
// wreck (was 48 m / look-ahead 40 into the hillside), with a terrain
// clamp in the chase branch, and the blast smoke is 8 near-black
// flattened puffs clustered on the fireball (no more pale balls).
// Rival shadows are 1.3x (sun-offset) / 1.25x (contact). The title
// hides the rival race-number markers. The next-ring glow is damped
// (tube 2.0x, opacity 0.20) so it never reads as a giant bubble. v20: the Gemini v19 blind-test fixes + the seven
// v19 live-playtest P0s. Dials are redrawn at 1024 px with real instrument
// scales (IAS 0/25/50/75/100, ALT 0/225/450/675/900, VSI −10..10, RPM 0..4,
// HDG N/E/S/W, needle #E53935, no overlaps) and the cockpit camera is
// pulled back 0.35 m so the leftmost dial is no longer clipped. Rings 1–3
// are forgiving (wander 0.12 rad, altitude jitter ±12 m) and a tap-rate-
// limited pilot passes ring 2 (headless test 15: 11.7 s at 40% duty; live
// phase A9 with a sigma-delta PWM tap driver). The crash camera holds the
// fireball for 3.0 s, clamped clear of the terrain. Contact shadows are
// darker/bigger (opacity 0.75, AGL < 160 m). The gear button is hidden on
// the title, the ring toast is unmissable ("RING 1/12 +112", 4.0 s, 40 px),
// trees are buried −0.15 m with ground discs tilted to the terrain normal,
// the storm is a smooth grey squall cell (not black rock), and the blast
// smoke is dark slate at 0.85 opacity clustered on the fireball (no more
// pale bubbles). The cover freezes at 43.5 s (mid-race, ring 10/11) and
// the landing at 47.2 s (a LOW short-final flare, 250 m / +25 m, ON
// GLIDE) — the two shots are clearly different moments. v19: the Gemini
// v18 blind-test fixes + the six v18 live-playtest P0s. Pitch taps are
// ~2x stronger and symmetric now (pitchRate 0.9, pitchLevel 0.30 — 1 s
// hold: S −26.4 m / W +24.8 m), so ring 2 is reachable with held keys;
// the 1→2 leg stays 206 m by construction (course length / 12 — a 260 m
// floor collapsed the final leg and broke the Reference sim, so COURSE
// is legMin 120 / legMax 480 with wander 0.22 rad). The blast gate is
// tighter (80–300 m, facing >0.88) and the fireball bigger (shell 42 m /
// 3.5 s); the collision message now clears from the DOM text itself
// (was opacity-only, surviving >140 s). On a player crash the camera
// pulls wide and the fireball stays visible as an object for 1.5 s before
// the over panel. Contact shadows sit under all five planes (AGL < 120 m)
// and the sun-offset shadow cap is 50 m. The horizon is visible low over
// the sea (fog #9CC8E8, was ≈ the pale horizon). The giant transparent
// bubbles are gone: rival smoke is flattened (1.2 m, grow 0.9, life 2.0 s)
// and clouds are fully opaque with smaller lobes (base 40–60 m); the
// explosion shockwave ring is deleted. The tornado is a real vortex (12
// segments, taper 4→46 m, dark slate #3B4652/#586675, 18 rotating debris
// flecks). The grass grid is gone (mottle 0.012, SEG 192). The runway has
// turnaround pads, PAPI and an animated striped windsock. Dials are
// redrawn (84 px numbers at radius 120, needle #E53935, labels IAS/VSI,
// VSI as the 6th gauge). The title hides the in-flight counters (Fuel,
// 0/12) and the instruction card sits at left 4% / top 44% / max-width
// 44%. An AGL/glide pill ("AGL 148 FT · HIGH") shows on approach. The
// cover freezes at 49.5 s — the pre-collision convergence, deterministic
// every run (the 51.6 s freeze caught a random debris fragment crossing
// the lens). v18: the Gemini v17 blind-test fixes + the five v17
// live-playtest P0s. The Caravan is faceted + tapered now (nose
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
// asks for 18-25 m). The cover freezes at 49.5 s (v19) — the pre-collision
// convergence, deterministic every run (the staged blast is at ~50.35 s;
// the old 51.6 s freeze caught a random debris fragment crossing the lens).
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
// with the vendored make.fun library. Put 3 to 4 PNG or JPEG screenshots in
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
// scorer would refuse (more than 4 screenshots here — v23 swaps the blast in as the cover, keeping 4; or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json). The screenshots are four staged scenes (blast cover, cockpit, title, landing),
// each a real render of the shipped game at 1280x720, JPEG quality 82, all under 256 KiB.
// v23 adds the blast scene (the ORANYE tornado-kill), same format, same seed — now the cover.
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
