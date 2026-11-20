// Every layout level's reference layouts must earn their declared stars (DRC + extraction + LVS).
import { describe, expect, it } from 'vitest';
import { checkLayout } from '../layout/score';
import { LAYOUT_LEVELS } from './index';

describe.each(LAYOUT_LEVELS.map((l) => [l.id, l] as const))('layout level %s', (_id, level) => {
  level.solutions.forEach((sol, i) => {
    it(`solution #${i + 1} earns ${sol.stars}★`, () => {
      const r = checkLayout(level, sol.layout);
      const report = [
        `drc=${r.violations.map((v) => v.rule.id).join(',') || 'clean'}`,
        `lvs=${r.lvs.issues.map((x) => x.code + JSON.stringify(x.vars ?? {})).join(';') || 'ok'}`,
        `area=${r.area.toFixed(3)}`,
        `devices=${r.ex.devices.map((d) => `${d.type} ${d.w}/${d.l} g=${d.g} sd=${d.sd} b=${d.b}`).join(' | ')}`,
      ].join('  ');
      expect(r.stars, report).toBe(sol.stars);
    });
  });
});
