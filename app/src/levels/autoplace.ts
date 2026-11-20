// Turn a geometry-free reference solution into a drawable schematic:
// keeps the level's starting schematic, places the extra parts on a grid to its right,
// and connects every pin with a net label (teacher mode "load reference solution").
import { schematicBox } from '../schematic/geometry';
import { pinPositions } from '../schematic/parts';
import type { Circuit, Part, Schematic } from '../schematic/types';

export function circuitToSchematic(sol: Circuit, start: Schematic): Schematic {
  const s: Schematic = structuredClone(start);
  const have = new Set(s.parts.map((p) => p.name.toUpperCase()));
  const box = schematicBox(s) ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
  // label the starting parts' pins too: some start circuits connect through unlabelled wires
  for (const part of s.parts) {
    const lp = sol.parts.find((q) => q.name.toUpperCase() === part.name.toUpperCase());
    if (!lp) continue;
    for (const pin of pinPositions(part)) {
      const net = lp.nets[pin.name];
      if (!net || net === '0') continue;
      if (s.labels.some((l) => l.x === pin.pt.x && l.y === pin.pt.y)) continue;
      s.labels.push({ id: `st${part.id}${pin.name}`, name: net, x: pin.pt.x, y: pin.pt.y });
    }
  }
  const extra = sol.parts.filter((p) => !have.has(p.name.toUpperCase()));
  const cols = Math.max(1, Math.ceil(Math.sqrt(extra.length)));
  extra.forEach((lp, i) => {
    const part: Part = {
      id: `sol${i}`, kind: lp.kind, name: lp.name, rot: 0, params: { ...lp.params },
      x: Math.round(box.x1) + 14 + (i % cols) * 14,
      y: Math.round(box.y0) + 4 + Math.floor(i / cols) * 14,
    };
    s.parts.push(part);
    for (const pin of pinPositions(part)) {
      const net = lp.nets[pin.name];
      if (!net) continue;
      s.labels.push({ id: `sl${i}${pin.name}`, name: net === '0' ? 'gnd' : net, x: pin.pt.x, y: pin.pt.y });
    }
  });
  return s;
}
