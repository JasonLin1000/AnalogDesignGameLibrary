// Two-stage Miller op-amp, taught in parts: 5-1a second stage, 5-1b compensation, 5-1 the whole amplifier.
import { toCircuit } from '../schematic/connectivity';
import { isMos } from '../schematic/parts';
import type { Circuit, LogicalPart, Schematic } from '../schematic/types';
import { C, L, Lb, P, X, sch } from './build';
import { figTwoStage } from './figures';
import type { IpPart, Level } from './types';

export const TWO_STAGE = L('兩級 Miller 運放', 'Two-stage Miller op-amp');
export const twoStagePart = (step: number): IpPart => ({ ip: TWO_STAGE, step, of: 3 });

/** Reference circuit = the locked starting parts (as the netlister sees them) plus the player's parts. */
const withStart = (start: Schematic, ...player: LogicalPart[]): Circuit => C(...toCircuit(start).circuit.parts, ...player);

// ---------------- 5-1a: the second stage ----------------
// AC drives x1 through CIN; LFB closes the loop at DC so M7 biases itself (x1 = out at DC).
const stage2Start = sch(
  [
    P('V', 'VDD', 0, 0, { dc: '1.8' }), P('GND', 'G1', 0, 3),
    P('I', 'IB', 10, -10, { dc: '20u' }),
    P('NFET', 'M6', 10, 0, { w: '4u', l: '1u', nf: '1' }), P('GND', 'G2', 12, 3),
    P('V', 'VIN', -12, 0, { dc: '0', ac: '1' }), P('GND', 'G3', -12, 3),
    P('C', 'CIN', 24, 0, { value: '1' }),
    P('L', 'LFB', 32, 0, { value: '1T' }),
    P('C', 'CL', 40, 0, { value: '2p' }), P('GND', 'G4', 40, 3),
  ],
  [],
  [
    Lb('vdd', 0, -3), Lb('vdd', 10, -13), Lb('nbias', 10, -7), Lb('nbias', 12, -3), Lb('nbias', 7, 0),
    Lb('vin', -12, -3), Lb('vin', 24, -3), Lb('x1', 24, 3), Lb('out', 32, -3), Lb('x1', 32, 3), Lb('out', 40, -3),
  ],
);
const stage2 = (w7: string, l7: string, w8: string, l8: string) => withStart(stage2Start,
  X('PFET', 'M7', { w: w7, l: l7, nf: '1' }, { d: 'out', g: 'x1', s: 'vdd', b: 'vdd' }),
  X('NFET', 'M8', { w: w8, l: l8, nf: '1' }, { d: 'out', g: 'nbias', s: '0', b: '0' }));

