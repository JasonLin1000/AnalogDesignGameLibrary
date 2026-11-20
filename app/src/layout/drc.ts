// Design-rule checker for a SKY130 subset (values in nm, rule names follow the SKY130 manual).
// Width / spacing are checked on the merged shapes with band "chords" (Manhattan; corner-to-corner
// spacing is not checked). Enclosure, extension, exact-size and gate rules are checked per shape.
import type { Localized } from '../i18n';
import { bands, components, covered, distance, expand, intersect, mergeMarkers, overlaps, subtract, type Chord } from './geom';
import { flatten } from './flatten';
import type { Box, LayerId, Layout } from './types';

export interface Rule { id: string; text: Localized; value: number }
const R = (id: string, value: number, zh: string, en: string): Rule => ({ id, value, text: { 'zh-TW': zh, en } });

export const RULES = {
  nwellW: R('nwell.1', 840, 'N 井寬度 ≥ 0.84 µm', 'N-well width ≥ 0.84 µm'),
  nwellS: R('nwell.2a', 1270, 'N 井間距 ≥ 1.27 µm', 'N-well spacing ≥ 1.27 µm'),
  diffW: R('difftap.1', 150, '主動區寬度 ≥ 0.15 µm', 'Diffusion width ≥ 0.15 µm'),
  diffS: R('difftap.3', 270, '主動區間距 ≥ 0.27 µm', 'Diffusion spacing ≥ 0.27 µm'),
  tapW: R('tap.1', 150, '接點區寬度 ≥ 0.15 µm', 'Tap width ≥ 0.15 µm'),
  tapS: R('tap.3', 270, '接點區間距 ≥ 0.27 µm', 'Tap spacing ≥ 0.27 µm'),
  pdiffEnc: R('difftap.8', 180, 'N 井包住 P 型主動區 ≥ 0.18 µm', 'N-well encloses p-diffusion by ≥ 0.18 µm'),
  ndiffNw: R('difftap.9', 340, 'N 型主動區離 N 井 ≥ 0.34 µm', 'N-diffusion to N-well spacing ≥ 0.34 µm'),
  straddle: R('difftap.x', 0, '主動區不能跨在 N 井邊界上', 'Diffusion must not straddle the N-well edge'),
  polyW: R('poly.1a', 150, '多晶矽寬度 ≥ 0.15 µm', 'Poly width ≥ 0.15 µm'),
  polyS: R('poly.2', 210, '多晶矽間距 ≥ 0.21 µm', 'Poly spacing ≥ 0.21 µm'),
  polyDiffS: R('poly.4', 75, '多晶矽離主動區 ≥ 0.075 µm', 'Poly to diffusion spacing ≥ 0.075 µm'),
  sdExt: R('poly.7', 250, '源/汲極主動區延伸 ≥ 0.25 µm', 'Source/drain diffusion extension ≥ 0.25 µm'),
  endcap: R('poly.8', 130, '閘極端蓋：多晶矽伸出主動區 ≥ 0.13 µm', 'Gate end-cap: poly extends past diffusion by ≥ 0.13 µm'),
  liconSize: R('licon.1', 170, '接觸窗必須是 0.17 × 0.17 µm', 'Contact must be exactly 0.17 × 0.17 µm'),
  liconS: R('licon.2', 170, '接觸窗間距 ≥ 0.17 µm', 'Contact spacing ≥ 0.17 µm'),
  liconDiff: R('licon.5a', 40, '主動區/接點區包住接觸窗 ≥ 0.04 µm', 'Diffusion/tap encloses contact by ≥ 0.04 µm'),
  liconPoly: R('licon.8', 50, '多晶矽包住接觸窗 ≥ 0.05 µm', 'Poly encloses contact by ≥ 0.05 µm'),
  liconGate: R('licon.11', 55, '主動區上的接觸窗離閘極 ≥ 0.055 µm', 'Contact on diffusion to gate spacing ≥ 0.055 µm'),
  liconFloat: R('licon.x', 0, '接觸窗必須落在主動區、接點區或多晶矽上', 'Contact must land on diffusion, tap or poly'),
  liconLi: R('li.x', 0, '接觸窗必須被 li1 覆蓋', 'Contact must be covered by li1'),
  liW: R('li.1', 170, 'li1 寬度 ≥ 0.17 µm', 'li1 width ≥ 0.17 µm'),
  liS: R('li.3', 170, 'li1 間距 ≥ 0.17 µm', 'li1 spacing ≥ 0.17 µm'),
  mconSize: R('ct.1', 170, 'mcon 必須是 0.17 × 0.17 µm', 'mcon must be exactly 0.17 × 0.17 µm'),
  mconS: R('ct.2', 190, 'mcon 間距 ≥ 0.19 µm', 'mcon spacing ≥ 0.19 µm'),
  mconLi: R('ct.4', 0, 'mcon 必須被 li1 覆蓋', 'mcon must be covered by li1'),
  mconM1: R('m1.4', 30, 'met1 包住 mcon ≥ 0.03 µm', 'met1 encloses mcon by ≥ 0.03 µm'),
  m1W: R('m1.1', 140, 'met1 寬度 ≥ 0.14 µm', 'met1 width ≥ 0.14 µm'),
  m1S: R('m1.2', 140, 'met1 間距 ≥ 0.14 µm', 'met1 spacing ≥ 0.14 µm'),
  viaSize: R('via.1a', 150, 'via 必須是 0.15 × 0.15 µm', 'via must be exactly 0.15 × 0.15 µm'),
  viaS: R('via.2', 170, 'via 間距 ≥ 0.17 µm', 'via spacing ≥ 0.17 µm'),
  viaM1: R('via.4a', 55, 'met1 包住 via ≥ 0.055 µm', 'met1 encloses via by ≥ 0.055 µm'),
  viaM2: R('m2.4', 55, 'met2 包住 via ≥ 0.055 µm', 'met2 encloses via by ≥ 0.055 µm'),
  m2W: R('m2.1', 140, 'met2 寬度 ≥ 0.14 µm', 'met2 width ≥ 0.14 µm'),
  m2S: R('m2.2', 140, 'met2 間距 ≥ 0.14 µm', 'met2 spacing ≥ 0.14 µm'),
} as const;

