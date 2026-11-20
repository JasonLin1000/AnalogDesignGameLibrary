// Grade a layout level: DRC, extraction + LVS, area / pins / matching checks (instant),
// then post-layout simulation (PEX + LDE) and Monte Carlo yield (asynchronous).
import type { Simulator } from '../game/runs';
import type { LayoutLevel, LayoutSpec } from '../levels/types';
import { buildDeck } from '../schematic/netlist';
import type { Analysis, Circuit, LogicalPart } from '../schematic/types';
import { evaluate, MeasureError, type SimResult } from '../sim/measure';
import { sampleMismatch } from '../sim/mismatch';
import { runDrc, type Violation } from './drc';
import { extract, type Extraction } from './extract';
import { flatten } from './flatten';
import { bbox } from './geom';
import { deviceShift, ldeShifts, type LdeShift } from './lde';
import { lvs, type LvsResult } from './lvs';
import { netNode, pex, type PexResult } from './pex';
import type { Layout } from './types';

export interface LSpecResult { spec: LayoutSpec; pass: boolean; value?: number; pre?: number; values?: number[] }
export interface PostSim { pre: SimResult | null; post: SimResult | null; mc: (SimResult | null)[]; pex: PexResult; error?: string }
export interface LayoutCheck {
  violations: Violation[];
  ex: Extraction;
  lvs: LvsResult;
  area: number;   // µm², bounding box of all drawn shapes
  shifts: Record<string, LdeShift>;
  post?: PostSim;
  main: LSpecResult[];
  bonus: LSpecResult[][];
  stars: number;
}

export function layoutArea(l: Layout): number {
  const b = bbox(flatten(l));
  return b ? ((b.x1 - b.x0) / 1000) * ((b.y1 - b.y0) / 1000) : 0;
}

export const needsSim = (level: LayoutLevel) =>
  [...level.specs, ...(level.stars ?? []).flat()].some((s) => s.kind === 'post' || s.kind === 'yield');

const renet = (p: LogicalPart): LogicalPart => ({ ...p, nets: Object.fromEntries(Object.entries(p.nets).map(([k, v]) => [k, netNode(v)])) });

/** Pre-layout circuit: the schematic devices plus the test bench. */
export function preCircuit(level: LayoutLevel): Circuit {
  return { parts: [...(level.bench?.parts ?? []), ...level.reference.parts].map(renet) };
}
/** Post-layout circuit: the extracted RC network and devices plus the test bench. */
export function postCircuit(level: LayoutLevel, p: PexResult): Circuit {
  return { parts: [...(level.bench?.parts ?? []).map(renet), ...p.parts] };
}

async function simOne(c: Circuit, analyses: Analysis[], sim: Simulator, dvth?: Record<string, number>): Promise<SimResult | null> {
  const deck = buildDeck(c, analyses, { dvth });
  const run = await sim(deck, 'tt');
  return run.ok ? { analyses, plots: run.plots, circuit: c, opVectors: deck.opVectors, playerParts: [] } : null;
}

function measureOf(s: LayoutSpec, r: SimResult | null): number {
  if (!r || !s.measure) return NaN;
  try { return evaluate(s.measure, r); } catch (e) { if (e instanceof MeasureError) return NaN; throw e; }
}
const inRange = (s: LayoutSpec, v: number) => Number.isFinite(v) && (s.min === undefined || v >= s.min) && (s.max === undefined || v <= s.max);

