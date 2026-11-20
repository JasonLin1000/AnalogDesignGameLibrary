import { C, L, Lb, P, X, sch } from './build';
import { ota5t } from './ch4';
import type { Chapter } from './types';
import type { LogicalPart } from '../schematic/types';

// Open-loop test bench with DC feedback: L (1 TH) closes the loop at DC so the op-amp biases
// itself, C (1 F) grounds vn for AC, so the AC response at out is the open-loop gain from vp.
const bench = (cl: string) => [
  P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
  P('V', 'VP', -10, 0, { dc: '0.9', ac: '1' }), P('GND', 'G2', -10, 3),
  P('I', 'IB', 10, -10, { dc: '20u' }),
  P('C', 'CL', 50, 4, { value: cl }), P('GND', 'G3', 50, 7),
  P('L', 'LFB', 62, 0, { value: '1T' }),
  P('C', 'CFB', 72, 4, { value: '1' }), P('GND', 'G4', 72, 7),
];
const benchLabels = () => [
  Lb('vdd', 0, -3), Lb('vp', -10, -3), Lb('vdd', 10, -13), Lb('nbias', 10, -7),
  Lb('out', 50, 1), Lb('out', 62, -3), Lb('vn', 62, 3), Lb('vn', 72, 1),
];
const tb = (cl: string): LogicalPart[] => [
  X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }),
  X('V', 'VP', { dc: '0.9', ac: '1' }, { p: 'vp', n: '0' }),
  X('I', 'IB', { dc: '20u' }, { p: 'vdd', n: 'nbias' }),
  X('C', 'CL', { value: cl }, { p: 'out', n: '0' }),
  X('L', 'LFB', { value: '1T' }, { p: 'out', n: 'vn' }),
  X('C', 'CFB', { value: '1' }, { p: 'vn', n: '0' }),
];

/** Two-stage Miller op-amp. First-stage output x1 is M2's drain; M2's gate is the overall (+) input. */
const twoStage = (o: { cc: string; rz: string; w7: string; w8: string; win?: string; lin?: string }): LogicalPart[] => [
  ...ota5t({ win: o.win ?? '8u', lin: o.lin ?? '0.5u', wl: '4u', ll: '1u', wt: '4u', lt: '1u', inp: 'vn', inn: 'vp', out: 'x1' }),
  X('PFET', 'M7', { w: o.w7, l: '1u', nf: '1' }, { d: 'out', g: 'x1', s: 'vdd', b: 'vdd' }),
  X('NFET', 'M8', { w: o.w8, l: '1u', nf: '1' }, { d: 'out', g: 'nbias', s: '0', b: '0' }),
  X('R', 'RZ', { value: o.rz }, { p: 'x1', n: 'z' }),
  X('C', 'CC', { value: o.cc }, { p: 'z', n: 'out' }),
];

