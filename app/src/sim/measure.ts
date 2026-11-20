// Measurements evaluated in TypeScript on simulation results (bilingual-friendly, testable).
import { isMos } from '../schematic/parts';
import type { Analysis, Circuit, PartKind } from '../schematic/types';
import { parseSpice } from '../schematic/units';
import type { Plot } from './raw';

export interface SimResult {
  analyses: Analysis[];
  plots: (Plot | null)[];
  circuit: Circuit;
  opVectors: Record<string, Record<string, string>>;
  /** names of parts the player added (for part counting) */
  playerParts: string[];
}

export type MosParam = 'id' | 'gm' | 'gds' | 'vth' | 'vdsat' | 'vgs' | 'vds';

export type Measure =
  | { kind: 'op_v'; node: string }
  | { kind: 'op_vdiff'; pos: string; neg: string }
  | { kind: 'op_i'; part?: string; partKind?: PartKind }   // current through a part (sources: delivered current)
  | { kind: 'supply_power'; source: string }
  | { kind: 'mos_param'; part?: string; partKind?: PartKind; param: MosParam }
  | { kind: 'mos_region'; part?: string; partKind?: PartKind } // 0 off, 1 triode, 2 saturation
  | { kind: 'ac_gain_db'; node: string; freq: number }
  | { kind: 'ac_f3db'; node: string }
  | { kind: 'ac_ugb'; node: string }
  | { kind: 'ac_pm'; node: string }
  | { kind: 'tran_v'; node: string; t: number }
  | { kind: 'tran_cross'; node: string; level: number; edge?: 'rise' | 'fall' }
  | { kind: 'dc_v'; node: string; at: number }
  | { kind: 'part_count'; partKind?: PartKind }
  | { kind: 'param_sum'; partKind: PartKind; key: string };

// ---------- helpers ----------
export function plotFor(res: SimResult, kind: Analysis['kind']): Plot | null {
  const i = res.analyses.findIndex((a) => a.kind === kind);
  return i >= 0 ? res.plots[i] : null;
}

export function xVector(p: Plot): Float64Array {
  return p.vectors[0].re; // first vector is the scale (frequency/time/sweep)
}

export function nodeRe(p: Plot, node: string): Float64Array {
  const n = node.toLowerCase();
  if (n === '0' || n === 'gnd') return new Float64Array(p.points);
  const v = p.byName.get(n);
  if (!v) throw new MeasureError('noNode', { node });
  return v.re;
}

export function nodeMag(p: Plot, node: string): number[] {
  const n = node.toLowerCase();
  const v = p.byName.get(n);
  if (!v) throw new MeasureError('noNode', { node });
  return Array.from(v.re, (re, i) => Math.hypot(re, v.im ? v.im[i] : 0));
}

export const toDb = (m: number[]) => m.map((x) => 20 * Math.log10(Math.max(x, 1e-30)));

export function nodePhaseDeg(p: Plot, node: string): number[] {
  const v = p.byName.get(node.toLowerCase());
  if (!v) throw new MeasureError('noNode', { node });
  const out: number[] = [];
  let prev = 0, offset = 0;
  for (let i = 0; i < p.points; i++) {
    let ph = (Math.atan2(v.im ? v.im[i] : 0, v.re[i]) * 180) / Math.PI;
    if (i > 0) {
      while (ph + offset - prev > 180) offset -= 360;
      while (ph + offset - prev < -180) offset += 360;
    }
    prev = ph + offset;
    out.push(prev);
  }
  return out;
}

