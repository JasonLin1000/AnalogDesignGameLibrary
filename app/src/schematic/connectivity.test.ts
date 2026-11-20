import { describe, expect, it } from 'vitest';
import { scoreLevel } from '../levels/evaluate';
import { findLevel } from '../levels';
import { runDeck } from '../sim/engine';
import { nodeLoader } from '../sim/nodeLoader';
import { analyze, toCircuit } from './connectivity';
import { buildDeck } from './netlist';
import { defaultParams } from './parts';
import { moveItems } from './store';
import type { Part, Schematic } from './types';

const part = (kind: Part['kind'], name: string, x: number, y: number, rot: Part['rot'] = 0, params = {}): Part =>
  ({ id: name, kind, name, x, y, rot, params: { ...defaultParams(kind), ...params } });
const wire = (id: string, x1: number, y1: number, x2: number, y2: number) => ({ id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });

describe('connectivity', () => {
  it('joins T-junctions, coincident pins and same-name labels', () => {
    const s: Schematic = {
      parts: [part('V', 'V1', 0, 0), part('GND', 'G', 0, 3), part('R', 'R1', 10, 0), part('R', 'R2', 20, 0)],
      wires: [wire('w1', 0, -3, 20, -3), wire('w2', 10, -5, 10, -3)], // w2 ends on w1's interior
      labels: [{ id: 'l1', name: 'OUT', x: 10, y: 3 }, { id: 'l2', name: 'out', x: 20, y: 3 }],
    };
    const c = analyze(s);
    const n = c.pinNets;
    expect(n.get('V1')!.p).toBe(n.get('R1')!.p);
    expect(n.get('R1')!.p).toBe(n.get('R2')!.p);
    expect(n.get('V1')!.n).toBe('0');
    expect(n.get('R1')!.n).toBe('out');
    expect(n.get('R2')!.n).toBe('out');
    expect(c.junctions).toContainEqual({ x: 10, y: -3 });
  });

  it('reports dangling pins and missing ground', () => {
    const { diagnostics } = toCircuit({ parts: [part('R', 'R1', 0, 0)], wires: [], labels: [] });
    const codes = diagnostics.map((d) => d.code);
    expect(codes).toContain('danglingPin');
    expect(codes).toContain('noGround');
  });

  it('rubber-bands attached wire ends when a part moves', () => {
    const s: Schematic = { parts: [part('R', 'R1', 0, 0)], wires: [wire('w', 0, -3, 0, -8)], labels: [] };
    moveItems(s, new Set(['R1']), 2, 0);
    expect(s.wires[0].a).toEqual({ x: 2, y: -3 });
    expect(s.wires[0].b).toEqual({ x: 0, y: -8 });
  });

  it('plays level 0-1 like a player: place a resistor, wire it, simulate', async () => {
    const level = findLevel('0-1')!;
    const s: Schematic = structuredClone(level.start);
    s.parts.push(part('R', 'R1', 7, -7, 1, { value: '316' })); // horizontal: pins at (4,-7) and (10,-7)
    s.wires.push(wire('a', 0, -7, 4, -7), wire('b', 10, -7, 14, -7));
    const { circuit, diagnostics } = toCircuit(s);
    expect(diagnostics.filter((d) => d.level === 'error')).toEqual([]);
    const deck = buildDeck(circuit, level.analyses);
    const run = await runDeck(deck, 'tt', nodeLoader);
    expect(run.ok).toBe(true);
    const score = scoreLevel(level, { analyses: level.analyses, plots: run.plots, circuit, opVectors: deck.opVectors, playerParts: ['R1'] });
    expect(score.stars).toBe(2);
  });
});
