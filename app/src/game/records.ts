// Per-level design records (Opus Magnum style): fewer parts, less power, faster, fewer simulations.
// "Par" for the part count comes from the reference solutions the test suite verifies.
import { create } from 'zustand';
import type { Level } from '../levels/types';
import type { Schematic } from '../schematic/types';

export interface Rec { parts?: number; power?: number; time?: number; sims?: number }
export type Metric = keyof Rec;
export const METRICS: Metric[] = ['parts', 'power', 'time', 'sims'];

const KEY = 'adg.records.v1';
const load = (): Record<string, Rec> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; } };

export const useRecords = create<{ best: Record<string, Rec>; submit: (id: string, r: Rec) => { improved: Metric[]; prev?: Rec } }>((set, get) => ({
  best: load(),
  submit: (id, r) => {
    const prev = get().best[id];
    const next: Rec = { ...prev };
    const improved: Metric[] = [];
    for (const m of METRICS) {
      const v = r[m];
      if (v === undefined || !Number.isFinite(v)) continue;
      const old = prev?.[m];
      if (old === undefined || v < old * (1 - 1e-6)) {
        next[m] = v;
        if (old !== undefined) improved.push(m);
      }
    }
    const best = { ...get().best, [id]: next };
    set({ best });
    try { localStorage.setItem(KEY, JSON.stringify(best)); } catch { /* ignore */ }
    return { improved, prev };
  },
}));

const counted = (kind: string) => kind !== 'GND';

/** Fewest parts any reference solution adds to the starting schematic. */
export function parParts(level: Level): number | undefined {
  const start = new Set(level.start.parts.map((p) => p.name));
  const counts = level.solutions.filter((s) => s.stars >= 1)
    .map((s) => s.circuit.parts.filter((p) => counted(p.kind) && !start.has(p.name)).length);
  return counts.length ? Math.min(...counts) : undefined;
}

/** Parts the player added to the starting schematic. */
export function playerPartCount(level: Level, sch: Schematic): number {
  const start = new Set(level.start.parts.map((p) => p.name));
  return sch.parts.filter((p) => counted(p.kind) && !start.has(p.name)).length;
}