function grade(level: LayoutLevel, doc: Layout, base: Omit<LayoutCheck, 'main' | 'bonus' | 'stars'>): LayoutCheck {
  const { violations, lvs: lv, area, ex, shifts, post } = base;
  const one = (s: LayoutSpec): LSpecResult => {
    switch (s.kind) {
      case 'drc': return { spec: s, pass: violations.length === 0, value: violations.length };
      case 'lvs': return { spec: s, pass: lv.ok };
      case 'area': return { spec: s, pass: area > 0 && area <= (s.max ?? Infinity), value: area };
      case 'pins': {
        const wrong = level.ports.filter((p) => !doc.labels.some((l) => l.text.trim().toLowerCase() === p.toLowerCase() && l.layer === s.layer));
        return { spec: s, pass: wrong.length === 0, value: wrong.length };
      }
      case 'pinRegion': {
        const r = s.region ?? {};
        const ok = doc.labels.some((l) => l.text.trim().toLowerCase() === s.pin?.toLowerCase()
          && (r.x0 === undefined || l.x / 1000 >= r.x0) && (r.x1 === undefined || l.x / 1000 <= r.x1)
          && (r.y0 === undefined || l.y / 1000 >= r.y0) && (r.y1 === undefined || l.y / 1000 <= r.y1));
        return { spec: s, pass: ok };
      }
      case 'mismatch': {
        if (!lv.ok || !s.devices) return { spec: s, pass: false };
        const [a, b] = s.devices.map((n) => deviceShift(lv.deviceMap[n] ?? [], ex.devices, shifts));
        const v = Math.abs(a - b) * 1000;
        return { spec: s, pass: Number.isFinite(v) && v <= (s.max ?? Infinity), value: v };
      }
      case 'ldeAbs': {
        if (!lv.ok || !s.devices) return { spec: s, pass: false };
        const v = Math.max(...s.devices.map((n) => Math.abs(deviceShift(lv.deviceMap[n] ?? [], ex.devices, shifts)) * 1000));
        return { spec: s, pass: Number.isFinite(v) && v <= (s.max ?? Infinity), value: v };
      }
      case 'post': {
        const v = measureOf(s, post?.post ?? null);
        return { spec: s, pass: inRange(s, v), value: v, pre: measureOf(s, post?.pre ?? null) };
      }
      case 'yield': {
        const vals = (post?.mc ?? []).map((r) => measureOf(s, r));
        const y = vals.length ? vals.filter((v) => inRange(s, v)).length / vals.length : NaN;
        return { spec: s, pass: Number.isFinite(y) && y >= (s.minYield ?? 1), value: y, values: vals };
      }
    }
  };
  const main = level.specs.map(one);
  const bonus = (level.stars ?? []).map((tier) => tier.map(one));
  let stars = 0;
  if (main.every((r) => r.pass)) {
    stars = 1;
    for (const tier of bonus) { if (tier.every((r) => r.pass)) stars++; else break; }
  }
  return { ...base, main, bonus, stars };
}

/** Instant checks only (no simulation). */
export function checkLayout(level: LayoutLevel, doc: Layout): LayoutCheck {
  const violations = runDrc(doc);
  const ex = extract(doc);
  const lv = lvs(ex, level.reference, { ports: level.ports, checkBody: level.checkBody });
  const shifts = ldeShifts(doc, ex.devices, level.lde);
  return grade(level, doc, { violations, ex, lvs: lv, area: layoutArea(doc), shifts });
}

/** Full check including post-layout simulation and Monte Carlo yield. */
export async function checkLayoutFull(level: LayoutLevel, doc: Layout, sim: Simulator,
  onProgress?: (done: number, total: number) => void): Promise<LayoutCheck> {
  const quick = checkLayout(level, doc);
  if (!needsSim(level) || !level.bench || !quick.lvs.ok) return quick;
  const p = pex(doc);
  const ldeByPart: Record<string, number> = {};
  for (const [id, nm] of Object.entries(p.deviceNames)) ldeByPart[nm] = quick.shifts[id]?.total ?? 0;
  const post = postCircuit(level, p);
  const runs = Math.max(0, ...[...level.specs, ...(level.stars ?? []).flat()].filter((s) => s.kind === 'yield').map((s) => s.runs ?? 0));
  const total = 2 + runs;
  let done = 0;
  const tick = () => onProgress?.(++done, total);
  const [pre, nominal] = await Promise.all([
    simOne(preCircuit(level), level.bench.analyses, sim).then((r) => { tick(); return r; }),
    simOne(post, level.bench.analyses, sim, ldeByPart).then((r) => { tick(); return r; }),
  ]);
  const mc = await Promise.all(Array.from({ length: runs }, (_, i) => {
    const rnd = sampleMismatch(post, i + 1);
    const dv: Record<string, number> = {};
    for (const nm of Object.values(p.deviceNames)) dv[nm] = (ldeByPart[nm] ?? 0) + (rnd[nm] ?? 0);
    return simOne(post, level.bench!.analyses, sim, dv).then((r) => { tick(); return r; });
  }));
  return grade(level, doc, { ...quick, post: { pre, post: nominal, mc, pex: p, error: nominal ? undefined : 'post-layout simulation failed' } });
}
