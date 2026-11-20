// Layout-versus-schematic: label checks, finger merging, device counts, topology matching
// (backtracking over the device graph, anchored by pin labels), then W/L comparison.
import { parseSpice } from '../schematic/units';
import type { Circuit } from '../schematic/types';
import { SUB, type Extraction } from './extract';

export interface LvsIssue { level: 'error' | 'warning'; code: string; vars?: Record<string, string> }
export interface LvsResult { ok: boolean; issues: LvsIssue[]; deviceMap: Record<string, string[]> }
export interface LvsOptions { ports: string[]; checkBody?: boolean }

interface Dev { names: string[]; type: 'nfet' | 'pfet'; w: number; l: number; fingers: number; g: string; sd: [string, string]; b: string }

const gndName = (n: string) => (n === '0' || n === 'vss' ? 'gnd' : n.toLowerCase());

function merge(devs: Dev[]): Dev[] {
  const out: Dev[] = [];
  for (const d of devs) {
    const sd = [...d.sd].sort() as [string, string];
    const m = out.find((o) => o.type === d.type && o.l === d.l && o.g === d.g && o.b === d.b && o.sd[0] === sd[0] && o.sd[1] === sd[1]);
    if (m) { m.w += d.w; m.fingers += d.fingers; m.names.push(...d.names); } else out.push({ ...d, sd, names: [...d.names] });
  }
  return out;
}

export function lvs(ex: Extraction, ref: Circuit, opt: LvsOptions): LvsResult {
  const issues: LvsIssue[] = [];
  const err = (code: string, vars?: Record<string, string>) => issues.push({ level: 'error', code, vars });

  // 1. labels: shorts, opens, missing pins
  for (const [net, lbs] of ex.labelsByNet) if (lbs.length > 1) err('short', { a: lbs[0], b: lbs[1], net });
  for (const [lb, nets] of ex.netsByLabel) if (new Set(nets).size > 1) err('open', { net: lb, n: String(new Set(nets).size) });
  for (const p of opt.ports) if (!ex.netsByLabel.has(p.toLowerCase())) err('missingPin', { net: p });
  for (const t of ex.unplacedLabels) issues.push({ level: 'warning', code: 'labelOff', vars: { text: t } });

  // 2. devices
  const lay = merge(ex.devices.map((d) => ({ names: [d.id], type: d.type, w: d.w, l: d.l, fingers: 1, g: d.g, sd: d.sd, b: opt.checkBody ? d.b : '*' })));
  for (const d of ex.devices) if (d.g === '?' || d.sd.includes('?')) err('badDevice', { id: d.id });
  const sch = merge(ref.parts.filter((p) => p.kind === 'NFET' || p.kind === 'PFET').map((p) => ({
    names: [p.name], type: p.kind === 'NFET' ? 'nfet' as const : 'pfet' as const,
    w: Math.round(parseSpice(p.params.w) * 1e9), l: Math.round(parseSpice(p.params.l) * 1e9), fingers: 1,
    g: gndName(p.nets.g), sd: [gndName(p.nets.d), gndName(p.nets.s)] as [string, string], b: opt.checkBody ? gndName(p.nets.b) : '*',
  })));

  // 3. counts
  for (const type of ['nfet', 'pfet'] as const) {
    const a = sch.filter((d) => d.type === type).length, b = lay.filter((d) => d.type === type).length;
    if (a !== b) err('count', { type: type.toUpperCase(), sch: String(a), lay: String(b) });
  }
  const deviceMap: Record<string, string[]> = {};
  if (issues.some((i) => i.level === 'error')) return { ok: false, issues, deviceMap };

  // 4. topology: map layout nets -> schematic nets
  const schNets = new Set(sch.flatMap((d) => [d.g, ...d.sd, d.b]));
  const l2s = new Map<string, string>(), s2l = new Map<string, string>();
  const layName = (n: string) => (n === SUB ? n : n.toLowerCase());
  for (const d of lay) for (const n of [d.g, ...d.sd, d.b]) {
    const nn = layName(n);
    if (schNets.has(nn) && !l2s.has(n)) { l2s.set(n, nn); s2l.set(nn, n); }
  }
  const used = new Set<number>();
  const order = [...sch.keys()].sort((a, b) => score(sch[b]) - score(sch[a]));
  function score(d: Dev) { return [d.g, ...d.sd, d.b].filter((n) => s2l.has(n)).length; }
  let best = 0, stuck = '';
  const assign: number[] = [];

  const tryMap = (pairs: [string, string][]): (() => void) | null => {
    const added: [string, string][] = [];
    for (const [ln, sn] of pairs) {
      if (sn === '*' && ln === '*') continue;
      const a = l2s.get(ln), b = s2l.get(sn);
      if (a === undefined && b === undefined) { l2s.set(ln, sn); s2l.set(sn, ln); added.push([ln, sn]); }
      else if (a !== sn || b !== ln) { for (const [x, y] of added) { l2s.delete(x); s2l.delete(y); } return null; }
    }
    return () => { for (const [x, y] of added) { l2s.delete(x); s2l.delete(y); } };
  };

  const solve = (k: number): boolean => {
    if (k > best) best = k;
    if (k === order.length) return true;
    const s = sch[order[k]];
    for (let j = 0; j < lay.length; j++) {
      if (used.has(j)) continue;
      const d = lay[j];
      if (d.type !== s.type) continue;
      for (const [a, b] of [[0, 1], [1, 0]]) {
        const undo = tryMap([[d.g, s.g], [d.sd[a], s.sd[0]], [d.sd[b], s.sd[1]], [d.b, s.b]]);
        if (!undo) continue;
        used.add(j); assign[order[k]] = j;
        if (solve(k + 1)) return true;
        used.delete(j); undo();
      }
    }
    if (k === best) stuck = s.names.join('/');
    return false;
  };

  if (!solve(0)) {
    err('topology', { name: stuck });
    return { ok: false, issues, deviceMap };
  }

  // 5. parameters
  sch.forEach((s, i) => {
    const d = lay[assign[i]];
    deviceMap[s.names.join('/')] = d.names;
    const wErr = Math.abs(d.w - s.w) / s.w;
    if (wErr > 0.01 || Math.abs(d.l - s.l) > 1) {
      err('param', { name: s.names.join('/'), wSch: (s.w / 1000).toString(), wLay: (d.w / 1000).toString(), lSch: (s.l / 1000).toString(), lLay: (d.l / 1000).toString() });
    }
  });
  return { ok: !issues.some((i) => i.level === 'error'), issues, deviceMap };
}
