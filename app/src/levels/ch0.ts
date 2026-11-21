import { C, L, Lb, P, W, X, sch } from './build';
import type { Chapter } from './types';

export const ch0: Chapter = {
  id: 0,
  title: L('第 0 章：電是什麼', 'Chapter 0: What is electricity?'),
  intro: L(
    '電壓像水壓，電流像水流，電阻像水管的窄處。這一章先認識工具，再用最簡單的電路，讓你親手感受歐姆定律。',
    'Voltage is like water pressure, current like water flow, and resistance like a narrow pipe. In this chapter you first learn the tools, then feel Ohm\'s law with your own hands.',
  ),
  levels: [
    {
      id: '0-0', chapter: 0,
      title: L('工具教學：電路圖編輯器', 'Tool tutorial: the schematic editor'),
      story: L(
        '歡迎來到實驗室！我是你的導師歐姆。開始設計之前，先花兩分鐘認識工具。跟著清單一步一步做，每完成一步就會自動打勾。',
        'Welcome to the lab! I\'m Ohm, your mentor. Before designing anything, spend two minutes learning the tools. Follow the checklist; each step ticks itself when you do it.',
      ),
      objective: L('照著清單把一顆 1 kΩ 電阻接在 1 V 電源和地之間，然後執行模擬。', 'Follow the checklist: connect a 1 kΩ resistor between the 1 V source and ground, then simulate.'),
      concept: {
        title: L('電路圖編輯器', 'The schematic editor'),
        body: L(
          '放元件（元件庫）、旋轉（R）、拉線（W）、改參數（雙擊或 Q）、刪除（Del）、復原（Ctrl+Z）、拖曳空白處平移、滾輪縮放、模擬（Ctrl+Enter）。腳位碰在一起或用線連起來，就是同一個節點。',
          'Place parts (parts panel), rotate (R), wire (W), edit parameters (double-click or Q), delete (Del), undo (Ctrl+Z), drag empty space to pan, wheel to zoom, simulate (Ctrl+Enter). Pins that touch, or are wired together, form one node.',
        ),
      },
      guide: [
        { key: 'placeR', text: L('在右側元件庫點「電阻」，再點畫布放下一顆電阻。', 'Click "Resistor" in the parts panel, then click the canvas to drop one.') },
        { key: 'rotate', text: L('選取電阻後按 R 鍵旋轉它。', 'Select the resistor and press R to rotate it.') },
        { key: 'value', text: L('雙擊電阻（或按 Q），把電阻值改成 1k。', 'Double-click the resistor (or press Q) and set its value to 1k.') },
        { key: 'wire', text: L('按 W 拉線：點起點、再點終點。把電阻一端接到右上方的線頭。', 'Press W to wire: click a start point, then an end point. Join one end of the resistor to the wire stub at the top right.') },
        { key: 'ground', text: L('把電阻另一端接到右下方的接地符號。', 'Connect the other end to the ground symbol at the bottom right.') },
        { key: 'sim', text: L('按工具列的「模擬」（或 Ctrl+Enter）。', 'Press "Simulate" in the toolbar (or Ctrl+Enter).') },
        { key: 'pass', text: L('看結果面板：電流 1 mA 就過關！', 'Check the results panel: 1 mA means you pass!') },
      ],
      hints: [
        L('線的端點要剛好落在腳位的小圓點上才會連上。按 Esc 結束拉線。', 'A wire connects only when its end lands exactly on a pin dot. Press Esc to stop wiring.'),
        L('放錯了？選取後按 Delete 刪除，或 Ctrl+Z 復原。', 'Made a mistake? Select and press Delete, or Ctrl+Z to undo.'),
      ],
      palette: [{ kind: 'R', max: 1, params: { value: '100' } }],
      start: sch(
        [P('V', 'V1', 0, 0, { dc: '1' }), P('GND', 'G1', 0, 3), P('GND', 'G2', 10, 3)],
        [W(0, -3, 0, -7), W(0, -7, 10, -7)],
      ),
      analyses: [{ kind: 'op' }],
      specs: [{ id: 'i', label: L('電源電流', 'Source current'), measure: { kind: 'op_i', part: 'V1' }, min: 0.95e-3, max: 1.05e-3, unit: 'A' }],
      solutions: [
        { stars: 1, circuit: C(X('V', 'V1', { dc: '1' }, { p: 'a', n: '0' }), X('R', 'R1', { value: '1k' }, { p: 'a', n: '0' })) },
      ],
    },
    {
      id: '0-1', chapter: 0,
      title: L('歐姆定律', 'Ohm\'s law'),
      story: L(
        '第一課：電阻越大，電流越小。V = I × R 是你接下來每一天都會用到的公式。電壓和電流都告訴你了，算出電阻就好。',
        'Lesson one: the bigger the resistance, the smaller the current. V = I × R is a formula you will use every single day from now on. You know the voltage and the current; just work out the resistance.',
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
      id: '0-2', chapter: 0,
      title: L('點亮第一顆 LED', 'Light your first LED'),
      story: L(
        '這顆紅色 LED 很嬌貴：電流太小不會亮，太大會燒掉。它和電阻不一樣：導通時兩端電壓大約固定在 1.8 V。幫它串一顆電阻吧！',
        'This red LED is picky: too little current and it stays dark, too much and it burns. Unlike a resistor, a conducting LED holds roughly 1.8 V across itself. Put a resistor in series!',
      ),
      objective: L(
        '在 5 V 電源和 LED 之間放一顆電阻，讓 LED 電流落在 5–15 mA。已知 LED 導通壓降 V_LED ≈ 1.8 V。',
        'Place a resistor between the 5 V source and the LED so the LED current is 5–15 mA. Given: LED forward drop V_LED ≈ 1.8 V.',
      ),
      concept: {
        title: L('限流電阻', 'Current-limiting resistor'),
        body: L(
          'LED 導通時兩端電壓約固定（紅光約 1.8 V）。剩下的電壓落在電阻上，所以 I = (Vs − V_LED) / R。想要 10 mA，就選 R ≈ (5 − 1.8) / 0.01 ≈ 320 Ω。',
          'A conducting LED drops a roughly fixed voltage (≈1.8 V for red). The rest falls across the resistor, so I = (Vs − V_LED) / R. For 10 mA choose R ≈ (5 − 1.8) / 0.01 ≈ 320 Ω.',
        ),
      },
      hints: [
        L('電阻上的電壓 = 5 − 1.8 = 3.2 V。再用歐姆定律 R = 3.2 V ÷ 10 mA。', 'The resistor sees 5 − 1.8 = 3.2 V. Then Ohm\'s law: R = 3.2 V ÷ 10 mA.'),
        L('電阻要串在左邊電源線頭和右邊 LED 線頭之間：按 W 從線頭拉到電阻腳位。', 'The resistor goes in series between the source stub on the left and the LED stub on the right: press W and wire from each stub to a resistor pin.'),
        L('雙擊電阻（或選取後按 Q）可以改電阻值。', 'Double-click the resistor (or select it and press Q) to edit its value.'),
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
