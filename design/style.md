# Langit Nusantara — Ring Run: Style Guide (v11 palette, v17)

The look is "premium tropical daytime": saturated, sunny, readable at a
glance. One hero per frame (the plane, the ring, the blast, the runway) —
supporting elements never compete with it or cover it. Thumbnail test:
the subject must read in one second.

## Palette (from `game/src/config.js` PALETTE — single source of truth)

| Role | Colour | Notes |
|---|---|---|
| Sky top | `#168BFA` | Bright blue, daytime only — never night |
| Sky horizon | `#CFEFFF` | Pale horizon, matches fog |
| Fog | `#cfe8f5` | Swallows far islands by 5000 m |
| Sea | `#00C5D9` | Tropical turquoise |
| Sea deep | `#0B6FA8` | Offshore depth |
| Sea shallow | `#3ED8CF` | Bright shallows at the shore |
| Sand | `#E8D39A` | Warm cream beach |
| Grass | `#42B83C` | Vivid green |
| Forest | `#2E9E33` | Jungle green |
| Grass light | `#6FD653` | Highlight grass |
| Grass dry | `#A9C94E` | Dry patchwork |
| Dirt | `#a98f66` | Graded apron |
| Rock | `#7a6a5e` | Outcrops, cliffs |
| Airfield | `#66BE4C` | Mown grass around the runway |
| Ring | `#FFD52A` | Glossy gold |
| Ring (next) | `#FFE65C` | Brighter gold, pulsing |
| Ring (done) | `#9DBE6E` | Muted green |
| Plane cream | `#F2E5C5` | Caravan fuselage |
| Plane red | `#C83C32` | Susi Air accents |
| Plane glass | `#9fd8e8` | Windows |
| Cockpit panel | `#525864` | Panel face |
| Cockpit face | `#5d636e` | Dial face |
| Cockpit console | `#6b7078` | Console |
| Cockpit shield | `#4a4e56` | Glareshield |
| HUD panel | `rgba(6, 60, 133, 0.88)` | Deep navy `#063C85` |
| HUD text | `#ffffff` | White on navy panels |
| HUD accent | `#00E5FF` | Bright cyan highlight |
| HUD warn | `#ff5d4d` | Warnings |
| Title rule text | `#132238` | Dark navy on a light pill — never white on sky |
| Key-cap | yellow bg, `#132238` text | Same navy as the rule text |

## Typography & HUD

- HUD panels: deep navy, 0.88 opaque, white text, cyan accent. Never
  charcoal, never translucent enough to lose the text against the sky.
- Ring pointer: navy pill, gold chevron, rotates in the CAMERA frame to
  the ring's true screen direction (v17 fix — the plane-frame arrow
  pointed 67° off).
- Title: huge gold "LANGIT NUSANTARA / RING RUN", no big card behind it.
  Rules sit on one light translucent pill (`rgba(255,253,245,0.66)` +
  white border + blur) with dark navy text — readable on bright sky AND
  under the storm cloud.
- Key-caps: yellow, navy text, one per control group (W/S pitch, A/D
  roll, Q/E rudder, Shift/Ctrl throttle, C camera, P pause).

## World

- **Sky:** blue dome, pale horizon, sun high. One dark storm cell only
  (tornado + cumulonimbus wall + slanted rain beside rings 6–8), bright
  cumulus elsewhere. No grey discs, no second storm.
- **Sea:** 12000 m plane, depth gradient (turquoise shallows → deep azure),
  reef band + speckle + wave arcs near shore. The world edge must dissolve
  in fog — never a visible square edge or cliff.
- **Land:** 9 islands, max height 330 m. Layered volcanic ridges with
  aerial perspective (paler with distance). Beach tiers (wet sand →
  dry sand → grass blend). Jungle greens in patches, never one flat wash.
- **Vegetation:** clustered palms (not evenly spaced), trees, rocks,
  shrubs, cliffs. Nothing planted inside the runway clear zone.
- **Airfield:** asphalt runway (speckle, centreline dashes, piano keys,
  aiming points, "09"/"27" numbers), white edge lines, 5 approach lights
  on the extended centreline, windsock, hangar, fuel shed + drums,
  taxiway + apron slabs. The strip sits on a graded plateau that fades
  250–360 m into the hills — no step at the edge.

## Aircraft & rivals

- Player: Cessna 208 Caravan, cream + red, glass windows, visible prop.
  3/4 rear chase cam, close enough to read the shape (chase 11 m, FOV 62).
- Rivals: 4 liveries (BIRU / KUNING / HIJAU / ORANYE), separated in
  depth by lane (lateral ±12–34 m, altitude −10…+26 m) and by the
  showcase flybys — badges must never stack on one another.
- Shadows: one soft dark ellipse per plane on the ground below it (5 in
  total), contrasted enough to read at 150 m altitude (v17: harder
  gradient, opacity up to 0.75 with a 0.3 floor, base 9×6.5 m growing
  0.004/m, sun offset capped at 120 m — live probe Phase C counts 5,
  all visible).

## Effects

- **Explosion:** layered fireball — white-yellow core, orange-red mid,
  soft charcoal smoke puffs (never hard dark circles), directed debris
  and sparks, shockwave ring, flash light. 45 m to the side of the ring
  line so the ring stays visible; never under the HUD.
- **Crash (player):** fireball at the wreck + boom + camera shake.
- **Storm:** tornado (dark, textured, spray ring at the base), rain
  slanted by the wind, lightning every 4–9 s, flak bursts along the
  outer corridors.
- **Rings:** gold torus + inner glow disc, next ring pulsing brighter.
  Passed rings turn muted green.

## What NOT to do

- No night, no rain over the whole scene, no coloured smoke trails.
- No white instruction text on sky. No "Press Space" line.
- No rebuilding the palette mid-version — `config.js` PALETTE is the law.
- No full rebuilds. Patch on the last working version.
