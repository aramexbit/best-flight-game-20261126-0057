// Langit Nusantara — Ring Run. Every tuning number in one place, so the flight model,
// the course and the look can be balanced without hunting through the other files.
// Units are metres and seconds; the HUD converts to feet and knots for display.

export const STEP = 1 / 60;

export const WORLD = {
  // The archipelago is a square of sea this wide, in metres, centred on the origin.
  size: 4400,
  // Sea level; terrain is built above it, the runway sits a little above it.
  seaLevel: 0,
  // How many islands the seeded generator places, and how tall the tallest gets.
  islandCount: 9,
  maxHeight: 330,
  // Fog starts here and swallows the far islands by this distance.
  // v9: far 5200 (was 4200) — the v9 title shot looks across 4300 m of
  // sea at the eastern ridge, which the old far plane swallowed whole,
  // so the title background was low green hills with no mountains at all.
  // v13: near 800 / far 5000 (was 900 / 5200) — a touch more haze, so the
  // horizon unifies into one soft atmospheric depth instead of hard-edged
  // far hills; the eastern ridge still shows through at 4300 m.
  fogNear: 800,
  fogFar: 5000,
};

export const PLANE = {
  // Speeds in m/s. Below stall the nose drops and the controls go soft.
  stallSpeed: 24,
  cruiseSpeed: 55,
  maxSpeed: 92,
  // Acceleration at full throttle, and the drag that caps the top speed.
  thrust: 26,
  drag: 0.0032,
  // How fast the stick turns the plane, in radians per second at full deflection.
  pitchRate: 0.9,
  rollRate: 1.9,
  // A banked turn pulls the nose around this hard (radians per second per unit bank).
  turnRate: 0.95,
  // The roll eases back toward level on its own when the stick is centred.
  autoLevel: 0.55,
  // Climbing costs speed, diving buys it, at this rate.
  climbCost: 9.5,
  // Throttle moves at this rate per second when the key is held.
  throttleRate: 0.85,
  // Seconds of full-throttle flight in the tank.
  fuelSeconds: 300,
};

export const COURSE = {
  ringCount: 12,
  // Rings are this far apart, give or take the jitter below.
  ringSpacing: 430,
  spacingJitter: 110,
  // Each leg turns the course by up to the per-leg wander in rings.js
  // (a config field used to live here but nothing read it, so it is gone).
  // Ring centres sit between these altitudes, in metres.
  minRingAlt: 120,
  maxRingAlt: 300,
  // The glowing ring itself, in metres. v4: radius 13 m (was 11.5) — the
  // v3 blind test said the main ring reads small in the cover shot, and the
  // gate is the primary objective, so it gets a touch bigger. Tube 0.5 for
  // presence. Passing stays easier, not harder, so the autopilot's tight
  // mode (tuned for the small ring) still holds.
  ringRadius: 13,
  ringTube: 0.5,
  // The runway waits this far past the last ring, along the final heading.
  runwayPastRing: 520,
  // v3: the full-size strip from the blueprint, 450 m long and 28 m wide,
  // with 3 m shoulders each side (the v2 strip was 340 x 40).
  runwayLength: 450,
  runwayWidth: 28,
  runwayShoulder: 3,
  // Par time for the landing time bonus, in seconds.
  parTime: 240,
};

