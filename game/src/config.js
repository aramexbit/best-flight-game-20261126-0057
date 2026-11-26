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
  fogFar: 3800,
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
  // Each leg turns the course by up to this many degrees.
  maxTurnDeg: 55,
  // Ring centres sit between these altitudes, in metres.
  minRingAlt: 120,
  maxRingAlt: 300,
  // The glowing ring itself, in metres.
  ringRadius: 32,
  ringTube: 1.8,
  // The runway waits this far past the last ring, along the final heading.
  runwayPastRing: 520,
  runwayLength: 340,
  runwayWidth: 26,
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
  // Golden hour: warm sun, peach haze, teal sea, green islands.
  skyTop: '#2e4a7a',
  skyHorizon: '#ffb877',
  fog: '#f7b98a',
  sun: '#ffd9a0',
  sea: '#1d6f7d',
  seaDeep: '#14505f',
  sand: '#e8cf9a',
  grass: '#4d8a4a',
  forest: '#2f6b35',
  rock: '#7a6a5e',
  snow: '#f2ede6',
  ring: '#ffd94d',
  ringNext: '#ffe98a',
  planeCream: '#f4ead8',
  planeRed: '#c0392b',
  planeGlass: '#9fd8e8',
  hudText: '#fff7e8',
  hudPanel: 'rgba(20, 24, 40, 0.55)',
  hudWarn: '#ff5d4d',
  hudGood: '#7dff9a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'langit-nusantara.best';
