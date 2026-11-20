// Parasitic extraction: every conductor rectangle becomes an RC node.
// Sheet / contact resistance and area / fringe / coupling capacitance use approximate SKY130 values.
import type { LogicalPart } from '../schematic/types';
import { findGates, layerRects } from './drc';
import { extract, SUB, type Extraction } from './extract';
import { contains, intersect, overlaps, subtract, touches } from './geom';
import type { Box, LayerId, Layout } from './types';

export const PEX = {
  rs: { poly: 48.2, li1: 12.8, met1: 0.125, met2: 0.125 } as Record<string, number>,     // Ω/□
  rcut: { licon: 15, mcon: 9.3, via: 4.5 } as Record<string, number>,                     // Ω per cut
  ca: { poly: 0.106, li1: 0.037, met1: 0.0258, met2: 0.0175 } as Record<string, number>,  // fF/µm²
  cf: { poly: 0.055, li1: 0.04, met1: 0.04, met2: 0.037 } as Record<string, number>,      // fF/µm of perimeter
  cc: { poly: 0.005, li1: 0.0085, met1: 0.0065, met2: 0.0065 } as Record<string, number>, // fF·µm/µm (× length / spacing)
  ccRange: 1000, // nm: coupling considered below this spacing
  seg: 1000,     // nm: maximum wire segment length (distributed RC)
};

export interface PexResult {
  parts: LogicalPart[];               // R, C and MOS devices (SKY130) of the extracted layout
  deviceNames: Record<string, string>; // layout device id -> SPICE part name
  stats: { nodes: number; resistors: number; capacitors: number; totalC: Record<string, number> }; // fF per net
  ex: Extraction;
}

interface RNode { id: number; layer: LayerId; box: Box; net: string }

const um = (n: number) => n / 1000;
const sq = (b: Box) => { const w = um(b.x1 - b.x0), h = um(b.y1 - b.y0); return { long: Math.max(w, h), short: Math.max(1e-3, Math.min(w, h)), w, h }; };
const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9_]/g, '_');

/** SPICE node for a net name: 'gnd' and the substrate are ground. */
export const netNode = (n: string) => (n === 'gnd' || n === SUB || n === '0' ? '0' : sanitize(n));

