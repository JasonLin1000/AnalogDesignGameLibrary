// Editor state: schematic document, history, tools, selection, viewport.
import { create } from 'zustand';
import type { PaletteItem } from '../levels/types';
import { PARTS, defaultParams, nextRot, pinPositions } from './parts';
import type { Label, Part, PartKind, Pt, Rot, Schematic, Wire } from './types';
import { emptySchematic } from './types';

export type Tool =
  | { kind: 'select' }
  | { kind: 'wire'; from?: Pt }
  | { kind: 'place'; partKind: PartKind; rot: Rot; mirror: boolean; params: Record<string, string>; lockedParams?: string[] }
  | { kind: 'label'; name: string }
  | { kind: 'probe' };

export interface View { x: number; y: number; zoom: number }

interface EditorState {
  sch: Schematic;
  version: number;              // bumps on every document change
  docId: number;                // bumps when a new document is loaded
  past: Schematic[];
  future: Schematic[];
  selection: string[];
  tool: Tool;
  view: View;
  cursor: Pt | null;
  palette: PaletteItem[] | null; // null = sandbox (everything allowed)
  editing: string | null;        // part id whose property dialog is open
  askLabel: boolean;             // label-name prompt open

  load: (sch: Schematic, palette: PaletteItem[] | null) => void;
  commit: (fn: (s: Schematic) => void) => void;
  undo: () => void;
  redo: () => void;
  setTool: (t: Tool) => void;
  setSelection: (ids: string[]) => void;
  setView: (v: View) => void;
  setCursor: (p: Pt | null) => void;
  setEditing: (id: string | null) => void;
  setAskLabel: (b: boolean) => void;

  remaining: (kind: PartKind) => number;
  placePart: (at: Pt) => void;
  addWirePath: (a: Pt, b: Pt) => void;
  addLabel: (at: Pt, name: string) => void;
  deleteSelection: () => void;
  rotateSelection: () => void;
  mirrorSelection: () => void;
  moveSelection: (dx: number, dy: number) => void;
  updatePart: (id: string, name: string, params: Record<string, string>) => void;
}

let uid = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
const clone = (s: Schematic): Schematic => structuredClone(s);
const HISTORY = 100;

export function nextName(sch: Schematic, kind: PartKind): string {
  const prefix = PARTS[kind].prefix;
  const used = new Set(sch.parts.map((p) => p.name.toUpperCase()));
  for (let i = 1; ; i++) if (!used.has(`${prefix}${i}`.toUpperCase())) return `${prefix}${i}`;
}

/** Manhattan L-route: horizontal first. */
export function lRoute(a: Pt, b: Pt): [Pt, Pt][] {
  const mid = { x: b.x, y: a.y };
  const segs: [Pt, Pt][] = [];
  if (a.x !== mid.x) segs.push([a, mid]);
  if (mid.y !== b.y) segs.push([mid, b]);
  return segs;
}

