# Langit Nusantara — Ring Run: v18 Plan

Competition: make.fun "Make the best flight game", $500 (top 50 share).
Deadline: **Saturday 28 Nov 2026, 07:57 WIB**. Repo: `best-flight-game-20261126-0057`.

## The game (unchanged since v11)

A Three.js daytime flight game. You fly a Cessna 208 Caravan (Susi Air
livery) over a tropical archipelago, racing 4 rivals through **12 glowing
rings**, then landing on the runway. Chase cam (3/4 rear) + cockpit cam (C).
Controls: W/S pitch (W climbs), A/D roll, Q/E rudder, Shift/Ctrl throttle,
Space start, P pause, R restart, M sound. HUD is never faked: altitude,
speed, heading, time, score, race position, ring pointer.

## Why v18 exists

Blind test v17 (Gemini) verdict NO — but scores UP vs v16 across the
board (Cover 5.2 / Cockpit 4.5 / Title 5.8 / Landing 6.0). The remaining
criticism: the plane is a stack of rectangular blocks (flat slab wings /
tail, no taper), the explosion reads as confetti, the terrain is flat
green with sparse foliage, dial text overlaps, the cockpit framing is
heavy, the storm clouds are grey blobs, and the title has no emblem.
Live playtest v17 (27 Nov 02:13–02:28 WIB) added five P0 findings the
seed screenshots never showed: (a) the chase camera still faced the
plane's nose live (camera dropped BELOW the plane at steep locked-up
pitch — the chase offset used the full 3D forward); (b) 0/12 rings —
ring 1 missed by 28–45 m (trim lock-in + gust pitch random-walk, not
ring position); (c) the blast message lingered 15–40 s live (the HUD
timer ran on a fixed 1/60 per frame); (d) R and Space did not restart
mid-flight, C did not switch camera while paused; (e) tap controls too
coarse (1 W tap locked pitch up permanently).

## What v18 changes (patch on v17, never a rebuild)