export function interp(xs: ArrayLike<number>, ys: ArrayLike<number>, x: number, logx = false): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  for (let i = 1; i < n; i++) {
    if (xs[i] >= x) {
      const a = logx ? Math.log10(xs[i - 1]) : xs[i - 1];
      const b = logx ? Math.log10(xs[i]) : xs[i];
      const t = ((logx ? Math.log10(x) : x) - a) / (b - a);
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[n - 1];
}

/** First x where y crosses `level` (linear interpolation). */
export function crossing(xs: ArrayLike<number>, ys: ArrayLike<number>, level: number, edge: 'rise' | 'fall' | 'any' = 'any', logx = false): number {
  for (let i = 1; i < xs.length; i++) {
    const a = ys[i - 1] - level, b = ys[i] - level;
    const rise = a < 0 && b >= 0, fall = a > 0 && b <= 0;
    if ((edge === 'rise' && rise) || (edge === 'fall' && fall) || (edge === 'any' && (rise || fall))) {
      const t = a / (a - b);
      if (logx) return 10 ** (Math.log10(xs[i - 1]) + t * (Math.log10(xs[i]) - Math.log10(xs[i - 1])));
      return xs[i - 1] + t * (xs[i] - xs[i - 1]);
    }
  }
  return NaN;
}

export class MeasureError extends Error {
  constructor(public code: string, public vars: Record<string, string> = {}) { super(code); }
}

function pickPart(res: SimResult, part?: string, partKind?: PartKind) {
  const p = part
    ? res.circuit.parts.find((q) => q.name.toUpperCase() === part.toUpperCase())
    : res.circuit.parts.find((q) => q.kind === partKind && res.playerParts.includes(q.name))
      ?? res.circuit.parts.find((q) => q.kind === partKind);
  if (!p) throw new MeasureError('noPart', { part: part ?? partKind ?? '?' });
  return p;
}

function opVec(res: SimResult, name: string): number {
  const op = plotFor(res, 'op');
  if (!op) throw new MeasureError('noAnalysis', { analysis: 'op' });
  const v = op.byName.get(name.toLowerCase());
  if (!v) throw new MeasureError('noVector', { name });
  return v.re[0];
}

export function partCurrent(res: SimResult, partName: string): number {
  const p = pickPart(res, partName);
  const vecs = res.opVectors[p.name];
  if (!vecs) throw new MeasureError('noCurrent', { part: partName });
  if (p.kind === 'V') return -opVec(res, vecs.i);           // delivered current
  if (isMos(p.kind)) return Math.abs(opVec(res, vecs.id));
  return opVec(res, vecs.i);
}

export function mosParam(res: SimResult, partName: string, param: MosParam): number {
  const p = pickPart(res, partName);
  return opVec(res, res.opVectors[p.name][param]);
}

/** 0 = cutoff, 1 = triode, 2 = saturation (uses magnitudes so it works for P-channel). */
export function mosRegion(res: SimResult, partName: string): number {
  const vgs = Math.abs(mosParam(res, partName, 'vgs'));
  const vth = Math.abs(mosParam(res, partName, 'vth'));
  const vds = Math.abs(mosParam(res, partName, 'vds'));
  const vdsat = Math.abs(mosParam(res, partName, 'vdsat'));
  if (vgs < vth - 0.02) return 0;
  return vds < vdsat ? 1 : 2;
}

// ---------- measure evaluation ----------
export function evaluate(m: Measure, res: SimResult): number {
  switch (m.kind) {
    case 'op_v': return opVec(res, m.node === '0' ? '0' : m.node);
    case 'op_vdiff': return (m.pos === '0' ? 0 : opVec(res, m.pos)) - (m.neg === '0' ? 0 : opVec(res, m.neg));
    case 'op_i': return partCurrent(res, pickPart(res, m.part, m.partKind).name);
    case 'supply_power': {
      const p = pickPart(res, m.source);
      return partCurrent(res, p.name) * (opVec(res, p.nets.p === '0' ? '0' : p.nets.p) - (p.nets.n === '0' ? 0 : opVec(res, p.nets.n)));
    }
    case 'mos_param': {
      const v = mosParam(res, pickPart(res, m.part, m.partKind).name, m.param);
      return m.param === 'gm' || m.param === 'gds' ? v : Math.abs(v);
    }
    case 'mos_region': return mosRegion(res, pickPart(res, m.part, m.partKind).name);
    case 'ac_gain_db': {
      const p = need(plotFor(res, 'ac'), 'ac');
      return interp(xVector(p), toDb(nodeMag(p, m.node)), m.freq, true);
    }
    case 'ac_f3db': {
      const p = need(plotFor(res, 'ac'), 'ac');
      const db = toDb(nodeMag(p, m.node));
      return crossing(xVector(p), db, db[0] - 3.0103, 'fall', true);
    }
    case 'ac_ugb': {
      const p = need(plotFor(res, 'ac'), 'ac');
      return crossing(xVector(p), toDb(nodeMag(p, m.node)), 0, 'fall', true);
    }
    case 'ac_pm': {
      const p = need(plotFor(res, 'ac'), 'ac');
      const f = xVector(p);
      const ugb = crossing(f, toDb(nodeMag(p, m.node)), 0, 'fall', true);
      const ph = nodePhaseDeg(p, m.node);
      // phase margin relative to the low-frequency phase (works for inverting/non-inverting)
      return 180 - Math.abs(interp(f, ph, ugb, true) - ph[0]);
    }
    case 'tran_v': {
      const p = need(plotFor(res, 'tran'), 'tran');
      return interp(xVector(p), nodeRe(p, m.node), m.t);
    }
    case 'tran_cross': {
      const p = need(plotFor(res, 'tran'), 'tran');
      return crossing(xVector(p), nodeRe(p, m.node), m.level, m.edge ?? 'rise');
    }
    case 'dc_v': {
      const p = need(plotFor(res, 'dc'), 'dc');
      return interp(xVector(p), nodeRe(p, m.node), m.at);
    }
    case 'part_count':
      return res.circuit.parts.filter((p) => res.playerParts.includes(p.name) && (!m.partKind || p.kind === m.partKind)).length;
    case 'param_sum':
      return res.circuit.parts
        .filter((p) => p.kind === m.partKind && res.playerParts.includes(p.name))
        .reduce((s, p) => s + parseSpice(p.params[m.key]), 0);
  }
}

function need(p: Plot | null, analysis: string): Plot {
  if (!p) throw new MeasureError('noAnalysis', { analysis });
  return p;
}

