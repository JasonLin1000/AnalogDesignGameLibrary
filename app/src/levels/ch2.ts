import { C, L, Lb, P, W, X, sch } from './build';
import type { Chapter } from './types';

export const ch2: Chapter = {
  id: 2,
  title: L('第 2 章：半導體元件', 'Chapter 2: Semiconductor devices'),
  intro: L(
    '二極體與電晶體不是線性的：電流隨電壓指數或平方成長。先用教學模型理解公式，再看看真實的 SKY130 電晶體有什麼不同。',
    'Diodes and transistors are not linear: current grows exponentially or quadratically with voltage. Learn the equations with a teaching model, then see how a real SKY130 transistor differs.',
  ),
  levels: [
    {
      id: '2-1', chapter: 2,
      title: L('二極體的門檻', 'The diode threshold'),
      story: L(
        '二極體只讓電流單向通過，而且要先「推過」大約 0.6 V 的門檻。之後電壓多一點點，電流就暴增。',
        'A diode only conducts one way, and only after being pushed past a ~0.6 V threshold. Beyond that, a tiny bit more voltage makes the current explode.',
      ),
      objective: L('讓二極體電流為 1 mA（±5%）。', 'Make the diode current 1 mA (±5%).'),
      concept: {
        title: L('指數型 I–V', 'Exponential I–V'),
        body: L('I = Is·(e^(V/(n·Vt)) − 1)，Vt ≈ 26 mV。電流每增加 10 倍，電壓只多約 60–100 mV，所以二極體壓降可以近似成固定值。', 'I = Is·(e^(V/(n·Vt)) − 1), Vt ≈ 26 mV. Each 10× in current needs only ~60–100 mV more, so the diode drop is roughly constant.'),
      },
      hints: [
        L('假設二極體壓降約 0.6 V：R ≈ (5 − 0.6) / 1 mA。', 'Assume ~0.6 V across the diode: R ≈ (5 − 0.6) / 1 mA.'),
        L('先跑一次模擬，看 OP 標註的二極體電壓，再微調電阻。', 'Run once, read the diode voltage from the OP annotation, then fine-tune R.'),
      ],
      palette: [{ kind: 'R', max: 1 }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '5' }), P('GND', 'G1', 0, 3), P('D', 'D1', 14, 0), P('GND', 'G2', 14, 3)],
        [W(0, -3, 0, -7), W(14, -3, 14, -7)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'id', label: L('二極體電流', 'Diode current'), measure: { kind: 'op_i', part: 'D1' }, min: 0.95e-3, max: 1.05e-3, unit: 'A' }],
      stars: [[{ id: 'id1', label: L('誤差小於 1%', 'Within 1%'), measure: { kind: 'op_i', part: 'D1' }, min: 0.99e-3, max: 1.01e-3, unit: 'A' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '4.3k' }, { p: 'a', n: 'b' }), X('D', 'D1', {}, { a: 'b', k: '0' })) },
        { stars: 2, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '4.4k' }, { p: 'a', n: 'b' }), X('D', 'D1', {}, { a: 'b', k: '0' })) },
      ],
    },
    {
      id: '2-2', chapter: 2,
      title: L('電晶體開關', 'Transistor switch'),
      story: L(
        '1.8 V 的晶片接腳推不動 LED，但可以控制一顆 MOSFET 去開關它。MOSFET 開得越「全」，自己吃掉的電壓就越少。',
        'A 1.8 V chip pin cannot drive an LED, but it can switch a MOSFET that does. The harder the MOSFET is turned on, the less voltage it wastes.',
      ),
      objective: L('用 NMOS 開關 LED：gate = 1.8 V 時，LED 電流在 8–15 mA。', 'Switch the LED with an NMOS: with gate = 1.8 V, the LED current must be 8–15 mA.'),
      concept: {
        title: L('三極區 = 可變電阻', 'Triode region = variable resistor'),
        body: L('Vds 很小時，MOSFET 像一顆電阻：Ron ≈ 1 / (k′·(W/L)·(Vgs − Vth))。W 越寬、Ron 越小，開關損耗就越低。', 'With small Vds a MOSFET acts like a resistor: Ron ≈ 1 / (k′·(W/L)·(Vgs − Vth)). A wider W means smaller Ron and lower switch loss.'),
      },
      hints: [
        L('電路：LED 陰極 → 電阻 → NMOS 汲極，NMOS 源極接地，閘極接到 gate 標籤。', 'Circuit: LED cathode → resistor → NMOS drain, source to ground, gate to the "gate" label.'),
        L('按 L 可以放一個同名標籤：同名的線會自動連在一起。', 'Press L to place a label: wires with the same label name are connected.'),
        L('預設 W = 1 µm 太窄了，電流上不去。試試 W = 200u。', 'The default W = 1 µm is far too narrow. Try W = 200u.'),
      ],
      palette: [{ kind: 'R', max: 1 }, { kind: 'NMOS', max: 1 }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '5' }), P('GND', 'G1', 0, 3), P('V', 'V2', -10, 8, { dc: '1.8' }), P('GND', 'G2', -10, 11), P('LED', 'LED1', 14, -4)],
        [W(0, -3, 0, -10), W(0, -10, 14, -10), W(14, -10, 14, -7)],
        [Lb('vdd', 0, -10), Lb('gate', -10, 5)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'iled', label: L('LED 電流', 'LED current'), measure: { kind: 'op_i', part: 'LED1' }, min: 8e-3, max: 15e-3, unit: 'A' }],
      stars: [[{ id: 'vds', label: L('NMOS 壓降 Vds ≤ 0.2 V', 'NMOS drop Vds ≤ 0.2 V'), measure: { kind: 'mos_param', partKind: 'NMOS', param: 'vds' }, max: 0.2, unit: 'V' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'vdd', n: '0' }), X('V', 'V2', { dc: '1.8' }, { p: 'gate', n: '0' }),
          X('LED', 'LED1', {}, { a: 'vdd', k: 'x' }), X('R', 'R1', { value: '270' }, { p: 'x', n: 'd' }),
          X('NMOS', 'M1', { w: '50u', l: '1u' }, { d: 'd', g: 'gate', s: '0', b: '0' })) },
        { stars: 2, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'vdd', n: '0' }), X('V', 'V2', { dc: '1.8' }, { p: 'gate', n: '0' }),
          X('LED', 'LED1', {}, { a: 'vdd', k: 'x' }), X('R', 'R1', { value: '300' }, { p: 'x', n: 'd' }),
          X('NMOS', 'M1', { w: '400u', l: '1u' }, { d: 'd', g: 'gate', s: '0', b: '0' })) },
      ],
    },
    {
      id: '2-3', chapter: 2,
      title: L('平方律', 'The square law'),
      story: L(
        '類比設計師最常做的事：決定電晶體的 W/L，讓它剛好流出想要的電流。先用理想化的教學模型練習。',
        'The most common task of an analog designer: choose W/L so a transistor carries exactly the current you want. Practice with the idealized teaching model first.',
      ),
      objective: L('L 固定 1 µm，選擇 W 讓 NMOS 電流為 20 µA（±5%）。', 'With L fixed at 1 µm, choose W so the NMOS carries 20 µA (±5%).'),
      concept: {
        title: L('飽和區平方律', 'Saturation square law'),
        body: L('Id = ½·k′·(W/L)·(Vgs − Vth)²·(1 + λVds)。教學模型 k′ = 200 µA/V²、Vth = 0.5 V、λ = 0.1 V⁻¹。電流和 W 成正比，和 L 成反比。', 'Id = ½·k′·(W/L)·(Vgs − Vth)²·(1 + λVds). Teaching model: k′ = 200 µA/V², Vth = 0.5 V, λ = 0.1 V⁻¹. Current is proportional to W and inversely to L.'),
      },
      hints: [
        L('Vgs − Vth = 0.8 − 0.5 = 0.3 V；(1 + λVds) = 1.18。', 'Vgs − Vth = 0.8 − 0.5 = 0.3 V; (1 + λVds) = 1.18.'),
        L('Id = 10.6 µA × (W/L)。W ≈ 1.88 µm。', 'Id = 10.6 µA × (W/L), so W ≈ 1.88 µm.'),
      ],
      palette: [{ kind: 'NMOS', max: 1, params: { l: '1u' }, lockedParams: ['l'] }],
      start: sch(
        [P('V', 'VD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3), P('V', 'VG', -10, 0, { dc: '0.8' }), P('GND', 'G2', -10, 3)],
        [],
        [Lb('drain', 0, -3), Lb('gate', -10, -3)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'id', label: L('汲極電流', 'Drain current'), measure: { kind: 'op_i', partKind: 'NMOS' }, min: 19e-6, max: 21e-6, unit: 'A' }],
      stars: [[{ id: 'id1', label: L('誤差小於 1%', 'Within 1%'), measure: { kind: 'op_i', partKind: 'NMOS' }, min: 19.8e-6, max: 20.2e-6, unit: 'A' }]],
      solutions: [
        { stars: 2, circuit: C(X('V', 'VD', { dc: '1.8' }, { p: 'drain', n: '0' }), X('V', 'VG', { dc: '0.8' }, { p: 'gate', n: '0' }),
          X('NMOS', 'M1', { w: '1.883u', l: '1u' }, { d: 'drain', g: 'gate', s: '0', b: '0' })) },
      ],
    },
    {
      id: '2-4', chapter: 2, skipTest: true,
      title: L('真實的電晶體', 'A real transistor'),
      story: L(
        '歡迎來到真實世界！這是 SkyWater 130 nm 製程的電晶體模型，跟真的晶圓廠用的一樣。平方律還準嗎？',
        'Welcome to the real world! This is the SkyWater 130 nm transistor model, the same one used for real silicon. Does the square law still hold?',
      ),
      objective: L('用 SKY130 NFET（L = 1 µm）讓電流為 20 µA（±5%）。', 'Use a SKY130 NFET (L = 1 µm) to carry 20 µA (±5%).'),
      concept: {
        title: L('模型 vs. 課本', 'Model vs. textbook'),
        body: L('真實元件有速度飽和、短通道效應、遷移率下降……BSIM4 模型用數百個參數描述它們。所以業界用模擬、gm/Id 表格來設計，而不是只靠手算。', 'Real devices have velocity saturation, short-channel effects, mobility degradation… BSIM4 describes them with hundreds of parameters. That is why industry designs with simulation and gm/Id charts, not hand math alone.'),
      },
      hints: [
        L('先放 W = 1 µm 跑一次，看電流是多少。電流大致和 W 成正比。', 'Start with W = 1 µm and simulate. Current scales roughly with W.'),
        L('依比例調整：W_new = W_old × 20 µA / I_old。再跑一次——咦，怎麼不準？窄電晶體有「窄通道效應」，電流不完全和 W 成正比，要再微調一兩次。', 'Scale it: W_new = W_old × 20 µA / I_old, then simulate again — not exact? Narrow transistors show narrow-width effects, so current is not exactly proportional to W. Iterate once or twice.'),
      ],
      palette: [{ kind: 'NFET', max: 1, params: { l: '1u' }, lockedParams: ['l'] }],
      start: sch(
        [P('V', 'VD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3), P('V', 'VG', -10, 0, { dc: '0.8' }), P('GND', 'G2', -10, 3)],
        [],
        [Lb('drain', 0, -3), Lb('gate', -10, -3)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'id', label: L('汲極電流', 'Drain current'), measure: { kind: 'op_i', partKind: 'NFET' }, min: 19e-6, max: 21e-6, unit: 'A' }],
      stars: [[{ id: 'id1', label: L('誤差小於 1%', 'Within 1%'), measure: { kind: 'op_i', partKind: 'NFET' }, min: 19.8e-6, max: 20.2e-6, unit: 'A' }]],
      solutions: [
        { stars: 2, circuit: C(X('V', 'VD', { dc: '1.8' }, { p: 'drain', n: '0' }), X('V', 'VG', { dc: '0.8' }, { p: 'gate', n: '0' }),
          X('NFET', 'M1', { w: '3.18u', l: '1u', nf: '1' }, { d: 'drain', g: 'gate', s: '0', b: '0' })) },
      ],
    },
  ],
};
