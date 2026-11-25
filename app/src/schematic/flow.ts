// Current flow on wires (for the animated "current dots" view).
// Each part tells us the current flowing INTO it at each pin (from the operating point). Inside
// one wire-connected component the currents must sum to zero (KCL), so one unknown pin per
// component (a ground symbol, an op-amp output, ...) is solved for. The component's wires are
// then treated as a tree and every segment gets the current that crosses it.
import type { Part, Pt, Schematic } from './types';
import { pinPositions } from './parts';

export interface FlowSeg { a: Pt; b: Pt; i: number } // i > 0: conventional current flows a -> b

/** Current flowing into `part` at pin `pin` (A), or undefined when unknown. */
export type PinCurrent = (part: Part, pin: string) => number | undefined;

const k = (p: Pt) => `${p.x},${p.y}`;
const onSeg = (p: Pt, a: Pt, b: Pt) => {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot > 1e-9 && dot < len2 - 1e-9;
};

export function wireFlows(sch: Schematic, pinCurrent: PinCurrent): FlowSeg[] {
  // 1. points that matter: wire ends and pins
  const pts = new Map<string, Pt>();
  for (const w of sch.wires) { pts.set(k(w.a), w.a); pts.set(k(w.b), w.b); }
  const pins: { pt: Pt; i: number | undefined }[] = [];
  for (const p of sch.parts) for (const q of pinPositions(p)) { pins.push({ pt: q.pt, i: pinCurrent(p, q.name) }); pts.set(k(q.pt), q.pt); }

  // 2. split wires at every point lying inside them -> graph edges
  const edges: [string, string][] = [];
  for (const w of sch.wires) {
    const inner = [...pts.values()].filter((p) => onSeg(p, w.a, w.b))
      .sort((p, q) => Math.hypot(p.x - w.a.x, p.y - w.a.y) - Math.hypot(q.x - w.a.x, q.y - w.a.y));
    const chain = [w.a, ...inner, w.b];
    for (let j = 0; j + 1 < chain.length; j++) if (k(chain[j]) !== k(chain[j + 1])) edges.push([k(chain[j]), k(chain[j + 1])]);
  }
  const adj = new Map<string, { to: string; e: number }[]>();
  edges.forEach(([a, b], e) => {
    if (!adj.has(a)) adj.set(a, []); if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push({ to: b, e }); adj.get(b)!.push({ to: a, e });
  });

  // 3. injection at each node = current leaving the parts into the wire
  const inject = new Map<string, number>();
  const unknown = new Map<string, number>(); // node -> number of unknown pins there
  for (const p of pins) {
    const key = k(p.pt);
    if (!adj.has(key)) continue; // pin not on any wire
    if (p.i === undefined || !Number.isFinite(p.i)) unknown.set(key, (unknown.get(key) ?? 0) + 1);
    else inject.set(key, (inject.get(key) ?? 0) - p.i);
  }

  // 4. per component: spanning tree, solve the single unknown, push flow from the leaves
  const flow: number[] = edges.map(() => 0);
  const seen = new Set<string>();
  const out: FlowSeg[] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const order: string[] = []; const parent = new Map<string, { node: string; e: number } | null>();
    parent.set(start, null); seen.add(start);
    for (let q = [start]; q.length;) {
      const n = q.shift()!; order.push(n);
      for (const { to, e } of adj.get(n)!) if (!seen.has(to)) { seen.add(to); parent.set(to, { node: n, e }); q.push(to); }
    }
    const unk = order.filter((n) => unknown.has(n));
    const nUnknown = unk.reduce((s, n) => s + unknown.get(n)!, 0);
    const known = order.reduce((s, n) => s + (inject.get(n) ?? 0), 0);
    if (nUnknown > 1) continue;                       // can't tell how it splits
    const inj = new Map(order.map((n) => [n, inject.get(n) ?? 0]));
    if (nUnknown === 1) inj.set(unk[0], inj.get(unk[0])! - known); // KCL closes the books
    else if (Math.abs(known) > 1e-9 * Math.max(1, ...order.map((n) => Math.abs(inj.get(n)!)))) continue; // inconsistent
    for (let j = order.length - 1; j > 0; j--) {
      const n = order[j]; const par = parent.get(n)!;
      const f = inj.get(n)!;                           // net current leaving n towards its parent
      const [a] = edges[par.e];
      flow[par.e] = a === n ? f : -f;                  // stored in the edge's a -> b direction
      inj.set(par.node, inj.get(par.node)! + f);
    }
  }
  edges.forEach(([a, b], e) => {
    if (Math.abs(flow[e]) > 0) out.push({ a: pts.get(a)!, b: pts.get(b)!, i: flow[e] });
  });
  return out;
}
