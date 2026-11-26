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
  fogNear: 900,
  fogFar: 5200,
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

export const SCORE = {
  ring: 100,
  centreBonus: 50,
  streakStep: 25,
  landing: 500,
  smoothLanding: 250,
  timeBonusPerSecond: 10,
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
  cockpitPanel: '#4b515c',
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
