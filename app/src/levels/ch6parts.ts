// Bandgap and LDO taught in parts. Bandgap: 6-1a CTAT, 6-1b PTAT, 6-1 assemble.
// LDO: 6-2a pass device, 6-2b DC regulation loop, 6-2 load-step response (the chapter's skip test).
import { toCircuit } from '../schematic/connectivity';
import type { Circuit, LogicalPart, Schematic } from '../schematic/types';
import { C, L, Lb, P, X, sch } from './build';
import type { IpPart, Level } from './types';

export const BANDGAP = L('能隙參考電壓', 'Bandgap reference');
export const LDO = L('低壓差穩壓器 LDO', 'Low-dropout regulator');
export const bandgapPart = (step: number): IpPart => ({ ip: BANDGAP, step, of: 3 });
export const ldoPart = (step: number): IpPart => ({ ip: LDO, step, of: 3 });

const withStart = (start: Schematic, ...player: LogicalPart[]): Circuit => C(...toCircuit(start).circuit.parts, ...player);
const tempSweep = { kind: 'dc' as const, source: 'temp', start: '-40', stop: '125', step: '5' };

// ---------------- 6-1a: CTAT ----------------
const ctatStart = sch(
  [
    P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('PNP', 'Q1', 30, 8, { m: '1' }), P('GND', 'G2', 27, 8), P('GND', 'G3', 32, 11),
  ],
  [],
  [Lb('vdd', 0, -3), Lb('e', 32, 5)],
);
const ctat = (i: string) => withStart(ctatStart, X('I', 'IE', { dc: i }, { p: 'vdd', n: 'e' }));

export const ctatLevel: Level = {
  id: '6-1a', chapter: 6, part: bandgapPart(1),
  title: L('CTAT：會隨溫度下降的電壓', 'CTAT: a voltage that falls with temperature'),
  story: L(
    '能隙參考電壓由兩個「方向相反」的溫度效應組成。第一個：雙極電晶體（PNP）的 VEB，溫度越高越小，叫 CTAT（與絕對溫度互補）。先用一個電流源把 Q1 偏壓起來，觀察它的溫度曲線。',
    'A bandgap combines two temperature effects that pull in opposite directions. The first: a bipolar transistor\'s VEB, which shrinks as temperature rises — CTAT (complementary to absolute temperature). Bias Q1 with a current source and watch its temperature curve.',
  ),
  objective: L('從 vdd 放一個電流源到 e，讓 27 °C 時 VEB = 0.70–0.80 V。看看下方 VEB 對溫度的曲線。', 'Add a current source from vdd into e so VEB = 0.70–0.80 V at 27 °C. Then look at VEB versus temperature below.'),
  concept: {
    title: L('VEB 的溫度係數', 'The temperature coefficient of VEB'),
    body: L(
      'VEB = VT·ln(I / Is)。Is 隨溫度暴增，所以 VEB 每升 1 °C 大約掉 1.5～2 mV。電流每大 10 倍，VEB 只多約 60 mV——所以偏壓電流不需要很準。',
      'VEB = VT·ln(I / Is). Is grows steeply with temperature, so VEB falls about 1.5–2 mV per °C. Ten times more current adds only about 60 mV to VEB, so the bias current needn\'t be precise.',
    ),
  },
  hints: [
    L('電流源的 p 端接 vdd、n 端接 e（電流從 p 流經電流源到 n，再流進 Q1 的射極）。', 'Current source p to vdd, n to e (current flows from p through the source to n, then into Q1\'s emitter).'),
    L('★★：把 VEB 精準調到 0.75 V ± 5 mV。電流每 ×10，VEB 約 +60 mV。', '★★: tune VEB to 0.75 V ± 5 mV. Every ×10 in current adds about 60 mV.'),
  ],
  palette: [{ kind: 'I', max: 1, params: { dc: '1u' } }],
  start: ctatStart,
  analyses: [{ kind: 'op' }, tempSweep],
  plots: [{ analysis: 'dc', node: 'e' }],
  specs: [{ id: 'veb', label: L('VEB（27 °C）', 'VEB (27 °C)'), measure: { kind: 'op_v', node: 'e' }, min: 0.70, max: 0.80, unit: 'V' }],
  stars: [[{ id: 'veb2', label: L('VEB = 0.75 V ± 5 mV', 'VEB = 0.75 V ± 5 mV'), measure: { kind: 'op_v', node: 'e' }, min: 0.745, max: 0.755, unit: 'V' }]],
  solutions: [
    { stars: 0, circuit: ctat('100n') },
    { stars: 1, circuit: ctat('1u') },
    { stars: 2, circuit: ctat('1.3u') },
  ],
};

