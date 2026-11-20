import { emptyLayout } from '../layout/types';
import { C, L, X } from './build';
import { rowLayout, type Unit } from './layoutKit';
import type { Chapter, LayoutLevel } from './types';

const DRC = { id: 'drc', label: L('DRC 全部通過', 'DRC clean'), kind: 'drc' as const };
const LVS = { id: 'lvs', label: L('LVS 與電路圖一致', 'LVS matches the schematic'), kind: 'lvs' as const };

// ---------- 8-1: differential pair against a process gradient ----------
const pairRef = C(
  X('NFET', 'M1', { w: '4u', l: '0.5u', nf: '2' }, { d: 'da', g: 'ga', s: 'tail', b: 'gnd' }),
  X('NFET', 'M2', { w: '4u', l: '0.5u', nf: '2' }, { d: 'db', g: 'gb', s: 'tail', b: 'gnd' }),
);
const A: Unit = { dev: 'A', g: 'ga', s: 'tail', d: 'da' }, B: Unit = { dev: 'B', g: 'gb', s: 'tail', d: 'db' };
const pair = (units: Unit[]) => rowLayout({ type: 'nmos', wf: 2000, l: 500, units, labels: ['da', 'db', 'ga', 'gb', 'tail'] });

// ---------- 8-2: PMOS mirror and the well-proximity effect ----------
const pmirRef = C(
  X('PFET', 'MP1', { w: '2u', l: '0.5u', nf: '1' }, { d: 'd1', g: 'g', s: 'vdd', b: 'vdd' }),
  X('PFET', 'MP2', { w: '2u', l: '0.5u', nf: '1' }, { d: 'd2', g: 'g', s: 'vdd', b: 'vdd' }),
);
const pmir = (wellMargin?: number) => rowLayout({
  type: 'pmos', wf: 2000, l: 500, tap: 'vdd', wellMargin,
  units: [{ dev: 'P', g: 'g', s: 'vdd', d: 'd1' }, { dev: 'Q', g: 'g', s: 'vdd', d: 'd2' }],
  labels: ['d1', 'd2', 'g', 'vdd'],
});