// v13: the race — four AI rivals, one pack, one scripted crash schedule.
// All times are seconds from run start; the schedule is deterministic,
// so the same seed and the same player line give the same race every run
// (and the same screenshots). See rivals.js for what each event does.
// v14: the mid-air collision is no longer a fixed clock time. The rivals
// converge from 26.8 s (collisionAt - 14) and HOLD near the meeting point
// until the player closes to collisionTriggerDist — so the blast goes off
// IN FRONT of the player, in view, instead of kilometres away on a
// schedule the player cannot see (the user's own playtest report: no
// explosion ever visible while playing). collisionFallbackAt is the clock
// backstop: after that, the rivals collide as soon as the player is
// within collisionCloseDist.
export const RACE = {
  rivalCount: 4,
  // R1 blue: extreme dive, so the cockpit shot at 12 s catches it smoking.
  // 11.5 s (was 10): the dive drops fast — at 12 s a dive started at 10 s
  // is already 33 m below the player, and even at 11 s it is 10 m below
  // in 11 m — 45° under the horizon, behind the dashboard, invisible
  // through the windshield. Starting at 11.5 s leaves it ~1 m below at
  // 12 s, in the windshield near the ring, nosing down with a smoke trail.
  diveCrashAt: 11.5,
  // R4 orange: clips ring 11, spins two seconds, dives, hits the sea.
  clipCrashAt: 35,
  // R2 yellow + R3 green: mid-air collision — the cover shot freezes
  // ~1-2 s after the blast (PLAY_SECONDS in shots.js is set to the
  // blast time + 1.5 s), so it catches the two split airframes tumbling
  // through fresh dark smoke with the fireball still bright.
  // v14: collisionAt is now only the nominal time (the converge starts
  // 14 s earlier); the actual blast is player-triggered, see above.
  collisionAt: 40.8,
  // v14: the player must be this close (metres) to the meeting point for
  // the collision to fire — close enough that the fireball, the split
  // halves and the dark smoke fill the forward view. 250 m (was 200):
  // the diag showed the player slipping past 200 m in the seconds the
  // second rival needed to arrive, while 250 m still reads clearly.
  collisionTriggerDist: 250,
  // v14: after this clock time, the collision fires as soon as the player
  // is within collisionCloseDist — so a slow player still gets the blast
  // in front of them instead of never seeing it at all.
  // (A collisionEarliestAt floor of 37 s was tried and REMOVED: the
  // player passes the meeting point at ~36-37 s, so a blast held to 37 s
  // goes off behind the player and the cover freeze at 41 s sees nothing
  // but empty sky ahead. The cover timing is fixed the other way — the
  // cover freezes ~1.5 s after the blast instead, see PLAY_SECONDS.)
  // v15: 90 s (was 60) — the meeting point now re-anchors ahead of a
  // slow player instead of firing far away, so the backstop only fires
  // once the player is genuinely closing in.
  collisionFallbackAt: 90,
  // v14: 800 m (was 600) — the diag showed the player orbiting the runway
  // at 635-750 m from the meeting point after the course, so the 600 m
  // backstop never caught it; 800 m does, as a last resort.
  // v15: 350 m (was 800) — an 800 m blast is invisible; the backstop
  // only fires when the player is close enough to actually see it.
  collisionCloseDist: 350,
  // v16: 55 s — from here the collision stops waiting for the player
  // to come to the meeting point and RE-ANCHORS the point 220 m ahead
  // of the player instead (rivals.js 'holding' branch). A human who
  // flies straight off-course never closes to 250 m of a course-tied
  // point, so without this the blast never fires for them at all —
  // the v15 live playtest's core complaint. The staged cover (blast
  // ~33.8 s) and the normal 45 s second-chance window are untouched.
  // v17: the player-relative fire floor is now 40 s (was 55) and the
  // one-shot re-anchor is GONE — the meeting point TRACKS the player
  // (re-anchored ahead of them whenever it goes stale, at most every
  // 6 s), and the pair flies with a chase boost, so the blast comes to
  // a fast straight player instead of waiting for them (v16 probe A2:
  // an 81.7 m/s straight player outran the pair and never saw a blast
  // in 75 s). collisionEarlyAt/collisionOffCourse are the early trigger
  // for that case: from 15 s on, a player faster than 70 m/s AND more
  // than 400 m off the course line makes the pair converge on a point
  // 250 m ahead of the player at once. The sim player stays on the
  // course line, so the sim blast (~33.8 s, seed 1) does not move.
  collisionPlayerRelAt: 40,
  // v17: early converge for a fast off-course player (see above).
  collisionEarlyAt: 15,
  collisionOffCourse: 400,
  // v17: showcase flybys — from 46 s on, every 22 s the nearest free
  // rival (BIRU/ORANYE, scripted events done) sweeps across the
  // player's view 170 m ahead, so the pack is seen regularly even when
  // the player wanders off the course (v16 live playtest: rivals were
  // almost never in frame while flying).
  showcaseAt: 46,
  showcaseEvery: 22,
  // R1 blue: near-miss flyby down the player's left side, 39-42 s.
  flybyAt: 39,
  // Seconds a crashed rival stays out before rejoining. 3 s (was 6):
  // the landing shot freezes at ~47 s, only ~4 s after the mid-air
  // collision ends — with 6 s every rival was still hidden at the
  // freeze and the landing frame had no race in it at all.
  // (A "final crash at 130 s" was planned for the landing shot, but the
  // landing shot freezes at ~47 s — 140 s in shots.js is only a cap —
  // so 130 s is unreachable, and a wreck in the sea left of the runway
  // is geometrically impossible in the frame anyway: the sea is 780 m
  // from the runway in every direction, far outside the landing camera's
  // view. The landing shot's drama is the respawned rivals ahead
  // instead. The run still has four rivals crashing: BIRU's dive,
  // ORANYE's clip-dive, and the KUNING+HIJAU mid-air collision.)
  respawnDelay: 3,
  // Seconds a sea/ground impact's smoke column keeps rising.
  smokeColumnSeconds: 10,
};

