import { MeasureError, evaluate, type SimResult } from '../sim/measure';
import type { Level, Spec } from './types';

export interface SpecResult {
  spec: Spec;
  value: number;
  pass: boolean;
  error?: MeasureError;
}

export function checkSpec(spec: Spec, res: SimResult): SpecResult {
  try {
    const value = evaluate(spec.measure, res);
    const pass = Number.isFinite(value)
      && (spec.min === undefined || value >= spec.min)
      && (spec.max === undefined || value <= spec.max);
    return { spec, value, pass };
  } catch (e) {
    if (e instanceof MeasureError) return { spec, value: NaN, pass: false, error: e };
    throw e;
  }
}

export interface LevelScore {
  main: SpecResult[];
  bonus: SpecResult[][];
  stars: number; // 0..(1 + bonus tiers)
}

export function scoreLevel(level: Level, res: SimResult): LevelScore {
  const main = level.specs.map((s) => checkSpec(s, res));
  const bonus = (level.stars ?? []).map((tier) => tier.map((s) => checkSpec(s, res)));
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

export const maxStars = (level: Level) => 1 + (level.stars?.length ?? 0);
