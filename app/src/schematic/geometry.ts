import { PARTS, xform } from './parts';
import type { Part, Pt, Schematic } from './types';

export interface Box { x0: number; y0: number; x1: number; y1: number }

/** World-space bounding box of a part (grid units). */
export function partBox(part: Part): Box {
  const def = PARTS[part.kind];
  const pts = def.pins.map((p) => xform(p, part));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 1.4;
  if (x1 - x0 < 2 * pad) { const c = (x0 + x1) / 2; x0 = c - pad; x1 = c + pad; }
  if (y1 - y0 < 2 * pad) { const c = (y0 + y1) / 2; y0 = c - pad; y1 = c + pad; }
  if (part.kind === 'GND') { y1 = part.y + 2; }
  // symbols that stick out beyond their pins (LED arrows)
  const extra = def.symbol.extent;
  if (extra) {
    for (const p of [{ x: extra[0], y: extra[1] }, { x: extra[2], y: extra[3] }].map((q) => xform(q, part))) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
  }
  return { x0, y0, x1, y1 };
}

export function distToSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export type Hit = { type: 'part' | 'wire' | 'label'; id: string } | null;

/** Hit-test at a world point (unsnapped, grid units). Labels > wires > parts. */
export function hitTest(sch: Schematic, p: Pt): Hit {
  for (const l of sch.labels) {
    const w = Math.max(1.5, l.name.length * 0.75);
    if (p.x >= l.x - 0.5 && p.x <= l.x + w + 0.5 && p.y >= l.y - 1.6 && p.y <= l.y + 0.4) return { type: 'label', id: l.id };
  }
  let best: Hit = null, bestD = 0.45;
  for (const w of sch.wires) {
    const d = distToSeg(p, w.a, w.b);
    if (d < bestD) { bestD = d; best = { type: 'wire', id: w.id }; }
  }
  if (best) return best;
  for (let i = sch.parts.length - 1; i >= 0; i--) {
    const b = partBox(sch.parts[i]);
    if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) return { type: 'part', id: sch.parts[i].id };
  }
  return null;
}

export function itemsInBox(sch: Schematic, b: Box): string[] {
  const inside = (p: Pt) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;
  const ids: string[] = [];
  for (const part of sch.parts) {
    const pb = partBox(part);
    if (inside({ x: pb.x0, y: pb.y0 }) && inside({ x: pb.x1, y: pb.y1 })) ids.push(part.id);
  }
  for (const w of sch.wires) if (inside(w.a) && inside(w.b)) ids.push(w.id);
  for (const l of sch.labels) if (inside(l)) ids.push(l.id);
  return ids;
}

export function schematicBox(sch: Schematic): Box | null {
  const boxes: Box[] = [
    ...sch.parts.map(partBox),
    ...sch.wires.map((w) => ({ x0: Math.min(w.a.x, w.b.x), y0: Math.min(w.a.y, w.b.y), x1: Math.max(w.a.x, w.b.x), y1: Math.max(w.a.y, w.b.y) })),
    ...sch.labels.map((l) => ({ x0: l.x, y0: l.y - 1.5, x1: l.x + l.name.length * 0.8, y1: l.y })),
  ];
  if (!boxes.length) return null;
  return {
    x0: Math.min(...boxes.map((b) => b.x0)), y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)), y1: Math.max(...boxes.map((b) => b.y1)),
  };
}