export const ch5: Chapter = {
  id: 5,
  title: L('第 5 章：運算放大器', 'Chapter 5: Operational amplifiers'),
  intro: L(
    '一級放大不夠，就串兩級——但每多一級，就多一個極點，回授時可能振盪。這章學會 Miller 補償、相位邊限，以及限制精密電路的最後一道牆：雜訊。',
    'One stage isn\'t enough, so cascade two — but every stage adds a pole, and with feedback the circuit may oscillate. Learn Miller compensation, phase margin, and the last wall of precision circuits: noise.',
  ),
  levels: [
    {
      id: '5-1', chapter: 5,
      title: L('兩級 Miller 運放', 'Two-stage Miller op-amp'),
      story: L(
        '客戶要 60 dB 以上的增益，一顆 5T OTA 辦不到。加上第二級共源放大，再用一顆電容把兩個極點「拉開」，讓它接成回授時不會振盪。',
        'The customer wants more than 60 dB of gain — one 5T OTA can\'t do it. Add a common-source second stage, then use a capacitor to split the two poles apart so it won\'t oscillate in feedback.',
      ),
      objective: L('A0 ≥ 60 dB、UGB ≥ 5 MHz、相位邊限 ≥ 45°（負載 2 pF）。', 'A0 ≥ 60 dB, UGB ≥ 5 MHz, phase margin ≥ 45° with a 2 pF load.'),
      concept: {
        title: L('Miller 補償與極點分離', 'Miller compensation and pole splitting'),
        body: L(
          'Cc 跨在第二級上，被放大成大電容：第一級極點變得很低（主極點），第二級極點被推高到 gm7/CL。GBW ≈ gm1/Cc。Cc 還會產生一個右半平面零點 gm7/Cc 吃掉相位，串一顆 Rz ≈ 1/gm7 就能把它移走。',
          'Cc across the second stage is multiplied into a large capacitance: the first-stage pole drops low (dominant) while the second-stage pole is pushed up to gm7/CL. GBW ≈ gm1/Cc. Cc also creates a right-half-plane zero at gm7/Cc that eats phase; a series Rz ≈ 1/gm7 moves it away.',
        ),
      },
      hints: [
        L('第一級沿用 5T OTA。注意極性：第二級會反相，所以 vp 要接在「輸出側」M2 的閘極，vn 接 M1。', 'Reuse your 5T OTA as stage one. Mind the polarity: stage two inverts, so vp goes to the gate of M2 (the output side) and vn to M1.'),
        L('第二級：PFET M7（閘極 = 第一級輸出 x1、源極 vdd、汲極 out），NFET M8 當電流源（閘極 nbias）。M7 的 W/L 約是 M3 的 8 倍、M8 是 M6 的 4 倍，電流才會對上。', 'Stage two: PFET M7 (gate on the first-stage output x1, source vdd, drain out) and NFET M8 as its current source (gate nbias). Make M7 ≈ 8× M3 and M8 ≈ 4× M6 in W/L so the currents line up.'),
        L('補償：x1 → Rz → Cc → out。先試 Cc = 1 pF、Rz = 2 kΩ。', 'Compensation: x1 → Rz → Cc → out. Start with Cc = 1 pF, Rz = 2 kΩ.'),
      ],
      palette: [
        { kind: 'NFET', max: 5, params: { w: '4u', l: '1u' } }, { kind: 'PFET', max: 3, params: { w: '4u', l: '1u' } },
        { kind: 'C', max: 1, params: { value: '1p' } }, { kind: 'R', max: 1, params: { value: '2k' } },
      ],
      start: sch(bench('2p'), [], benchLabels()),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }],
      sweep: { corners: ['ff', 'ss', 'sf', 'fs'], temps: [-40, 125] },
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }, { analysis: 'ac', node: 'out', show: 'phase' }],
      specs: [
        { id: 'a0', label: L('直流增益 A0', 'DC gain A0'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1 }, min: 60, unit: 'dB' },
        { id: 'ugb', label: L('單位增益頻寬', 'Unity-gain bandwidth'), measure: { kind: 'ac_ugb', node: 'out' }, min: 5e6, unit: 'Hz' },
        { id: 'pm', label: L('相位邊限', 'Phase margin'), measure: { kind: 'ac_pm', node: 'out' }, min: 45, unit: '°' },
      ],
      stars: [
        [{ id: 'pm60', label: L('相位邊限 ≥ 60°', 'Phase margin ≥ 60°'), measure: { kind: 'ac_pm', node: 'out' }, min: 60, unit: '°' }],
        [
          { id: 'pmpvt', label: L('所有 corner：相位邊限 ≥ 45°', 'All corners: phase margin ≥ 45°'), measure: { kind: 'ac_pm', node: 'out' }, min: 45, unit: '°', over: 'pvt' },
          { id: 'a0pvt', label: L('所有 corner：A0 ≥ 55 dB', 'All corners: A0 ≥ 55 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1 }, min: 55, unit: 'dB', over: 'pvt' },
        ],
      ],
      solutions: [
        { stars: 0, circuit: C(...tb('2p'), ...twoStage({ cc: '0.5p', rz: '100', w7: '32u', w8: '16u' })) },
        { stars: 1, circuit: C(...tb('2p'), ...twoStage({ cc: '0.8p', rz: '1k', w7: '32u', w8: '16u' })) },
        { stars: 3, circuit: C(...tb('2p'), ...twoStage({ cc: '1.5p', rz: '3k', w7: '32u', w8: '16u' })) },
      ],
    },
    {
      id: '5-2', chapter: 5, skipTest: true,
      title: L('雜訊：聽見電晶體的嘶嘶聲', 'Noise: hearing the transistors hiss'),
      story: L(
        '感測器的訊號只有幾微伏，放大器自己的雜訊卻把它淹沒了。低頻時最大的元兇是 1/f（閃爍）雜訊，它跟電晶體的面積有關。',
        'The sensor signal is only a few microvolts, but the amplifier\'s own noise drowns it. At low frequency the main culprit is 1/f (flicker) noise, and it depends on transistor area.',
      ),
      objective: L('用 5T OTA：等效輸入雜訊在 1 kHz ≤ 300 nV/√Hz，同時直流增益 ≥ 30 dB。', 'With a 5T OTA: input-referred noise at 1 kHz ≤ 300 nV/√Hz while keeping DC gain ≥ 30 dB.'),
      concept: {
        title: L('熱雜訊與 1/f 雜訊', 'Thermal and 1/f noise'),
        body: L(
          '熱雜訊 ≈ 4kT·γ/gm：電流越大越安靜。1/f 雜訊 ≈ K/(Cox·W·L·f)：面積越大越安靜。負載電流鏡的雜訊也會以 (gm3/gm1)² 的比例加到輸入端，所以負載要用長 L、低 gm。',
          'Thermal noise ≈ 4kT·γ/gm: more current, less noise. 1/f noise ≈ K/(Cox·W·L·f): more area, less noise. Load-mirror noise adds at the input scaled by (gm3/gm1)², so give the load a long L and low gm.',
        ),
      },
      hints: [
        L('這是單級 OTA，極性和 5-1 相反：vp 接 M1、vn 接 M2（輸出側）。', 'This is a single-stage OTA, so the polarity is the opposite of 5-1: vp to M1, vn to M2 (output side).'),
        L('下方波形會畫出雜訊頻譜。低頻那段斜線就是 1/f 雜訊。', 'The waveform panel plots the noise spectrum. The sloped low-frequency part is 1/f noise.'),
        L('把輸入對做大（例如 W = 40 µm、L = 2 µm），負載 L 也拉長（例如 20 µm / 4 µm）。PFET 負載太窄會把輸入對擠進三極區，雜訊反而變大。', 'Make the input pair large (e.g. W = 40 µm, L = 2 µm) and lengthen the load (e.g. 20 µm / 4 µm). A too-narrow PFET load squeezes the input pair into triode and the noise gets worse.'),
        L('SKY130 每一指的寬度（W/nf）要小於 100 µm。', 'In SKY130 the width per finger (W/nf) must stay below 100 µm.'),
      ],
      palette: [{ kind: 'NFET', max: 4, params: { w: '4u', l: '0.5u' } }, { kind: 'PFET', max: 2, params: { w: '4u', l: '0.5u' } }],
      start: sch(bench('1p'), [], benchLabels()),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }, { kind: 'noise', out: 'out', src: 'VP', fstart: '1', fstop: '100meg', ppd: 20 }],
      specs: [
        { id: 'vn', label: L('輸入雜訊 @1 kHz', 'Input noise @1 kHz'), measure: { kind: 'noise_in', freq: 1e3 }, max: 300e-9, unit: 'V/√Hz' },
        { id: 'a0', label: L('直流增益 A0', 'DC gain A0'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1 }, min: 30, unit: 'dB' },
      ],
      stars: [
        [{ id: 'vn150', label: L('輸入雜訊 ≤ 150 nV/√Hz', 'Input noise ≤ 150 nV/√Hz'), measure: { kind: 'noise_in', freq: 1e3 }, max: 150e-9, unit: 'V/√Hz' }],
        [{ id: 'vn80', label: L('輸入雜訊 ≤ 80 nV/√Hz', 'Input noise ≤ 80 nV/√Hz'), measure: { kind: 'noise_in', freq: 1e3 }, max: 80e-9, unit: 'V/√Hz' }],
      ],
      solutions: [
        { stars: 0, circuit: C(...tb('1p'), ...ota5t({ win: '4u', lin: '0.5u', wl: '4u', ll: '0.5u', wt: '4u', lt: '1u', inp: 'vp', inn: 'vn', out: 'out' })) },
        { stars: 1, circuit: C(...tb('1p'), ...ota5t({ win: '20u', lin: '1u', wl: '10u', ll: '2u', wt: '4u', lt: '1u', inp: 'vp', inn: 'vn', out: 'out' })) },
        { stars: 2, circuit: C(...tb('1p'), ...ota5t({ win: '40u', lin: '2u', wl: '20u', ll: '4u', wt: '4u', lt: '1u', inp: 'vp', inn: 'vn', out: 'out' })) },
        { stars: 3, circuit: C(...tb('1p'), ...ota5t({ win: '96u', lin: '4u', wl: '40u', ll: '8u', wt: '4u', lt: '1u', inp: 'vp', inn: 'vn', out: 'out' })) },
      ],
    },
  ],
};