export const secondStageLevel: Level = {
  id: '5-1a', chapter: 5, part: twoStagePart(1),
  title: L('第二級：共源增益級', 'Stage two: the gain stage'),
  story: L(
    '大型電路要一塊一塊做。先做兩級運放的第二級：一顆 PMOS 共源放大器 M7，負載是 NMOS 電流源 M8。偏壓電路（IB、M6）和測試台已經接好了。',
    'Big circuits are built block by block. Start with stage two of the op-amp: a PMOS common-source amplifier M7 loaded by an NMOS current source M8. The bias (IB, M6) and the test bench are already wired.',
  ),
  objective: L(
    '放入 M7（PFET：源極 vdd、閘極 x1、汲極 out）和 M8（NFET：閘極 nbias、汲極 out、源極接地），讓增益 ≥ 30 dB。',
    'Add M7 (PFET: source vdd, gate x1, drain out) and M8 (NFET: gate nbias, drain out, source ground) for a gain ≥ 30 dB.',
  ),
  concept: {
    title: L('本質增益 gm·ro', 'Intrinsic gain gm·ro'),
    body: L(
      '共源級的增益 = gm7 ×（ro7 ∥ ro8）。電流越大 gm 越大，但 ro 越小；L 越長 ro 越大。所以「增益」和「速度（gm/CL）」要取捨：大電流換頻寬，長通道換增益。',
      'A common-source stage has gain gm7 × (ro7 ∥ ro8). More current raises gm but lowers ro; a longer L raises ro. So gain and speed (gm/CL) trade off: current buys bandwidth, channel length buys gain.',
    ),
  },
  hints: [
    L('M8 是 M6 的電流鏡：W8/W6 = 4 時，M8 流 80 µA。M7 會自動流同樣的電流（測試台用電感把 out 接回 x1）。', 'M8 mirrors M6: with W8/W6 = 4 it carries 80 µA. M7 carries the same current automatically (the bench ties out back to x1 through an inductor).'),
    L('★★：把 M7、M8 的 L 加長（例如 2～3 µm），ro 變大、增益上升。', '★★: lengthen M7 and M8 (e.g. 2–3 µm): ro rises and so does the gain.'),
    L('★★★：增益和頻寬要兼顧——電流不夠，UGB 就上不去。', '★★★: gain and bandwidth together — without enough current the UGB won\'t reach the target.'),
  ],
  palette: [{ kind: 'PFET', max: 1, params: { w: '16u', l: '1u' } }, { kind: 'NFET', max: 1, params: { w: '8u', l: '1u' } }],
  start: stage2Start,
  analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }],
  plots: [{ analysis: 'ac', node: 'out', show: 'db' }],
  specs: [{ id: 'a', label: L('第二級增益', 'Stage-two gain'), measure: { kind: 'ac_gain_db', node: 'out', freq: 10 }, min: 30, unit: 'dB' }],
  stars: [
    [{ id: 'a2', label: L('增益 ≥ 38 dB', 'Gain ≥ 38 dB'), measure: { kind: 'ac_gain_db', node: 'out', freq: 10 }, min: 38, unit: 'dB' }],
    [{ id: 'ugb', label: L('同時 UGB ≥ 40 MHz', 'And UGB ≥ 40 MHz'), measure: { kind: 'ac_ugb', node: 'out' }, min: 40e6, unit: 'Hz' }],
  ],
  solutions: [
    { stars: 1, circuit: stage2('16u', '1u', '8u', '1u') },
    { stars: 2, circuit: stage2('8u', '2u', '2u', '2u') },
    { stars: 3, circuit: stage2('96u', '3u', '48u', '3u') },
  ],
};

// ---------------- 5-1b: Miller compensation ----------------
const SIZES: Record<string, Record<string, string>> = {
  M1: { w: '8u', l: '0.5u' }, M2: { w: '8u', l: '0.5u' }, M3: { w: '4u', l: '1u' }, M4: { w: '4u', l: '1u' },
  M5: { w: '4u', l: '1u' }, M6: { w: '4u', l: '1u' }, M7: { w: '32u', l: '1u' }, M8: { w: '16u', l: '1u' },
};
function compStart(): Schematic {
  const s = structuredClone(figTwoStage);
  s.parts = s.parts.filter((p) => p.name !== 'RZ' && p.name !== 'CC').map((p) => ({
    ...p, locked: true, params: { ...p.params, ...(SIZES[p.name] ?? {}), ...(isMos(p.kind) ? { nf: '1' } : {}) },
  }));
  s.wires = s.wires.filter((w) => !(w.b.x === 24 && w.b.y === -7)).map((w) => ({ ...w, locked: true }));
  s.labels = s.labels.filter((l) => l.name !== 'z').map((l) => ({ ...l, locked: true }));
  // open-loop bench: DC feedback through LFB, vn grounded for AC by CFB
  s.parts.push(
    P('V', 'VDD', 50, 0, { dc: '1.8' }), P('GND', 'GB1', 50, 3),
    P('V', 'VP', 58, 0, { dc: '0.9', ac: '1' }), P('GND', 'GB2', 58, 3),
    P('L', 'LFB', 66, 0, { value: '1T' }),
    P('C', 'CFB', 74, 0, { value: '1' }), P('GND', 'GB3', 74, 3),
  );
  s.labels.push(Lb('vdd', 50, -3), Lb('vp', 58, -3), Lb('out', 66, -3), Lb('vn', 66, 3), Lb('vn', 74, -3));
  return s;
}
const compStartSch = compStart();
const comp = (cc: string, rz: string) => withStart(compStartSch,
  X('R', 'RZ', { value: rz }, { p: 'x1', n: 'z' }), X('C', 'CC', { value: cc }, { p: 'z', n: 'out' }));

