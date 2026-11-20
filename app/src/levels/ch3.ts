import { C, L, Lb, P, X, sch } from './build';
import type { Chapter } from './types';

const vdd = () => [P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3)];

export const ch3: Chapter = {
  id: 3,
  title: L('第 3 章：單級放大器', 'Chapter 3: Single-stage amplifiers'),
  intro: L(
    '電流鏡複製電流，共源級放大電壓，源極隨耦器推動負載——這三塊積木組成了幾乎所有類比電路。',
    'Current mirrors copy currents, common-source stages amplify voltage, source followers drive loads — these three bricks build almost every analog circuit.',
  ),
  levels: [
    {
      id: '3-1', chapter: 3,
      title: L('電流鏡', 'Current mirror'),
      story: L(
        '晶片上只有一個精準的 10 µA 參考電流，但每個電路都想要自己的偏壓電流。電流鏡就是「影印機」。',
        'The chip has only one precise 10 µA reference, but every block wants its own bias current. A current mirror is the photocopier.',
      ),
      objective: L('用兩顆 NMOS 把 10 µA 複製成 20 µA（±3%）流入 out。', 'Use two NMOS to copy 10 µA into 20 µA (±3%) flowing from out.'),
      concept: {
        title: L('電流鏡與通道長度調變', 'Mirrors and channel-length modulation'),
        body: L('兩顆電晶體 Vgs 相同，電流比 = (W/L) 比。但兩邊 Vds 不同，λ 讓電流多了 (1 + λVds) 的誤差——這就是為什麼高精度鏡要用 cascode。', 'Same Vgs means the current ratio equals the W/L ratio. But the two sides have different Vds, and λ adds a (1 + λVds) error — which is why precise mirrors use cascodes.'),
      },
      hints: [
        L('M1 接成二極體：汲極和閘極都接 ref，源極接地。M2 閘極也接 ref，汲極接 out。', 'Diode-connect M1: drain and gate on ref, source to ground. M2 gate also on ref, drain on out.'),
        L('M2 的 W 是 M1 的兩倍。', 'Make M2 twice as wide as M1.'),
        L('★★：out 的 Vds 比 ref 大，λ 讓 M2 多流了約 2%。把 M2 的 W 稍微調小。', '★★: out has a larger Vds than ref, so λ adds ~2% to M2. Trim M2\'s W slightly.'),
      ],
      palette: [{ kind: 'NMOS', max: 2, params: { l: '1u' } }],
      start: sch(
        [...vdd(), P('I', 'IREF', 10, -6, { dc: '10u' }), P('V', 'VOUT', 26, 0, { dc: '1' }), P('GND', 'G2', 26, 3)],
        [],
        [Lb('vdd', 0, -3), Lb('vdd', 10, -9), Lb('ref', 10, -3), Lb('out', 26, -3)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'iout', label: L('輸出電流', 'Output current'), measure: { kind: 'op_i', part: 'VOUT' }, min: 19.4e-6, max: 20.6e-6, unit: 'A' }],
      stars: [[{ id: 'iout1', label: L('誤差小於 0.5%', 'Within 0.5%'), measure: { kind: 'op_i', part: 'VOUT' }, min: 19.9e-6, max: 20.1e-6, unit: 'A' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('I', 'IREF', { dc: '10u' }, { p: 'vdd', n: 'ref' }), X('V', 'VOUT', { dc: '1' }, { p: 'out', n: '0' }),
          X('NMOS', 'M1', { w: '1u', l: '1u' }, { d: 'ref', g: 'ref', s: '0', b: '0' }), X('NMOS', 'M2', { w: '2u', l: '1u' }, { d: 'out', g: 'ref', s: '0', b: '0' })) },
        { stars: 2, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('I', 'IREF', { dc: '10u' }, { p: 'vdd', n: 'ref' }), X('V', 'VOUT', { dc: '1' }, { p: 'out', n: '0' }),
          X('NMOS', 'M1', { w: '1u', l: '1u' }, { d: 'ref', g: 'ref', s: '0', b: '0' }), X('NMOS', 'M2', { w: '1.965u', l: '1u' }, { d: 'out', g: 'ref', s: '0', b: '0' })) },
      ],
    },
    {
      id: '3-2', chapter: 3,
      title: L('共源放大器', 'Common-source amplifier'),
      story: L(
        '終於要放大訊號了！輸入電壓的小變化會改變電晶體電流，電流流過負載電阻變成更大的電壓變化。',
        'Time to amplify! A small input change modulates the transistor current, and that current through a load resistor becomes a larger voltage swing.',
      ),
      objective: L('輸入偏壓 0.65 V。做出 1 kHz 增益 ≥ 15 dB、輸出偏壓 0.5–1.3 V 的放大器。', 'Input bias is 0.65 V. Build an amplifier with ≥ 15 dB gain at 1 kHz and an output bias of 0.5–1.3 V.'),
      concept: {
        title: L('增益 = gm × R', 'Gain = gm × R'),
        body: L('Av = −gm·(RD ∥ ro)。gm = 2Id / Vov，所以 Av ≈ 2·V_RD / Vov：負載上的壓降越大、過驅電壓越小，增益越高。輸出偏壓太低會讓電晶體掉進三極區。', 'Av = −gm·(RD ∥ ro). Since gm = 2Id / Vov, Av ≈ 2·V_RD / Vov: more drop on the load and a smaller overdrive give more gain. Too low an output bias pushes the transistor into triode.'),
      },
      hints: [
        L('NMOS：閘極接 in、源極接地、汲極接 out；電阻從 vdd 接到 out。', 'NMOS: gate on in, source to ground, drain on out; resistor from vdd to out.'),
        L('先決定電流（例如 W/L = 4 → 約 10 µA），再選 RD 讓 out ≈ 0.9 V。', 'Pick the current first (e.g. W/L = 4 → ~10 µA), then choose RD so out ≈ 0.9 V.'),
        L('增益跟電流大小幾乎無關，所以省電和高增益可以兼得。', 'Gain barely depends on the current, so you can have low power and high gain at once.'),
      ],
      palette: [{ kind: 'NMOS', max: 1, params: { l: '1u' } }, { kind: 'R', max: 1 }],
      start: sch(
        [...vdd(), P('V', 'VIN', -10, 0, { dc: '0.65', ac: '1' }), P('GND', 'G2', -10, 3)],
        [],
        [Lb('vdd', 0, -3), Lb('in', -10, -3), Lb('out', 14, -4)],
      ),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '100meg', ppd: 20 }],
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
      specs: [
        { id: 'gain', label: L('1 kHz 增益', 'Gain at 1 kHz'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1e3 }, min: 15, unit: 'dB' },
        { id: 'vout', label: L('輸出偏壓', 'Output bias'), measure: { kind: 'op_v', node: 'out' }, min: 0.5, max: 1.3, unit: 'V' },
      ],
      stars: [
        [{ id: 'gain20', label: L('增益 ≥ 20 dB', 'Gain ≥ 20 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1e3 }, min: 20, unit: 'dB' }],
        [{ id: 'iq', label: L('電源電流 ≤ 20 µA', 'Supply current ≤ 20 µA'), measure: { kind: 'op_i', part: 'VDD' }, max: 20e-6, unit: 'A' }],
      ],
      solutions: [
        { stars: 1, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('V', 'VIN', { dc: '0.65', ac: '1' }, { p: 'in', n: '0' }),
          X('NMOS', 'M1', { w: '40u', l: '1u' }, { d: 'out', g: 'in', s: '0', b: '0' }), X('R', 'R1', { value: '7.5k' }, { p: 'vdd', n: 'out' })) },
        { stars: 3, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('V', 'VIN', { dc: '0.65', ac: '1' }, { p: 'in', n: '0' }),
          X('NMOS', 'M1', { w: '4u', l: '1u' }, { d: 'out', g: 'in', s: '0', b: '0' }), X('R', 'R1', { value: '110k' }, { p: 'vdd', n: 'out' })) },
      ],
    },
    {
      id: '3-3', chapter: 3, skipTest: true,
      title: L('源極隨耦器', 'Source follower'),
      story: L(
        '放大器的輸出很「虛」，接上負載就垮掉。源極隨耦器增益約 1，但能把訊號穩穩地推出去。注意那個常被忘記的基極！',
        'An amplifier output is weak and sags under load. A source follower has a gain near 1 but drives signals firmly. Mind the body terminal everyone forgets!',
      ),
      objective: L('輸入偏壓 1.2 V。輸出偏壓 0.3–0.9 V，1 kHz 增益 ≥ −3 dB。', 'Input bias is 1.2 V. Output bias 0.3–0.9 V, gain ≥ −3 dB at 1 kHz.'),
      concept: {
        title: L('基體效應', 'Body effect'),
        body: L('源極電壓升高時，基體（接地）對源極是負偏壓，Vth 會變大：Vth = Vth0 + γ(√(2φ + Vsb) − √(2φ))。增益掉到 gm / (gm + gmb)。把基體接源極、用電流源當負載，增益就接近 1。', 'As the source rises, the grounded body is reverse-biased and Vth increases: Vth = Vth0 + γ(√(2φ + Vsb) − √(2φ)). Gain drops to gm / (gm + gmb). Tie body to source and use a current-source load to get a gain near 1.'),
      },
      hints: [
        L('NMOS：汲極接 vdd、閘極接 in、源極接 out；out 到地接一顆電阻。', 'NMOS: drain on vdd, gate on in, source on out; a resistor from out to ground.'),
        L('★★：NMOS 右邊那支腳是基極 B。不接時會自動接到源極——拉一條線到地，增益會怎樣？', '★★: The pin on the right of the NMOS is the body B. Unconnected it ties to the source — what happens to the gain if you wire it to ground?'),
        L('電流源的阻抗非常高，用它取代電阻，增益會更接近 1。', 'A current source has very high impedance; using it instead of a resistor brings the gain closer to 1.'),
      ],
      palette: [{ kind: 'NMOS', max: 1, params: { l: '1u', w: '10u' } }, { kind: 'R', max: 1 }, { kind: 'I', max: 1, params: { dc: '20u' } }],
      start: sch(
        [...vdd(), P('V', 'VIN', -10, 0, { dc: '1.2', ac: '1' }), P('GND', 'G2', -10, 3)],
        [],
        [Lb('vdd', 0, -3), Lb('in', -10, -3), Lb('out', 14, 2)],
      ),
      analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '100meg', ppd: 20 }],
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
      specs: [
        { id: 'gain', label: L('1 kHz 增益', 'Gain at 1 kHz'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1e3 }, min: -3, unit: 'dB' },
        { id: 'vout', label: L('輸出偏壓', 'Output bias'), measure: { kind: 'op_v', node: 'out' }, min: 0.3, max: 0.9, unit: 'V' },
      ],
      stars: [[{ id: 'gain1', label: L('增益 ≥ −1 dB', 'Gain ≥ −1 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1e3 }, min: -1, unit: 'dB' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('V', 'VIN', { dc: '1.2', ac: '1' }, { p: 'in', n: '0' }),
          X('NMOS', 'M1', { w: '10u', l: '1u' }, { d: 'vdd', g: 'in', s: 'out', b: '0' }), X('R', 'R1', { value: '20k' }, { p: 'out', n: '0' })) },
        { stars: 2, circuit: C(X('V', 'VDD', { dc: '1.8' }, { p: 'vdd', n: '0' }), X('V', 'VIN', { dc: '1.2', ac: '1' }, { p: 'in', n: '0' }),
          X('NMOS', 'M1', { w: '10u', l: '1u' }, { d: 'vdd', g: 'in', s: 'out', b: 'out' }), X('I', 'I1', { dc: '20u' }, { p: 'out', n: '0' })) },
      ],
    },
  ],
};
