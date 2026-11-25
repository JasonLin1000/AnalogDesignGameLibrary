import { describe, expect, it } from 'vitest';
import { wireFlows, type PinCurrent } from './flow';
import type { Schematic } from './types';

const part = (id: string, kind: 'V' | 'R' | 'GND', x: number, y: number) => ({ id, kind, name: id, x, y, rot: 0 as const, params: {} });

describe('wireFlows', () => {
  // V1 (1 V) at x=0, R1 (1 kΩ) at x=6, top and bottom wires, ground on the bottom wire.
  const sch: Schematic = {
    parts: [part('V1', 'V', 0, 0), part('R1', 'R', 6, 0), part('G', 'GND', 3, 3)],
    wires: [{ id: 'w1', a: { x: 0, y: -3 }, b: { x: 6, y: -3 } }, { id: 'w2', a: { x: 0, y: 3 }, b: { x: 6, y: 3 } }],
    labels: [],
  };
  const pc: PinCurrent = (p, pin) => {
    if (p.kind === 'R') return pin === 'p' ? 1e-3 : -1e-3;   // 1 mA from p to n through R1
    if (p.kind === 'V') return pin === 'p' ? -1e-3 : 1e-3;   // the source pushes it out of its + pin
    return undefined;                                         // ground: solved by KCL
  };

  it('follows the loop: out of V+, through R, back to V-', () => {
    const f = wireFlows(sch, pc);
    const top = f.filter((s) => s.a.y === -3);
    expect(top).toHaveLength(1);
    expect(top[0].i).toBeCloseTo(1e-3);                        // a=(0,-3) -> b=(6,-3)
    const bottom = f.filter((s) => s.a.y === 3);
    // the ground tap at x=3 splits the bottom wire; both halves carry 1 mA towards x=0
    expect(bottom).toHaveLength(2);
    for (const s of bottom) expect(Math.sign(s.b.x - s.a.x) * s.i).toBeCloseTo(-1e-3);
  });

  it('solves one unknown pin but skips a component with two', () => {
    // source currents unknown: the top wire has one unknown (V+) and is solved,
    // the bottom wire has two (V-, ground) and is left without animation
    const two: PinCurrent = (p, pin) => (p.kind === 'R' ? (pin === 'p' ? 1e-3 : -1e-3) : undefined);
    const f = wireFlows(sch, two);
    expect(f.filter((s) => s.a.y === -3)[0].i).toBeCloseTo(1e-3);
    expect(f.some((s) => s.a.y === 3)).toBe(false);
  });
});
