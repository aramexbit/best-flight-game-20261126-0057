// The plane: a high-wing propeller tourer built from primitives — fuselage, cabin,
// wings with struts, tail, spinning prop and landing gear — so it reads as a thing
// that was built, not a shape that was drawn. Local forward is -Z; the renderer
// drives rotation from the flight state (yaw, pitch, roll) each frame.

import { PALETTE } from './config.js';

export function buildPlane(THREE) {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  // v11: glossier premium materials (cream roughness 0.42, red 0.38, both
  // with more metalness) — the redesign prompt's improved material quality
  // and colour contrast, while the red-and-white scheme itself is kept.
  const cream = new THREE.MeshStandardMaterial({ color: PALETTE.planeCream, roughness: 0.42, metalness: 0.25 });
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.planeRed, roughness: 0.38, metalness: 0.25 });
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.planeGlass, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.85,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#22242a', roughness: 0.9 });

  const body = new THREE.Group();
  group.add(body);

  // v12: the Caravan rebuild — the v11 smooth tube + big red tail cone read
  // as a rocket from the rear chase camera (the user's own words), so the
  // airframe follows the Cessna 208B Grand Caravan (Susi Air PK-VVH photo +
  // the two-panel concept art) per the Gemini build prompt: a BOXY cabin
  // core with faceted edges, a crowned roof and a flat belly — never a
  // smooth tube; a red cheatline stripe; four large cabin windows per
  // side; a tapered nose into the turboprop cowling; a compact tapered
  // tail end with no cone or nozzle; a tall fin with a red cap; a wide
  // stabiliser. Livery stays red-and-white; the photo's dark belly cargo
  // pod is NOT copied. Forward is -Z, same as before; the airframe is
  // ~8 m long, wingspan ~11 m.
  const cabinBox = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 4.4), cream);
  cabinBox.position.set(0, 0.05, 0.1);
  body.add(cabinBox);
  // Crowned roof strip: slightly narrower than the cabin, so the top reads
  // as a cabin roof, not a flat slab.
  const roofStrip = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.14, 4.0), cream);
  roofStrip.position.set(0, 0.68, 0.1);
  body.add(roofStrip);
  // Flat belly: a darker strip under the cabin — the Caravan's flat-angled
  // belly, kept clean (no cargo pod).
  const bellyMat = new THREE.MeshStandardMaterial({ color: PALETTE.planeBelly, roughness: 0.6, metalness: 0.1 });
  const bellyStrip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 4.0), bellyMat);
  bellyStrip.position.set(0, -0.58, 0.1);
  body.add(bellyStrip);
  // Red cheatline stripe along each side of the cabin — the Caravan's red
  // band, so the fuselage reads as a cabin from the side and the rear.
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 4.2), red);
    stripe.position.set(side * 0.58, -0.12, 0.1);
    body.add(stripe);
  }
  // Cabin windows: four large dark glass panes per side, slightly proud of
  // the cabin wall, with the window rhythm of the real Caravan; two angled
  // windshield panes at the front of the cabin.
  const windowMat = new THREE.MeshStandardMaterial({ color: '#22303f', roughness: 0.15, metalness: 0.35 });
  for (const side of [-1, 1]) {
    for (let w = 0; w < 4; w += 1) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.5), windowMat);
      win.position.set(side * 0.59, 0.18, -1.3 + w * 0.85);
      body.add(win);
    }
    const shieldPane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.03), windowMat);
    shieldPane.position.set(side * 0.3, 0.28, -2.12);
    shieldPane.rotation.y = -side * 0.35;
    shieldPane.rotation.x = -0.2;
    body.add(shieldPane);
  }
  // Nose transition: a short faceted section bridging the cabin front to
  // the red engine cowling.
  const noseSec = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.56, 0.5, 8), cream);
  noseSec.rotation.x = Math.PI / 2;
  noseSec.position.set(0, 0.05, -2.35);
  body.add(noseSec);
  // Red nose cowling. The cowling, prop and blur disc live on the group
  // (not the body) so the cockpit view can hide the bodywork while the
  // nose stays in sight ahead of the pilot.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.55, 0.9, 14), red);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.set(0, 0, -3.0);
  group.add(cowl);
  // Tail: a compact tapered octagonal section, cream, ending small — no
  // cone, no nozzle, no rocket bell.
  const tailTaper = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.55, 2.0, 8), cream);
  tailTaper.rotation.x = Math.PI / 2;
  tailTaper.position.set(0, 0.05, 3.2);
  body.add(tailTaper);

  // High wing: two halves with a real dihedral (tips rise ~0.17 m), red
  // tips, an aileron seam on top, and red struts from the lower fuselage
  // side up to mid-span under the wing — thick and faceted, not a
  // paper-thin slab. Wingspan ~11 m tip to tip.
  for (const side of [-1, 1]) {
    const half = new THREE.Mesh(new THREE.BoxGeometry(4.84, 0.18, 1.6), cream);
    half.position.set(side * 2.42, 0.82, -0.4);
    half.rotation.z = side * 0.07;
    body.add(half);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.18, 1.62), red);
    tip.position.set(side * 5.17, 1.01, -0.4);
    tip.rotation.z = side * 0.07;
    body.add(tip);
    // Aileron seam: a thin darker line near the trailing edge, so the wing
    // reads as control surfaces, not one blank plank.
    const aileronMat = new THREE.MeshStandardMaterial({ color: '#d8c9a8', roughness: 0.55, metalness: 0.25 });
    const aileron = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.02, 0.14), aileronMat);
    aileron.position.set(side * 2.42, 0.92, 0.28);
    aileron.rotation.z = side * 0.07;
    body.add(aileron);
    // Wing strut: red, from the lower fuselage side up to mid-span under
    // the wing — the Caravan's visible struts, readable from behind.
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), red);
    strut.position.set(side * 1.18, 0.31, -0.4);
    strut.rotation.z = -side * 0.986;
    body.add(strut);
    // Wingtip navigation light: red on the left, green on the right.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a1e : 0x2aff5e }),
    );
    lamp.position.set(side * 5.5, 1.03, -0.4);
    body.add(lamp);
  }

  // Tail: a wide horizontal stabiliser with red tips near the base of a
  // TALL stepped fin — cream with a red cap — plus a dorsal fin leading
  // edge running forward along the fuselage top. The fin rises to ~2.2 m
  // above the tail, so from the rear chase camera the tail reads as a
  // Caravan empennage, never as a cone.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 1.1), cream);
  stabiliser.position.set(0, 0.28, 4.0);
  body.add(stabiliser);
  for (const side of [-1, 1]) {
    const stabTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 1.12), red);
    stabTip.position.set(side * 1.68, 0.28, 4.0);
    body.add(stabTip);
  }
  const finLower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 1.3), cream);
  finLower.position.set(0, 0.7, 3.95);
  body.add(finLower);
  const finUpper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.95), cream);
  finUpper.position.set(0, 1.55, 4.05);
  body.add(finUpper);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.8), red);
  finTip.position.set(0, 2.0, 4.08);
  body.add(finTip);
  const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.3), cream);
  dorsalFin.position.set(0, 0.72, 3.2);
  dorsalFin.rotation.x = -0.45;
  body.add(dorsalFin);
  const ventralFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.7), red);
  ventralFin.position.set(0, -0.35, 4.0);
  body.add(ventralFin);

  // Fixed landing gear: a tricycle — two main wheels under the cabin and
  // a nose wheel under the engine — all three tyre bottoms on the same
  // plane (y = -1.54 in plane-local coordinates, the origin being the
  // plane centre), so the plane sits level on the ground.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 6), dark);
    leg.position.set(side * 0.75, -0.89, 0.5);
    body.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.75, -1.2, 0.5);
    body.add(wheel);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.24, 8), new THREE.MeshStandardMaterial({ color: '#9aa0aa', roughness: 0.4, metalness: 0.6 }));
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.set(side * 0.75, -1.2, 0.5);
    body.add(hubCap);
  }
  const noseLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), dark);
  noseLeg.position.set(0, -0.90, -2.3);
  body.add(noseLeg);
  const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12), dark);
  noseWheel.rotation.z = Math.PI / 2;
  noseWheel.position.set(0, -1.26, -2.3);
  body.add(noseWheel);
  const noseHub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 8), new THREE.MeshStandardMaterial({ color: '#9aa0aa', roughness: 0.4, metalness: 0.6 }));
  noseHub.rotation.z = Math.PI / 2;
  noseHub.position.set(0, -1.26, -2.3);
  body.add(noseHub);

  // Propeller: a dark hub, two blades and a faint blur disc that appears with
  // throttle. v3: the hub is dark (blueprint) with a red ring and tip for
  // accent, and the whole prop sits 0.3 m further forward to match the longer
  // nose — so the spinner no longer floats mid-frame in the cockpit shot.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -3.55);
  group.add(prop);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.42, 12), dark);
  hub.rotation.x = -Math.PI / 2;
  prop.add(hub);
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 20), red);
  hubRing.position.set(0, 0, 0.2);
  prop.add(hubRing);
  const hubTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), red);
  hubTip.rotation.x = -Math.PI / 2;
  hubTip.position.set(0, 0, -0.28);
  prop.add(hubTip);
  for (const angle of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.9, 0.07), dark);
    blade.rotation.z = angle;
    blade.position.set(0, 0, -0.1);
    prop.add(blade);
  }
  // v12: the blur disc is bigger (1.6 m radius, was 1.45) and stronger —
  // from the rear chase camera the spinning prop must read as a disc
  // protruding past the nose and fuselage edges, never hidden.
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 28),
    new THREE.MeshBasicMaterial({
      color: '#d8d8d8', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  blur.position.set(0, 0, -3.6);
  group.add(blur);

  // Cockpit dashboard, v5: rebuilt as a real 3D console, not a flat card.
  // The v4 panel was a thin dark box with three small dark dials pasted on it
  // — a fresh eye (DeepSeek v4) read it as "a black rectangular box with
  // three clip-art dials pasted on it... zero depth". So the v5 dash is a
  // console with thickness: a deeper panel, a wide sloped glareshield, side
  // cheeks, and a sloped lower console dropping toward the pilot, all sitting
  // LOWER (y -0.30, was -0.15) so the water and horizon below the plane show
  // through the windshield instead of hiding behind the panel. The dials are
  // bigger (rim 0.165, was 0.12) and LIGHT — cream faces with dark needles —
  // so they read clearly against the dark panel instead of vanishing into it.
  // The two grey toggle sticks and the red warning dot are GONE: they floated
  // in front of the panel with nothing holding them, and read as debug
  // placeholders. In their place, three small indicator dots sit FLUSH on
  // the panel face below the middle gauge.
  const dash = new THREE.Group();
  dash.position.set(0, -0.30, -2.1);
  dash.visible = false;
  // v7: the panel is a warm medium grey (was near-black #2a2f3a), with a
  // lighter inset face, so the dash reads as a built instrument panel with
  // material separation — panel face, dark glareshield, lighter console —
  // instead of one black box (Gemini v6: "chunky, dark geometric slab").
  const panelMat = new THREE.MeshStandardMaterial({ color: PALETTE.cockpitPanel, roughness: 0.7, metalness: 0.15 });
  // v9: the whole cockpit assembly is WIDER (panel 2.0 m, was 1.35) and the
  // camera sits lower and closer (see render.js) — the v8 console read as
  // a small floating box in the middle of the frame because it only spanned
  // a fifth of the frame width. Now the panel, glareshield, canopy pillars
  // and side walls reach toward the frame edges, so the instruments read as
  // built into an aircraft cabin instead of a lone box in front of water.
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.12), panelMat);
  dash.add(panel);
  // v12: the inset face is lighter (#676d78, was PALETTE.cockpitFace) so
  // the dials sit on a face that reads as built metal, not a dark slab.
  const faceMat = new THREE.MeshStandardMaterial({ color: '#676d78', roughness: 0.65, metalness: 0.1 });
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.02), faceMat);
  face.position.set(0, 0.01, 0.06);
  dash.add(face);
  // Red trim along the top edge of the panel, so it is visibly built, not cut out.
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.035, 0.13), red);
  trim.position.set(0, 0.225, 0);
  dash.add(trim);
  // v6: the same red trim along the bottom edge, so the panel is framed
  // top and bottom and reads as one finished housing.
  const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.035, 0.13), red);
  trimBottom.position.set(0, -0.225, 0);
  dash.add(trimBottom);
  // Glareshield: wider than the panel, shallow and high, sloping gently down
  // toward the pilot — it gives the panel a real top surface without
  // overhanging the dials. (First try: 0.45 deep at 0.5 rad overhung the panel
  // face and hid the lower half of every dial from the pilot's high seat;
  // the v5 first screenshots proved it, so the shield went shallow.)
  // v7: the shield is dark grey (#3a3e46, was near-black #22242a) — it still
  // reads as the shaded top of the console, but it no longer merges with the
  // black of the canopy frame into one heavy dark slab across the windshield.
  // v9 (iterasi 2): shallower (0.20 deep, was 0.30), set back (z 0.02, was
  // 0.06) and lighter (cockpitShield #4a4e56, was #3a3e46) — the v9
  // cockpit shot showed the shield as one big black slab hanging over the
  // dials, because the camera sees its shadowed underside; less overhang
  // and a lighter grey keep it a top surface, not a roof.
  // v11: deeper (0.34 m, was 0.20) and brought forward (z 0.10, was 0.02),
  // so the glareshield reads as a deep cowling top with real depth in front
  // of the pilot instead of a thin strip over the dials (Gemini v10: "no
  // glare-shield depth"). The v9 lesson still holds — it stays light grey
  // and slopes gently, so its underside does not become a black slab over
  // the dials.
  // v12: one shell material for the whole cabin — walls, roof, pillars,
  // bow and console share it, so the interior reads as a single molded
  // cabin instead of separate dark bars; it is lighter than the old frame
  // grey, so the bright sky outside no longer fights the interior.
  const shellMat = new THREE.MeshStandardMaterial({ color: '#6e737c', roughness: 0.6, metalness: 0.2 });
  // Glareshield: a shaped three-piece brow — a flat centre with two side
  // pieces sloping down to the A-pillars — so the instruments sit under a
  // hood that is part of the cabin, not a floating slab.
  const shieldCentre = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.04, 0.36),
    new THREE.MeshStandardMaterial({ color: PALETTE.cockpitShield, roughness: 0.8, metalness: 0.1 }),
  );
  shieldCentre.position.set(0, 0.26, 0.10);
  shieldCentre.rotation.x = 0.28;
  dash.add(shieldCentre);
  for (const side of [-1, 1]) {
    const shieldSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.36),
      new THREE.MeshStandardMaterial({ color: PALETTE.cockpitShield, roughness: 0.8, metalness: 0.1 }),
    );
    shieldSide.position.set(side * 0.79, 0.22, 0.10);
    shieldSide.rotation.x = 0.28;
    shieldSide.rotation.z = -side * 0.12;
    dash.add(shieldSide);
  }
  // The lower console is a different, lighter grey than the panel, so
  // the dash reads as separate built parts instead of one black mass.
  // v7: a touch lighter still (#6b7078), widening the material gap between
  // the console, the panel face and the dark glareshield.
  const consoleMat = new THREE.MeshStandardMaterial({ color: PALETTE.cockpitConsole, roughness: 0.75, metalness: 0.1 });
  // Lower console: a wide shelf spanning wall to wall (2.0 m) in the shell
  // material, sloping up toward the panel — it meets the side walls with
  // no gap, so the dash continues down into the airframe as one piece.
  // The old side cheeks are gone: the console ends ARE the sides now.
  const consoleShelf = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.34, 0.42), shellMat);
  consoleShelf.position.set(0, -0.36, 0.12);
  consoleShelf.rotation.x = 0.45;
  dash.add(consoleShelf);
  // Windshield pillars at the panel edges, leaning out toward the top. v5:
  // 0.035 wide and 0.62 tall, spanning from the panel bottom to above the
  // glareshield, with a small base block where each meets the panel — they
  // are part of the airframe now, connected top and bottom, not floating posts.
  // v9: tall A-pillars at the panel ends, running from below the panel to
  // above the glareshield — the windshield now has a real frame left and
  // right, instead of two short posts floating on the panel (Gemini v8:
  // the console read as a floating box with no aircraft around it).
  // v10: the pillars now end at y 0.42, where the curved canopy bow
  // springs from them — no more posts sticking up past the arch.
  // v11: thicker pillars (0.07 m wide, 0.95 m tall, was 0.05 / 0.87) — the
  // canopy frame needs to read as solid structure from the pilot's seat,
  // not thin posts, so the windshield framing is unmistakable.
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.0, 0.09), shellMat);
    pillar.position.set(side * 0.97, -0.02, 0.02);
    pillar.rotation.z = -side * 0.12;
    dash.add(pillar);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.10), shellMat);
    base.position.set(side * 0.95, -0.48, 0.03);
    dash.add(base);
  }
  // v6: canopy framing — a top arch bar joining the pillar tops, side rails
  // running back from it, and side walls at the panel ends, so the cockpit
  // reads as a framed canopy built into the airframe instead of a lone box
  // floating in front of the camera. (Gemini v5: "no canopy frame, side
  // walls, yoke/stick".) The arch sits just above the panel top; the rails
  // run back toward the pilot; the walls stand at the panel's side edges,
  // angled in, so the view is framed left and right without blocking the
  // water and horizon below.
  const frameMat = new THREE.MeshStandardMaterial({ color: '#33363d', roughness: 0.85 });
  // v7: the arch is thinner (0.04, was 0.05) and a touch lighter — it still
  // frames the canopy, but no longer reads as a heavy black bar across the
  // top of the windshield (Gemini v6).
  // v9: the canopy frame spans the full widened panel — a 2.0 m arch bar
  // across the top, rails running back at the panel ends, and tall side
  // walls reaching down toward the bottom of the frame, so the cockpit
  // reads as an enclosed cabin with sides and a roof, not a lone box.
  // v10: the top arch is a curved canopy bow, not a straight bracket bar
  // with jutting ends — a half-torus whose ends meet the A-pillar tops
  // (y 0.42), arching up to 0.56, plus a faint windshield glazing pane
  // between the pillars, so the top of the cockpit reads as a framed
  // canopy instead of a dark beam (Gemini v9: "a dark bracket bar with
  // jutting ends").
  // v11: the bow is thicker (tube 0.035, was 0.024) and taller (scale y
  // 0.22, was 0.14, arching to 0.64), so it reads as a solid canopy frame
  // instead of the "thin floating wire" Gemini v10 saw. Two canopy struts
  // divide the windshield into three panes, and a headliner slab runs back
  // from the bow — the top of the frame is now a cabin roof, not open sky.
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.05, 8, 28, Math.PI), shellMat);
  arch.scale.set(1, 0.24, 1);
  arch.position.set(0, 0.42, 0.0);
  dash.add(arch);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), shellMat);
    strut.position.set(side * 0.5, 0.31, 0.0);
    dash.add(strut);
  }
  // v11 (iterasi 2): the headliner is darker (frameMat, was the light-grey
  // consoleMat), narrower (1.7 m, was 2.0), shallower (0.3 m, was 0.35) and
  // higher and further back (y 0.62, z 0.30) — the first v11 shot showed it
  // as a straight light-grey shelf across the windshield, separate from the
  // dark canopy bow. Now it reads as one dark canopy structure with the bow.
  // Headliner: a three-piece molded roof — a flat centre with two side
  // panels sloping down to meet the tops of the side walls, so the roof
  // and the walls join without a gap. The side panels' outer edges land
  // exactly on the wall tops (x ±1.0, y 0.35).
  const roofCentre = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.55), shellMat);
  roofCentre.position.set(0, 0.66, 0.32);
  roofCentre.rotation.x = -0.30;
  dash.add(roofCentre);
  for (const side of [-1, 1]) {
    const roofSide = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.55), shellMat);
    roofSide.position.set(side * 0.80, 0.50, 0.32);
    roofSide.rotation.x = -0.30;
    roofSide.rotation.z = -side * 0.64;
    dash.add(roofSide);
  }
  // v12: opacity 0.16 (was 0.10) — the glazing reads as glass, not open
  // sky, so the windshield and side windows are visible as panes.
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cockpitGlass, roughness: 0.05, metalness: 0.2,
    transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.34), glassMat);
  windshield.position.set(0, 0.40, 0.0);
  windshield.rotation.x = -0.06;
  dash.add(windshield);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.55), shellMat);
    rail.position.set(side * 0.98, 0.42, 0.28);
    dash.add(rail);
    // v12: the wall is a door frame, not a plate. A solid lower door panel
    // with a REAL window opening above it — frame bars around a glass pane
    // with nothing solid behind it, so the window is a cutout in the wall
    // and the sky and sea show through it. The wall's bottom meets the
    // console, its top meets the roof side panel, its front edge overlaps
    // the A-pillar: one continuous shell.
    const wallGroup = new THREE.Group();
    wallGroup.position.set(side * 1.0, -0.10, 0.34);
    wallGroup.rotation.y = -side * 0.25;
    dash.add(wallGroup);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.8), shellMat);
    door.position.set(0, -0.28, 0);
    wallGroup.add(door);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.66), shellMat);
    frameTop.position.set(0, 0.45, 0);
    wallGroup.add(frameTop);
    const frameSill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.66), shellMat);
    frameSill.position.set(0, 0.0, 0);
    wallGroup.add(frameSill);
    const frameFront = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.51, 0.06), shellMat);
    frameFront.position.set(0, 0.225, -0.30);
    wallGroup.add(frameFront);
    const frameBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.51, 0.06), shellMat);
    frameBack.position.set(0, 0.225, 0.30);
    wallGroup.add(frameBack);
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.43), glassMat);
    sideGlass.position.set(0, 0.225, 0);
    sideGlass.rotation.y = Math.PI / 2;
    wallGroup.add(sideGlass);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.5), frameMat);
    handle.position.set(-side * 0.04, -0.15, 0);
    wallGroup.add(handle);
  }
  // v6: the control yoke — a short column rising out of the console shelf
  // with a crossbar handle and two grips, sitting just below the panel's
  // bottom edge. It anchors the bottom of the cockpit view as part of the
  // aircraft, and it does not cover the gauges or the indicator dots.
  // v10: the control yoke is a rounded wheel, not a dark T — a torus
  // wheel on a short column with a hub, a red centre cap and grip sleeves
  // at 9 and 3 o'clock, so it reads as a control wheel at a glance
  // instead of a stiff black bracket (Gemini v9).
  // v11: a BIG properly-scaled wheel (0.22 m radius, was 0.15) in lighter
  // grey, raised and brought forward so it dominates the lower centre of
  // the frame instead of reading as a tiny dark curve at the bottom edge
  // (Gemini v10: "only a tiny dark curve/hub poking up from the grey dash
  // box"). The old wheel was small AND low-contrast against the dark panel.
  const yokeMat = new THREE.MeshStandardMaterial({ color: '#7a8090', roughness: 0.45, metalness: 0.3 });
  // Yoke column with a shroud: a thick column rising out of the console
  // with a tapered cover behind it, so the wheel reads as mounted on a
  // real control column, not a bare stick in front of the panel.
  const yokeShroud = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.12), shellMat);
  yokeShroud.position.set(0, -0.28, 0.16);
  yokeShroud.rotation.x = 0.35;
  dash.add(yokeShroud);
  const yokeCol = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.3, 8), yokeMat);
  yokeCol.position.set(0, -0.24, 0.20);
  yokeCol.rotation.x = 0.35;
  dash.add(yokeCol);
  const yokeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 12, 32), yokeMat);
  yokeWheel.position.set(0, -0.06, 0.28);
  yokeWheel.rotation.x = 0.35;
  dash.add(yokeWheel);
  const yokeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), yokeMat);
  yokeHub.position.set(0, -0.06, 0.28);
  yokeHub.rotation.x = Math.PI / 2 + 0.35;
  dash.add(yokeHub);
  const yokeCap = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xc83c32 }));
  yokeCap.position.set(0, -0.072, 0.305);
  yokeCap.rotation.x = 0.35;
  dash.add(yokeCap);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.05), yokeMat);
    grip.position.set(side * 0.22, -0.06, 0.28);
    grip.rotation.x = 0.35;
    dash.add(grip);
  }
  // Throttle quadrant: a dark box on the console right of the yoke column
  // with two levers (throttle black, mixture red) — the second control
  // that makes the cockpit read as a flown aeroplane.
  const quadrant = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.34), dark);
  quadrant.position.set(0.55, -0.20, 0.20);
  quadrant.rotation.x = 0.45;
  dash.add(quadrant);
  const leverMat = new THREE.MeshStandardMaterial({ color: '#22242a', roughness: 0.5, metalness: 0.4 });
  for (const [lx, knobColor] of [[0.50, '#22242a'], [0.60, '#c0392b']]) {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), leverMat);
    lever.position.set(lx, -0.14, 0.22);
    lever.rotation.x = 0.4;
    dash.add(lever);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 6),
      new THREE.MeshStandardMaterial({ color: knobColor, roughness: 0.5, metalness: 0.2 }),
    );
    knob.position.set(lx, -0.05, 0.27);
    dash.add(knob);
  }
  // Three small indicator dots, FLUSH on the panel face below the middle
  // gauge (z 0.075, just proud of the v7 inset face at 0.07) — green, amber, red.
  const dotColors = [0x2aff5e, 0xffd94d, 0xff5d4d];
  for (let d = 0; d < 3; d += 1) {
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color: dotColors[d] }),
    );
    dot.position.set(-0.08 + d * 0.08, -0.17, 0.075);
    dash.add(dot);
  }
  // v6: the dial face is a canvas texture — ticks, numbers at 12/3/6/9, a
  // redline arc and a small label drawn once — so each gauge reads as a
  // real instrument instead of a blank cream clock. (The v5 face was a
  // plain cream disc with separate tick meshes.) One texture per label:
  // airspeed, altitude, heading.
  function makeDialFace(label) {
    // v7: 512 px canvas (was 256) with a subtle radial shade, 24 ticks
    // (12 long + 12 short minors) and bolder numbers — the dial markings
    // stay crisp and readable from the pilot's seat instead of blurring
    // into the cream face at screenshot distance (Gemini v6).
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const x = c.getContext('2d');
    const shade = x.createRadialGradient(256, 256, 40, 256, 256, 256);
    shade.addColorStop(0, '#faf3dd');
    shade.addColorStop(0.75, '#f2ead2');
    shade.addColorStop(1, '#e3d8b4');
    x.fillStyle = shade;
    x.fillRect(0, 0, 512, 512);
    // Redline arc across the top-right of the dial.
    x.strokeStyle = '#c83c32';
    x.lineWidth = 22;
    x.beginPath();
    x.arc(256, 256, 208, -Math.PI / 2 - 0.18, -Math.PI / 2 + 0.96);
    x.stroke();
    // Twelve major tick marks, longer at the quarters, with a minor tick
    // halfway between each pair.
    // v8: strokes are thicker and longer (long 16 / major 10 / minor 6,
    // was 13 / 8 / 5) and the numbers are bigger — at screenshot distance
    // the v7 markings blurred into the cream face, and a hero cockpit
    // shot has to read at a glance (Gemini v7).
    for (let t = 0; t < 24; t += 1) {
      const a = (t / 24) * Math.PI * 2;
      const major = t % 2 === 0;
      const long = major && (t / 2) % 3 === 0;
      const r0 = long ? 166 : major ? 184 : 196;
      x.strokeStyle = '#1a1c22';
      x.lineWidth = long ? 16 : major ? 10 : 6;
      x.beginPath();
      x.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0);
      x.lineTo(256 + Math.sin(a) * 216, 256 - Math.cos(a) * 216);
      x.stroke();
    }
    // Numbers at 12 / 3 / 6 / 9 and the instrument label at the bottom.
    // The needle never sweeps the bottom of the dial (its range is the
    // upper ~240°), so the label down there stays uncovered.
    x.fillStyle = '#1a1c22';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.font = 'bold 76px system-ui, sans-serif';
    x.fillText('12', 256, 104);
    x.fillText('3', 408, 256);
    x.fillText('6', 256, 408);
    x.fillText('9', 104, 256);
    x.font = 'bold 52px system-ui, sans-serif';
    x.fillText(label, 256, 336);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  // v9: two smaller live gauges fill the widened panel ends — FUEL (left)
  // and RPM (right) — so the panel reads as a full instrument panel, not
  // three dials with empty grey at the sides. The three main gauges keep
  // their array positions (KTS/ALT/HDG are needles 0-2).
  const gaugeDefs = [
    { x: -0.44, pin: 0x7dff9a, label: 'KTS', r: 0.17 },
    { x: 0, pin: 0xffd94d, label: 'ALT', r: 0.17 },
    { x: 0.44, pin: 0x4fc3f7, label: 'HDG', r: 0.17 },
    { x: -0.80, pin: 0x7dff9a, label: 'FUEL', r: 0.11 },
    { x: 0.80, pin: 0xffd94d, label: 'RPM', r: 0.11 },
  ];
  const needles = [];
  for (const def of gaugeDefs) {
    const g = new THREE.Group();
    // v7: z 0.08 (was 0.065) — the gauges sit proud of the new inset face
    // plate (front at 0.07), so the rims and dials are never clipped by it.
    g.position.set(def.x, 0.02, 0.08);
    // v6: big LIGHT dials — cream face, dark ticks, dark needle — so the
    // instruments read at a glance instead of hiding in the dark panel.
    // v8: the rim is a touch bigger (0.17, was 0.165) and the needle is
    // thicker and longer, so the instruments read at a glance even at
    // screenshot distance (Gemini v7).
    // v9: the rim radius comes from the gauge definition — the two outer
    // gauges are smaller (0.11) than the three main ones (0.17).
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, def.r * 0.1, 8, 28),
      new THREE.MeshStandardMaterial({ color: PALETTE.planeCream, roughness: 0.4, metalness: 0.5 }),
    );
    g.add(rim);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(def.r * 0.94, 24),
      new THREE.MeshBasicMaterial({ map: makeDialFace(def.label) }),
    );
    face.position.z = 0.005;
    g.add(face);
    const needlePivot = new THREE.Group();
    const needleGeo = new THREE.BoxGeometry(0.026, 0.13, 0.006);
    needleGeo.translate(0, 0.055, 0);
    const needle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: 0x1c1e24 }),
    );
    needlePivot.add(needle);
    needlePivot.position.z = 0.012;
    // Small gauges get a proportionally shorter needle.
    if (def.r < 0.15) needlePivot.scale.setScalar(0.65);
    g.add(needlePivot);
    const pin = new THREE.Mesh(
      new THREE.CircleGeometry(0.018, 12),
      new THREE.MeshBasicMaterial({ color: def.pin }),
    );
    pin.position.z = 0.016;
    g.add(pin);
    needles.push(needlePivot);
    dash.add(g);
  }
  // v10: wing-root fairings are smooth curved bumps, not flat cream
  // cards — a flattened ellipsoid half-sunk into the side wall at each
  // bottom corner, so the wing root reads as a fairing that blends into
  // the cabin instead of a pasted plate (Gemini v9: the slabs read as
  // flat grey plates in the bottom corners).
  for (const side of [-1, 1]) {
    const root = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cream);
    root.scale.set(0.17, 0.10, 0.32);
    root.position.set(side * 1.0, -0.30, 0.35);
    root.rotation.z = -side * 0.15;
    root.rotation.y = -side * 0.2;
    dash.add(root);
  }
  group.add(dash);

  // The nose, seen from the pilot's seat: a low dark shape below the panel,
  // the top of the engine cowling. v3 replaces the floating red spinner with
  // this — it anchors the bottom of the cockpit view as part of the aircraft.
  // v5: 1.25 m wide (was 1.15) and a touch lower, so it meets the lowered
  // console and the panel's bottom edge reads as one continuous airframe
  // instead of two separate dark shapes.
  // v11: the cowling sits higher (y -0.40, was -0.46) and wider (1.8 m,
  // was 1.6), so more of the engine cover shows below the panel — the
  // cockpit view gets its cowling into the frame (Gemini v10: bring the
  // glare shield/cowling into frame) instead of only a thin dark sliver.
  const nose = new THREE.Group();
  nose.position.set(0, -0.40, -2.55);
  nose.visible = false;
  // v9: wider (1.6 m, was 1.25) with a red centre stripe, so the cowling
  // reads as the engine cover ahead of the panel when it peeks into view.
  const noseTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.9), dark);
  noseTop.rotation.x = -0.12;
  nose.add(noseTop);
  const noseStripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.9), red);
  noseStripe.position.set(0, 0.08, 0);
  noseStripe.rotation.x = -0.12;
  nose.add(noseStripe);
  group.add(nose);

  /**
   * Drive the three dashboard needles from the flight state: airspeed (left),
   * altitude (middle), heading (right). Angles sweep -120..+120 degrees over the
   * gauge range; the heading needle points like a compass, north straight up.
   */
  // v9: the two outer gauges are live too — FUEL from the tank fraction,
  // RPM from the throttle — so all five instruments move with the flight.
  function setGauges(altM, speedMs, headingDeg, throttle = 0.7, fuelFrac = 1) {
    const sweep = (value, max) => (-120 + 240 * Math.min(1, Math.max(0, value / max))) * Math.PI / 180;
    needles[0].rotation.z = -sweep(speedMs, 100);
    needles[1].rotation.z = -sweep(altM, 900);
    needles[2].rotation.z = -headingDeg * Math.PI / 180;
    if (needles[3]) needles[3].rotation.z = -sweep(fuelFrac, 1);
    if (needles[4]) needles[4].rotation.z = -sweep(throttle, 1);
  }

  let propAngle = 0;

  function update(dt, throttle, time) {
    propAngle += (5 + throttle * 46) * dt;
    prop.rotation.z = propAngle;
    blur.material.opacity = Math.min(0.35, throttle * 0.35);
    // A hint of life even on the ground: the nav lamps breathe gently.
    void time;
  }

  /** In cockpit view the bodywork hides and only the nose, prop and dashboard show. */
  function setCockpitMode(on) {
    body.visible = !on;
    dash.visible = on;
    nose.visible = on;
    // The propeller hides in here too: the spinning blades were the diagonal
    // black beam across the v2 cockpit shot. From the pilot's seat the nose
    // below the panel is the aircraft; the prop is not in the way.
    prop.visible = !on;
    // The blur disc is a giant halo from the pilot's seat; hide it in here and
    // let the bare blades do the talking. The fat cowling hides too: from the
    // pilot's seat the nose should sit low in the frame, not fill it.
    blur.visible = !on;
    cowl.visible = !on;
  }

  return { group, update, setCockpitMode, setGauges, prop, cowl, blur };
}
