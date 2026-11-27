# Langit Nusantara — Ring Run: Style Guide (v11 palette, v20)

The look is "premium tropical daytime": saturated, sunny, readable at a
glance. One hero per frame (the plane, the ring, the blast, the runway) —
supporting elements never compete with it or cover it. Thumbnail test:
the subject must read in one second.

## Palette (from `game/src/config.js` PALETTE — single source of truth)

| Role | Colour | Notes |
|---|---|---|
| Sky top | `#168BFA` | Bright blue, daytime only — never night |
| Sky horizon | `#CFEFFF` | Pale horizon, matches fog |
| Fog | `#9CC8E8` | Darker than the horizon (v19, was `#cfe8f5` ≈ horizon — the horizon vanished low over the sea) |
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
| Cockpit trim | `#242B35` | Pillar/frame trim (v19, was `#273244`) |
| Cockpit shield accent | `#C93B2B` | Glareshield red accent stripe (v19) |
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
  apron, taxiway + apron slabs. v19: turnaround pads (asphalt disc
  r 20 m + white ring, both strip ends) + PAPI (4 boxes by the west
  threshold: 2 red inner + 2 white outer) + a red-white striped
  windsock (animated yaw + flutter). The strip sits on a graded plateau
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
  all visible). v19: a second CONTACT shadow directly under each plane
  (opacity 0.55→0 below 120 m AGL, scale 8 m + agl×0.02) + the
  sun-offset cap 120 → 50 m, so the height above the runway reads in
  the chase/landing shots. v20: the contact shadow is DARKER and BIGGER
  (opacity 0.75→0 below 160 m AGL, scale 10 m + agl×0.03) — the v19
  live playtest identified only 1 of 9 code-visible shadows.

## Effects

- **Explosion:** 3-layer faceted fireball — core `#FFF3B0` /
  `#FF9F1C` / `#E63946` (icosahedron/dodecahedron, flatShading), slate
  smoke `#475569 / #64748B / #CBD5E1`, chunky debris `#334155 /
  #C82828` with gravity. v19: shell 42 m / 3.5 s (was 34 m / 2.8 s),
  no shockwave ring (deleted — it read as a giant bubble), blast smoke
  capped (life 6–8 s, grow 0.5, max ~8 m), debris 0.4–1.0 m × 24.
  45 m to the side of the ring line so the ring stays visible; never
  under the HUD.
- **Crash (player):** fireball at the wreck + boom + camera shake.
  v19: the camera pulls wide on crash (`setChase(45, -10, 20, 40)`)
  and the wreck stays visible for 1.5 s before the over panel.
  v20: the camera pulls wider and higher (`setChase(48, -12, 30, 40)`,
  height lifted until the camera clears the terrain behind the wreck
  by 4 m) and the beat is 3.0 s (the fireball lives 3.5 s) — the v19
  live playtest saw the fireball for 1.5 s and then the camera pressed
  against the hillside.
- **Storm:** tornado (dark, textured, spray ring at the base), rain
  slanted by the wind (`#E6F4FF`, opacity 0.35, v19 — was `#E0F2FE`
  0.45), lightning every 4–9 s, flak bursts along the outer corridors.
  v19 tornado: 12 segments, taper 4 m → 46 m, dark slate `#3B4652 /
  #586675`, 18 rotating debris flecks, faceted anvil. Multi-tier anvil
  (second tier: 5 lobes, y 360–430, `#334155 / #475569`, v18).
  Clouds are FULLY OPAQUE in v19 (no transparent pass — the
  transparency read as grey bubbles) with smaller lobes (base 40–60 m,
  lower 30–50 m, top 25–40 m). v20: the storm wall/anvil are SMALLER,
  LIGHTER and SMOOTH-shaded (wall 6 lobes 100–150 m, anchor 220 m off
  the course, `#5F7285/#71849A/#5A6C7E`; anvil 4 lobes 100–140 m at
  y 320–350, `#6B7E92/#8296A8`; smooth shading, detail 1 — flat-shaded
  dark slate read as black rock even after lightening), funnel
  `#46545F` opacity 0.9, spray crown 5 puffs + 18 m ring, second
  spout 750 m along / 320 m aside at 0.45 scale. Cloud lobes
  more/smaller/tighter in v20 (base 14–18 × 30–45 m, lower 5–6 ×
  25–40 m, top 10–13 × 20–30 m).
