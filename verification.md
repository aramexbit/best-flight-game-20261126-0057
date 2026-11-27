# Langit Nusantara — Ring Run: Verification Checklist (v20)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

# Langit Nusantara — Ring Run: Verification Checklist (v21)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

# Langit Nusantara — Ring Run: Verification Checklist (v22)

Rule: an item is checked ONLY with proof (screenshot / sim / test), never
a claim. Evidence is cited per item. Re-verify after any game-code change
(the 4 screenshots are regenerated last, before commit).

## What changed in v22 (vs v21) — all patched on top of v21

- [x] **(1) AUTO-WIN + AUTOPILOT LANDING (v22 — user decision 27 Nov
  15:09, REPLACES the Gemini manual-landing fix).** User: "ga usah
  mendarat — ketika sudah berada di atas aspal garis finish otomatis
  menang... buat tidak mendarat saja asal sudah berada di garis
  finish otomatis menang dan secara autopilot mendarat dengan
  mulus." The 15:11 clarification changes the diagnosis: the
  PLAYER's plane never exploded — what exploded were RIVAL planes
  (scripted dive/clip/collision/tornado-kill); the player's plane
  stayed intact but WIN never triggered. So the real bug was the
  win condition, not the player's touchdown. The Gemini numbers
  (speed 78, VS −16.5, hard landing, cushion, tiers) are NO LONGER
  used for the win condition — they were implemented, verified,
  then REMOVED (flight.js ground block rewritten;
  sim-land-profiles + sim-landing-gemini DELETED as superseded).
  The new design: after 12/12 rings, the moment the plane enters
  the runway 09 corridor (|dx| < 250 m, |lat| < 24 m) the win
  triggers (`state.autoLanding`, logged `[win] {...}` with t/x/y/z/
  dx/lat/speed/rings) — NO speed/VS/pitch threshold at all. The
  autopilot takes over the input (steep VS-hold −9/−7/−2.5 —
  measured: the gentle −6/−5/−1.5 descent floats ~500 m longer;
  heading-hold + cross-track roll law, never a far steering
  point — the first build steered 500 m past the centre and the
  plane touched down banked −0.58..−0.81 rad turning back;
  throttle idle) and lands it: ground contact pins the plane to
  the deck, speed bleeds at 6 m/s per s, pitch/roll damped to 0,
  a pinned ROLLOUT block (without it the rollout stretched ~300 m
  over the eastern downslope) ends the run below 8 m/s →
  'landed' + EVENT_LAND + touchdown telemetry branch 'WIN' kind
  'autoland'. Crash checks are DISABLED after the win triggers —
  the plane can NEVER explode during the autopilot landing, in any
  condition. Crash checks during the race (rings, terrain, tornado,
  rivals) are UNCHANGED. Rival explosions stay spectacular and are
  ALWAYS the other teams' planes (user 15:13: "Efek dramatisnya
  itu ledakan pesawat musuh, bukan pesawat kita" + "bukan pesawat
  musuh tapi pesawat team lain") — the final-event gate pauses
  scripted rival explosions once the player has 12/12 rings
  (rivals.js `playerOnFinal`), and rival crashes are announced by
  team name ("💥 KUNING + HIJAU MID-AIR COLLISION!", "💥 <name>
  CRASHED!"). No "musuh/enemy" text anywhere in the game
  (verified by grep — only "angle of attack", a flight term).
  Proof: sim-win-autoland 14/14 ALL PASS (10 WIN profiles incl.
  68 m/s fast, 90 m/s dive, VS −32 plunge, 150 m high entry, 30°
  angled entry — all WIN, wings level at touchdown, roll 0–0.02
  rad; 4 negative profiles: 11 rings no win, 300 m short crash,
  sea ditch crash, 0 rings crash); headless tests 19/20/28–31
  rewritten for the win (33/33 ALL PASS incl. new test 34);
  sim-3tier ALL PASS
  (Reference 12/12 landed 58.8 s dx −7 on the strip; Manual 12/12
  landed 57.5 s dx +75). **User clarification 27 Nov 15:46 —
  MANUAL until ring 12, autopilot ONLY after the win:** the
  player flies manual from the start to ring 12 (rings, racing
  the other teams, dodging storm/tornadoes — all manual as
  usual); the autopilot takes over ONLY after the win triggers,
  for the smooth landing alone. This is already how v22 works:
  the autoland input replacement lives inside `if
  (state.autoLanding)` (flight.js line 174) and `autoLanding` is
  set only by the win trigger (rings ≥ 12 + in the corridor) —
  before the win the player's input passes through untouched.
  Proven by headless test 34: 11 rings, full dive + full
  throttle over the strip → OBEYED (crashed, autoLanding false,
  branch CRASH); 12 rings, the SAME dive → IGNORED once the win
  triggers (landed, kind autoland, branch WIN, touchdown dx 298
  lat 0 speed 27.7 VS −2.4 throttle 0); 11 rings mid-race, climb
  input 2 s → +69.3 m (70.2 → 139.5), autoLanding false, flying.
  Honest caveats: fast/high entries
  (68–90 m/s, 60–150 m AGL) touch down LONG — dx 769–955,
  ground 4–11 m (eastern slope/beach, ~500–700 m past the strip
  end) — still smooth wins, wings level, never a crash;
  realistic entries touch down on/just past the strip (dx 2–291,
  ground 90.3). The live proof is probe phase B2 (human-land
  driver to the strip → win → autoland → RACE COMPLETE).
  (flight.js, main.js, hud.js, config.js, rivals.js,
  test/headless.test.mjs, sim-win-autoland.mjs,
  probe-v22-live.mjs)
- [x] **(2) Rings 1–5 forgiving + linear climb (v22, Weak 4/12 →
  9/12).** Rings 1–5 radius 13 → 16 m (rings 6–12 stay 13 m);
  the climb is LINEAR (50 m → approach ~145 m in even ~7.9 m
  steps — the old exponential climb made +16/+26 m jumps);
  early altitude jitter ±12 → ±2 m (a ±12 jitter on a 7.9 m
  base step could still make a 32 m step); the clearance floor
  now uses each ring's own radius; two torus + two glow
  geometries chosen per ring; the sparkle group scales to the
  next ring's radius. Course (seed 1): rings y = [57, 66, 75, 82,
  90, 102, 87, 124, 101, 133, 152, 145], radius [16×5, 13×7].
  Proof: sim-3tier Weak 9/12 score 2102 (was 4/12 score 666),
  above the 7/12 floor; Reference 12/12 landed 61.8 s score
  3411; Manual 12/12 landed 54.7 s; headless tests 24 (15 m
  off-centre ring-2 crossing counts) + 25 (early steps 0–10 m)
  + test 3 near-miss probe moved 15 → 20 m off-centre (15 m is
  now a PASS through the 16 m ring). (config.js, rings.js,
  test/headless.test.mjs)
