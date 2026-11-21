import { describe, expect, it } from 'vitest';
import { findLevel } from '../levels';
import type { Level, LayoutLevel } from '../levels/types';
import { toCircuit } from '../schematic/connectivity';
import type { Schematic } from '../schematic/types';
import { advanceGuide, knownGuideKey, type GuideCtx } from './guide';

describe('tool-tutorial checklists', () => {
  it('every guide step has a predicate', () => {
    for (const id of ['0-0', '7-0']) {
      const lv = findLevel(id) as Level | LayoutLevel;
      expect(lv.guide?.length).toBeGreaterThan(0);
      for (const s of lv.guide!) expect(knownGuideKey(s.key), s.key).toBe(true);
    }
  });

  it('0-0 ticks steps as the schematic is built', () => {
    const lv = findLevel('0-0') as Level;
    const keys = lv.guide!.map((g) => g.key);
    const ctx = (sch: Schematic, extra: Partial<GuideCtx> = {}): GuideCtx =>
      ({ kind: 'sch', sch, start: lv.start, circuit: toCircuit(sch).circuit, simulated: false, passed: false, ...extra }) as GuideCtx;
    let done = new Set<string>();
    const s: Schematic = structuredClone(lv.start);
    s.parts.push({ id: 'r', kind: 'R', name: 'R1', x: 20, y: 0, rot: 0, params: { value: '100' } });
    done = advanceGuide(keys, ctx(s), done);
    expect([...done]).toEqual(['placeR']);
    // rotate, then rotate back: the step stays ticked
    s.parts[s.parts.length - 1].rot = 1;
    done = advanceGuide(keys, ctx(s), done);
    s.parts[s.parts.length - 1].rot = 0;
    s.parts[s.parts.length - 1].params.value = '1k';
    // resistor at (10,-4): pins (10,-7) on the source wire end and (10,-1); a wire down to ground at (10,3)
    Object.assign(s.parts[s.parts.length - 1], { x: 10, y: -4 });
    s.wires.push({ id: 'g', a: { x: 10, y: -1 }, b: { x: 10, y: 3 } });
    done = advanceGuide(keys, ctx(s), done);
    expect(done.has('rotate') && done.has('value') && done.has('wire') && done.has('ground')).toBe(true);
    done = advanceGuide(keys, ctx(s, { simulated: true, passed: true }), done);
    expect(done.size).toBe(keys.length);
  });
});
