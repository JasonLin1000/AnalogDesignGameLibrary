// Layout extraction: nets (through contacts) and MOS devices (poly ∩ diffusion).
import { findGates, layerRects, type Gate } from './drc';
import { contains, covered, intersect, overlaps, subtract, touches } from './geom';
import type { Box, LayerId, Layout } from './types';

export interface ExDevice {
  id: string;
  type: 'nfet' | 'pfet';
  w: number; l: number;          // nm
  g: string; sd: [string, string]; b: string;
  gate: Gate;
}

export interface Extraction {
  devices: ExDevice[];
  nets: string[];                 // all net names
  labelsByNet: Map<string, string[]>; // net -> label texts on it
  netShapes: Map<string, { layer: LayerId; box: Box }[]>;
  /** label text -> nets it sits on (more than one = open) */
  netsByLabel: Map<string, string[]>;
  unplacedLabels: string[];       // labels not on any conductor
}

interface Node { layer: LayerId | 'sub'; box: Box }

export const SUB = 'sub';

export function extract(layout: Layout): Extraction {
  const L = layerRects(layout);
  const gates = findGates(L);
  const nodes: Node[] = [];
  const add = (layer: Node['layer'], box: Box) => { nodes.push({ layer, box }); return nodes.length - 1; };

  // conductors; diffusion is split by the gates into source/drain pieces
  const diffPieces = L.diff.flatMap((d) => subtract(d, gates));
  const idx: Record<string, number[]> = {};
  const reg = (layer: LayerId, bs: Box[]) => { idx[layer] = bs.map((b) => add(layer, b)); };
  reg('diff', diffPieces);
  for (const layer of ['tap', 'poly', 'li1', 'met1', 'met2', 'nwell'] as LayerId[]) reg(layer, L[layer]);
  const sub = add('sub', { x0: 0, y0: 0, x1: 0, y1: 0 });

  const parent = nodes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a: number, b: number) => { parent[find(a)] = find(b); };
  const same = (layer: LayerId) => {
    const ids = idx[layer];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (touches(nodes[ids[i]].box, nodes[ids[j]].box)) join(ids[i], ids[j]);
  };
  ['diff', 'tap', 'poly', 'li1', 'met1', 'met2', 'nwell'].forEach((l) => same(l as LayerId));
  // cuts join what they overlap on their lower and upper layers
  const cut = (cuts: Box[], lower: LayerId[], upper: LayerId) => {
    for (const c of cuts) {
      const hits = [...lower, upper].flatMap((layer) => idx[layer].filter((i) => overlaps(nodes[i].box, c)));
      for (let k = 1; k < hits.length; k++) join(hits[0], hits[k]);
    }
  };
  cut(L.licon, ['diff', 'tap', 'poly'], 'li1');
  cut(L.mcon, ['li1'], 'met1');
  cut(L.via, ['met1'], 'met2');
  // taps tie to the well they sit in, or to the substrate
  for (const t of idx.tap) {
    const well = idx.nwell.find((w) => overlaps(nodes[w].box, nodes[t].box));
    join(t, well ?? sub);
  }

  // net names from labels
  const labelOf = new Map<number, Set<string>>();
  const netsByLabel = new Map<string, Set<number>>();
  const unplacedLabels: string[] = [];
  for (const lb of layout.labels) {
    const ids = idx[lb.layer] ?? [];
    const hit = ids.find((i) => contains(nodes[i].box, lb))
      ?? (lb.layer === 'diff' ? undefined : undefined);
    if (hit === undefined) { unplacedLabels.push(lb.text); continue; }
    const root = find(hit);
    const name = lb.text.trim().toLowerCase();
    if (!labelOf.has(root)) labelOf.set(root, new Set());
    labelOf.get(root)!.add(name);
    if (!netsByLabel.has(name)) netsByLabel.set(name, new Set());
    netsByLabel.get(name)!.add(root);
  }
  const names = new Map<number, string>();
  const taken = new Set<string>();
  let k = 1;
  const nameOf = (i: number) => {
    const r = find(i);
    if (!names.has(r)) {
      const lbs = [...(labelOf.get(r) ?? [])].sort();
      let nm = lbs[0] ?? (r === find(sub) ? SUB : `n${k++}`);
      // the same label on two disconnected pieces (an open): keep the pieces apart
      for (let s = 2; taken.has(nm); s++) nm = `${lbs[0]}#${s}`;
      taken.add(nm);
      names.set(r, nm);
    }
    return names.get(r)!;
  };

  const devices: ExDevice[] = [];
  gates.forEach((g, i) => {
    const pfet = L.nwell.some((w) => overlaps(w, g)) && covered(g, L.nwell);
    const polyId = idx.poly.find((p) => overlaps(nodes[p].box, g));
    // neighbouring source/drain pieces on the two sides of the channel
    const side = (b: Box) => idx.diff.find((d) => intersect(nodes[d].box, b) || touchesEdge(nodes[d].box, b));
    const [sa, sb] = g.vertical
      ? [side({ x0: g.x0 - 5, x1: g.x0, y0: g.y0, y1: g.y1 }), side({ x0: g.x1, x1: g.x1 + 5, y0: g.y0, y1: g.y1 })]
      : [side({ y0: g.y0 - 5, y1: g.y0, x0: g.x0, x1: g.x1 }), side({ y0: g.y1, y1: g.y1 + 5, x0: g.x0, x1: g.x1 })];
    const well = idx.nwell.find((w) => overlaps(nodes[w].box, g));
    devices.push({
      id: `D${i + 1}`, type: pfet ? 'pfet' : 'nfet',
      w: g.vertical ? g.y1 - g.y0 : g.x1 - g.x0,
      l: g.vertical ? g.x1 - g.x0 : g.y1 - g.y0,
      g: polyId !== undefined ? nameOf(polyId) : '?',
      sd: [sa !== undefined ? nameOf(sa) : '?', sb !== undefined ? nameOf(sb) : '?'],
      b: pfet && well !== undefined ? nameOf(well) : nameOf(sub),
      gate: g,
    });
  });

  // collect nets for display
  const netShapes = new Map<string, { layer: LayerId; box: Box }[]>();
  nodes.forEach((n, i) => {
    if (n.layer === 'sub') return;
    const nm = nameOf(i);
    if (!netShapes.has(nm)) netShapes.set(nm, []);
    netShapes.get(nm)!.push({ layer: n.layer, box: n.box });
  });
  const labelsByNet = new Map<string, string[]>();
  for (const [root, set] of labelOf) labelsByNet.set(nameOf(root), [...set].sort());
  const nbl = new Map<string, string[]>();
  for (const [name, roots] of netsByLabel) nbl.set(name, [...roots].map((r) => nameOf(r)));
  return { devices, nets: [...new Set([...netShapes.keys(), ...devices.map((d) => d.b)])], labelsByNet, netShapes, netsByLabel: nbl, unplacedLabels };
}

const touchesEdge = (a: Box, b: Box) => touches(a, b);
