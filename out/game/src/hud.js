// The HUD: DOM instruments over the 3D view — altitude, speed, heading, fuel,
// throttle, timer, score and ring count — plus a compass strip and an attitude
// ball drawn on small canvases, a centre message line, and the title, pause and
// game-over panels. Numbers are rebuilt only when they change.

import { FONT, PALETTE } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const altEl = el('hud-alt');
  const spdEl = el('hud-spd');
  const hdgEl = el('hud-hdg');
  const timeEl = el('hud-time');
  const scoreEl = el('hud-score');
  const ringsEl = el('hud-rings');
  const posEl = el('hud-pos');
  const fuelFill = el('fuel-fill');
  const thrFill = el('thr-fill');
  const msgEl = el('hud-msg');
  const warnEl = el('hud-warn');
  // v16: the ring pointer — a chevron pill that always points at the
  // next ring (see update()).
  const ringPtr = el('hud-ring-pointer');
  const ringPtrArrow = el('hud-ring-arrow');
  const ringPtrText = el('hud-ring-text');
  const compass = el('compass');
  const attitude = el('attitude');
  const compassCtx = compass.getContext('2d');
  const attCtx = attitude.getContext('2d');

  const cache = {};
  function setText(node, key, value) {
    if (cache[key] !== value) {
      cache[key] = value;
      node.textContent = value;
    }
  }

  let msgTimer = 0;
  // v14: the mid-air collision cue rides on this — main.js calls
  // showMessage('MID-AIR COLLISION!', 2.5) when rivals.js fires the
  // collision event, so the player is told even if the blast is far off.
  // v15: a timed flash message is the big gold centre text; the
  // persistent objective is a compact pill instead (see showObjective).
  function showMessage(text, seconds) {
    msgEl.textContent = text;
    msgEl.classList.remove('objective');
    msgEl.style.opacity = '1';
    msgTimer = seconds;
  }

  /** A message that stays until the run ends: the landing objective. */
  // v15: the objective is a compact pill at the top centre (Gemini's fix
  // prompt: ≤36% wide, y 6-12%) — the v14 giant centre banner covered the
  // runway sightline in the landing shot, so the objective no longer
  // uses the big gold centre style.
  function showObjective(text) {
    msgEl.textContent = text;
    msgEl.classList.add('objective');
    msgEl.style.opacity = '1';
    msgTimer = 9999;
  }

  function showWarning(text) {
    warnEl.textContent = text;
    warnEl.style.opacity = text ? '1' : '0';
  }

  function drawCompass(headingDeg) {
    const w = compass.width;
    const h = compass.height;
    compassCtx.clearRect(0, 0, w, h);
    compassCtx.fillStyle = PALETTE.hudPanel;
    compassCtx.fillRect(0, 0, w, h);
    compassCtx.font = `700 14px ${FONT}`;
    compassCtx.textAlign = 'center';
    compassCtx.textBaseline = 'middle';
    // The strip shows 120 degrees around the current heading.
    for (let deg = -120; deg <= 120; deg += 5) {
      const shown = ((Math.round(headingDeg) + deg) % 360 + 360) % 360;
      const x = w / 2 + (deg / 120) * (w / 2 - 8);
      const major = shown % 30 === 0;
      compassCtx.strokeStyle = major ? PALETTE.hudText : 'rgba(255,247,232,0.45)';
      compassCtx.lineWidth = major ? 2 : 1;
      compassCtx.beginPath();
      compassCtx.moveTo(x, major ? 6 : 12);
      compassCtx.lineTo(x, major ? 16 : 16);
      compassCtx.stroke();
      if (major) {
        const label = shown === 0 ? 'N' : shown === 90 ? 'E' : shown === 180 ? 'S' : shown === 270 ? 'W' : String(shown);
        compassCtx.fillStyle = PALETTE.hudText;
        compassCtx.fillText(label, x, h - 9);
      }
    }
    // Centre caret: the heading the nose actually points at.
    compassCtx.fillStyle = PALETTE.ring;
    compassCtx.beginPath();
    compassCtx.moveTo(w / 2 - 6, 2);
    compassCtx.lineTo(w / 2 + 6, 2);
    compassCtx.lineTo(w / 2, 9);
    compassCtx.closePath();
    compassCtx.fill();
  }

  function drawAttitude(pitch, roll) {
    const s = attitude.width;
    const c = s / 2;
    attCtx.clearRect(0, 0, s, s);
    attCtx.save();
    attCtx.beginPath();
    attCtx.arc(c, c, c - 2, 0, Math.PI * 2);
    attCtx.clip();
    attCtx.translate(c, c);
    attCtx.rotate(-roll);
    // Pitch shifts the horizon: 90 degrees of pitch moves it by the radius.
    const shift = (pitch / (Math.PI / 2)) * c;
    // v11: the attitude ball's sky is the new bright blue (was #3a6ea8), so
    // the little gauge matches the vibrant sky instead of a muted steel blue.
    attCtx.fillStyle = '#2E8FE8';
    attCtx.fillRect(-c, -c + shift, s, c - shift + 2);
    attCtx.fillStyle = '#8a6a45';
    attCtx.fillRect(-c, c + shift - 2, s, c - shift + 2);
    attCtx.strokeStyle = '#fff7e8';
    attCtx.lineWidth = 2;
    attCtx.beginPath();
    attCtx.moveTo(-c, shift);
    attCtx.lineTo(c, shift);
    attCtx.stroke();
    // v13: pitch ladder — short lines at ±20° and ±40° of pitch, so the
    // ball reads as an attitude indicator instead of a two-colour disc.
    attCtx.strokeStyle = 'rgba(255,247,232,0.7)';
    attCtx.lineWidth = 1.5;
    for (const deg of [-40, -20, 20, 40]) {
      const ly = shift - (deg / 90) * c;
      attCtx.beginPath();
      attCtx.moveTo(-14, ly);
      attCtx.lineTo(14, ly);
      attCtx.stroke();
    }
    attCtx.restore();
    // Fixed wings: the plane symbol never moves, the world turns behind it.
    // v11: the attitude marker is the new gold #FFD52A (was #ffd94d) — same
    // gold as the rings and the title, so the HUD accents are one colour.
    attCtx.strokeStyle = '#FFD52A';
    attCtx.lineWidth = 3;
    attCtx.beginPath();
    attCtx.moveTo(c - 26, c);
    attCtx.lineTo(c - 8, c);
    attCtx.moveTo(c + 8, c);
    attCtx.lineTo(c + 26, c);
    attCtx.stroke();
    attCtx.beginPath();
    attCtx.arc(c, c, 3, 0, Math.PI * 2);
    attCtx.fillStyle = '#ffd94d';
    attCtx.fill();
  }

  /**
   * Refresh every instrument from the flight state, the course and the clock.
   * `view` is { heading, pitch, roll, altM, speedMs, fuel, throttle, time, score,
   * rings, ringTotal, pos, nextDist, stalled }.
   */
  function update(view, dt) {
    setText(altEl, 'alt', `${Math.round(view.altM * 3.28084)}`);
    setText(spdEl, 'spd', `${Math.round(view.speedMs * 1.94384)}`);
    setText(hdgEl, 'hdg', `${String(Math.round(view.heading)).padStart(3, '0')}°`);
    const mins = Math.floor(view.time / 60);
    const secs = Math.floor(view.time % 60);
    setText(timeEl, 'time', `${mins}:${String(secs).padStart(2, '0')}`);
    setText(scoreEl, 'score', `${view.score}`);
    setText(ringsEl, 'rings', `RING ${view.rings}/${view.ringTotal} · ${Math.round(view.nextDist)} m`);
    setText(posEl, 'pos', view.pos || '–');
    // v16: the ring pointer — a chevron pill under the objective that
    // always points at the next ring (rotation = bearing error, 0 =
    // straight ahead) with its number and distance, so a player who
    // loses the thread can find the gate without guessing (v15
    // playtest: after ring 1 the distance to ring 2 GREW with no
    // direction cue at all). Hidden once the course is done.
    if (ringPtr) {
      if (view.ringDir === null || view.ringDir === undefined) {
        ringPtr.style.display = 'none';
      } else {
        ringPtr.style.display = 'flex';
        ringPtrArrow.style.transform = `rotate(${Math.round(view.ringDir)}deg)`;
        ringPtrText.textContent = `RING ${view.ringNum} · ${Math.round(view.nextDist)} m`;
      }
    }
    fuelFill.style.width = `${Math.round(view.fuel * 100)}%`;
    fuelFill.style.background = view.fuel < 0.2 ? PALETTE.hudWarn : PALETTE.hudGood;
    thrFill.style.width = `${Math.round(view.throttle * 100)}%`;
    drawCompass(view.heading);
    drawAttitude(view.pitch, view.roll);
    if (view.stalled) showWarning('STALL — NOSE DOWN, THROTTLE UP');
    else if (view.fuel < 0.2 && view.fuel > 0) showWarning('LOW FUEL — HEAD FOR THE RUNWAY');
    else if (view.fuel === 0) showWarning('FUEL EMPTY — GLIDING');
    else showWarning('');
    if (msgTimer > 0) {
      msgTimer -= dt;
      if (msgTimer <= 0) {
        msgEl.style.opacity = '0';
        // v15: a timed-out message drops the pill styling too, so the
        // next flash message starts from the big gold centre style.
        msgEl.classList.remove('objective');
      }
    }
  }

  function showPanel(name) {
    for (const id of ['panel-title', 'panel-pause', 'panel-over']) {
      el(id).style.display = id === `panel-${name}` ? 'flex' : 'none';
    }
    // The title screen dims the gameplay HUD behind it (v2): the numbers are
    // still there, but they stop competing with the panel.
    document.body.classList.toggle('title-open', name === 'title');
  }

  function hidePanels() {
    for (const id of ['panel-title', 'panel-pause', 'panel-over']) el(id).style.display = 'none';
    document.body.classList.remove('title-open');
  }

  function setOverLines(lines) {
    el('over-lines').innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
  }

  /** v14: the game-over panel's title — "RACE COMPLETE!" on a finished
   *  race, "Landed!" / "Crashed!" otherwise. */
  function setOverTitle(text) {
    el('over-title').textContent = text;
  }

  return { update, showMessage, showObjective, showPanel, hidePanels, setOverLines, setOverTitle };
}
