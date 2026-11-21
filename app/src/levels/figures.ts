// Example drawings for the tutorial cards: wired schematics (checked by figures.test.ts)
// and small layout sketches. They illustrate a topology; values are only shown where harmless.
import { contactStack, instanceTerminals } from '../layout/pcell';
import type { Box, Instance, LayerId, Layout, LLabel, Shape } from '../layout/types';
import type { Part, PartKind, Rot, Schematic } from '../schematic/types';
import { defaultParams } from '../schematic/parts';

let n = 0;
const part = (kind: PartKind, name: string, x: number, y: number, params: Record<string, string> = {}, rot: Rot = 0, mirror = false): Part =>
  ({ id: `f${n++}`, kind, name, x, y, rot, mirror, params: { ...defaultParams(kind), ...params } });
const w = (x1: number, y1: number, x2: number, y2: number) => ({ id: `fw${n++}`, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const lb = (name: string, x: number, y: number) => ({ id: `fl${n++}`, name, x, y });
const gnd = (x: number, y: number) => part('GND', `G${n}`, x, y);

// ---------------- schematic figures ----------------
export const figOhm: Schematic = {
  parts: [part('V', 'V1', 0, 0, { dc: '5' }), gnd(0, 3), part('R', 'R1', 8, -4, { value: '1k' }), gnd(8, -1)],
  wires: [w(0, -3, 0, -7), w(0, -7, 8, -7)],
  labels: [],
};

export const figLed: Schematic = {
  parts: [part('V', 'V1', 0, 0, { dc: '5' }), gnd(0, 3), part('R', 'R1', 5, -7, {}, 1), part('LED', 'LED1', 11, 0), gnd(11, 3)],
  wires: [w(0, -3, 0, -7), w(0, -7, 2, -7), w(8, -7, 11, -7), w(11, -7, 11, -3)],
  labels: [],
};

export const figDivider: Schematic = {
  parts: [part('V', 'V1', 0, 0, { dc: '3.3' }), gnd(0, 3), part('R', 'R1', 8, -5), part('R', 'R2', 8, 1), gnd(8, 4)],
  wires: [w(0, -3, 0, -8), w(0, -8, 8, -8), w(8, -2, 12, -2)],
  labels: [lb('out', 12, -2)],
};

export const figRc: Schematic = {
  parts: [part('V', 'VIN', 0, 0, { dc: '0', ac: '1' }), gnd(0, 3), part('R', 'R1', 5, -7, {}, 1), part('C', 'C1', 11, -4), gnd(11, -1)],
  wires: [w(0, -3, 0, -7), w(0, -7, 2, -7), w(8, -7, 11, -7), w(11, -7, 15, -7)],
  labels: [lb('out', 15, -7)],
};

export const figNmosSwitch: Schematic = {
  parts: [part('R', 'RD', 2, -6), part('NMOS', 'M1', 0, 0), gnd(2, 3)],
  wires: [w(2, -9, 2, -11), w(-3, 0, -6, 0), w(2, -3, 6, -3)],
  labels: [lb('vdd', 2, -11), lb('gate', -6, 0), lb('drain', 6, -3)],
};

export const figMirror: Schematic = {
  parts: [
    part('I', 'IREF', -2, -7, { dc: '10u' }),
    part('NMOS', 'M1', 0, 0, {}, 0, true), part('NMOS', 'M2', 10, 0),
    gnd(-2, 3), gnd(12, 3),
  ],
  wires: [w(-2, -10, -2, -12), w(-2, -4, -2, -3), w(3, 0, 5, 0), w(5, 0, 7, 0), w(5, 0, 5, -4), w(5, -4, -2, -4), w(12, -3, 12, -7)],
  labels: [lb('vdd', -2, -12), lb('out', 12, -7)],
};

export const figCsAmp: Schematic = {
  parts: [part('R', 'RD', 2, -6), part('NMOS', 'M1', 0, 0), gnd(2, 3)],
  wires: [w(2, -9, 2, -11), w(-3, 0, -6, 0), w(2, -3, 6, -3)],
  labels: [lb('vdd', 2, -11), lb('in', -6, 0), lb('out', 6, -3)],
};

export const figDiffPair: Schematic = {
  parts: [
    part('R', 'R1', 0, -9), part('R', 'R2', 14, -9),
    part('NFET', 'M1', -2, -3), part('NFET', 'M2', 16, -3, {}, 0, true),
    part('I', 'ITAIL', 7, 3, { dc: '20u' }), gnd(7, 6),
  ],
  wires: [
    w(0, -12, 7, -12), w(7, -12, 14, -12), w(7, -12, 7, -14),
    w(0, 0, 7, 0), w(7, 0, 14, 0),
    w(0, -6, 3, -6), w(14, -6, 11, -6),
    w(-5, -3, -7, -3), w(19, -3, 21, -3),
  ],
  labels: [lb('vdd', 7, -14), lb('outn', 3, -6), lb('outp', 11, -6), lb('inp', -7, -3), lb('inn', 21, -3), lb('tail', 7, 0)],
};

/** 5T OTA core with its bias branch. `x1` is the output node (M2 / M4 drains). */
function otaCore(inL: string, inR: string, outName: string, withLoad: boolean): Schematic {
  const parts: Part[] = [
    part('I', 'IB', -10, -4, { dc: '20u' }),
    part('PFET', 'M3', 2, -14, {}, 0, true), part('PFET', 'M4', 12, -14),
    part('NFET', 'M1', -2, -5), part('NFET', 'M2', 16, -5, {}, 0, true),
    part('NFET', 'M5', 5, 3), part('NFET', 'M6', -8, 3, {}, 0, true),
    gnd(7, 6), gnd(-10, 6),
  ];
  const wires = [
    // vdd rail
    w(-10, -20, 0, -20), w(0, -20, 14, -20), w(0, -17, 0, -20), w(14, -17, 14, -20), w(-10, -7, -10, -20),
    // PMOS mirror, M3 diode-connected
    w(5, -14, 7, -14), w(7, -14, 9, -14), w(7, -14, 7, -11), w(0, -11, 7, -11),
    // drains
    w(0, -11, 0, -8), w(14, -11, 14, -10), w(14, -10, 14, -8), w(14, -10, 20, -10),
    // tail
    w(0, -2, 0, 0), w(14, -2, 14, 0), w(0, 0, 7, 0), w(7, 0, 14, 0),
    // bias: IB into diode-connected M6, M5 mirrors it
    w(-10, -1, -10, 0), w(-10, 0, -3, 0), w(-3, 0, -3, 3), w(-5, 3, -3, 3), w(-3, 3, 2, 3),
    // inputs
    w(-5, -5, -7, -5), w(19, -5, 21, -5),
  ];
  const labels = [lb('vdd', 7, -20), lb('nbias', -3, 0), lb('tail', 7, 0), lb(inL, -7, -5), lb(inR, 21, -5), lb(outName, 20, -10)];
  if (withLoad) {
    parts.push(part('C', 'CL', 26, -7, { value: '1p' }), gnd(26, -4));
    wires.push(w(20, -10, 26, -10));
  }
  return { parts, wires, labels };
}

export const figOta: Schematic = otaCore('inp', 'inn', 'out', true);

export const figTwoStage: Schematic = (() => {
  const s = otaCore('vn', 'vp', 'x1', false);
  s.parts.push(
    part('PFET', 'M7', 34, -14), part('NFET', 'M8', 34, 3), gnd(36, 6),
    part('R', 'RZ', 27, -7, {}, 1), part('C', 'CC', 33, -7, {}, 1),
    part('C', 'CL', 40, -2, { value: '2p' }), gnd(40, 1),
  );
  s.wires.push(
    w(14, -20, 36, -20), w(36, -17, 36, -20),
    w(20, -10, 20, -14), w(20, -14, 24, -14), w(24, -14, 31, -14), w(24, -14, 24, -7),
    w(36, -11, 36, -7), w(36, -7, 36, -5), w(36, -5, 36, 0), w(36, -5, 40, -5),
    w(31, 3, 29, 3),
  );
  s.labels.push(lb('out', 40, -5), lb('nbias', 29, 3), lb('z', 30, -7));
  return s;
})();

export const figLdo: Schematic = {
  parts: [
    part('OPAMP', 'U1', 0, 0), part('PFET', 'MPASS', 10, -6, { w: '200u', l: '0.15u', nf: '4' }),
    part('R', 'R1', 12, 2), part('R', 'R2', 12, 8), gnd(12, 11),
    part('C', 'CL', 18, 2, { value: '1u' }), gnd(18, 5),
    part('I', 'ILOAD', 24, 2), gnd(24, 5),
  ],
  wires: [
    w(4, 0, 5, 0), w(5, 0, 5, -6), w(5, -6, 7, -6),
    w(12, -9, 12, -11),
    w(12, -3, 12, -1), w(12, -1, 18, -1), w(18, -1, 24, -1),
    w(12, 5, -8, 5), w(-8, 5, -8, -2), w(-8, -2, -4, -2),
    w(-4, 2, -6, 2),
  ],
  labels: [lb('vg', 5, -6), lb('vin', 12, -11), lb('out', 18, -1), lb('fb', -8, 5), lb('vref', -6, 2)],
};

// ---------------- layout figures ----------------
let m = 0;
const sh = (layer: LayerId, x0: number, y0: number, x1: number, y1: number): Shape => ({ id: `fs${m++}`, layer, x0, y0, x1, y1 });
const tx = (layer: LayerId, text: string, x: number, y: number): LLabel => ({ id: `ft${m++}`, layer, text, x, y });
const inst = (kind: Instance['kind'], name: string, x: number, y: number, wd: number, l: number, nf = 1): Instance =>
  ({ id: `fi${m++}`, kind, name, x, y, params: { w: wd, l, nf } });
const mid = (b: Box) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });
const stack = (kind: 'licon' | 'mcon' | 'via', x: number, y: number) => contactStack(kind, x, y).map((p) => sh(p.layer, p.box.x0, p.box.y0, p.box.x1, p.box.y1));

