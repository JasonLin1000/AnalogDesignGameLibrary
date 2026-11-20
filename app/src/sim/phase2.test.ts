import { describe, expect, it } from 'vitest';
import { buildDeck } from '../schematic/netlist';
import type { Circuit } from '../schematic/types';
import { runDeck } from './engine';
import { nodeLoader } from './nodeLoader';

const run = async (c: Circuit, a: Parameters<typeof buildDeck>[1], o: Parameters<typeof buildDeck>[2] = {}) => {
  const deck = buildDeck(c, a, o);
  const r = await runDeck(deck, o.corner ?? 'tt', nodeLoader);
  return { deck, r };
};

describe('phase 2 engine features', () => {
  it('noise analysis exposes spectrum and integrated totals', async () => {
    const { r } = await run({ parts: [
      { kind: 'V', name: 'V1', params: { dc: '0', ac: '1' }, nets: { p: 'in', n: '0' } },
      { kind: 'R', name: 'R1', params: { value: '10k' }, nets: { p: 'in', n: 'out' } },
      { kind: 'C', name: 'C1', params: { value: '1n' }, nets: { p: 'out', n: '0' } },
    ] }, [{ kind: 'noise', out: 'out', src: 'V1', fstart: '1', fstop: '1meg', ppd: 10 }]);
    expect(r.ok, r.log.slice(-1500)).toBe(true);
    const p = r.plots[0]!;
    const names = [...p.byName.keys()].join(' ');
    expect(p.byName.has('onoise_spectrum'), names).toBe(true);
    expect(p.byName.has('inoise_spectrum'), names).toBe(true);
    expect(p.byName.has('onoise_total'), names).toBe(true);
    // 10k resistor thermal noise = sqrt(4kTR) ~ 12.9 nV/rtHz at low frequency
    expect(p.byName.get('onoise_spectrum')!.re[0]).toBeGreaterThan(12e-9);
    expect(p.byName.get('onoise_spectrum')!.re[0]).toBeLessThan(14e-9);
    // integrated kT/C noise: sqrt(kT/C) = sqrt(4.14e-21/1e-9) ~ 2.03 uV
    expect(p.byName.get('onoise_total')!.re[0]).toBeGreaterThan(1.8e-6);
  });

  it('sky130 PNP conducts and a temperature sweep works', async () => {
    const { r } = await run({ parts: [
      { kind: 'I', name: 'I1', params: { dc: '5u' }, nets: { p: '0', n: 'e' } },
      { kind: 'PNP', name: 'Q1', params: { m: '1' }, nets: { e: 'e', b: '0', c: '0' } },
    ] }, [{ kind: 'op' }, { kind: 'dc', source: 'temp', start: '-40', stop: '125', step: '5' }]);
    expect(r.ok, r.log.slice(-2000)).toBe(true);
    const veb = r.plots[0]!.byName.get('e')!.re[0];
    expect(veb).toBeGreaterThan(0.5);
    expect(veb).toBeLessThan(0.9);
    const dc = r.plots[1]!;
    const v = dc.byName.get('e')!.re;
    expect(v[0]).toBeGreaterThan(v[v.length - 1]); // CTAT
    console.log('VEB', veb, 'x', dc.vectors[0].name, 'slope mV/K', ((v[v.length - 1] - v[0]) / 165) * 1e3,
      'ic vec', [...r.plots[0]!.byName.keys()].filter((k) => k.includes('[')).join(' '));
  });

  it('ideal op-amp follows in unity gain and dVth shifts a MOS', async () => {
    const { r } = await run({ parts: [
      { kind: 'V', name: 'V1', params: { dc: '0.7' }, nets: { p: 'in', n: '0' } },
      { kind: 'OPAMP', name: 'U1', params: { a0: '10k', gbw: '10meg', vmin: '0', vmax: '1.8' }, nets: { inp: 'in', inn: 'out', out: 'out' } },
      { kind: 'R', name: 'RL', params: { value: '10k' }, nets: { p: 'out', n: '0' } },
    ] }, [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 10 }]);
    expect(r.ok, r.log.slice(-1500)).toBe(true);
    expect(r.plots[0]!.byName.get('out')!.re[0]).toBeCloseTo(0.7, 3);

    const mk = (dv?: number) => run({ parts: [
      { kind: 'V', name: 'VD', params: { dc: '1.8' }, nets: { p: 'd', n: '0' } },
      { kind: 'V', name: 'VG', params: { dc: '0.8' }, nets: { p: 'g', n: '0' } },
      { kind: 'NFET', name: 'M1', params: { w: '2u', l: '1u', nf: '1' }, nets: { d: 'd', g: 'g', s: '0', b: '0' } },
    ] }, [{ kind: 'op' }], { dvth: dv ? { M1: dv } : undefined });
    const a = await mk(), b = await mk(0.01);
    const ia = a.r.plots[0]!.byName.get('vd#branch')!.re[0], ib = b.r.plots[0]!.byName.get('vd#branch')!.re[0];
    expect(Math.abs(ib)).toBeLessThan(Math.abs(ia) * 0.95); // +10 mV Vth -> noticeably less current
  });
});
