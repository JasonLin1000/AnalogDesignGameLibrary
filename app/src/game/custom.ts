// Player-made levels (level editor). Stored per viewer; shared by exporting / importing JSON files.
import { create } from 'zustand';
import type { Level } from '../levels/types';

const KEY = 'adg.custom.v1';
const load = (): Level[] => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : []; } catch { return []; } };
const save = (l: Level[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ } };

interface CustomState {
  levels: Level[];
  upsert: (l: Level) => void;
  remove: (id: string) => void;
}

export const useCustom = create<CustomState>((set, get) => ({
  levels: load(),
  upsert: (l) => { const next = [...get().levels.filter((x) => x.id !== l.id), l]; save(next); set({ levels: next }); },
  remove: (id) => { const next = get().levels.filter((x) => x.id !== id); save(next); set({ levels: next }); },
}));

/** Minimal structural validation of an imported level file. */
export function validateLevel(x: unknown): x is Level {
  const l = x as Level;
  return !!l && typeof l.id === 'string' && !!l.title && Array.isArray(l.specs) && Array.isArray(l.analyses)
    && !!l.start && Array.isArray(l.start.parts) && Array.isArray(l.start.wires) && Array.isArray(l.palette);
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function readJsonFile(f: File): Promise<unknown> {
  return JSON.parse(await f.text());
}
