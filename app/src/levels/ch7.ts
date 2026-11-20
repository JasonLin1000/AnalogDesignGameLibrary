import { contactStack, instanceTerminals } from '../layout/pcell';
import type { Box, Instance, LayerId, Layout, LLabel, Shape } from '../layout/types';
import { emptyLayout } from '../layout/types';
import { C, L, X } from './build';
import type { Chapter, LayoutLevel } from './types';

// ---------- helpers for building reference layouts ----------
let seq = 0;
const sh = (layer: LayerId, x0: number, y0: number, x1: number, y1: number): Shape => ({ id: `c7s${seq++}`, layer, x0, y0, x1, y1 });
const lb = (layer: LayerId, text: string, x: number, y: number): LLabel => ({ id: `c7l${seq++}`, layer, text, x, y });
const inst = (kind: Instance['kind'], name: string, x: number, y: number, w: number, l: number, nf = 1): Instance =>
  ({ id: `c7i${seq++}`, kind, name, x, y, params: { w, l, nf } });
const mid = (b: Box) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
const stack = (kind: 'licon' | 'mcon' | 'via', x: number, y: number) => contactStack(kind, x, y).map((p) => sh(p.layer, p.box.x0, p.box.y0, p.box.x1, p.box.y1));
const m1 = (x0: number, y0: number, x1: number, y1: number) => sh('met1', Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1));

const tr = (zh: string, en: string) => L(zh, en);
const DRC = { id: 'drc', label: tr('DRC 全部通過', 'DRC clean'), kind: 'drc' as const };
const LVS = { id: 'lvs', label: tr('LVS 與電路圖一致', 'LVS matches the schematic'), kind: 'lvs' as const };
const area = (max: number) => ({ id: `area${max}`, label: tr(`面積 ≤ ${max} µm²`, `Area ≤ ${max} µm²`), kind: 'area' as const, max });
const pinsOn = (layer: LayerId) => ({ id: `pins-${layer}`, label: tr(`所有接腳標籤都在 ${layer}`, `All pin labels on ${layer}`), kind: 'pins' as const, layer });

// ---------- 7-1: hand-drawn transistor ----------
const nfet1 = C(X('NFET', 'M1', { w: '1u', l: '0.15u', nf: '1' }, { d: 'd', g: 'g', s: 's', b: 'gnd' }));
const handDrawn = (diffW: number, sd: number): Layout => ({
  shapes: [sh('diff', 0, 0, 2 * sd + 150, diffW), sh('poly', sd, -130, sd + 150, diffW + 130)],
  labels: [lb('diff', 's', sd / 2, diffW / 2), lb('diff', 'd', sd + 150 + sd / 2, diffW / 2), lb('poly', 'g', sd + 75, diffW + 65)],
  instances: [],
});

// ---------- 7-2: transistor with metal pins ----------
function metalPins(): Layout {
  const m = inst('nmos', 'M1', 0, 0, 1000, 150);
  const t = instanceTerminals(m);
  const shapes: Shape[] = [];
  const labels: LLabel[] = [];
  const pin = (b: Box, name: string) => { const c = mid(b); shapes.push(...stack('mcon', c.x, c.y)); labels.push(lb('met1', name, c.x, c.y)); };
  pin(t.g!, 'g'); pin(t.sd[0], 's'); pin(t.sd[1], 'd');
  return { shapes, labels, instances: [m] };
}

// ---------- 7-3: CMOS inverter ----------
const inverterRef = C(
  X('NFET', 'MN', { w: '1u', l: '0.15u', nf: '1' }, { d: 'out', g: 'in', s: 'gnd', b: 'gnd' }),
  X('PFET', 'MP', { w: '2u', l: '0.15u', nf: '1' }, { d: 'out', g: 'in', s: 'vdd', b: 'vdd' }),
);
function inverter(gap = 2600): Layout {
  const mn = inst('nmos', 'MN', 0, 0, 1000, 150);
  const mp = inst('pmos', 'MP', 0, gap, 2000, 150);
  const pt = inst('ptap', 'T1', -900, 300, 600, 400);
  const nt = inst('ntap', 'T2', -900, gap + 800, 600, 400);
  const tn = instanceTerminals(mn), tp = instanceTerminals(mp), ttp = instanceTerminals(pt), ttn = instanceTerminals(nt);
  const shapes: Shape[] = [];
  const labels: LLabel[] = [];
  // gates: a poly bridge from the NMOS gate head up to the PMOS finger
  shapes.push(sh('poly', 290, 1400, 440, gap - 130));
  // in: pin on the NMOS gate contact
  const g = mid(tn.g!); shapes.push(...stack('mcon', g.x, g.y)); labels.push(lb('met1', 'in', g.x, g.y));
  // gnd: ptap ↔ NMOS source
  const a = mid(ttp.tap!), s0 = { x: mid(tn.sd[0]).x, y: a.y };
  shapes.push(...stack('mcon', a.x, a.y), ...stack('mcon', s0.x, s0.y), m1(a.x - 115, a.y - 115, s0.x + 115, a.y + 115));
  labels.push(lb('met1', 'gnd', a.x, a.y));
  // vdd: ntap ↔ PMOS source
  const b = mid(ttn.tap!), p0 = { x: mid(tp.sd[0]).x, y: b.y };
  shapes.push(...stack('mcon', b.x, b.y), ...stack('mcon', p0.x, p0.y), m1(b.x - 115, b.y - 115, p0.x + 115, b.y + 115));
  labels.push(lb('met1', 'vdd', b.x, b.y));
  // out: NMOS drain ↔ PMOS drain, routed to the right of the gate contacts
  const dn = { x: mid(tn.sd[1]).x, y: a.y }, dp = { x: mid(tp.sd[1]).x, y: b.y };
  const xr = 1000;
  shapes.push(...stack('mcon', dn.x, dn.y), ...stack('mcon', dp.x, dp.y));
  shapes.push(m1(dn.x - 115, dn.y - 115, xr + 115, dn.y + 115), m1(xr - 115, dn.y - 115, xr + 115, dp.y + 115), m1(dp.x - 115, dp.y - 115, xr + 115, dp.y + 115));
  labels.push(lb('met1', 'out', xr, (dn.y + dp.y) / 2));
  return { shapes, labels, instances: [mn, mp, pt, nt] };
}