export function pex(layout: Layout): PexResult {
  const ex = extract(layout);
  const L = layerRects(layout);
  const gates = findGates(L);
  const netOf = (layer: LayerId, b: Box) => {
    for (const [net, shapes] of ex.netShapes) if (shapes.some((s) => s.layer === layer && s.box.x0 === b.x0 && s.box.y0 === b.y0 && s.box.x1 === b.x1 && s.box.y1 === b.y1)) return net;
    return '?';
  };

  const nodes: RNode[] = [];
  const add = (layer: LayerId, box: Box, net = netOf(layer, box)) => { const n: RNode = { id: nodes.length, layer, box, net }; nodes.push(n); return n; };
  const diffPieces = L.diff.flatMap((d) => subtract(d, gates)).map((b) => add('diff', b));
  const byLayer: Record<string, RNode[]> = { diff: diffPieces, tap: L.tap.map((b) => add('tap', b)) };
  // wires are split into ≤ SEG segments along their length (distributed RC): contacts and pins then
  // attach to the segment they actually touch instead of shorting the whole wire
  for (const layer of ['poly', 'li1', 'met1', 'met2'] as LayerId[]) {
    byLayer[layer] = L[layer].flatMap((b) => {
      const net = netOf(layer, b);
      const horiz = b.x1 - b.x0 >= b.y1 - b.y0;
      const len = horiz ? b.x1 - b.x0 : b.y1 - b.y0;
      const k = Math.max(1, Math.ceil(len / PEX.seg));
      return Array.from({ length: k }, (_, i) => {
        const a = Math.round((len * i) / k / 5) * 5, z = i === k - 1 ? len : Math.round((len * (i + 1)) / k / 5) * 5;
        return add(layer, horiz ? { x0: b.x0 + a, x1: b.x0 + z, y0: b.y0, y1: b.y1 } : { y0: b.y0 + a, y1: b.y0 + z, x0: b.x0, x1: b.x1 }, net);
      });
    });
  }

  const name = (n: RNode) => `x${n.id}`;
  const parts: LogicalPart[] = [];
  let rc = 0, cc = 0;
  const R = (a: string, b: string, ohm: number) => {
    if (a === b) return;
    parts.push({ kind: 'R', name: `RP${++rc}`, params: { value: Math.max(ohm, 1e-3).toPrecision(4) }, nets: { p: a, n: b } });
  };
  const Cap = (a: string, b: string, fF: number) => {
    if (fF < 1e-4 || a === b) return;
    parts.push({ kind: 'C', name: `CP${++cc}`, params: { value: `${fF.toPrecision(4)}f` }, nets: { p: a, n: b } });
  };

  // same-layer resistance between touching rectangles (half-length of each, along its long side)
  for (const layer of ['poly', 'li1', 'met1', 'met2']) {
    const ns = byLayer[layer];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      if (!touches(ns[i].box, ns[j].box)) continue;
      // current flows along the line joining the two centres: each piece contributes
      // half its length in that direction over its width across it
      const A = ns[i].box, B = ns[j].box;
      const flowX = Math.abs((A.x0 + A.x1) - (B.x0 + B.x1)) >= Math.abs((A.y0 + A.y1) - (B.y0 + B.y1));
      const half = (b: Box) => {
        const w = um(b.x1 - b.x0), h = um(b.y1 - b.y0);
        return flowX ? w / (2 * Math.max(h, 1e-3)) : h / (2 * Math.max(w, 1e-3));
      };
      R(name(ns[i]), name(ns[j]), PEX.rs[layer] * (half(A) + half(B)));
    }
  }
  // diffusion pieces of one net that touch are shorted (heavily doped, contacted)
  const cut = (cuts: Box[], lower: string[], upper: string, ohm: number) => {
    for (const c of cuts) {
      const lo = lower.flatMap((l) => byLayer[l]).filter((n) => overlaps(n.box, c));
      const up = byLayer[upper].filter((n) => overlaps(n.box, c));
      for (const a of lo) for (const b of up) R(name(a), name(b), ohm);
    }
  };
  cut(L.licon, ['diff', 'tap', 'poly'], 'li1', PEX.rcut.licon);
  cut(L.mcon, ['li1'], 'met1', PEX.rcut.mcon);
  cut(L.via, ['met1'], 'met2', PEX.rcut.via);

  // taps tie to their body net node
  for (const t of byLayer.tap) R(name(t), netNode(t.net), 0.1);

  // capacitance to substrate (ground)
  const totalC: Record<string, number> = {};
  for (const layer of ['poly', 'li1', 'met1', 'met2']) for (const n of byLayer[layer]) {
    const s = sq(n.box);
    const c = PEX.ca[layer] * s.w * s.h + PEX.cf[layer] * 2 * (s.w + s.h);
    Cap(name(n), '0', c);
    totalC[n.net] = (totalC[n.net] ?? 0) + c;
  }
  // lateral coupling between parallel neighbours of different nets on the same layer
  for (const layer of ['poly', 'li1', 'met1', 'met2']) {
    const ns = byLayer[layer];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const a = ns[i].box, b = ns[j].box;
      if (ns[i].net === ns[j].net) continue;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      let len = 0, gap = 0;
      if (ox > 0 && oy <= 0) { len = ox; gap = -oy; } else if (oy > 0 && ox <= 0) { len = oy; gap = -ox; }
      if (len > 0 && gap > 0 && gap < PEX.ccRange) {
        const c = (PEX.cc[layer] * um(len)) / um(gap);
        Cap(name(ns[i]), name(ns[j]), c);
        totalC[ns[i].net] = (totalC[ns[i].net] ?? 0) + c;
        totalC[ns[j].net] = (totalC[ns[j].net] ?? 0) + c;
      }
    }
  }

  // pins: a labelled rectangle connects (1 mΩ) to the node named after the label
  for (const lb of layout.labels) {
    const n = (byLayer[lb.layer] ?? []).find((q) => contains(q.box, lb));
    if (n) R(name(n), netNode(lb.text.trim()), 1e-3);
  }

  // devices: one SPICE MOS per gate, terminals on the actual diffusion / poly nodes
  const deviceNames: Record<string, string> = {};
  ex.devices.forEach((d, i) => {
    const g = d.gate;
    const side = (b: Box) => diffPieces.find((p) => intersect(p.box, b) || touches(p.box, b));
    const [sa, sb] = g.vertical
      ? [side({ x0: g.x0 - 5, x1: g.x0, y0: g.y0, y1: g.y1 }), side({ x0: g.x1, x1: g.x1 + 5, y0: g.y0, y1: g.y1 })]
      : [side({ y0: g.y0 - 5, y1: g.y0, x0: g.x0, x1: g.x1 }), side({ y0: g.y1, y1: g.y1 + 5, x0: g.x0, x1: g.x1 })];
    const poly = byLayer.poly.find((p) => overlaps(p.box, g));
    if (!sa || !sb || !poly) return;
    const nm = `M${i + 1}`;
    deviceNames[d.id] = nm;
    parts.push({
      kind: d.type === 'nfet' ? 'NFET' : 'PFET', name: nm,
      params: { w: `${um(d.w)}u`, l: `${um(d.l)}u`, nf: '1' },
      nets: { d: name(sa), g: name(poly), s: name(sb), b: netNode(d.b) },
    });
  });

  // every node gets a 1 TΩ path to ground so floating metal never makes the matrix singular
  for (const n of nodes) parts.push({ kind: 'R', name: `RL${n.id}`, params: { value: '1e12' }, nets: { p: name(n), n: '0' } });

  return { parts, deviceNames, ex, stats: { nodes: nodes.length, resistors: rc, capacitors: cc, totalC } };
}
