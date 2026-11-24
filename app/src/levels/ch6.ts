import { C, L, Lb, P, W, X, sch } from './build';
import type { LogicalPart } from '../schematic/types';
import type { Chapter } from './types';
import { bandgapPart, ctatLevel, ldoPart, loopLevel, passLevel, ptatLevel } from './ch6parts';

// ---------------- Bandgap ----------------
const pf = (name: string, x: number, y: number) => P('PFET', name, x, y, { w: '4u', l: '2u', nf: '1' });
const bgStart = sch(
  [
    P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('OPAMP', 'U1', 14, -16, { a0: '10k', gbw: '10meg', vmin: '0', vmax: '1.8' }),
    pf('MP1', 30, -4), pf('MP2', 44, -4), pf('MP3', 58, -4),
    P('PNP', 'Q1', 30, 8, { m: '1' }), P('GND', 'G2', 27, 8), P('GND', 'G3', 32, 11),
    P('PNP', 'Q2', 44, 12, { m: '8' }), P('GND', 'G4', 41, 12), P('GND', 'G5', 46, 15),
    P('PNP', 'Q3', 58, 12, { m: '1' }), P('GND', 'G6', 55, 12), P('GND', 'G7', 60, 15),
  ],
  [W(32, -1, 32, 5)],
  [
    Lb('vdd', 0, -3),
    Lb('b', 10, -18), Lb('a', 10, -14), Lb('vg', 18, -16),
    Lb('vdd', 32, -7), Lb('vdd', 32, -4), Lb('vg', 27, -4), Lb('a', 32, 2),
    Lb('vdd', 46, -7), Lb('vdd', 46, -4), Lb('vg', 41, -4), Lb('b', 46, -1), Lb('c2', 46, 9),
    Lb('vdd', 60, -7), Lb('vdd', 60, -4), Lb('vg', 55, -4), Lb('vref', 60, -1), Lb('d3', 60, 9),
  ],
);
const bgCore = (): LogicalPart[] => [
  X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }),
  X('OPAMP', 'U1', { a0: '10k', gbw: '10meg', vmin: '0', vmax: '1.8' }, { inp: 'b', inn: 'a', out: 'vg' }),
  X('PFET', 'MP1', { w: '4u', l: '2u', nf: '1' }, { d: 'a', g: 'vg', s: 'vdd', b: 'vdd' }),
  X('PFET', 'MP2', { w: '4u', l: '2u', nf: '1' }, { d: 'b', g: 'vg', s: 'vdd', b: 'vdd' }),
  X('PFET', 'MP3', { w: '4u', l: '2u', nf: '1' }, { d: 'vref', g: 'vg', s: 'vdd', b: 'vdd' }),
  X('PNP', 'Q1', { m: '1' }, { e: 'a', b: '0', c: '0' }),
  X('PNP', 'Q2', { m: '8' }, { e: 'c2', b: '0', c: '0' }),
  X('PNP', 'Q3', { m: '1' }, { e: 'd3', b: '0', c: '0' }),
];
const bg = (r1: string, r2: string) => C(...bgCore(),
  X('R', 'R1', { value: r1 }, { p: 'b', n: 'c2' }), X('R', 'R2', { value: r2 }, { p: 'vref', n: 'd3' }));