const ch7Levels: LayoutLevel[] = [
  {
    id: '7-1', chapter: 7, mode: 'layout',
    title: tr('畫出第一顆電晶體', 'Draw your first transistor'),
    story: tr(
      '歡迎來到 layout！電路圖上的一個符號，在晶圓上是一塊塊疊起來的圖層。電晶體其實就是一條多晶矽（poly）橫跨過主動區（diff）——交叉的地方就是通道。',
      'Welcome to layout! A symbol on the schematic is a stack of shapes on the wafer. A transistor is simply a poly line crossing an active (diff) region — the crossing is the channel.',
    ),
    objective: tr('不用 PCell，親手畫出 W = 1 µm、L = 0.15 µm 的 NMOS，並在 d、g、s 放上標籤。', 'Without PCells, hand-draw an NMOS with W = 1 µm and L = 0.15 µm, and label d, g and s.'),
    concept: {
      title: tr('W、L 與設計規則', 'W, L and design rules'),
      body: tr(
        'poly 寬度就是 L，被 poly 蓋住的 diff 長度就是 W。晶圓廠的設計規則保證做得出來：poly 要伸出 diff 至少 0.13 µm（不然微影偏移會讓通道短路），diff 要在 poly 兩側各留 0.25 µm 當源極和汲極。',
        'The poly width is L, and the length of diff it crosses is W. The foundry\'s design rules guarantee manufacturability: poly must extend 0.13 µm past the diff (or lithography misalignment could short the channel), and diff must extend 0.25 µm on each side for the source and drain.',
      ),
    },
    hints: [
      tr('按 2 選 diff 圖層、按 R，拖曳畫出 0.65 × 1 µm 的矩形。', 'Press 2 to pick the diff layer, press R and drag a 0.65 × 1 µm rectangle.'),
      tr('按 4 選 poly，畫一條 0.15 µm 寬的直條橫跨 diff，上下各多伸出 0.13 µm。按 K 可以量距離。', 'Press 4 for poly and draw a 0.15 µm wide bar across the diff, extending 0.13 µm above and below. Press K to measure.'),
      tr('雙擊矩形可以直接輸入座標。標籤：選好圖層（diff 或 poly）再按 L。', 'Double-click a rectangle to type exact coordinates. Labels: pick the layer (diff or poly), then press L.'),
    ],
    reference: nfet1, ports: ['d', 'g', 's'], pcells: [],
    start: emptyLayout(),
    specs: [DRC, LVS],
    stars: [[area(0.85)]],
    solutions: [
      { stars: 1, layout: handDrawn(1000, 400) },
      { stars: 2, layout: handDrawn(1000, 250) },
    ],
  },
  {
    id: '7-2', chapter: 7, mode: 'layout',
    title: tr('接觸窗與金屬', 'Contacts and metal'),
    story: tr(
      '電晶體要接到外面的世界，得一層一層往上爬：diff → licon → li1 → mcon → met1。每一層接觸窗都有固定大小和包覆規則。',
      'To reach the outside world a transistor climbs layer by layer: diff → licon → li1 → mcon → met1. Every contact has a fixed size and enclosure rules.',
    ),
    objective: tr('用 NMOS PCell，把 d、g、s 三個接腳都拉到 met1 並標籤。', 'Using the NMOS PCell, bring d, g and s up to met1 and label them there.'),
    concept: {
      title: tr('接觸窗堆疊', 'Contact stacks'),
      body: tr(
        '每一種接觸窗都是固定的方塊（licon、mcon 0.17 µm，via 0.15 µm），上下兩層金屬都要把它包住一圈。電流大時要放多顆接觸窗並聯，降低電阻、避免電遷移。',
        'Every contact is a fixed square (licon and mcon 0.17 µm, via 0.15 µm), and the layers above and below must enclose it. High currents need several contacts in parallel to cut resistance and avoid electromigration.',
      ),
    },
    hints: [
      tr('按 I 放 NMOS PCell（W = 1 µm、L = 0.15 µm）。它已經幫你畫好 licon 和 li1。', 'Press I to place an NMOS PCell (W = 1 µm, L = 0.15 µm). It already includes licon and li1.'),
      tr('按 O 切換到 mcon 堆疊，點在每個紫色 li1 條上：會放好 mcon 和 met1 方塊。', 'Press O until it shows mcon, then click on each purple li1 strip: it drops an mcon with a met1 pad.'),
      tr('按 8 選 met1，再按 L 放 d、g、s 標籤在 met1 方塊上。', 'Press 8 for met1, then press L to put the d, g, s labels on the met1 pads.'),
    ],
    reference: nfet1, ports: ['d', 'g', 's'], pcells: ['nmos'],
    start: emptyLayout(),
    specs: [DRC, LVS, pinsOn('met1')],
    stars: [[area(2.0)]],
    solutions: [{ stars: 2, layout: metalPins() }],
  },
  {
    id: '7-3', chapter: 7, mode: 'layout', skipTest: true,
    title: tr('CMOS 反相器', 'CMOS inverter'),
    story: tr(
      '數位世界最小的積木，也是類比工程師的基本功。PMOS 要放在 N 井裡，N 井要接到 vdd、基板要接到 gnd——少一個接點，晶片就可能閂鎖（latch-up）燒毀。',
      'The smallest brick of the digital world, and a core skill for analog engineers. The PMOS sits in an N-well; the well must be tied to vdd and the substrate to gnd — miss a tap and the chip can latch up and burn.',
    ),
    objective: tr('畫出反相器（NMOS 1 µm、PMOS 2 µm，L = 0.15 µm），含基體接點；in、out、vdd、gnd 接腳都在 met1。', 'Lay out an inverter (NMOS 1 µm, PMOS 2 µm, L = 0.15 µm) with body taps; pins in, out, vdd and gnd on met1.'),
    concept: {
      title: tr('井、基體接點與閂鎖效應', 'Wells, taps and latch-up'),
      body: tr(
        'PMOS 的基體是 N 井，NMOS 的基體是 P 型基板。用 ntap 把 N 井接 vdd、ptap 把基板接 gnd，才能讓寄生的 PNPN 結構保持關閉。LVS 也會檢查基體接法（B 腳）。',
        'The PMOS body is the N-well; the NMOS body is the P substrate. An ntap ties the well to vdd and a ptap ties the substrate to gnd, keeping the parasitic PNPN structure off. LVS checks these body (B) connections too.',
      ),
    },
    hints: [
      tr('放 NMOS 在下、PMOS（W = 2 µm）在上，兩者閘極對齊。N 井要離 NMOS 的 diff 至少 0.34 µm。', 'Place the NMOS below and the PMOS (W = 2 µm) above, gates aligned. The N-well must stay 0.34 µm from the NMOS diff.'),
      tr('用一條 poly 把 NMOS 的閘極頭接到 PMOS 的 poly：兩個閘極就是同一個 in。', 'Join the NMOS gate head to the PMOS poly with a poly bar: both gates become one "in".'),
      tr('ptap 放在 NMOS 旁邊接 gnd；ntap 放在 PMOS 旁邊，讓它的 N 井和 PMOS 的 N 井重疊，接 vdd。', 'Put a ptap next to the NMOS for gnd, and an ntap next to the PMOS with its N-well overlapping the PMOS well, for vdd.'),
      tr('out 的 met1 繞到右側，避開閘極的 met1 方塊。用 N（網路高亮）檢查每條線連到哪裡。', 'Route the out met1 around the right side, clear of the gate pad. Use N (net highlight) to see what each wire connects to.'),
    ],
    reference: inverterRef, ports: ['in', 'out', 'vdd', 'gnd'], checkBody: true, pcells: ['nmos', 'pmos', 'ptap', 'ntap'],
    start: emptyLayout(),
    specs: [DRC, LVS, pinsOn('met1')],
    stars: [[area(12)]],
    solutions: [
      { stars: 1, layout: inverter(3400) },
      { stars: 2, layout: inverter(2600) },
    ],
  },
];

export const ch7: Chapter = {
  id: 7,
  title: L('第 7 章：Layout 入門', 'Chapter 7: Layout basics'),
  intro: L(
    '電路圖只是藍圖，真正交給晶圓廠的是 layout：一層層的幾何圖形。你要學會畫電晶體、接觸窗與金屬，並通過兩道關卡——DRC（做得出來嗎？）和 LVS（跟電路圖一樣嗎？）。',
    'A schematic is only a blueprint; what goes to the foundry is the layout — layers of geometry. Learn to draw transistors, contacts and metal, and pass two gates: DRC (can it be built?) and LVS (does it match the schematic?).',
  ),
  levels: ch7Levels,
};
