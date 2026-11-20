import { C, L, Lb, P, W, X, sch } from './build';
import type { Chapter } from './types';

export const ch0: Chapter = {
  id: 0,
  title: L('第 0 章：電是什麼', 'Chapter 0: What is electricity?'),
  intro: L(
    '電壓像水壓，電流像水流，電阻像水管的窄處。這一章用最簡單的電路，讓你親手感受歐姆定律。',
    'Voltage is like water pressure, current like water flow, and resistance like a narrow pipe. In this chapter you will feel Ohm\'s law with your own hands.',
  ),
  levels: [
    {
      id: '0-1', chapter: 0,
      title: L('點亮第一顆 LED', 'Light your first LED'),
      story: L(
        '嗨！我是你的導師歐姆機器人 🤖。這顆 LED 很嬌貴：電流太小不會亮，太大會燒掉。幫它串一顆電阻吧！',
        'Hi! I\'m Ohm-bot 🤖, your mentor. This LED is picky: too little current and it stays dark, too much and it burns. Put a resistor in series!',
      ),
      objective: L('在 5 V 電源和 LED 之間放一顆電阻，讓 LED 電流落在 5–15 mA。', 'Place a resistor between the 5 V source and the LED so the LED current is 5–15 mA.'),
      concept: {
        title: L('限流電阻', 'Current-limiting resistor'),
        body: L(
          'LED 導通時兩端電壓約固定（紅光約 1.8 V）。剩下的電壓落在電阻上，所以 I = (Vs − V_LED) / R。想要 10 mA，就選 R ≈ (5 − 1.8) / 0.01 ≈ 320 Ω。',
          'A conducting LED drops a roughly fixed voltage (≈1.8 V for red). The rest falls across the resistor, so I = (Vs − V_LED) / R. For 10 mA choose R ≈ (5 − 1.8) / 0.01 ≈ 320 Ω.',
        ),
      },
      hints: [
        L('從右側元件庫點「電阻」，再在畫布上點一下放置。按 R 可以旋轉。', 'Click "Resistor" in the parts panel, then click the canvas to place it. Press R to rotate.'),
        L('按 W 進入拉線模式：點一下起點、再點一下終點。把電阻兩端分別接到兩條線頭。', 'Press W to draw wires: click a start point, then an end point. Connect each end of the resistor to a wire stub.'),
        L('雙擊電阻（或選取後按 Q）可以改電阻值。試試 330。', 'Double-click the resistor (or select it and press Q) to edit its value. Try 330.'),
      ],
      palette: [{ kind: 'R', max: 1 }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '5' }), P('GND', 'G1', 0, 3), P('LED', 'LED1', 14, 0), P('GND', 'G2', 14, 3)],
        [W(0, -3, 0, -7), W(14, -3, 14, -7)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'iled', label: L('LED 電流', 'LED current'), measure: { kind: 'op_i', part: 'LED1' }, min: 5e-3, max: 15e-3, unit: 'A' }],
      stars: [[{ id: 'iled10', label: L('LED 電流精準到 10 mA ± 5%', 'LED current within 10 mA ± 5%'), measure: { kind: 'op_i', part: 'LED1' }, min: 9.5e-3, max: 10.5e-3, unit: 'A' }]],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '220' }, { p: 'a', n: 'b' }), X('LED', 'LED1', {}, { a: 'b', k: '0' })) },
        { stars: 2, circuit: C(X('V', 'V1', { dc: '5' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '316' }, { p: 'a', n: 'b' }), X('LED', 'LED1', {}, { a: 'b', k: '0' })) },
      ],
    },
    {
      id: '0-2', chapter: 0,
      title: L('歐姆定律', 'Ohm\'s law'),
      story: L(
        '電阻越大，電流越小。V = I × R 是你接下來每一天都會用到的公式。',
        'The bigger the resistance, the smaller the current. V = I × R is a formula you will use every single day from now on.',
      ),
      objective: L('讓 9 V 電源輸出剛好 1 mA 的電流（±2%）。', 'Make the 9 V source deliver exactly 1 mA (±2%).'),
      concept: {
        title: L('歐姆定律', 'Ohm\'s law'),
        body: L('V = I × R。已知 V = 9 V、I = 1 mA，所以 R = V / I = 9 kΩ。在 SPICE 裡寫成 9k。', 'V = I × R. With V = 9 V and I = 1 mA, R = V / I = 9 kΩ — written as 9k in SPICE.'),
      },
      hints: [
        L('把電阻放在右邊那條線和接地符號之間，讓腳位剛好碰在一起就會連上。', 'Put the resistor between the wire on the right and the ground symbol; touching pins connect automatically.'),
        L('R = V / I。單位字首：k = 1000、m = 0.001。', 'R = V / I. Prefixes: k = 1000, m = 0.001.'),
      ],
      palette: [{ kind: 'R', max: 1 }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '9' }), P('GND', 'G1', 0, 3), P('GND', 'G2', 10, 3)],
        [W(0, -3, 0, -7), W(0, -7, 10, -7)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'i', label: L('電源電流', 'Source current'), measure: { kind: 'op_i', part: 'V1' }, min: 0.98e-3, max: 1.02e-3, unit: 'A' }],
      stars: [[{ id: 'i2', label: L('誤差小於 0.1%', 'Within 0.1%'), measure: { kind: 'op_i', part: 'V1' }, min: 0.999e-3, max: 1.001e-3, unit: 'A' }]],
      solutions: [
        { stars: 2, circuit: C(X('V', 'V1', { dc: '9' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '9k' }, { p: 'a', n: '0' })) },
      ],
    },
    {
      id: '0-3', chapter: 0, skipTest: true,
      title: L('串聯與並聯', 'Series and parallel'),
      story: L(
        '倉庫裡只剩 1 kΩ 的電阻了！不過聰明的工程師可以用串聯、並聯組合出需要的值。',
        'The stockroom only has 1 kΩ resistors left! A clever engineer can combine them in series and parallel to get any value needed.',
      ),
      objective: L('只用 1 kΩ 電阻，讓 1 V 電源輸出 1.5 mA（±1%）。', 'Using only 1 kΩ resistors, make the 1 V source deliver 1.5 mA (±1%).'),
      concept: {
        title: L('等效電阻', 'Equivalent resistance'),
        body: L('串聯：R = R1 + R2。並聯：R = R1·R2 / (R1 + R2)。1.5 mA 需要 667 Ω = 1k ∥ (1k + 1k)。', 'Series: R = R1 + R2. Parallel: R = R1·R2 / (R1 + R2). 1.5 mA needs 667 Ω = 1k ∥ (1k + 1k).'),
      },
      hints: [
        L('1 V / 1.5 mA = 667 Ω，比 1 kΩ 小，所以一定要用到並聯。', '1 V / 1.5 mA = 667 Ω, which is less than 1 kΩ, so you need parallel resistors.'),
        L('兩顆 1 kΩ 串聯是 2 kΩ；2 kΩ 再和 1 kΩ 並聯是多少？', 'Two 1 kΩ in series make 2 kΩ. What is 2 kΩ in parallel with 1 kΩ?'),
      ],
      palette: [{ kind: 'R', max: 4, params: { value: '1k' }, lockedParams: ['value'] }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '1' }), P('GND', 'G1', 0, 3)],
        [W(0, -3, 0, -7)],
        [Lb('top', 0, -7)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'i', label: L('電源電流', 'Source current'), measure: { kind: 'op_i', part: 'V1' }, min: 1.485e-3, max: 1.515e-3, unit: 'A' }],
      stars: [[{ id: 'n', label: L('最多只用 3 顆電阻', 'Use at most 3 resistors'), measure: { kind: 'part_count', partKind: 'R' }, max: 3 }]],
      solutions: [
        { stars: 2, circuit: C(
          X('V', 'V1', { dc: '1' }, { p: 'top', n: '0' }),
          X('R', 'R1', { value: '1k' }, { p: 'top', n: '0' }),
          X('R', 'R2', { value: '1k' }, { p: 'top', n: 'm' }),
          X('R', 'R3', { value: '1k' }, { p: 'm', n: '0' })) },
      ],
    },
  ],
};