export const compensationLevel: Level = {
  id: '5-1b', chapter: 5, part: twoStagePart(2),
  title: L('Miller 補償：讓它不振盪', 'Miller compensation: stop the ringing'),
  story: L(
    '兩級都接好了（第一級 5T OTA、第二級你剛做的共源級），增益很大——但相位掉得太快，一接成回授就會振盪。你的工作只有一件：在 x1 和 out 之間放上補償網路。',
    'Both stages are wired (a 5T OTA, then the common-source stage you just built) and the gain is huge — but the phase falls too fast and it would oscillate in feedback. Your only job: add the compensation network between x1 and out.',
  ),
  objective: L('在 x1 → Rz → Cc → out 放入補償：A0 ≥ 60 dB、UGB ≥ 5 MHz、相位邊限 ≥ 45°。', 'Add x1 → Rz → Cc → out: A0 ≥ 60 dB, UGB ≥ 5 MHz, phase margin ≥ 45°.'),
  concept: {
    title: L('相位邊限', 'Phase margin'),
    body: L(
      '增益掉到 0 dB（UGB）時，相位離 −180° 還有幾度，就是相位邊限。< 0° 會振盪，45° 會有明顯過衝，60° 左右最乾淨。Cc 越大越穩、頻寬越小；Rz 把右半平面零點推走，能多拿回幾十度。',
      'The phase margin is how far the phase is from −180° where the gain crosses 0 dB (the UGB). Below 0° it oscillates, 45° rings noticeably, about 60° is clean. A larger Cc is more stable but slower; Rz pushes the right-half-plane zero away and wins back tens of degrees.',
    ),
  },
  hints: [
    L('先只放 Cc = 1 pF（Rz 用很小的值，例如 1），看看相位邊限。', 'Start with Cc = 1 pF alone (Rz tiny, e.g. 1) and read the phase margin.'),
    L('Rz 大約 1/gm7，從 1 kΩ～3 kΩ 試起。下方 Bode 圖的相位曲線會跟著變。', 'Rz is about 1/gm7: try 1 kΩ to 3 kΩ. Watch the phase curve in the Bode plot.'),
  ],
  palette: [{ kind: 'R', max: 1, params: { value: '1k' } }, { kind: 'C', max: 1, params: { value: '1p' } }],
  start: compStartSch,
  analyses: [{ kind: 'op' }, { kind: 'ac', fstart: '1', fstop: '1g', ppd: 20 }],
  plots: [{ analysis: 'ac', node: 'out', show: 'db' }, { analysis: 'ac', node: 'out', show: 'phase' }],
  specs: [
    { id: 'a0', label: L('直流增益 A0', 'DC gain A0'), measure: { kind: 'ac_gain_db', node: 'out', freq: 1 }, min: 60, unit: 'dB' },
    { id: 'ugb', label: L('單位增益頻寬', 'Unity-gain bandwidth'), measure: { kind: 'ac_ugb', node: 'out' }, min: 5e6, unit: 'Hz' },
    { id: 'pm', label: L('相位邊限', 'Phase margin'), measure: { kind: 'ac_pm', node: 'out' }, min: 45, unit: '°' },
  ],
  stars: [[{ id: 'pm60', label: L('相位邊限 ≥ 60°', 'Phase margin ≥ 60°'), measure: { kind: 'ac_pm', node: 'out' }, min: 60, unit: '°' }]],
  solutions: [
    { stars: 0, circuit: comp('0.5p', '100') },
    { stars: 1, circuit: comp('0.8p', '1k') },
    { stars: 2, circuit: comp('1.5p', '3k') },
  ],
};