export interface Violation { rule: Rule; box: Box; layer?: LayerId }

export function layerRects(l: Layout): Record<LayerId, Box[]> {
  const out = { nwell: [], diff: [], tap: [], poly: [], licon: [], li1: [], mcon: [], met1: [], via: [], met2: [] } as Record<LayerId, Box[]>;
  for (const s of flatten(l)) out[s.layer].push(s);
  return out;
}

function chords(rs: Box[]) {
  const widthX: Chord[] = [], widthY: Chord[] = [], gapX: Chord[] = [], gapY: Chord[] = [];
  for (const { band, spans } of bands(rs, 'y')) {
    spans.forEach((s, i) => {
      widthX.push({ band, span: s });
      if (i > 0) gapX.push({ band, span: [spans[i - 1][1], s[0]] });
    });
  }
  for (const { band, spans } of bands(rs, 'x')) {
    spans.forEach((s, i) => {
      widthY.push({ band, span: s });
      if (i > 0) gapY.push({ band, span: [spans[i - 1][1], s[0]] });
    });
  }
  return { widthX, widthY, gapX, gapY };
}

const boxX = (c: Chord): Box => ({ x0: c.span[0], x1: c.span[1], y0: c.band[0], y1: c.band[1] });
const boxY = (c: Chord): Box => ({ y0: c.span[0], y1: c.span[1], x0: c.band[0], x1: c.band[1] });

function widthSpace(rs: Box[], w: Rule, s: Rule, layer: LayerId): Violation[] {
  if (!rs.length) return [];
  const c = chords(rs);
  const v: Box[] = [], sv: Box[] = [];
  for (const k of c.widthX) if (k.span[1] - k.span[0] < w.value) v.push(boxX(k));
  for (const k of c.widthY) if (k.span[1] - k.span[0] < w.value) v.push(boxY(k));
  for (const k of c.gapX) if (k.span[1] - k.span[0] < s.value) sv.push(boxX(k));
  for (const k of c.gapY) if (k.span[1] - k.span[0] < s.value) sv.push(boxY(k));
  return [
    ...mergeMarkers(v).map((box) => ({ rule: w, box, layer })),
    ...mergeMarkers(sv).map((box) => ({ rule: s, box, layer })),
  ];
}

