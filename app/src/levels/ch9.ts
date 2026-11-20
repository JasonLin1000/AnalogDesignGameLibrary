import { contactStack } from '../layout/pcell';
import type { LayerId, Layout, Shape } from '../layout/types';
import { emptyLayout } from '../layout/types';
import { C, L, X } from './build';
import { inverter, inverterRef } from './ch7';
import { rowLayout } from './layoutKit';
import type { Chapter, LayoutLevel } from './types';

const DRC = { id: 'drc', label: L('DRC 全部通過', 'DRC clean'), kind: 'drc' as const };
const LVS = { id: 'lvs', label: L('LVS 與電路圖一致', 'LVS matches the schematic'), kind: 'lvs' as const };
let seq = 0;
const sh = (layer: LayerId, x0: number, y0: number, x1: number, y1: number): Shape => ({ id: `n9${seq++}`, layer, x0, y0, x1, y1 });

// ---------- 9-1: an inverter whose pins are far away ----------
/** The chapter-7 inverter with its in / out pins dragged `len` µm away on `layer`. */
function farInverter(len: number, layer: 'met1' | 'li1', width?: number): Layout {
  const l = structuredClone(inverter(2600));
  const far = len * 1000, h = width ? width / 2 : layer === 'met1' ? 115 : 85;
  // every label is a pin: drop the inverter's own in / out labels so the far ends are the only pins
  l.labels = l.labels.filter((x) => x.text !== 'in' && x.text !== 'out');
  // in: from the NMOS gate contact (365, 1265) to the left
  l.shapes.push(sh(layer, -far - h, 1265 - h, 480, 1265 + h));
  l.labels.push({ id: `n9l${seq++}`, layer, text: 'in', x: -far, y: 1265 });
  // out: from the vertical out wire (x = 1000) to the right
  if (layer === 'li1') l.shapes.push(...contactStack('mcon', 1000, 2000).map((p) => sh(p.layer, p.box.x0, p.box.y0, p.box.x1, p.box.y1)));
  l.shapes.push(sh(layer, 885, 2000 - h, far + h, 2000 + h));
  l.labels.push({ id: `n9l${seq++}`, layer, text: 'out', x: far, y: 2000 });
  return l;
}
const invBench = {
  parts: [
    X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }),
    X('V', 'VIN', { dc: '0', tran: 'PULSE(0 1.8 50p 10p 10p 500p 1.1n)' }, { p: 'in', n: '0' }),
    X('C', 'CL', { value: '20f' }, { p: 'out', n: '0' }),
  ],
  analyses: [{ kind: 'tran' as const, tstep: '1p', tstop: '600p' }],
};
const delay = { kind: 'tran_delay' as const, from: 'in', to: 'out', level: 0.9, edgeFrom: 'rise' as const, edgeTo: 'fall' as const };

// ---------- 9-2: source degeneration from a long, thin ground wire ----------
const degRef = C(X('NFET', 'MN', { w: '20u', l: '0.5u', nf: '10' }, { d: 'd', g: 'g', s: 'gnd', b: 'gnd' }));
const degenerate = (width: number) => rowLayout({
  type: 'nmos', wf: 2000, l: 500,
  units: Array.from({ length: 10 }, () => ({ dev: 'N', g: 'g', s: 'gnd', d: 'd' })),
  labels: ['d', 'g', 'gnd'],
  stubs: { gnd: { x: -40000, width } },
});
const degBench = {
  parts: [X('V', 'VG', { dc: '1.8' }, { p: 'g', n: '0' }), X('V', 'VD', { dc: '1.8' }, { p: 'd', n: '0' })],
  analyses: [{ kind: 'op' as const }],
};