export const SCORE = {
  ring: 100,
  centreBonus: 50,
  streakStep: 25,
  landing: 500,
  smoothLanding: 250,
  timeBonusPerSecond: 10,
};

// v16: the storm battle — ONE localised daytime storm cell, never night.
// windX/windZ is the mean wind (m/s): rain slants along it, smoke drifts
// with it, palms bend with it. gustAmp is the extra roll/pitch the gusts
// feed the player's stick in live play only (main.js) — the staged sim
// never sees it, so sim scores do not move. v17: the gusts are cosines
// (storm.js), so their integral is zero-mean — they buffet the stick
// without ever steering the plane (the old sines banked it right).
export const STORM = {
  windX: 6,
  windZ: -3,
  gustAmp: 0.07,
  // Seconds between flak bursts along the outer island corridors.
  flakEvery: 7,
  // How long a burning oil slick stays on the sea after a dive impact.
  slickSeconds: 25,
};

export const PALETTE = {
  // v11: the vibrant premium palette from the user's redesign prompt —
  // bright blue sky #168BFA, tropical turquoise sea #00C5D9, vivid green
  // grass #42B83C, warm cream sand #E8D39A. The sea keeps its depth
  // gradient (bright turquoise shallows into deep azure offshore) and the
  // ground keeps the dry-grass/dirt patchwork, now in more vivid tones.
  skyTop: '#168BFA',
  skyHorizon: '#CFEFFF',
  fog: '#cfe8f5',
  sun: '#ffffff',
  sea: '#00C5D9',
  seaDeep: '#0B6FA8',
  seaMid: '#00C5D9',
  seaShallow: '#3ED8CF',
  sand: '#E8D39A',
  grass: '#42B83C',
  forest: '#2E9E33',
  grassLight: '#6FD653',
  // v13: mown airfield grass for the graded plateau around the runway —
  // a touch lighter and yellower than the wild grass, so the airfield
  // reads as a maintained clearing instead of a dirt scar in the hills.
  airfield: '#66BE4C',
  // v6: dry grass for the terrain patchwork and dirt for the graded apron
  // around the runway — two more ground colours, so the hills read as
  // worked island ground instead of one flat green wash.
  // v11: the dry grass goes more vivid too, so the patchwork stays sunny.
  grassDry: '#A9C94E',
  dirt: '#a98f66',
  rock: '#7a6a5e',
  snow: '#f2ede6',
  // v11: the rings go glossier gold (#FFD52A, next ring #FFE65C) to match
  // the redesign prompt's golden-yellow glow and the mockup's glowing ring.
  ring: '#FFD52A',
  ringNext: '#FFE65C',
  ringDone: '#9DBE6E',
  planeCream: '#F2E5C5',
  planeBelly: '#BCA887',
  planeRed: '#C83C32',
  planeGlass: '#9fd8e8',
  // v9: the cockpit stops being one black slab — three separate greys, so
  // the panel face, the dark glareshield and the lighter console read as
  // distinct built parts (Gemini v6: "chunky, dark geometric slab").
  // v9 (iterasi 2): the glareshield gets its own lighter grey — the v9
  // cockpit shot showed the shield as one big black slab, because the
  // camera sees its shadowed underside; a lighter grey keeps it readable.
  // v13: '#525864' (was '#4b515c') — a touch lighter, so the panel face
  // separates from the dark glareshield instead of merging into one slab.
  cockpitPanel: '#525864',
  cockpitFace: '#5d636e',
  cockpitConsole: '#6b7078',
  // v10: faint windshield glazing colour for the curved canopy bow (plane.js).
  cockpitGlass: '#cfe8f5',
  cockpitShield: '#4a4e56',
  // v11: HUD panels are deep navy #063C85 (the redesign prompt's panel
  // colour) with clean white text and a bright cyan highlight — the
  // charcoal panels are gone, so the HUD matches the title screen's navy
  // glass instead of reading as a separate dark theme.
  hudText: '#ffffff',
  hudAccent: '#00E5FF',
  // v10: HUD panels are 0.88 opaque (was 0.55) — the v9 landing shot's
  // ALTITUDE and TIME/SCORE panels washed out milky because a bright white
  // cloud sat behind the translucent glass. The panels must be readable
  // against any sky; the same 0.88 is applied in game/index.html, where
  // the chips and the attitude gauge actually get their background.
  hudPanel: 'rgba(6, 60, 133, 0.88)',
  hudWarn: '#ff5d4d',
  hudGood: '#7dff9a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'langit-nusantara.best';
