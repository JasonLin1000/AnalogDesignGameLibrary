import type { RunSet } from '../game/runs';
import { MeasureError, evaluate, type SimResult } from '../sim/measure';
import type { Level, Spec } from './types';

export interface SpecResult {
  spec: Spec;
  value: number;          // the value compared to the limits (worst case or statistic)
  pass: boolean;
  error?: MeasureError;
  /** per-run values when the spec spans several runs (PVT / Monte Carlo) */
  values?: { label: string; value: number; pass: boolean }[];
  worstLabel?: string;
}

const within = (s: Spec, v: number) =>
  Number.isFinite(v) && (s.min === undefined || v >= s.min) && (s.max === undefined || v <= s.max);

/** How far inside the limits a value is (negative = failing), relative to the limit span. */
function margin(s: Spec, v: number): number {
  if (!Number.isFinite(v)) return -Infinity;
  const span = s.min !== undefined && s.max !== undefined ? Math.abs(s.max - s.min) || 1 : Math.abs(s.min ?? s.max ?? 1) || 1;
  const lo = s.min !== undefined ? (v - s.min) / span : Infinity;
  const hi = s.max !== undefined ? (s.max - v) / span : Infinity;
  return Math.min(lo, hi);
}

function evalOne(spec: Spec, res: SimResult | null): { value: number; error?: MeasureError } {
  if (!res) return { value: NaN };
  try { return { value: evaluate(spec.measure, res) }; } catch (e) {
    if (e instanceof MeasureError) return { value: NaN, error: e };
    throw e;
  }
}

export function checkSpec(spec: Spec, set: RunSet): SpecResult {
  const over = spec.over ?? 'nominal';
  if (over === 'nominal') {
    const { value, error } = evalOne(spec, set.nominal);
    return { spec, value, pass: !error && within(spec, value), error };
  }
  const runs = over === 'pvt' ? set.pvt : set.mc;
  if (!runs.length) return { spec, value: NaN, pass: false, error: new MeasureError('noRuns', { over }) };
  const values = runs.map((r) => {
    const { value } = evalOne(spec, r.result);
    return { label: r.spec.label, value, pass: within(spec, value) };
  });
  const stat = spec.stat ?? 'worst';
  if (stat === 'worst') {
    let worst = values[0];
    for (const v of values) if (margin(spec, v.value) < margin(spec, worst.value)) worst = v;
    return { spec, value: worst.value, pass: values.every((v) => v.pass), values, worstLabel: worst.label };
  }
  const finite = values.map((v) => v.value).filter(Number.isFinite);
  if (finite.length < values.length) return { spec, value: NaN, pass: false, values };
  const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
  const sd = Math.sqrt(finite.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, finite.length - 1));
  const value = stat === 'mean' ? mean : Math.abs(mean) + 3 * sd;
  return { spec, value, pass: within(spec, value), values };
}

export interface LevelScore {
  main: SpecResult[];
  bonus: SpecResult[][];
  stars: number; // 0..(1 + bonus tiers)
}

/** Accepts a full RunSet, or a single nominal result for levels without sweeps. */
export function scoreLevel(level: Level, input: RunSet | SimResult): LevelScore {
  const set: RunSet = 'nominal' in input ? input : { nominal: input, pvt: [], mc: [] };
  const main = level.specs.map((s) => checkSpec(s, set));
  const bonus = (level.stars ?? []).map((tier) => tier.map((s) => checkSpec(s, set)));
  let stars = 0;
  if (main.every((r) => r.pass)) {
    stars = 1;
    for (const tier of bonus) {
      if (tier.every((r) => r.pass)) stars++;
      else break;
    }
  }
  return { main, bonus, stars };
}

export const maxStars = (level: { stars?: unknown[] }) => 1 + (level.stars?.length ?? 0);