const levels: LayoutLevel[] = [
  {
    id: '9-1', chapter: 9, mode: 'layout',
    title: L('寄生 RC：走線也有代價', 'Parasitic RC: wires are not free'),
    story: L(
      '電路圖上的線是理想導線，晶片上的線卻有電阻和電容。這個反相器的輸入、輸出接腳要拉到 100 µm 外——用哪一層金屬、畫多寬，速度會差很多。',
      'Wires on a schematic are ideal; wires on silicon have resistance and capacitance. This inverter\'s input and output pins must sit 100 µm away — and the layer and width you route with change its speed a lot.',
    ),
    objective: L('反相器的 in 接腳放在 x ≤ −100 µm、out 接腳放在 x ≥ 100 µm（負載 20 fF）。Post-layout 傳遞延遲 ≤ 100 ps。', 'Put the inverter\'s in pin at x ≤ −100 µm and its out pin at x ≥ 100 µm (20 fF load). Post-layout propagation delay ≤ 100 ps.'),
    concept: {
      title: L('Pre-sim vs. Post-sim', 'Pre-sim vs. post-sim'),
      body: L(
        '寄生抽取（PEX）把每段金屬變成電阻（R = 片電阻 × 長 / 寬）和對地、對鄰線的電容。li1 的片電阻約 12.8 Ω/□，met1 只有 0.125 Ω/□——長距離走線要用上層金屬。Post-sim 用抽取後的網表重新模擬，才是晶片真正的表現。',
        'Parasitic extraction (PEX) turns every piece of metal into resistance (R = sheet resistance × length / width) and capacitance to ground and neighbours. li1 is about 12.8 Ω/□ while met1 is only 0.125 Ω/□ — long routes belong on upper metal. Post-layout simulation reruns the circuit with the extracted network: that is how the chip really behaves.',
      ),
    },
    hints: [
      L('從第 7 章的反相器開始（教師模式可以載入）。', 'Start from your chapter-7 inverter.'),
      L('把 in、out 用長導線拉到指定位置，接腳標籤放在導線末端。', 'Run long wires out to the required positions and put the pin labels at their ends.'),
      L('比較「Post-sim」分頁裡 pre 與 post 的延遲。li1 和 met1 差多少？', 'Compare the pre and post delays in the Post-sim tab. How much do li1 and met1 differ?'),
      L('★★：met1 的電阻已經很小，延遲主要來自導線電容。把長線畫細一點（最小 0.14 µm），邊緣電容和面積電容都會變小。', '★★: met1 resistance is already tiny, so the delay now comes from wire capacitance. Draw the long wires narrower (0.14 µm minimum) to trim area and fringe capacitance.'),
    ],
    reference: inverterRef, ports: ['in', 'out', 'vdd', 'gnd'], checkBody: true, pcells: ['nmos', 'pmos', 'ptap', 'ntap'],
    bench: invBench,
    start: emptyLayout(),
    specs: [
      DRC, LVS,
      { id: 'pin-in', label: L('in 接腳在 x ≤ −100 µm', 'in pin at x ≤ −100 µm'), kind: 'pinRegion', pin: 'in', region: { x1: -100 } },
      { id: 'pin-out', label: L('out 接腳在 x ≥ 100 µm', 'out pin at x ≥ 100 µm'), kind: 'pinRegion', pin: 'out', region: { x0: 100 } },
      { id: 'tpd', label: L('Post-sim 延遲 ≤ 100 ps', 'Post-sim delay ≤ 100 ps'), kind: 'post', measure: delay, max: 100e-12, unit: 's' },
    ],
    stars: [[{ id: 'tpd2', label: L('Post-sim 延遲 ≤ 69.3 ps', 'Post-sim delay ≤ 69.3 ps'), kind: 'post', measure: delay, max: 69.3e-12, unit: 's' }]],
    solutions: [
      { stars: 0, layout: farInverter(100, 'li1') },
      { stars: 1, layout: farInverter(100, 'met1') },
      { stars: 2, layout: farInverter(100, 'met1', 140) },
    ],
  },
  {
    id: '9-2', chapter: 9, mode: 'layout', skipTest: true,
    title: L('IR drop：細細的地線', 'IR drop: a thin ground wire'),
    story: L(
      '這顆大電晶體要吸好幾 mA，但地線接腳在 40 µm 外。電流流過細長金屬線會產生壓降，源極電壓被抬高——等於自動加了一顆源極退化電阻。',
      'This big transistor sinks several mA, but its ground pin is 40 µm away. Current through a long, thin wire drops voltage and lifts the source — an unintended source-degeneration resistor.',
    ),
    objective: L('NMOS（10 個 finger，總 W = 20 µm、L = 0.5 µm），gnd 接腳放在 x ≤ −35 µm。Post-sim 的汲極電流要達到 pre-sim 的 97% 以上。', 'An NMOS (10 fingers, total W = 20 µm, L = 0.5 µm) with its gnd pin at x ≤ −35 µm. The post-layout drain current must reach at least 97% of the pre-layout value.'),
    concept: {
      title: L('IR drop 與電遷移', 'IR drop and electromigration'),
      body: L(
        'Id 流過地線電阻 R 會把源極抬高 Id·R，有效 Vgs 下降，電流變成約 Id / (1 + gm·R)。加寬金屬（R 與寬度成反比）、多放接觸窗並聯、把大電流路徑縮短，都能降低 IR drop；同時也降低電流密度，避免電遷移把金屬「吹斷」。',
        'Id through a ground resistance R lifts the source by Id·R, lowering the effective Vgs; the current becomes about Id / (1 + gm·R). Wider metal (R falls with width), parallel contacts and short high-current paths all cut IR drop — and lower the current density, which keeps electromigration from blowing the wire apart.',
      ),
    },
    hints: [
      L('用 NMOS PCell，W = 20 µm、L = 0.5 µm、nf = 10（或放 10 顆 2 µm 的單元並聯）。', 'Use an NMOS PCell with W = 20 µm, L = 0.5 µm, nf = 10 (or ten 2 µm units in parallel).'),
      L('所有源極用 met1 連起來，再拉一條 met1 到 x = −40 µm 放 gnd 標籤。', 'Join every source on met1, then run a met1 line out to x = −40 µm for the gnd label.'),
      L('0.14 µm 寬、40 µm 長的 met1 大約是 36 Ω。乘上 4.6 mA，壓降多少？把線加寬到 4 µm 以上試試；★★ 要 10 µm 左右。', 'A 0.14 µm × 40 µm met1 line is about 36 Ω. Times 4.6 mA — how big is the drop? Widen it to 4 µm or more; ★★ needs about 10 µm.'),
    ],
    reference: degRef, ports: ['d', 'g', 'gnd'], pcells: ['nmos', 'ptap'],
    bench: degBench,
    start: emptyLayout(),
    specs: [
      DRC, LVS,
      { id: 'pin-gnd', label: L('gnd 接腳在 x ≤ −35 µm', 'gnd pin at x ≤ −35 µm'), kind: 'pinRegion', pin: 'gnd', region: { x1: -35 } },
      { id: 'id', label: L('Post-sim 汲極電流 ≥ 4.50 mA（pre-sim 的 97%）', 'Post-sim drain current ≥ 4.50 mA (97% of pre-sim)'), kind: 'post', measure: { kind: 'op_i', part: 'VD' }, min: 4.499e-3, unit: 'A' },
    ],
    stars: [[{ id: 'id2', label: L('Post-sim 汲極電流 ≥ 4.53 mA（pre-sim 的 97.7%）', 'Post-sim drain current ≥ 4.53 mA (97.7% of pre-sim)'), kind: 'post', measure: { kind: 'op_i', part: 'VD' }, min: 4.53e-3, unit: 'A' }]],
    solutions: [
      { stars: 0, layout: degenerate(140) },
      { stars: 0, layout: degenerate(1000) },
      { stars: 1, layout: degenerate(4000) },
      { stars: 2, layout: degenerate(10000) },
    ],
  },
];

export const ch9: Chapter = {
  id: 9,
  title: L('第 9 章：Post-layout 模擬', 'Chapter 9: Post-layout simulation'),
  intro: L(
    '把 layout 裡的寄生電阻和電容抽出來，再模擬一次——這才是晶片真正的樣子。你會看到 pre-sim 和 post-sim 的差距，並學會修正它。',
    'Extract the parasitic resistance and capacitance of your layout and simulate again — that is what the chip will really do. See the gap between pre- and post-layout simulation, and learn to close it.',
  ),
  levels,
};