**Flight / fairness (the P0 fixes)**
- Pitch auto-level gated on the raw stick (`stickPitch`, same pattern
  as v17's `stickRoll`): hands-off pitch holds at 0.000 rad for 20 s
  with the live gust applied; a locked 0.30 rad trim decays to 0 in
  5 s. Softer rates (pitchRate 0.9→0.7, rollRate 1.9→1.5, autoLevel
  0.55→0.7) so tap corrections can aim at rings.
- Ring 1 was NOT moved: the spawn geometry is exact (600 m back,
  spawn.y = ring1.y + 10, radius 13 m — straight flight crosses ~10 m
  from centre, a pass). The misses were the trim/gust random-walk,
  now fixed. New headless test 6: no-input straight flight passes
  ring 1 at 7.4 s.
- Chase camera uses a yaw-only horizontal forward (the old full-3D
  forward dropped the camera below the plane at steep pitch); the
  look target keeps half the pitch. Staging camera shifted right/up
  (28, −34, 6.5) so storm/rings are not behind the instruction pill.
  v18b: the chase lerp also got a HEIGHT FLOOR (camera never below
  plane.y + 2.5 m) + rate 8 — the fixed-1/60 lerp lagged up to 8 m
  below the plane in climbs at low FPS (live probe A5 pre-fix:
  30/120 bad samples, min above −8 m), the belly-in-frame complaint
  in a new shape. v18c: the A5 numbers then passed (behind + above)
  but the plane was STILL invisible in live chase screenshots — the
  numbers never measured DISTANCE, and the camera sat 25–150 m behind
  the plane at low FPS (diagnosed by NDC projection + a 3x-scale test:
  plane dead-centre in frame, angle 3.5°, but a 30–80 px speck). Fix:
  feedforward — chasePos translates by the plane's own displacement
  each draw, so straight flight has zero steady-state lag at any FPS
  — and the live draw gets the REAL frame dt (staged shots still pass
  1/60). A5 re-check 2: 120/120 good, maxDist 12 m (chase geometry
  12.3 m), climbCam dist 12.27 m at pitch 0.51.
- HUD message timer runs on real frame time (was fixed 1/60 per
  frame): the collision message clears in ~2.5 s of real time.
- R restarts from play / paused / over; C switches camera while
  paused.
- Race position latch: crashed rivals keep their latched position
  (rings + distance at the crash) instead of dropping out of the
  `ahead` count — the v17 5/5 → 2/5 → 5/5 jump.

**Visuals (Gemini v18 prompt, per scene)**
- Caravan faceted + tapered (`taperedPrism` helper): nose taper
  1.0→0.42, dark-windowed cabin #1E293B, wings tapered chord 1.6→1.15
  (0.72) with 3° dihedral, red tapered wingtips, wing struts, tapered
  stabiliser halves + red tips, dark wheels #1F2937, flatShading.
- Cockpit: pillars 0.05, trim #273244, glareshield #1E293B, red trim
  0.025; dial faces redrawn on a light face (#F8FAFC) with 96 px
  numbers at radius 138 and the sub-label in a separate navy badge
  clear of the "6" and the needle pivot.
- Terrain: slate cliffs #64748B/#4B5563, sand beach y 0–1.6, sea
  shallow #00C5D9 → deep #0284C7; foliage 2.5–3× denser mid-course
  (hero groves 26, ring 3–5 groves 16 each, bushes 320, tufts 160),
  runway corridor kept clear.
- Runway 09: asphalt #2B303A + dark underlay, "09"/"27" from a
  512×256 canvas texture (bold 180 px, anisotropy 8), 0.8 m edge +
  centreline dashes, fuel truck on the apron by the shed.
- Explosion 3-layer faceted: core #FFF3B0 / #FF9F1C / #E63946
  icosahedron/dodecahedron, slate smoke #475569/#64748B/#CBD5E1,
  chunky debris #334155/#C82828 with gravity.
- Storm: darker funnel (#8BA0B5/#6B7F92, wider), second anvil tier
  (5 lobes, y 360–430, #334155/#475569), rain #E0F2FE at 0.45.
- Title: instruction card structured (rgba(248,250,252,0.92), 2 px
  #063C85 border, radius 16, padding 18×22) — text STAYS navy
  #132238 (user instruction); hero title gets a navy outline;
  key-cap sub-labels get a navy pill backing (rgba(6,60,133,0.78),
  radius 999 px); rival #2–#5 markers are compact navy pills (1.5 px
  #FACC15 border, white text), not big round pins. Slipstream trail
  dimmed (opacity 0.20, size 0.8) — the pink wash in the cockpit view.

## What v18 does NOT change

Caravan shape, 3/4 camera, race system, 12-ring + land mission, yellow
key-caps, no "Press Space" line, daytime, v11 premium palette, W climbs
(never invert).

## Verification (OpenGame 4-layer, this version)

1. **3-tier sim** (`sim-3tier.mjs`, pure Node, real game logic):
   Reference (autopilot) must pass 12 rings AND land; Weak (noisy input)
   gets some rings, no finish; Idle (no input) must fail. Must pass before
   v18 is declared ready. v18 run: Reference 12/12 + landed, score 3385,
   59.8 s; Weak 9/12, score 1953 (was 6/12 — softer controls + pitch
   auto-level); Idle 2/12, score 262.
2. **Headless tests** (`test/headless.test.mjs`, Node): heading holds with
   no input (+ gust applied, the v16 regression); ring-centre pass counts;
   crossing rivals fire the collision gate; v18 adds pitch-hold with
   zero stick + gust (test 5) and no-input straight flight passes ring 1
   (test 6). 11/11 pass. Logic lives in pure modules
   (`flight.js`, `rings.js`, `collision.js`, `storm.js` gust) — no browser.
3. **Checklist** (`verification.md`): every item checked only with proof
   (screenshot / sim / test), never a claim.
4. **This design doc set**: plan + style + asset list, so the direction
   does not drift mid-build.

## Submit rule

Submit only on the user's explicit order per version, after screenshots +
an outside blind test. v18 is not submitted by the builder.
