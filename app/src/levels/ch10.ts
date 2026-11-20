import { emptyLayout } from '../layout/types';
import { C, L, X } from './build';
import { rowLayout, type Unit } from './layoutKit';
import type { Chapter, LayoutLevel } from './types';

const ref = C(
  X('NFET', 'MREF', { w: '4u', l: '1u', nf: '1' }, { d: 'ref', g: 'ref', s: 'gnd', b: 'gnd' }),
  X('NFET', 'MOUT', { w: '16u', l: '1u', nf: '4' }, { d: 'out', g: 'ref', s: 'gnd', b: 'gnd' }),
);
const A: Unit = { dev: 'R', g: 'ref', s: 'gnd', d: 'ref' }, B: Unit = { dev: 'O', g: 'ref', s: 'gnd', d: 'out' };
const mirror = (units: Unit[]) => rowLayout({ type: 'nmos', wf: 4000, l: 1000, units, labels: ['ref', 'out', 'gnd'] });
const iout = { kind: 'op_i' as const, part: 'VOUT' };
export const TAPEOUT = { lo: 190e-6, hi: 210e-6 }; // provisional, calibrated below

const tapeout: LayoutLevel = {
  id: '10-1', chapter: 10, mode: 'layout', skipTest: true,
  title: L('Tape-out：交給晶圓廠', 'Tape-out: off to the foundry'),
  story: L(
    '畢業專題！客戶要一個 1:4 的電流鏡：50 µA 進、200 µA 出。這次要真的下線——晶圓上的每一顆晶片都會有隨機不匹配，還有從左到右的製程梯度。良率不夠，整批晶圓就報廢。',
    'Graduation project! The customer wants a 1:4 current mirror: 50 µA in, 200 µA out. This time it really goes to the fab — every die on the wafer has random mismatch plus a left-to-right process gradient. Miss the yield and the whole lot is scrap.',
  ),
  objective: L(
    '畫出 MREF（4 µm / 1 µm）與 MOUT（4 × 4 µm / 1 µm）。Post-layout 輸出電流要在 190–210 µA，30 顆晶片的 Monte Carlo 良率 ≥ 90%。',
    'Lay out MREF (4 µm / 1 µm) and MOUT (4 × 4 µm / 1 µm). The post-layout output current must be 190–210 µA, with ≥ 90% Monte Carlo yield over 30 dies.',
  ),
  concept: {
    title: L('良率：系統性 + 隨機', 'Yield: systematic + random'),
    body: L(
      '晶片的偏差 = 系統性（梯度、WPE、IR drop——靠好的 layout 消除）+ 隨機（Pelgrom 不匹配——只能靠面積降低）。共質心把系統性誤差壓到零，剩下的隨機分布決定良率。量產時，良率就是利潤。',
      'Die-to-die error = systematic (gradients, WPE, IR drop — removed by good layout) + random (Pelgrom mismatch — reduced only by area). A common centroid drives the systematic part to zero; what remains is the random spread, and that sets the yield. In production, yield is profit.',
    ),
  },
  hints: [
    L('五個相同的單元（W = 4 µm、L = 1 µm）排成一列：MOUT、MOUT、MREF、MOUT、MOUT。MREF 在中間，兩邊的質心就重合了。', 'Five identical units (W = 4 µm, L = 1 µm) in a row: MOUT, MOUT, MREF, MOUT, MOUT. With MREF in the middle, the centroids coincide.'),
    L('源極全部接 gnd；MREF 的汲極接 ref，也要接回所有閘極（二極體接法，用 met2 跨過去）。', 'All sources to gnd; MREF\'s drain is ref and must also reach every gate (diode connection — hop over on met2).'),
    L('檢查後看「良率」分頁的晶圓圖：每一格是一顆晶片。', 'After checking, look at the wafer map in the Yield tab: each cell is one die.'),
  ],
  reference: ref, ports: ['ref', 'out', 'gnd'], pcells: ['nmos', 'ptap'],
  lde: { gx: 2.0 },
  bench: {
    parts: [
      X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }),
      X('I', 'IREF', { dc: '50u' }, { p: 'vdd', n: 'ref' }),
      X('V', 'VOUT', { dc: '0.9' }, { p: 'out', n: '0' }),
    ],
    analyses: [{ kind: 'op' }],
  },
  start: emptyLayout(),
  specs: [
    { id: 'drc', label: L('DRC 全部通過', 'DRC clean'), kind: 'drc' },
    { id: 'lvs', label: L('LVS 與電路圖一致', 'LVS matches the schematic'), kind: 'lvs' },
    { id: 'iout', label: L('Post-sim 輸出電流 190–210 µA', 'Post-sim output current 190–210 µA'), kind: 'post', measure: iout, min: TAPEOUT.lo, max: TAPEOUT.hi, unit: 'A' },
    { id: 'yield', label: L('良率 ≥ 90%（30 顆晶片）', 'Yield ≥ 90% (30 dies)'), kind: 'yield', measure: iout, min: TAPEOUT.lo, max: TAPEOUT.hi, runs: 30, minYield: 0.9 },
  ],
  stars: [
    [{ id: 'mm', label: L('梯度造成的 ΔVth 差 ≤ 0.2 mV', 'Gradient ΔVth mismatch ≤ 0.2 mV'), kind: 'mismatch', devices: ['MREF', 'MOUT'], max: 0.2, unit: 'mV' }],
    [{ id: 'y97', label: L('良率 ≥ 97%', 'Yield ≥ 97%'), kind: 'yield', measure: iout, min: TAPEOUT.lo, max: TAPEOUT.hi, runs: 30, minYield: 0.97 }],
  ],
  solutions: [
    { stars: 0, layout: mirror([A, B, B, B, B]) },
    { stars: 3, layout: mirror([B, B, A, B, B]) },
  ],
};

export const ch10: Chapter = {
  id: 10,
  title: L('第 10 章：畢業專題', 'Chapter 10: Graduation project'),
  intro: L(
    '從電路圖、pre-sim、layout、DRC、LVS、寄生抽取、post-sim 到 Monte Carlo 良率——走完一次完整的類比設計流程，把你的設計送進晶圓廠。',
    'Schematic, pre-sim, layout, DRC, LVS, parasitic extraction, post-sim and Monte Carlo yield — walk the complete analog design flow once and send your design to the fab.',
  ),
  levels: [tapeout],
};
