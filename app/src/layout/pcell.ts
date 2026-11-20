// Parameterised cells drawn to the SKY130 rules in drc.ts.
// MOS: vertical poly fingers over a horizontal diffusion strip, a poly head on top with a gate
// contact, and a column of contacts + li1 strip in every source/drain region.
import type { Box, Instance, LayerId, Shape } from './types';

const SD = 290;      // source/drain region length: contact 170 + 2 × 60 to the gates
const CUT = 170;     // licon size
const CUT_PITCH = 340;
const ENDCAP = 130;
const HEAD = 270;    // poly head height (contact 170 + 2 × 50 enclosure)
const WELL_ENC = 180;
const WELL_MIN = 840;

const r5 = (v: number) => Math.round(v / 5) * 5;

export interface PCellOut {
  shapes: { layer: LayerId; box: Box }[];
  /** li1 terminals in local coordinates: gate pad and source/drain strips (left to right). */
  terminals: { g?: Box; sd: Box[]; tap?: Box };
}

function contactColumn(cx: number, y0: number, y1: number, out: PCellOut['shapes']): Box {
  const span = y1 - y0;
  const n = Math.max(1, Math.floor((span - 2 * 60 + CUT_PITCH - CUT) / CUT_PITCH));
  const total = n * CUT + (n - 1) * (CUT_PITCH - CUT);
  const start = r5(y0 + (span - total) / 2);
  for (let i = 0; i < n; i++) {
    const yy = start + i * CUT_PITCH;
    out.push({ layer: 'licon', box: { x0: cx - CUT / 2, x1: cx + CUT / 2, y0: yy, y1: yy + CUT } });
  }
  const strip = { x0: cx - CUT / 2, x1: cx + CUT / 2, y0: start, y1: start + total };
  out.push({ layer: 'li1', box: strip });
  return strip;
}

function wellAround(b: Box, out: PCellOut['shapes']) {
  let w = { x0: b.x0 - WELL_ENC, x1: b.x1 + WELL_ENC, y0: b.y0 - WELL_ENC, y1: b.y1 + WELL_ENC };
  const grow = (lo: number, hi: number) => { const d = Math.max(0, WELL_MIN - (hi - lo)); return [lo - r5(d / 2), hi + (d - r5(d / 2))]; };
  [w.x0, w.x1] = grow(w.x0, w.x1);
  [w.y0, w.y1] = grow(w.y0, w.y1);
  out.push({ layer: 'nwell', box: w });
}

export function mosCell(kind: 'nmos' | 'pmos', W: number, Lg: number, nf: number): PCellOut {
  nf = Math.max(1, Math.round(nf));
  const wf = r5(W / nf);
  const out: PCellOut['shapes'] = [];
  const diffW = nf * Lg + (nf + 1) * SD;
  const diff = { x0: 0, y0: 0, x1: diffW, y1: wf };
  out.push({ layer: 'diff', box: diff });
  // gate head: spans all fingers, at least wide enough to enclose a contact
  const fx0 = SD, fx1 = SD + (nf - 1) * (Lg + SD) + Lg;
  const mid = r5((fx0 + fx1) / 2);
  const head = { x0: Math.min(fx0, mid - 135), x1: Math.max(fx1, mid + 135), y0: wf + ENDCAP, y1: wf + ENDCAP + HEAD };
  for (let i = 0; i < nf; i++) {
    const x0 = SD + i * (Lg + SD);
    out.push({ layer: 'poly', box: { x0, x1: x0 + Lg, y0: -ENDCAP, y1: head.y1 } });
  }
  out.push({ layer: 'poly', box: head });
  const gc = { x0: mid - CUT / 2, x1: mid + CUT / 2, y0: head.y0 + 50, y1: head.y0 + 50 + CUT };
  out.push({ layer: 'licon', box: gc }, { layer: 'li1', box: { ...gc } });
  const sd: Box[] = [];
  for (let j = 0; j <= nf; j++) sd.push(contactColumn(j * (Lg + SD) + SD / 2, 0, wf, out));
  if (kind === 'pmos') wellAround(diff, out);
  return { shapes: out, terminals: { g: gc, sd } };
}

export function tapCell(kind: 'ptap' | 'ntap', w: number, h: number): PCellOut {
  const out: PCellOut['shapes'] = [];
  const tap = { x0: 0, y0: 0, x1: w, y1: h };
  out.push({ layer: 'tap', box: tap });
  // one row of contacts along the longer side
  let strip: Box;
  if (w >= h) {
    const n = Math.max(1, Math.floor((w - 120 + CUT_PITCH - CUT) / CUT_PITCH));
    const total = n * CUT + (n - 1) * (CUT_PITCH - CUT);
    const sx = r5((w - total) / 2), cy = r5(h / 2);
    for (let i = 0; i < n; i++) out.push({ layer: 'licon', box: { x0: sx + i * CUT_PITCH, x1: sx + i * CUT_PITCH + CUT, y0: cy - CUT / 2, y1: cy + CUT / 2 } });
    strip = { x0: sx, x1: sx + total, y0: cy - CUT / 2, y1: cy + CUT / 2 };
    out.push({ layer: 'li1', box: strip });
  } else {
    strip = contactColumn(r5(w / 2), 0, h, out);
  }
  if (kind === 'ntap') wellAround(tap, out);
  return { shapes: out, terminals: { sd: [], tap: strip } };
}

export function expandInstance(inst: Instance): Shape[] {
  const { w, l, nf } = inst.params;
  const cell = inst.kind === 'nmos' || inst.kind === 'pmos' ? mosCell(inst.kind, w, l, nf) : tapCell(inst.kind, w, l);
  return cell.shapes.map((s, k) => ({
    id: `${inst.id}:${k}`, layer: s.layer, locked: true,
    x0: s.box.x0 + inst.x, x1: s.box.x1 + inst.x, y0: s.box.y0 + inst.y, y1: s.box.y1 + inst.y,
  }));
}

export function instanceTerminals(inst: Instance): PCellOut['terminals'] {
  const { w, l, nf } = inst.params;
  const t = inst.kind === 'nmos' || inst.kind === 'pmos' ? mosCell(inst.kind, w, l, nf).terminals : tapCell(inst.kind, w, l).terminals;
  const mv = (b?: Box) => (b ? { x0: b.x0 + inst.x, x1: b.x1 + inst.x, y0: b.y0 + inst.y, y1: b.y1 + inst.y } : undefined);
  return { g: mv(t.g), sd: t.sd.map((b) => mv(b)!), tap: mv(t.tap) };
}

/** Contact / via stack centred at (x, y): 'licon' (diff/tap/poly → li1), 'mcon' (li1 → met1), 'via' (met1 → met2). */
export function contactStack(kind: 'licon' | 'mcon' | 'via', x: number, y: number): { layer: LayerId; box: Box }[] {
  const sq = (s: number): Box => ({ x0: x - s / 2, x1: x + s / 2, y0: y - s / 2, y1: y + s / 2 });
  if (kind === 'licon') return [{ layer: 'licon', box: sq(170) }, { layer: 'li1', box: sq(170) }];
  if (kind === 'mcon') return [{ layer: 'li1', box: sq(170) }, { layer: 'mcon', box: sq(170) }, { layer: 'met1', box: sq(230) }];
  return [{ layer: 'met1', box: sq(260) }, { layer: 'via', box: sq(150) }, { layer: 'met2', box: sq(260) }];
}
