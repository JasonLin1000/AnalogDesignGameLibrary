// Tutorial cards shown the first time a level is opened (and on demand from the brief panel).
// Each card teaches the one new idea of the level and, where it helps, shows an example drawing.
import type { Localized } from '../i18n';
import type { Layout } from '../layout/types';
import type { Schematic } from '../schematic/types';
import { L } from './build';
import * as F from './figures';

export type Figure =
  | { sch: Schematic; values?: boolean; height?: number }
  | { lay: Layout; height?: number }
  | { keys: [string, Localized][] };

/** A multiple-choice concept check; the explanation shows after any answer. */
export interface Quiz { options: Localized[]; answer: number; explain: Localized }

export interface Slide { title: Localized; body: Localized; fig?: Figure; caption?: Localized; quiz?: Quiz }

const k = (key: string, zh: string, en: string): [string, Localized] => [key, L(zh, en)];

export const INTROS: Record<string, Slide[]> = {
  // ---------------- chapter 0 ----------------
  '0-0': [
    {
      title: L('這是你的電路圖編輯器', 'This is your schematic editor'),
      body: L(
        '中間是畫布，右邊是元件庫，上面是工具列，下面是模擬結果。左邊的任務面板會告訴你目標和規格（Spec）：全部打勾就過關。',
        'The canvas is in the middle, the parts panel on the right, the toolbar on top and simulation results at the bottom. The brief on the left lists the goal and the specs: tick them all to pass.',
      ),
    },
    {
      title: L('常用快捷鍵', 'Handy shortcuts'),
      body: L('不用背，工具列的按鈕上都有寫。這一關的清單會帶你每個都按一次。', 'No need to memorise them: each toolbar button shows its key. This level\'s checklist walks you through each one.'),
      fig: { keys: [
        k('W', '拉線', 'Draw a wire'), k('R', '旋轉', 'Rotate'), k('E', '鏡像', 'Mirror'),
        k('Q / 雙擊', '改參數', 'Edit parameters'), k('L', '網路標籤', 'Net label'), k('P', '探針看波形', 'Probe a waveform'),
        k('Del', '刪除', 'Delete'), k('Ctrl+Z', '復原', 'Undo'), k('F', '縮放到全圖', 'Fit to view'),
        k('Ctrl+Enter', '模擬', 'Simulate'),
      ] },
    },
  ],
  '0-1': [
    {
      title: L('歐姆定律 V = I × R', 'Ohm\'s law: V = I × R'),
      body: L(
        '電阻兩端的電壓，等於流過它的電流乘上電阻值。反過來，知道電壓和想要的電流，就能算出電阻：R = V ÷ I。\n例：5 V 接 1 kΩ，電流 = 5 ÷ 1000 = 5 mA。',
        'The voltage across a resistor equals the current through it times its resistance. Turned around: knowing the voltage and the current you want, R = V ÷ I.\nExample: 5 V across 1 kΩ gives 5 ÷ 1000 = 5 mA.',
      ),
      fig: { sch: F.figOhm, height: 170 },
      caption: L('範例：5 V、1 kΩ → 5 mA。這關的數字不一樣，自己算算看！', 'Example: 5 V and 1 kΩ → 5 mA. This level uses different numbers: work it out!'),
    },
    {
      title: L('單位字首', 'Unit prefixes'),
      body: L('SPICE 用字首寫數值：k = 10³、meg = 10⁶、m = 10⁻³、u = 10⁻⁶、n = 10⁻⁹、p = 10⁻¹²。注意 M 和 m 都是「毫」，百萬要寫 meg。', 'SPICE writes values with prefixes: k = 10³, meg = 10⁶, m = 10⁻³, u = 10⁻⁶, n = 10⁻⁹, p = 10⁻¹². Careful: both M and m mean milli; write meg for a million.'),
    },
  ],
  '0-2': [{
    title: L('LED 不是電阻', 'An LED is not a resistor'),
    body: L(
      'LED（發光二極體）導通後，兩端電壓幾乎固定在 V_LED（紅光約 1.8 V），不管電流多大。所以要串一顆電阻來「吃掉」剩下的電壓、限制電流：\nI = (Vs − V_LED) ÷ R',
      'Once an LED conducts, its voltage stays almost fixed at V_LED (≈1.8 V for red) whatever the current. So a series resistor takes up the rest of the voltage and limits the current:\nI = (Vs − V_LED) ÷ R',
    ),
    fig: { sch: F.figLed, values: false, height: 170 },
    caption: L('電源 → 限流電阻 → LED → 地。電阻值要你自己算。', 'Source → current-limiting resistor → LED → ground. You work out the resistor value.'),
  }],
  '0-3': [{
    title: L('串聯與並聯', 'Series and parallel'),
    body: L(
      '串聯（頭尾相接）：電阻相加，R = R1 + R2。\n並聯（兩端都接在一起）：R = R1·R2 ÷ (R1 + R2)，一定比最小的那顆還小。\n這關只有 1 kΩ 可用，先算出需要的總電阻，再想怎麼組合。',
      'Series (end to end): resistances add, R = R1 + R2.\nParallel (both ends joined): R = R1·R2 ÷ (R1 + R2), always smaller than the smallest one.\nOnly 1 kΩ parts are available here: work out the total you need, then how to combine them.',
    ),
  }],
  // ---------------- chapter 1 ----------------
  '1-1': [{
    title: L('分壓器', 'The voltage divider'),
    body: L('兩顆電阻串聯在電源和地之間，中間點的電壓是 Vout = Vin × R2 ÷ (R1 + R2)。比例對了就好，絕對值決定電流大小。', 'Two resistors in series from the supply to ground give Vout = Vin × R2 ÷ (R1 + R2) at the middle. The ratio sets the voltage; the absolute values set the current.'),
    fig: { sch: F.figDivider, values: false, height: 190 },
  }],
  '1-2': [{
    title: L('電容與時間常數 τ = RC', 'Capacitors and the time constant τ = RC'),
    body: L(
      '電容像水桶，充電要時間。經過一個時間常數 τ = R × C，電壓會到達最終值的 63.2%。\n這關用「暫態分析」（tran）：畫出電壓隨時間的變化。波形在下方面板，可以用探針（P）點節點加入。',
      'A capacitor is like a bucket: filling it takes time. After one time constant τ = R × C the voltage reaches 63.2% of its final value.\nThis level uses transient analysis (tran), which plots voltage over time. Waveforms appear in the bottom panel; add nodes with the probe (P).',
    ),
    fig: { sch: F.figRc, values: false, height: 170 },
  }],
  '1-3': [{
    title: L('頻率響應與 −3 dB', 'Frequency response and −3 dB'),
    body: L(
      '同一個 RC 電路，換成「交流分析」（ac）看：低頻訊號通過，高頻被電容短路到地。增益掉到 −3 dB（約 0.707 倍）的頻率是 f = 1 ÷ (2π·R·C)。\nBode 圖的橫軸是對數頻率，縱軸是 dB。',
      'The same RC circuit seen with AC analysis: low frequencies pass, high frequencies are shunted to ground by the capacitor. The gain falls to −3 dB (≈0.707×) at f = 1 ÷ (2π·R·C).\nThe Bode plot has log frequency across and dB up.',
    ),
    fig: { sch: F.figRc, values: false, height: 170 },
  }],
  '1-4': [{
    title: L('帶通 = 高通 + 低通', 'Band-pass = high-pass + low-pass'),
    body: L('把電阻和電容的位置對調，就變成高通（擋低頻）。串一級高通、再串一級低通，中間留下一段通帶。兩個轉角頻率要分別落在要保留的頻率兩側。', 'Swap the resistor and capacitor and you get a high-pass (blocks lows). Chain a high-pass and a low-pass and a band remains in between. Put one corner on each side of the frequency you want to keep.'),
  }],
  // ---------------- chapter 2 ----------------
  '2-1': [{
    title: L('二極體：指數型的元件', 'The diode: an exponential device'),
    body: L('二極體電流隨電壓指數成長：每多 60 mV 左右，電流變 10 倍。所以它的電壓幾乎固定，電流卻很敏感——要用電阻來設定電流。', 'A diode\'s current grows exponentially with voltage: roughly 10× for every extra 60 mV. Its voltage barely moves while its current is very sensitive, so set the current with a resistor.'),
  }],
  '2-2': [{
    title: L('MOSFET 是一個開關', 'A MOSFET is a switch'),
    body: L(
      'NMOS 有三支腳：閘極 G、汲極 D、源極 S。閘極電壓高於臨界電壓 Vth，D 到 S 之間就導通；低於 Vth 就斷開。閘極本身幾乎不吃電流。\n圖中的 NMOS 把負載接到地：gate 高 → drain 被拉低。',
      'An NMOS has three pins: gate G, drain D and source S. With the gate above the threshold Vth, D and S conduct; below it they are open. The gate itself draws almost no current.\nHere the NMOS pulls its load to ground: gate high → drain pulled low.',
    ),
    fig: { sch: F.figNmosSwitch, values: false, height: 180 },
  }],
  '2-3': [{
    title: L('平方律', 'The square law'),
    body: L('飽和區的 NMOS 電流 I = ½·k\'·(W/L)·(Vgs − Vth)²。閘極電壓固定時，電流和 W/L 成正比：W 加倍，電流也加倍。這是類比設計最重要的一條式子。', 'In saturation an NMOS carries I = ½·k\'·(W/L)·(Vgs − Vth)². With a fixed gate voltage the current is proportional to W/L: double W, double the current. This is the most important equation in analog design.'),
  }],
  '2-4': [{
    title: L('真實的電晶體：SKY130', 'A real transistor: SKY130'),
    body: L('從這關開始用 SkyWater 130 nm 製程的真實模型（BSIM4）。平方律只是近似：短通道效應、速度飽和都會讓結果偏離。手算抓方向，模擬定數字，這就是業界的做法。', 'From here on you use the real SkyWater 130 nm models (BSIM4). The square law is only an approximation: short-channel effects and velocity saturation pull the results away. Hand analysis for direction, simulation for numbers: that is how industry works.'),
  }],
  // ---------------- chapter 3 ----------------
  '3-1': [{
    title: L('電流鏡', 'The current mirror'),
    body: L(
      'M1 的閘極和汲極接在一起（二極體接法），參考電流流進去會自動產生對應的 Vgs。M2 共用這個 Vgs，所以複製出電流——大小由兩顆的 W/L 比決定：Iout = Iref × (W/L)₂ ÷ (W/L)₁。',
      'M1 has its gate tied to its drain (diode-connected), so the reference current sets up its own Vgs. M2 shares that Vgs and copies the current, scaled by the W/L ratio: Iout = Iref × (W/L)₂ ÷ (W/L)₁.',
    ),
    fig: { sch: F.figMirror, values: false, height: 200 },
    caption: L('範例電流鏡：M1 二極體接法，M2 輸出。', 'Example mirror: M1 diode-connected, M2 is the output.'),
  }],
  '3-2': [{
    title: L('共源極放大器', 'The common-source amplifier'),
    body: L(
      '輸入接閘極、輸出從汲極拿，汲極用電阻接到 vdd。輸入的小變化 Δv 讓電流變 gm·Δv，流過 RD 變成輸出電壓：增益 ≈ −gm·RD（反相）。\n偏壓很重要：電晶體要留在飽和區，輸出不能掉太低。',
      'The input drives the gate, the output is taken at the drain, and the drain connects to vdd through a resistor. A small input change Δv changes the current by gm·Δv, which RD turns into output voltage: gain ≈ −gm·RD (inverting).\nBias matters: keep the transistor in saturation and don\'t let the output sink too low.',
    ),
    fig: { sch: F.figCsAmp, values: false, height: 180 },
  }],
  '3-3': [{
    title: L('源極隨耦器', 'The source follower'),
    body: L('輸出改從源極拿，源極下面接電流源。源極會「跟著」閘極，只差一個 Vgs，增益接近 1 但輸出阻抗很低——適合當緩衝器推負載。', 'Take the output at the source, with a current source below it. The source follows the gate one Vgs lower: gain close to 1 but a low output impedance, ideal as a buffer that drives loads.'),
  }],
  // ---------------- chapter 4 ----------------
  '4-1': [{
    title: L('差動對', 'The differential pair'),
    body: L(
      '兩顆一樣的電晶體共用一個尾電流（tail）。兩個輸入相同時，電流平分；輸入差一點，電流就往一邊偏，兩個輸出朝反方向變化。它只放大「差」，不理會兩邊一起的變化——這就是運放的心臟。',
      'Two identical transistors share one tail current. With equal inputs the current splits evenly; a small difference steers it to one side and the two outputs move in opposite directions. It amplifies only the difference and ignores common changes: the heart of every op-amp.',
    ),
    fig: { sch: F.figDiffPair, values: false, height: 210 },
  }],
  '4-2': [
    {
      title: L('5T OTA：五顆電晶體的放大器', 'The 5T OTA: a five-transistor amplifier'),
      body: L(
        '把差動對的負載電阻換成 PMOS 電流鏡（M3、M4），兩邊的電流變化會「摺」到同一個輸出 out。再加上尾電流 M5 和偏壓 M6（二極體接法，接 IB）就完整了。\n這是範例架構，照著接就會動，尺寸要你調。',
        'Replace the diff pair\'s load resistors with a PMOS mirror (M3, M4) and both sides\' current changes are folded onto one output, out. Add the tail transistor M5 and its bias M6 (diode-connected on IB) and it is complete.\nThis is the reference topology: wire it like this and it works; the sizing is up to you.',
      ),
      fig: { sch: F.figOta, values: false, height: 300 },
    },
    {
      title: L('接線檢查清單', 'Wiring checklist'),
      body: L(
        '• M6：閘極 = 汲極 = nbias（二極體接法）；M5 閘極也接 nbias，汲極是 tail。\n• M1（inp）、M2（inn）源極都接 tail。\n• M3 二極體接法接在 M1 汲極，M4 汲極就是 out。\n• PFET 的基極（右邊那支腳）接 vdd，NFET 的基極接地。\n用標籤（L）連線比拉長線更乾淨：同名標籤就是同一個節點。',
        '• M6: gate = drain = nbias (diode-connected); M5\'s gate on nbias too, its drain is tail.\n• M1 (inp) and M2 (inn): both sources on tail.\n• M3 diode-connected on M1\'s drain; M4\'s drain is out.\n• PFET bodies (the right pin) to vdd, NFET bodies to ground.\nLabels (L) are cleaner than long wires: labels with the same name are the same node.',
      ),
    },
  ],
  '4-3': [{
    title: L('Monte Carlo：隨機不匹配', 'Monte Carlo: random mismatch'),
    body: L('就算畫得一模一樣，兩顆電晶體的 Vth 也會隨機差幾 mV（Pelgrom：σ ∝ 1/√(W·L)）。Monte Carlo 模擬跑很多次、每次抽不同的偏差，看最差的情況。要減少偏移，就把關鍵的電晶體做大。', 'Even drawn identically, two transistors\' Vth differ randomly by a few mV (Pelgrom: σ ∝ 1/√(W·L)). Monte Carlo simulation runs many times with different random draws and looks at the spread. To cut the offset, make the critical transistors bigger.'),
  }],
  // ---------------- chapter 5 ----------------
  '5-1': [
    {
      title: L('兩級 Miller 運放', 'The two-stage Miller op-amp'),
      body: L(
        '第一級是 5T OTA（輸出 x1），第二級是 PMOS 共源放大器 M7 加上電流源 M8。兩級增益相乘，A0 可以超過 60 dB。\n注意：第二級會反相，所以 vp 要接在輸出側 M2 的閘極、vn 接 M1。',
        'Stage one is a 5T OTA (output x1); stage two is a PMOS common-source amplifier M7 with current source M8. The gains multiply, so A0 can exceed 60 dB.\nMind the polarity: stage two inverts, so vp goes to M2 (the output side) and vn to M1.',
      ),
      fig: { sch: F.figTwoStage, values: false, height: 300 },
    },
    {
      title: L('Miller 補償與相位邊限', 'Miller compensation and phase margin'),
      body: L(
        '兩級就有兩個極點，回授時可能振盪。在 x1 和 out 之間跨一顆電容 Cc（串一顆 Rz 消掉右半平面零點），把第一個極點拉低、第二個推高。\n相位邊限（PM）是 UGB 時離 −180° 還有多少度：≥ 45° 才穩，60° 最舒服。Cc 越大越穩，但頻寬越小。',
        'Two stages mean two poles, and a feedback loop may oscillate. Bridge x1 and out with a capacitor Cc (in series with Rz to cancel the right-half-plane zero): it pulls the first pole down and pushes the second up.\nPhase margin (PM) is how far the phase is from −180° at the UGB: ≥ 45° is stable, 60° is comfortable. More Cc is more stable but slower.',
      ),
    },
  ],
  '5-2': [{
    title: L('雜訊', 'Noise'),
    body: L('電晶體會自己產生雜訊：熱雜訊（白色、與 gm 有關）和 1/f 閃爍雜訊（低頻、與面積 W·L 成反比）。「等效輸入雜訊」把所有雜訊折算回輸入端，方便和訊號比較。降低 1/f 雜訊最直接的方法：輸入對做大。', 'Transistors generate their own noise: thermal noise (white, set by gm) and 1/f flicker noise (low frequency, inversely proportional to area W·L). Input-referred noise folds it all back to the input so you can compare it with the signal. The direct cure for 1/f noise: a bigger input pair.'),
  }],
  // ---------------- chapter 6 ----------------
  '6-1': [{
    title: L('能隙參考電壓：讓溫度互相抵消', 'Bandgap: let temperature cancel itself'),
    body: L(
      '二極體（這裡是 PNP 的 VEB）電壓每升 1 °C 掉約 1.6 mV（CTAT）。兩顆電流密度不同的二極體，電壓差 ΔVEB 隨溫度上升（PTAT）。\n運放讓 a、b 兩點等電位，R1 上就是 ΔVEB；R2 把這個 PTAT 電流放大後加到 Q3 上。調 R2/R1，讓兩個斜率剛好抵消。\n電路已經搭好，畫布上就是完整的架構，你只要放 R1、R2。',
      'A diode voltage (here a PNP\'s VEB) falls about 1.6 mV per °C (CTAT). Two diodes at different current densities have a voltage difference ΔVEB that rises with temperature (PTAT).\nThe op-amp holds nodes a and b equal, so R1 sees ΔVEB; R2 scales that PTAT current and adds it on top of Q3. Tune R2/R1 until the slopes cancel.\nThe circuit is already on the canvas; you only place R1 and R2.',
    ),
  }],
  '6-2': [
    {
      title: L('LDO：穩壓器的架構', 'The LDO: how a regulator works'),
      body: L(
        '誤差放大器比較回授電壓 fb 和參考電壓 vref，驅動 PMOS 傳輸管 MPASS。輸出太低 → 運放輸出下降 → PMOS 更導通 → 輸出回升。\n分壓電阻 R1、R2 決定輸出：Vout = Vref × (1 + R1 ÷ R2)。',
        'The error amplifier compares the feedback fb with the reference vref and drives the PMOS pass device MPASS. Output too low → amplifier output falls → PMOS conducts more → output recovers.\nThe divider R1, R2 sets the output: Vout = Vref × (1 + R1 ÷ R2).',
      ),
      fig: { sch: F.figLdo, values: false, height: 260 },
      caption: L('範例架構。注意 PMOS 會反相，所以運放的 + 端接 fb。', 'Reference topology. The PMOS inverts, so the op-amp\'s + input goes to fb.'),
    },
    {
      title: L('負載步階', 'The load step'),
      body: L('這關的負載電流會在 0.1 µs 內從 1 mA 跳到 10 mA。輸出電容先撐住，迴路要夠快才能把電壓拉回來。運放的 GBW、傳輸管的大小（閘極電容）、輸出電容一起決定輸出晃多少。', 'In this level the load jumps from 1 mA to 10 mA within 0.1 µs. The output capacitor holds the line first; the loop must be fast enough to pull it back. The amplifier\'s GBW, the pass device size (gate capacitance) and the output capacitor together decide how far the output dips.'),
    },
  ],
  // ---------------- IP tracks: two-stage op-amp ----------------
  '5-1a': [
    {
      title: L('大 IP 要拆開來做', 'Build a big IP in parts'),
      body: L(
        '兩級運放分三步完成：①第二級增益級 ②Miller 補償 ③自己從頭組合。每一步只學一件事，前一步的成果就是下一步的積木。\n這一關先做第二級：PMOS M7 把 x1 的小訊號放大到 out，NMOS M8 是它的電流源負載。',
        'The two-stage op-amp comes in three steps: ① the second gain stage, ② Miller compensation, ③ assemble it yourself. Each step teaches one thing, and each result is a building block for the next.\nThis level builds stage two: PMOS M7 amplifies the small signal at x1 onto out, and NMOS M8 is its current-source load.',
      ),
      fig: { sch: F.figSecondStage, values: false, height: 220 },
      caption: L('第二級：M7 共源放大、M8 電流源負載。', 'Stage two: M7 common source, M8 current-source load.'),
    },
    {
      title: L('小測驗', 'Quick check'),
      body: L('想要更高的增益，最直接的作法是？', 'What is the most direct way to raise this stage\'s gain?'),
      quiz: {
        options: [L('把 M7、M8 的 L 加長', 'Lengthen M7 and M8'), L('把負載電容 CL 加大', 'Increase the load capacitance CL'), L('把電源電壓調低', 'Lower the supply voltage')],
        answer: 0,
        explain: L('增益 = gm·(ro7 ∥ ro8)，L 越長 ro 越大。CL 只影響頻寬，不影響低頻增益。', 'Gain = gm·(ro7 ∥ ro8), and a longer L raises ro. CL only affects bandwidth, not the low-frequency gain.'),
      },
    },
  ],
  '5-1b': [
    {
      title: L('第 2 步：補償', 'Step 2: compensation'),
      body: L(
        '第一級（5T OTA）和第二級已經接好。兩級各有一個極點，相位很快就掉到 −180°，接成回授會振盪。\n在 x1 和 out 之間跨一顆 Cc（串 Rz），把第一級極點拉低、第二級極點推高——這叫「極點分離」。',
        'Stage one (a 5T OTA) and stage two are wired. Each stage has a pole, so the phase drops to −180° quickly and the amplifier would oscillate in feedback.\nBridging x1 and out with Cc (in series with Rz) pulls the first pole down and pushes the second up: pole splitting.',
      ),
      fig: { sch: F.figTwoStage, values: false, height: 280 },
      caption: L('你要補上的是中間的 Rz 和 Cc。', 'What you add is Rz and Cc in the middle.'),
    },
    {
      title: L('小測驗', 'Quick check'),
      body: L('Cc 加大，會發生什麼事？', 'What happens when Cc grows?'),
      quiz: {
        options: [L('更穩定（相位邊限變大），但頻寬變小', 'More stable (more phase margin) but less bandwidth'), L('頻寬變大、相位邊限變小', 'More bandwidth, less phase margin'), L('直流增益變大', 'Higher DC gain')],
        answer: 0,
        explain: L('GBW ≈ gm1 / Cc：Cc 越大越慢、但越穩。直流增益不受 Cc 影響。', 'GBW ≈ gm1 / Cc: a bigger Cc is slower but more stable. The DC gain does not depend on Cc.'),
      },
    },
  ],
  // ---------------- IP tracks: bandgap ----------------
  '6-1a': [
    {
      title: L('能隙參考電壓：三步完成', 'The bandgap in three steps'),
      body: L(
        '① CTAT：隨溫度下降的 VEB ② PTAT：隨溫度上升的 ΔVEB ③ 用運放和兩顆電阻把它們按比例相加，得到不隨溫度變化的 1.2 V。\n這一關先看 CTAT：放一個電流源偏壓 Q1，然後看下方 VEB 對溫度的曲線——它是一條往下的斜線。',
        '① CTAT: VEB, which falls with temperature; ② PTAT: ΔVEB, which rises; ③ an op-amp and two resistors add them in the right ratio for a temperature-independent 1.2 V.\nThis level looks at CTAT: bias Q1 with a current source and watch VEB versus temperature below — a falling line.',
      ),
    },
    {
      title: L('小測驗', 'Quick check'),
      body: L('偏壓電流變成 10 倍，VEB 大約會？', 'If the bias current grows tenfold, VEB roughly…'),
      quiz: {
        options: [L('增加約 60 mV', 'rises by about 60 mV'), L('變成 10 倍', 'becomes ten times larger'), L('不變', 'stays the same')],
        answer: 0,
        explain: L('VEB = VT·ln(I/Is)，ln(10)·26 mV ≈ 60 mV。所以 VEB 對電流不敏感，很適合當參考。', 'VEB = VT·ln(I/Is), and ln(10)·26 mV ≈ 60 mV. VEB is insensitive to current, which makes it a good reference.'),
      },
    },
  ],
  '6-1b': [{
    title: L('第 2 步：PTAT', 'Step 2: PTAT'),
    body: L(
      'Q2 有 8 個 Q1 那麼大。同樣的電流分到 8 倍面積，電流密度只有 1/8，VEB 就小一點。差值 ΔVEB = VT·ln 8 ≈ 54 mV，和絕對溫度 T 成正比。\n下方會畫出 a 和 c2 兩條線：溫度越高，兩條線離得越開。',
      'Q2 is eight times the size of Q1. The same current over eight times the area means 1/8 the density, so its VEB is a little smaller. The difference ΔVEB = VT·ln 8 ≈ 54 mV is proportional to absolute temperature T.\nThe plot shows a and c2: the hotter it gets, the further apart they move.',
    ),
  }],
  // ---------------- IP tracks: LDO ----------------
  '6-2a': [
    {
      title: L('LDO：三步完成', 'The LDO in three steps'),
      body: L(
        '① 傳輸管：夠大才能供電流 ② 回授迴路：把輸出穩在 1.2 V ③ 負載突然變化時也要撐住（本章的跳級測驗）。\n這一關閘極接 0 V，傳輸管全開，只看它能不能在 10 mA 時維持夠小的壓降。',
        '① The pass device: big enough to deliver the current; ② the feedback loop: hold the output at 1.2 V; ③ survive a sudden load change (the chapter\'s skip test).\nHere the gate sits at 0 V so the pass device is fully on; the only question is whether it keeps the dropout small at 10 mA.',
      ),
      fig: { sch: F.figLdo, values: false, height: 240 },
      caption: L('完整的 LDO。這一關只做右上角的 MPASS。', 'The complete LDO. This level builds only MPASS at the top right.'),
    },
    {
      title: L('小測驗', 'Quick check'),
      body: L('哪個情況下，PMOS 傳輸管最難供出 10 mA？', 'When does the PMOS pass device struggle most to deliver 10 mA?'),
      quiz: {
        options: [L('慢速 PMOS（ss / sf）、低溫 −40 °C', 'Slow PMOS (ss / sf) at −40 °C'), L('快速 corner、高溫', 'Fast corner, high temperature'), L('都一樣', 'All the same')],
        answer: 0,
        explain: L('低溫時 Vth 變高，閘極能用的過驅動電壓變少；慢速 corner 的遷移率又更低。', 'At low temperature Vth rises, leaving less gate overdrive, and the slow corner has lower mobility on top.'),
      },
    },
  ],
  '6-2b': [{
    title: L('第 2 步：回授', 'Step 2: feedback'),
    body: L(
      '分壓器把 1.2 V 縮成 0.9 V（= vref）。誤差放大器看到 fb 比 vref 高，就把閘極拉高、讓 PMOS 少導通一點；反之亦然——輸出被「鎖」在 1.2 V。\n誤差大小取決於迴路增益，所以 A0 越大越準。',
      'The divider scales 1.2 V down to 0.9 V (= vref). When the error amplifier sees fb above vref it raises the gate so the PMOS conducts less, and vice versa: the output is locked at 1.2 V.\nThe residual error depends on the loop gain, so a larger A0 is more accurate.',
    ),
    fig: { sch: F.figLdo, values: false, height: 240 },
  }],
  // ---------------- chapter 7: layout ----------------
  '7-0': [
    {
      title: L('從電路圖到 layout', 'From schematic to layout'),
      body: L(
        'Layout 是一層層疊起來的幾何圖形，每種顏色是一種材料：diff（主動區）、poly（閘極）、li1 / met1（導線）、licon / mcon（接觸窗，上下層之間的洞）。\nPCell 是參數化元件：輸入 W、L，自動畫好一顆電晶體。',
        'A layout is stacked geometry; each colour is one material: diff (active), poly (gate), li1 / met1 (wires), licon / mcon (contacts, the holes between layers).\nA PCell is a parameterised cell: enter W and L and a whole transistor is drawn for you.',
      ),
      fig: { lay: F.figPcell, height: 220 },
      caption: L('NMOS PCell：上方是閘極墊，左右紫色條是源極、汲極的 li1。', 'An NMOS PCell: the gate pad on top, the purple li1 strips are source and drain.'),
    },
    {
      title: L('Layout 快捷鍵', 'Layout shortcuts'),
      body: L('數字鍵 1～0 對應右邊圖層面板的順序。', 'Number keys 1–0 follow the order of the layer panel on the right.'),
      fig: { keys: [
        k('1–0', '選圖層', 'Pick a layer'), k('R', '畫矩形', 'Draw a rectangle'), k('I', '放 PCell', 'Place a PCell'),
        k('O', '接觸窗堆疊', 'Contact stack'), k('L', '標籤（在目前圖層）', 'Label (on the current layer)'), k('K', '量尺', 'Ruler'),
        k('N', '看網路', 'Show a net'), k('Q / 雙擊', '改座標、參數', 'Edit coordinates / parameters'), k('C', '複製', 'Copy'),
        k('U', '復原', 'Undo'), k('F', '縮放到全圖', 'Fit to view'),
      ] },
    },
    {
      title: L('DRC 與 LVS', 'DRC and LVS'),
      body: L('「檢查」會跑兩道關卡：DRC 檢查設計規則（線夠不夠寬、間距夠不夠），LVS 把 layout 抽出的電路和電路圖比對。兩個都過才算完成。錯誤會列在下方，點一下就會在畫布上標出位置。', '"Check" runs two gates: DRC checks the design rules (wide enough, far enough apart), and LVS compares the circuit extracted from your layout with the schematic. Both must pass. Errors are listed below; click one to locate it on the canvas.'),
    },
  ],
  '7-1': [{
    title: L('電晶體 = poly 橫跨 diff', 'A transistor = poly across diff'),
    body: L(
      '一條 poly 橫跨過 diff，交叉的地方就是通道：poly 的寬度是 L，被蓋住的 diff 長度是 W。poly 兩側剩下的 diff 就是源極和汲極。\n規則：poly 要伸出 diff 至少 0.13 µm，diff 在 poly 兩側各要留 0.25 µm 以上。',
      'A poly line crossing diff forms the channel: the poly width is L and the length of diff it covers is W. The diff left on either side is the source and drain.\nRules: poly must extend at least 0.13 µm past the diff, and the diff needs at least 0.25 µm on each side of the poly.',
    ),
    fig: { lay: F.figHandFet, height: 220 },
    caption: L('範例：W = 2 µm 的電晶體（這關要 1 µm）。', 'Example: a W = 2 µm transistor (this level wants 1 µm).'),
  }],
  '7-2': [{
    title: L('往上爬：接觸窗堆疊', 'Climbing up: contact stacks'),
    body: L('diff / poly 不能直接接到金屬，要經過 licon → li1 → mcon → met1。PCell 已經做好 licon 和 li1；按 O 切到 mcon，點在 li1 上就會放好 mcon 和一塊 met1。接腳標籤要放在 met1 上。', 'Diff and poly can\'t reach metal directly: they go licon → li1 → mcon → met1. The PCell already has licon and li1; press O until it shows mcon and click on li1 to drop an mcon with a met1 pad. Pin labels go on met1.'),
    fig: { lay: F.figContacts, height: 220 },
    caption: L('範例：閘極墊上的 mcon 和 met1 接腳 g。另外兩支腳照做。', 'Example: an mcon and met1 pin g on the gate pad. Do the same for the other two.'),
  }],
  '7-3': [{
    title: L('N 井與基體接點', 'N-wells and body taps'),
    body: L('PMOS 必須放在 N 井（nwell）裡，N 井要用 ntap 接到 vdd；NMOS 的 P 型基板要用 ptap 接到 gnd。缺了接點，寄生的 PNPN 結構可能閂鎖（latch-up）燒毀晶片，LVS 也會抓到基極沒接。', 'A PMOS must sit in an N-well, tied to vdd with an ntap; the NMOS\'s P substrate is tied to gnd with a ptap. Without taps the parasitic PNPN can latch up and destroy the chip, and LVS will flag the floating body.'),
    fig: { lay: F.figWell, height: 220 },
    caption: L('PMOS PCell 和旁邊的 ntap。', 'A PMOS PCell with an ntap beside it.'),
  }],
  // ---------------- chapter 8 ----------------
  '8-1': [{
    title: L('共質心：讓梯度互相抵消', 'Common centroid: cancel the gradient'),
    body: L('製程參數會從晶圓一邊慢慢變到另一邊。如果 A 在左、B 在右，兩顆就天生不一樣。把每顆拆成兩個 finger 排成 A B B A，兩顆的「重心」重疊在中間，線性梯度的影響就抵消了。', 'Process parameters drift slowly across the wafer. With A on the left and B on the right they start out different. Split each into two fingers arranged A B B A: both share one centre of gravity and a linear gradient cancels.'),
    fig: { lay: F.figAbba, height: 180 },
  }],
  '8-2': [{
    title: L('N 井鄰近效應（WPE）', 'The well proximity effect (WPE)'),
    body: L('植入 N 井時，離子會被光阻邊緣散射，越靠近井邊的電晶體 Vth 越高。PCell 自己的井太小、電晶體離井邊太近。解法：自己畫一個更大的 nwell 把電晶體包起來，讓它們離井邊遠一點。', 'During the N-well implant ions scatter off the resist edge, so transistors near the well edge get a higher Vth. A PCell\'s own well is small and its device sits close to the edge. The fix: draw a larger nwell around the devices so they sit far from any edge.'),
    fig: { lay: F.figWell, height: 200 },
  }],
  // ---------------- chapter 9 ----------------
  '9-1': [{
    title: L('寄生 RC 與 post-sim', 'Parasitic RC and post-sim'),
    body: L('Pre-sim 用理想導線；post-sim 會從 layout 抽出每條線的電阻和電容（PEX）再模擬。線越長電容越大；細線電阻大、粗線電容大。選對金屬層和寬度，延遲可以差好幾倍。結果分頁會把 pre 和 post 並排比較。', 'Pre-sim uses ideal wires; post-sim extracts each wire\'s resistance and capacitance from the layout (PEX) and simulates again. Longer wires add capacitance; thin wires add resistance, wide ones capacitance. The right layer and width can change the delay several-fold. The results tab compares pre and post side by side.'),
    fig: { lay: F.figWires, height: 160 },
  }],
  '9-2': [{
    title: L('IR drop', 'IR drop'),
    body: L('大電流流過細長的金屬會產生壓降 V = I × R。地線上的壓降會抬高源極電壓，電晶體就流不到原本的電流。金屬電阻 ≈ 片電阻 × 長度 ÷ 寬度：要降壓降就把線加寬，或用多層金屬並聯。', 'A large current through a long thin wire drops V = I × R. A drop on the ground line lifts the source, and the transistor no longer carries its intended current. Metal resistance ≈ sheet resistance × length ÷ width: widen the line or parallel several layers to cut the drop.'),
    fig: { lay: F.figWires, height: 160 },
  }],
  // ---------------- chapter 10 ----------------
  '10-1': [{
    title: L('下線：所有技巧一起用', 'Tape-out: everything at once'),
    body: L('1:4 電流鏡：MOUT 是 4 個和 MREF 一樣的單位 finger。把 MREF 放在中間、MOUT 的 finger 對稱排在兩側，梯度就會抵消；尺寸做大降低隨機不匹配；別忘了 post-sim 的寄生。良率用 30 顆晶片的 Monte Carlo 算。', 'A 1:4 mirror: MOUT is four unit fingers identical to MREF. Put MREF in the middle with MOUT\'s fingers symmetric on both sides and the gradient cancels; larger devices cut random mismatch; and mind the post-sim parasitics. Yield comes from a 30-die Monte Carlo.'),
    fig: { lay: F.figRatio, height: 180 },
    caption: L('O O R O O：參考管在中間。', 'O O R O O: the reference finger in the middle.'),
  }],
};

