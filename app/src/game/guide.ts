// Tool-tutorial checklists: each guide step key maps to a predicate over the editor state.
// Steps are sticky: once seen done they stay ticked (so "rotate" stays ticked after rotating back).
import type { Layout } from '../layout/types';
import type { LTool } from '../layout/store';
import type { Circuit, Schematic } from '../schematic/types';
import { parseSpice } from '../schematic/units';

export interface SchGuideCtx {
  kind: 'sch';
  sch: Schematic;
  start: Schematic;
  circuit: Circuit | null;
  simulated: boolean;
  passed: boolean;
}
export interface LayGuideCtx {
  kind: 'lay';
  doc: Layout;
  layer: string;
  rulers: number;
  tool: LTool['kind'];
  editing: boolean;
  passed: boolean;
}
export type GuideCtx = SchGuideCtx | LayGuideCtx;

type Pred = (c: GuideCtx, done: Set<string>) => boolean;

const playerR = (c: SchGuideCtx) => c.sch.parts.filter((p) => p.kind === 'R' && !p.locked);
const rNets = (c: SchGuideCtx) => {
  const ids = new Set(playerR(c).map((p) => p.name));
  return (c.circuit?.parts ?? []).filter((p) => ids.has(p.name)).flatMap((p) => Object.values(p.nets));
};
const srcNet = (c: SchGuideCtx) => c.circuit?.parts.find((p) => p.kind === 'V')?.nets.p;

const PREDS: Record<string, Pred> = {
  // schematic editor
  placeR: (c) => c.kind === 'sch' && playerR(c).length > 0,
  rotate: (c) => c.kind === 'sch' && playerR(c).some((p) => p.rot !== 0),
  value: (c) => c.kind === 'sch' && playerR(c).some((p) => Math.abs(parseSpice(p.params.value) - 1000) < 1e-6),
  wire: (c) => c.kind === 'sch' && c.sch.wires.length > c.start.wires.length && rNets(c).some((n) => n === srcNet(c) && n !== '0'),
  ground: (c) => c.kind === 'sch' && rNets(c).includes('0'),
  sim: (c) => c.kind === 'sch' && c.simulated,
  pass: (c) => c.passed,
  // layout editor
  pcell: (c) => c.kind === 'lay' && c.doc.instances.some((i) => i.kind === 'nmos'),
  props: (c) => c.kind === 'lay' && c.editing,
  ruler: (c) => c.kind === 'lay' && c.rulers > 0,
  layer: (c) => c.kind === 'lay' && c.layer === 'li1',
  rect: (c) => c.kind === 'lay' && c.doc.shapes.some((s) => !s.locked),
  del: (c, done) => c.kind === 'lay' && done.has('rect') && !c.doc.shapes.some((s) => !s.locked),
  label: (c) => c.kind === 'lay' && ['d', 'g', 's'].every((n) => c.doc.labels.some((l) => l.text.toLowerCase() === n)),
  net: (c) => c.kind === 'lay' && c.tool === 'net',
  check: (c) => c.passed,
};

/** Returns the new set of done keys (a superset of `done`). */
export function advanceGuide(keys: string[], ctx: GuideCtx, done: Set<string>): Set<string> {
  let next = done;
  for (const k of keys) {
    if (next.has(k)) continue;
    if (PREDS[k]?.(ctx, next)) { if (next === done) next = new Set(done); next.add(k); }
  }
  return next;
}

export const knownGuideKey = (k: string) => k in PREDS;
