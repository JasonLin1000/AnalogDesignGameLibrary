// Layout editor state (document, history, tools, view). Coordinates in nm, y axis up.
import { create } from 'zustand';
import { contactStack } from './pcell';
import { emptyLayout, type Box, type Instance, type LayerId, type Layout, type PCellKind } from './types';

export type LTool =
  | { kind: 'select' }
  | { kind: 'rect'; from?: { x: number; y: number } }
  | { kind: 'label'; text: string }
  | { kind: 'pcell'; cell: PCellKind; params: Instance['params'] }
  | { kind: 'stack'; stack: 'licon' | 'mcon' | 'via' }
  | { kind: 'ruler'; from?: { x: number; y: number } }
  | { kind: 'net' };

export interface LView { x: number; y: number; zoom: number } // zoom = screen px per µm

interface LState {
  doc: Layout;
  version: number;
  docId: number;
  past: Layout[];
  future: Layout[];
  selection: string[];
  tool: LTool;
  layer: LayerId;
  hidden: LayerId[];
  view: LView;
  cursor: { x: number; y: number } | null;
  snap: number;                  // nm
  rulers: { a: { x: number; y: number }; b: { x: number; y: number } }[];
  editing: string | null;
  askLabel: boolean;
  askPcell: PCellKind | null;
  allowed: { pcells: PCellKind[]; layers?: LayerId[] };

  load: (l: Layout, allowed: LState['allowed']) => void;
  commit: (fn: (d: Layout) => void) => void;
  undo: () => void;
  redo: () => void;
  set: (p: Partial<LState>) => void;
  addRect: (layer: LayerId, b: Box) => void;
  addStack: (kind: 'licon' | 'mcon' | 'via', x: number, y: number) => void;
  addInstance: (kind: PCellKind, x: number, y: number, params: Instance['params']) => void;
  addLabel: (text: string, x: number, y: number) => void;
  deleteSelection: () => void;
  moveSelection: (dx: number, dy: number) => void;
  duplicateSelection: () => void;
}

let uid = 0;
const nid = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;
const clone = (l: Layout): Layout => structuredClone(l);

export const useLayout = create<LState>((set, get) => ({
  doc: emptyLayout(),
  version: 0,
  docId: 0,
  past: [],
  future: [],
  selection: [],
  tool: { kind: 'select' },
  layer: 'diff',
  hidden: [],
  view: { x: 300, y: 400, zoom: 120 },
  cursor: null,
  snap: 5,
  rulers: [],
  editing: null,
  askLabel: false,
  askPcell: null,
  allowed: { pcells: ['nmos', 'pmos', 'ptap', 'ntap'] },

  load: (l, allowed) => set((s) => ({ doc: clone(l), allowed, past: [], future: [], selection: [], tool: { kind: 'select' }, rulers: [], version: s.version + 1, docId: s.docId + 1, editing: null })),
  commit: (fn) => set((s) => {
    const next = clone(s.doc);
    fn(next);
    return { doc: next, past: [...s.past.slice(-99), s.doc], future: [], version: s.version + 1 };
  }),
  undo: () => set((s) => (s.past.length ? { doc: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.doc, ...s.future], selection: [], version: s.version + 1 } : {})),
  redo: () => set((s) => (s.future.length ? { doc: s.future[0], future: s.future.slice(1), past: [...s.past, s.doc], selection: [], version: s.version + 1 } : {})),
  set: (p) => set(p),

  addRect: (layer, b) => {
    if (b.x1 - b.x0 <= 0 || b.y1 - b.y0 <= 0) return;
    const id = nid('r');
    get().commit((d) => { d.shapes.push({ id, layer, ...b }); });
    set({ selection: [id] });
  },
  addStack: (kind, x, y) => get().commit((d) => {
    for (const p of contactStack(kind, x, y)) d.shapes.push({ id: nid('r'), layer: p.layer, ...p.box });
  }),
  addInstance: (kind, x, y, params) => {
    const id = nid('i');
    get().commit((d) => {
      const prefix = kind === 'nmos' || kind === 'pmos' ? 'M' : 'T';
      let k = 1;
      while (d.instances.some((i) => i.name === `${prefix}${k}`)) k++;
      d.instances.push({ id, kind, name: `${prefix}${k}`, x, y, params: { ...params } });
    });
    set({ selection: [id] });
  },
  addLabel: (text, x, y) => get().commit((d) => { d.labels.push({ id: nid('t'), layer: get().layer, text, x, y }); }),
  deleteSelection: () => {
    const sel = new Set(get().selection);
    if (!sel.size) return;
    get().commit((d) => {
      d.shapes = d.shapes.filter((s) => !sel.has(s.id) || s.locked);
      d.labels = d.labels.filter((s) => !sel.has(s.id) || s.locked);
      d.instances = d.instances.filter((s) => !sel.has(s.id) || s.locked);
    });
    set({ selection: [] });
  },
  moveSelection: (dx, dy) => {
    if (!dx && !dy) return;
    const sel = new Set(get().selection);
    get().commit((d) => {
      for (const s of d.shapes) if (sel.has(s.id) && !s.locked) { s.x0 += dx; s.x1 += dx; s.y0 += dy; s.y1 += dy; }
      for (const s of d.labels) if (sel.has(s.id) && !s.locked) { s.x += dx; s.y += dy; }
      for (const s of d.instances) if (sel.has(s.id) && !s.locked) { s.x += dx; s.y += dy; }
    });
  },
  duplicateSelection: () => {
    const sel = new Set(get().selection);
    const ids: string[] = [];
    get().commit((d) => {
      const off = 1000;
      for (const s of d.shapes.filter((q) => sel.has(q.id))) { const id = nid('r'); ids.push(id); d.shapes.push({ ...s, id, locked: false, x0: s.x0 + off, x1: s.x1 + off }); }
      for (const s of d.labels.filter((q) => sel.has(q.id))) { const id = nid('t'); ids.push(id); d.labels.push({ ...s, id, locked: false, x: s.x + off }); }
      for (const s of d.instances.filter((q) => sel.has(q.id))) {
        const id = nid('i'); ids.push(id);
        let k = 1; const prefix = s.name.replace(/\d+$/, '');
        while (d.instances.some((i) => i.name === `${prefix}${k}`)) k++;
        d.instances.push({ ...s, id, locked: false, name: `${prefix}${k}`, x: s.x + off });
      }
    });
    set({ selection: ids });
  },
}));