// ---------------- concept checks appended to a level's cards ----------------
const q = (zh: string, en: string, options: [string, string][], answer: number, ezh: string, een: string): Slide => ({
  title: L('小測驗', 'Quick check'),
  body: L(zh, en),
  quiz: { options: options.map(([a, b]) => L(a, b)), answer, explain: L(ezh, een) },
});

const QUIZZES: Record<string, Slide> = {
  '0-1': q('12 V 電源接一顆 4 kΩ 電阻，電流是多少？', 'A 12 V source across 4 kΩ drives how much current?',
    [['3 mA', '3 mA'], ['48 mA', '48 mA'], ['0.33 mA', '0.33 mA']], 0, 'I = V ÷ R = 12 ÷ 4000 = 3 mA。', 'I = V ÷ R = 12 ÷ 4000 = 3 mA.'),
  '0-2': q('5 V 電源、紅色 LED（1.8 V），想要 10 mA，電阻上的電壓是？', '5 V supply, red LED (1.8 V), 10 mA wanted. What voltage sits across the resistor?',
    [['3.2 V', '3.2 V'], ['5 V', '5 V'], ['1.8 V', '1.8 V']], 0, '剩下的電壓 5 − 1.8 = 3.2 V 都落在電阻上，所以 R = 3.2 V ÷ 10 mA。', 'The rest, 5 − 1.8 = 3.2 V, falls across the resistor, so R = 3.2 V ÷ 10 mA.'),
  '1-1': q('分壓器的兩顆電阻同時放大 10 倍，輸出電壓會？', 'If both divider resistors are scaled up 10×, the output voltage…',
    [['不變，但電流變成 1/10', 'stays the same, with 1/10 the current'], ['變成 10 倍', 'becomes 10× larger'], ['變成 1/10', 'becomes 1/10']], 0, '輸出只看比例 R2/(R1+R2)；絕對值決定耗電。', 'The output depends only on the ratio R2/(R1+R2); the absolute values set the power.'),
  '1-3': q('RC 低通的 R 加倍，−3 dB 頻率會？', 'Doubling R in an RC low-pass moves the −3 dB frequency…',
    [['變成一半', 'to half'], ['變成兩倍', 'to double'], ['不變', 'nowhere']], 0, 'f = 1 / (2πRC)，R 加倍 → f 減半。', 'f = 1 / (2πRC): double R, half f.'),
  '2-3': q('閘極電壓固定，W 加倍、L 不變，飽和區電流會？', 'With a fixed gate voltage, doubling W at the same L makes the saturation current…',
    [['約加倍', 'about double'], ['約減半', 'about half'], ['變成 4 倍', 'four times larger']], 0, 'I ∝ W/L，W 加倍 → 電流加倍。', 'I ∝ W/L: double W, double the current.'),
  '3-1': q('電流鏡 M1 是 W = 2 µm，想讓 M2 輸出 3 倍的電流（L 相同），M2 的 W 要？', 'Mirror M1 has W = 2 µm. For three times the current in M2 (same L), M2\'s W should be…',
    [['6 µm', '6 µm'], ['0.67 µm', '0.67 µm'], ['2 µm', '2 µm']], 0, 'Iout / Iref = (W/L)₂ / (W/L)₁。', 'Iout / Iref = (W/L)₂ / (W/L)₁.'),
  '3-2': q('共源放大器的增益是正的還是負的？', 'Is the common-source amplifier\'s gain positive or negative?',
    [['負的（反相）', 'Negative (inverting)'], ['正的', 'Positive'], ['看偏壓', 'Depends on the bias']], 0, '輸入上升 → 電流變大 → RD 上壓降變大 → 輸出下降。', 'Input up → more current → more drop across RD → output down.'),
  '4-1': q('差動對兩個輸入同時上升 10 mV，理想上輸出差會？', 'Both diff-pair inputs rise by 10 mV together. Ideally the output difference…',
    [['不變', 'stays the same'], ['變大', 'grows'], ['變號', 'changes sign']], 0, '差動對只放大兩輸入的「差」，共模變化被尾電流擋掉。', 'A differential pair amplifies only the difference; the tail current blocks common-mode changes.'),
  '4-2': q('5T OTA 的 UGB 大約是？', 'The 5T OTA\'s unity-gain bandwidth is roughly…',
    [['gm1 / (2π·CL)', 'gm1 / (2π·CL)'], ['gm1 · ro', 'gm1 · ro'], ['1 / (2π·R·C)', '1 / (2π·R·C)']], 0, 'A0 = gm1·(ro2∥ro4)、極點 1/(2π·ro·CL)，相乘得 UGB ≈ gm1/(2πCL)。', 'A0 = gm1·(ro2∥ro4) times a pole at 1/(2π·ro·CL) gives UGB ≈ gm1/(2πCL).'),
  '5-1': q('第二級為什麼讓 vp 接 M2、vn 接 M1？', 'Why does vp go to M2 and vn to M1 here?',
    [['第二級會反相，要把整體極性轉回來', 'Stage two inverts, so the overall polarity must be restored'], ['M2 比較大', 'M2 is larger'], ['隨便接都可以', 'Either way works']], 0, '從 M2 閘極到 x1 是反相，第二級再反相一次，整體就是同相：vp 才是真正的 + 端。', 'M2\'s gate to x1 inverts and stage two inverts again, so overall it is non-inverting: vp is the true + input.'),
  '6-1': q('Vref 隨溫度往上翹，R2 應該？', 'Vref tilts upward with temperature. R2 should…',
    [['調小（PTAT 太多）', 'shrink (too much PTAT)'], ['調大', 'grow'], ['不用動', 'stay as is']], 0, 'PTAT 項 = (R2/R1)·VT·ln8，R2 越大往上翹越多。', 'The PTAT term is (R2/R1)·VT·ln8: a larger R2 tilts it up more.'),
  '6-2': q('LDO 的輸出電容越大，負載步階時？', 'A larger LDO output capacitor during a load step…',
    [['電壓跌得較少，但迴路要多花時間拉回', 'dips less, but the loop takes longer to recover'], ['完全不會跌', 'never dips'], ['跌得更多', 'dips more']], 0, '電容先供應瞬間的電流差：ΔV ≈ ΔI·Δt / C。', 'The capacitor supplies the instantaneous current difference: ΔV ≈ ΔI·Δt / C.'),
  '7-1': q('poly 的寬度決定電晶體的？', 'The poly width sets the transistor\'s…',
    [['L（通道長度）', 'L (channel length)'], ['W（通道寬度）', 'W (channel width)'], ['臨界電壓', 'threshold voltage']], 0, '電流從源極穿過 poly 底下流到汲極，所以穿越的距離 = poly 寬 = L。', 'Current crosses under the poly from source to drain, so the distance crossed — the poly width — is L.'),
  '8-1': q('A B B A 排法為什麼能抵消線性梯度？', 'Why does an A B B A pattern cancel a linear gradient?',
    [['A 和 B 的平均位置（重心）相同', 'A and B share the same average position (centroid)'], ['A 和 B 比較靠近', 'A and B sit closer together'], ['finger 比較多', 'There are more fingers']], 0, '線性梯度下，參數 = 位置的線性函數；重心相同 → 平均值相同。', 'Under a linear gradient a parameter is linear in position: equal centroids give equal averages.'),
  '9-1': q('同一條 met1 線，寬度加倍、長度不變，電阻會？', 'The same met1 line, twice as wide and just as long, has a resistance that…',
    [['變成一半', 'halves'], ['加倍', 'doubles'], ['不變', 'stays the same']], 0, 'R = R□ × L / W。', 'R = R□ × L / W.'),
};
for (const [id, slide] of Object.entries(QUIZZES)) (INTROS[id] ??= []).push(slide);

