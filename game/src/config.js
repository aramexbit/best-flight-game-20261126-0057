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
  fogNear: 900,
  fogFar: 4200,
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
  // v4: daytime — bright blue sky, white sun, blue sea. The golden-hour
  // palette is gone: the sunset sky read dark and muddy in screenshots, and
  // the user asked for a bright daytime scene that is pleasant to look at.
  // The sea now runs bright turquoise in the shallows to deep blue offshore,
  // so the coast reads as a tropical shore at a glance.
  // v6: the ground gets two more colours (grassDry, dirt) because the v5
  // blind test read the hills as one smooth green heightmap — the patchwork
  // below is what breaks that up.
  skyTop: '#2E7FC2',
  skyHorizon: '#BFE3F2',
  fog: '#cfe8f5',
  sun: '#ffffff',
  sea: '#1B7FA8',
  seaDeep: '#0B5A8A',
  seaMid: '#1B7FA8',
  seaShallow: '#42A99B',
  sand: '#e8cf9a',
  grass: '#58a04e',
  forest: '#2f7a38',
  grassLight: '#7cb85c',
  // v6: dry grass for the terrain patchwork and dirt for the graded apron
  // around the runway — two more ground colours, so the hills read as
  // worked island ground instead of one flat green wash.
  grassDry: '#93b45a',
  dirt: '#a98f66',
  rock: '#7a6a5e',
  snow: '#f2ede6',
  ring: '#FFD477',
  ringNext: '#FFE98A',
  ringDone: '#9DBE6E',
  planeCream: '#F2E5C5',
  planeBelly: '#BCA887',
  planeRed: '#C83C32',
  planeGlass: '#9fd8e8',
  hudText: '#fff7e8',
  hudPanel: 'rgba(20, 24, 40, 0.55)',
  hudWarn: '#ff5d4d',
  hudGood: '#7dff9a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'langit-nusantara.best';
