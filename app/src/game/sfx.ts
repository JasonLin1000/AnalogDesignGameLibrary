// Synthesised sound effects (Web Audio, no audio files). Muted state is a per-viewer preference.
import { create } from 'zustand';

interface SoundState { muted: boolean; toggle: () => void }
const KEY = 'adg.muted';
const initial = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();

export const useSound = create<SoundState>((set, get) => ({
  muted: initial,
  toggle: () => {
    const muted = !get().muted;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* ignore */ }
    set({ muted });
  },
}));

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (useSound.getState().muted || typeof window === 'undefined') return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** Rising arpeggio, one note per star plus a final chord. */
  success(stars: number) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    for (let i = 0; i < Math.max(1, stars); i++) tone(notes[i], i * 0.12, 0.25, 'triangle', 0.14);
    const end = Math.max(1, stars) * 0.12;
    [523.25, 659.25, 783.99].forEach((f) => tone(f * 2, end, 0.6, 'sine', 0.06));
  },
  fail() { tone(220, 0, 0.18, 'square', 0.05); tone(165, 0.16, 0.28, 'square', 0.05); },
  place() { tone(880, 0, 0.05, 'sine', 0.05); },
  check() { tone(660, 0, 0.06, 'triangle', 0.06); },
  /** A spec turning green: each one in a row rings a step higher on a pentatonic scale. */
  ding(step: number) {
    const scale = [659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1568];
    const f = scale[Math.min(step, scale.length - 1)];
    tone(f, step * 0.09, 0.18, 'triangle', 0.08);
    tone(f * 2, step * 0.09 + 0.02, 0.12, 'sine', 0.03);
  },
  /** Achievement unlocked: a bright two-note fanfare with a shimmer. */
  achievement() {
    tone(783.99, 0, 0.14, 'square', 0.04);
    tone(1046.5, 0.11, 0.3, 'square', 0.045);
    [1568, 2093, 2637].forEach((f, i) => tone(f, 0.18 + i * 0.05, 0.25, 'sine', 0.025));
  },
  /** Burnt part: a crackle of filtered noise and a low thump. */
  burn() {
    const a = audio();
    if (!a) return;
    const len = Math.floor(a.sampleRate * 0.6);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2);
      d[i] = (Math.random() < 0.08 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.15) * env;
    }
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.7; g.gain.value = 0.5;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
    tone(70, 0, 0.35, 'sine', 0.2);
  },
  tapeout() {
    const seq = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => tone(f, i * 0.1, 0.35, 'triangle', 0.12));
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, 0.7, 1.2, 'sine', 0.05));
  },
};