// ---------------- 6-1b: PTAT ----------------
const ptatStart = sch(
  [
    P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('PNP', 'Q1', 30, 8, { m: '1' }), P('GND', 'G2', 27, 8), P('GND', 'G3', 32, 11),
    P('PNP', 'Q2', 44, 8, { m: '8' }), P('GND', 'G4', 41, 8), P('GND', 'G5', 46, 11),
  ],
  [],
  [Lb('vdd', 0, -3), Lb('a', 32, 5), Lb('c2', 46, 5)],
);
const ptat = (i1: string, i2: string) => withStart(ptatStart,
  X('I', 'I1', { dc: i1 }, { p: 'vdd', n: 'a' }), X('I', 'I2', { dc: i2 }, { p: 'vdd', n: 'c2' }));

export const ptatLevel: Level = {
  id: '6-1b', chapter: 6, part: bandgapPart(2),
  title: L('PTAT：會隨溫度上升的電壓', 'PTAT: a voltage that rises with temperature'),
  story: L(
    '第二個效應：兩顆 PNP，Q2 是 Q1 的 8 倍大（m = 8）。流一樣的電流時，Q2 的電流密度只有 1/8，所以 VEB 比較小。這個差值 ΔVEB 和絕對溫度成正比，叫 PTAT。',
    'The second effect: two PNPs, Q2 eight times larger than Q1 (m = 8). With equal currents Q2 runs at 1/8 the current density, so its VEB is smaller. That difference ΔVEB is proportional to absolute temperature: PTAT.',
  ),
  objective: L('給 Q1、Q2 各一個電流源，讓 ΔVEB = V(a) − V(c2) 落在 54–66 mV。', 'Give Q1 and Q2 one current source each so ΔVEB = V(a) − V(c2) is 54–66 mV.'),
  concept: {
    title: L('ΔVEB = VT·ln(N)', 'ΔVEB = VT·ln(N)'),
    body: L(
      '兩顆電晶體電流相同、面積比 N 時，ΔVEB = VT·ln(N)，和 Is 無關。VT = kT/q 在 27 °C 約 25.9 mV，ln 8 ≈ 2.08，所以 ΔVEB ≈ 54 mV，而且每升 1 °C 增加約 0.18 mV。',
      'With equal currents and an area ratio N, ΔVEB = VT·ln(N), independent of Is. VT = kT/q ≈ 25.9 mV at 27 °C and ln 8 ≈ 2.08, so ΔVEB ≈ 54 mV, rising about 0.18 mV per °C.',
    ),
  },
  hints: [
    L('兩個電流源都從 vdd 出發，一個進 a、一個進 c2。', 'Both current sources start at vdd: one into a, one into c2.'),
    L('兩邊電流不一樣時，電流比也會進到 ln 裡：ΔVEB = VT·ln(8·I1/I2)。', 'With unequal currents their ratio enters the ln too: ΔVEB = VT·ln(8·I1/I2).'),
    L('★★：真實的電晶體有射極、基極串聯電阻，電流大時會多出一點壓降。電流相等、而且小到 1 µA 左右，才會接近理想的 54 mV。', '★★: real transistors have series emitter and base resistance that adds a little drop at high current. Equal currents of about 1 µA bring ΔVEB close to the ideal 54 mV.'),
  ],
  palette: [{ kind: 'I', max: 2, params: { dc: '5u' } }],
  start: ptatStart,
  analyses: [{ kind: 'op' }, tempSweep],
  plots: [{ analysis: 'dc', node: 'a' }, { analysis: 'dc', node: 'c2' }],
  specs: [{ id: 'dv', label: L('ΔVEB（27 °C）', 'ΔVEB (27 °C)'), measure: { kind: 'op_vdiff', pos: 'a', neg: 'c2' }, min: 0.054, max: 0.066, unit: 'V' }],
  stars: [[{ id: 'dv2', label: L('接近理想值：ΔVEB = 55–58 mV', 'Close to ideal: ΔVEB = 55–58 mV'), measure: { kind: 'op_vdiff', pos: 'a', neg: 'c2' }, min: 0.055, max: 0.058, unit: 'V' }]],
  solutions: [
    { stars: 0, circuit: ptat('5u', '1u') },
    { stars: 1, circuit: ptat('5u', '4.4u') },
    { stars: 1, circuit: ptat('5u', '5u') },
    { stars: 2, circuit: ptat('1u', '1u') },
  ],
};

