import { C, L, Lb, P, W, X, sch } from './build';
import type { Chapter } from './types';

const src = (params: Record<string, string>) => [P('V', 'V1', 0, 0, params), P('GND', 'G1', 0, 3)];

export const ch1: Chapter = {
  id: 1,
  title: L('第 1 章：電路定律與被動元件', 'Chapter 1: Circuit laws & passives'),
  intro: L(
    '分壓、充放電、濾波器——這些是所有類比電路的地基。你會第一次看到暫態波形與 Bode 圖。',
    'Dividers, charging and filters are the foundation of every analog circuit. You will see your first transient waveform and Bode plot.',
  ),
  levels: [
    {
      id: '1-1', chapter: 1,
      title: L('分壓器', 'Voltage divider'),
      story: L(
        '晶片裡的電壓不一定剛好是你要的。兩顆電阻就能「切」出任何比例的電壓。但小心——電流會一直流，那就是功耗！',
        'The supply is rarely the exact voltage you need. Two resistors can "slice" any fraction of it. But careful — current keeps flowing, and that is power!',
      ),
      objective: L('從 3.3 V 產生 1.2 V（±0.01 V）接到 out。', 'Generate 1.2 V (±0.01 V) at out from 3.3 V.'),
      concept: {
        title: L('分壓公式', 'Divider formula'),
        body: L('Vout = Vin × R2 / (R1 + R2)。比例決定電壓，總電阻決定電流：R 放大 10 倍，功耗就降 10 倍。', 'Vout = Vin × R2 / (R1 + R2). The ratio sets the voltage; the total resistance sets the current — 10× larger R means 10× less power.'),
      },
      hints: [
        L('R2 / (R1 + R2) = 1.2 / 3.3 ≈ 0.364。例如 R1 = 21k、R2 = 12k。', 'R2 / (R1 + R2) = 1.2 / 3.3 ≈ 0.364, e.g. R1 = 21k, R2 = 12k.'),
        L('想拿 ★★★？同比例放大電阻值，電流就變小。', 'Want ★★★? Scale both resistors up by the same factor to cut the current.'),
      ],
      palette: [{ kind: 'R', max: 3 }],
      start: sch([...src({ dc: '3.3' })], [W(0, -3, 0, -7)], [Lb('vin', 0, -7), Lb('out', 12, 0)]),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'v', label: L('out 電壓', 'out voltage'), measure: { kind: 'op_v', node: 'out' }, min: 1.19, max: 1.21, unit: 'V' }],
      stars: [
        [{ id: 'i100', label: L('電源電流 ≤ 100 µA', 'Supply current ≤ 100 µA'), measure: { kind: 'op_i', part: 'V1' }, max: 100e-6, unit: 'A' }],
        [{ id: 'i10', label: L('電源電流 ≤ 10 µA', 'Supply current ≤ 10 µA'), measure: { kind: 'op_i', part: 'V1' }, max: 10e-6, unit: 'A' }],
      ],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '3.3' }, { p: 'vin', n: '0' }), X('R', 'R1', { value: '2.1k' }, { p: 'vin', n: 'out' }), X('R', 'R2', { value: '1.2k' }, { p: 'out', n: '0' })) },
        { stars: 3, circuit: C(X('V', 'V1', { dc: '3.3' }, { p: 'vin', n: '0' }), X('R', 'R1', { value: '2.1meg' }, { p: 'vin', n: 'out' }), X('R', 'R2', { value: '1.2meg' }, { p: 'out', n: '0' })) },
      ],
    },
    {
      id: '1-2', chapter: 1,
      title: L('RC 充電', 'RC charging'),
      story: L(
        '電容像一個水桶，電阻像水管。水桶不會瞬間裝滿——這段時間就是類比電路「速度」的來源。',
        'A capacitor is a bucket and a resistor is a pipe. The bucket never fills instantly — that delay is where analog "speed" comes from.',
      ),
      objective: L('輸入在 t = 0 跳到 1 V。讓 out 在 1 ms（±5%）時到達 63.2%。', 'The input steps to 1 V at t = 0. Make out reach 63.2% at 1 ms (±5%).'),
      concept: {
        title: L('時間常數 τ = RC', 'Time constant τ = RC'),
        body: L('Vout(t) = Vin(1 − e^(−t/RC))。t = τ 時到達 63.2%，約 5τ 後視為充飽。1 kΩ × 1 µF = 1 ms。', 'Vout(t) = Vin(1 − e^(−t/RC)). At t = τ it reaches 63.2%; after ~5τ it is considered full. 1 kΩ × 1 µF = 1 ms.'),
      },
      hints: [
        L('電阻從 vin 接到 out，電容從 out 接到地。', 'Resistor from vin to out, capacitor from out to ground.'),
        L('R × C = 1 ms。電容越小越省晶片面積——試著把電阻加大。', 'R × C = 1 ms. Smaller capacitors save chip area — try a larger resistor.'),
      ],
      palette: [{ kind: 'R', max: 2 }, { kind: 'C', max: 2 }],
      start: sch([...src({ dc: '0', tran: 'PULSE(0 1 0 1n 1n 10m 20m)' })], [W(0, -3, 0, -7)], [Lb('vin', 0, -7), Lb('out', 12, 0)]),
      analyses: [{ kind: 'tran', tstep: '5u', tstop: '5m' }],
      plots: [{ analysis: 'tran', node: 'vin' }, { analysis: 'tran', node: 'out' }],
      specs: [{ id: 'tau', label: L('到達 63.2% 的時間', 'Time to 63.2%'), measure: { kind: 'tran_cross', node: 'out', level: 0.632 }, min: 0.95e-3, max: 1.05e-3, unit: 's' }],
      stars: [
        [{ id: 'c100n', label: L('總電容 ≤ 100 nF', 'Total capacitance ≤ 100 nF'), measure: { kind: 'param_sum', partKind: 'C', key: 'value' }, max: 100e-9, unit: 'F' }],
        [{ id: 'c1n', label: L('總電容 ≤ 1 nF', 'Total capacitance ≤ 1 nF'), measure: { kind: 'param_sum', partKind: 'C', key: 'value' }, max: 1e-9, unit: 'F' }],
      ],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '0', tran: 'PULSE(0 1 0 1n 1n 10m 20m)' }, { p: 'vin', n: '0' }), X('R', 'R1', { value: '1k' }, { p: 'vin', n: 'out' }), X('C', 'C1', { value: '1u' }, { p: 'out', n: '0' })) },
        { stars: 3, circuit: C(X('V', 'V1', { dc: '0', tran: 'PULSE(0 1 0 1n 1n 10m 20m)' }, { p: 'vin', n: '0' }), X('R', 'R1', { value: '1meg' }, { p: 'vin', n: 'out' }), X('C', 'C1', { value: '1n' }, { p: 'out', n: '0' })) },
      ],
    },
    {
      id: '1-3', chapter: 1,
      title: L('低通濾波器', 'Low-pass filter'),
      story: L(
        '同一個 RC 電路，換個角度看：它讓低頻通過、擋住高頻。這是你的第一張 Bode 圖！',
        'Same RC circuit, different view: it passes low frequencies and blocks high ones. This is your first Bode plot!',
      ),
      objective: L('設計低通濾波器，−3 dB 頻率為 10 kHz（±5%）。', 'Design a low-pass filter with a −3 dB frequency of 10 kHz (±5%).'),
      concept: {
        title: L('截止頻率', 'Cutoff frequency'),
        body: L('f₋₃dB = 1 / (2πRC)。過了截止頻率，一階濾波器每十倍頻衰減 20 dB；兩階串接可以衰減 40 dB，但截止頻率會被拉低，要重新調整。', 'f₋₃dB = 1 / (2πRC). Above it a first-order filter falls 20 dB per decade; two cascaded stages fall 40 dB/decade, but the cutoff shifts down and needs retuning.'),
      },
      hints: [
        L('1 / (2π × 1.59 kΩ × 10 nF) ≈ 10 kHz。', '1 / (2π × 1.59 kΩ × 10 nF) ≈ 10 kHz.'),
        L('★★ 需要兩級 RC。第二級的電阻大 10 倍、電容小 10 倍，可以減少互相拖累。', '★★ needs two RC stages. Make the second stage 10× higher in R and 10× lower in C to reduce loading.'),
      ],
      palette: [{ kind: 'R', max: 2 }, { kind: 'C', max: 2 }],
      start: sch([...src({ dc: '0', ac: '1' })], [W(0, -3, 0, -7)], [Lb('vin', 0, -7), Lb('out', 16, 0)]),
      analyses: [{ kind: 'ac', fstart: '10', fstop: '10meg', ppd: 20 }],
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
      specs: [{ id: 'f3', label: L('−3 dB 頻率', '−3 dB frequency'), measure: { kind: 'ac_f3db', node: 'out' }, min: 9.5e3, max: 10.5e3, unit: 'Hz' }],
      stars: [[{ id: 'att', label: L('100 kHz 增益 ≤ −30 dB', 'Gain at 100 kHz ≤ −30 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 100e3 }, max: -30, unit: 'dB' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '0', ac: '1' }, { p: 'vin', n: '0' }), X('R', 'R1', { value: '1.59k' }, { p: 'vin', n: 'out' }), X('C', 'C1', { value: '10n' }, { p: 'out', n: '0' })) },
        { stars: 2, circuit: C(X('V', 'V1', { dc: '0', ac: '1' }, { p: 'vin', n: '0' }),
          X('R', 'R1', { value: '1k' }, { p: 'vin', n: 'm' }), X('C', 'C1', { value: '9.56n' }, { p: 'm', n: '0' }),
          X('R', 'R2', { value: '10k' }, { p: 'm', n: 'out' }), X('C', 'C2', { value: '956p' }, { p: 'out', n: '0' })) },
      ],
    },
    {
      id: '1-4', chapter: 1, skipTest: true,
      title: L('帶通濾波器', 'Band-pass filter'),
      story: L(
        '期末考！客戶要一個只讓 1 kHz 附近通過的濾波器：低頻的電源雜訊和高頻的干擾都要擋掉。',
        'Final exam! A customer wants a filter that only passes signals around 1 kHz, blocking low-frequency hum and high-frequency interference.',
      ),
      objective: L('1 kHz 增益 ≥ −6 dB，50 Hz 與 20 kHz 增益都 ≤ −20 dB。', 'Gain ≥ −6 dB at 1 kHz, and ≤ −20 dB at both 50 Hz and 20 kHz.'),
      concept: {
        title: L('高通 + 低通 = 帶通', 'High-pass + low-pass = band-pass'),
        body: L('串聯電容、並聯電阻是高通；串聯電阻、並聯電容是低通。把兩者串起來，並讓後級阻抗遠大於前級，就得到帶通。', 'Series C + shunt R is a high-pass; series R + shunt C is a low-pass. Cascade them, with the second stage at much higher impedance, to get a band-pass.'),
      },
      hints: [
        L('高通截止頻率約 500–800 Hz，低通約 1.5–2 kHz。', 'Put the high-pass corner around 500–800 Hz and the low-pass corner around 1.5–2 kHz.'),
        L('例如：100 nF + 2.2 kΩ 高通，再接 22 kΩ + 4.7 nF 低通。', 'For example: 100 nF + 2.2 kΩ high-pass, then 22 kΩ + 4.7 nF low-pass.'),
      ],
      palette: [{ kind: 'R', max: 3 }, { kind: 'C', max: 3 }],
      start: sch([...src({ dc: '0', ac: '1' })], [W(0, -3, 0, -7)], [Lb('vin', 0, -7), Lb('out', 20, 0)]),
      analyses: [{ kind: 'ac', fstart: '1', fstop: '1meg', ppd: 40 }],
      plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
      specs: [
        { id: 'pass', label: L('1 kHz 增益', 'Gain at 1 kHz'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1e3 }, min: -6, unit: 'dB' },
        { id: 'low', label: L('50 Hz 增益', 'Gain at 50 Hz'), measure: { kind: 'ac_gain_db', node: 'out', freq: 50 }, max: -20, unit: 'dB' },
        { id: 'high', label: L('20 kHz 增益', 'Gain at 20 kHz'), measure: { kind: 'ac_gain_db', node: 'out', freq: 20e3 }, max: -20, unit: 'dB' },
      ],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '0', ac: '1' }, { p: 'vin', n: '0' }),
          X('C', 'C1', { value: '100n' }, { p: 'vin', n: 'a' }), X('R', 'R1', { value: '2.2k' }, { p: 'a', n: '0' }),
          X('R', 'R2', { value: '22k' }, { p: 'a', n: 'out' }), X('C', 'C2', { value: '4.7n' }, { p: 'out', n: '0' })) },
      ],
    },
  ],
};
