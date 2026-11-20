import { C, L, Lb, P, X, sch } from './build';
import type { Chapter } from './types';

// Shared test bench pieces (SKY130, 1.8 V)
const supply = () => [P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3)];
const diffInputs = (dc = '0.9') => [
  P('V', 'VIP', -10, 0, { dc, ac: '0.5' }), P('GND', 'G2', -10, 3),
  P('V', 'VIN', -20, 0, { dc, ac: '0.5 180' }), P('GND', 'G3', -20, 3),
];
const benchLabels = () => [Lb('vdd', 0, -3), Lb('inp', -10, -3), Lb('inn', -20, -3)];

// Logical test bench for reference solutions
const tbSupply = () => [X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' })];
const tbDiff = (dc = '0.9') => [
  X('V', 'VIP', { dc, ac: '0.5' }, { p: 'inp', n: '0' }),
  X('V', 'VIN', { dc, ac: '0.5 180' }, { p: 'inn', n: '0' }),
];
const N = (name: string, w: string, l: string, d: string, g: string, s: string) =>
  X('NFET', name, { w, l, nf: '1' }, { d, g, s, b: '0' });
const Pf = (name: string, w: string, l: string, d: string, g: string, s: string) =>
  X('PFET', name, { w, l, nf: '1' }, { d, g, s, b: 'vdd' });

/** 5T OTA core: M1 (inp side, diode load), M2 (output side). */
export const ota5t = (o: { win: string; lin: string; wl: string; ll: string; wt: string; lt: string; inp: string; inn: string; out: string }) => [
  N('M6', o.wt, o.lt, 'nbias', 'nbias', '0'),
  N('M5', o.wt, o.lt, 'tail', 'nbias', '0'),
  N('M1', o.win, o.lin, 'x', o.inp, 'tail'),
  N('M2', o.win, o.lin, o.out, o.inn, 'tail'),
  Pf('M3', o.wl, o.ll, 'x', 'x', 'vdd'),
  Pf('M4', o.wl, o.ll, o.out, 'x', 'vdd'),
];

const otaBench = () => [
  ...tbSupply(), ...tbDiff(),
  X('I', 'IB', { dc: '20u' }, { p: 'vdd', n: 'nbias' }),
  X('C', 'CL', { value: '1p' }, { p: 'out', n: '0' }),
];

export const ch4: Chapter = {
  id: 4,
  title: L('第 4 章：差動電路', 'Chapter 4: Differential circuits'),
  intro: L(
    '從這章開始全面使用真實的 SKY130 元件。差動對只放大兩個輸入的「差」，對共同的雜訊免疫；再加上電流鏡負載，就是第一顆運算轉導放大器（OTA）。最後，你會第一次面對製程變異：corner 與 Monte Carlo。',
    'From here on everything uses real SKY130 devices. A differential pair amplifies only the difference of its inputs and ignores common noise; add a current-mirror load and you have your first operational transconductance amplifier (OTA). Finally you will face process variation: corners and Monte Carlo.',
  ),
  levels: [
    {
      id: '4-1', chapter: 4,
      title: L('差動對', 'Differential pair'),
      story: L(
        '兩顆一模一樣的電晶體共用一個尾電流源：一邊多拿一點電流，另一邊就少一點。這個「蹺蹺板」是所有運放的心臟。',
        'Two identical transistors share one tail current: if one side takes more, the other gets less. This see-saw is the heart of every op-amp.',
      ),
      objective: L('用兩顆 NFET 和兩顆負載電阻做出差動放大器：差動增益 ≥ 12 dB，outp 偏壓 0.9–1.6 V。', 'Build a differential amplifier from two NFETs and two load resistors: differential gain ≥ 12 dB, outp biased at 0.9–1.6 V.'),
      concept: {
        title: L('差動增益與共模拒斥', 'Differential gain and common-mode rejection'),
        body: L(
          '差動增益 Ad = gm·RD；輸入兩端同時上升（共模）時，尾電流固定，輸出幾乎不動。輸入兩端的 AC 訊號相位相反（0° 和 180°），所以 outp − outn 才是我們要的訊號。',
          'Differential gain Ad = gm·RD. When both inputs move together (common mode) the tail current is fixed, so the outputs barely move. The two inputs carry opposite-phase AC (0° and 180°), so outp − outn is the signal we want.',
        ),
      },
      hints: [
        L('M1：閘極 inp、汲極 outn、源極 tail；M2：閘極 inn、汲極 outp、源極 tail。兩顆電阻從 vdd 接到 outp、outn。', 'M1: gate inp, drain outn, source tail. M2: gate inn, drain outp, source tail. Two resistors from vdd to outp and outn.'),
        L('每邊電流 10 µA。電阻 40 kΩ 會讓輸出掉 0.4 V。', 'Each side carries 10 µA; a 40 kΩ resistor drops 0.4 V.'),
        L('★★：增益 ≈ gm·R。電阻越大增益越高，但輸出偏壓不能低於 0.9 V。', '★★: gain ≈ gm·R. A larger resistor gives more gain, but the output must stay above 0.9 V.'),
      ],
      palette: [{ kind: 'NFET', max: 2, params: { w: '10u', l: '1u' } }, { kind: 'R', max: 2, params: { value: '40k' } }],
      start: sch(
        [...supply(), ...diffInputs(), P('I', 'ITAIL', 30, 10, { dc: '20u' }), P('GND', 'G4', 30, 13)],
        [],
        [...benchLabels(), Lb('tail', 30, 7), Lb('outn', 24, -8), Lb('outp', 36, -8)],
      ),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }],
      plots: [{ analysis: 'ac', node: 'outp', show: 'db' }, { analysis: 'ac', node: 'outn', show: 'db' }],
      specs: [
        { id: 'ad', label: L('差動增益（1 kHz）', 'Differential gain (1 kHz)'), measure: { kind: 'ac_diff_gain_db', pos: 'outp', neg: 'outn', freq: 1e3 }, min: 12, unit: 'dB' },
        { id: 'vo', label: L('outp 偏壓', 'outp bias'), measure: { kind: 'op_v', node: 'outp' }, min: 0.9, max: 1.6, unit: 'V' },
      ],
      stars: [[{ id: 'ad20', label: L('差動增益 ≥ 20 dB', 'Differential gain ≥ 20 dB'), measure: { kind: 'ac_diff_gain_db', pos: 'outp', neg: 'outn', freq: 1e3 }, min: 20, unit: 'dB' }]],
      solutions: [
        { stars: 1, circuit: C(...tbSupply(), ...tbDiff(), X('I', 'ITAIL', { dc: '20u' }, { p: 'tail', n: '0' }),
          N('M1', '10u', '1u', 'outn', 'inp', 'tail'), N('M2', '10u', '1u', 'outp', 'inn', 'tail'),
          X('R', 'R1', { value: '40k' }, { p: 'vdd', n: 'outn' }), X('R', 'R2', { value: '40k' }, { p: 'vdd', n: 'outp' })) },
        { stars: 2, circuit: C(...tbSupply(), ...tbDiff(), X('I', 'ITAIL', { dc: '20u' }, { p: 'tail', n: '0' }),
          N('M1', '10u', '1u', 'outn', 'inp', 'tail'), N('M2', '10u', '1u', 'outp', 'inn', 'tail'),
          X('R', 'R1', { value: '75k' }, { p: 'vdd', n: 'outn' }), X('R', 'R2', { value: '75k' }, { p: 'vdd', n: 'outp' })) },
      ],
    },
    {
      id: '4-2', chapter: 4,
      title: L('五顆電晶體的 OTA', 'The five-transistor OTA'),
      story: L(
        '把負載電阻換成 PMOS 電流鏡：兩邊的電流變化被「摺」到同一個輸出，增益一下子大了好幾倍。這就是最經典的 5T OTA。',
        'Replace the load resistors with a PMOS current mirror: both sides\' current changes are folded onto one output, and the gain jumps several-fold. This is the classic 5T OTA.',
      ),
      objective: L('用 SKY130 做出 5T OTA（含尾電流鏡）：直流增益 ≥ 30 dB，單位增益頻寬 ≥ 10 MHz（負載 1 pF）。', 'Build a SKY130 5T OTA (with its tail current mirror): DC gain ≥ 30 dB and unity-gain bandwidth ≥ 10 MHz with a 1 pF load.'),
      concept: {
        title: L('增益、頻寬與 corner', 'Gain, bandwidth and corners'),
        body: L(
          'A0 = gm1·(ro2 ∥ ro4)，UGB = gm1 / (2π·CL)。L 加長讓 ro 變大、增益變高，但寄生電容也變大。晶圓廠的電晶體不會每片都一樣：ff/ss/sf/fs corner 加上 −40～125 °C，設計要在每個角落都過規格。',
          'A0 = gm1·(ro2 ∥ ro4) and UGB = gm1 / (2π·CL). Longer L raises ro and gain but adds parasitic capacitance. Fabricated transistors vary wafer to wafer: the ff/ss/sf/fs corners plus −40 to 125 °C — a design must meet specs at every corner.',
        ),
      },
      hints: [
        L('偏壓：M6 二極體接法（閘極＝汲極＝nbias），M5 閘極也接 nbias、汲極是 tail。', 'Bias: diode-connect M6 (gate = drain = nbias); M5 gate on nbias, drain is tail.'),
        L('輸入對 M1（inp）、M2（inn）源極接 tail。PFET 電流鏡：M3 二極體接法接在 M1 汲極，M4 的汲極就是 out。PFET 的基極（右邊腳）接 vdd。', 'Input pair M1 (inp) and M2 (inn), sources on tail. PFET mirror: diode-connect M3 on M1\'s drain; M4\'s drain is out. Tie PFET bodies (right pin) to vdd.'),
        L('★★：把輸入對與負載的 L 從 0.5 µm 拉長到 1 µm 以上。★★★：看下方「Corner / MC」分頁哪個 corner 最差。', '★★: lengthen the input pair and load L from 0.5 µm to 1 µm or more. ★★★: check the "Corners / MC" tab to see which corner is worst.'),
      ],
      palette: [{ kind: 'NFET', max: 4, params: { w: '4u', l: '1u' } }, { kind: 'PFET', max: 2, params: { w: '4u', l: '1u' } }],
      start: sch(
        [...supply(), ...diffInputs(), P('I', 'IB', 10, -10, { dc: '20u' }), P('C', 'CL', 50, 4, { value: '1p' }), P('GND', 'G4', 50, 7)],
        [],
        [...benchLabels(), Lb('vdd', 10, -13), Lb('nbias', 10, -7), Lb('out', 50, 1)],
      ),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }],
      sweep: { corners: ['ff', 'ss', 'sf', 'fs'], temps: [-40, 125] },
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
      specs: [
        { id: 'a0', label: L('直流增益 A0', 'DC gain A0'), measure: { kind: 'ac_gain_db', node: 'out', freq: 10 }, min: 30, unit: 'dB' },
        { id: 'ugb', label: L('單位增益頻寬', 'Unity-gain bandwidth'), measure: { kind: 'ac_ugb', node: 'out' }, min: 10e6, unit: 'Hz' },
      ],
      stars: [
        [{ id: 'a040', label: L('A0 ≥ 40 dB', 'A0 ≥ 40 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 10 }, min: 40, unit: 'dB' }],
        [
          { id: 'a0pvt', label: L('所有 corner：A0 ≥ 36 dB', 'All corners: A0 ≥ 36 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 10 }, min: 36, unit: 'dB', over: 'pvt' },
          { id: 'ugbpvt', label: L('所有 corner：UGB ≥ 15 MHz', 'All corners: UGB ≥ 15 MHz'), measure: { kind: 'ac_ugb', node: 'out' }, min: 15e6, unit: 'Hz', over: 'pvt' },
        ],
      ],
      solutions: [
        { stars: 1, circuit: C(...otaBench(), ...ota5t({ win: '4u', lin: '0.5u', wl: '4u', ll: '0.5u', wt: '4u', lt: '1u', inp: 'inp', inn: 'inn', out: 'out' })) },
        { stars: 3, circuit: C(...otaBench(), ...ota5t({ win: '8u', lin: '1u', wl: '4u', ll: '1u', wt: '4u', lt: '1u', inp: 'inp', inn: 'inn', out: 'out' })) },
      ],
    },
    {
      id: '4-3', chapter: 4, skipTest: true,
      title: L('Monte Carlo：沒有兩顆電晶體一樣', 'Monte Carlo: no two transistors alike'),
      story: L(
        '同一片晶圓上、緊鄰的兩顆電晶體，臨界電壓也會差幾 mV。這讓你的 OTA 產生「偏移電壓」。客戶要求：量產時 99.7% 的晶片偏移都要小於 6 mV。',
        'Even two neighbouring transistors on the same wafer differ in threshold by a few mV. That gives your OTA an offset voltage. The customer requires 99.7% of production chips to have less than 6 mV offset.',
      ),
      objective: L('把 OTA 接成單位增益緩衝器（out 接回 inn）。在 30 次 Monte Carlo 中，|μ| + 3σ 偏移 ≤ 6 mV。', 'Connect your OTA as a unity-gain buffer (out back to inn). Over 30 Monte Carlo runs, the offset |μ| + 3σ must be ≤ 6 mV.'),
      concept: {
        title: L('Pelgrom 定律', 'Pelgrom\'s law'),
        body: L(
          'σ(ΔVth) = AVT / √(W·L)。SKY130 NFET 的 AVT ≈ 3.4 mV·µm。面積大 4 倍，偏移只減少一半——匹配是用晶片面積換來的。輸入對最重要，負載電流鏡的不匹配也會被除以 gm1/gm3 反映到輸入端。',
          'σ(ΔVth) = AVT / √(W·L). SKY130 NFETs have AVT ≈ 3.4 mV·µm. Four times the area only halves the offset — matching is paid for in silicon area. The input pair matters most; load-mirror mismatch is referred to the input scaled by gm3/gm1.',
        ),
      },
      hints: [
        L('緩衝器：M1 閘極接 inp，M2 閘極接 out（M2 的汲極也是 out）。這樣才是負回授。', 'Buffer: M1 gate on inp, M2 gate on out (M2\'s drain is out too). That makes it negative feedback.'),
        L('跑完看「Corner / MC」分頁的直方圖。σ 跟 1/√(W·L) 成正比。', 'Check the histogram in the "Corners / MC" tab. σ scales with 1/√(W·L).'),
        L('試試輸入對 W = 40 µm、L = 2 µm，PFET 負載也加大。', 'Try an input pair with W = 40 µm, L = 2 µm, and enlarge the PFET load too.'),
      ],
      palette: [{ kind: 'NFET', max: 4, params: { w: '4u', l: '0.5u' } }, { kind: 'PFET', max: 2, params: { w: '4u', l: '0.5u' } }],
      start: sch(
        [...supply(), P('V', 'VIP', -10, 0, { dc: '0.9' }), P('GND', 'G2', -10, 3), P('I', 'IB', 10, -10, { dc: '20u' }), P('C', 'CL', 50, 4, { value: '1p' }), P('GND', 'G4', 50, 7)],
        [],
        [Lb('vdd', 0, -3), Lb('inp', -10, -3), Lb('vdd', 10, -13), Lb('nbias', 10, -7), Lb('out', 50, 1)],
      ),
      analyses: [{ kind: 'op' }],
      sweep: { mc: 30 },
      specs: [
        { id: 'vos', label: L('標稱偏移', 'Nominal offset'), measure: { kind: 'op_vdiff', pos: 'out', neg: 'inp' }, min: -5e-3, max: 5e-3, unit: 'V' },
        { id: 'mc', label: L('偏移 |μ|+3σ', 'Offset |μ|+3σ'), measure: { kind: 'op_vdiff', pos: 'out', neg: 'inp' }, max: 6e-3, unit: 'V', over: 'mc', stat: 'abs3sigma' },
      ],
      stars: [[{ id: 'mc3', label: L('偏移 |μ|+3σ ≤ 4 mV', 'Offset |μ|+3σ ≤ 4 mV'), measure: { kind: 'op_vdiff', pos: 'out', neg: 'inp' }, max: 4e-3, unit: 'V', over: 'mc', stat: 'abs3sigma' }]],
      solutions: [
        { stars: 0, circuit: C(...tbSupply(), X('V', 'VIP', { dc: '0.9' }, { p: 'inp', n: '0' }), X('I', 'IB', { dc: '20u' }, { p: 'vdd', n: 'nbias' }), X('C', 'CL', { value: '1p' }, { p: 'out', n: '0' }),
          ...ota5t({ win: '4u', lin: '0.5u', wl: '4u', ll: '0.5u', wt: '4u', lt: '1u', inp: 'inp', inn: 'out', out: 'out' })) },
        { stars: 1, circuit: C(...tbSupply(), X('V', 'VIP', { dc: '0.9' }, { p: 'inp', n: '0' }), X('I', 'IB', { dc: '20u' }, { p: 'vdd', n: 'nbias' }), X('C', 'CL', { value: '1p' }, { p: 'out', n: '0' }),
          ...ota5t({ win: '20u', lin: '1u', wl: '10u', ll: '2u', wt: '4u', lt: '1u', inp: 'inp', inn: 'out', out: 'out' })) },
        { stars: 2, circuit: C(...tbSupply(), X('V', 'VIP', { dc: '0.9' }, { p: 'inp', n: '0' }), X('I', 'IB', { dc: '20u' }, { p: 'vdd', n: 'nbias' }), X('C', 'CL', { value: '1p' }, { p: 'out', n: '0' }),
          ...ota5t({ win: '40u', lin: '2u', wl: '20u', ll: '4u', wt: '4u', lt: '1u', inp: 'inp', inn: 'out', out: 'out' })) },
      ],
    },
  ],
};