// ---------------- LDO ----------------
const LOAD_STEP = 'PULSE(1m 10m 20u 0.1u 0.1u 40u 200u)';
const ldoStart = sch(
  [
    P('V', 'VIN', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('V', 'VREF', -10, 0, { dc: '0.9' }), P('GND', 'G2', -10, 3),
    P('I', 'ILOAD', 40, 4, { dc: '1m', tran: LOAD_STEP }), P('GND', 'G3', 40, 7),
    P('C', 'CL', 48, 4, { value: '1u' }), P('GND', 'G4', 48, 7),
  ],
  [W(40, 1, 48, 1)],
  [Lb('vin', 0, -3), Lb('vref', -10, -3), Lb('out', 44, 1)],
);
const ldo = (a0: string, gbw = '10meg', w = '200u', nf = '4'): LogicalPart[] => [
  X('V', 'VIN', { dc: '1.8' }, { p: 'vin', n: '0' }),
  X('V', 'VREF', { dc: '0.9' }, { p: 'vref', n: '0' }),
  X('I', 'ILOAD', { dc: '1m', tran: LOAD_STEP }, { p: 'out', n: '0' }),
  X('C', 'CL', { value: '1u' }, { p: 'out', n: '0' }),
  X('PFET', 'MPASS', { w, l: '0.15u', nf }, { d: 'out', g: 'vg', s: 'vin', b: 'vin' }),
  X('OPAMP', 'U1', { a0, gbw, vmin: '0', vmax: '1.8', rout: '1meg' }, { inp: 'fb', inn: 'vref', out: 'vg' }),
  X('R', 'R1', { value: '100k' }, { p: 'out', n: 'fb' }),
  X('R', 'R2', { value: '300k' }, { p: 'fb', n: '0' }),
];

export const ch6: Chapter = {
  id: 6,
  title: L('第 6 章：類比 IP', 'Chapter 6: Analog IP'),
  intro: L(
    '每顆晶片都需要穩定的參考電壓和乾淨的電源。這章你要設計兩個真正的產品級 IP：不怕溫度變化的能隙參考電壓（Bandgap），以及負載突然變化也撐得住的低壓差穩壓器（LDO）。',
    'Every chip needs a stable reference voltage and a clean supply. In this chapter you design two real product-grade IPs: a bandgap reference that shrugs off temperature, and a low-dropout regulator (LDO) that survives sudden load changes.',
  ),
  levels: [
    ctatLevel,
    ptatLevel,
    {
      id: '6-1', chapter: 6, part: bandgapPart(3),
      title: L('能隙參考電壓', 'Bandgap reference'),
      story: L(
        '二極體電壓隨溫度下降（CTAT），兩顆不同大小二極體的電壓差隨溫度上升（PTAT）。把兩者用對的比例加起來，就得到一個從 −40 °C 到 125 °C 幾乎不變的電壓。電路已經幫你搭好了，只差兩顆電阻。',
        'A diode voltage falls with temperature (CTAT); the voltage difference between two differently-sized diodes rises with it (PTAT). Add them in the right ratio and you get a voltage that barely moves from −40 °C to 125 °C. The circuit is built — it only needs two resistors.',
      ),
      objective: L('放入 R1（b → c2）與 R2（vref → d3）：Vref 在 1.10–1.25 V，溫度係數 ≤ 100 ppm/°C（−40～125 °C）。', 'Add R1 (b → c2) and R2 (vref → d3): Vref within 1.10–1.25 V and a temperature coefficient ≤ 100 ppm/°C from −40 to 125 °C.'),
      concept: {
        title: L('PTAT + CTAT = 零溫度係數', 'PTAT + CTAT = zero tempco'),
        body: L(
          '運放讓 a、b 兩點等電位，所以 R1 上的電壓是 ΔVEB = VT·ln(8)，電流 I = VT·ln8 / R1 和絕對溫度成正比。Vref = VEB3 + (R2/R1)·VT·ln8：VEB 每度掉約 1.6 mV，PTAT 項每度升 (R2/R1)·0.18 mV，比例約 6～9 時剛好抵消，剩下的「碗形」曲率來自 VEB 的非線性。',
          'The op-amp forces nodes a and b equal, so R1 carries ΔVEB = VT·ln(8) and I = VT·ln8 / R1 is proportional to absolute temperature. Vref = VEB3 + (R2/R1)·VT·ln8: VEB falls ~1.6 mV/°C while the PTAT term rises (R2/R1)·0.18 mV/°C, so a ratio of about 6–9 cancels it; the remaining bowl-shaped curvature comes from VEB\'s nonlinearity.',
        ),
      },
      hints: [
        L('先放 R1 = 10 kΩ（電流約 5 µA），再試 R2。下方波形會畫出 Vref 對溫度的曲線。', 'Start with R1 = 10 kΩ (about 5 µA), then try R2. The waveform panel plots Vref against temperature.'),
        L('曲線往上翹（PTAT 太多）就把 R2 調小，往下掉就調大。', 'If the curve tilts up (too much PTAT) make R2 smaller; if it tilts down make it larger.'),
        L('R2/R1 ≈ 6 附近會找到最平的「碗底」。', 'Around R2/R1 ≈ 6 you will find the flattest bowl.'),
      ],
      palette: [{ kind: 'R', max: 2, params: { value: '10k' } }],
      start: bgStart,
      analyses: [{ kind: 'op' }, { kind: 'dc', source: 'temp', start: '-40', stop: '125', step: '5' }],
      sweep: { corners: ['ff', 'ss', 'sf', 'fs'] },
      plots: [{ analysis: 'dc', node: 'vref' }],
      specs: [
        { id: 'vref', label: L('Vref（27 °C）', 'Vref (27 °C)'), measure: { kind: 'op_v', node: 'vref' }, min: 1.1, max: 1.25, unit: 'V' },
        { id: 'tc', label: L('溫度係數', 'Temperature coefficient'), measure: { kind: 'dc_tempco', node: 'vref' }, max: 100, unit: 'ppm/°C' },
      ],
      stars: [
        [{ id: 'tc40', label: L('溫度係數 ≤ 40 ppm/°C', 'Tempco ≤ 40 ppm/°C'), measure: { kind: 'dc_tempco', node: 'vref' }, max: 40, unit: 'ppm/°C' }],
        [{ id: 'tcpvt', label: L('所有 corner：溫度係數 ≤ 60 ppm/°C', 'All corners: tempco ≤ 60 ppm/°C'), measure: { kind: 'dc_tempco', node: 'vref' }, max: 60, unit: 'ppm/°C', over: 'pvt' }],
      ],
      solutions: [
        { stars: 0, circuit: bg('10k', '90k') },
        { stars: 1, circuit: bg('10k', '62k') },
        { stars: 3, circuit: bg('10k', '59k') },
      ],
    },
    passLevel,
    loopLevel,
    {
      id: '6-2', chapter: 6, skipTest: true, part: ldoPart(3),
      title: L('低壓差穩壓器 LDO', 'Low-dropout regulator'),
      story: L(
        '數位電路的電流會在一微秒內從 1 mA 跳到 10 mA。你的 LDO 要從 1.8 V 穩穩地輸出 1.2 V，而且負載突變時不能晃、更不能振盪。',
        'Digital logic jumps from 1 mA to 10 mA within 0.1 µs. Your LDO must regulate 1.8 V down to a steady 1.2 V and barely move when the load steps. The error amplifier is given, but its output resistance is 1 MΩ.',
      ),
      objective: L('輸出 1.2 V（±10 mV）。1 µF 負載電容、1 → 10 mA 負載步階時，輸出保持在 1.1–1.3 V。', 'Output 1.2 V (±10 mV). With a 1 µF load capacitor and a 1 → 10 mA load step, the output stays within 1.1–1.3 V.'),
      concept: {
        title: L('LDO 的三角取捨', 'The LDO triangle of trade-offs'),
        body: L(
          '誤差放大器增益 A0 決定直流精度（誤差 ≈ 1/迴路增益）；GBW 決定負載突變時回授多快追上。但誤差放大器的輸出電阻（1 MΩ）和傳輸管的閘極電容形成一個極點：傳輸管太大，閘極推不動、輸出晃得久；太小又供不出 10 mA（壓降不夠）。好的 LDO 在這三者間找平衡。',
          'The error-amp gain A0 sets DC accuracy (error ≈ 1/loop gain); its GBW sets how fast the loop catches a load step. But the amplifier\'s 1 MΩ output resistance and the pass device\'s gate capacitance form a pole: a pass device that is too large can\'t be driven quickly and the output wobbles longer; too small and it can\'t deliver 10 mA (dropout). A good LDO balances all three.',
        ),
      },
      hints: [
        L('PFET 當傳輸元件：源極 vin、汲極 out、閘極接運放輸出。分壓電阻 out → fb → 地，讓 fb = 0.9 V 時 out = 1.2 V（例如 100 kΩ / 300 kΩ）。', 'PFET as the pass device: source vin, drain out, gate on the op-amp output. A divider out → fb → ground so out = 1.2 V when fb = 0.9 V (e.g. 100 kΩ / 300 kΩ).'),
        L('PFET 是反相的（閘極升高 → 輸出下降），所以運放的 + 端要接 fb、− 端接 vref。', 'The PFET inverts (gate up → output down), so the op-amp\'s + input goes to fb and − to vref.'),
        L('★★：提高運放 GBW（例如 100 MHz），A0 不要低於 1k，否則直流誤差太大。', '★★: raise the op-amp GBW (e.g. 100 MHz) and keep A0 at 1k or more, or the DC error grows.'),
        L('★★★ 要在每個 corner 都穩住。傳輸管縮小（例如 W = 100 µm、nf = 2）回授會更快，但看看「Corner / MC」分頁：慢速 PMOS 在 −40 °C 時還供得出 10 mA 嗎？', '★★★ must hold at every corner. A smaller pass device (e.g. W = 100 µm, nf = 2) makes the loop faster — but check the "Corners / MC" tab: can a slow PMOS at −40 °C still deliver 10 mA?'),
      ],
      palette: [
        { kind: 'PFET', max: 1, params: { w: '200u', l: '0.15u', nf: '4' } },
        { kind: 'OPAMP', max: 1, params: { a0: '10k', gbw: '10meg', vmin: '0', vmax: '1.8', rout: '1meg' }, lockedParams: ['vmin', 'vmax', 'rout'] },
        { kind: 'R', max: 2, params: { value: '100k' } },
      ],
      start: ldoStart,
      analyses: [{ kind: 'op' }, { kind: 'tran', tstep: '0.05u', tstop: '100u' }],
      sweep: { corners: ['ff', 'ss', 'sf', 'fs'], temps: [-40, 125] },
      plots: [{ analysis: 'tran', node: 'out' }],
      specs: [
        { id: 'vout', label: L('輸出電壓', 'Output voltage'), measure: { kind: 'op_v', node: 'out' }, min: 1.19, max: 1.21, unit: 'V' },
        { id: 'min', label: L('步階時最低電壓', 'Minimum during the step'), measure: { kind: 'tran_min', node: 'out', from: 15e-6 }, min: 1.1, unit: 'V' },
        { id: 'max', label: L('步階時最高電壓', 'Maximum during the step'), measure: { kind: 'tran_max', node: 'out', from: 15e-6 }, max: 1.3, unit: 'V' },
      ],
      stars: [
        [
          { id: 'min2', label: L('步階時 ≥ 1.18 V', 'During the step ≥ 1.18 V'), measure: { kind: 'tran_min', node: 'out', from: 15e-6 }, min: 1.18, unit: 'V' },
          { id: 'max2', label: L('步階時 ≤ 1.22 V', 'During the step ≤ 1.22 V'), measure: { kind: 'tran_max', node: 'out', from: 15e-6 }, max: 1.22, unit: 'V' },
        ],
        [
          { id: 'minpvt', label: L('所有 corner：步階時 ≥ 1.18 V', 'All corners: during the step ≥ 1.18 V'), measure: { kind: 'tran_min', node: 'out', from: 15e-6 }, min: 1.18, unit: 'V', over: 'pvt' },
          { id: 'maxpvt', label: L('所有 corner：步階時 ≤ 1.22 V', 'All corners: during the step ≤ 1.22 V'), measure: { kind: 'tran_max', node: 'out', from: 15e-6 }, max: 1.22, unit: 'V', over: 'pvt' },
        ],
      ],
      solutions: [
        { stars: 0, circuit: C(...ldo('100', '100meg')) },              // fast but inaccurate (12 mV DC error)
        { stars: 1, circuit: C(...ldo('10k', '10meg')) },               // the default amplifier: accurate, slow
        { stars: 2, circuit: C(...ldo('1k', '100meg', '100u', '2')) },  // fastest at tt, but drops out at sf −40 °C
        { stars: 3, circuit: C(...ldo('1k', '100meg')) },
      ],
    },
  ],
};
