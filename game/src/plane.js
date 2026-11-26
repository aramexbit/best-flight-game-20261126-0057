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

  // Cockpit dashboard, v2: a wide panel that reads as part of the aircraft,
  // with three real instruments — dark dial faces, pale rims, tick marks and
  // live needles — plus a red trim strip, toggle switches and a warning lamp.
  // The v1 panel was three plain coloured circles on a black bar, which a fresh
  // eye read as a debug object, not a cockpit.
  const dash = new THREE.Group();
  dash.position.set(0, -0.22, -2.1);
  dash.visible = false;
  // v3: a wider, taller panel (1.6 x 0.5) with an angled glareshield sloping
  // down toward the pilot and two windshield pillars at the edges, so the
  // panel reads as a cockpit structure instead of a flat slab floating in
  // front of the camera.
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), dark);
  dash.add(panel);
  // Red trim along the top edge of the panel, so it is visibly built, not cut out.
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.035, 0.09), red);
  trim.position.set(0, 0.265, 0);
  dash.add(trim);
  // Glareshield: a sloped shelf over the panel top, highest at the panel and
  // falling away toward the pilot.
  const shield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.3), dark);
  shield.position.set(0, 0.27, 0.1);
  shield.rotation.x = 0.45;
  dash.add(shield);
  // Windshield pillars at the panel edges, leaning out toward the top.
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.06), dark);
    pillar.position.set(side * 0.74, 0.32, 0.02);
    pillar.rotation.z = -side * 0.25;
    dash.add(pillar);
  }
  // Two toggle switches under the left gauge, one warning lamp under the right.
  for (const sx of [-0.62, -0.5]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), glass);
    sw.position.set(sx, -0.16, 0.06);
    sw.rotation.z = 0.25;
    dash.add(sw);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff5d4d }),
  );
  lamp.position.set(0.62, -0.16, 0.06);
  dash.add(lamp);
  const gaugeDefs = [
    { x: -0.52, needle: 0x7dff9a },
    { x: 0, needle: 0xffd94d },
    { x: 0.52, needle: 0x4fc3f7 },
  ];
  const needles = [];
  for (const def of gaugeDefs) {
    const g = new THREE.Group();
    g.position.set(def.x, 0.02, 0.05);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.016, 8, 28),
      new THREE.MeshStandardMaterial({ color: PALETTE.planeCream, roughness: 0.4, metalness: 0.5 }),
    );
    g.add(rim);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.128, 24),
      new THREE.MeshBasicMaterial({ color: 0x10131c }),
    );
    face.position.z = 0.005;
    g.add(face);
    // Twelve tick marks around the dial, longer at the quarters.
    for (let t = 0; t < 12; t += 1) {
      const a = (t / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, t % 3 === 0 ? 0.036 : 0.024, 0.004),
        new THREE.MeshBasicMaterial({ color: 0xfff7e8 }),
      );
      tick.position.set(Math.sin(a) * 0.104, Math.cos(a) * 0.104, 0.01);
      tick.rotation.z = -a;
      g.add(tick);
    }
    const needlePivot = new THREE.Group();
    const needleGeo = new THREE.BoxGeometry(0.014, 0.1, 0.006);
    needleGeo.translate(0, 0.04, 0);
    const needle = new THREE.Mesh(
      needleGeo,
      new THREE.MeshBasicMaterial({ color: def.needle }),
    );
    needlePivot.add(needle);
    needlePivot.position.z = 0.012;
    g.add(needlePivot);
    const pin = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff7e8 }),
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
  const nose = new THREE.Group();
  nose.position.set(0, -0.5, -2.55);
  nose.visible = false;
  const noseTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.9), dark);
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
