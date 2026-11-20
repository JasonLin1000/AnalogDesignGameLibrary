// Grade a layout level: DRC, extraction + LVS, area and pin-layer checks.
import type { LayoutLevel, LayoutSpec } from '../levels/types';
import { runDrc, type Violation } from './drc';
import { extract, type Extraction } from './extract';
import { flatten } from './flatten';
import { bbox } from './geom';
import { lvs, type LvsResult } from './lvs';
import type { Layout } from './types';

export interface LSpecResult { spec: LayoutSpec; pass: boolean; value?: number }
export interface LayoutCheck {
  violations: Violation[];
  ex: Extraction;
  lvs: LvsResult;
  area: number;   // µm², bounding box of all drawn shapes
  main: LSpecResult[];
  bonus: LSpecResult[][];
  stars: number;
}

export function layoutArea(l: Layout): number {
  const b = bbox(flatten(l));
  return b ? ((b.x1 - b.x0) / 1000) * ((b.y1 - b.y0) / 1000) : 0;
}

export function checkLayout(level: LayoutLevel, doc: Layout): LayoutCheck {
  const violations = runDrc(doc);
  const ex = extract(doc);
  const lv = lvs(ex, level.reference, { ports: level.ports, checkBody: level.checkBody });
  const area = layoutArea(doc);
  const one = (s: LayoutSpec): LSpecResult => {
    switch (s.kind) {
      case 'drc': return { spec: s, pass: violations.length === 0, value: violations.length };
      case 'lvs': return { spec: s, pass: lv.ok };
      case 'area': return { spec: s, pass: area > 0 && area <= (s.max ?? Infinity), value: area };
      case 'pins': {
        const wrong = level.ports.filter((p) => !doc.labels.some((l) => l.text.trim().toLowerCase() === p.toLowerCase() && l.layer === s.layer));
        return { spec: s, pass: wrong.length === 0, value: wrong.length };
      }
    }
  };
  const main = level.specs.map(one);
  const bonus = (level.stars ?? []).map((tier) => tier.map(one));
  let stars = 0;
  if (main.every((r) => r.pass)) {
    stars = 1;
    for (const tier of bonus) { if (tier.every((r) => r.pass)) stars++; else break; }
  }
  return { violations, ex, lvs: lv, area, main, bonus, stars };
}
