// Planning and executing a set of simulations: nominal, PVT corners, Monte Carlo.
import type { Sweep } from '../levels/types';
import { buildDeck, type Deck } from '../schematic/netlist';
import type { Analysis, Circuit, Corner } from '../schematic/types';
import type { SimRun } from '../sim/engine';
import type { SimResult } from '../sim/measure';
import { sampleMismatch } from '../sim/mismatch';

export interface RunSpec {
  kind: 'nominal' | 'pvt' | 'mc';
  corner: Corner;
  temp: number;
  seed?: number;
  label: string;   // e.g. "tt 27°C", "ss −40°C", "MC #7"
}

export interface RunOutcome {
  spec: RunSpec;
  deck: Deck;
  run?: SimRun;
  result?: SimResult;
  error?: string;
}

export interface RunSet {
  nominal: SimResult;
  pvt: { spec: RunSpec; result: SimResult | null }[];
  mc: { spec: RunSpec; result: SimResult | null }[];
}

const tlabel = (t: number) => `${t < 0 ? '−' : ''}${Math.abs(t)}°C`;

export function planRuns(sweep: Sweep | undefined, baseCorner: Corner = 'tt'): RunSpec[] {
  const runs: RunSpec[] = [{ kind: 'nominal', corner: baseCorner, temp: 27, label: `${baseCorner} 27°C` }];
  if (sweep?.corners?.length || sweep?.temps?.length) {
    const corners = [...new Set<Corner>([baseCorner, ...(sweep.corners ?? [])])];
    const temps = [...new Set([27, ...(sweep.temps ?? [])])];
    for (const c of corners) for (const t of temps) {
      if (c === baseCorner && t === 27) continue; // the nominal run doubles as this corner
      runs.push({ kind: 'pvt', corner: c, temp: t, label: `${c} ${tlabel(t)}` });
    }
  }
  for (let i = 1; i <= (sweep?.mc ?? 0); i++) runs.push({ kind: 'mc', corner: baseCorner, temp: 27, seed: i, label: `MC #${i}` });
  return runs;
}

export function deckFor(circuit: Circuit, analyses: Analysis[], run: RunSpec, title?: string): Deck {
  return buildDeck(circuit, analyses, {
    title, corner: run.corner,
    temp: run.temp === 27 ? undefined : run.temp,
    dvth: run.seed !== undefined ? sampleMismatch(circuit, run.seed) : undefined,
  });
}

export type Simulator = (deck: Deck, corner: Corner) => Promise<SimRun>;

/** Run every planned simulation; the nominal one first, the rest in parallel through `sim`. */
export async function executeRuns(
  circuit: Circuit, analyses: Analysis[], runs: RunSpec[], playerParts: string[], sim: Simulator,
  onProgress?: (done: number, total: number, first?: RunOutcome) => void, title?: string,
): Promise<RunOutcome[]> {
  const one = async (spec: RunSpec): Promise<RunOutcome> => {
    const deck = deckFor(circuit, analyses, spec, title);
    try {
      const run = await sim(deck, spec.corner);
      if (!run.ok) return { spec, deck, run, error: run.errors.join('\n') };
      const result: SimResult = { analyses, plots: run.plots, circuit, opVectors: deck.opVectors, playerParts };
      return { spec, deck, run, result };
    } catch (e) {
      return { spec, deck, error: String((e as Error).message ?? e) };
    }
  };
  const total = runs.length;
  const first = await one(runs[0]);
  let done = 1;
  onProgress?.(done, total, first);
  if (first.error || total === 1) return [first];
  const rest = await Promise.all(runs.slice(1).map(async (r) => {
    const o = await one(r);
    onProgress?.(++done, total);
    return o;
  }));
  return [first, ...rest];
}

export function toRunSet(outcomes: RunOutcome[]): RunSet | null {
  const nominal = outcomes.find((o) => o.spec.kind === 'nominal')?.result;
  if (!nominal) return null;
  const pick = (k: RunSpec['kind']) => outcomes.filter((o) => o.spec.kind === k).map((o) => ({ spec: o.spec, result: o.result ?? null }));
  const nom = outcomes.find((o) => o.spec.kind === 'nominal')!;
  // the nominal run is also the tt / 27 °C corner of a PVT sweep
  const pvt = pick('pvt');
  return { nominal, pvt: pvt.length ? [{ spec: nom.spec, result: nominal }, ...pvt] : [], mc: pick('mc') };
}
