import { describe, expect, it } from 'vitest';
import { C, X } from '../levels/build';
import { runDrc } from './drc';
import { extract } from './extract';
import { lvs } from './lvs';
import { contactStack, instanceTerminals } from './pcell';
import type { Box, Instance, LayerId, Layout, LLabel, Shape } from './types';

let n = 0;
const mk = (layer: LayerId, b: Box): Shape => ({ id: `s${n++}`, layer, ...b });
const lab = (layer: LayerId, text: string, b: Box): LLabel => ({ id: `l${n++}`, layer, text, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
const nmos = (w: number, l: number, nf = 1): Instance => ({ id: `m${n++}`, kind: 'nmos', name: 'M1', x: 0, y: 0, params: { w, l, nf } });
const ref1 = C(X('NFET', 'M1', { w: '1u', l: '0.15u', nf: '1' }, { d: 'd', g: 'g', s: 's', b: 'gnd' }));

function single(w: number, labels: (t: ReturnType<typeof instanceTerminals>) => LLabel[]): Layout {
  const m = nmos(w, 150);
  return { shapes: [], instances: [m], labels: labels(instanceTerminals(m)) };
}

describe('extraction + LVS', () => {
  it('matches a single transistor (source/drain are interchangeable)', () => {
    const l = single(1000, (t) => [lab('li1', 'g', t.g!), lab('li1', 'd', t.sd[0]), lab('li1', 's', t.sd[1])]);
    const ex = extract(l);
    expect(ex.devices).toHaveLength(1);
    expect(ex.devices[0]).toMatchObject({ type: 'nfet', w: 1000, l: 150, g: 'g' });
    const r = lvs(ex, ref1, { ports: ['d', 'g', 's'] });
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('reports a W mismatch', () => {
    const l = single(800, (t) => [lab('li1', 'g', t.g!), lab('li1', 'd', t.sd[0]), lab('li1', 's', t.sd[1])]);
    const r = lvs(extract(l), ref1, { ports: ['d', 'g', 's'] });
    expect(r.issues.map((i) => i.code)).toEqual(['param']);
  });

  it('reports shorts, opens and missing pins', () => {
    const short = single(1000, (t) => [lab('li1', 'g', t.g!), lab('li1', 'd', t.sd[0]), lab('li1', 's', t.sd[0])]);
    expect(lvs(extract(short), ref1, { ports: ['d', 'g', 's'] }).issues.map((i) => i.code)).toContain('short');
    const open = single(1000, (t) => [lab('li1', 'g', t.g!), lab('li1', 'd', t.sd[0]), lab('li1', 'd', t.sd[1])]);
    const codes = lvs(extract(open), ref1, { ports: ['d', 'g', 's'] }).issues.map((i) => i.code);
    expect(codes).toContain('open');
    expect(codes).toContain('missingPin');
  });

  it('merges fingers connected through met1', () => {
    const m = nmos(2000, 150, 2);
    const t = instanceTerminals(m);
    const shapes: Shape[] = [];
    // source strips 0 and 2 joined on met1 above the transistor; drain strip 1 stays separate
    const cy = (t.sd[0].y0 + t.sd[0].y1) / 2;
    for (const s of [t.sd[0], t.sd[2]]) for (const p of contactStack('mcon', (s.x0 + s.x1) / 2, cy)) shapes.push(mk(p.layer, p.box));
    shapes.push(mk('met1', { x0: (t.sd[0].x0 + t.sd[0].x1) / 2 - 115, x1: (t.sd[2].x0 + t.sd[2].x1) / 2 + 115, y0: cy - 115, y1: cy + 115 }));
    const l: Layout = { shapes, instances: [m], labels: [lab('li1', 'g', t.g!), lab('li1', 'd', t.sd[1]), lab('met1', 's', { x0: cy, x1: cy, y0: cy, y1: cy })] };
    l.labels[2] = { ...l.labels[2], x: (t.sd[0].x0 + t.sd[0].x1) / 2, y: cy };
    expect(runDrc(l).map((v) => v.rule.id)).toEqual([]);
    const ex = extract(l);
    expect(ex.devices).toHaveLength(2);
    const ref = C(X('NFET', 'M1', { w: '2u', l: '0.15u', nf: '2' }, { d: 'd', g: 'g', s: 's', b: 'gnd' }));
    const r = lvs(ex, ref, { ports: ['d', 'g', 's'] });
    expect(r.issues).toEqual([]);
  });
});
