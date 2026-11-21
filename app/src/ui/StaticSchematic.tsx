// Read-only drawings: a reference circuit (parts on a grid, connected by net labels)
// or a hand-wired example schematic for the tutorial cards.
import { useMemo } from 'react';
import { circuitToSchematic } from '../levels/autoplace';
import { analyze } from '../schematic/connectivity';
import { partBox, schematicBox } from '../schematic/geometry';
import { PARTS } from '../schematic/parts';
import { G, PartSymbol } from '../schematic/PartSymbol';
import type { Circuit, Schematic } from '../schematic/types';
import { emptySchematic } from '../schematic/types';

export function StaticSchematic({ circuit, height = 220 }: { circuit: Circuit; height?: number }) {
  const sch = useMemo(() => circuitToSchematic(circuit, emptySchematic()), [circuit]);
  return <SchematicDrawing sch={sch} height={height} />;
}

export function SchematicDrawing({ sch, height = 220, values = true }: { sch: Schematic; height?: number; values?: boolean }) {
  const conn = useMemo(() => analyze(sch), [sch]);
  const b = schematicBox(sch) ?? { x0: 0, y0: 0, x1: 10, y1: 10 };
  const pad = 3;
  const vb = `${(b.x0 - pad) * G} ${(b.y0 - pad) * G} ${(b.x1 - b.x0 + 2 * pad + 6) * G} ${(b.y1 - b.y0 + 2 * pad) * G}`;
  return (
    <svg className="static-sch" viewBox={vb} style={{ height, width: '100%' }} role="img" aria-label="schematic">
      {sch.wires.map((w) => <line key={w.id} x1={w.a.x * G} y1={w.a.y * G} x2={w.b.x * G} y2={w.b.y * G} className="wire" />)}
      {conn.junctions.map((p) => <circle key={`j${p.x},${p.y}`} cx={p.x * G} cy={p.y * G} r={3} className="junction" />)}
      {sch.parts.map((p) => {
        const box = partBox(p);
        const vertical = p.rot % 2 === 0;
        const tx = vertical ? (p.mirror ? box.x0 - 0.5 : box.x1 + 0.5) : (box.x0 + box.x1) / 2;
        const ty = vertical ? (box.y0 + box.y1) / 2 - 0.6 : box.y0 - 1.6;
        const anchor = vertical ? (p.mirror ? 'end' : 'start') : 'middle';
        const value = values ? PARTS[p.kind].valueText(p.params) : '';
        return (
          <g key={p.id} className="part">
            <PartSymbol kind={p.kind} x={p.x} y={p.y} rot={p.rot} mirror={p.mirror} />
            {p.kind !== 'GND' && <text x={tx * G} y={ty * G} className="part-name" textAnchor={anchor}>{p.name}</text>}
            {value && <text x={tx * G} y={(ty + 1.3) * G} className="part-value" textAnchor={anchor}>{value}</text>}
          </g>
        );
      })}
      {sch.labels.map((l) => (
        <g key={l.id} className="label">
          <path d={`M${l.x * G},${l.y * G} l3,-3 l-6,0 z`} className="label-anchor" />
          <text x={l.x * G + 4} y={l.y * G - 4} className="label-text">{l.name}</text>
        </g>
      ))}
    </svg>
  );
}
