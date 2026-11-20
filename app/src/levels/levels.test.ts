// Every level must be solvable: each reference solution is simulated with the real
// ngspice-WASM engine and must earn exactly the number of stars it declares.
import { describe, expect, it } from 'vitest';
import { analyze, checkCircuit } from '../schematic/connectivity';
import { buildDeck } from '../schematic/netlist';
import { runDeck } from '../sim/engine';
import type { SimResult } from '../sim/measure';
import { nodeLoader } from '../sim/nodeLoader';
import { formatEng } from '../schematic/units';
import { scoreLevel } from './evaluate';
import { ALL_LEVELS } from './index';

describe.each(ALL_LEVELS.map((l) => [l.id, l] as const))('level %s', (_id, level) => {
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
      const deck = buildDeck(sol.circuit, level.analyses, { corner: level.corner });
      const run = await runDeck(deck, level.corner ?? 'tt', nodeLoader);
      expect(run.ok, run.log.slice(-2000)).toBe(true);
      const startNames = new Set(level.start.parts.map((p) => p.name));
      const res: SimResult = {
        analyses: level.analyses, plots: run.plots, circuit: sol.circuit, opVectors: deck.opVectors,
        playerParts: sol.circuit.parts.filter((p) => !startNames.has(p.name)).map((p) => p.name),
      };
      const score = scoreLevel(level, res);
      const report = [...score.main, ...score.bonus.flat()]
        .map((r) => `${r.spec.id}=${formatEng(r.value, r.spec.unit ?? '', 5)} ${r.pass ? 'ok' : 'FAIL'}${r.error ? ' ' + r.error.code + JSON.stringify(r.error.vars) : ''}`)
        .join(', ');
      expect(score.stars, report).toBe(sol.stars);
    });
  });
});
