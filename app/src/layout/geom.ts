// Rectangle-set geometry for Manhattan layouts (integer nm).
import type { Box } from './types';

export const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
export const width = (b: Box) => b.x1 - b.x0;
export const height = (b: Box) => b.y1 - b.y0;
export const norm = (b: Box): Box => ({ x0: Math.min(b.x0, b.x1), y0: Math.min(b.y0, b.y1), x1: Math.max(b.x0, b.x1), y1: Math.max(b.y0, b.y1) });
export const expand = (b: Box, d: number): Box => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

/** Overlap with positive area. */
export const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Overlap or shared edge (electrical connection on the same layer). */
export const touches = (a: Box, b: Box) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1
  && !((a.x0 === b.x1 || b.x0 === a.x1) && (a.y0 === b.y1 || b.y0 === a.y1)); // corner-only contact does not connect
export const contains = (outer: Box, p: { x: number; y: number }) => p.x >= outer.x0 && p.x <= outer.x1 && p.y >= outer.y0 && p.y <= outer.y1;

export function intersect(a: Box, b: Box): Box | null {
  const r = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
  return r.x0 < r.x1 && r.y0 < r.y1 ? r : null;
}

/** a − b as up to four rectangles. */
export function subtractOne(a: Box, b: Box): Box[] {
  const i = intersect(a, b);
  if (!i) return [a];
  const out: Box[] = [];
  if (a.y0 < i.y0) out.push({ x0: a.x0, y0: a.y0, x1: a.x1, y1: i.y0 });
  if (i.y1 < a.y1) out.push({ x0: a.x0, y0: i.y1, x1: a.x1, y1: a.y1 });
  if (a.x0 < i.x0) out.push({ x0: a.x0, y0: i.y0, x1: i.x0, y1: i.y1 });
  if (i.x1 < a.x1) out.push({ x0: i.x1, y0: i.y0, x1: a.x1, y1: i.y1 });
  return out;
}

export function subtract(a: Box, bs: Box[]): Box[] {
  let parts = [a];
  for (const b of bs) {
    if (!parts.length) break;
    parts = parts.flatMap((p) => subtractOne(p, b));
  }
  return parts;
}

/** Is `a` completely covered by the union of `bs`? */
export const covered = (a: Box, bs: Box[]) => area(a) === 0 || subtract(a, bs.filter((b) => overlaps(a, b))).length === 0;

/** Euclidean distance between two rectangles (0 if they touch or overlap). */
export function distance(a: Box, b: Box): number {
  const dx = Math.max(0, b.x0 - a.x1, a.x0 - b.x1);
  const dy = Math.max(0, b.y0 - a.y1, a.y0 - b.y1);
  return Math.hypot(dx, dy);
}

export function bbox(bs: Box[]): Box | null {
  if (!bs.length) return null;
  return {
    x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)),
    x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)),
  };
}

/** Group rectangles into electrically connected components (touching). */
export function components<T extends Box>(rs: T[]): T[][] {
  const parent = rs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    if (touches(rs[i], rs[j])) parent[find(i)] = find(j);
  }
  const groups = new Map<number, T[]>();
  rs.forEach((r, i) => { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(r); });
  return [...groups.values()];
}

export interface Chord { band: [number, number]; span: [number, number] }

/**
 * Slice the union of `rs` into bands along one axis and return, per band, the merged
 * intervals along the other axis. axis 'y' = horizontal bands (intervals are x-ranges).
 */
export function bands(rs: Box[], axis: 'x' | 'y'): { band: [number, number]; spans: [number, number][] }[] {
  const lo = (b: Box) => (axis === 'y' ? b.y0 : b.x0), hi = (b: Box) => (axis === 'y' ? b.y1 : b.x1);
  const a0 = (b: Box) => (axis === 'y' ? b.x0 : b.y0), a1 = (b: Box) => (axis === 'y' ? b.x1 : b.y1);
  const cuts = [...new Set(rs.flatMap((r) => [lo(r), hi(r)]))].sort((p, q) => p - q);
  const out: { band: [number, number]; spans: [number, number][] }[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const b0 = cuts[i], b1 = cuts[i + 1];
    const iv = rs.filter((r) => lo(r) <= b0 && hi(r) >= b1).map((r) => [a0(r), a1(r)] as [number, number]).sort((p, q) => p[0] - q[0]);
    const spans: [number, number][] = [];
    for (const [s, e] of iv) {
      if (spans.length && s <= spans[spans.length - 1][1]) spans[spans.length - 1][1] = Math.max(spans[spans.length - 1][1], e);
      else spans.push([s, e]);
    }
    if (spans.length) out.push({ band: [b0, b1], spans });
  }
  return out;
}

/** Merge markers that line up in consecutive bands into single boxes (for readable DRC results). */
export function mergeMarkers(ms: Box[]): Box[] {
  const sorted = [...ms].sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1 || a.y0 - b.y0);
  const out: Box[] = [];
  for (const m of sorted) {
    const last = out.find((o) => o.x0 === m.x0 && o.x1 === m.x1 && o.y1 === m.y0);
    if (last) last.y1 = m.y1;
    else {
      const lastH = out.find((o) => o.y0 === m.y0 && o.y1 === m.y1 && o.x1 === m.x0);
      if (lastH) lastH.x1 = m.x1; else out.push({ ...m });
    }
  }
  return out;
}
