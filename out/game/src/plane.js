// The plane: a high-wing propeller tourer built from primitives — fuselage, cabin,
// wings with struts, tail, spinning prop and landing gear — so it reads as a thing
// that was built, not a shape that was drawn. Local forward is -Z; the renderer
// drives rotation from the flight state (yaw, pitch, roll) each frame.

import { PALETTE } from './config.js';

export function buildPlane(THREE) {
  const group = new THREE.Group();
  group.rotation.order = 'YXZ';

  const cream = new THREE.MeshStandardMaterial({ color: PALETTE.planeCream, roughness: 0.55, metalness: 0.15 });
  const red = new THREE.MeshStandardMaterial({ color: PALETTE.planeRed, roughness: 0.5, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({
    color: PALETTE.planeGlass, roughness: 0.12, metalness: 0.4, transparent: true, opacity: 0.85,
  });
  const dark = new THREE.MeshStandardMaterial({ color: '#22242a', roughness: 0.9 });

  const body = new THREE.Group();
  group.add(body);

  // Fuselage: a rounded, tapered tube along Z, nose at -Z — v3, the bush-plane
  // redesign. Eight metres nose to tail, 10 longitudinal segments, cream on
  // top with a darker belly slung underneath (a second, slightly smaller tube
  // offset down, so only its lower half shows). The v2 fuselage was a short
  // 5.4 m tube that read as a toy from any distance.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.36, 6.4, 10), cream);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0, 0.3);
  body.add(fuselage);
  const bellyMat = new THREE.MeshStandardMaterial({ color: PALETTE.planeBelly, roughness: 0.6, metalness: 0.1 });
  const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.32, 6.0, 10), bellyMat);
  belly.rotation.x = Math.PI / 2;
  belly.position.set(0, -0.15, 0.3);
  body.add(belly);
  // Red nose cowling and a cream tail cone. The cowling, prop and blur disc live
  // on the top group (not the body) so the cockpit view can hide the bodywork
  // while the nose stays in sight ahead of the pilot.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.55, 0.9, 14), red);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.set(0, 0, -3.0);
  group.add(cowl);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.1, 12), red);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 0, 3.9);
  body.add(tailCone);
  // Glass cabin on top, ahead of the wing.
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), glass);
  cabin.scale.set(0.92, 0.8, 1.5);
  cabin.position.set(0, 0.52, -0.7);
  body.add(cabin);

  // High wing: one long slab with red tips, braced by struts to the fuselage.
  // v3: 11 m span (9.68 m centre + 0.66 m red tips each side, the outer 12%),
  // so the wing-and-tail shape reads at close, medium and distant scales.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.68, 0.16, 1.6), cream);
  wing.position.set(0, 0.62, -0.4);
  body.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.18, 1.62), red);
    tip.position.set(side * 5.17, 0.62, -0.4);
    body.add(tip);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6), dark);
    strut.position.set(side * 1.1, -0.05, -0.4);
    strut.rotation.z = side * 0.85;
    body.add(strut);
    // Wingtip navigation light: red on the left, green on the right.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff2a1e : 0x2aff5e }),
    );
    lamp.position.set(side * 5.5, 0.62, -0.4);
    body.add(lamp);
  }

  // Tail: horizontal stabiliser and a red fin.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.0), cream);
  stabiliser.position.set(0, 0.22, 2.7);
  body.add(stabiliser);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 1.1), red);
  fin.position.set(0, 0.85, 2.7);
  body.add(fin);

  // Fixed landing gear: two main wheels and a tail wheel.
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), dark);
    leg.position.set(side * 0.75, -0.55, -0.7);
    leg.rotation.z = side * 0.3;
    body.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * 0.95, -0.95, -0.7);
    body.add(wheel);
  }

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
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 0.07), dark);
    blade.rotation.z = angle;
    blade.position.set(0, 0, -0.1);
    prop.add(blade);
  }
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 28),
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
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.12), panelMat);
  dash.add(panel);
  const faceMat = new THREE.MeshStandardMaterial({ color: PALETTE.cockpitFace, roughness: 0.65, metalness: 0.1 });
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.02), faceMat);
  face.position.set(0, 0.01, 0.06);
  dash.add(face);
  // Red trim along the top edge of the panel, so it is visibly built, not cut out.
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.035, 0.13), red);
  trim.position.set(0, 0.225, 0);
  dash.add(trim);
  // v6: the same red trim along the bottom edge, so the panel is framed
  // top and bottom and reads as one finished housing.
  const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.035, 0.13), red);
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
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.04, 0.30),
    new THREE.MeshStandardMaterial({ color: '#3a3e46', roughness: 0.8, metalness: 0.1 }),
  );
  shield.position.set(0, 0.26, 0.06);
  shield.rotation.x = 0.35;
  dash.add(shield);
  // The lower console is a different, lighter grey than the panel, so
  // the dash reads as separate built parts instead of one black mass.
  // v7: a touch lighter still (#6b7078), widening the material gap between
  // the console, the panel face and the dark glareshield.
  const consoleMat = new THREE.MeshStandardMaterial({ color: PALETTE.cockpitConsole, roughness: 0.75, metalness: 0.1 });
  // Side cheeks: angled flanks at the panel ends, dropping back toward the
  // pilot — the panel now has sides, not just a front face.
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.35), consoleMat);
    cheek.position.set(side * 0.68, -0.05, 0.08);
    cheek.rotation.x = 0.35;
    dash.add(cheek);
  }
  // Lower console: a sloped shelf under the panel, dropping back toward the
  // pilot — the dash now continues down into the airframe instead of ending
  // at a flat bottom edge.
  const consoleShelf = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.3), consoleMat);
  consoleShelf.position.set(0, -0.30, 0.10);
  consoleShelf.rotation.x = 0.5;
  dash.add(consoleShelf);
  // Windshield pillars at the panel edges, leaning out toward the top. v5:
  // 0.035 wide and 0.62 tall, spanning from the panel bottom to above the
  // glareshield, with a small base block where each meets the panel — they
  // are part of the airframe now, connected top and bottom, not floating posts.
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.62, 0.05), dark);
    pillar.position.set(side * 0.62, 0.10, 0.02);
    pillar.rotation.z = -side * 0.22;
    dash.add(pillar);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.07), dark);
    base.position.set(side * 0.60, -0.19, 0.03);
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
  const arch = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.04, 0.06), frameMat);
  arch.position.set(0, 0.44, 0.0);
  dash.add(arch);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.55), frameMat);
    rail.position.set(side * 0.64, 0.42, 0.28);
    dash.add(rail);
    // Side wall: an angled interior panel at the dash end, with a dark sill
    // on top — the cockpit now has sides, not just a front face.
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.55), consoleMat);
    wall.position.set(side * 0.70, -0.10, 0.15);
    wall.rotation.y = -side * 0.3;
    dash.add(wall);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.55), frameMat);
    sill.position.set(side * 0.70, 0.16, 0.15);
    sill.rotation.y = -side * 0.3;
    dash.add(sill);
  }
  // v6: the control yoke — a short column rising out of the console shelf
  // with a crossbar handle and two grips, sitting just below the panel's
  // bottom edge. It anchors the bottom of the cockpit view as part of the
  // aircraft, and it does not cover the gauges or the indicator dots.
  const yokeCol = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.26, 8), frameMat);
  yokeCol.position.set(0, -0.32, 0.14);
  yokeCol.rotation.x = 0.4;
  dash.add(yokeCol);
  const yokeBar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.045, 0.045), frameMat);
  yokeBar.position.set(0, -0.22, 0.21);
  dash.add(yokeBar);
  for (const side of [-1, 1]) {
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.05), frameMat);
    grip.position.set(side * 0.14, -0.20, 0.21);
    grip.rotation.z = -side * 0.12;
    dash.add(grip);
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
  const gaugeDefs = [
    { x: -0.44, pin: 0x7dff9a, label: 'KTS' },
    { x: 0, pin: 0xffd94d, label: 'ALT' },
    { x: 0.44, pin: 0x4fc3f7, label: 'HDG' },
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
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.017, 8, 28),
      new THREE.MeshStandardMaterial({ color: PALETTE.planeCream, roughness: 0.4, metalness: 0.5 }),
    );
    g.add(rim);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 24),
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
  group.add(dash);

  // The nose, seen from the pilot's seat: a low dark shape below the panel,
  // the top of the engine cowling. v3 replaces the floating red spinner with
  // this — it anchors the bottom of the cockpit view as part of the aircraft.
  // v5: 1.25 m wide (was 1.15) and a touch lower, so it meets the lowered
  // console and the panel's bottom edge reads as one continuous airframe
  // instead of two separate dark shapes.
  const nose = new THREE.Group();
  nose.position.set(0, -0.46, -2.55);
  nose.visible = false;
  const noseTop = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.9), dark);
  noseTop.rotation.x = -0.12;
  nose.add(noseTop);
  group.add(nose);

  /**
   * Drive the three dashboard needles from the flight state: airspeed (left),
   * altitude (middle), heading (right). Angles sweep -120..+120 degrees over the
   * gauge range; the heading needle points like a compass, north straight up.
   */
  function setGauges(altM, speedMs, headingDeg) {
    const sweep = (value, max) => (-120 + 240 * Math.min(1, Math.max(0, value / max))) * Math.PI / 180;
    needles[0].rotation.z = -sweep(speedMs, 100);
    needles[1].rotation.z = -sweep(altM, 900);
    needles[2].rotation.z = -headingDeg * Math.PI / 180;
  }

  let propAngle = 0;

  function update(dt, throttle, time) {
    propAngle += (5 + throttle * 46) * dt;
    prop.rotation.z = propAngle;
    blur.material.opacity = Math.min(0.22, throttle * 0.3);
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