/** Tool tutorial: an NMOS PCell with labels on its li1 terminals. */
export const figPcell: Layout = (() => {
  const t0 = inst('nmos', 'M1', 0, 0, 1000, 150);
  const t = instanceTerminals(t0);
  const at = (b: Box, s: string) => { const c = mid(b); return tx('li1', s, c.x, c.y); };
  return { shapes: [], labels: [at(t.g!, 'g'), at(t.sd[0], 's'), at(t.sd[1], 'd')], instances: [t0] };
})();

/** A hand-drawn transistor: diff crossed by poly (W = 2 µm here). */
export const figHandFet: Layout = {
  shapes: [sh('diff', 0, 0, 650, 2000), sh('poly', 250, -130, 400, 2130)],
  labels: [tx('diff', 'S', 125, 1000), tx('diff', 'D', 525, 1000), tx('poly', 'G', 325, 2065)],
  instances: [],
};

/** Climbing the contact stack: gate pad → mcon → met1 with a pin label. */
export const figContacts: Layout = (() => {
  const t0 = inst('nmos', 'M1', 0, 0, 1000, 150);
  const g = mid(instanceTerminals(t0).g!);
  return { shapes: stack('mcon', g.x, g.y), labels: [tx('met1', 'g', g.x, g.y)], instances: [t0] };
})();