const levels: LayoutLevel[] = [
  {
    id: '8-1', chapter: 8, mode: 'layout',
    title: L('共質心：打敗製程梯度', 'Common centroid: beating the gradient'),
    story: L(
      '晶圓上的氧化層厚度、摻雜濃度會從一邊慢慢變到另一邊。這個晶片上，臨界電壓每往右 1 µm 就高 1 mV。差動對的兩顆電晶體如果一左一右，就會天生不對稱。',
      'Oxide thickness and doping drift slowly across the wafer. On this die the threshold rises by 1 mV for every µm to the right. If the two halves of a differential pair sit left and right, they are mismatched from birth.',
    ),
    objective: L('把差動對 M1、M2（各 2 個 finger，每個 W = 2 µm、L = 0.5 µm）排成共質心，讓梯度造成的 ΔVth 差 ≤ 0.2 mV。', 'Arrange the pair M1, M2 (2 fingers each, W = 2 µm, L = 0.5 µm per finger) in a common-centroid pattern so the gradient-induced ΔVth difference is ≤ 0.2 mV.'),
    concept: {
      title: L('共質心與交錯排列', 'Common centroid and interdigitation'),
      body: L(
        '線性梯度下，一個元件的平均 ΔVth 只取決於它所有 finger 的「質心」。A B B A 讓 A 與 B 的質心重合，一階梯度完全抵消；A A B B 則讓兩邊差了兩個間距。二維時要用 ABBA / BAAB 的十字排列。',
        'Under a linear gradient a device\'s average ΔVth depends only on the centroid of its fingers. A B B A puts the centroids of A and B on top of each other and cancels the first-order gradient; A A B B leaves them two pitches apart. In 2-D use the ABBA / BAAB cross pattern.',
      ),
    },
    hints: [
      L('放四顆 NMOS PCell（W = 2 µm、L = 0.5 µm、nf = 1），排成一列：M1、M2、M2、M1。', 'Place four NMOS PCells (W = 2 µm, L = 0.5 µm, nf = 1) in a row: M1, M2, M2, M1.'),
      L('每個 finger 左邊接 tail、右邊接各自的汲極。在 diff 裡用不同高度的 met1 橫線分開 tail、da、db。', 'Each finger: source on the left to tail, drain on the right. Inside the diffusion, use met1 lines at different heights for tail, da and db.'),
      L('外側的兩個閘極（ga）要跨過中間的 gb：用 via 換到 met2 走線。', 'The outer gates (ga) must cross the middle gb: hop to met2 with vias.'),
      L('檢查後，LDE 分頁會列出每顆電晶體的 ΔVth。', 'After checking, the LDE tab lists the ΔVth of every transistor.'),
    ],
    reference: pairRef, ports: ['da', 'db', 'ga', 'gb', 'tail'], pcells: ['nmos', 'ptap'],
    lde: { gx: 1.0, gy: 0.5 },
    start: emptyLayout(),
    specs: [DRC, LVS, { id: 'mm', label: L('梯度造成的 ΔVth 差 ≤ 0.2 mV', 'Gradient ΔVth mismatch ≤ 0.2 mV'), kind: 'mismatch', devices: ['M1', 'M2'], max: 0.2, unit: 'mV' }],
    stars: [[{ id: 'area', label: L('面積 ≤ 18 µm²', 'Area ≤ 18 µm²'), kind: 'area', max: 18 }]],
    solutions: [
      { stars: 0, layout: pair([A, A, B, B]) },
      { stars: 2, layout: pair([A, B, B, A]) },
    ],
  },
  {
    id: '8-2', chapter: 8, mode: 'layout', skipTest: true,
    title: L('N 井鄰近效應', 'The well-proximity effect'),
    story: L(
      '植入 N 井時，離子會被光阻邊緣散射，讓靠近井邊的電晶體多吃一些摻雜，Vth 偏高好幾 mV。PCell 的井只比 diff 大 0.18 µm——太近了！',
      'During the N-well implant, ions scatter off the resist edge, so transistors near the well edge receive extra doping and their Vth rises by several mV. A PCell\'s own well is only 0.18 µm larger than its diffusion — far too close!',
    ),
    objective: L('做出 PMOS 電流鏡（含 ntap 接 vdd），讓兩顆電晶體因 WPE 造成的 |ΔVth| 都 ≤ 2 mV。', 'Lay out a PMOS mirror (with an ntap to vdd) so the WPE-induced |ΔVth| of both transistors is ≤ 2 mV.'),
    concept: {
      title: L('WPE 與井的大小', 'WPE and well size'),
      body: L(
        'ΔVth ≈ A·e^(−d/d0)，d 是閘極到 N 井邊緣的距離。在這個模型中 PMOS 的 A = 25 mV、d0 = 0.6 µm，要離井邊 1.5 µm 以上才夠小。真實設計會把井畫大一圈，並讓匹配元件與井邊的距離相同。',
        'ΔVth ≈ A·e^(−d/d0), where d is the distance from the gate to the N-well edge. Here A = 25 mV and d0 = 0.6 µm for PMOS, so keep gates more than 1.5 µm from the edge. Real designs draw a generous well and keep matched devices equally far from it.',
      ),
    },
    hints: [
      L('先完成電流鏡：兩顆 PMOS（W = 2 µm、L = 0.5 µm）閘極相連，源極接 vdd，加一顆 ntap 接 vdd。', 'Build the mirror first: two PMOS (W = 2 µm, L = 0.5 µm) with gates tied and sources on vdd, plus an ntap to vdd.'),
      L('按 1 選 nwell，畫一個大矩形把所有東西包起來，四周至少多出 1.6 µm。', 'Press 1 for nwell and draw one big rectangle around everything, extending at least 1.6 µm on every side.'),
    ],
    reference: pmirRef, ports: ['d1', 'd2', 'g', 'vdd'], checkBody: true, pcells: ['pmos', 'ntap'],
    lde: { wpe: true },
    start: emptyLayout(),
    specs: [DRC, LVS, { id: 'wpe', label: L('WPE |ΔVth| ≤ 2 mV', 'WPE |ΔVth| ≤ 2 mV'), kind: 'ldeAbs', devices: ['MP1', 'MP2'], max: 2, unit: 'mV' }],
    stars: [[{ id: 'area', label: L('面積 ≤ 42 µm²（井不要畫太大）', 'Area ≤ 42 µm² (do not overdo the well)'), kind: 'area', max: 42 }]],
    solutions: [
      { stars: 0, layout: pmir() },
      { stars: 1, layout: pmir(2200) },
      { stars: 2, layout: pmir(1600) },
    ],
  },
];

export const ch8: Chapter = {
  id: 8,
  title: L('第 8 章：匹配佈局', 'Chapter 8: Matching layout'),
  intro: L(
    '同樣的電路圖，不同的擺法，效能可以差很多。這章學會對抗晶圓上的系統性變化：製程梯度與井鄰近效應。',
    'Same schematic, different placement — and very different performance. Learn to fight systematic variation across the die: process gradients and the well-proximity effect.',
  ),
  levels,
};