function cutRules(cuts: Box[], size: Rule, space: Rule, layer: LayerId): Violation[] {
  const out: Violation[] = [];
  for (const comp of components(cuts)) {
    const b = comp[0];
    if (comp.length > 1 || b.x1 - b.x0 !== size.value || b.y1 - b.y0 !== size.value) {
      out.push({ rule: size, box: { x0: Math.min(...comp.map((r) => r.x0)), y0: Math.min(...comp.map((r) => r.y0)), x1: Math.max(...comp.map((r) => r.x1)), y1: Math.max(...comp.map((r) => r.y1)) }, layer });
    }
  }
  for (let i = 0; i < cuts.length; i++) for (let j = i + 1; j < cuts.length; j++) {
    const d = distance(cuts[i], cuts[j]);
    if (d > 0 && d < space.value) out.push({ rule: space, box: bridge(cuts[i], cuts[j]), layer });
  }
  return out;
}

/** The region between two boxes (for spacing markers). */
function bridge(a: Box, b: Box): Box {
  return { x0: Math.min(a.x1, b.x1, Math.max(a.x0, b.x0)), x1: Math.max(a.x0, b.x0, Math.min(a.x1, b.x1)), y0: Math.min(a.y1, b.y1, Math.max(a.y0, b.y0)), y1: Math.max(a.y0, b.y0, Math.min(a.y1, b.y1)) };
}

const enclosed = (inner: Box, by: Box[], e: number) => covered(expand(inner, e), by);

export interface Gate extends Box { vertical: boolean }

/** Transistor gates: poly ∩ diff, with the channel direction. */
export function findGates(L: Record<LayerId, Box[]>): Gate[] {
  const raw: Box[] = [];
  for (const p of L.poly) for (const d of L.diff) { const i = intersect(p, d); if (i) raw.push(i); }
  const gates: Gate[] = [];
  for (const comp of components(raw)) {
    const g = { x0: Math.min(...comp.map((r) => r.x0)), y0: Math.min(...comp.map((r) => r.y0)), x1: Math.max(...comp.map((r) => r.x1)), y1: Math.max(...comp.map((r) => r.y1)) };
    // poly continuing above/below the gate means a vertical poly line (current flows in x)
    const up = covered({ x0: g.x0, x1: g.x1, y0: g.y1, y1: g.y1 + 5 }, L.poly) && !covered({ x0: g.x0, x1: g.x1, y0: g.y1, y1: g.y1 + 5 }, L.diff);
    const down = covered({ x0: g.x0, x1: g.x1, y0: g.y0 - 5, y1: g.y0 }, L.poly) && !covered({ x0: g.x0, x1: g.x1, y0: g.y0 - 5, y1: g.y0 }, L.diff);
    const right = covered({ x0: g.x1, x1: g.x1 + 5, y0: g.y0, y1: g.y1 }, L.poly) && !covered({ x0: g.x1, x1: g.x1 + 5, y0: g.y0, y1: g.y1 }, L.diff);
    const left = covered({ x0: g.x0 - 5, x1: g.x0, y0: g.y0, y1: g.y1 }, L.poly) && !covered({ x0: g.x0 - 5, x1: g.x0, y0: g.y0, y1: g.y1 }, L.diff);
    gates.push({ ...g, vertical: (up || down) ? true : (left || right) ? false : g.y1 - g.y0 >= g.x1 - g.x0 });
  }
  return gates;
}

