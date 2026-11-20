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
  tapeout() {
    const seq = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => tone(f, i * 0.1, 0.35, 'triangle', 0.12));
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(f, 0.7, 1.2, 'sine', 0.05));
  },
};