/** A PMOS sits in an N-well; an ntap ties the well to vdd. */
export const figWell: Layout = {
  shapes: [], labels: [],
  instances: [inst('pmos', 'MP', 0, 0, 2000, 150), inst('ntap', 'T1', -1000, 700, 600, 400)],
};

/** Four fingers in an A B B A pattern: both devices share one centre of gravity. */
export const figAbba: Layout = (() => {
  const shapes: Shape[] = [sh('diff', 0, 0, 3350, 1000)];
  const labels: LLabel[] = [];
  ['A', 'B', 'B', 'A'].forEach((s, i) => {
    const x = 400 + i * 800;
    shapes.push(sh('poly', x, -130, x + 150, 1130));
    labels.push(tx('poly', s, x + 75, 1065));
  });
  return { shapes, labels, instances: [] };
})();

/** One reference finger in the middle of four output fingers: O O R O O. */
export const figRatio: Layout = (() => {
  const shapes: Shape[] = [sh('diff', 0, 0, 4150, 1000)];
  const labels: LLabel[] = [];
  ['O', 'O', 'R', 'O', 'O'].forEach((s, i) => {
    const x = 400 + i * 800;
    shapes.push(sh('poly', x, -130, x + 150, 1130));
    labels.push(tx('poly', s, x + 75, 1065));
  });
  return { shapes, labels, instances: [] };
})();

/** Same length, different width: the wide line has a fraction of the resistance. */
export const figWires: Layout = {
  shapes: [sh('met1', 0, 0, 8000, 140), sh('met1', 0, 800, 8000, 2800)],
  labels: [tx('met1', '0.14 µm', 4000, 70), tx('met1', '2 µm', 4000, 1800)],
  instances: [],
};
