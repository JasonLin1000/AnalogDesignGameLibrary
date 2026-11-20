import { describe, expect, it } from 'vitest';
import { runDrc } from './drc';
import type { Instance, Layout, Shape } from './types';

let n = 0;
const rect = (layer: Shape['layer'], x0: number, y0: number, x1: number, y1: number): Shape => ({ id: `s${n++}`, layer, x0, y0, x1, y1 });
const inst = (kind: Instance['kind'], w: number, l: number, nf = 1, x = 0, y = 0): Instance => ({ id: `i${n++}`, kind, name: 'M', x, y, params: { w, l, nf } });
const L = (shapes: Shape[] = [], instances: Instance[] = []): Layout => ({ shapes, instances, labels: [] });
const ids = (l: Layout) => runDrc(l).map((v) => v.rule.id).sort();

describe('DRC', () => {
  it('PCells are clean', () => {
    for (const [k, w, l, nf] of [['nmos', 420, 150, 1], ['nmos', 1000, 150, 1], ['nmos', 4000, 500, 4], ['pmos', 2000, 150, 2], ['pmos', 420, 1000, 1], ['nmos', 10000, 1000, 5]] as const) {
      expect(ids(L([], [inst(k, w, l, nf)])), `${k} ${w}/${l} nf${nf}`).toEqual([]);
    }
    expect(ids(L([], [inst('ptap', 600, 400)]))).toEqual([]);
    expect(ids(L([], [inst('ntap', 400, 1200)]))).toEqual([]);
  });

  it('flags width and spacing', () => {
    expect(ids(L([rect('met1', 0, 0, 100, 1000)]))).toEqual(['m1.1']);
    expect(ids(L([rect('met1', 0, 0, 500, 500), rect('met1', 600, 0, 1100, 500)]))).toEqual(['m1.2']);
    // two touching rectangles forming one wide shape are fine
    expect(ids(L([rect('met1', 0, 0, 100, 500), rect('met1', 100, 0, 200, 500)]))).toEqual([]);
    // a notch narrower than the spacing rule
    expect(ids(L([rect('met1', 0, 0, 1000, 300), rect('met1', 0, 300, 300, 1000), rect('met1', 400, 300, 1000, 1000)]))).toEqual(['m1.2']);
  });

  it('checks a hand-drawn transistor', () => {
    const ok = L([rect('diff', 0, 0, 650, 500), rect('poly', 250, -130, 400, 630)]);
    expect(ids(ok)).toEqual([]);
    const shortCap = L([rect('diff', 0, 0, 650, 500), rect('poly', 250, -50, 400, 630)]);
    expect(ids(shortCap)).toEqual(['poly.8']);
    const shortSd = L([rect('diff', 0, 0, 550, 500), rect('poly', 250, -130, 400, 630)]);
    expect(ids(shortSd)).toEqual(['poly.7']);
  });

  it('checks contacts and enclosures', () => {
    // licon not covered by li1, and diffusion enclosure too small
    const bad = L([rect('diff', 0, 0, 200, 400), rect('licon', 10, 100, 180, 270)]);
    expect(ids(bad)).toEqual(['li.x', 'licon.5a']);
    // wrong contact size
    expect(ids(L([rect('diff', 0, 0, 500, 500), rect('licon', 100, 100, 300, 300), rect('li1', 100, 100, 300, 300)]))).toContain('licon.1');
    // via without met2 enclosure
    expect(ids(L([rect('met1', 0, 0, 300, 300), rect('via', 75, 75, 225, 225)]))).toEqual(['m2.4']);
  });

  it('checks N-well rules', () => {
    // p-diffusion too close to the well edge
    expect(ids(L([rect('nwell', 0, 0, 1000, 1000), rect('diff', 100, 100, 600, 600)]))).toEqual(['difftap.8']);
    // n-diffusion too close to a well
    expect(ids(L([rect('nwell', 0, 0, 1000, 1000), rect('diff', 1200, 0, 1700, 500)]))).toEqual(['difftap.9']);
  });
});
