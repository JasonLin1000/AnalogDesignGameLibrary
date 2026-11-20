import { describe, expect, it } from 'vitest';
import { buildDeck } from '../schematic/netlist';
import type { Circuit } from '../schematic/types';
import { runDeck } from './engine';
import { nodeLoader } from './nodeLoader';

describe('simulation engine', () => {
  it('runs op + ac on an RC divider and exposes named vectors', async () => {
    const c: Circuit = { parts: [
      { kind: 'V', name: 'V1', params: { dc: '1', ac: '1', tran: '' }, nets: { p: 'in', n: '0' } },
      { kind: 'R', name: 'R1', params: { value: '1k' }, nets: { p: 'in', n: 'out' } },
      { kind: 'C', name: 'C1', params: { value: '1u' }, nets: { p: 'out', n: '0' } },
      { kind: 'R', name: 'R2', params: { value: '1k' }, nets: { p: 'out', n: '0' } },
    ] };
    const deck = buildDeck(c, [{ kind: 'op' }, { kind: 'ac', fstart: '10', fstop: '1meg', ppd: 10 }]);
    const r = await runDeck(deck, 'tt', nodeLoader);
    expect(r.ok, r.log).toBe(true);
    const op = r.plots[0]!;
    expect(op.byName.get('out')!.re[0]).toBeCloseTo(0.5, 6);
    expect(op.byName.get('@r1[i]')!.re[0]).toBeCloseTo(0.5e-3, 9);
    expect(op.byName.get('v1#branch')!.re[0]).toBeCloseTo(-0.5e-3, 9);
    const ac = r.plots[1]!;
    expect(ac.complex).toBe(true);
    expect(ac.byName.has('frequency')).toBe(true);
  });

  it('runs SKY130 devices and saves internal op parameters', async () => {
    const c: Circuit = { parts: [
      { kind: 'V', name: 'VDD', params: { dc: '1.8' }, nets: { p: 'vdd', n: '0' } },
      { kind: 'V', name: 'VG', params: { dc: '0.8' }, nets: { p: 'g', n: '0' } },
      { kind: 'NFET', name: 'M1', params: { w: '1u', l: '1u', nf: '1' }, nets: { d: 'vdd', g: 'g', s: '0', b: '0' } },
    ] };
    const deck = buildDeck(c, [{ kind: 'op' }]);
    const r = await runDeck(deck, 'tt', nodeLoader);
    expect(r.ok, r.log).toBe(true);
    const names = [...r.plots[0]!.byName.keys()];
    const id = r.plots[0]!.byName.get('@m.xm1.msky130_fd_pr__nfet_01v8[id]');
    expect(id, names.join(' ')).toBeTruthy();
    expect(id!.re[0]).toBeGreaterThan(1e-6);
  });
});