- **Cockpit:** 5 dials on light faces (`#F8FAFC`, 84 px numbers at
  radius 120, v19 — was 96 px at 138, glyphs hit the tick ring;
  sub-label in a separate navy badge clear of the "6" and the needle
  pivot; ticks long 180 / major 190 / minor 200, all to 216; needle
  `#E53935`; labels IAS/ALT/HDG/VSI/RPM), pillars 0.05 m, trim
  `#242B35`, glareshield `#1E293B` with a `#C93B2B` accent stripe,
  red trim strip `#C82828`. ≥72% forward viewport free. v20: the dial
  faces are redrawn at 1024 px with REAL instrument scales on the
  −120°..+120° sweep (IAS 0/25/50/75/100, ALT 0/225/450/675/900, VSI
  −10/−5/0/5/10, RPM 0/1/2/3/4, HDG N/E/S/W with NO badge), numbers
  96 px at radius 380 (HDG 110 px), ticks major 430→470 / minor
  445→470, redline r 480 on IAS/RPM only, badge 210×72 at y 800,
  needle shortened (tip 0.1325 m), anisotropy 8; the cockpit camera
  sits 0.35 m back (was 0.1) so the leftmost dial is in frame.
- **Rings:** gold torus + inner glow disc, next ring pulsing brighter.
  Passed rings turn muted green. v20: the next ring's glow pulses
  0.28+0.06·sin(time·3.2).

## What NOT to do

- No night, no rain over the whole scene, no coloured smoke trails.
- No white instruction text on sky. No "Press Space" line.
- No rebuilding the palette mid-version — `config.js` PALETTE is the law.
- No full rebuilds. Patch on the last working version.

## v21 style notes

- Clouds are SMOOTH (detail-1, flatShading false): bright white tops,
  cool undersides, tight multi-puff packing. Faceted polyhedra read as
  floating rocks — never again.
- The tornado is a translucent layered vortex (outer funnel 0.45
  opacity + darker inner funnel counter-rotating + thin helix rings),
  never a solid grey cone with a white disc base.
- Smoke is FLATTENED and dark (near-black slate, flat 0.55–0.6) — round
  smooth spheres read as bubbles whatever their opacity.
- The prop blur is a RING (transparent hub + rim), never a solid disc.
- Cockpit: dark bezels (#2E3440), darker dial faces (no blown-out
  white), a real attitude horizon (blue/brown), no red placeholder
  strips, no windshield struts — one clear pane, contoured glareshield
  with a light rim highlight.
- Title (v21b–v21h, final): FLAT solid gold (#FFD52A, no gradient, no
  stroke), centred, one line — the hero spans the full width so the
  title never wraps and collides with the mission text. ALL text
  above the play button is gold — no white text there. The play
  button is a big gold circle (140 px) with a WHITE triangle +
  START in gold caps under it. The controls are six separate LIGHT
  glass chips (white 0.85 + blur, gold key badge, dark navy label)
  spread across the bottom — never one dark strip, never 3D keycaps.
  No instruction box, no logo, no gear on the title. The live
  background is the HERO camera: south of the plane, looking north
  — beach + hills behind the plane, storm out of frame, the plane
  large at the right, clear of the button.
- v21c LOW START: the course flies LOW over the sea (spawn AGL
  ~58 m, rings 1–3 AGL 45–99 m) and CLIMBS between steep ridge
  islands (300–320 m crests, 450 m off the course line) — the
  plane is always BELOW the crests in the early course, so the
  frame reads "between hills", not "over flat sea". The ridges are
  green at the base, rock/snow at the crest (the standard
  height/slope vertex colours).
- v21c DENSE STORM: five tornadoes spread along the whole course
  (not one cell) — each a translucent layered vortex (outer +
  darker counter-rotating inner + helix rings + spray base), never
  a solid cone. Four rain systems (pale ice-blue streaks, 0.3–0.35
  opacity) so the rain is visible along the whole way without
  washing out the plane or the rings. Lightning in a random cell
  every 3–7 s. A tornado kill is a CHAIN FIREBALL + two torn-apart
  burning airframe halves tumbling away — the same visual language
  as the mid-air collision, so it reads as a destruction, not a
  disappearance. The storm is dramatic but never covers a ring or
  the player's plane.
- v21d STORM DECK: a black cumulonimbus CEILING over the whole
  course (~15 flat dark lobes, base ~196 m, #0F172A/#1E293B/
  #334155, opaque) — the storm sky is dominant. The rings sit
  UNDER it (top 172 m), so flying through a ring feels like rain
  + lightning: 3 course rain systems under the deck (thin pale
  streaks, 0.32) and lightning striking by the rings every 2–5 s
  (a thin pale zigzag bolt, 0.2 s live; the staged cover/cockpit
  shots fire a real bolt at the next ring so the frame shows it).
  The deck frames the TOP of the view — it never covers a ring or
  the plane, and it never appears in the title (the hero camera
  looks north, away from the course) or the landing (overhead,
  out of frame).
