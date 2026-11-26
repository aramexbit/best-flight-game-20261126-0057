// Procedural sound, no audio files: an engine drone that follows the throttle, wind
// that rises with speed, a two-note chime for a ring, a thud for a crash and a soft
// chord for a landing. Everything is built on first user gesture (browsers block
// audio before one) and stays silent in screenshot mode, where there is no gesture.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;
  let started = false;

  function start() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // A fresh context starts suspended until a gesture resumes it; start()
      // already runs on a gesture, so resume at once instead of staying silent.
      if (ctx.state === 'suspended') void ctx.resume();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);

      // Engine: a low saw plus a sub octave, through a low-pass that opens with throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sine';
      engineOsc2.frequency.value = 27;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();

      // Wind: looped noise through a band-pass, louder and brighter the faster you go.
      const noiseLen = ctx.sampleRate * 2;
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 900;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      noise.start();
    } catch {
      // No audio device, no problem: the game plays silent.
      ctx = null;
    }
  }

  /** Called every frame while flying: throttle in [0, 1], speed in m/s. */
  function update(throttle, speed) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(48 + throttle * 62 + speed * 0.35, t, 0.08);
    engineOsc2.frequency.setTargetAtTime(24 + throttle * 31 + speed * 0.18, t, 0.08);
    engineGain.gain.setTargetAtTime(0.05 + throttle * 0.09, t, 0.1);
    windGain.gain.setTargetAtTime(Math.min(0.16, Math.max(0, (speed - 25) * 0.0022)), t, 0.15);
  }

  function tone(freq, when, dur, type, vol) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function chime() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(880, t, 0.35, 'sine', 0.22);
    tone(1318, t + 0.09, 0.5, 'sine', 0.2);
  }

  function thud() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(70, t, 0.5, 'sine', 0.5);
    tone(45, t + 0.05, 0.7, 'triangle', 0.4);
  }

  /**
   * v13: the near-miss flyby whoosh — a short burst of filtered noise
   * whose bandpass sweeps up and back down as the rival passes, so the
   * overtake is heard as well as seen. Silent when muted or before the
   * audio context exists (no gesture yet).
   */
  function whoosh() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = ctx.sampleRate * 0.7;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.3);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.25);
    gain.gain.linearRampToValueAtTime(0, t + 0.7);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + 0.7);
  }

  /**
   * v14: the mid-air collision boom — a noise burst through a low-pass
   * plus a sine dropping 90→30 Hz, 1.2 s, so the blast is heard even
   * when it is off-screen. Silent when muted or before the audio
   * context exists (no gesture yet).
   */
  function boom() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + 1.2);
    const drop = ctx.createOscillator();
    drop.type = 'sine';
    drop.frequency.setValueAtTime(90, t);
    drop.frequency.exponentialRampToValueAtTime(30, t + 1.0);
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.5, t);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
    drop.connect(dropGain);
    dropGain.connect(master);
    drop.start(t);
    drop.stop(t + 1.1);
  }

  /**
   * v14: the finish fanfare — a rising C-E-G-C' arpeggio plus a final
   * chord, for the RACE COMPLETE moment after landing with 12 rings.
   */
  function fanfare() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => tone(freq, t + i * 0.12, 0.5, 'triangle', 0.2));
    tone(523, t + 0.55, 1.2, 'sine', 0.14);
    tone(659, t + 0.55, 1.2, 'sine', 0.14);
    tone(784, t + 0.55, 1.2, 'sine', 0.16);
    tone(1047, t + 0.55, 1.2, 'sine', 0.14);
  }

  function landChord() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    tone(523, t, 0.8, 'sine', 0.16);
    tone(659, t + 0.05, 0.8, 'sine', 0.16);
    tone(784, t + 0.1, 1.1, 'sine', 0.18);
  }

  function setMuted(value) {
    muted = value;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  function stopEngine() {
    if (!ctx) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(0, t, 0.2);
    windGain.gain.setTargetAtTime(0, t, 0.2);
  }

  return { start, update, chime, thud, landChord, whoosh, boom, fanfare, setMuted, stopEngine };
}
