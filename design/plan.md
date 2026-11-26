# Langit Nusantara — Ring Run: v17 Plan

Competition: make.fun "Make the best flight game", $500 (top 50 share).
Deadline: **Saturday 28 Nov 2026, 07:57 WIB**. Repo: `best-flight-game-20261126-0057`.

## The game (unchanged since v11)

A Three.js daytime flight game. You fly a Cessna 208 Caravan (Susi Air
livery) over a tropical archipelago, racing 4 rivals through **12 glowing
rings**, then landing on the runway. Chase cam (3/4 rear) + cockpit cam (C).
Controls: W/S pitch (W climbs), A/D roll, Q/E rudder, Shift/Ctrl throttle,
Space start, P pause, R restart, M sound. HUD is never faked: altitude,
speed, heading, time, score, race position, ring pointer.

## Why v17 exists

Blind test v16 (Gemini) verdict NO, scores DOWN vs v15 across the board
(Cover 3.5 / Cockpit 3.0 / Title 4.0 / Landing 4.5). Live playtest v16
(3 flights, 26 Nov 23:28–23:36 WIB): **0/12 rings in every flight, finish
never reached**. Two P0 bugs explained it:

1. The plane turned right ~10°/s with NO input (gust sine integral had a
   DC bias, so the auto-level gate `input.roll === 0` was never true).
2. The mid-air collision blast never showed in live play (it was tied to a
   meetPoint / narrow distance that a live player never satisfied).

## What v17 changes (patch on v16, never a rebuild)

**Flight / fairness**
- Gusts are cosines now (zero-mean integral) + the auto-level gate reads the
  raw stick (`stickRoll`), so hands-off flight holds heading (probe A3: 0°
  drift in 20 s, was 360° in ~36 s).
- Cross-track assist on final approach (roll correction from lateral offset
  + heading error, blended 0.6) — the v16 live crash 92 m off-centreline.
- The player's own crash now explodes (fireball + boom + shake), not just a
  panel over an intact plane.

**Race / collision (the blast must be SEEN)**
- Meeting point is player-relative when off-course: 2000 m ahead of the
  player (was 250 m — the pair arrived ~3 s after the player had already
  passed it, forever). Re-anchor only when the point goes stale, never on
  a timer. Off-course now also means "the next ring is behind the player"
  (the seed-1 course snakes so gently a straight player stays within
  400 m of the polyline for 44 s — polyline distance alone never fired).
- Chase boost ~120 m/s on-course, ~156 m/s for a player-relative chase.
- The pair holds at the point and the fire gates (in view, 50–400 m,
  facing the blast) decide the explosion — no clock backstop the player
  cannot see.
- Player-relative re-anchor rule, learned the hard way (live probe run
  4): a player-relative point moves ONLY when the player flew past it
  (along-track < −50 m) or got very far from it (dist > 2500 m). The
  first threshold (800 m) fired the moment the pair arrived — the
  player was still ~1100 m out, which is normal for a 2000 m lead —
  and leapfrogged the point forever, so the blast never fired. With
  2500 m the anchor holds and the blast fires: live probe runs 6 and 7
  both show the STRAIGHT blast at t=40.0 s.

**Visuals (Gemini v17 prompt, per scene)**
- Terrain: multi-tone tropics — sand beach, turquoise shallows, jungle
  greens, rock outcrops, clustered palms, jetty/boats/islands, layered
  volcanic ridges, aerial perspective. Sea enlarged to 12000 m so the
  world edge dissolves in fog instead of reading as a square cliff.
- Storm: multi-puff cumulus + one cohesive dark cumulonimbus wall, slanted
  rain, darker textured tornado with a spray ring at its base.
- Explosion: layered fireball (white-yellow core, orange-red mid, soft
  charcoal smoke, directed debris/sparks) — beside the ring, never covering
  it (45 m sideways offset) and never under the HUD.
- Cockpit: slimmer pillars, bigger dials, numbers that do not overlap
  their labels.
- Rivals separated in depth; position badges do not stack.
- Title: instruction rules in dark navy #132238 on a light translucent
  pill (user instruction 26 Nov 23:49 WIB) — readable on bright sky and
  under storm cloud. Yellow key-caps with navy text kept.
- Runway: asphalt texture, edge lights/markers, windsock + hangar, a
  graded plateau that blends into the terrain (no step). 5 approach
  lights on the extended centreline.

## What v17 does NOT change

Caravan shape, 3/4 camera, race system, 12-ring + land mission, yellow
key-caps, no "Press Space" line, daytime, v11 premium palette, W climbs
(never invert).

## Verification (OpenGame 4-layer, this version)

1. **3-tier sim** (`sim-3tier.mjs`, pure Node, real game logic):
   Reference (autopilot) must pass 12 rings AND land; Weak (noisy input)
   gets some rings, no finish; Idle (no input) must fail. Must pass before
   v17 is declared ready.
2. **Headless tests** (`test/headless.test.mjs`, Node): heading holds with
   no input (+ gust applied, the v16 regression); ring-centre pass counts;
   crossing rivals fire the collision gate. Logic lives in pure modules
   (`flight.js`, `rings.js`, `collision.js`, `storm.js` gust) — no browser.
3. **Checklist** (`verification.md`): every item checked only with proof
   (screenshot / sim / test), never a claim.
4. **This design doc set**: plan + style + asset list, so the direction
   does not drift mid-build.

## Submit rule

Submit only on the user's explicit order per version, after screenshots +
an outside blind test. v17 is not submitted by the builder.
