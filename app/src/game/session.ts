// One simulation session: schematic -> runs (nominal / PVT / MC) -> results -> score.
import { create } from 'zustand';
import { scoreLevel, type LevelScore } from '../levels/evaluate';
import type { Level, Sweep } from '../levels/types';
import { toCircuit, type Diagnostic } from '../schematic/connectivity';
import type { Deck } from '../schematic/netlist';
import type { Analysis, Corner, Schematic } from '../schematic/types';
import { simulate } from '../sim/client';
import type { SimRun } from '../sim/engine';
import type { SimResult } from '../sim/measure';
import { executeRuns, planRuns, toRunSet, type RunOutcome } from './runs';

export interface Probe { analysis: Analysis['kind']; node: string; show?: 'v' | 'db' | 'phase' }

interface SessionState {
  status: 'idle' | 'running' | 'done' | 'error';
  diagnostics: Diagnostic[];
  deck?: Deck;            // nominal deck
  run?: SimRun;           // nominal run
  result?: SimResult;     // nominal result (annotations, waveforms)
  outcomes: RunOutcome[]; // every run incl. PVT / Monte Carlo
  progress: { done: number; total: number };
  score?: LevelScore;
  error?: string;
  simVersion: number;     // editor version that produced the result
  probes: Probe[];
  reset: (probes?: Probe[]) => void;
  addProbe: (p: Probe) => void;
  removeProbe: (i: number) => void;
  start: (args: { sch: Schematic; version: number; level: Level | null; analyses: Analysis[]; corner: Corner; sweep?: Sweep }) => Promise<void>;
}

const cleared = { deck: undefined, run: undefined, result: undefined, score: undefined, error: undefined, outcomes: [] as RunOutcome[] };

export const useSession = create<SessionState>((set, get) => ({
  status: 'idle',
  diagnostics: [],
  outcomes: [],
  progress: { done: 0, total: 0 },
  simVersion: -1,
  probes: [],
  reset: (probes = []) => set({ status: 'idle', diagnostics: [], ...cleared, progress: { done: 0, total: 0 }, simVersion: -1, probes }),
  addProbe: (p) => {
    if (get().probes.some((q) => q.analysis === p.analysis && q.node === p.node && q.show === p.show)) return;
    set({ probes: [...get().probes, p] });
  },
  removeProbe: (i) => set({ probes: get().probes.filter((_, j) => j !== i) }),

  start: async ({ sch, version, level, analyses, corner, sweep }) => {
    const { circuit, diagnostics } = toCircuit(sch);
    if (diagnostics.some((d) => d.level === 'error')) {
      set({ status: 'error', diagnostics, ...cleared, simVersion: version });
      return;
    }
    const lockedNames = new Set(sch.parts.filter((p) => p.locked).map((p) => p.name));
    const playerParts = circuit.parts.filter((p) => !lockedNames.has(p.name)).map((p) => p.name);
    const runs = planRuns(level ? level.sweep : sweep, level?.corner ?? corner);
    set({ status: 'running', diagnostics, error: undefined, progress: { done: 0, total: runs.length } });

    const outcomes = await executeRuns(circuit, analyses, runs, playerParts, simulate, (done, total, first) => {
      if (first) {
        // show the nominal result as soon as it is ready; PVT / MC keep running
        set({ deck: first.deck, run: first.run, result: first.result, simVersion: version, error: first.error });
      }
      set({ progress: { done, total } });
    }, level ? `level ${level.id}` : 'sandbox');

    const first = outcomes[0];
    if (!first.result) {
      set({ status: 'error', ...cleared, deck: first.deck, run: first.run, error: first.error ?? 'simulation failed', simVersion: version });
      return;
    }
    const runSet = toRunSet(outcomes)!;
    const score = level ? scoreLevel(level, runSet) : undefined;
    set({ status: 'done', outcomes, score, simVersion: version, deck: first.deck, run: first.run, result: first.result });
  },
}));
