// The plane: a high-wing propeller tourer built from primitives — fuselage, cabin,
// wings with struts, tail, spinning prop and landing gear — so it reads as a thing
// that was built, not a shape that was drawn. Local forward is -Z; the renderer
// drives rotation from the flight state (yaw, pitch, roll) each frame.

import { PALETTE } from './config.js';

export function buildPlane(THREE, livery = null) {
  // v13: liveries — the race rivals share this airframe with different
  // colours. livery = { main, accent }; the player passes nothing and
  // keeps the red-and-white Caravan. Only the exterior paint changes:
  // cream body panels become `main`, red trim becomes `accent`.
  const mainColor = (livery && livery.main) || PALETTE.planeCream;
  const accentColor = (livery && livery.accent) || PALETTE.planeRed;
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  // v11: glossier premium materials (cream roughness 0.42, red 0.38, both
  // with more metalness) — the redesign prompt's improved material quality
  // and colour contrast, while the red-and-white scheme itself is kept.
  // v18: flatShading on the structural materials — Gemini's fix for
  // the "stacked rectangular blocks" read: faceted cylinders and
  // prisms catch the light as built parts, not smooth tubes.
  const cream = new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.42, metalness: 0.25, flatShading: true });
  const red = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.38, metalness: 0.25, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.planeGlass, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.85,
  });
  // v18: wheels/legs in dark slate #1F2937 (Gemini's spec, was #22242a).
  const dark = new THREE.MeshStandardMaterial({ color: '#1F2937', roughness: 0.9, flatShading: true });

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
  // v20: the cheatline is WIDER (0.30 m tall, was 0.22) — the v19
  // blind test said the plane melts into the sky from behind; a
  // broader red band keeps the fuselage readable from the chase
  // camera, and the red wingtips run further out (to 5.8 m, was 5.5).
  for (const side of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 4.2), red);
    stripe.position.set(side * 0.58, -0.12, 0.1);
    body.add(stripe);
  }
  // Cabin windows: four large dark glass panes per side, slightly proud of
  // the cabin wall, with the window rhythm of the real Caravan; two angled
  // windshield panes at the front of the cabin.
  // v18: cabin glass in dark slate #1E293B (Gemini's spec, was #22303f).
  const windowMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.15, metalness: 0.35 });
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
  // v18: a much stronger taper (front 0.42, was 0.56) — Gemini's fix:
  // the nose must narrow 1.0 -> 0.42, so the front reads as a
  // turboprop nose, not a blunt tube end.
  const noseSec = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.42, 0.5, 8), cream);
  noseSec.rotation.x = Math.PI / 2;
  noseSec.position.set(0, 0.05, -2.35);
  body.add(noseSec);
  // Red nose cowling. The cowling, prop and blur disc live on the group
  // (not the body) so the cockpit view can hide the bodywork while the
  // nose stays in sight ahead of the pilot.
  // v18: the cowling tapers too (0.58 -> 0.44, was 0.64 -> 0.55), so the
  // nose-to-cowl line keeps narrowing toward the prop.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.44, 0.9, 14), red);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.set(0, 0, -3.0);
  group.add(cowl);
  // Tail: a compact tapered octagonal section, cream, ending small — no
  // cone, no nozzle, no rocket bell.
  // v13: the fuselage tapers more clearly toward the tail — longer, to a
  // finer point — so the rear fuselage does not read as a flat tube.
  const tailTaper = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.55, 2.6, 8), cream);
  tailTaper.rotation.x = Math.PI / 2;
  tailTaper.position.set(0, 0.05, 3.5);
  body.add(tailTaper);

  // High wing: two halves with a clear dihedral (tips rise ~0.55 m), red
  // tips, an aileron seam on top, and red struts from the lower fuselage
  // side up to mid-span under the wing — thick and faceted, not a
  // paper-thin slab. Wingspan ~11 m tip to tip.
  // v13: stronger dihedral (0.11, was 0.07), a thicker root fairing and
  // bigger red wingtips, so the wing is the first thing read from behind
  // — not the fuselage tube. The aileron seam is darker and thicker, and
  // a trailing-edge hinge line marks the flap split.
  // v18: the wing is a TAPERED PRISM, not a slab box — chord 1.6 -> 1.15
  // (0.72, Gemini's spec), thickness 0.18 -> 0.12, dihedral 3 deg
  // (0.06 rad, was 0.11), so it reads as a faceted airfoil. The helper
  // builds flat faces from root to tip; the left half mirrors by a
  // negative length (its winding is reversed so the normals stay out).
  function taperedPrism(len, hRoot, hTip, cRoot, cTip) {
    const s = Math.sign(len) || 1;
    const L = Math.abs(len);
    const r = [
      [0, -hRoot / 2, -cRoot / 2], [0, hRoot / 2, -cRoot / 2],
      [0, hRoot / 2, cRoot / 2], [0, -hRoot / 2, cRoot / 2],
      [s * L, -hTip / 2, -cTip / 2], [s * L, hTip / 2, -cTip / 2],
      [s * L, hTip / 2, cTip / 2], [s * L, -hTip / 2, cTip / 2],
    ];
    // Faces wound outward: bottom, top, leading (-Z), trailing (+Z),
    // tip cap, root cap.
    const quads = [
      [3, 0, 4, 7], [1, 2, 6, 5], [0, 1, 5, 4],
      [3, 2, 7, 6], [4, 5, 6, 7], [1, 0, 3, 2],
    ];
    if (s < 0) for (const q of quads) q.reverse();
    const pos = [];
    for (const q of quads) {
      const [a, b, cc, d] = q;
      pos.push(...r[a], ...r[b], ...r[cc], ...r[a], ...r[cc], ...r[d]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  }
  for (const side of [-1, 1]) {
    const half = new THREE.Mesh(taperedPrism(side * 4.6, 0.18, 0.12, 1.6, 1.15), cream);
    half.position.set(0, 0.82, -0.4);
    half.rotation.z = side * 0.06;
    body.add(half);
    const rootFairing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.32, 1.75), cream);
    rootFairing.position.set(side * 0.85, 0.78, -0.4);
    rootFairing.rotation.z = side * 0.06;
    body.add(rootFairing);
    // Red wingtip: a tapered prism continuing the wing's taper
    // (chord 1.15 -> 1.05), spanning 4.6-5.8 m (v20: was 4.6-5.5).
    const tip = new THREE.Mesh(taperedPrism(side * 1.2, 0.12, 0.10, 1.15, 1.05), red);
    tip.position.set(side * 4.6, 1.10, -0.4);
    tip.rotation.z = side * 0.06;
    body.add(tip);
    // Aileron seam: a thin darker line near the trailing edge, so the wing
    // reads as control surfaces, not one blank plank.
    const aileronMat = new THREE.MeshStandardMaterial({ color: '#b8a888', roughness: 0.55, metalness: 0.25 });
    const aileron = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.03, 0.16), aileronMat);
    aileron.position.set(side * 2.3, 1.05, 0.28);
    aileron.rotation.z = side * 0.06;
    body.add(aileron);
    const hinge = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.03, 0.1),
      new THREE.MeshStandardMaterial({ color: '#8a8378', roughness: 0.6 }),
    );
    hinge.position.set(side * 2.3, 1.04, 0.38);
    hinge.rotation.z = side * 0.06;
    body.add(hinge);
    // Wing strut: red, from the lower fuselage side up to mid-span under
    // the wing — the Caravan's visible struts, readable from behind.
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), red);
    strut.position.set(side * 1.18, 0.35, -0.4);
    strut.rotation.z = -side * 0.986;
    body.add(strut);
    // Wingtip navigation light: red on the left, green on the right.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a1e : 0x2aff5e }),
    );
    lamp.position.set(side * 5.8, 1.24, -0.4);
    body.add(lamp);
  }

  // Tail: a wide horizontal stabiliser with red tips near the base of a
  // TALL stepped fin — cream with a red cap — plus a dorsal fin leading
  // edge running forward along the fuselage top. The fin rises to ~2.2 m
  // above the tail, so from the rear chase camera the tail reads as a
  // Caravan empennage, never as a cone.
  // v13: the stabiliser is wider and thicker, so it reads as a separate
  // tailplane from behind instead of merging into the fuselage tube.
  // v18: the stabiliser tapers like the wing (chord 1.15 -> 0.8,
  // thickness 0.16 -> 0.12) with red tapered tips — no more slab.
  for (const side of [-1, 1]) {
    const stabHalf = new THREE.Mesh(taperedPrism(side * 2.1, 0.16, 0.12, 1.15, 0.8), cream);
    stabHalf.position.set(0, 0.3, 4.2);
    body.add(stabHalf);
    const stabTip = new THREE.Mesh(taperedPrism(side * 0.5, 0.12, 0.10, 0.8, 0.75), red);
    stabTip.position.set(side * 1.6, 0.3, 4.2);
    body.add(stabTip);
  }
  // v13: the fin is shorter and wider than v12 — the old tall thin fin
  // read as a rocket fin from directly behind. Red cap stays.
  const finLower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 1.6), cream);
  finLower.position.set(0, 0.55, 3.95);
  body.add(finLower);
  const finUpper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 1.2), cream);
  finUpper.position.set(0, 1.3, 4.05);
  body.add(finUpper);
  const finTip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 1.0), red);
  finTip.position.set(0, 1.72, 4.08);
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
  // plane (y = -1.58 in plane-local coordinates, the origin being the
  // plane centre), so the plane sits level on the ground.
  // v13: thicker legs and bigger wheels, so the gear reads from behind
  // instead of vanishing under the belly.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.62, 6), dark);
    leg.position.set(side * 0.75, -0.89, 0.5);
    body.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.24, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.75, -1.2, 0.5);
    body.add(wheel);
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#9aa0aa', roughness: 0.4, metalness: 0.6 }));
    hubCap.rotation.z = Math.PI / 2;
    hubCap.position.set(side * 0.75, -1.2, 0.5);
    body.add(hubCap);
  }
  const noseLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6), dark);
  noseLeg.position.set(0, -0.90, -2.3);
  body.add(noseLeg);
  const noseWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), dark);
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
  // v13: the spinner is red and bigger, the blades are longer and the
  // blur disc is wider and stronger — from behind, the front of the plane
  // must read as a propeller, never as a cone nose.
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 12), red);
  hub.rotation.x = -Math.PI / 2;
  prop.add(hub);
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), red);
  hubRing.position.set(0, 0, 0.2);
  prop.add(hubRing);
  const hubTip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 10), red);
  hubTip.rotation.x = -Math.PI / 2;
  hubTip.position.set(0, 0, -0.32);
  prop.add(hubTip);
  for (const angle of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.07), dark);
    blade.rotation.z = angle;
    blade.position.set(0, 0, -0.1);
    prop.add(blade);
  }
  // v21: the blur disc is a RADIAL-GRADIENT ring texture, not a
  // solid disc — transparent at the hub AND at the rim, peaking
  // mid-radius, with three faint dark blade streaks. The v20 solid
  // disc (uniform #8a9199 at 0.25 opacity, 1.7 m) still read as a
  // big pale bubble behind the plane in the v20 live playtest: a
  // flat circle with a hard edge IS a disc. A soft ring with no
  // hard edge reads as spinning blur. Radius 1.55 m (was 1.7).
  const blurTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, 'rgba(200,205,212,0)');
    grad.addColorStop(0.25, 'rgba(200,205,212,0.12)');
    grad.addColorStop(0.55, 'rgba(180,186,194,0.55)');
    grad.addColorStop(0.8, 'rgba(160,167,176,0.8)');
    grad.addColorStop(1, 'rgba(160,167,176,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    // Three faint dark blade streaks, so the ring reads as blades in
    // motion, not a clean annulus.
    g.strokeStyle = 'rgba(70,76,84,0.35)';
    g.lineWidth = 10;
    for (let k = 0; k < 3; k += 1) {
      const a = (k * Math.PI * 2) / 3 + 0.4;
      g.beginPath();
      g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30);
      g.lineTo(128 + Math.cos(a) * 122, 128 + Math.sin(a) * 122);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 28),
    new THREE.MeshBasicMaterial({
      map: blurTex, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
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
  dash.position.set(0, -0.24, -2.1);
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
  // v13: lighter still (#70767f), so the cream dials stand out from it.
  const faceMat = new THREE.MeshStandardMaterial({ color: '#70767f', roughness: 0.65, metalness: 0.1 });
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.34, 0.02), faceMat);
  face.position.set(0, 0.01, 0.06);
  dash.add(face);
  // v21: the red panel trims are GONE — Gemini v20 read the long
  // red strip across the dash as a placeholder block. The panel is
  // framed by its own inset face + the glareshield above it, not by
  // a red bar.
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
  // v18: dark-slate trim (#273244, Gemini's spec) for the THIN canopy
  // frame elements — pillars, arch, struts, rails, rear posts — so the
  // frame reads as structure, not slabs. The big shell parts (walls,
  // roof, console) keep the lighter shell grey.
  // v19: #242B35 (Gemini v19 #3) — a touch darker, so the frame reads
  // as structure against the bright sky without glare.
  // v22 (Gemini v21 #3): the cockpit frame is a shade LIGHTER
  // (#3a4149, was #242B35) — the v21 cockpit read as a boxy
  // flat-shaded cage; a lighter trim with the same geometry reads as
  // a smooth moulded frame instead of a dark cage.
  const trimMat = new THREE.MeshStandardMaterial({ color: '#3a4149', roughness: 0.6, metalness: 0.2 });
  // Glareshield: a shaped three-piece brow — a flat centre with two side
  // pieces sloping down to the A-pillars — so the instruments sit under a
  // hood that is part of the cabin, not a floating slab.
  // v13: the glareshield is a THIN brow now, not a slab — 0.20 m deep
  // (was 0.36), 0.03 thick, lighter (#565b64) and set back, with a thin
  // red pinstripe along its front lip — so it reads as a brow over the
  // dials instead of the big dark slab that dominated the v12 cockpit
  // frame and hid the top half of every dial.
  // v18: the glareshield is dark slate #1E293B (Gemini's spec, was
  // #565b64) — it stays a THIN brow (0.03 thick), so it reads as a
  // shaded brow over the dials, not the big dark slab of v12.
  const shieldMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8, metalness: 0.1 });
  const shieldCentre = new THREE.Mesh(
    new THREE.BoxGeometry(1.71, 0.03, 0.20),
    shieldMat,
  );
  shieldCentre.position.set(0, 0.20, 0.06);
  shieldCentre.rotation.x = 0.20;
  dash.add(shieldCentre);
  for (const side of [-1, 1]) {
    const shieldSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.03, 0.20),
      shieldMat,
    );
    shieldSide.position.set(side * 0.85, 0.18, 0.06);
    shieldSide.rotation.x = 0.20;
    shieldSide.rotation.z = -side * 0.10;
    dash.add(shieldSide);
  }
  // v21: the glareshield lip carries a LIGHT rim highlight
  // (#94A3B8), not the red pinstripe — Gemini v21's spec is a
  // contoured glare shield with a rim highlight; the red stripe
  // read as a placeholder bar across the dash (Gemini v20).
  const rimLightMat = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4, metalness: 0.3 });
  const shieldRim = new THREE.Mesh(new THREE.BoxGeometry(1.71, 0.012, 0.02), rimLightMat);
  shieldRim.position.set(0, 0.215, -0.035);
  shieldRim.rotation.x = 0.20;
  dash.add(shieldRim);
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
  // v17: slimmer pillars (0.07 m, was 0.11; base 0.09, was 0.13) —
  // the v16 live playtest found the thick pillars eating the
  // windshield; the frame still reads as solid structure.
  // v18: slimmer pillars (0.05 m, was 0.07; base 0.07, was 0.09) in
  // dark-slate trim — Gemini's fix: the v17 pillars still ate the
  // windshield; thin dark bars frame it without blocking it.
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.09), trimMat);
    pillar.position.set(side * 0.97, -0.02, 0.02);
    pillar.rotation.z = -side * 0.12;
    dash.add(pillar);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.10), trimMat);
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
  // v17: the arch tube is slimmer (0.04, was 0.05) with the pillars.
  // v18: arch tube 0.035 (was 0.04) in dark-slate trim, with the pillars.
  // v22: the arch tube is SLIMMER (0.03, was 0.035) — with the lighter
  // trim the top arch reads as a smooth strut instead of a thick bar.
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.03, 8, 28, Math.PI), trimMat);
  arch.scale.set(1, 0.24, 1);
  arch.position.set(0, 0.42, 0.0);
  dash.add(arch);
  // v21: the two windshield struts are GONE — they divided the
  // windshield into three panes with thin bars, and Gemini v20 read
  // the canopy frame as a "scaffolding cage". The windshield is one
  // clear pane now, framed by the A-pillars + the canopy bow alone.
  // v11 (iterasi 2): the headliner is darker (frameMat, was the light-grey
  // consoleMat), narrower (1.7 m, was 2.0), shallower (0.3 m, was 0.35) and
  // higher and further back (y 0.62, z 0.30) — the first v11 shot showed it
  // as a straight light-grey shelf across the windshield, separate from the
  // dark canopy bow. Now it reads as one dark canopy structure with the bow.
  // Headliner: a three-piece molded roof — a flat centre with two side
  // panels sloping down to meet the tops of the side walls, so the roof
  // and the walls join without a gap. The side panels' outer edges land
  // exactly on the wall tops (x ±1.0, y 0.35).
  // v13: the headliner runs further back over the pilot (0.85 m deep,
  // was 0.55), with two cross ribs and a centre spine, so the roof reads
  // as a built cabin ceiling instead of a short shelf that stops above
  // the windshield.
  // v14: the headliner centre is NARROWER (0.95 m, was 1.15) and DARKER
  // (roofMat #5a5f68, was the pale shell grey) — in v13 the wide pale
  // centre slab filled the top-right of the cockpit frame and read as a
  // loose grey board. A narrower, darker roof reads as a molded ceiling.
  // A second rear arch (half-torus at z 0.55) joins the roof to the rear
  // posts, so the canopy cage closes at the back instead of ending open.
  // v16: the headliner centre is WIDER (1.30 m, was 0.95) and DARKER
  // still (roofMat #565b64, was #5a5f68) — in v15 the narrow pale roof
  // still read as a loose board and the cabin as open frame. A wide
  // dark ceiling closes the cabin visually from the pilot's seat.
  // (A darker #4a4e56 was tried first: the roof read as one heavy
  // black slab across the cockpit frame, so it came back a shade.)
  const roofMat = new THREE.MeshStandardMaterial({ color: '#565b64', roughness: 0.7, metalness: 0.1 });
  const roofCentre = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.04, 0.85), roofMat);
  roofCentre.position.set(0, 0.71, 0.475);
  roofCentre.rotation.x = -0.30;
  dash.add(roofCentre);
  for (const ribZ of [0.70, 0.88]) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.03, 0.06), roofMat);
    rib.position.set(0, 0.71 + (ribZ - 0.475) * 0.30 + 0.02, ribZ);
    rib.rotation.x = -0.30;
    dash.add(rib);
  }
  const roofSpine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.85), roofMat);
  roofSpine.position.set(0, 0.73, 0.475);
  roofSpine.rotation.x = -0.30;
  dash.add(roofSpine);
  const rearArch = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.045, 8, 28, Math.PI), trimMat);
  rearArch.scale.set(1, 0.24, 1);
  rearArch.position.set(0, 0.42, 0.55);
  dash.add(rearArch);
  for (const side of [-1, 1]) {
    const roofSide = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.85), shellMat);
    roofSide.position.set(side * 0.80, 0.55, 0.475);
    roofSide.rotation.x = -0.30;
    roofSide.rotation.z = -side * 0.64;
    dash.add(roofSide);
  }
  // v16: opacity 0.30 (was 0.22) — the v15 cockpit still read as open
  // canopy in places; more glass presence closes the cabin visually.
  // A faint diagonal glare streak on the windshield, so the glass reads
  // as glass (a bright sky reflection) instead of open air.
  const glassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.cockpitGlass, roughness: 0.05, metalness: 0.2,
    transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false,
  });
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.34), glassMat);
  windshield.position.set(0, 0.40, 0.0);
  windshield.rotation.x = -0.06;
  dash.add(windshield);
  const glare = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, depthWrite: false }),
  );
  glare.position.set(0.25, 0.46, 0.012);
  glare.rotation.z = -0.5;
  dash.add(glare);
  // v13: the side rails run further back and slope up from the arch, and
  // a rear post joins each rail end down to the wall — the canopy frame
  // now reads as a full cabin cage, not two rails that stop mid-air.
  // The side walls are TALLER (door 0.72 m, window 0.52 m), so the cabin
  // sides reach up to meet the roof instead of ending halfway.
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.85), trimMat);
    rail.position.set(side * 0.98, 0.47, 0.42);
    rail.rotation.x = -0.12;
    dash.add(rail);
    // v18: slimmer rear posts (0.035, was 0.04) in dark-slate trim.
    const rearPost = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.035), trimMat);
    rearPost.position.set(side * 0.98, 0.27, 0.80);
    dash.add(rearPost);
    // v12: the wall is a door frame, not a plate. A solid lower door panel
    // with a REAL window opening above it — frame bars around a glass pane
    // with nothing solid behind it, so the window is a cutout in the wall
    // and the sky and sea show through it. The wall's bottom meets the
    // console, its top meets the roof side panel, its front edge overlaps
    // the A-pillar: one continuous shell.
    const wallGroup = new THREE.Group();
    wallGroup.position.set(side * 1.0, 0.0, 0.34);
    wallGroup.rotation.y = -side * 0.25;
    dash.add(wallGroup);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.8), shellMat);
    door.position.set(0, -0.18, 0);
    wallGroup.add(door);
    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.66), shellMat);
    frameTop.position.set(0, 0.55, 0);
    wallGroup.add(frameTop);
    const frameSill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.66), shellMat);
    frameSill.position.set(0, 0.12, 0);
    wallGroup.add(frameSill);
    const frameFront = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), shellMat);
    frameFront.position.set(0, 0.30, -0.30);
    wallGroup.add(frameFront);
    const frameBack = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 0.06), shellMat);
    frameBack.position.set(0, 0.30, 0.30);
    wallGroup.add(frameBack);
    const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.52), glassMat);
    sideGlass.position.set(0, 0.30, 0);
    sideGlass.rotation.y = Math.PI / 2;
    wallGroup.add(sideGlass);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.5), frameMat);
    handle.position.set(-side * 0.04, -0.08, 0);
    wallGroup.add(handle);
    // v14: gusset — a small block closing the front-bottom corner where
    // the wall meets the console and the A-pillar, so no sliver of sky
    // shows through at the cockpit's lower corners.
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.24), shellMat);
    gusset.position.set(0, 0.02, -0.28);
    gusset.rotation.x = 0.5;
    wallGroup.add(gusset);
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
  // v16: the wheel drops BELOW the gauges (centre y -0.26, was -0.06)
  // and shrinks to 0.18 m (was 0.24) — in v15 its top edge covered the
  // bottom of the middle ALT dial, and Gemini read the dials as cut by
  // the yoke. The column and shroud drop with it, so the wheel still
  // reads as mounted on a real control column.
  const yokeShroud = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.12), shellMat);
  yokeShroud.position.set(0, -0.34, 0.18);
  yokeShroud.rotation.x = 0.35;
  dash.add(yokeShroud);
  const yokeCol = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.3, 8), yokeMat);
  yokeCol.position.set(0, -0.30, 0.24);
  yokeCol.rotation.x = 0.35;
  dash.add(yokeCol);
  // v13: the wheel is bigger still (0.24 m radius, was 0.22), so it
  // anchors the lower centre of the frame as a real control wheel.
  const yokeWheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 12, 32), yokeMat);
  yokeWheel.position.set(0, -0.26, 0.30);
  yokeWheel.rotation.x = 0.35;
  dash.add(yokeWheel);
  const yokeHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), yokeMat);
  yokeHub.position.set(0, -0.26, 0.30);
  yokeHub.rotation.x = Math.PI / 2 + 0.35;
  dash.add(yokeHub);
  const yokeCap = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), new THREE.MeshBasicMaterial({ color: 0xc83c32 }));
  yokeCap.position.set(0, -0.272, 0.325);
  yokeCap.rotation.x = 0.35;
  dash.add(yokeCap);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, 0.05), yokeMat);
    grip.position.set(side * 0.18, -0.26, 0.30);
    grip.rotation.x = 0.35;
    dash.add(grip);
  }
  // Throttle quadrant: a sloped pedestal in the console's own shell
  // grey (NOT a dark floating box) with a visible slot the levers
  // slide in — the second control that makes the cockpit read as a
  // flown aeroplane. v21: the old dark box (0.22 x 0.12 x 0.34) with
  // two thin sticks read as a "dark box with two black sticks", a
  // placeholder block (Gemini v20). The new quadrant is lower and
  // flatter, sloped to match the console shelf (rotation.x 0.45),
  // sitting ON the shelf, with longer levers (0.26 m) and bigger
  // knobs (throttle black, mixture red).
  const quadrant = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.36), shellMat);
  quadrant.position.set(0.55, -0.30, 0.22);
  quadrant.rotation.x = 0.45;
  dash.add(quadrant);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.012, 0.30), dark);
  slot.position.set(0.55, -0.265, 0.22);
  slot.rotation.x = 0.45;
  dash.add(slot);
  const leverMat = new THREE.MeshStandardMaterial({ color: '#22242a', roughness: 0.5, metalness: 0.4 });
  for (const [lx, knobColor] of [[0.50, '#22242a'], [0.60, '#c0392b']]) {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6), leverMat);
    lever.position.set(lx, -0.20, 0.24);
    lever.rotation.x = 0.7;
    dash.add(lever);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 6),
      new THREE.MeshStandardMaterial({ color: knobColor, roughness: 0.5, metalness: 0.2 }),
    );
    knob.position.set(lx, -0.10, 0.30);
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
  // v20: REAL instrument scales on a 1024 px canvas — the v19 dials
  // still read as generic clocks (12/3/6/9) with the needle crossing
  // the numerals, and Gemini v19 called them canvas noise. Each gauge
  // now draws its own scale on the needle's sweep arc (-120..+120 deg
  // from 12 o'clock): IAS 0/25/50/75/100, ALT 0/225/450/675/900,
  // VSI -10/-5/0/5/10, RPM 0/1/2/3/4. HDG is a compass (N/E/S/W at
  // the cardinals, needle rotates 360 deg, so it gets NO badge — any
  // fixed label at the bottom would be crossed by the needle when
  // heading south). Numbers sit at radius 380, ticks outside them
  // (430-470), redline at 480 (IAS/RPM only). The needle (shortened
  // in the gauge build below) ends at canvas radius ~339, clear of
  // the numerals. `kind` is the gauge label (IAS/ALT/HDG/VSI/RPM).
  function makeDialFace(label, kind) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const x = c.getContext('2d');
    const CX = 512;
    const CY = 512;
    // v21: a LIGHT-GREY face, not near-white (#F1F5F9 centre,
    // #E8EEF4 mid, #CBD5E1 edge — was #FFFFFF / #F8FAFC /
    // #E2E8F0). The v20 face is MeshBasicMaterial (unlit, full
    // brightness), so pure white blew out to a featureless glare in
    // the cockpit shot (Gemini v20: the rightmost dial "mostly
    // blown-out white/yellow"). A light-grey face keeps the dark
    // numerals high-contrast without ever blowing out.
    const shade = x.createRadialGradient(CX, CY, 80, CX, CY, 512);
    shade.addColorStop(0, '#f1f5f9');
    shade.addColorStop(0.75, '#e8eef4');
    shade.addColorStop(1, '#cbd5e1');
    x.fillStyle = shade;
    x.fillRect(0, 0, 1024, 1024);
    // A point at `deg` degrees clockwise from 12 o'clock, radius r.
    const pt = (deg, r) => {
      const a = (deg * Math.PI) / 180;
      return [CX + Math.sin(a) * r, CY - Math.cos(a) * r];
    };
    const SCALES = {
      IAS: ['0', '25', '50', '75', '100'],
      ALT: ['0', '225', '450', '675', '900'],
      VSI: ['-10', '-5', '0', '5', '10'],
      RPM: ['0', '1', '2', '3', '4'],
    };
    if (kind === 'HDG') {
      // Compass: major ticks every 30 deg, minors every 15 deg, and
      // the cardinal letters on the arc — no badge, no redline.
      for (let t = 0; t < 24; t += 1) {
        const deg = t * 15;
        const major = t % 2 === 0;
        const [x0, y0] = pt(deg, major ? 430 : 445);
        const [x1, y1] = pt(deg, 470);
        x.strokeStyle = '#1a1c22';
        x.lineWidth = major ? 14 : 8;
        x.beginPath();
        x.moveTo(x0, y0);
        x.lineTo(x1, y1);
        x.stroke();
      }
      x.fillStyle = '#0f172a';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      // v21: 128 px letters (was 110) — the compass cardinals must
      // read without zooming.
      x.font = 'bold 128px system-ui, sans-serif';
      for (const [letter, deg] of [['N', 0], ['E', 90], ['S', 180], ['W', 270]]) {
        const [nx, ny] = pt(deg, 380);
        x.fillText(letter, nx, ny);
      }
    } else if (kind !== 'ATT') {
      // (ATT skips the numeric scale entirely — its face is the
      // transparent-window attitude face built below.)
      const labels = SCALES[kind] || SCALES.IAS;
      // Redline on the top-right of the airspeed and RPM dials only.
      if (kind === 'IAS' || kind === 'RPM') {
        x.strokeStyle = '#c83c32';
        x.lineWidth = 26;
        x.beginPath();
        // deg +60..+120 clockwise from 12 o'clock is canvas angle
        // -30..+30 deg from 3 o'clock.
        x.arc(CX, CY, 480, -Math.PI / 6 - 0.05, Math.PI / 6 + 0.05);
        x.stroke();
      }
      // Major ticks at each scale position, minors halfway between.
      for (let i = 0; i < 5; i += 1) {
        const deg = -120 + i * 60;
        const [x0, y0] = pt(deg, 430);
        const [x1, y1] = pt(deg, 470);
        x.strokeStyle = '#1a1c22';
        x.lineWidth = 16;
        x.beginPath();
        x.moveTo(x0, y0);
        x.lineTo(x1, y1);
        x.stroke();
      }
      for (let i = 0; i < 4; i += 1) {
        const deg = -90 + i * 60;
        const [x0, y0] = pt(deg, 445);
        const [x1, y1] = pt(deg, 470);
        x.strokeStyle = '#1a1c22';
        x.lineWidth = 8;
        x.beginPath();
        x.moveTo(x0, y0);
        x.lineTo(x1, y1);
        x.stroke();
      }
      // Scale numbers on the arc, clear of the ticks and the needle.
      x.fillStyle = '#0f172a';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      // v21: 118 px numerals (was 96) — the v20 dials still read as
      // "canvas noise" at screenshot scale (Gemini v20); the numbers
      // must be legible without zooming.
      x.font = 'bold 118px system-ui, sans-serif';
      for (let i = 0; i < 5; i += 1) {
        const deg = -120 + i * 60;
        const [nx, ny] = pt(deg, 380);
        x.fillText(labels[i], nx, ny);
      }
      // v21: the ALT dial carries a VSI mini-scale in its needle-free
      // bottom sector (the main needle sweeps only the upper 240°):
      // -10 / 0 / +10 m/s at 120° / 180° / 240°, with ticks — so the
      // panel keeps a live vertical-speed readout now that the outer
      // VSI dial has become the attitude indicator. The blue VSI
      // needle (see the gauge build) sweeps this sector. The "0"
      // label sits below the badge (badge y 764-836, label y 892),
      // so nothing overlaps.
      if (kind === 'ALT') {
        x.font = 'bold 64px system-ui, sans-serif';
        for (const [vLabel, vDeg] of [['-10', 120], ['0', 180], ['+10', 240]]) {
          const [nx, ny] = pt(vDeg, 380);
          x.fillText(vLabel, nx, ny);
          const [tx0, ty0] = pt(vDeg, 430);
          const [tx1, ty1] = pt(vDeg, 470);
          x.strokeStyle = '#1d4ed8';
          x.lineWidth = 10;
          x.beginPath();
          x.moveTo(tx0, ty0);
          x.lineTo(tx1, ty1);
          x.stroke();
        }
      }
      // Sub-label badge in the needle-free bottom sector (the needle
      // sweeps only the upper 240 deg, never the bottom 120 deg).
      const badgeW = 210;
      const badgeH = 72;
      const badgeY = 800;
      x.fillStyle = '#0f172a';
      x.beginPath();
      x.roundRect(CX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 20);
      x.fill();
      x.fillStyle = '#ffffff';
      // v21: 62 px badge text (was 56).
      x.font = 'bold 62px system-ui, sans-serif';
      x.fillText(label, CX, badgeY + 2);
    }
    // v21: the ATTITUDE face — an outer ring + fixed aircraft symbol
    // with a TRANSPARENT centre window, so the live horizon disc
    // (built in the gauge loop) shows through it. The window is
    // punched with destination-out; the ring, ticks and badge stay
    // opaque. The fixed symbol (white bar + centre dot) never moves;
    // the horizon turns behind it.
    if (kind === 'ATT') {
      x.globalCompositeOperation = 'destination-out';
      x.beginPath();
      x.arc(CX, CY, 450, 0, Math.PI * 2);
      x.fill();
      x.globalCompositeOperation = 'source-over';
      // Fixed reference ticks at the rim (radius 470-500, in the
      // opaque annulus): 12/3/6/9, so the horizon's tilt reads
      // against fixed marks.
      for (const deg of [0, 90, 180, 270]) {
        const [x0, y0] = pt(deg, 470);
        const [x1, y1] = pt(deg, 500);
        x.strokeStyle = '#0f172a';
        x.lineWidth = 14;
        x.beginPath();
        x.moveTo(x0, y0);
        x.lineTo(x1, y1);
        x.stroke();
      }
      // Fixed aircraft symbol: a white bar + centre dot at the
      // dial's centre, drawn over the horizon disc.
      x.strokeStyle = '#ffffff';
      x.lineWidth = 16;
      x.beginPath();
      x.moveTo(CX - 110, CY);
      x.lineTo(CX - 28, CY);
      x.moveTo(CX + 28, CY);
      x.lineTo(CX + 110, CY);
      x.stroke();
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.arc(CX, CY, 16, 0, Math.PI * 2);
      x.fill();
      // The ATT badge sits at the bottom, over the disc's lower part.
      const badgeW = 210;
      const badgeH = 72;
      const badgeY = 800;
      x.fillStyle = '#0f172a';
      x.beginPath();
      x.roundRect(CX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 20);
      x.fill();
      x.fillStyle = '#ffffff';
      x.font = 'bold 62px system-ui, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('ATT', CX, badgeY + 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // Gemini's fix prompt: high-DPI canvas textures with anisotropy so
    // the dial numbers stay sharp at 1920x1080 and 1280x720 — the canvas
    // is now 1024x1024 (was 512); anisotropy 8 (three.js clamps it to the
    // hardware maximum) keeps the numerals crisp at glancing angles.
    tex.anisotropy = 8;
    return tex;
  }
  // v9: two smaller live gauges fill the widened panel ends — FUEL (left)
  // and RPM (right) — so the panel reads as a full instrument panel, not
  // three dials with empty grey at the sides. The three main gauges keep
  // their array positions (KTS/ALT/HDG are needles 0-2).
  // v13: the main dials are bigger still (rim 0.19, was 0.17; outer
  // gauges 0.13, was 0.11) and sit a touch lower on the panel, so the
  // whole dial — rim to label — stays on the panel face, clear of the
  // glareshield brow above it.
  // v19 (Gemini v18 #4): main r 0.20, outer r 0.14 — a touch bigger
  // still; the labels are short (IAS/ALT/HDG/VSI/RPM) and the left
  // outer gauge is now a VERTICAL SPEED indicator (fuel already shows
  // in the HUD bar), so the panel reads as a real six-pack fragment.
  // v21 (Gemini v21 #3): the five dials are now IAS / ALT(+VSI) /
  // HDG / ATT / RPM — the outer-left dial is an ATTITUDE indicator
  // (blue/brown horizon ball), not a VSI; the vertical speed lives
  // on the ALT dial as a blue VSI bug + mini-scale (see makeDialFace).
  // Gemini's five: 1) IAS 2) Attitude/horizon 3) Altimeter/VSI
  // 4) Heading/compass 5) RPM/fuel.
  const gaugeDefs = [
    { x: -0.44, pin: 0x7dff9a, label: 'IAS', r: 0.20 },
    { x: 0, pin: 0xffd94d, label: 'ALT', r: 0.20 },
    { x: 0.44, pin: 0x4fc3f7, label: 'HDG', r: 0.20 },
    { x: -0.80, pin: 0x7dff9a, label: 'ATT', r: 0.14 },
    { x: 0.80, pin: 0xffd94d, label: 'RPM', r: 0.14 },
  ];
  const needles = [];
  // v21: the attitude horizon disc (ATT gauge) and the ALT dial's
  // blue VSI bug — driven by setGauges (roll/pitch, verticalSpeed).
  let attDisc = null;
  let vsiBug = null;
  // v21: the horizon-ball texture — sky blue over earth brown with a
  // white horizon line and a pitch ladder, so the ATT dial reads as
  // a real attitude indicator instead of a blank disc.
  function makeHorizonTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#3b82f6';
    x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#8b5a2b';
    x.fillRect(0, 256, 512, 256);
    x.strokeStyle = '#ffffff';
    x.lineWidth = 8;
    x.beginPath();
    x.moveTo(0, 256);
    x.lineTo(512, 256);
    x.stroke();
    // Pitch ladder: short white lines at ±20° and ±40° (90° of pitch
    // is the half-canvas, 256 px).
    x.strokeStyle = 'rgba(255,255,255,0.85)';
    x.lineWidth = 6;
    for (const deg of [-40, -20, 20, 40]) {
      const ly = 256 - (deg / 90) * 256;
      x.beginPath();
      x.moveTo(206, ly);
      x.lineTo(306, ly);
      x.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  for (const def of gaugeDefs) {
    const g = new THREE.Group();
    // v7: z 0.08 (was 0.065) — the gauges sit proud of the new inset face
    // plate (front at 0.07), so the rims and dials are never clipped by it.
    g.position.set(def.x, -0.01, 0.08);
    // v21: a DARK bezel (#2E3440, low metalness) instead of the cream
    // rim — the v20 cream rim with metalness 0.5 caught the sun and
    // glared yellow around every dial (Gemini v20: the rightmost dial
    // "blown-out white/yellow"). A dark bezel frames the light face
    // and kills the glare.
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(def.r, def.r * 0.1, 8, 28),
      new THREE.MeshStandardMaterial({ color: '#2e3440', roughness: 0.5, metalness: 0.2 }),
    );
    g.add(rim);
    if (def.label === 'ATT') {
      // The attitude gauge: a live horizon disc behind a face with a
      // transparent centre window (see makeDialFace 'ATT'). The face
      // is a full-radius circle (not 0.94r) so its opaque annulus
      // hides the disc's outer ring; the disc (r*1.07) stays covered
      // even when it shifts ±0.02 m with pitch.
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(def.r * 1.07, 32),
        new THREE.MeshBasicMaterial({ map: makeHorizonTexture() }),
      );
      disc.position.z = 0.002;
      g.add(disc);
      attDisc = disc;
      const face = new THREE.Mesh(
        new THREE.CircleGeometry(def.r, 32),
        new THREE.MeshBasicMaterial({ map: makeDialFace(def.label, def.label), transparent: true }),
      );
      face.position.z = 0.005;
      g.add(face);
      // No needle and no pin on the attitude gauge — the fixed
      // aircraft symbol is drawn on the face itself.
      needles.push(null);
      dash.add(g);
      continue;
    }
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(def.r * 0.94, 24),
      new THREE.MeshBasicMaterial({ map: makeDialFace(def.label, def.label) }),
    );
    face.position.z = 0.005;
    g.add(face);
    const needlePivot = new THREE.Group();
    // v15: high-visibility orange-red needles (#FF4D1A, Gemini's fix
    // prompt), thicker and longer than the old dark ones — the v14
    // cockpit shot's dials read small and low-contrast, and a needle
    // must read at a glance against the cream face at screenshot distance.
    // v17: longer needle (0.185, was 0.17) — it reaches further toward
    // the rim, so the reading is easier at a glance.
    // v20: SHORTER needle (0.155 long, tip at 0.1325 m from the pivot,
    // was 0.185 / tip 0.1575) — the v19 needle tip reached the numerals
    // (canvas radius 380 = 0.139 m on a 0.20 m dial), so the needle
    // crossed the numbers it was pointing at. The tip now stops just
    // short of the scale numerals. Colour #E53935 (Gemini v19 #4).
    const needleGeo = new THREE.BoxGeometry(0.042, 0.155, 0.006);
    needleGeo.translate(0, 0.055, 0);
    const needle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: 0xe53935 }),
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
    // v21: the ALT dial's blue VSI bug — a small marker riding the
    // dial's rim at the VSI mini-scale (labels at canvas radius 380
    // = 0.148 m on a 0.20 m dial). A bug, not a needle: a needle from
    // the centre would cross the "ALT" badge at level flight, while
    // the bug rides the rim and marks the current climb/descent
    // without covering anything.
    if (def.label === 'ALT') {
      const bug = new THREE.Mesh(
        new THREE.CircleGeometry(0.014, 12),
        new THREE.MeshBasicMaterial({ color: 0x1d4ed8 }),
      );
      bug.position.set(0, -0.148, 0.012);
      g.add(bug);
      vsiBug = bug;
    }
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
  // v9: the two outer gauges are live too — VSI from the vertical speed,
  // RPM from the throttle — so all five instruments move with the flight.
  // v19: the left outer gauge is VSI (was FUEL — fuel already shows in
  // the HUD bar); verticalSpeed is the 6th argument, range ±10 m/s.
  // v21: the 7th/8th arguments are the roll and pitch (radians) for
  // the attitude indicator's horizon disc. The VSI bug on the ALT
  // dial is driven by the 6th argument (verticalSpeed, ±10 m/s).
  function setGauges(altM, speedMs, headingDeg, throttle = 0.7, fuelFrac = 1, verticalSpeed = 0, roll = 0, pitch = 0) {
    const sweep = (value, max) => (-120 + 240 * Math.min(1, Math.max(0, value / max))) * Math.PI / 180;
    needles[0].rotation.z = -sweep(speedMs, 100);
    needles[1].rotation.z = -sweep(altM, 900);
    needles[2].rotation.z = -headingDeg * Math.PI / 180;
    if (needles[4]) needles[4].rotation.z = -sweep(throttle, 1);
    // The VSI bug rides the ALT dial's rim at the mini-scale:
    // -10 m/s at 120°, 0 at 180° (straight down), +10 at 240°.
    if (vsiBug) {
      const a = (180 + (Math.max(-10, Math.min(10, verticalSpeed)) / 10) * 60) * Math.PI / 180;
      vsiBug.position.x = Math.sin(a) * 0.148;
      vsiBug.position.y = -Math.cos(a) * 0.148;
    }
    // The attitude horizon turns against the roll and shifts against
    // the pitch (nose up = horizon drops = more blue). The shift is
    // clamped to ±0.02 m so the disc (r*1.07) always covers the face
    // window (0.94r).
    if (attDisc) {
      attDisc.rotation.z = -roll;
      attDisc.position.y = Math.max(-0.02, Math.min(0.02, -pitch * 0.06));
    }
  }

  let propAngle = 0;

  function update(dt, throttle, time) {
    propAngle += (5 + throttle * 46) * dt;
    prop.rotation.z = propAngle;
    blur.material.opacity = Math.min(0.25, throttle * 0.25);
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