- [x] **(3) Storm deck WIDER + funnel rebuilt + thicker rain +
  thick lightning (v22, Gemini + user 27 Nov 14:06 "awan hitam
  LEBIH LEBAR").** The deck is now ~400 m WIDE: every course
  position grows a CLUSTER of 3 overlapping puffs (centre lobe
  rx 120–160 m + two satellites ±60–120 m sideways), ~45 lobes,
  raised to y ~262 m so the deeper lobes (base ~192 m) still
  clear the highest ring top (172 m) — the rings stay readable
  under the deck, the deck never covers the plane. The funnel:
  segment overlap +4×scale, a smooth outer SHEATH cone (48→6 m,
  264 m tall, opacity 0.22, DoubleSide) unifying the silhouette,
  and a CROWN puff cluster at the top (3 dark slate puffs, r
  18/24/30 × scale). Rain: 30 m streaks, wind slant ×2.2, 300
  streaks per course system, 0.38 — plus SPLASH rings on the sea
  (4 cells × 8 rings, growing 5→40 m over 2.5 s where ground ≤
  2 m). Lightning is now THREE parallel jagged lines (main + 2
  echoes ±2.5 m, same jitter path) + a radial-gradient glow
  sprite at the strike midpoint (~150 m, additive, 0.85) + flash
  light 700 → 1500 — one ~5 m thick bolt. `tornadoCells(course,
  groundAt)` is a pure exported layout (all 5 cells with `id`);
  spout3 moved 70 → 60 m from ring 4. Proof: headless test 23
  updated (deck base ~192 m; max ring top 172.5 < 190) + test 27
  (spout3 55–75 m from ring 4; the detour target is inside its
  kill cylinder, 40 m out is safe); cover shot 132,504 byte —
  the deck is a wide black ceiling across the top, rain streaks
  everywhere, thin white bolt lines visible at the left, the
  gold ring 5 under the deck with a rival inside it, a big
  layered funnel at the right. Honest caveat: the bolt lines in
  the staged cover are still thin (1–2 px) — visible as a
  zigzag, not dramatic; the live probe phase A13 polls the bolt
  opacities at 10 Hz to prove a strike lights all 3 lines + the
  glow. (storm.js, test/headless.test.mjs)
- [x] **(4) ORANYE detours into the tornado in NORMAL play +
  subtler badges (v22).** In the racing branch, ORANYE at t
  13–18 s dashes full-throttle to the point 20 m from spout3
  toward ring 4 (inside the 35 m kill radius, at ring-4
  altitude ~82 m) and is killed there by the existing tornadoAt
  check — the kill is no longer probe-only. Rival badges: sprite
  4.0×1.7 → 3.2×1.36 m, float 2.9 → 2.7 m, opacity 0.9. Proof:
  headless test 32 (flown flight-level: kill at t = 16.32 s,
  spout3, y 81.0, ring 4 y 81.8, 3 rings passed); the live proof
  is probe phase A12 (ring driver, poll `__raceEvents` for
  'tornado-kill' to 35 s game time). (rivals.js,
  test/headless.test.mjs, probe-v22-live.mjs)
- [x] **(5) Cockpit dedup + ALT·MSL + WIN cue (v22, Gemini then
  auto-win redesign).** In cockpit mode the DUPLICATED DOM HUD
  panels hide (body `cockpit-view` + `hud.setCockpitHud(on)` —
  top-left ALT/SPD/HDG, attitude ball, compass; the ring pointer,
  objective, messages, score/time and fuel/throttle stay). The
  altitude panel reads "ALT · MSL" (the v21 landing shot's "ALT
  378 FT" vs "AGL 81 FT" contradiction is labelled away). After
  12/12 the AGL pill becomes the WIN cue (no speed/VS threshold
  any more — the Gemini VS-zone colours and "TOUCHDOWN READY"
  are GONE): `SPD {kt} KT · AGL {ft} FT · {glide} · {AUTOLAND
  READY | FLY OVER RUNWAY 09 TO WIN}`, green when lined up on
  final, gold otherwise, and "AUTOPILOT LANDING…" once the win
  has triggered, fed by main.js hudView's spdKt / aligned /
  onFinal / autoLanding. The start announce and objectives now
  say "fly over the runway to win" ("ALL RINGS — FLY OVER THE
  RUNWAY", "FLY OVER THE RUNWAY TO WIN"); the endGame panel adds
  "Autopilot landing — smooth touchdown!" for autoland wins.
  Trim #242B35 → #3a4149, arch tube 0.035 → 0.03 m. Proof:
  headless test 33 (ALT·MSL label, bare ALTITUDE gone, AUTOLAND
  READY / FLY OVER RUNWAY 09 TO WIN / AUTOPILOT LANDING strings,
  TOUCHDOWN READY + VS-zone colours GONE, SPD/AGL in the pill,
  spdKt/aligned/onFinal/autoLanding in hudView, cockpit-view CSS,
  setCockpitHud defined + called 3×); shots.mjs cockpit check
  (topLeftHidden + attitudeHidden + compassHidden true in COCKPIT
  VIEW, restored in CHASE VIEW); cockpit shot 129,590 byte — no
  duplicated DOM panels in frame, 5 dials readable; landing shot
  110,741 byte — the pill reads "SPD 109 KT · AGL 81 FT · ON
  GLIDE · AUTOLAND READY" in green, "ALT · MSL 378 FT" at
  top-left, objective "FLY OVER THE RUNWAY TO WIN". Honest
  caveat: the cockpit FRAME is still thick/blocky dark grey —
  the "cage" look Gemini criticised persists (the arch + side
  struts are heavy); the dedup fixed the duplication, not the
  frame. (plane.js, hud.js, game/index.html, main.js,
  test/headless.test.mjs, shots.mjs)
- [x] **(6) Title background alive (v22, Gemini — note (a): the
  two gold mission lines STAY, per the user's final decision).**
  The title camera now ORBITS — yaw 0.22 rad/s (~100° turn in
  the 8 s staged title shot), bank 0.42 rad (~24°), y 190 → 110
  m — so sea/beaches/hills fill the frame behind the gold text
  and the play button instead of distant haze; the sea texture
  drifts (offset 0.008/0.004 per s). The two gold lines, the big
  gold play button + START and the 6 glass chips are UNCHANGED.
  Proof: title shot 99,496 byte — gold title, two gold mission
  lines, big gold play circle + START, 6 light chips (Shift/Ctrl
  Throttle present), sea + beach + green hill behind, the plane
  at the right. Honest caveat: the background is still mostly
  empty sand/beach in the lower half and the plane sits half
  behind the play button — the orbit moves, but the scene it
  shows is quiet. (main.js, terrain.js)
- [x] **(7) Landing environment (v22, Gemini).** PAPI lenses
  0.9×0.4×0.9 → 1.6×0.7×1.6 m on 1.0 m posts; approach-light
  domes 0.32 → 0.5 m + a NEW crossbar row at 300 m out (5 lights
  across the centreline); a 12 m CONTROL TOWER near the hangar
  (3×12×3 concrete shaft, 5.5×2.5×5.5 glass cab, red roof);
  a PARKED static Caravan on the apron (buildPlane reused,
  perp*90, nose east); the airfield tree belt 40 → 60 trees,
  band 80–200 m (airport veg count 60 in the staged shots).
  Proof: landing shot 110,741 byte — runway 09 with markings +
  threshold bars + "09", denser trees around the airfield, two
  rivals ahead, mountain silhouette. Honest caveat: the player
  plane is BIG in the frame (tail-heavy, fills the centre) and
  the terrain around the runway is still fairly flat green with
  scattered trees — better than v21's "flat green slab" but
  still simple; a small red/white object at the right edge is
  the parked Caravan reading as a tiny toy. (terrain.js)
- [x] **(8) Screenshots regenerated + read by the builder (v22,
  after the auto-win redesign).**
  shots.mjs exit 0, errors none: cover 132,504 byte (RING 4/12,
  score 744, 0:20); cockpit 129,590 byte (RING 2/12, score 324,
  0:12); title 99,496 byte (RING 0/12, HUD hidden); landing
  110,741 byte (RING 12/12, score 3411, 0:47, "FLY OVER THE
  RUNWAY TO WIN"). Veg counts: trees 355, palms 205, rocks 110,
  bushes 320, jungle 42, cliffs 126, airport 60 (new denser belt),
  tufts 160. Playtest: start button click works; cockpit hud
  {topLeftHidden, attitudeHidden, compassHidden all true};
  chase toggle back restores the panels + 'CHASE VIEW'. All four
  screenshots were READ by the builder before reporting (see
  (3)/(5)/(6)/(7) for the honest reading of each). (shots.mjs,
  screenshots/1-cover.jpg, 2-cockpit.jpg, 3-start.jpg,
  4-landing.jpg)
- [x] **(9) Live probe v22 — DONE (B2 PASS run 9 teleported; A13 9/9; D-orbit rate 0.22 by construction).**
  `probe-v22-live.mjs` (port 8914): phase D (title hero orbit:
  roll 0.35–0.50, yaw rate 0.20–0.24 rad/s, y 95–125, hero camera
  20–40 m south looking north, plane 3–25° right of centre), A8
  (ring 2, held keys, 45 s), A9 (ring 5, taps, 60 s), C (cockpit
  dedup live), A12 (tornado-kill in NORMAL play, no teleport —
  PASS = event fires with victim ORANYE by 35 s game time), A13
  (lightning visible — live poll of bolt opacities at 10 Hz for
  20 s real time + staged cover bolt), B2 (human flight to the
  strip + auto-win — ring driver to 12 rings, then throttle 0.3
  / VS −5; PASS = RACE COMPLETE + landed). **Results so far
  (rerun, log `out/v22-probe-2.log`):** D hero camera PASS
  (28 m south, fwdZ −0.96, plane 11.7° right) + title DOM PASS;
  D orbit roll 0.42 ✓ y 119.67 ✓ but rate 3.3 — MEASUREMENT
  INVALID, not a game bug (only 3 rAF frames in 2 s: the bundle
  dry-run ran concurrently and starved the browser; the rate
  formula assumes 1/60 s per frame — re-check with
  `probe-d-recheck.mjs`, which measures against game time);
  A8 PASS (ring 2 at 0:12.7); A9 PASS (ring 5 at 0:24.5 — the
  same run also saw the ORANYE tornado-kill at t=16.62); C PASS
  (cockpit dedup); A12 PASS (tornado-kill ORANYE t=16.58, 3
  rings, at (−910, 81, −203)). **The rerun was KILLED by a
  runtime restart during A13 (no confirmed exit)** — A13 + B2
  were re-proven by the focused probe `probe-v22-a13b2.mjs`
  (same driver/helpers/thresholds, log
  `out/v22-probe-a13b2.log`): **A13 PASS — 7 strikes in 200
  samples / 20 s, maxOp 1, 3 lines + glow + 5 tornadoes; A13b
  staged bolt structure PASS (op0 1, glowOp 0.85, ring 4 at
  0:20). B2 run 1 FAIL — the blind human-land driver flew into
  the steep western ridge and crashed at (909, 89, 115), ground
  87.3, dx −341, 116 m short of the threshold, 3.5 s after the
  ring-12 handoff (the plane arrived diving ~−16 m/s; the driver
  never commands a climb). The win CORRECTLY did not trigger —
  no false win. Driver fixed (terrain floor: climb at +3 below
  25 m AGL while > 250 m out) in both probe files + a 3.5 s wait
  before the landing screenshot so the RACE COMPLETE panel
  shows. **B2 run 2 FAIL — a DIFFERENT driver failure:** A13
  passed again, better (14 strikes, maxOp 1); A13b passed again.
  B2: only 6 rings at 100.5 s game time, still flying, yaw 35.89
  rad (5.7 full turns), roll 0.95 rad — the held-key ring driver
  wound into a sustained spiral between rings 6–7 and never
  reached 12 rings; the 400-poll loop was exhausted and the
  human-land phase never started. Driver fixed again (B2 ring
  phase switched to the gentler TAP driver — A9 passed ring 5
  with taps at 24.5 s; loop cap 400 → 600, game-time cap
  150 → 180 s for the ~14x-slow headless browser). **B2 run 3
  FAIL — the TAP driver spiralled TOO (yaw −75.91 rad = 12 full
  turns, roll −1.35 rad max bank, rings stalled at 6, 150.5 s
  game time): two consecutive failures at the same ring 6→7 turn
  with two different drivers — the pursuit controller
  (autopilotTo + key events) is too fragile at that turn under
  the slow browser. A13 passed a third time (8 strikes). Driver
  fixed a third time (ANTI-SPIRAL guard in DRIVER_SRC: latch a
  level-out past 40° bank until under 17°, both ring and tap
  branches, never human-land). **B2 run 4 FAIL — but the guard
  WORKED and the plane ADVANCED (6 → 8 rings):** A13 passed a
  fourth time (10 strikes — lightning 4/4 runs: 7, 14, 8, 10).
  B2: 8 rings at 150.5 s game time, still flying, yaw −4.75 rad
  total (less than one turn — NO spiral), roll 0 (wings level).
  The gentle tap+level-out flying is just SLOW (~19 s/ring at
  rings 6–12) and the 600-poll loop was exhausted before ring 12
  — out of time, not a spiral, not a crash. Caps raised again
  (1000 polls, 300 s game time). **B2 run 5 KILLED by a runtime
  restart (SIGTERM, 22.3 min, no final result):** A13 passed a
  fifth time (14 strikes — lightning 5/5 runs: 7, 14, 8, 10, 14).
  Four consecutive end-to-end B2 failures, ALL probe limitations
  (blind-driver ridge crash, two spirals, out-of-time, restart
  kill) — none a game bug. **Fallback DECIDED and implemented:**
  B2 is now TELEPORTED to 250 m before ring 12 at its altitude
  with 11 rings (position/yaw from the ring-12 axis, speed 55,
  throttle 0.3); the tap driver flies it through ring 12 live,
  then human-land flies the approach, the win triggers on
  corridor entry, and the autopilot lands. B2-teleport proves the
  ring-12 pass + approach + win + autoland live — NOT the full
  course (rings 1–11 proven live by A8/A9/B2-run-1 + sims) — and
  is reported honestly as such. **B2-teleport run 6 FAIL — the
  teleport was INCOMPLETE (a probe bug, not a game bug):** A13
  passed a sixth time (9 strikes — lightning 6/6 runs: 7, 14, 8,
  10, 14, 9). B2: rings STUCK at 11 for 250.75 s, final pos
  (−1566, 100, −180) — BACK AT SPAWN — yaw −23.21 rad. Cause,
  read from rings.js: the course keeps TWO counters — the
  flight's ringsPassed (read by the win trigger + HUD) AND the
  course's internal progress (nextIndex + per-ring passed flags,
  read by nextRing()/checkPass()). The teleport set only
  ringsPassed = 11, so nextRing() still returned RING 1 and the
  tap driver flew the plane 2000 m WEST back to it. Fix (both
  probe files): the teleport now also calls
  D.course.setProgress(11), which sets nextIndex = 11 and marks
  rings 0–10 passed. **B2-teleport run 7 SO CLOSE — failed in the
  last 78 m (taps lost between frames):** A13 passed a seventh
  time (11 strikes — lightning 7/7 runs: 7, 14, 8, 10, 14, 9, 11).
  B2: the teleport WORKED (ring 12 passed, switched to human-land
  at 4.7 s), but crashed at 21.17 s, pos (1238, 92, 42), speed 18,
  yaw 1.70, roll 0.17. The plane entered the corridor
  longitudinally (dx −12, inside |dx| < 250) but at lat −78
  (outside |lat| < 24) — it flew parallel to the strip 78 m south
  of the centreline and touched down beside the runway; the win
  correctly did not trigger. Cause: the browser runs at ~35x
  slowdown (~2 fps), so most 250 ms PWM taps fall BETWEEN frames
  and never reach the game — yaw corrected only 0.14 rad in 16.5 s
  game time (1.84 → 1.70, needed 1.57) and speed bled 55 → 18 m/s
  (below stall 24), collapsing turn authority. Driver fixed
  (both probe files): human-land switched from PWM taps to HELD
  keys (thresholds p/r > 0.1 — bang-bang but starvation-proof) and
  the ring-12 leg switched from 'tap' to the held-key 'ring'
  driver. (One edit briefly landed in the wrong phase — the B2
  comment + driver change hit A9 instead — and was reverted;
  A9 tap / B2 ring verified by grep.) **B2-teleport run 8
  FAILED 64 m off centreline the OTHER way (leaked driver keys
  across the switch):** A13 passed an eighth time (8 strikes —
  lightning 8/8 runs: 7, 14, 8, 10, 14, 9, 11, 8). B2: switched
  to human-land at 5.0 s, crashed at 11.2 s, pos (1047, 92, 184),
  speed 52.3 (no speed bleed — held keys worked for pitch and
  throttle), yaw 1.82, roll −0.34. Inside the corridor
  longitudinally (dx −203) but lat +64 (outside |lat| < 24) — 64 m
  NORTH of the centreline this time; the win correctly did not
  trigger. Root cause, read from the driver code: `startDriver`
  re-evaluates DRIVER_SRC — a fresh closure with an empty `held`
  set — WITHOUT releasing the old driver's keys, so the old keys
  are never given a keyup and the game holds them down forever;
  the new driver's opposite key then cancels out and the plane
  flies straight whatever the new driver commands. Evidence: yaw
  barely moved (1.84 → 1.82 in 6.2 s) although roll reached −0.34.
  This also explains run 7 (yaw only 0.14 rad in 16.5 s — not
  just lost taps) and possibly run 1's ridge crash. Fix (both
  probe files): `startDriver` now calls `window.__kbStop()` FIRST
  (clears the old timer + sends keyup for every key in the old
  held set) before evaluating the fresh DRIVER_SRC. **B2-teleport
  run 9 PASS=true (27 Nov ~20:00, log `out/v22-probe-a13b2-9.log`,
  exit 0, ~13 min):** A13 passed a ninth time (**11 strikes** —
  lightning **9/9 runs: 7, 14, 8, 10, 14, 9, 11, 8, 11**, maxOp 1
  every time); A13b passed a ninth time (structure 3 lines + glow,
  op0=1, glowOp=0.85, elapsed 20, rings 4). B2: switched to
  human-land at 5.0 s; **status 'landed', rings 12, raceComplete
  TRUE, elapsed 19.98 s, pos (1296, 92, 124), speed 7.94 (rollout
  complete, < 8 m/s), yaw 1.51 (runway heading 1.571 — nearly
  aligned), roll 0 (wings level), lat +4 (essentially ON
  centreline), dx +46 (on the strip, just past centre)**; errors
  none. (pollState `landed: false` is EXPECTED — the 12-ring end
  screen shows 'RACE COMPLETE!', not 'Landed!'.) **B2 is
  TELEPORTED, not end-to-end** — rings 1–11 proven live by
  A8/A9/B2-run-1 + sims; reported honestly as such. **D-orbit:
  rate proven 0.22 rad/s BY CONSTRUCTION, not by the probe's
  original formula** — main.js title branch adds `s.yaw += 0.22 *
  STEP` per fixed step; under starvation each rAF frame runs up to
  15 steps (MAX_FRAME 0.25 s clamp), so the correct rate under
  starvation is dyaw / (frames × 0.25): rerun 0.165/0.75 = 0.22,
  re-check v1 0.275/1.25 = 0.22 — both EXACTLY 0.22, in range
  0.20–0.24; roll 0.42 ✓, y 119.67/117.62 ✓ (95–125).
  `probe-d-recheck.mjs` was rewritten clamp-aware but **NOT re-run
  — parent stop order 27 Nov 19:25 WIB ("STOP — hentikan loop
  probe B2... tanpa probe tambahan")**; the D rate stands on the
  code-level proof above. **Cover-bolt screenshot re-read after
  run 9 rewrote it** (`live-shots/v22-live-cover-bolt.jpg`, now
  124,550 byte): lightning now reads as THREE parallel thin white
  zigzag lines at left (deck → sea) — clearer than run 1's two
  lines, still thin (1–2 px) and edge-placed, not dramatic/thick;
  ring 5 gold + rival inside it, big layered funnel at right, deck
  wide above, rain everywhere. **Landing screenshot read**
  (`live-shots/v22-live-landing.jpg`, 99,680 byte): '🏁 RACE
  COMPLETE!' gold panel dominant + Position 1/5, Score 3081, Time
  0:19, 'Autopilot landing — smooth touchdown!', 'AUTOPILOT
  LANDING…' green pill, confetti, plane ON the runway asphalt at
  right (tail + wing visible, slightly cut at frame edge), ALT·MSL
  302 FT, SPEED 15 KTS (7.9 m/s ✓), HEADING 087°, RING 12/12 —
  exactly the win moment the user asked for; plane intact, no
  explosion.**
  (probe-v22-live.mjs, probe-v22-a13b2.mjs,
  probe-d-recheck.mjs, live-shots/v22-live-*.jpg)
- [x] **(10) Verification numbers (v22, all Node, after the
  auto-win redesign).** Headless **33/33 ALL PASS** (log
  `out/v22-headless-9.log` — 32/32 in `out/v22-headless-8.log`
  before test 34 was added for the 27 Nov 15:46 manual-until-win
  clarification). Sim-3tier **ALL PASS** (Reference
  12/12 landed 58.8 s score 3411; Weak 9/12 score 2102; Idle
  crashed 39.4 s; Manual 12/12 landed 57.5 s — log
  `out/v22-sim3tier-5.log`). Sim-win-autoland **ALL PASS 14/14**
  (10 WIN profiles + 4 negative profiles — log
  `out/v22-win-autoland-2.log`). The superseded sims
  (sim-land-profiles, sim-landing-gemini) are DELETED — their
  numbers (12/12, 8/8) described the Gemini touchdown tiers
  that no longer exist. Entrypoint 2× byte-identical (dossier sha
  33a30ea0abe26a017b8e721517f6f24a846b8c950a00087202aae53517b11868,
  797,824 byte; entrypoint total 2,437,867 byte — logs
  `out/v22-entrypoint-1.log`, `out/v22-entrypoint-2.log`) +
  bundle dry-run --repo exit 0, "dry run: nothing written", 26
  sessions, 0 usage rows (known turn-boundary issue — log
  `out/v22-bundle-dryrun.log`) + live probe (item 9). Re-verified
  27 Nov ~20:30 (parent stop order, final steps): entrypoint run a
  third + fourth time into out-a/out-b — SAME dossier sha
  33a30ea0…, 797,824 byte, total 2,437,867 byte (logs
  `out/v22-entrypoint-a.log`, `out/v22-entrypoint-b.log`); out-a /
  out-b deleted after comparison. Local commit: see the gate file /
  the builder's final report.

## What changed in v21 (vs v20) — all patched on top of v20

- [x] **(1) Cover ≠ landing — a NEW cover moment.** `PLAY_SECONDS`
  43.5 → 28.0 s: the cover now freezes mid-race at ring 7/12 (0:27,
  436 FT, 131 KTS, score 1561, RING 8 · 144 m ahead) over a beach
  with green hills, palms and the sea at the frame edge — NOT a
  runway approach. The landing is unchanged (0:47, RING 12/12, score
  3410, "AGL 81 FT · ON GLIDE", runway filling the frame). Different
  moment, altitude, speed, score and composition — the v20 Gemini
  verdict's "near-duplicate" criticism is answered by construction.
  The AGL pill is hidden on the cover now (rings < 12), which also
  answers the ALT-vs-AGL inconsistency (469 FT vs 290 FT) Gemini
  named — only the ALTITUDE pill shows on the cover. Proof: cover
  shot 83,044 byte vs landing shot 99,905 byte. (shots.js)
- [x] **(2) Rock clouds → soft cumulus; tornado → layered vortex;
  glow damped.** Cloud lobes: detail-0 faceted → detail-1 smooth
  normals (flatShading false), bright whites kept, tight packing
  kept — the v10 smooth failure was small/spread/grey-blue lobes,
  the v20 lobes are tight + bright, so smooth shading reads as
  cloud, not rock. Eastern banks raised (E1 390 → 425 m, E2 410 →
  440 m) to clear the ridge silhouette (the "floating cluster above
  the ridge"). Rocks lightened (#8B9A94 / #7C8B84 / #9AA5A0, was dark
  slate) — the "tiny dark specks" on the grass. Tornado: outer
  funnel opacity 0.9 → 0.45 (translucent), a darker counter-rotating
  inner funnel (0.55x radius, #2F3A45, 0.6 opacity, −3.1 rad/s) and
  3 tilted helix rings (opacity 0.28) at 1/4, 1/2, 3/4 height;
  spray crown 5 puffs + 18 m ring. Storm wall: 6 → 10 lobes, smaller
  (rx 60–85 m), lower (y 250), anchor pushed 220 → 320 m off the
  course, darker (#4A5A6A/#5A6C7E/#42525F); anvil: 4 → 6 lobes,
  rx 70–100 m, y 290–315; spout2 moved to 1100 m along / 450 m to
  the side at 0.4 scale (was 750/320/0.45). Next-ring glow: tube
  2.6x → 2.0x, opacity 0.28+0.06·sin → 0.20+0.04·sin — the giant
  pale yellow ring in the sky is damped. Proof: cover + cockpit +
  title shots — the white clouds are smooth puffs, the storm is a
  grey translucent mass with a layered funnel. Honest caveat: the
  anvil still sits behind the "NUSANTARA" text on the title, and the
  funnel still reads somewhat cone-like at distance — the storm
  anchor is ring 1, which is inside the title orbit's view. A v22
  candidate: move the storm anchor further from the title camera.
  (terrain.js, storm.js, rings.js)
- [x] **(3) Cockpit rebuilt to Gemini's spec.** The outer-left dial
  is now a real ATTITUDE indicator: a live horizon disc (512 px
  canvas — sky blue over earth brown, white horizon line, pitch
  ladder at ±20°/±40°) behind a face with a transparent centre
  window punched via destination-out, fixed rim ticks + a fixed
  white aircraft symbol (bar + dot) at the centre, no needle, no
  pin; `setGauges` drives it with roll/pitch (rotation.z = −roll,
  position.y = clamp(−pitch×0.06, ±0.02)). The VSI is a blue bug
  riding the ALT dial's rim at the mini-scale (−10/0/+10 at
  120°/180°/240°, radius 380 px) — a needle from the centre would
  cross the "ALT" badge at level flight, the bug never covers
  anything. Dial faces darker (#F1F5F9/#E8EEF4/#CBD5E1, was
  #FFFFFF/#F8FAFC/#E2E8F0 — kills the blown-out white on the unlit
  MeshBasicMaterial); scale numbers 96 → 118 px, HDG letters 110 →
  128 px, badge 56 → 62 px; rims are a DARK bezel (#2E3440,
  metalness 0.2, was cream metalness 0.5 — the cream rims glared
  yellow around every dial). The two windshield struts are GONE
  (the canopy is one clear pane framed by the A-pillars + bow);
  the red panel trims (top + bottom) and the red glareshield stripe
  are GONE (Gemini v20: "placeholder blocks") — the glareshield lip
  carries a light rim highlight (#94A3B8) instead. The throttle
  quadrant is rebuilt as a sloped shell-grey pedestal with a visible
  slot and longer levers (0.26 m, bigger knobs, throttle black +
  mixture red) sitting on the console shelf — not a dark floating
  box with two sticks. Proof: cockpit shot 118,843 byte — 5 dials
  with real scales + red needles, the ATT horizon readable, the
  yoke + quadrant visible, the canopy a contoured roof + angled
  pillars. Honest caveat: the pillars are still thick dark bars and
  the storm mass top-right is heavy and dark. (plane.js, render.js)
- [x] **(4) LIVE chase camera is the cover's 3/4.** `setChase(11,
  −3.5, 4.2, 22)` → `(13, −6, 4.2, 24)` in startGame — 25° off
  dead-rear (was 17.6°), the same geometry as the staged cover.
  The v20 live camera stayed dead-rear because the high wing
  (y 0.82 m) occludes the nose from a rear-high camera; at 25° the
  nose peeks past the fuselage. The extra distance also pulls more
  ground (and shadows) into the frame. Proof: live probe phase A10
  — the camera offset angle (median, min, max) across straight
  flight + turns + climb. (main.js, probe-v21-live.mjs)
- [x] **(5) Ring 5 forgiving + tap-proven.** The forgiving early
  window is rings 1–5 (was 1–3): wander 0.12 rad, jitter ±12 m on
  i < 5. New headless test 17: a tap-rate-limited pilot (0.2 s on /
  0.5 s) passes ring 5 in 20.9 s (limit 45 s). New headless test 18:
  legs 1–5 are [600, 206, 206, 206, 206] m (all ≥ 200 m) with the
  sharpest early turn 3.3° (limit 29°). The sim-3tier Weak route
  holds at 7/12 (score 1367) — the softening did not collapse the
  struggling-player route. Live proof: probe phase A9 (ring 5 with
  the PWM tap driver, 45 s). (rings.js, test/headless.test.mjs,
  probe-v21-live.mjs)
- [x] **(6) Crash camera pulls back + looks AT the wreck; smoke
  fixed at the root.** `setChase(48, −12, crashHeight, 40)` →
  `(60, −15, crashHeight, 0)` — 60 m back, look-ahead 0 (the v20
  frame looked 40 m PAST the crash point, into the hillside, and
  48 m was too close for a 42 m fireball). The chase branch in
  render.js now clamps the camera ≥ 3 m above the terrain under it
  every frame (second line of defence). Blast smoke: 14 → 8 puffs,
  near-black slate only (#1E293B/#334155, the pale #CBD5E1 and
  mid-slate are gone), cluster ±10/±8 m (was ±18/±12), size
  1.8–2.8 m, FLATTENED (flat 0.55, random yaw — a flattened puff
  grows flattened, it never un-flattens into a ball). The smoke
  column puffs are darker (#334155) + flattened (0.6) too, and
  `smokePuff` takes an `opts.flat` (all rival trails + emitSmoke
  pass flat 0.6). The v20 rev-3 opacity-only fix left pale balls in
  the crash frame; the root cause is round smooth spheres with a
  soft texture — shape, not opacity. Proof: live probe phase A4
  (camera distance ≥ 45 m + terrain clearance + fireball meshes)
  and the crash screenshots. (main.js, render.js, effects.js,
  rivals.js)
- [x] **(7) Rival shadows bigger.** Sun-offset shadows 1.3x for
  rivals, contact shadows 1.25x (new `scaleMul` parameter on
  placeShadow / placeContact). The v20 live playtest identified at
  most ONE shadow in the whole frame. Proof: live probe phase C
  count + cover/landing shots (a dark ellipse under the plane on
  the runway). (render.js)
- [x] **(8) Prop disc is a ring, not a disc.** The blur disc is
  now a radial-gradient ring texture (transparent hub + rim, peak
  mid-radius, 3 faint dark blade streaks), radius 1.7 → 1.55 m —
  a solid pale disc reads as a bubble, a ring reads as motion blur.
  Proof: cover shot — a thin grey ring at the nose. (plane.js)
- [x] **(9) Title: rival tags hidden, storm pushed out.** `runShot`
  calls `rivals.setMarkersVisible(name !== 'start')` — the title
  hides the #02/#04/#05 pills (the planes stay; the red rival over
  the beach is a hero detail), every other shot keeps them. The
  storm wall/anvil anchor moved 100 m further out and the spout2
  350 m further along, so the funnels no longer tower over the
  beach. Proof: title shot — no marker pills, no gear button, clean
  card + icons. Honest caveat: the player's own plane is not
  visible in the title frame (the orbit camera looks past it) and
  the anvil still sits behind the title text — see (2). (main.js,
  rivals.js, storm.js)
- [x] **(10) ALT vs AGL resolved by the cover moment.** No HUD edit
  was needed: the ALT pill is already labelled "ALTITUDE" and the
  AGL pill only shows once rings ≥ 12 — the v20 cover showed both
  only because it froze at ring 12/12. The v21 cover freezes at
  ring 7/12, so only ALTITUDE shows. Proof: cover shot — one
  altitude number (436 FT). (shots.js)
- [x] **(11) Specks + ridge artifact cleaned.** Rocks lightened
  (see (2)) and the eastern cloud banks raised above the ridge
  silhouette. Proof: cover + landing shots — no dark specks on the
  grass, no floating cluster above the ridge (the small plane above
  the mountain in the landing shot is a rival, in frame). (terrain.js)
- [x] **(12) Landing-to-win CRASH — root cause + fix (v21b).** The
  user playtested a real manual landing and CRASHED on touchdown
  (27 Nov 09:39 WIB) — phase B's teleport-to-short-final passed,
  but a human approach never won. Reproduction (10 human profiles,
  seed 1): the touchdown logic in flight.js checked the finish zone
  with speed < 50 m/s, |VS| < 8 m/s, |pitch| < 0.35 — BELOW what a
  human naturally flies (the plane cruises at 105 kts / 55 m/s at
  throttle 0.3, and the natural descent from ring 12 is VS −11
  m/s). A wings-level, on-centreline, on-strip touchdown at
  throttle 0.3 failed on speed ALONE (107 kts vs the 50 cap); the
  steep profile failed on speed + VS together. The check ORDER was
  verified correct (landing first, crash only the else) — the window
  was too narrow, not the order. Fix: ONLY the finish-zone
  `softEnough` widened — speed 50 → 62 m/s (120 kts: above the
  0.3-throttle cruise, below the full-throttle cruise, so slowing
  down still matters), VS 8 → 12 m/s, pitch 0.35 → 0.45 rad; roll
  stays 0.45. The precise onRunway `gentle` path (48 / 0.35 / 8)
  is UNTOUCHED. Re-run after the fix: slow (0.3, VS −5) LANDED
  (106 kts, was CRASHED); slow-steep (0.3, VS −11) LANDED (113 kts,
  VS −11, was CRASHED); cruise-fast (0.72, 146 kts) still CRASHED
  on speed — correct; long-midfield overshoot still CRASHED —
  correct. New headless tests 19 + 20 (count 18 → 20): test 19 —
  human landing at 0.3 / VS −5 wins after 12 rings (106 kts,
  VS −5.0); test 20 — full-throttle arrival still crashes (146
  kts) AND steep −11 m/s at 0.3 lands (113 kts, VS −11.0).
  Headless 20/20 PASS. sim-3tier gained a 4th route "manual"
  (autopilot flies the rings, then a human takes over at 0.3 /
  VS −5): manual 12/12 + landed 53.5 s, score 3410, touchdown
  (1350, 92, 120). Live proof: probe phase B2 (new) — fly the
  rings, then the human profile from ring 12 to touchdown, driven
  by real keys. (flight.js, test/headless.test.mjs, sim-3tier.mjs,
  probe-v21-live.mjs)
- [x] **(13) Cover 28 → 31 s (v21b).** Supersedes the 28 s numbers
  in (1): at 28 s the plane was over the sandy beach with the sea
  only at the frame edges and the storm's rain scratching the frame
  (the cell sits beside ring 6). At 31 s the plane is past the cell,
  over the turquoise shoreline with the sandy beach + green islands
  behind it and the next ring ahead. Proof: cover shot 83,286 byte
  — RING 8/12, 0:30, 483 FT, 129 KTS, score 1876, POSITION 1/5,
  RING 9 · 155 m ahead, plane banking 3/4 (right half), contact
  shadow on the sand. Cover ≠ landing: 0:30/483 FT/129 KTS/ring 8/
  1876 vs landing 0:47/378 FT/109 KTS/ring 12/3410. Honest caveat:
  the sea is a side element (left edge), not dominant — the frame
  is beach + green hills; the moment is mid-race banking, not a
  runway approach, which is what the brief required. (shots.js)
- [x] **(14) Title screen rebuilt MODERN + hero camera (v21b–v21h)
  — the user's final decision.** The user corrected the v21 brief
  twice: 27 Nov 09:35 WIB "cover awal game kurang bagus", then
  09:39 WIB "LAYAR JUDUL maksudnya saya bukan cover" + "buat
  lebih modern". The v21b glass-card redesign (left-aligned hero,
  HOW TO FLY card, dark control strip, pill CTA) was replaced by
  the user's FINAL layout (27 Nov 09:49 WIB, variant 2 "TANPA
  kotak di pinggir"), approved 09:51 WIB ("nah itu baru bagus")
  against the coordinator's mockup
  (~/workspace/your_files/media-generation-langit-nusantara-title-final-p-0-564c9fcb-b8d5-47fe-b3a9-4a4b397ec934.webp):
  gold title "LANGIT NUSANTARA / RING RUN" centred at top; the
  mission text above a BIG circular gold play button (140 px,
  white triangle) in the centre + START in gold caps under it; the
  mission + terrain text ALL GOLD (#FFD52A — the mockup's first
  line was white; the user ordered it gold in the game, 27 Nov
  09:55 WIB, and "RING RUN" gold too: NO white text above the play
  button); six separate light glass control chips spread across the
  bottom (W/S Pitch, A/D Roll, Q/E Rudder, Shift/Ctrl Throttle —
  the badge wraps to two lines, that chip stands taller as in the
  mockup — C Camera, P Pause); NO instruction box at the side, NO
  brand logo, NO gear on the title. The live background is a NEW
  hero camera (render.js `CAMERA_HERO`): the camera sits SOUTH of
  the plane (over the sea, +28 m, +4 m, +2 m east) and looks NORTH
  (look target 20 m west, 50 m north), so the plane reads large at
  the right against beach + green hills + blue sky, the storm
  (east, 90° right) out of frame, the turquoise sea filling the
  bottom. It follows the plane (the live title orbit stays framed)
  with the same feedforward + lerp + terrain clamp as the chase,
  and startGame() resets the mode to CHASE explicitly (the title
  runs HERO, gameplay runs CHASE — no leak). Two real defects were
  caught in the title screenshots and fixed: (a) the centred hero
  (left:50% + translateX) shrink-to-fit to 640 px, so the title
  wrapped to two lines and collided with the mission text — the
  hero now spans the full width (left:0; right:0); (b) the plane
  read behind the play button — the camera moved closer (45 → 28
  m) and the look target further west (8 → 20 m), so the plane
  reads ~69% across, fully clear of the button. Proof: title shot
  100,753 byte — one-line gold title, gold RING RUN, gold mission
  + terrain, big gold play circle + START, 6 light chips, the
  player's plane whole at the right (red nose + prop + tail over
  the beach), no storm, no tags, no gear. This resolves item (9)'s
  caveats (anvil behind the text, plane not visible). The v21b
  glass card + pill CTA + eyebrow + brand logo are all REMOVED
  (dead CSS cleaned). (game/index.html, render.js, main.js,
  probe-v21-live.mjs phase D hero check)
- [x] **(15) LOW START + steep ridges (v21c — user 27 Nov 10:17).**
  The seed-1 course was almost entirely over the sea (ground 0–15 m
  under rings 1–11, nothing within 200 m), so "low start between
  hills" had to be BUILT. `COURSE.minRingAlt` 120 → 45 (config.js);
  the walk starts at y 55 (was 150) and climbs 62 → 145 toward the
  approach; the spawn is set to ring 1's altitude (was +10 m), so
  the first leg is LEVEL at AGL ~57.7 m (inside the user's 40–60 m
  band); the leg-clearance margin is 45 → 25 m (the 45 m margin
  lifted ring 1 and made the first leg climb). The ridges are
  COURSE-AWARE, not fixed: two pairs of narrow, tall ridge islands
  (radius 260–280 m, height 300–320 m) flank the FINAL ring
  positions 450 m perpendicular — pair A flanks ring 3, pair B
  ring 9 — placed at the end of `createCourse` (rings.js), so
  their skirts add < 2 m under the rings and the low course stays
  low while their crests fill the frame's edges. Fixed positions
  were tried first and REJECTED: seed 10's course runs over a fixed
  southern ridge (ring 3 on it at ground 134 m, the leg climbs
  100 m in 203 m, the autopilot overshoots and crashes into the
  ridge — seed probe 11/12). Course-aware placement fixed it:
  seed probe back to 12/12. Idempotent (createCourse runs once per
  rival on the same islands array — a ridge is only added if no
  island already sits within 100 m of it). The autopilot's terrain
  guard in shots.js was reworked for the low course (proportional
  climb instead of a hard 0.9 stick, margin 45 → 25 m, and
  path-based sampling at the carrot + midpoint + 80 m ahead instead
  of 160–340 m along the nose, which caught the flank of the island
  beside the start and rocketed the plane to 300–500 m). Proof:
  headless test 22 — spawn AGL 57.7, ring 1 AGL 44.9, ring 3 AGL
  99.1, ring 12 y 145, ground under ring 3 0.7 m (sea) vs 300 m
  north 77.6 m / 450 m north (crest) 160.8 m. (config.js, rings.js,
  terrain.js [fixed ridges reverted], shots.js, test/headless.test.mjs)
- [x] **(16) DENSE STORM + tornado-kills-rival (v21c — user 27 Nov
  10:17 + 10:23).** The storm now spans the WHOLE course, not one
  point. Three new waterspouts via the existing `buildFunnel`
  helper (storm.js): spout3 near ring 4, 70 m NORTH toward the
  north ridge, scale 0.55, kill radius 35 m — the close/killer
  tornado a weaving rival can enter in real play; spout4 near ring
  9, 200 m SOUTH over the sea, scale 0.6, kill radius 30 m — the
  cover tornado; spout5 near ring 10, 260 m NORTH, scale 0.5, kill
  radius 25 m. All stay OFF the ring line (nearest 70 m from a
  ring centre, kill radius 35 m), so no ring and no player line is
  ever covered. Each spout has its own counter-rotating inner
  funnel + helix rings. The storm returns a `tornadoes` list (main
  cell r45 scale 1, spout2 r25 scale 0.4, spout3 r35, spout4 r30,
  spout5 r25) and a pure exported `tornadoAt(x, y, z, tornadoes)`
  — a point dies only inside the radius AND the height band
  (baseY … baseY + 264×scale). Rain is now 4 systems (main cell
  350 streaks, spout3 200, spout4/5 250 each, each its own
  LineSegments cloud). Lightning strikes in a RANDOM storm cell
  (any of the five tornadoes, ±150 m), every 3–7 s (was 4–9 s),
  first strike 2–4 s. A second storm wall (6 flatter lobes) sits
  at spout4. **Tornado-kill mechanic (rivals.js + main.js):** a
  rival in a flying state that enters a tornado's cylinder is
  destroyed — `effects.explodeChain` (chain fireball) +
  `effects.explodeSplit` (both airframe halves torn apart,
  tumbling, burning — the same visuals as the mid-air collision,
  so the kill is unmistakable in a screenshot) — then it is out
  for `RACE.tornadoOutDelay` 12 s (vs the 3 s crash respawn, so it
  reads as ELIMINATED) and rejoins behind. `playerPosition` SKIPS
  a tornado-killed rival entirely, so the player's position
  improves THE MOMENT it explodes. The fixed-step onEvent handler
  shows "🌪️ <name> DESTROYED BY THE TORNADO!" (3.0 s) + `audio.boom()`
  + shake 0.5 — the player KNOWS a rival just died. The PLAYER is
  never tested against the tornadoes (the player's storm danger
  stays the gusts, as now — the user ordered the player NOT
  immune, and the gusts are the existing danger). The staged shots
  log tornado-kills to `window.__raceEvents` without a HUD/boom
  (frozen frames). A tornado-killed rival's scripted crash flags
  are NOT set, so it can still do its scripted event after
  rejoining. Proof: headless test 21 (tornadoAt cylinder: centre
  kills, 34 m kills, 36 m safe, above the crown safe, below the
  foot safe, main cell 40 m kills / 50 m safe); the LIVE visual
  proof is probe phase A11 (screenshot of the rival's explosion
  at the tornado) — see the live probe section. (storm.js,
  rivals.js, main.js, config.js, test/headless.test.mjs)
- [x] **(17) Verification updates for v21c.** Headless **22/22**
  (tests 21 + 22 added — tornadoAt cylinder + low start/ridges).
  Sim-3tier ALL PASS (Reference 12/12 + landed 60.1 s score 3410;
  Weak 4/12 score 666 — HONEST CAVEAT: below the v21 brief's 7/12
  floor; the low climbing course is genuinely harder for a
  struggling player; the sim's own criterion is "some rings, no
  finish" and 4/12 passes it; the tap pilot, test 17, remains the
  realistic struggling-player proof and still passes ring 5;
  Idle 1/12 crashed 39.4 s; Manual 12/12 + landed 54.0 s score
  3410). Sim seeds 1–12 ALL PASS (12/12 + landed, scores
  3381–3422; seed 10 was 2/12 + crashed on the fixed ridges and
  is 12/12 + landed 59.5 s after the course-aware fix). The
  `shots.mjs` harness timeout was 20 s — the cover shot stages
  31 s of simulation on the heavier scene (5 tornadoes, 4 rain
  systems, 13 islands) and takes ~26 s to become ready in
  software rendering, so the harness timed out twice with no page
  error (the game itself was healthy: `__shotReady` true in < 2 s
  for the title, 26.3 s for the cover, 5 tornadoes present, errors
  none). The harness timeouts (goto + waitForFunction) were raised
  20 s → 60 s — a tooling fix, not a game change. The playtest's
  Start-button click also needed `force: true` + a 60 s timeout
  (the heavier scene saturates the main thread in software
  rendering, so the click's stability checks starve) and a wait
  for the HUD to actually appear after the click (the first frame
  after start takes > 500 ms). (test/headless.test.mjs,
  sim-3tier.mjs, shots.mjs, /tmp/probe-v21c-seeds.mjs)
- [x] **(18) Cover 31 → 20 s (v21c).** Supersedes the 31 s numbers
  in (1) and (13): the 31 s cover was over the runway island
  (green + sand, the sea only a strip at the left edge) — it did
  not show the turquoise sea or the steep hills the user ordered
  (27 Nov 10:17: "cover shot harus menampilkan BUKIT CURAM ...
  bukan cuma laut datar"). At 20 s the plane is near ring 4, over
  the turquoise sea, flanked by ridge pair A (steep green crests
  with grey rocky peaks) with spout3 (the close tornado) beside
  it and two more tornadoes in the distance, rain across the
  frame, and the gold ring 5 ahead with rival #4 inside it. Proof:
  cover shot 110,336 byte — RING 4/12, 0:20, 403 FT, 127 KTS,
  score 743, POSITION 2/5, RING 5 · 83 m ahead, plane banking 3/4
  over the turquoise sea (bottom half of the frame) + sandy beach
  + steep hills, a big layered tornado at the right + two distant
  funnels, rain streaks. Cover ≠ landing: 0:20/403 FT/127 KTS/
  ring 4/743 vs landing 0:47/378 FT/109 KTS/ring 12/3410. The
  other three shots are unchanged in composition (cockpit RING
  2/12 0:12 324; title final layout; landing RING 12/12 0:47
  3410 "LAND ON THE RUNWAY") — only their byte sizes moved
  slightly (cockpit 127,479; title 99,504; landing 99,983) from
  the storm/rain randomness in the staged scene. (game/src/shots.js)
- [x] **(19) Storm deck + rings under black clouds + lightning by
  the rings (v21d, user 27 Nov 11:49).** The storm sky is now a
  DOMINANT black ceiling, not a few blobs: ~15 large, flat, DARK
  cumulonimbus lobes (rx 90–130 m, y-scale 0.3–0.4, y ~248 m,
  base ~196 m, colours #0F172A/#1E293B/#334155, opaque) spaced
  ~220 m along the whole course polyline (spawn → rings →
  runway), overlapping into a continuous dark deck. The rings
  (60–159 m, top 172 m) sit 25+ m BELOW the deck base — the deck
  frames the TOP of the view and never covers a ring or the plane
  (the coordinator's rule). Course rain: 3 new systems (rings
  1–4, 5–8, 9–12, 250 streaks each, 0.32, spread ±250 m) under
  the deck, so the player flies through rain at the rings — 7
  rain systems, ~1,800 streaks total. Lightning: the bolt now
  strikes near the RINGS too (target = random tornado OR random
  ring, 12 rings vs 5 tornadoes ≈ 70% ring strikes), every 2–5 s
  (was 3–7 s), flash 0.2 s (was 0.12 s). The staged 'play'
  (cover) and 'cockpit' shots trigger a REAL strike at the next
  ring (`storm.flash()`, the same strike() as live play, bolt
  ~60 m east / 40 m north of the ring, lit 1.5 s) so the frame
  shows a bolt by the ring — the live 0.2 s flash rarely lands
  on the capture frame. This is staging (a real 3D bolt at a
  real ring), not a fake overlay; the HUD is never faked. The
  title ('start') and landing shots do NOT flash (title stays
  clean, landing is a clear-sky flare). Proof: cover 124,296
  byte — RING 4/12, 0:20, 403 FT, 127 KTS, score 743, POSITION
  2/5, RING 5 · 83 m; a pale zigzag bolt runs from the black deck
  down the left side to the sea, the gold ring 5 sits UNDER the
  black deck with rival #4 inside it, rain streaks across the
  whole frame, the big layered tornado at the right + two distant
  funnels, turquoise sea + beach + steep hills. Cockpit 136,909
  byte — RING 2/12, 0:12, 324, RING 3 · 189 m; a bolt drops from
  the deck past ring 3, the gold ring 3 sits UNDER the black
  deck, rain everywhere, 2 tornadoes + 4 rivals in frame, 5 dials
  readable. Title 99,529 byte — the final layout is UNCHANGED
  and the hero background is still clean (turquoise sea + beach +
  green hill, NO deck: the hero camera looks north and the
  course/deck run south + east, behind the camera). Landing
  100,254 byte — unchanged composition (runway 09 fills the
  frame, "LAND ON THE RUNWAY", AGL 81 FT · ON GLIDE). Headless
  **23/23** (test 23 added — rings below the deck: highest ring
  top 172.5 m < 190, deck base ~196). Sim-3tier ALL PASS
  (Reference 12/12 + landed 60.1 s score 3410; Weak 4/12 score
  666; Idle 1/12 crashed 39.4 s; Manual 12/12 + landed 54.0 s
  score 3410 — the deck/rain/lightning are visual only, they do
  not touch the flight model, course or sim). Sim seeds 1–12 ALL
  PASS (12/12 + landed, scores 3381–3422; the seed probe uses
  the flight model + course + terrain only, so the storm.js
  changes do not affect it — the run after the deck edit stands;
  the flash edit is in runShot + storm.js strike/flash, also
  outside the sim path). HONEST CAVEAT: the bolt is a thin
  (1 px) pale line — clearly visible as a zigzag against the sky
  and the mountain, but subtle; it does not obscure the ring
  (it lands beside it). The full live probe on the v21d code is
  RUNNING (see the live probe section). (game/src/storm.js,
  game/src/main.js, test/headless.test.mjs)

## What changed in v20 (vs v19) — all patched on top of v19

- [x] **(a) Course start forgiving + tap pilot proven.** Rings 1–3:
  wander 0.22 → 0.12 rad, altitude jitter ±28 → ±12 m (rings 4+
  unchanged). New headless test 15: a tap-rate-limited pilot (stick
  live 0.2 s per 0.5 s, throttle held) passes ring 2 in 11.7 s
  (limit 30 s). Live proof: probe phase A9 — the FIRST live tap
  driver (fixed 1 tick in 3 at full deflection) FAILED, 0 rings in
  30 s: a 250 ms full-deflection pulse banks ~0.22 rad and never
  converges with a 500 ms dead time. Rev 2 replaces it with a
  sigma-delta PWM tap driver — the autopilot's continuous stick
  value becomes on/off key pulses at the 250 ms tick, averaging to
  the proportional value (the same model as headless test 15). The
  focused re-probe (`/tmp/probe-a9-v20.mjs`, runtime restart killed
  the run before its log was written, but the screenshot on disk
  proves the pass) shows **RING 2/12 +165 at ~0:15, score 308,
  RING 3 · 120 m, POSITION 2/5** (`live-shots/v20-live-ring2-tap.jpg`,
  105,796 byte) — the tap pilot passes ring 2 live. Honest caveat:
  only ONE PWM-tap pass is screenshot-proven (the second attempt's
  log was lost to the restart); the headless test 15 remains the
  repeatable proof. (rings.js, test/headless.test.mjs,
  probe-v20-live.mjs)
- [x] **(b) Crash camera held longer + clamped clear of terrain.**
  `crashing` beat 1.5 → 3.0 s (the fireball lives 3.5 s), camera
  `setChase(48, -12, 30, 40)` (was 45/-10/20) with the height lifted
  until the camera's own position clears the terrain behind the wreck
  by 4 m — the v19 live playtest saw the fireball for 1.5 s and then
  the camera pressed against the hillside. Live proof: probe phase
  A4 screenshots. (main.js)
- [x] **(c) Contact shadows darker/bigger.** Opacity 0.55 → 0.75,
  scale 8 + agl×0.02 → 10 + agl×0.03, visible below 160 m AGL (was
  120). The v19 live playtest identified only 1 of 9 code-visible
  shadows. Proof: cover + landing shots — a dark ellipse under the
  plane on the grass/runway; live proof: probe phase C count.
  (render.js)
- [x] **(d) Gear button hidden on the title.** `body.title-open
  #btn-gear { display: none; }` — the v19 live playtest still saw
  the round sun/gear button top-right (v19 only hid Fuel + 0/12).
  Proof: title shot — no button top-right; live proof: probe phase D
  checks `getComputedStyle(#btn-gear).display === 'none'` on the
  title. (game/index.html)
- [x] **(e) Ring toast unmissable.** Duration 2.2 → 4.0 s, font
  34 → 40 px — the v19 live playtest passed ring 1 (score 122) with
  NO toast visible in any screenshot. New headless test 16: a centre
  pass pays 150 (100 ring + 50 centre), a half-radius pass pays 125
  (≥ 120). Live proof: probe phase A6 reads `#hud-msg` right after
  the pass. (main.js, hud.js, game/index.html,
  test/headless.test.mjs)
- [x] **(f) Storm reads as weather, not black rock.** Anvil: 4 lobes
  of 100–140 m at y 320–350 (was 5 of 140–200 m at y 375–425),
  colours #6B7E92/#8296A8 (was #3B4652/#586675); wall: 6 lobes of
  100–150 m, anchor 150 → 220 m off the course, colours
  #5F7285/#71849A/#5A6C7E; funnel #46545F opacity 0.9 (was #3B4652 /
  0.95); spray crown 5 puffs + 18 m ring (was 3 + 14 m); spout2 moved
  to 750 m along / 320 m to the side at 0.45 scale (was 500/180/0.55)
  so it no longer pierces ring 1. Second pass (f2): the wall/anvil
  lobes use SMOOTH shading, detail 1 (was flat detail 0) — the first
  v20 screenshots showed the lightened anvil STILL reading as a black
  cut rock behind the title: hard facet steps on a dark surface are
  the problem, not just the colour. Proof: title + cockpit shots —
  the storm is now a smooth grey cloud mass with a striped funnel and
  rain; the white cumulus banks keep their flat-shaded style.
  (storm.js)
- [x] **(f2) Blast smoke no longer reads as bubbles (rev 2, after the
  full v20 probe).** The v20 live crash frame showed the explosion
  smoke as ~8 big pale translucent spheres scattered over the grass
  — the same "pale bubbles on the slope" the v19 live playtest
  named, a THIRD bubble source the v19 fix missed (emitSmoke +
  cloud lobes were fixed, blast smoke was not; it also appears in
  the v19 crash frame). Root cause: the pale #CBD5E1 puffs (every
  3rd puff) + the wide ±30 m / ±20 m spread + perfect smooth
  spheres with a soft radial texture = isolated pale balls floating
  apart from the fire. Fix: pale #CBD5E1 replaced by mid-slate
  #7A8CA0 (smoke is now #475569 / #64748B / #7A8CA0 only), cluster
  tightened to ±18 m horizontal / ±12 m vertical (was ±30/±20),
  initial size 2.5–4 → 2–3.5 m — dark-to-mid slate puffs clustered
  on the fireball read as smoke. Proof: focused crash re-probe
  (see the live-probe section below). (effects.js)
- [x] **Trees planted, shadows hug the slope, mountains softened,
  clouds merged.** Tree/palm burial −0.15 m (trunks never float on a
  slope crest), bush +0.05·s; ground discs tilt to the local terrain
  normal (was flat) at +0.08 (was +0.15) — the v19 "floating/offset
  shadow" is gone; ridge detail 0.2 → 0.12, detail2 ±12% → ±8%,
  landmark spine 0.22 → 0.10 (no more pinched peaks); cloud lobes
  more/smaller/tighter (base 14–18 × 30–45 m, top 10–13 × 20–30 m,
  lower 5–6 × 25–40 m). Proof: cover + landing shots — trees sit in
  the grass, discs under the trunks, layered rolling ridges, banks of
  many small puffs. (terrain.js)
- [x] **Dials redrawn at 1024 px with real instrument scales.**
  Canvas 512 → 1024, numbers 96 px at radius 380 (HDG 110 px), real
  scales on the −120°..+120° sweep (IAS 0/25/50/75/100, ALT
  0/225/450/675/900, VSI −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W
  with NO badge — the 360° HDG needle would cover a bottom label),
  tick major 430→470 / minor 445→470, redline r 480 on IAS/RPM only,
  badge 210×72 at y 800 (below the needle sweep), needle shortened
  (Box 0.042×0.155, tip 0.1325 m), anisotropy 8. Cockpit camera
  pulled back 0.1 → 0.35 m so the leftmost dial is no longer clipped.
  Proof: cockpit shot — 5 dials with readable numbers and red
  needles, all in frame. (plane.js, render.js)
- [x] **Prop disc no longer a pale bubble.** Colour #d8d8d8 →
  #8a9199, opacity max 0.45 → 0.25, radius 1.85 → 1.7 m; `update()`
  opacity `min(0.25, throttle*0.25)`. Livery contrast up: cheatline
  0.22 → 0.30 m, red wingtips to 5.8 m (was 5.5), nav lamps at 5.8 m.
  Proof: cover shot — the disc is a subtle grey blur at the nose, the
  red wingtips/cheatline pop against the sky. (plane.js)
- [x] **Rival tags compact.** Pill 5.0×2.1 → 4.0×1.7 m, y+3.2 →
  +2.9 m (hugs the fin top instead of hovering). Proof: cockpit shot
  — #3/#5 as compact navy pills, no debug-box look. (rivals.js)
- [x] **Title card: sharp SVG icons + Gemini's 3 concise lines.**
  "Fly through all 12 glowing rings, then land on Runway 09." /
  "Hit ring centres for bonus points; watch fuel and airspeed." /
  "Avoid stalling at low speed and navigate clear of the storm." —
  with a gold ring, a red/gold target and a blue storm cloud + gold
  bolt (the old fuel-pump pictogram and abstract lightning read as
  small/blurry/misaligned). Proof: title shot — three crisp icons,
  three readable lines. (game/index.html)
- [x] **Landing is a LOW flare, truly different from the cover.**
  `PLAY_SECONDS` 49.5 → 43.5 (cover: mid-race ring 10/11, AGL pill
  hidden since rings < 12 — cleaner HUD); landing freeze 300 m/+50 m
  → 250 m/+30 m with the landing glidepath rebuilt (far target +45 →
  +25 m, near +6 → +4 m) and the autopilot terrain guard relaxed for
  point targets (samples 80/160 m, margin 15 m — was 80–340 m/45 m).
  The first v20 landing shot FAILED the freeze: the strict guard
  pinned the plane at +45 m above the strip and it orbited at a
  77° bank for the full 140 s (HUD 2:20, steep bank, no runway in
  frame) — diagnosed with a headless trace (`/tmp/diag-landing-v20.mjs`:
  the plane flew a perfect final at +45 m, aligned 0.8°, roll −0.1°,
  and never descended). After the fix the freeze triggers at t=47.2 s
  (250 m, +25 m, aligned 3.7°, roll 4.6°). Landing camera 14/−2/2.6
  FOV 52 → 16/−3/3.0 FOV 55. Proof: landing shot 100,444 bytes,
  0:47, "LAND ON THE RUNWAY" + "AGL 81 FT · ON GLIDE" — the runway
  fills the frame, "09" + piano keys big, plane level over the
  centreline — vs the cover (0:43, 469 FT, 129 KTS, "AGL 290 FT ·
  HIGH", runway a distant strip). Different moment, altitude, speed
  and composition; the score is the same (3406) in both because no
  ring is passed between them — noted honestly. (shots.js, main.js)
- [x] **Ring glow pulses.** The next ring's glow torus pulses
  0.28+0.06·sin(time·3.2) (was flat 0.22). Proof: cockpit shot —
  the next ring glows gold against the terrain. (rings.js)

## What changed in v19 (vs v18) — kept as history

- [x] **(f) Horizon visible low over the sea.** Fog #cfe8f5 → #9CC8E8
  (was ≈ skyHorizon #CFEFFF, so the horizon vanished). Proof: cover
  screenshot `screenshots/1-cover.jpg` — a clear sea/sky horizon at
  148 ft AGL; landing shot shows the same. (config.js)
- [x] **(e) Pitch taps ~2x more effective, symmetric W/S.** pitchRate
  0.7 → 0.9, pitchLevel 0.45 → 0.30. Proof: headless test 7 — 1 s
  hold: S −26.4 m / W +24.8 m, ratio 1.06. (config.js, flight.js)
- [x] **(a) Ring 1→2 window — honest fix is pitch authority, not longer
  legs.** The legs are 206 m by construction (course length / 12);
  a 260 m floor made the final leg collapse to 145 m and the
  Reference sim FAIL (11/12, ring 12 missed by 22.6 m, timeout at
  (669,151,118)). Fix: `COURSE.legMin 120 / legMax 480` replaces
  ringSpacing + spacingJitter; wander 0.30 → 0.22 rad. Legs are now
  [600, 206, 207, 206, 206, 207, 208, 208, 209, 208, 208, 208].
  Headless test 8 asserts leg 1→2 ≥ 200 m and the spawn→1 vs 1→2
  turn < 0.5 rad. The LIVE proof is probe phase A8 (held keys, ring 2
  must pass) — see the live-probe section below. (config.js, rings.js)
- [x] **(b) Blast gate tightened + message REALLY clears.** blastDist
  100–400 → 80–300 m, facing >0.85 → >0.88 (inView), lateFire ≤400
  → ≤300, relFire ≤400 → ≤300 and facing >0.7 → >0.75. Headless
  test 9: blast at 400 m fires in NO branch. The HUD message bug
  (text stayed in the DOM >140 s) is fixed — hud.js now sets
  `textContent = ''` when the timer expires; the live probe checks
  the text is '' (strict), not just opacity 0. Fireball bigger:
  shell 42 m / 3.5 s, core 24 m, inner 14 m. (collision.js, effects.js,
  hud.js)
- [x] **(c) Crash camera pulls back.** On EVENT_CRASH the camera
  widens (`setChase(45, -10, 20, 40)`) and a transient `crashing`
  state runs effects/storm for 1.5 s before `endGame(false)`, so the
  fireball reads as an OBJECT instead of the camera entering the
  terrain/flame. Live proof: probe phase A4 screenshots. (main.js)
- [x] **(d) Contact shadows.** A dark ellipse directly under the
  player + each rival, visible when AGL < 120 m (opacity 0.55→0,
  scale 8 m + agl×0.02), plus the sun-offset shadow cap 120 → 50 m.
  Proof: cover shot — a dark ellipse under the plane on the grass;
  landing shot — the shadow under the plane on the runway. Live
  proof: probe phase C count. (render.js)
- [x] **Bubbles gone (two sources).** (1) The rival `emitSmoke` chain
  (2.2 m puffs growing 1.8/s for 2.8 s ≈ 13 m, every 0.1 s) is
  flattened: size 1.2 m, grow 0.9, life 2.0 s, opacity 0.45.
  (2) Cloud lobes are FULLY OPAQUE (transparent removed) and smaller
  (base 40–60 m, lower 30–50 m, top 25–40 m). The explosion
  shockwave ring is DELETED and the blast smoke capped (life 6–8 s,
  grow 0.5, max ~8 m). Proof: cockpit shot — clouds read as small
  faceted puffs, only 2 faint small discs remain at the far right
  edge; cover shot — no discs at all. (effects.js, rivals.js,
  terrain.js)
- [x] **Tornado rebuilt as a vortex.** 12 segments (was 8), continuous
  taper 4 m (foot) → 46 m (crown), dark slate #3B4652/#586675,
  18 rotating debris flecks, faceted anvil + rain #E6F4FF opacity
  0.35. Proof: cockpit + title shots — a dark tapering funnel with
  debris, visible in the camera view. (storm.js)
- [x] **Grass grid gone.** Mottle 0.045 → 0.012, offsetHSL amplitude
  0.03/0.07 → 0.015/0.04, terrain SEG 160 → 192. Proof: cover /
  landing shots — no grid lines in the grass. (terrain.js)
- [x] **Runway furniture.** Turnaround pads (asphalt disc r 20 m +
  white ring at both strip ends) + PAPI (4 boxes beside the west
  threshold: 2 red inner + 2 white outer) + a red-white striped
  windsock (canvas texture, animated yaw + flutter). Proof: landing
  shot — PAPI boxes visible left of the threshold, pads at the strip
  ends. (terrain.js)
- [x] **Title counters hidden; card moved.** `.top-pill` inside
  `#title-top-right` hidden by CSS (Fuel + 0/12 gone from the title;
  the gear button stays). `#title-rules` top 47% → 44%,
  max-width 540px → 44%. Proof: title shot — no Fuel/0-12 pill,
  card at the left, rings + beach + rival visible on the right.
  (game/index.html)
- [x] **Dials redrawn, readable.** Numbers 84 px at radius 120
  (was 96 px at 138, glyphs hit the tick ring), ticks shorter
  (long 180, major 190, minor 200, all to 216), badge 150×52 at
  y 300, font 46 px, dial main r 0.20 / outer 0.14, labels
  IAS/VSI (was KTS/FUEL), needle #E53935, VSI as the 6th gauge
  (needle `sweep((vs+10)/2, 10)`). Proof: cockpit shot — 5 dials
  readable, numbers clear of ticks. (plane.js, render.js)
- [x] **AGL / glide cue on approach.** `#hud-agl` pill (top 19%):
  `AGL {ft} FT · {glide}` when rings ≥ ringTotal; glide = dist ×
  0.0524 (3°), ON GLIDE / HIGH / LOW, ±15 m tolerance. Proof:
  cover shot "AGL 148 FT · HIGH", landing shot "AGL 152 FT · HIGH".
  (main.js, hud.js, game/index.html)
- [x] **Cover no longer a debris lottery.** The staged blast at
  50.35 s sits ~14 m from the chase camera, so debris (10–26 m/s)
  and the airframe halves (36 m/s) crossed the lens in <1 s and the
  51.6 s cover caught a random giant fragment in the HUD corner
  (different every run — Math.random). Debris shrunk (0.4–1.0 m,
  32→24, burning 8) and `PLAY_SECONDS` moved 51.6 → 49.5: the cover
  now catches the pre-collision convergence — player on the final
  leg, rivals closing on the meet point ahead, storm visible —
  deterministic every run. Proof: cover shot 93,971 bytes, RING
  12/12, 0:49, no fragments, no bubbles. (effects.js, shots.js)

## Course & rings

- [x] **12 rings all above ground (none inside terrain/hills).**
  Proof: `probe-v18.mjs` clearance seeds 1–3 — ringMin 92 / 56.2 /
  74.1 m, legMin 116.1 / 51.3 / 94.8 m (leg clearance = min terrain
  clearance along the straight spawn→ring legs). Sim flies 12/12 rings
  on seeds 1–12 (no ring unreachable). (`/tmp/probe-v18.log`)

## Explosion

- [x] **Collision explosion clearly visible from afar (fireball + smoke,
  not a pile of dark circles).**
  Proof: v19 fireball is bigger — shell 42 m / 3.5 s, core 24 m,
  inner 14 m (was 34 m / 2.8 s). The staged cover no longer shows
  the blast: `PLAY_SECONDS` moved to 49.5 s (pre-collision
  convergence, deterministic — see "What changed in v19" above),
  so the explosion proof moves to the LIVE probe Phase A: the
  immediate blast screenshot must show the fireball in frame, and
  the +1.5 s frame must show it developing. The blast gate is
  tighter (80–300 m, facing >0.88) and the message now clears from
  the DOM text itself (hud.js `textContent = ''`), checked strictly
  in the probe. Sim probe seeds 1–12: 12/12 collisions
  (33.9–51.5 s). (`/tmp/probe-v19.log`, live probe below)

## Storm

- [x] **Tornado visible in camera view along the course.**
  Proof: title screenshot `screenshots/3-start.jpg` (tornado + dark
  cloud + rain behind the title) and cockpit screenshot
  `screenshots/2-cockpit.jpg` (tornado + cumulonimbus + rain ahead).
  Storm check: tornado 260 m from the course, 36 storm meshes, rain
  1 line segment. (`/tmp/probe-v18.log`)

## Shadows

- [x] **5 plane shadows (ours + 4 rivals) + 5 contact shadows.**
  Proof: live probe Phase C counts the shadow meshes (sun-offset
  ellipses + the v19 contact shadows directly under each plane).
  Staged proof: cover shot — a dark ellipse under the player plane
  on the grass; landing shot — the shadow under the plane on the
  runway. (v18 proof: Phase C count=5, all `vis=true`.)

## HUD

- [x] **HUD not clipped, race position readable.**
  Proof: HUD right edge 1266 < viewport 1280 (no overflow) in every
  probe run. Screenshots show POSITION 1/5 (cover, landing) and 2/5
  (cockpit), RING n/12 chip, ring pointer pill "RING 10 · 106 m".
  (`/tmp/probe-v18.log`, `screenshots/*.jpg`)

- [x] **Instruction text contrast (dark navy #132238, not white on
  bright sky).**
  Proof: title screenshot `screenshots/3-start.jpg` — the three rules
  ("Fly through all 12 glowing rings…", "Centre a ring for a bonus…",
  "Slow down too much…") in dark navy on a light translucent pill,
  readable against bright sky. CSS: `#title-rules .rule { color:
  #132238 }` (`game/index.html:88`). User instruction 26 Nov 23:49 WIB.

## Cockpit

- [x] **Cockpit enclosed, 5 dials readable, pillars not heavy.**
  Proof: cockpit screenshot `screenshots/2-cockpit.jpg` — 5 dials on
  light faces (#F8FAFC) with 84 px numbers at radius 120 (v19: was
  96 px at 138, glyphs hit the tick ring) and the sub-label in a
  separate navy badge clear of the "6" and the needle pivot; ticks
  shorter (long 180 / major 190 / minor 200, all to 216), needle
  #E53935, labels IAS/ALT/HDG/VSI/RPM, VSI as the 6th gauge. Numbers
  do not overlap. Pillars slimmed to 0.05 m, trim #242B35 (v19),
  glareshield #C93B2B accent. Windshield, glareshield and console
  read as separate built parts. (The leftmost dial is half-clipped by
  the frame edge in the staged shot; the 5 dials are all present.)

## Runway

- [x] **Runway flat, blending into the terrain, no step.**
  Proof: landing screenshot `screenshots/4-landing.jpg` — dark asphalt
  strip #2B303A with sharp "09" (canvas texture, anisotropy 8),
  dashed centreline and piano keys sits on the mown airfield plateau,
  grass fading into the hills with no raised edge; fuel truck on the
  apron. Code: runwayBlend plateau spans the strip + 60 m past each
  end, fading 250–360 m (v14/v16). Live probe Phase B: RACE COMPLETE
  in 15.08 s, Position 1/5, Score 2999, touchdown (1113.2, 95.6, 120),
  lat 0 the whole final, roll 0, Space restart without canvas click
  works. (`/tmp/probe-v18-live.log`)

## Clouds

- [x] **Clouds physically sensible and story-coherent (one dark storm
  wall, bright clouds elsewhere, no grey discs).**
  Proof: title / cockpit / cover screenshots — one dark cumulonimbus
  mass + tornado on the storm side, white multi-puff cumulus elsewhere,
  blue sky between. v19: cloud material is FULLY OPAQUE (no more
  transparent pass that read as grey bubbles) and lobes are smaller
  (base 40–60 m, lower 30–50 m, top 25–40 m). The cockpit shot reads
  as small faceted puffs; 2 faint small discs remain at the far right
  edge of the cockpit frame — the residual is noted honestly, not
  claimed gone. The cover shot has no discs at all.

## 3-tier sim (Layer 1) — `sim-3tier.mjs`, pure Node

- [x] **Reference (autopilot) passes 12 rings AND lands.**
  Proof: `node sim-3tier.mjs` exit 0 — Reference 12/12 rings, landed,
  finished, score 3410, time 59.6 s, touchdown (1282, 92, 119) on the
  runway (centre 1250, 120, height 94). (v20: 12/12, 59.6 s, 3406.)
  The landing uses the probe's 'land' regulator (VS-hold +
  heading-hold, idle throttle); the pursuit autopilot alone levels
  off and never touches down.
- [x] **Weak (noisy input) gets some rings, does not finish.**
  Proof: same run — Weak **7/12 rings** (v20: 7/12 — HELD, honestly),
  no finish, score 1367, still flying at 300 s. The gentler early
  course (wander 0.12 rad, jitter ±12 m on rings 1–5) helps the noisy
  pilot recover instead of oscillating away. The criterion still holds
  (some rings, no finish). The Weak model is a 0.5 s reaction lag + a
  slowly-wandering bias (new every 2 s) + 8% lets-go; white per-step
  noise alone still passed 12/12, and a 1.5 s lag crashed it (0 rings).
- [x] **Idle (no input) fails (no finish / crash).**
  Proof: same run — Idle 3/12 rings (rings 1–3 lie near the spawn
  line), no finish, score 427, flew straight to (19958, 155, 4468),
  still flying at 300 s. Doing nothing cannot finish the course.

## Headless tests (Layer 2) — `test/headless.test.mjs`, Node

- [x] **No input → heading holds (v16 regression).**
  Proof: `node test/headless.test.mjs` 18/18 pass (v21: was 16/16).
  Zero input, 20 s: drift 0.00°, roll 0.000. Zero stick + the
  live-play gust applied exactly as main.js does (gust on the stick,
  stickRoll = 0): drift 0.00°, roll 0.000. The v16 sine gust would
  have drifted ~50°+.
- [x] **Pitch holds with zero stick + gust (v18, the v17 trim bug).**
  Proof: same run — test 5: 20 s cruise, pitch 0.000 rad, maxPitch
  0.000 rad; a locked 0.30 rad trim decays to 0.000 rad in 5 s.
  (v17 live: 1 W tap locked pitch up permanently.)
- [x] **Pitch taps are symmetric and ~2x stronger (v19, finding (e)).**
  Proof: same run — test 7: 1 s hold, S −26.4 m / W +24.8 m, ratio
  1.06 (0.6–1.4 band), each |Δalt| > 8 m. (v18: 6× S taps only
  −41 ft live.)
- [x] **Ring 1→2 leg is long enough and the turn is gentle (v19,
  finding (a)).**
  Proof: same run — test 8: leg 1→2 = 206 m (≥ 200 m), turn
  spawn→1 vs 1→2 = 1.1° (< 0.5 rad). The leg is 206 m by
  construction; the fix is pitch authority (test 7), not length.
- [x] **Blast gate does not fire at 400 m (v19, finding (b)).**
  Proof: same run — test 9: a pair 400 m away, facing the player,
  fires in NO branch (inView / lateFire / relFire all false).
- [x] **Tap-rate-limited pilot passes ring 2 (v20, finding (a)).**
  Proof: same run — test 15: stick live 0.2 s per 0.5 s (40% duty),
  throttle held, rings=2 at 11.7 s (limit 30 s), still flying. The
  v19 live playtest failed ring 2 in 3/3 tap flights; the forgiving
  early course (wander 0.12 rad, jitter ±12 m) is what makes this
  possible. Live proof: probe phase A9 (33% duty tap driver).
- [x] **Ring-1 pass pays a toast-worthy bonus (v20, finding (e)).**
  Proof: same run — test 16: centre pass bonus=150 (100 ring + 50
  centre), half-radius pass bonus=125 (≥ 120). The 4.0 s toast
  "RING 1/12 +bonus" announces a real number. Live proof: probe
  phase A6 reads the toast text right after the pass.
- [x] **Tap-rate-limited pilot passes ring 5 (v21, finding (5)).**
  Proof: same run — test 17: stick live 0.2 s per 0.5 s (40% duty),
  throttle held, rings=5 at 20.9 s (limit 45 s), still flying. The
  v20 live playtest failed ring 5 in 3/3 tap flights (the first real
  turn); the forgiving early course (wander 0.12 rad, jitter ±12 m
  on rings 1–5) is what makes this possible. Live proof: probe
  phase A9 (PWM tap driver — see the live-probe section; the full
  probe's A9 run stalled at ring 3 once, the focused diag passed
  ring 5 in 23.5 s).
- [x] **Early legs are long and gentle (v21, finding (5)).**
  Proof: same run — test 18: legs 1–5 = [600, 206, 206, 206, 206] m
  (all ≥ 200 m), sharpest turn into rings 2–5 = 3.3° (limit 29°).
  Guards the ring-5 softening so it cannot collapse the course.
- [x] **No-input straight flight passes ring 1 (v18).**
  Proof: same run — test 6: rings=1 at 7.4 s, status flying. (v17
  live: 0/12 rings, ring 1 missed by 28–45 m — trim lock-in + gust
  pitch random-walk, fixed by the pitch auto-level. Ring 1 was NOT
  moved: the spawn line already crosses it ~10 m from centre.)
- [x] **Ring-centre pass counts (and a clear miss does not).**
  Proof: same run — centre pass (0.00 m off-centre) counts, bonus
  150; clear miss (49.99 m off-centre) does not count; near-miss
  (15.00 m off-centre) is a near-miss, bonus 10.
- [x] **Crossing rivals fire the collision gate (and far rivals do not).**
  Proof: same run — both rivals <80 m, player 200 m away facing
  1.00: fire = true (blastDist 200 m). Rivals 300 m away: no fire.
  relFire on its terms (both <130 m, facing 0.80, t=45): relFire =
  true, fire = false. No partner rival: no fire.

## Live probe (v21d FINAL — exit 0, errors: none, ~56 min, + B2-FOCUS)

Full probe `probe-v21-live.mjs` on the v21d code (storm deck + rings
under black clouds + lightning by the rings), output
`~/workspace/probe-v21d-live.out`. All phases PASS except B2's first
attempt (see below — fixed in the probe, re-proven by B2-FOCUS).

- [x] **Spawn + title hero camera + gear hidden + HUD (D).** spawnY
  58 (AGL ~58 m, the low start), heading 103°, minClearAhead400
  46.9 m, ring1Dist 600. Gear on title: display none, titleShown
  flex. Hero camera PASS: camSouth 28, camEast 2, camAbove 4,
  fwdZ −0.96, planeOffDeg 11.7 (the plane reads large at the right,
  ~12° off the look direction). Camera-behind dot −0.908, above
  4.2 m. HUD right edge 1266 < 1280 (no overflow).
  Screenshot `live-shots/v21-live-title.jpg` (101,146 byte): the
  final title layout exactly as approved (gold title, all-gold
  mission + terrain, big gold play circle + START, 6 light chips,
  no side box, no gear) over a clean hero background (turquoise sea
  + beach + green hill, NO storm, NO deck).
- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 57.7, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  samples=120 bad=0 minDot −0.92 minAboveM 4 maxPitch 0.48, climbCam
  dot −0.895 above 4.2 m pitch 0.78 rings 6, PASS=true.
- [x] **No-input straight flight passes ring 1 + toast visible (A6).**
  rings=1 at 8.75 s, y 58, still flying. The toast reads
  "RING 1/12  +150", opacity 1, PASS=true.
  Screenshot `live-shots/v21-live-noinput-ring1.jpg` (122,591 byte).
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring 2 with HELD keys (A8).** rings=2, ring2At=13.5 s,
  minDistToRing2=7 m, PASS=true.
- [x] **Ring 5 with TAPS (A9 — finding (5)).** PASS in the FULL
  probe this time (first try): rings=5, ring5At=24.7 s,
  minDistToRing5=6 m (limit 45 s). Screenshot
  `live-shots/v21-live-ring5-tap.jpg` (122,302 byte): **"RING 5/12
  +231" big in gold, score 911, RING 6 · 127 m, POSITION 3/5, 0:26**,
  the plane banking hard in 3/4 over turquoise sea + beach with the
  gold ring 6 ahead (a rival inside it), the black deck across the
  top, rain streaks, two tornado funnels + a big one at the right
  edge, steep green hills. (The v21 pre-title full probe's A9
  failed once (rings=2 at 45.2 s) and passed 2/2 in focused runs at
  23.5 s; this run passes in the full probe at 24.7 s — the tap
  driver is marginal by nature (the 250 ms tick is real time, so
  ticks per game second shift with game speed), but the headless
  test 17 remains the repeatable proof.)
- [x] **Chase 3/4 angle (A10 — finding (4)).**
  samples=120, off-dead-rear min 22.8° / median 24.8° / max 26.6°,
  PASS=true (median 15–35°, never below 8°). The v21 live chase
  (13 m / −6 m ≈ 25°) holds its 3/4 angle through straight flight,
  turns and a climb — the v20 dead-rear is gone by measurement.
  Screenshot `live-shots/v21-live-cam-turn34.jpg` (121,441 byte).
- [x] **Ring blast visible (A) + message REALLY clears (finding (b)).**
  Blast t=43.6 (rings 7) at (48,174,68); immediate shot:
  blastDist 179 m, facing 0.88, rings 8; +1.5 s shot: rings 8,
  hudMsg "RING 8/12  +280"; +4.5 s: text="" opacity 0, PASS=true.
  Rival visibility 11/15 (the pair is converging, so fewer rivals
  are in frame than the 16/16 of the v21 pre-title run). The
  scripted collision still fires — no tornado killed KUNING/HIJAU
  before it (they converge near rings 6–7, far from spout3 at ring
  4). Screenshot `live-shots/v21-live-blast.jpg` (114,052 byte).
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=43.2 (player 0 rings, offCourse 76 m). Rival visibility 12/15.
  Screenshot `live-shots/v21-live-blast-straight.jpg` (104,824 byte).
- [x] **Player crash explodes — as an OBJECT on a wide camera (A4,
  finding (6)).** CRASH at t=29.1, 18 fireball meshes at impact,
  20 at +1.5 s. Camera 69 m from the ACTUAL crash point
  (497,17,144) and 35 m above the ground, PASS=true. The canonical
  shot `live-shots/v21-live-crash-15.jpg` (81,517 byte) shows the
  faceted red/orange/white fireball as a SMALL OBJECT at the centre
  on the grass with dark debris around it, trees + hills + the whole
  scene visible — NOT a screen-filling blob (the v20 live playtest
  failure). The smoke is dark grey and clustered, not pale balls.
  Honest caveat: the fireball reads small at 69 m (a small
  red/white mass at the centre) — it is an object, but not a big
  dramatic one.
- [x] **Ten shadows (C).** count=10, 9/10 vis=true (5 sun-offset +
  5 contact). The one hidden shadow (−836,1,−247) is a contact
  shadow whose plane is temporarily 'gone' (respawning) — a hidden
  plane has no shadow, which is correct behaviour, not a missing
  shadow. Phase C has no PASS/FAIL gate in the probe (it logs count
  + visibility); the count is 10 as designed and the rival shadows
  are 1.3x / 1.25x in v21.
- [x] **Finish end-to-end (B).** RACE COMPLETE 14.2 s, Position 1/5,
  Score 3008, Time 0:14, touchdown (1096.2, 91.9, 120), lat 0, roll 0,
  Space restart without canvas click works. Screenshots
  `live-shots/v21-live-finish-a.jpg` (106,649 byte) + `-b`
  (106,811 byte): the "🏁 RACE COMPLETE!" panel (Position 1/5,
  Score 3008, Time 0:14) over the runway with confetti.
- [ ] **Manual landing from ring 12 (B2) — FIRST ATTEMPT FAILED
  (probe/driver, NOT a game bug).** The first B2 flew the whole
  course with the binary 'ring' driver to reach ring 12 — but late
  in a ~50 min probe the game runs slower, the 250 ms driver ticks
  over-correct, and the plane orbited ring 2/3 (it reached only
  ring 2 in 120 s, roll 1.35, yaw 58.9°), then the scripted
  collision pair caught the slow player at ring 4 (collision at
  63.8 s, (−910,133,−141)) and reset it to ring 2. B2's purpose is
  the MANUAL LANDING, not the course flight — the course flight is
  already proven by phase A (ring 8) and A9 (ring 5 with taps).
  **Probe fix (v21d, no game change):** B2 now TELEPORTS to ring 12
  (ringsPassed = 12, like phase B's teleport to short final) and
  human-lands from there. The probe file carries the fix.
- [x] **Manual landing from ring 12 (B2-FOCUS re-probe).**
  `~/workspace/probe-b2-focus.mjs` (reuses the full probe's
  DRIVER_SRC, same Playwright/Chromium) — teleported to ring 12
  (729,145,122), yaw 1.57, rings 12; the human-land driver (throttle
  held at 0.3, VS −5, flare −2 below 12 m AGL) flew the final and
  **RACE COMPLETE, touchdown (1478, 92, 122), spd 52, VS −11.2,
  thr 0.29, status landed, rings 12, errors [] — PASS=true.**
  The diag shows a clean descent (t=1.3 y 145 agl 89 spd 62 thr 0.7
  → t=6.7 y 117 agl 26 spd 64 thr 0.28 → t=9.5 y 102 agl 12 spd 58
  vs −2 thr 0.06 → t=12.3 y 101 agl 10 spd 53 vs −11.7 thr 0.28).
  Screenshot `live-shots/v21-live-manual-landing.jpg` (86,916
  byte): the "🏁 RACE COMPLETE!" panel (Position 1/5, Score 2772,
  Time 0:12) + confetti + "AGL 5 FT · ON GLIDE", the plane on the
  runway. **This is the live proof the v21b fix works: a human
  approach at throttle 0.3 / VS −5 now WINS instead of crashing**
  (the user's 27 Nov 09:39 playtest). Honest caveat: the touchdown
  VS (−11.2 m/s) is close to the −12 cap and the touchdown (x=1478)
  is at the far end of the runway (the runway spans 1025–1475, the
  finish zone 945–1555) — the human-land driver's flare is weak in
  the last seconds (VS went from −2 at t=9.5 to −11.7 at t=12.3),
  so the landing is firm and long. It is inside the v21b window
  (speed < 62, VS < 12), and the sim's manual route lands at
  (1351, 92, 120) — the live driver just floats further. A
  candidate for v22: a stronger flare in the human-land driver.
- [x] **Tornado kills a rival — VISUAL PROOF (A11, NEW in v21c).**
  At 15 s the rival furthest ahead (KUNING, #3) was teleported into
  spout3 (near ring 4, (−882,−259), radius 35 m). The tornado-kill
  event fired at 15.27 s (0.27 s after the teleport):
  kind "tornado-kill", name KUNING, (−881.7,100.6,−258.6);
  victimGone=true; playerPosition 3/5 → 2/5 — PASS=true.
  Screenshot `live-shots/v21-live-tornado-kill.jpg` (134,025 byte):
  the HUD message **"🌪️ KUNING DESTROYED BY THE TORNADO!" big in
  gold**, POSITION 2/5, RING 2/12, 0:17, 318 FT, 104 KTS, score 285,
  RING 3 · 49 m; a large red/orange faceted fireball wraps the grey
  layered tornado funnel (spout3) at the LEFT, the gold ring 3 sits
  UNDER the black deck at the centre, rain streaks everywhere, the
  player's plane banking 3/4 at the bottom-right. The +1 s shot
  (`v21-live-tornado-kill-1s.jpg`, 126,864 byte) shows the aftermath:
  "RING 3/12 +181", POSITION 2/5, the fireball faded to faint pink
  translucent shapes around the funnel (the 3.5 s fireball life),
  the tornado still spinning, the gold ring 4 under the deck.
  Honest caveat: the fireball is at the LEFT edge (partially out of
  frame) and the torn-apart halves are not clearly distinguishable
  as separate airframe pieces in the immediate shot — the explosion
  + the HUD message + the position improvement together prove the
  kill, but a dead-centre explosion would read stronger.

## Live probe (v20 — exit 0, errors: none, ~30 min)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 154.8, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  samples=120 bad=0 minDot −0.96 minAboveM 4 maxPitch 0.45, climbCam
  dot −0.96 above 4.2 m pitch 0.65 rings 2, PASS=true.
- [x] **No-input straight flight passes ring 1 + toast visible (A6).**
  rings=1 at 8.75 s, y 155, still flying. The toast reads
  `#hud-msg` = "RING 1/12  +112", opacity 1 — the probe's own
  PASS flag read false only because its check string used ONE space
  ("RING 1/12 +") while main.js's template writes TWO ("RING 1/12
  +112"); the toast itself is proven by the DOM text AND by the
  live screenshot `live-shots/v20-live-noinput-ring1.jpg` (105,845
  byte), where "RING 1/12 +112" stands big in gold across the
  middle of the frame, with ring 2 ahead (97 m), the funnel + smooth
  grey storm cloud, rain, and rivals #4/#5 as compact navy pills.
  (The check string was fixed in the probe file afterwards.)
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring 2 with HELD keys (A8).** rings=2, ring2At=13.3 s,
  minDistToRing2=11 m, PASS=true. (v19: 13.8 s / 10 m and 13.5 s /
  13 m — the same forgiving course.)
- [x] **Ring 2 with TAPS (A9, NEW in v20 — finding (a)).** The full
  probe's first tap driver (fixed 1 tick in 3 at full deflection)
  FAILED: rings=0 in 30.2 s, distNext 62.4 m — a 250 ms
  full-deflection pulse banks ~0.22 rad and never converges with a
  500 ms dead time. Rev 2 (sigma-delta PWM tap driver, same model as
  headless test 15) PASSED in the focused re-probe
  (`/tmp/probe-a9-v20.mjs`): screenshot
  `live-shots/v20-live-ring2-tap.jpg` (105,796 byte) shows
  **"RING 2/12 +165" at ~0:15, score 308, RING 3 · 120 m, POSITION
  2/5**, the plane banking hard over the sea with the funnel + storm
  cloud ahead. Honest caveat: the focused run was killed by a
  runtime restart before its log was written, so only ONE PWM-tap
  pass is screenshot-proven (the second attempt's log is lost);
  headless test 15 remains the repeatable proof.
- [x] **Ring blast visible (A) + message REALLY clears (finding (b)).**
  Blast t=40.4 (rings 4) at (−380,176,−97); immediate shot:
  blastDist 272 m, facing 0.92; +1.5 s shot: hudMsg="" (empty), no
  collision text in the body; +4.5 s: text="" opacity 0, PASS=true.
  Rival visibility 11/14. Screenshot
  `live-shots/v20-live-blast.jpg` (102,229 byte): a large faceted
  red/orange fireball top-right, "💥 MID-AIR COLLISION!" in gold
  across the middle, the gold ring in frame, a rival mid-frame,
  rain, RING 5 · 112 m, POSITION 2/5 — the blast is unmistakable in
  frame.
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=41.0 (player 0 rings, offCourse 80 m). Rival visibility 13/14.
- [x] **Player crash explodes — as an OBJECT on a wide camera, with
  the camera held off the hillside (A4, finding (c)).** CRASH at
  t=28.9, 3 fireball meshes at impact, 5 at +1.5 s, "Crashed!" panel
  (hidden for the capture). The v20 crash camera
  (`setChase(48, -12, crashHeight, 40)` + terrain clamp, 3.0 s beat)
  frames the fireball dead-centre: the canonical shot
  `live-shots/v20-live-crash-15.jpg` (87,456 byte, rev 3) shows the
  faceted red/orange/yellow fireball dead-centre on the grass with
  red debris fragments around it and a rival overhead — (c) proven
  in the canonical live shots. **Smoke (rev 2 + rev 3):** the full
  probe's crash frame showed the blast smoke as ~8 big PALE
  translucent spheres scattered over the grass — a third bubble
  source the v19 fix missed. Rev 2 removed the pale #CBD5E1 puffs
  and tightened the cluster (±18 m); the re-probe frame still
  showed pale spheres (0.55 opacity over bright sand washes the
  mid-slate out). Rev 3 raised the blast-smoke opacity to 0.85 and
  dropped the lightest colour (smoke now #475569 / #64748B only):
  the final frame's puffs are dark grey, clustered on the
  fireball, and read as smoke around an explosion — a faint
  spherical read remains on close inspection, but the frame reads
  as a blast, not a field of bubbles. Two focused crash re-probes
  (`/tmp/probe-crash-v20.mjs`, exit 0, errors none) both crashed at
  t=29.1 with 3 → 5 fireball meshes.
- [x] **10 shadow meshes (C, finding (d)).** count=10, all
  `vis=true` (5 sun-offset ellipses + 5 contact shadows — the full
  set this time; v19 counted 9 because the crashed player's contact
  shadow was hidden on the crash page). The staged cover/landing
  shots show the dark contact ellipse under the player plane on the
  grass/runway.
- [x] **Gear button hidden on the title (D, finding (d)).**
  `getComputedStyle(#btn-gear).display === 'none'` on the title,
  PASS=true; title shown flex. (v19 only hid Fuel + 0/12.)
- [x] **Finish end-to-end (B).** RACE COMPLETE in 13.00 s,
  Position 1/5, Score 2770, touchdown (1073.2, 91.9, 120), lat 0
  the whole final, roll 0, Space restart without canvas click works.
- [x] **Spawn / HUD (D).** spawnY 155, heading 103°, minClear
  144 m, ring1Dist 600; camera-behind dot −0.95, above 4.2 m; HUD
  right edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas
  focused.

## Live probe (v19, run 1 — exit 0, errors: none, ~29 min)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 148.75, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  samples=120 bad=0 minDot −0.96 minAboveM 4 maxPitch 0.52, climbCam
  dot −0.96 above 4.2 m pitch 0.65 rings 4, PASS=true.
- [x] **No-input straight flight passes ring 1 (A6).** rings=1 at
  8.75 s, y 149, still flying.
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring 2 with HELD keys (A8, NEW in v19 — finding (a)).**
  rings=2, ring2At=13.8 s (run 1) / 13.5 s (run 2), minDistToRing2=
  10 m (run 1) / 13 m (run 2), PASS=true in both runs. (v18 live
  playtest: 0/5 flights, closest 212 m.) The driver holds keys on a
  250 ms loop (not taps). Screenshot run 1
  `live-shots/v19-live-ring2.jpg`: "RING 2/12 +148" toast, ring 3 at
  126 m, tornado + rain ahead, the player over the sea — the pitch
  fix works for a held-key pilot. Screenshot run 2 (107,214 byte):
  "RING 2/12 +133", ring 3 at 121 m with the gold ring visible,
  tornado + rain, POSITION 2/5. Honest caveat: the dark storm anvil
  dominates the top-right of the run-2 shot.
- [x] **Ring blast visible (A) + message REALLY clears (finding (b)).**
  Blast t=50.8 (run 1, rings 8) / t=40.2 (run 2, rings 2) at
  (361,174,121) / (−865,184,−197); immediate shot: blastDist
  264 m / 258 m, facing 0.89 / 0.86; +1.5 s shot: hudMsg="" (empty),
  no collision text in the body; +4.5 s: text="" opacity 0,
  PASS=true (STRICT — the text itself is gone, not just invisible —
  the v18 live failure is fixed at the root). Rival visibility 17/18
  (run 1) / 10/14 (run 2 — the player turned away from the pair this
  run; the blast still fired in view). Screenshot run 1
  `live-shots/v19-live-blast.jpg`: a large red/orange faceted
  fireball top-right with debris sparks + smoke, "💥 MID-AIR
  COLLISION!" in gold, ring pointer "RING 9 · 110 m", two rivals in
  frame, POSITION 3/5, RING 8/12. (The fireball is cut at the top-right
  corner — big and close — but reads clearly as an explosion.)
  Screenshot run 2 (113,874 byte): even better — the fireball fills
  the LEFT third of the frame as faceted red/orange lobes with sparks,
  "💥 MID-AIR COLLISION!" across the middle, tornado vortex + rain
  dead ahead, player in chase view over the sea, RING 3 · 63 m,
  POSITION 2/5. Honest caveat: the storm anvil is very dark/blocky
  and dominates the top of the frame.
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=40.9 (player 0 rings, offCourse 139 m). The player-relative
  anchor (766, 219, 269) held from t=18.5 with NO re-anchor leapfrog.
  Rival visibility 13/14.
- [x] **Player crash explodes — as an OBJECT on a wide camera
  (A4, finding (c)).** CRASH at t=28.7, 3 fireball meshes at impact,
  5 at +1.5 s, "Crashed!" panel. The v19 wide crash camera
  (`setChase(45, -10, 20, 40)`) + 1.5 s `crashing` beat frame the
  fireball dead-centre: NDC projection (diag-crash, deterministic
  same setup) puts the fireball meshes at NDC (0.09,−0.21), 49 m
  from the camera, scales growing 2.4→5.6 — in front of the camera,
  not inside the terrain. The unmodified probe screenshots show only
  the fireball's lower orange edge: the "Crashed!" panel covers the
  exact centre where the fireball sits, and headless screenshot
  latency exceeds the 1.5 s beat. (The same geometry was proven
  earlier with a diagnostic capture that hid ONLY the panel in-page
  — the game untouched — showing the faceted fireball dead-centre;
  that diagnostic script and its shots were scratch and were removed
  before commit.) **Run 2 re-takes the A4 screenshots with the panel
  hidden for the capture ("hide panel: hidden" logged twice, exit
  0): the +1.5 s canonical shot
  `live-shots/v19-live-crash-15.jpg` (81,066 byte) shows the
  fireball CLEARLY as a faceted red/orange/yellow object dead-centre
  on the sand, with smoke puffs and red debris fragments around it —
  (c) proven in the canonical live shots. Honest caveat: the
  *immediate* capture `v19-live-crash.jpg` still shows the "Crashed!"
  panel (endGame re-displays it between the hide and the capture);
  the +1.5 s capture is the one that holds the hide. At 60 fps the
  player sees the fireball for 1.5 s before the panel appears.**
- [x] **9 shadow meshes (C, finding (d)).** count=9, all `vis=true`
  (5 sun-offset ellipses + 4 contact shadows — the crashed player's
  contact shadow is hidden on the crash page, which is where phase C
  runs; v18: count=5). The staged cover/landing shots show the
  contact shadow under the player plane.
- [x] **Finish end-to-end (B).** RACE COMPLETE in 14.13 s (run 1) /
  13.00 s (run 2), Position 1/5, Score 3009 (run 1) / 2770 (run 2),
  touchdown (1078, 95.6, 120), lat 0 the whole final, roll 0, Space
  restart without canvas click works.
- [x] **Spawn / HUD (D).** spawnY 149, heading 104°, minClear
  137.6 m, ring1Dist 600; camera-behind dot −0.95, above 4.2 m; HUD
  right edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas
  focused.

## Live probe (v18, run 1 — `/tmp/probe-v18-live.log`, exit 0, errors: none)

- [x] **Hands-off holds heading (A3).** 0° drift in 20 s, maxRoll 0,
  maxPitch 0, still flying (y 148.75, speed 75.4).
- [x] **Chase camera behind + above through turns and a steep climb (A5).**
  PRE-FIX FAIL in this run: 30/120 bad samples, min above −8 m —
  the dot was always < 0 (behind ✓) but the camera sank below the
  plane in climbs (fixed-1/60 lerp vs several sim steps per frame at
  low FPS); climbCam above 0.09 m. FIXED in render.js (lerp rate 8 +
  height floor plane.y + 2.5 m, syntax OK). RE-CHECK 1
  (`probe-v18-a5.mjs`, `/tmp/probe-v18-a5.log`, exit 0): samples=120
  bad=0 minDot −1.00 minAboveM 3 maxPitch 0.36, climbCam dot −0.65
  above 2.5 m, PASS=true — BUT the re-check screenshots then showed
  the plane INVISIBLE in live chase view (v18-live-cam-turn2/climb2,
  v18-live-start/blast): the numbers only proved behind+above, never
  DISTANCE. Diagnosis (27 Nov, NDC projection + 3x-scale + hide
  bisection, scratch scripts since deleted): the plane group was
  visible, at the right position, dead-centre in frame (NDC angle
  3.5°) — but the camera sat 25–150 m behind it instead of the 12.3 m
  chase geometry, because the lerp ran once per rendered frame with a
  fixed 1/60 dt while the sim advanced several steps per frame at low
  FPS, so the plane read as a 30–80 px speck lost in the storm
  clutter (and ~10 m lag even at 60 fps — the "plane small/lost" of
  the v16/v17 playtests). FIXED v18c in render.js + main.js:
  feedforward (chasePos translates by the plane's own displacement
  each draw) + the live draw gets the REAL frame dt (staged shots
  still pass 1/60, unchanged). RE-CHECK 2 (`probe-v18-a5.mjs`,
  `/tmp/probe-v18-a5c.log`, exit 0, errors none): samples=120 bad=0
  minDot −0.96 minAboveM 4 **maxDistM 12** maxPitch 0.37, climbCam
  dot −0.95 above 4.2 m **dist 12.27 m** pitch 0.51, PASS=true — and
  the new cam-turn2/climb2 screenshots show the plane BIG and clearly
  visible in chase view (turn: plane over the sea toward ring 2,
  "RING 1/12 +143"; climb: plane fills the lower frame from
  behind/above in a steep W climb, sky ahead — expected at pitch 0.51).
- [x] **No-input straight flight passes ring 1 (A6).** rings=1 at
  8.75 s, y 149, still flying.
- [x] **R restarts mid-flight; C switches camera while paused (A7).**
  R after 8.2 s flight: elapsed 0.2, rings 0, status flying. C while
  paused: HUD "COCKPIT VIEW", pause panel flex.
- [x] **Ring blast visible (A) + message clears in ~2.5 s real time.**
  Blast t=53.1 (rings 7), 338 m, facing 0.92, HUD "💥 MID-AIR
  COLLISION!" at +1.5 s, message opacity 0 by +4.5 s. Rival
  visibility 14/19. (Later than v17's 37.6–41.1 s — the pair
  re-anchored twice as the player turned away from the first point,
  then fired once both held and the player faced it; the gates work,
  the assembly is slower.)
- [x] **Fast straight player sees a blast (A2).** STRAIGHT blast
  t=40.0 (player 0 rings, offCourse 187 m). The player-relative
  anchor (834, 163, 340) held from t=18.5 with NO re-anchor leapfrog;
  pair holding at t=35.7 (dMeet 92/90). Rival visibility 14/14.
- [x] **Player crash explodes (A4).** CRASH at t=29.8, 3 fireball
  meshes at impact, 5 at +1.5 s, "Crashed!" panel. (Slower to crash
  than v17: the pitch auto-level levels the −0.5 nose-down teleport,
  so the plane cruises at ~30 m until a hill rises into it — the
  crash still explodes.)
- [x] **Finish end-to-end (B).** RACE COMPLETE in 15.08 s, Position
  1/5, Score 2999, touchdown (1113.2, 95.6, 120), lat 0 the whole
  final, roll 0, Space restart without canvas click works.
- [x] **5 shadows (C).** count=5, all `vis=true`.
- [x] **Spawn / HUD (D).** spawnY 149, heading 105°, minClear 137.5 m,
  ring1Dist 600; camera-behind dot −0.999, above 4.2 m; HUD right
  edge 1266 < 1280, ring pointer "RING 1 · 460 m", canvas focused.

Note: phases A2/A4/C/B loaded fresh pages AFTER the mid-run render.js
camera-floor fix, so they ran on the fixed code; phases D/A3/A5/A6/A7/A
ran on the pre-fix code. The fix touches only the chase-camera
tracking, so the A/A2/A4/C/B results stand; only A5 needed the
focused re-check above.

## Final gates (before commit)

- [x] 4 screenshots regenerated from the final code, byte-new vs v19.
  (Clean re-run `node shots.mjs`, exit 0, errors none, after the
  rev-3 smoke fix: cover 82,679, cockpit 118,572, start 112,964,
  landing 101,490 — all byte-new vs v19 (93,971 / 124,699 / 110,947 /
  98,589). Cover: mid-race ring 10/11, RING 12/12 Score 3406 0:43,
  469 FT, 129 KTS, "AGL 290 FT · HIGH", runway far centre-left,
  layered mountains, planted trees, a rival under a white faceted
  cloud top-right, prop disc a subtle grey blur at the nose. Cockpit:
  5 dials readable with real instrument scales + red needles, all in
  frame, ring 3 at 182 m, funnel + diagonal rain, smooth grey storm
  mass (not black rock), rivals #3/#5 as compact navy pills — 2
  faint small discs remain at the far right edge, a faint pink smear
  bottom-left, pill #3 half-clipped at the left edge. Title: gold
  navy-outlined title, white instruction card navy border + 3 sharp
  SVG icons + 3 readable lines, NO gear button top-right, tropical
  beach + planted palms, red rival over the beach, funnel with spray
  ring at its base, smooth grey anvil behind the title (reads as
  cloud, not rock). Landing: "LAND ON THE RUNWAY" + "AGL 81 FT · ON
  GLIDE", 0:47, 377 FT, 109 KTS, runway fills the frame, "09" +
  piano keys big, plane level over the centreline, planted trees both
  sides, hangar right. **Cover vs landing are clearly different:**
  different moments (0:43 vs 0:47), altitudes (469 vs 377 FT),
  speeds (129 vs 109 KTS), angles (runway far vs filling the frame),
  AGL (HIGH vs ON GLIDE). The score is the same (3406) in both
  because no ring is passed between them — noted honestly. Known
  remaining flaws (honest): 2 faint discs at the far right edge of
  the cockpit frame; the anvil still sits behind the title text
  "NUSANTARA"; the crash smoke keeps a faint spherical read on close
  inspection (rev 3); the PWM tap pass is screenshot-proven once
  only (second attempt's log lost to a runtime restart).)
- [x] Entrypoint run twice, byte-identical.
  (`MAKEFUN_OUTPUT_DIR=/tmp/out-v20c-a|b node main.ts` twice, exit 0;
  `diff -r` exit 0, both dirs 2,230,121 bytes, dossier.json sha256
  ad6106680b6666793699ca78d5f11c53a5608528c936416cf3e23c4df20dcbb0
  in both. v19: sha d8ae1e6c…, 2,249,269 bytes — the delta is the
  v20 code + the rev-2/rev-3 smoke edits + the v20 main.ts header.
  An earlier pair was run on the rev-3 code before the header edit
  (2,227,779 byte, sha 1eddfb9a…); the final pair above is on the
  final code.)
- [x] Bundle dry-run `--repo` exit 0.
  (`/tmp/bundle-v20.log`, ~128 s, exit 0. 24 session files found
  (v19: 23 — now includes this builder session). 0 errors. Standard
  warnings only: "0 usage rows attached" — the known turn-boundary
  issue (usage rows for the running turn are written when the turn
  ends; the coordinator re-runs the SELECT + bundle next turn) — and
  "repo.dirty" (resolved by the commit below). The kit CLI was used
  from the extracted kit in the workspace
  (`~/workspace/makefun/best-flight-game-20261126-0057-kit/.../cli/makefun.mjs`);
  /tmp/kit2-restore was wiped by a runtime restart mid-session, the
  workspace kit is intact, nothing was re-downloaded.)
- [x] **`node sim-3tier.mjs` all three routes as specified above.
  (Reference 12/12 + landed 59.6 s skor 3406; Weak 7/12 skor 1375 —
  UP from v19's 4/12, noted honestly; Idle 3/12 skor 427 no finish.
  Exit 0.)
- [x] `node test/headless.test.mjs` all tests pass. (16/16.)
- [x] Local git commit.
  (Commit 1: v20 code + probes + docs + verification + gate entry.
  Commit 2: this checklist update. Both exit 0. Push by the
  coordinator — the builder does not push/submit.)
