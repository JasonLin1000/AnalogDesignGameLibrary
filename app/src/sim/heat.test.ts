// No reference solution may "burn" a part: the smoke effect is for mistakes, not for correct designs.
import { describe, expect, it } from 'vitest';
import { executeRuns, planRuns } from '../game/runs';
import { ALL_LEVELS } from '../levels';
import { runDeck } from './engine';
import { nodeLoader } from './nodeLoader';
import { circuitHeat, supplyPower } from './heat';

describe('heat of reference solutions', () => {
  for (const level of ALL_LEVELS) {
    const sol = level.solutions[0];
    if (!sol || !level.analyses.some((a) => a.kind === 'op')) continue;
    it(`${level.id} stays below every rating`, async () => {
      const [first] = await executeRuns(sol.circuit, level.analyses, planRuns(undefined, level.corner ?? 'tt').slice(0, 1), [], (d, c) => runDeck(d, c, nodeLoader));
      expect(first.result).toBeTruthy();
      const heat = circuitHeat(first.result!);
      const hot = heat.filter((h) => h.frac >= 1).map((h) => `${h.name} ${h.power.toExponential(2)} W`);
      if (process.env.REPORT) console.log(level.id, 'P', supplyPower(first.result!), 'max', Math.max(0, ...heat.map((h) => h.frac)).toFixed(3));
      expect(hot).toEqual([]);
    }, 60000);
  }
});
