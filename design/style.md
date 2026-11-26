# Langit Nusantara — Ring Run: Style Guide (v11 palette, v18)

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
| Sea deep | `#0284C7` | Offshore depth (v18, was `#0B6FA8`) |
| Sea mid | `#06A8D8` | Mid-depth band (v18, was `#00C5D9`) |
| Sea shallow | `#00C5D9` | Bright shallows at the shore (v18, was `#3ED8CF`) |
| Sand | `#E8D39A` | Warm cream beach |
| Grass | `#42B83C` | Vivid green |
| Forest | `#2E9E33` | Jungle green |
| Grass light | `#6FD653` | Highlight grass |
| Grass dry | `#A9C94E` | Dry patchwork |
| Dirt | `#a98f66` | Graded apron |
| Rock | `#64748B` | Slate outcrops, cliffs (v18, was `#7a6a5e`) |
| Airfield | `#66BE4C` | Mown grass around the runway |
| Ring | `#FFD52A` | Glossy gold |
| Ring (next) | `#FFE65C` | Brighter gold, pulsing |
| Ring (done) | `#9DBE6E` | Muted green |
| Plane cream | `#F2E5C5` | Caravan fuselage |
| Plane red | `#C83C32` | Susi Air accents |
| Plane glass | `#1E293B` | Dark windows (v18, was `#9fd8e8`) |
| Cockpit panel | `#525864` | Panel face |
| Cockpit face | `#F8FAFC` | Dial face, light (v18, was `#5d636e`) |
| Cockpit console | `#6b7078` | Console |
| Cockpit shield | `#1E293B` | Glareshield, dark (v18, was `#4a4e56`) |
| Cockpit trim | `#273244` | Pillar/frame trim (v18) |
| HUD panel | `rgba(6, 60, 133, 0.88)` | Deep navy `#063C85` |
| HUD text | `#ffffff` | White on navy panels |
| HUD accent | `#00E5FF` | Bright cyan highlight |
| HUD warn | `#ff5d4d` | Warnings |
| Title rule text | `#132238` | Dark navy on a light pill — never white on sky |
| Key-cap | yellow bg, `#132238` text | Same navy as the rule text |
| Key-label pill | `rgba(6, 60, 133, 0.78)` | Navy pill behind Pitch/Roll/etc sub-labels (v18) |

## Typography & HUD

- HUD panels: deep navy, 0.88 opaque, white text, cyan accent. Never
  charcoal, never translucent enough to lose the text against the sky.
- Ring pointer: navy pill, gold chevron, rotates in the CAMERA frame to
  the ring's true screen direction (v17 fix — the plane-frame arrow
  pointed 67° off).
- Title: huge gold "LANGIT NUSANTARA / RING RUN" with a navy outline
  (`-webkit-text-stroke: 2px #063C85`), no big card behind it. Rules sit
  on one structured light card (`rgba(248,250,252,0.92)`, 2 px `#063C85`
  border, radius 16, padding 18×22) with dark navy text — readable on
  bright sky AND under the storm cloud.
- Key-caps: yellow, navy text, one per control group (W/S pitch, A/D
  roll, Q/E rudder, Shift/Ctrl throttle, C camera, P pause). Sub-labels
  (Pitch/Roll/…) sit on a navy pill (`rgba(6,60,133,0.78)`, radius
  999 px, white text) so they read over bright sand/grass.

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
  shrubs, cliffs. 2.5–3× denser mid-course (hero groves 26, ring 3–5
  groves 16 each, bushes 320, tufts 160). Nothing planted inside the
  runway clear zone.
- **Airfield:** asphalt runway `#2B303A` (v18, was `#555A55`) with a
  dark underlay, speckle, centreline dashes, piano keys, aiming points,
  "09"/"27" numbers from a 512×256 canvas texture (bold 180 px,
  anisotropy 8), white edge lines, 5 approach lights on the extended
  centreline, windsock, hangar, fuel shed + drums, fuel truck on the
  apron, taxiway + apron slabs. The strip sits on a graded plateau
  that fades 250–360 m into the hills — no step at the edge.

## Aircraft & rivals

- Player: Cessna 208 Caravan, cream + red, dark windows, visible prop.
  Faceted + tapered in v18 (`taperedPrism`): nose 1.0→0.42, wings
  tapered chord 1.6→1.15 with 3° dihedral, red tapered wingtips, wing
  struts, tapered stabiliser + red tips, dark wheels, flatShading.
  3/4 rear chase cam, close enough to read the shape (chase 11 m,
  FOV 62). Chase offset uses a yaw-only horizontal forward (v18 fix —
  the full-3D forward dropped the camera below the plane at steep
  pitch, so the live camera stared at the nose) plus a height floor
  (never below plane.y + 2.5 m, v18b — the fixed-1/60 lerp lagged up
  to 8 m below the plane in climbs at low FPS).
- Rivals: 4 liveries (BIRU / KUNING / HIJAU / ORANYE), separated in
  depth by lane (lateral ±12–34 m, altitude −10…+26 m) and by the
  showcase flybys — badges must never stack on one another. Number
  badges `#2`–`#5` are compact navy pills (1.5 px `#FACC15` border,
  white text, v18), not big round pins.
- Shadows: one soft dark ellipse per plane on the ground below it (5 in
  total), contrasted enough to read at 150 m altitude (v17: harder
  gradient, opacity up to 0.75 with a 0.3 floor, base 9×6.5 m growing
  0.004/m, sun offset capped at 120 m — live probe Phase C counts 5,
  all visible).

## Effects

- **Explosion:** 3-layer faceted fireball — core `#FFF3B0` /
  `#FF9F1C` / `#E63946` (icosahedron/dodecahedron, flatShading), slate
  smoke `#475569 / #64748B / #CBD5E1`, chunky debris `#334155 /
  #C82828` with gravity. 45 m to the side of the ring line so the ring
  stays visible; never under the HUD.
- **Crash (player):** fireball at the wreck + boom + camera shake.
- **Storm:** tornado (dark, textured, spray ring at the base), rain
  slanted by the wind (`#E0F2FE`, opacity 0.45, v18), lightning every
  4–9 s, flak bursts along the outer corridors. Multi-tier anvil
  (second tier: 5 lobes, y 360–430, `#334155 / #475569`, v18).
- **Cockpit:** 5 dials on light faces (`#F8FAFC`, 96 px numbers at
  radius 138, sub-label in a separate navy badge clear of the "6" and
  the needle pivot), pillars 0.05 m, trim `#273244`, glareshield
  `#1E293B`, red trim strip `#C82828`. ≥72% forward viewport free.
- **Rings:** gold torus + inner glow disc, next ring pulsing brighter.
  Passed rings turn muted green.

## What NOT to do

- No night, no rain over the whole scene, no coloured smoke trails.
- No white instruction text on sky. No "Press Space" line.
- No rebuilding the palette mid-version — `config.js` PALETTE is the law.
- No full rebuilds. Patch on the last working version.
