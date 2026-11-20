// Turn a drawn schematic into nets (union-find on grid points).
// Rules (LTspice/Virtuoso-like):
//  - a wire connects its two endpoints
//  - any pin / wire endpoint / label lying on a wire (ends or interior) joins that wire
//  - coincident points join
import { PARTS, isMos, pinPositions } from './parts';
import type { Circuit, LogicalPart, Pt, Schematic } from './types';
import { parseSpice } from './units';

export const key = (p: Pt) => `${p.x},${p.y}`;

class DSU {
  parent = new Map<string, string>();
  find(a: string): string {
    if (!this.parent.has(a)) this.parent.set(a, a);
    let r = a;
    while (this.parent.get(r) !== r) r = this.parent.get(r)!;
    let c = a;
    while (this.parent.get(c) !== r) { const n = this.parent.get(c)!; this.parent.set(c, r); c = n; }
    return r;
  }
  union(a: string, b: string) { const ra = this.find(a), rb = this.find(b); if (ra !== rb) this.parent.set(ra, rb); }
}

/** Is p on segment a-b (inclusive)? Works for any direction, grid integer coords. */
export function onSegment(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  return p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

export type DiagLevel = 'error' | 'warning' | 'info';
export interface Diagnostic { level: DiagLevel; code: string; vars?: Record<string, string>; at?: Pt }

export interface Connectivity {
  netOfPoint: Map<string, string>;          // grid point key -> net name
  pinNets: Map<string, Record<string, string>>; // part id -> pin -> net
  junctions: Pt[];                          // where >=3 connections meet (draw a dot)
  danglingPins: Pt[];                       // unconnected pin positions
  netPoints: Map<string, Pt[]>;             // net -> representative points
  diagnostics: Diagnostic[];
}

export const sanitizeNet = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'n';

export function analyze(sch: Schematic): Connectivity {
  const dsu = new DSU();
  const points: { pt: Pt; type: 'pin' | 'wire' | 'label' }[] = [];
  const pinsByPart = new Map<string, { name: string; pt: Pt }[]>();
  for (const part of sch.parts) {
    const pins = pinPositions(part);
    pinsByPart.set(part.id, pins);
    for (const p of pins) points.push({ pt: p.pt, type: 'pin' });
  }
  for (const w of sch.wires) {
    dsu.union(key(w.a), key(w.b));
    points.push({ pt: w.a, type: 'wire' }, { pt: w.b, type: 'wire' });
  }
  for (const l of sch.labels) points.push({ pt: { x: l.x, y: l.y }, type: 'label' });

  // degree count per point for junction dots & dangling detection
  const degree = new Map<string, number>();
  const bump = (k: string, n = 1) => degree.set(k, (degree.get(k) ?? 0) + n);
  for (const { pt, type } of points) { dsu.find(key(pt)); if (type !== 'label') bump(key(pt)); }
  for (const w of sch.wires) {
    for (const { pt, type } of points) {
      if (!onSegment(pt, w.a, w.b)) continue;
      dsu.union(key(pt), key(w.a));
      if (type === 'label') continue;
      const isEnd = (pt.x === w.a.x && pt.y === w.a.y) || (pt.x === w.b.x && pt.y === w.b.y);
      if (!isEnd) bump(key(pt), 2); // T-junction: the wire passes through
    }
  }

  // Name nets
  const rootNames = new Map<string, Set<string>>();
  const addName = (root: string, n: string) => { if (!rootNames.has(root)) rootNames.set(root, new Set()); rootNames.get(root)!.add(n); };
  for (const part of sch.parts) {
    if (part.kind === 'GND') addName(dsu.find(key(pinsByPart.get(part.id)![0].pt)), '0');
  }
  for (const l of sch.labels) {
    const n = sanitizeNet(l.name);
    addName(dsu.find(key(l)), n === 'gnd' ? '0' : n);
  }

  const diagnostics: Diagnostic[] = [];
  const rootToNet = new Map<string, string>();
  const used = new Set<string>();
  for (const [root, names] of rootNames) {
    const list = [...names].sort((a, b) => (a === '0' ? -1 : b === '0' ? 1 : a.localeCompare(b)));
    if (list.length > 1) diagnostics.push({ level: 'warning', code: 'netShorted', vars: { a: list[0], b: list[1] } });
    rootToNet.set(root, list[0]);
    used.add(list[0]);
  }
  let auto = 1;
  const netName = (root: string) => {
    let n = rootToNet.get(root);
    if (!n) {
      do { n = `net${auto++}`; } while (used.has(n));
      used.add(n);
      rootToNet.set(root, n);
    }
    return n;
  };

  const netOfPoint = new Map<string, string>();
  const netPoints = new Map<string, Pt[]>();
  for (const { pt } of points) {
    const n = netName(dsu.find(key(pt)));
    netOfPoint.set(key(pt), n);
    if (!netPoints.has(n)) netPoints.set(n, []);
    netPoints.get(n)!.push(pt);
  }

  const pinNets = new Map<string, Record<string, string>>();
  const danglingPins: Pt[] = [];
  for (const part of sch.parts) {
    const rec: Record<string, string> = {};
    for (const p of pinsByPart.get(part.id)!) {
      rec[p.name] = netOfPoint.get(key(p.pt))!;
      if ((degree.get(key(p.pt)) ?? 0) <= 1 && !sch.labels.some((l) => l.x === p.pt.x && l.y === p.pt.y)) {
        // allow an unconnected MOS body: the netlister ties it to the source
        // an unconnected MOS body is tied to the source by the netlister; a spare ground symbol is harmless
        if (!(isMos(part.kind) && p.name === 'b') && part.kind !== 'GND') danglingPins.push(p.pt);
      }
    }
    pinNets.set(part.id, rec);
  }

  const junctions: Pt[] = [];
  const seen = new Set<string>();
  for (const { pt } of points) {
    const k = key(pt);
    if (seen.has(k)) continue;
    seen.add(k);
    if ((degree.get(k) ?? 0) >= 3) junctions.push(pt);
  }
  return { netOfPoint, pinNets, junctions, danglingPins, netPoints, diagnostics };
}

/** Convert a drawn schematic to a geometry-free circuit + diagnostics. */
export function toCircuit(sch: Schematic): { circuit: Circuit; conn: Connectivity; diagnostics: Diagnostic[] } {
  const conn = analyze(sch);
  const diagnostics = [...conn.diagnostics];
  const parts: LogicalPart[] = [];
  const names = new Set<string>();
  for (const part of sch.parts) {
    if (part.kind === 'GND') continue;
    const up = part.name.toUpperCase();
    if (names.has(up)) diagnostics.push({ level: 'error', code: 'dupName', vars: { name: part.name } });
    names.add(up);
    const nets = { ...conn.pinNets.get(part.id)! };
    if (isMos(part.kind)) {
      const pins = pinPositions(part);
      const b = pins.find((p) => p.name === 'b')!;
      const bConnected = sch.wires.some((w) => onSegment(b.pt, w.a, w.b))
        || sch.labels.some((l) => l.x === b.pt.x && l.y === b.pt.y)
        || sch.parts.some((o) => o.id !== part.id && pinPositions(o).some((q) => q.pt.x === b.pt.x && q.pt.y === b.pt.y));
      if (!bConnected) {
        nets.b = nets.s;
        diagnostics.push({ level: 'info', code: 'bodyToSource', vars: { name: part.name } });
      }
    }
    parts.push({ kind: part.kind, name: part.name, params: { ...part.params }, nets });
  }
  for (const pt of conn.danglingPins) diagnostics.push({ level: 'error', code: 'danglingPin', at: pt, vars: { x: String(pt.x), y: String(pt.y) } });
  diagnostics.push(...checkCircuit({ parts }));
  return { circuit: { parts }, conn, diagnostics };
}

/** Electrical sanity checks that also apply to geometry-free circuits. */
export function checkCircuit(c: Circuit): Diagnostic[] {
  const d: Diagnostic[] = [];
  if (c.parts.length === 0) return [{ level: 'error', code: 'empty' }];
  const count = new Map<string, number>();
  for (const p of c.parts) {
    const pins = PARTS[p.kind].pins.map((x) => x.name);
    const seen = new Set<string>();
    for (const pin of pins) {
      const n = p.nets[pin];
      if (!n) continue;
      if (seen.has(n) && !(isMos(p.kind))) continue;
      seen.add(n);
      count.set(n, (count.get(n) ?? 0) + 1);
    }
  }
  // SKY130 model bins: L in [0.15, 100) µm, width per finger (W/nf) in [0.36, 100) µm
  for (const p of c.parts) {
    if (p.kind !== 'NFET' && p.kind !== 'PFET') continue;
    const w = parseSpice(p.params.w), l = parseSpice(p.params.l), nf = Math.max(1, Math.round(parseSpice(p.params.nf || '1')) || 1);
    const wf = w / nf;
    if (!(l >= 0.15e-6 - 1e-12 && l < 100e-6) || !(wf >= 0.36e-6 - 1e-12 && wf < 100e-6)) {
      d.push({ level: 'error', code: 'mosRange', vars: { name: p.name, wf: (wf * 1e6).toPrecision(3), l: (l * 1e6).toPrecision(3) } });
    }
  }
  if (!count.has('0')) d.push({ level: 'error', code: 'noGround' });
  for (const [n, k] of count) if (k < 2 && n !== '0') d.push({ level: 'error', code: 'floatingNet', vars: { net: n } });
  return d;
}
