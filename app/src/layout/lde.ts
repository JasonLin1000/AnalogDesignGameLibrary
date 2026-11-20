// Layout-dependent effects, expressed as a threshold-voltage shift per transistor gate.
//  - process gradient: ΔVth = gx·x + gy·y (mV/µm, gate centre in µm)
//  - well-proximity effect (WPE): ions scattered off the N-well mask edge raise Vth near the edge,
//    ΔVth = A·exp(−d / d0) with d the distance from the gate to the nearest N-well edge.
import { layerRects } from './drc';
import { covered, expand } from './geom';
import type { ExDevice } from './extract';
import type { Box, Layout } from './types';

export interface LdeModel { gx?: number; gy?: number; wpe?: boolean }

export const WPE = { pfet: 25, nfet: 12, d0: 0.6 }; // mV, mV, µm

export interface LdeShift { gradient: number; wpe: number; total: number } // volts

/** Distance (nm) from a gate to the nearest N-well edge: inside a well for PFETs, outside for NFETs. */
function wellEdgeDistance(g: Box, wells: Box[], inside: boolean): number {
  if (inside) {
    // distance to the edge of the merged well: grow the gate until it is no longer covered
    if (!covered(g, wells)) return 0;
    let lo = 0, hi = 5000;
    if (covered(expand(g, hi), wells)) return Infinity;
    while (hi - lo > 10) { const m = (lo + hi) / 2; if (covered(expand(g, m), wells)) lo = m; else hi = m; }
    return lo;
  }
  let best = Infinity;
  for (const w of wells) {
    const dx = Math.max(0, w.x0 - g.x1, g.x0 - w.x1), dy = Math.max(0, w.y0 - g.y1, g.y0 - w.y1);
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

export function ldeShifts(layout: Layout, devices: ExDevice[], m: LdeModel | undefined): Record<string, LdeShift> {
  const out: Record<string, LdeShift> = {};
  const wells = layerRects(layout).nwell;
  for (const d of devices) {
    const cx = (d.gate.x0 + d.gate.x1) / 2000, cy = (d.gate.y0 + d.gate.y1) / 2000; // µm
    const gradient = ((m?.gx ?? 0) * cx + (m?.gy ?? 0) * cy) / 1000;
    let wpe = 0;
    if (m?.wpe) {
      const dist = wellEdgeDistance(d.gate, wells, d.type === 'pfet') / 1000;
      if (Number.isFinite(dist)) wpe = ((d.type === 'pfet' ? WPE.pfet : WPE.nfet) * Math.exp(-dist / WPE.d0)) / 1000;
    }
    out[d.id] = { gradient, wpe, total: gradient + wpe };
  }
  return out;
}

/** W-weighted mean shift of the layout devices that implement one schematic device. */
export function deviceShift(ids: string[], devices: ExDevice[], shifts: Record<string, LdeShift>): number {
  let sw = 0, s = 0;
  for (const id of ids) {
    const d = devices.find((q) => q.id === id);
    if (!d || !shifts[id]) continue;
    sw += d.w; s += d.w * shifts[id].total;
  }
  return sw ? s / sw : NaN;
}
