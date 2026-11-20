// Read-only drawing of a circuit (parts on a grid, connected by net labels).
import { useMemo } from 'react';
import { circuitToSchematic } from '../levels/autoplace';
import { schematicBox } from '../schematic/geometry';
import { PARTS } from '../schematic/parts';
import { G, PartSymbol } from '../schematic/PartSymbol';
import type { Circuit } from '../schematic/types';
import { emptySchematic } from '../schematic/types';

export function StaticSchematic({ circuit, height = 220 }: { circuit: Circuit; height?: number }) {
  const sch = useMemo(() => circuitToSchematic(circuit, emptySchematic()), [circuit]);
  const b = schematicBox(sch) ?? { x0: 0, y0: 0, x1: 10, y1: 10 };
  const pad = 4;
  const vb = `${(b.x0 - pad) * G} ${(b.y0 - pad) * G} ${(b.x1 - b.x0 + 2 * pad + 6) * G} ${(b.y1 - b.y0 + 2 * pad) * G}`;
  return (
    <svg className="static-sch" viewBox={vb} style={{ height, width: '100%' }} role="img" aria-label="reference schematic">
      {sch.parts.map((p) => (
        <g key={p.id} className="part">
          <PartSymbol kind={p.kind} x={p.x} y={p.y} rot={p.rot} />
          <text x={(p.x + 3.4) * G} y={(p.y - 0.4) * G} className="part-name">{p.name}</text>
          <text x={(p.x + 3.4) * G} y={(p.y + 0.9) * G} className="part-value">{PARTS[p.kind].valueText(p.params)}</text>
        </g>
      ))}
      {sch.labels.map((l) => (
        <g key={l.id} className="label">
          <path d={`M${l.x * G},${l.y * G} l3,-3 l-6,0 z`} className="label-anchor" />
          <text x={l.x * G + 4} y={l.y * G - 4} className="label-text">{l.name}</text>
        </g>
      ))}
    </svg>
  );
}