// ---------------- 6-2a: the pass device ----------------
const passStart = sch(
  [
    P('V', 'VIN', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('V', 'VG', -10, 0, { dc: '0' }), P('GND', 'G2', -10, 3),
    P('I', 'ILOAD', 40, 4, { dc: '10m' }), P('GND', 'G3', 40, 7),
  ],
  [],
  [Lb('vin', 0, -3), Lb('vg', -10, -3), Lb('out', 40, 1)],
);
const pass = (w: string, nf: string) => withStart(passStart, X('PFET', 'MPASS', { w, l: '0.15u', nf }, { d: 'out', g: 'vg', s: 'vin', b: 'vin' }));

export const passLevel: Level = {
  id: '6-2a', chapter: 6, part: ldoPart(1),
  title: L('傳輸管：最後的閥門', 'The pass device: the final valve'),
  story: L(
    'LDO 的核心是一顆大 PMOS「傳輸管」，像水龍頭一樣控制從 vin 流到 out 的電流。這一關閘極已經拉到 0 V（全開），負載要 10 mA。PMOS 夠大，壓降（dropout）才會小。',
    'At the heart of an LDO is a large PMOS pass device, a tap controlling the current from vin to out. Here its gate is pulled to 0 V (fully on) and the load draws 10 mA. Only a large enough PMOS keeps the dropout small.',
  ),
  objective: L('放一顆 PFET（源極 vin、閘極 vg、汲極 out），供 10 mA 時 out ≥ 1.5 V（壓降 ≤ 0.3 V）。', 'Place a PFET (source vin, gate vg, drain out) so out ≥ 1.5 V at 10 mA (dropout ≤ 0.3 V).'),
  concept: {
    title: L('壓降與閘極電容', 'Dropout and gate capacitance'),
    body: L(
      '全開的 PMOS 像一顆電阻 R_on ∝ L / W，壓降 = I × R_on。W 越大壓降越小，但閘極電容也越大，誤差放大器要推動它就越慢——這就是 LDO 速度和效率的取捨。慢速 corner、低溫時 PMOS 最弱。',
      'A fully-on PMOS acts like a resistor R_on ∝ L / W, and the dropout is I × R_on. A wider device drops less but has more gate capacitance, so the error amplifier drives it more slowly: the LDO\'s speed/efficiency trade-off. The PMOS is weakest at the slow corners and low temperature.',
    ),
  },
  hints: [
    L('先試 W = 50 µm，看 out 是多少，再決定要放大幾倍。', 'Try W = 50 µm first, read out, then decide how much bigger you need.'),
    L('★★ 要在所有 corner 都過：看「Corner / MC」分頁哪個最差。★★★ 再把總 W 壓到 180 µm 以下——用 nf 分成多個 finger 不會改變總 W。', '★★ must pass at every corner: check the "Corners / MC" tab for the worst. ★★★ also keeps the total W at or below 180 µm — splitting into fingers (nf) does not change the total W.'),
  ],
  palette: [{ kind: 'PFET', max: 1, params: { w: '20u', l: '0.15u', nf: '1' } }],
  start: passStart,
  analyses: [{ kind: 'op' }],
  sweep: { corners: ['ss', 'sf'], temps: [-40, 125] },
  specs: [{ id: 'out', label: L('out（10 mA）', 'out (10 mA)'), measure: { kind: 'op_v', node: 'out' }, min: 1.5, unit: 'V' }],
  stars: [
    [{ id: 'outpvt', label: L('所有 corner：out ≥ 1.5 V', 'All corners: out ≥ 1.5 V'), measure: { kind: 'op_v', node: 'out' }, min: 1.5, unit: 'V', over: 'pvt' }],
    [{ id: 'w', label: L('總寬度 W ≤ 180 µm', 'Total width W ≤ 180 µm'), measure: { kind: 'param_sum', partKind: 'PFET', key: 'w' }, max: 180e-6, unit: 'm' }],
  ],
  solutions: [
    { stars: 0, circuit: pass('20u', '1') },
    { stars: 0, circuit: pass('60u', '2') },
    { stars: 1, circuit: pass('120u', '4') },
    { stars: 2, circuit: pass('250u', '4') },
    { stars: 3, circuit: pass('180u', '4') },
  ],
};

// ---------------- 6-2b: the DC regulation loop ----------------
const loopStart = sch(
  [
    P('V', 'VIN', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('V', 'VREF', -10, 0, { dc: '0.9' }), P('GND', 'G2', -10, 3),
    P('PFET', 'MPASS', 20, -6, { w: '200u', l: '0.15u', nf: '4' }),
    P('I', 'ILOAD', 40, 4, { dc: '1m' }), P('GND', 'G3', 40, 7),
    P('C', 'CL', 48, 4, { value: '1u' }), P('GND', 'G4', 48, 7),
  ],
  [],
  [Lb('vin', 0, -3), Lb('vref', -10, -3), Lb('vin', 22, -9), Lb('vg', 17, -6), Lb('out', 22, -3), Lb('out', 40, 1), Lb('out', 48, 1)],
);
const loop = (a0: string, r1 = '100k', r2 = '300k') => withStart(loopStart,
  X('OPAMP', 'U1', { a0, gbw: '10meg', vmin: '0', vmax: '1.8', rout: '1meg' }, { inp: 'fb', inn: 'vref', out: 'vg' }),
  X('R', 'R1', { value: r1 }, { p: 'out', n: 'fb' }), X('R', 'R2', { value: r2 }, { p: 'fb', n: '0' }));

export const loopLevel: Level = {
  id: '6-2b', chapter: 6, part: ldoPart(2),
  title: L('回授迴路：自動穩住電壓', 'The feedback loop: holding the voltage'),
  story: L(
    '傳輸管準備好了。現在加上「大腦」：分壓電阻把 out 縮小成 fb，誤差放大器比較 fb 和 0.9 V 的參考電壓，自動調整傳輸管的閘極，讓 out 剛好 1.2 V。',
    'The pass device is ready. Now add the brain: a divider scales out down to fb, and the error amplifier compares fb with the 0.9 V reference and adjusts the pass device\'s gate until out is exactly 1.2 V.',
  ),
  objective: L('放入誤差放大器和兩顆分壓電阻，讓 out = 1.2 V（±10 mV）。', 'Add the error amplifier and a two-resistor divider so out = 1.2 V (±10 mV).'),
  concept: {
    title: L('負回授與迴路增益', 'Negative feedback and loop gain'),
    body: L(
      '穩態時 fb ≈ vref，所以 Vout = Vref × (1 + R1/R2)。殘留誤差約為 1 /（迴路增益），迴路增益 ≈ A0 × R2/(R1+R2) × 傳輸管增益。極性很重要：PMOS 是反相的，所以運放的 + 端接 fb、− 端接 vref，整個迴路才是負回授。',
      'In steady state fb ≈ vref, so Vout = Vref × (1 + R1/R2). The residual error is about 1 / (loop gain), with loop gain ≈ A0 × R2/(R1+R2) × the pass device\'s gain. Polarity matters: the PMOS inverts, so the op-amp\'s + input takes fb and − takes vref, making the whole loop negative feedback.',
    ),
  },
  hints: [
    L('1.2 / 0.9 = 1 + R1/R2，所以 R1 : R2 = 1 : 3。', '1.2 / 0.9 = 1 + R1/R2, so R1 : R2 = 1 : 3.'),
    L('運放：+ 接 fb、− 接 vref、輸出接 vg。接反了會變正回授，out 會衝到極端值。', 'Op-amp: + to fb, − to vref, output to vg. Swap them and the loop turns positive: out slams to a rail.'),
    L('預設 A0 = 100 的運放，迴路增益不夠，誤差約 12 mV——雙擊運放把 A0 調大。★★ 的 2 mV 大約要 A0 ≥ 1k。', 'With the default A0 = 100 the loop gain is too low and the error is about 12 mV: double-click the op-amp and raise A0. The ★★ 2 mV needs roughly A0 ≥ 1k.'),
  ],
  palette: [
    { kind: 'OPAMP', max: 1, params: { a0: '100', gbw: '10meg', vmin: '0', vmax: '1.8', rout: '1meg' }, lockedParams: ['vmin', 'vmax', 'rout'] },
    { kind: 'R', max: 2, params: { value: '100k' } },
  ],
  start: loopStart,
  analyses: [{ kind: 'op' }],
  specs: [{ id: 'vout', label: L('輸出電壓', 'Output voltage'), measure: { kind: 'op_v', node: 'out' }, min: 1.19, max: 1.21, unit: 'V' }],
  stars: [[{ id: 'vout2', label: L('誤差 ≤ 2 mV', 'Error ≤ 2 mV'), measure: { kind: 'op_v', node: 'out' }, min: 1.198, max: 1.202, unit: 'V' }]],
  solutions: [
    { stars: 0, circuit: loop('10k', '100k', '200k') },
    { stars: 0, circuit: loop('100') },
    { stars: 1, circuit: loop('300') },
    { stars: 2, circuit: loop('1k') },
  ],
};