// The last step of each IP track opens with a recap of the parts.
const ASSEMBLE: Record<string, Slide> = {
  '5-1': {
    title: L('第 3 步：全部組合', 'Step 3: assemble it all'),
    body: L(
      '你已經做過第一級（4-2 的 5T OTA）、第二級（5-1a）和補償（5-1b）。這一關畫布是空的：從偏壓、輸入對、主動負載、第二級到 Rz / Cc，全部自己接起來，並在每個 corner 都穩定。',
      'You have built stage one (the 5T OTA in 4-2), stage two (5-1a) and the compensation (5-1b). This time the canvas is empty: wire the bias, input pair, active load, stage two and Rz / Cc yourself, and keep it stable at every corner.',
    ),
    fig: { sch: F.figTwoStage, values: false, height: 280 },
  },
  '6-1': {
    title: L('第 3 步：CTAT + PTAT', 'Step 3: CTAT + PTAT'),
    body: L(
      '運放讓 a 和 b 等電位，所以 R1 兩端剛好是 ΔVEB（PTAT），流過的電流 I = ΔVEB / R1。三顆 PMOS 把這個電流複製到右邊，流過 R2 產生 (R2/R1)·ΔVEB，再疊在 Q3 的 VEB（CTAT）上。選對 R2/R1，兩個斜率就抵消了。',
      'The op-amp holds a and b equal, so R1 carries exactly ΔVEB (PTAT) and a current I = ΔVEB / R1. Three PMOS copy that current to the right, where R2 turns it into (R2/R1)·ΔVEB on top of Q3\'s VEB (CTAT). Pick R2/R1 right and the slopes cancel.',
    ),
  },
  '6-2': {
    title: L('第 3 步：組合並面對負載步階', 'Step 3: assemble and face the load step'),
    body: L('把傳輸管（6-2a）和回授迴路（6-2b）組在一起。這次負載會在 0.1 µs 內從 1 mA 跳到 10 mA，要看暫態波形：迴路夠快，輸出才不會晃出 1.1–1.3 V。', 'Put the pass device (6-2a) and the feedback loop (6-2b) together. This time the load jumps from 1 mA to 10 mA within 0.1 µs, so watch the transient: only a fast enough loop keeps the output within 1.1–1.3 V.'),
  },
};
for (const [id, slide] of Object.entries(ASSEMBLE)) (INTROS[id] ??= []).unshift(slide);
