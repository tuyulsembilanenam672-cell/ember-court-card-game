// Ember Court — synthesized sound. No audio files: every cue is an
// oscillator (and a little filtered noise) through the Web Audio API.
// The context is created lazily on the first user gesture, so the page
// stays silent until the player interacts.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol = 0.1, when = 0, freq = 1200) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.08); },
  select() { tone(520, 0.07, 'triangle', 0.09); tone(780, 0.07, 'triangle', 0.06, 0.04); },
  play() { noiseBurst(0.18, 0.12, 0, 2400); tone(392, 0.14, 'triangle', 0.1, 0.02, 523); },
  spell() { tone(880, 0.25, 'sine', 0.1, 0, 1760); noiseBurst(0.2, 0.06, 0.05, 3200); },
  attack() { noiseBurst(0.12, 0.16, 0, 900); tone(180, 0.16, 'sawtooth', 0.1, 0, 70); },
  damage() { tone(140, 0.2, 'sawtooth', 0.12, 0, 60); },
  heal() { tone(523, 0.18, 'sine', 0.09); tone(784, 0.22, 'sine', 0.08, 0.09); },
  draw() { noiseBurst(0.08, 0.07, 0, 3000); },
  turn() { tone(440, 0.09, 'triangle', 0.09); tone(587, 0.12, 'triangle', 0.09, 0.08); },
  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, i * 0.13));
    tone(1568, 0.6, 'sine', 0.08, 0.65);
  },
  loss() {
    [392, 370, 330, 262].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.07, i * 0.18));
  },
};

// --- Ambient table music: a quiet two-note ember drone, toggled with the
// rest of the sound. It starts only after the first gesture.
let droneOn = false;
let droneNodes = null;

export function startDrone() {
  if (droneOn || muted) return;
  const c = ac();
  if (!c) return;
  const gain = c.createGain();
  gain.gain.value = 0.015;
  gain.connect(c.destination);
  const o1 = c.createOscillator();
  o1.type = 'sine'; o1.frequency.value = 110;
  const o2 = c.createOscillator();
  o2.type = 'sine'; o2.frequency.value = 164.81;
  const o3 = c.createOscillator();
  o3.type = 'triangle'; o3.frequency.value = 220;
  const g3 = c.createGain(); g3.gain.value = 0.4;
  o1.connect(gain); o2.connect(gain); o3.connect(g3); g3.connect(gain);
  o1.start(); o2.start(); o3.start();
  droneNodes = { gain, oscs: [o1, o2, o3] };
  droneOn = true;
}

export function stopDrone() {
  if (!droneNodes) return;
  try {
    droneNodes.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    const oscs = droneNodes.oscs;
    setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch (_) { /* already stopped */ } }), 500);
  } catch (_) { /* audio torn down */ }
  droneNodes = null;
  droneOn = false;
}

// Play one named cue (drained from game.events by main.js).
export function playCue(name) {
  if (name === 'win' || name === 'loss') stopDrone();
  const fn = sfx[name];
  if (fn) fn();
}