export const useEditor = create<EditorState>((set, get) => ({
  sch: emptySchematic(),
  version: 0,
  docId: 0,
  past: [],
  future: [],
  selection: [],
  tool: { kind: 'select' },
  view: { x: 400, y: 300, zoom: 2 },
  cursor: null,
  palette: null,
  editing: null,
  askLabel: false,

  load: (sch, palette) => set((s) => ({
    sch: clone(sch), palette, past: [], future: [], selection: [], tool: { kind: 'select' },
    version: s.version + 1, docId: s.docId + 1, editing: null,
  })),

  commit: (fn) => set((s) => {
    const next = clone(s.sch);
    fn(next);
    return { sch: next, past: [...s.past.slice(-HISTORY + 1), s.sch], future: [], version: s.version + 1 };
  }),
  undo: () => set((s) => {
    if (!s.past.length) return {};
    return { sch: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.sch, ...s.future], selection: [], version: s.version + 1 };
  }),
  redo: () => set((s) => {
    if (!s.future.length) return {};
    return { sch: s.future[0], future: s.future.slice(1), past: [...s.past, s.sch], selection: [], version: s.version + 1 };
  }),

  setTool: (tool) => set({ tool }),
  setSelection: (selection) => set({ selection }),
  setView: (view) => set({ view }),
  setCursor: (cursor) => set({ cursor }),
  setEditing: (editing) => set({ editing }),
  setAskLabel: (askLabel) => set({ askLabel }),

  remaining: (kind) => {
    const { palette, sch } = get();
    if (kind === 'GND' || !palette) return Infinity;
    const item = palette.find((p) => p.kind === kind);
    if (!item) return 0;
    const used = sch.parts.filter((p) => p.kind === kind && !p.locked).length;
    return (item.max ?? Infinity) - used;
  },

  placePart: (at) => {
    const t = get().tool;
    if (t.kind !== 'place' || get().remaining(t.partKind) <= 0) return;
    get().commit((s) => {
      const part: Part = {
        id: newId('p'), kind: t.partKind, name: nextName(s, t.partKind), x: at.x, y: at.y,
        rot: t.rot, mirror: t.mirror || undefined, params: { ...t.params }, lockedParams: t.lockedParams,
      };
      s.parts.push(part);
    });
    if (get().remaining(t.partKind) <= 0) set({ tool: { kind: 'select' } });
  },

  addWirePath: (a, b) => {
    const segs = lRoute(a, b);
    if (!segs.length) return;
    get().commit((s) => { for (const [p, q] of segs) s.wires.push({ id: newId('w'), a: p, b: q }); });
  },

  addLabel: (at, name) => get().commit((s) => { s.labels.push({ id: newId('l'), name, x: at.x, y: at.y }); }),

  deleteSelection: () => {
    const sel = new Set(get().selection);
    if (!sel.size) return;
    get().commit((s) => {
      s.parts = s.parts.filter((p) => !sel.has(p.id) || p.locked);
      s.wires = s.wires.filter((w) => !sel.has(w.id) || w.locked);
      s.labels = s.labels.filter((l) => !sel.has(l.id) || l.locked);
    });
    set({ selection: [] });
  },

  rotateSelection: () => {
    const t = get().tool;
    if (t.kind === 'place') { set({ tool: { ...t, rot: nextRot(t.rot) } }); return; }
    const sel = new Set(get().selection);
    const targets = get().sch.parts.filter((p) => sel.has(p.id) && !p.locked);
    if (!targets.length) return;
    get().commit((s) => { for (const p of s.parts) if (sel.has(p.id) && !p.locked) p.rot = nextRot(p.rot); });
  },

  mirrorSelection: () => {
    const t = get().tool;
    if (t.kind === 'place') { set({ tool: { ...t, mirror: !t.mirror } }); return; }
    const sel = new Set(get().selection);
    get().commit((s) => { for (const p of s.parts) if (sel.has(p.id) && !p.locked) p.mirror = !p.mirror || undefined; });
  },

  moveSelection: (dx, dy) => {
    if (!dx && !dy) return;
    const sel = new Set(get().selection);
    get().commit((s) => moveItems(s, sel, dx, dy));
  },

  updatePart: (id, name, params) => get().commit((s) => {
    const p = s.parts.find((q) => q.id === id);
    if (!p || p.locked) return;
    p.name = name.trim() || p.name;
    for (const [k, v] of Object.entries(params)) if (!p.lockedParams?.includes(k)) p.params[k] = v;
  }),
}));

/** Move selected items; wires attached to moved pins stretch (rubber-banding). */
export function moveItems(s: Schematic, sel: Set<string>, dx: number, dy: number) {
  const moved = s.parts.filter((p) => sel.has(p.id) && !p.locked);
  const oldPins = new Set(moved.flatMap((p) => pinPositions(p).map((q) => `${q.pt.x},${q.pt.y}`)));
  const mv = (pt: Pt) => { pt.x += dx; pt.y += dy; };
  for (const p of moved) { p.x += dx; p.y += dy; }
  for (const w of s.wires) {
    if (w.locked) continue;
    if (sel.has(w.id)) { mv(w.a); mv(w.b); continue; }
    if (oldPins.has(`${w.a.x},${w.a.y}`)) mv(w.a);
    if (oldPins.has(`${w.b.x},${w.b.y}`)) mv(w.b);
  }
  for (const l of s.labels) {
    if (l.locked) continue;
    if (sel.has(l.id) || oldPins.has(`${l.x},${l.y}`)) { l.x += dx; l.y += dy; }
  }
}

export function makePlaceTool(kind: PartKind, item?: PaletteItem): Tool {
  return {
    kind: 'place', partKind: kind, rot: 0, mirror: false,
    params: { ...defaultParams(kind), ...(item?.params ?? {}) }, lockedParams: item?.lockedParams,
  };
}

export type { Label, Wire };