export function runDrc(layout: Layout): Violation[] {
  const L = layerRects(layout);
  const v: Violation[] = [];
  v.push(...widthSpace(L.nwell, RULES.nwellW, RULES.nwellS, 'nwell'));
  v.push(...widthSpace(L.diff, RULES.diffW, RULES.diffS, 'diff'));
  v.push(...widthSpace(L.tap, RULES.tapW, RULES.tapS, 'tap'));
  v.push(...widthSpace(L.poly, RULES.polyW, RULES.polyS, 'poly'));
  v.push(...widthSpace(L.li1, RULES.liW, RULES.liS, 'li1'));
  v.push(...widthSpace(L.met1, RULES.m1W, RULES.m1S, 'met1'));
  v.push(...widthSpace(L.met2, RULES.m2W, RULES.m2S, 'met2'));

  // diffusion / tap vs N-well
  for (const d of [...L.diff, ...L.tap]) {
    const inWell = L.nwell.some((n) => overlaps(n, d));
    if (inWell) {
      if (!covered(d, L.nwell)) v.push({ rule: RULES.straddle, box: d, layer: 'diff' });
      else if (!enclosed(d, L.nwell, RULES.pdiffEnc.value)) v.push({ rule: RULES.pdiffEnc, box: expand(d, RULES.pdiffEnc.value), layer: 'nwell' });
    } else {
      for (const n of L.nwell) if (distance(d, n) < RULES.ndiffNw.value) v.push({ rule: RULES.ndiffNw, box: bridge(d, n), layer: 'nwell' });
    }
  }

  // gates
  const gates = findGates(L);
  for (const g of gates) {
    const ends: Box[] = g.vertical
      ? [{ x0: g.x0, x1: g.x1, y0: g.y1, y1: g.y1 + RULES.endcap.value }, { x0: g.x0, x1: g.x1, y0: g.y0 - RULES.endcap.value, y1: g.y0 }]
      : [{ y0: g.y0, y1: g.y1, x0: g.x1, x1: g.x1 + RULES.endcap.value }, { y0: g.y0, y1: g.y1, x0: g.x0 - RULES.endcap.value, x1: g.x0 }];
    for (const e of ends) if (!covered(e, L.poly)) v.push({ rule: RULES.endcap, box: e, layer: 'poly' });
    const sds: Box[] = g.vertical
      ? [{ y0: g.y0, y1: g.y1, x0: g.x1, x1: g.x1 + RULES.sdExt.value }, { y0: g.y0, y1: g.y1, x0: g.x0 - RULES.sdExt.value, x1: g.x0 }]
      : [{ x0: g.x0, x1: g.x1, y0: g.y1, y1: g.y1 + RULES.sdExt.value }, { x0: g.x0, x1: g.x1, y0: g.y0 - RULES.sdExt.value, y1: g.y0 }];
    for (const e of sds) if (!covered(e, L.diff)) v.push({ rule: RULES.sdExt, box: e, layer: 'diff' });
  }
  // poly (outside gates) to diffusion spacing
  const polyOff = L.poly.flatMap((p) => subtract(p, L.diff));
  for (const p of polyOff) for (const d of L.diff) {
    const dd = distance(p, d);
    if (dd > 0 && dd < RULES.polyDiffS.value) v.push({ rule: RULES.polyDiffS, box: bridge(p, d), layer: 'poly' });
  }

  // contacts
  v.push(...cutRules(L.licon, RULES.liconSize, RULES.liconS, 'licon'));
  for (const c of L.licon) {
    const onDiff = [...L.diff, ...L.tap].some((d) => overlaps(d, c));
    const onPoly = L.poly.some((p) => overlaps(p, c));
    if (!onDiff && !onPoly) v.push({ rule: RULES.liconFloat, box: c, layer: 'licon' });
    if (onDiff && !enclosed(c, [...L.diff, ...L.tap], RULES.liconDiff.value)) v.push({ rule: RULES.liconDiff, box: expand(c, RULES.liconDiff.value), layer: 'licon' });
    if (onPoly && !onDiff && !enclosed(c, L.poly, RULES.liconPoly.value)) v.push({ rule: RULES.liconPoly, box: expand(c, RULES.liconPoly.value), layer: 'licon' });
    if (onDiff) for (const g of gates) if (distance(c, g) < RULES.liconGate.value) v.push({ rule: RULES.liconGate, box: bridge(c, g), layer: 'licon' });
    if (!covered(c, L.li1)) v.push({ rule: RULES.liconLi, box: c, layer: 'licon' });
  }
  v.push(...cutRules(L.mcon, RULES.mconSize, RULES.mconS, 'mcon'));
  for (const c of L.mcon) {
    if (!covered(c, L.li1)) v.push({ rule: RULES.mconLi, box: c, layer: 'mcon' });
    if (!enclosed(c, L.met1, RULES.mconM1.value)) v.push({ rule: RULES.mconM1, box: expand(c, RULES.mconM1.value), layer: 'mcon' });
  }
  v.push(...cutRules(L.via, RULES.viaSize, RULES.viaS, 'via'));
  for (const c of L.via) {
    if (!enclosed(c, L.met1, RULES.viaM1.value)) v.push({ rule: RULES.viaM1, box: expand(c, RULES.viaM1.value), layer: 'via' });
    if (!enclosed(c, L.met2, RULES.viaM2.value)) v.push({ rule: RULES.viaM2, box: expand(c, RULES.viaM2.value), layer: 'via' });
  }
  return v;
}
