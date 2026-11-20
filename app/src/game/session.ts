// One simulation session: schematic -> netlist -> worker -> results -> score.
import { create } from 'zustand';
import { scoreLevel, type LevelScore } from '../levels/evaluate';
import type { Level } from '../levels/types';
import { toCircuit, type Diagnostic } from '../schematic/connectivity';
import { buildDeck, type Deck } from '../schematic/netlist';
import type { Analysis, Corner, Schematic } from '../schematic/types';
import { simulate } from '../sim/client';
import type { SimRun } from '../sim/engine';
import type { SimResult } from '../sim/measure';

export interface Probe { analysis: Analysis['kind']; node: string; show?: 'v' | 'db' | 'phase' }

interface SessionState {
  status: 'idle' | 'running' | 'done' | 'error';
  diagnostics: Diagnostic[];
  deck?: Deck;
  run?: SimRun;
  result?: SimResult;
  score?: LevelScore;
  error?: string;
  simVersion: number;     // editor version that produced the result
  probes: Probe[];
  reset: (probes?: Probe[]) => void;
  addProbe: (p: Probe) => void;
  removeProbe: (i: number) => void;
  start: (args: { sch: Schematic; version: number; level: Level | null; analyses: Analysis[]; corner: Corner }) => Promise<void>;
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'idle',
  diagnostics: [],
  simVersion: -1,
  probes: [],
  reset: (probes = []) => set({ status: 'idle', diagnostics: [], deck: undefined, run: undefined, result: undefined, score: undefined, error: undefined, simVersion: -1, probes }),
  addProbe: (p) => {
    if (get().probes.some((q) => q.analysis === p.analysis && q.node === p.node && q.show === p.show)) return;
    set({ probes: [...get().probes, p] });
  },
  removeProbe: (i) => set({ probes: get().probes.filter((_, j) => j !== i) }),

  start: async ({ sch, version, level, analyses, corner }) => {
    const { circuit, diagnostics } = toCircuit(sch);
    if (diagnostics.some((d) => d.level === 'error')) {
      set({ status: 'error', diagnostics, error: undefined, result: undefined, score: undefined, simVersion: version });
      return;
    }
    const deck = buildDeck(circuit, analyses, { corner, title: level ? `level ${level.id}` : 'sandbox' });
    set({ status: 'running', diagnostics, deck, error: undefined });
    try {
      const run = await simulate(deck, corner);
      if (!run.ok) {
        set({ status: 'error', run, error: run.errors.join('\n'), result: undefined, score: undefined, simVersion: version });
        return;
      }
      const lockedNames = new Set(sch.parts.filter((p) => p.locked).map((p) => p.name));
      const result: SimResult = {
        analyses, plots: run.plots, circuit, opVectors: deck.opVectors,
        playerParts: circuit.parts.filter((p) => !lockedNames.has(p.name)).map((p) => p.name),
      };
      const score = level ? scoreLevel(level, result) : undefined;
      set({ status: 'done', run, result, score, simVersion: version });
    } catch (e) {
      set({ status: 'error', error: String((e as Error).message ?? e), simVersion: version });
    }
  },
}));
