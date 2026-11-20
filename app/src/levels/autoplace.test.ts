// The teacher-mode "load reference solution" must reproduce each solution's connectivity exactly.
import { describe, expect, it } from 'vitest';
import { toCircuit } from '../schematic/connectivity';
import type { Circuit } from '../schematic/types';
import { circuitToSchematic } from './autoplace';
import { ALL_LEVELS } from './index';

/** Canonical partition of pins into nets (net names ignored, ground kept as '0'). */
function partition(c: Circuit): string[] {
  const groups = new Map<string, string[]>();
  for (const p of c.parts) for (const [pin, net] of Object.entries(p.nets)) {
    const k = net === '0' ? '0' : `n:${net}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(`${p.name.toUpperCase()}.${pin}`);
  }
  return [...groups.entries()].map(([k, v]) => `${k === '0' ? 'GND' : ''}[${v.sort().join(',')}]`).sort();
}

describe('auto-placed reference solutions', () => {
  for (const level of ALL_LEVELS) {
    level.solutions.forEach((sol, i) => {
      it(`${level.id} solution #${i + 1}`, () => {
        const sch = circuitToSchematic(sol.circuit, level.start);
        const { circuit, diagnostics } = toCircuit(sch);
        expect(diagnostics.filter((d) => d.level === 'error')).toEqual([]);
        // MOS bodies left unconnected are tied to the source by the netlister; compare like with like
        expect(partition(circuit)).toEqual(partition(sol.circuit));
      });
    });
  }
});
