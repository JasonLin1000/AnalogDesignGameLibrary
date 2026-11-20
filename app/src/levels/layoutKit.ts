// Programmatic layout builder for reference solutions: a row of unit transistors (PCells)
// with one met1 track per source/drain net inside the diffusion, met1/met2 gate routing,
// diode connections on met2, optional body tap, extra well margin and long pin stubs.
import { contactStack, instanceTerminals, mosCell } from '../layout/pcell';
import type { Box, Instance, LayerId, Layout, LLabel, Shape } from '../layout/types';

let seq = 0;
const sh = (layer: LayerId, b: Box): Shape => ({ id: `k${seq++}`, layer, ...b });
const stack = (k: 'licon' | 'mcon' | 'via', x: number, y: number) => contactStack(k, x, y).map((p) => sh(p.layer, p.box));
const r5 = (v: number) => Math.round(v / 5) * 5;

export interface Unit { dev: string; g: string; s: string; d: string; flip?: boolean }
export interface RowOptions {
  type: 'nmos' | 'pmos';
  wf: number; l: number;               // nm per unit
  units: Unit[];
  labels: string[];                    // nets that get a pin label
  tap?: string;                        // body tap net (ptap for nmos, ntap for pmos)
  wellMargin?: number;                 // pmos: extra N-well around the row (nm)
  stubs?: Record<string, { x: number; width?: number }>; // extend a source/drain net's track to x (nm), label there
  trackLayer?: Record<string, 'met1' | 'li1'>;          // route a track on li1 instead of met1 (adjacent strips only)
}

export function rowLayout(o: RowOptions): Layout {
  const cellW = mosCell(o.type, o.wf, o.l, 1).shapes.find((s) => s.layer === 'diff')!.box.x1;
  const pitch = Math.ceil((cellW + 270) / 50) * 50;
  const instances: Instance[] = o.units.map((u, i) => ({ id: `ki${seq++}`, kind: o.type, name: u.dev + i, x: i * pitch, y: 0, params: { w: o.wf, l: o.l, nf: 1 } }));
  const shapes: Shape[] = [];
  const labels: LLabel[] = [];
  const lab = (layer: LayerId, text: string, x: number, y: number) => { if (o.labels.includes(text) && !labels.some((l) => l.text === text)) labels.push({ id: `kl${seq++}`, layer, text, x, y }); };

  // source/drain strips and their nets
  const strips: { x: number; net: string; strip: Box }[] = [];
  let gy = 0;
  const gates: { x: number; y: number; net: string }[] = [];
  instances.forEach((inst, i) => {
    const t = instanceTerminals(inst), u = o.units[i];
    const [left, right] = u.flip ? [u.d, u.s] : [u.s, u.d];
    strips.push({ x: (t.sd[0].x0 + t.sd[0].x1) / 2, net: left, strip: t.sd[0] });
    strips.push({ x: (t.sd[1].x0 + t.sd[1].x1) / 2, net: right, strip: t.sd[1] });
    gy = (t.g!.y0 + t.g!.y1) / 2;
    gates.push({ x: (t.g!.x0 + t.g!.x1) / 2, y: gy, net: u.g });
  });
  const sdNets = [...new Set(strips.map((s) => s.net))];
  const trackY: Record<string, number> = {};
  sdNets.forEach((n, k) => { trackY[n] = r5((o.wf * (k + 1)) / (sdNets.length + 1)); });

  for (const net of sdNets) {
    const ss = strips.filter((s) => s.net === net);
    const y = trackY[net];
    const x0 = Math.min(...ss.map((s) => s.x)), x1 = Math.max(...ss.map((s) => s.x));
    if (o.trackLayer?.[net] === 'li1') {
      shapes.push(sh('li1', { x0: x0 - 85, x1: x1 + 85, y0: y - 85, y1: y + 85 }));
      lab('li1', net, x0, y);
      continue;
    }
    for (const s of ss) shapes.push(...stack('mcon', s.x, y));
    shapes.push(sh('met1', { x0: x0 - 115, x1: x1 + 115, y0: y - 115, y1: y + 115 }));
    const stub = o.stubs?.[net];
    if (stub) {
      const w = stub.width ?? 230;
      shapes.push(sh('met1', stub.x < x0 ? { x0: stub.x - 115, x1: x0, y0: y - w / 2, y1: y + w / 2 } : { x0: x1, x1: stub.x + 115, y0: y - w / 2, y1: y + w / 2 }));
      lab('met1', net, stub.x, y);
    } else lab('met1', net, x0, y);
  }

  // gates: met1 between pads unless another net's pad lies inside the span (then met2)
  const gNets = [...new Set(gates.map((g) => g.net))];
  for (const g of gates) shapes.push(...stack('mcon', g.x, g.y));
  for (const net of gNets) {
    const own = gates.filter((g) => g.net === net);
    const gx0 = Math.min(...own.map((g) => g.x)), gx1 = Math.max(...own.map((g) => g.x));
    const blocked = gates.some((g) => g.net !== net && g.x > gx0 && g.x < gx1);
    // diode connection: the same net on a source/drain strip joins up on met2
    const diode = strips.find((s) => s.net === net);
    let x0 = gx0, x1 = gx1;
    if (diode && !blocked) { x0 = Math.min(x0, diode.x); x1 = Math.max(x1, diode.x); }
    if (blocked) {
      for (const g of own) shapes.push(...stack('via', g.x, g.y));
      shapes.push(sh('met2', { x0: x0 - 130, x1: x1 + 130, y0: gy - 130, y1: gy + 130 }));
      lab('met2', net, x0, gy);
    } else {
      shapes.push(sh('met1', { x0: x0 - 115, x1: x1 + 115, y0: gy - 115, y1: gy + 115 }));
      lab('met1', net, x0, gy);
    }
    if (diode) {
      const y = trackY[net];
      shapes.push(...stack('via', diode.x, y), ...stack('via', diode.x, gy));
      shapes.push(sh('met2', { x0: diode.x - 130, x1: diode.x + 130, y0: y - 130, y1: gy + 130 }));
    }
  }

  // body tap to the left, joined to its net's track
  if (o.tap) {
    const kind = o.type === 'nmos' ? 'ptap' : 'ntap';
    const y = trackY[o.tap] ?? r5(o.wf / 2);
    const tap: Instance = { id: `kt${seq++}`, kind, name: 'T1', x: -950, y: y - 200, params: { w: 600, l: 400, nf: 1 } };
    instances.push(tap);
    shapes.push(...stack('mcon', -650, y));
    const first = Math.min(...strips.filter((s) => s.net === o.tap).map((s) => s.x));
    shapes.push(sh('met1', { x0: -765, x1: first, y0: y - 115, y1: y + 115 }));
  }
  if (o.type === 'pmos' && o.wellMargin) {
    const m = o.wellMargin;
    shapes.push(sh('nwell', { x0: -1130 - m, x1: (instances.length - (o.tap ? 1 : 0) - 1) * pitch + cellW + m, y0: -m, y1: gy + 300 + m }));
  }
  return { shapes, labels, instances };
}
