// Every level must be solvable: each reference solution is simulated with the real
// ngspice-WASM engine (including PVT corners / Monte Carlo when the level sweeps them)
// and must earn exactly the number of stars it declares.
import { describe, expect, it } from 'vitest';
import { executeRuns, planRuns, toRunSet } from '../game/runs';
import { analyze, checkCircuit } from '../schematic/connectivity';
import { formatEng } from '../schematic/units';
import { runDeck } from '../sim/engine';
import { nodeLoader } from '../sim/nodeLoader';
import { scoreLevel } from './evaluate';
import { ALL_LEVELS } from './index';

const onlyLevel = process.env.LEVEL; // e.g. LEVEL=5-1 npx vitest run src/levels

describe.each(ALL_LEVELS.filter((l) => !onlyLevel || l.id === onlyLevel).map((l) => [l.id, l] as const))('level %s', (_id, level) => {
  it('starting schematic is well-formed', () => {
    const conn = analyze(level.start);
    expect(conn.netOfPoint.size).toBeGreaterThan(0);
    const names = level.start.parts.map((p) => p.name.toUpperCase());
    expect(new Set(names).size).toBe(names.length);
  });

  level.solutions.forEach((sol, i) => {
    it(`solution #${i + 1} earns ${sol.stars}★`, async () => {
      const diag = checkCircuit(sol.circuit).filter((d) => d.level === 'error');
      expect(diag).toEqual([]);
      const startNames = new Set(level.start.parts.map((p) => p.name));
      const player = sol.circuit.parts.filter((p) => !startNames.has(p.name)).map((p) => p.name);
      const runs = planRuns(level.sweep, level.corner ?? 'tt');
      const outcomes = await executeRuns(sol.circuit, level.analyses, runs, player, (d, c) => runDeck(d, c, nodeLoader));
      const first = outcomes[0];
      expect(first.result, first.run?.log.slice(-2000) ?? first.error).toBeTruthy();
      const set = toRunSet(outcomes)!;
      const score = scoreLevel(level, set);
      const report = [...score.main, ...score.bonus.flat()]
        .map((r) => `${r.spec.id}=${formatEng(r.value, r.spec.unit ?? '', 5)}${r.worstLabel ? `@${r.worstLabel}` : ''} ${r.pass ? 'ok' : 'FAIL'}${r.error ? ' ' + r.error.code + JSON.stringify(r.error.vars) : ''}`)
        .join(', ');
      if (process.env.REPORT) console.log(`${level.id}#${i + 1}: ${report}`);
      expect(score.stars, report).toBe(sol.stars);
    }, 120000);
  });
});
