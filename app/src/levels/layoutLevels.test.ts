// Every layout level's reference layouts must earn their declared stars:
// DRC + extraction + LVS, matching checks, and post-layout simulation / yield where the level asks for it.
import { describe, expect, it } from 'vitest';
import { checkLayoutFull } from '../layout/score';
import { runDeck } from '../sim/engine';
import { nodeLoader } from '../sim/nodeLoader';
import { LAYOUT_LEVELS } from './index';

const only = process.env.LEVEL;

describe.each(LAYOUT_LEVELS.filter((l) => !only || l.id === only).map((l) => [l.id, l] as const))('layout level %s', (_id, level) => {
  level.solutions.forEach((sol, i) => {
    it(`solution #${i + 1} earns ${sol.stars}★`, async () => {
      const r = await checkLayoutFull(level, sol.layout, (d, c) => runDeck(d, c, nodeLoader));
      const fmt = (v?: number) => (v === undefined || !Number.isFinite(v) ? String(v) : Math.abs(v) < 1e-3 || Math.abs(v) > 1e4 ? v.toExponential(4) : v.toPrecision(4));
      const report = [
        `drc=${r.violations.map((v) => v.rule.id).join(',') || 'clean'}`,
        `lvs=${r.lvs.issues.map((x) => x.code + JSON.stringify(x.vars ?? {})).join(';') || 'ok'}`,
        `specs=${[...r.main, ...r.bonus.flat()].map((x) => `${x.spec.id}:${x.pass ? 'ok' : 'FAIL'}=${fmt(x.value)}${x.pre !== undefined ? `(pre ${fmt(x.pre)})` : ''}`).join(', ')}`,
        r.post?.error ?? '',
      ].join('  ');
      if (process.env.REPORT) {
        console.log(level.id, i + 1, report);
        const y = [...r.main, ...r.bonus.flat()].find((x) => x.spec.kind === 'yield');
        if (y?.values) { const v = y.values.filter(Number.isFinite).sort((a, b) => a - b); console.log('MC', v.length, 'min', v[0], 'median', v[v.length >> 1], 'max', v[v.length - 1]); }
      }
      expect(r.stars, report).toBe(sol.stars);
    }, 180000);
  });
});
