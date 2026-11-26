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

  // Fuselage: a tapered tube along Z, nose at -Z.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.34, 5.4, 14), cream);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0, 0.2);
  body.add(fuselage);
  // Red nose cowling and a cream tail cone. The cowling, prop and blur disc live
  // on the top group (not the body) so the cockpit view can hide the bodywork
  // while the nose stays in sight ahead of the pilot.
  const cowl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.52, 0.9, 14), red);
  cowl.rotation.x = Math.PI / 2;
  cowl.position.set(0, 0, -2.7);
  group.add(cowl);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.1, 12), red);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 0, 3.4);
  body.add(tailCone);
  // Glass cabin on top, ahead of the wing.
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), glass);
  cabin.scale.set(0.92, 0.8, 1.5);
  cabin.position.set(0, 0.52, -0.7);
  body.add(cabin);

  // High wing: one long slab with red tips, braced by struts to the fuselage.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.16, 1.6), cream);
  wing.position.set(0, 0.62, -0.4);
  body.add(wing);
  for (const side of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 1.62), red);
    tip.position.set(side * 4.45, 0.62, -0.4);
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
    lamp.position.set(side * 4.72, 0.62, -0.4);
    body.add(lamp);
  }

  // Tail: horizontal stabiliser and a red fin.
  const stabiliser = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 1.0), cream);
  stabiliser.position.set(0, 0.22, 2.7);
  body.add(stabiliser);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 1.1), red);
  fin.position.set(0, 0.75, 2.7);
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

  // Propeller: a hub, two blades and a faint blur disc that appears with throttle.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -3.25);
  group.add(prop);
  const hub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10), red);
  hub.rotation.x = -Math.PI / 2;
  prop.add(hub);
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
  blur.position.set(0, 0, -3.3);
  group.add(blur);

  // Cockpit dashboard: a low dark panel with three glowing gauges, only seen
  // from inside. It sits well forward and low so it frames the view instead of
  // filling it.
  const dash = new THREE.Group();
  dash.position.set(0, -0.18, -2.15);
  dash.visible = false;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 0.1), dark);
  dash.add(panel);
  const gaugeColors = [0x7dff9a, 0xffd94d, 0x4fc3f7];
  for (let i = 0; i < 3; i += 1) {
    const gauge = new THREE.Mesh(
      new THREE.CircleGeometry(0.085, 20),
      new THREE.MeshBasicMaterial({ color: gaugeColors[i] }),
    );
    gauge.position.set(-0.32 + i * 0.32, 0.03, 0.06);
    dash.add(gauge);
  }
  group.add(dash);

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
    // The blur disc is a giant halo from the pilot's seat; hide it in here and
    // let the bare blades do the talking. The fat cowling hides too: from the
    // pilot's seat the nose should sit low in the frame, not fill it.
    blur.visible = !on;
    cowl.visible = !on;
  }

  return { group, update, setCockpitMode, prop, cowl, blur };
}
