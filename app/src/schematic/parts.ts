// Part library: pins, parameters, symbol geometry (grid units) and SPICE generation.
import type { Localized } from '../i18n';
import type { LogicalPart, Part, PartKind, Pt, Rot } from './types';

export interface ParamDef {
  key: string;
  label: Localized;
  default: string;
  unit?: string;
  text?: boolean; // free text (e.g. transient waveform), not a number
}

export interface PinDef { name: string; x: number; y: number }

export interface SymbolDef {
  paths: string[];
  circles?: { cx: number; cy: number; r: number; fill?: boolean }[];
  tag?: { x: number; y: number; text: string }; // small text drawn inside symbol
  extent?: [number, number, number, number];   // local bbox corners when the symbol sticks out past its pins
}

export interface SpiceOut {
  lines: string[];
  models?: string[];      // .model cards (deduplicated by netlister)
  sky130?: boolean;       // needs the SKY130 model library
}

export interface PartDef {
  kind: PartKind;
  prefix: string;          // instance name prefix shown to the player
  spicePrefix: string;     // required first letter for SPICE
  title: Localized;
  pins: PinDef[];
  params: ParamDef[];
  symbol: SymbolDef;
  /** Main value shown next to the symbol. */
  valueText: (p: Record<string, string>) => string;
  spice: (p: LogicalPart) => SpiceOut;
  /** SPICE vectors to save for operating-point annotation. */
  opVectors?: (p: LogicalPart) => Record<string, string>;
}

export const spiceName = (def: PartDef, name: string) =>
  name.toUpperCase().startsWith(def.spicePrefix) ? name : def.spicePrefix + name;

const lc = (s: string) => s.toLowerCase();

// ---- Built-in models (teaching models; SKY130 comes from the PDK library) ----
export const MODELS = {
  DGEN: '.model DGEN D(IS=2.52n RS=0.568 N=1.752 CJO=4p M=0.4 TT=20n BV=100 IBV=0.1u)',
  DLED: '.model DLED D(IS=1e-19 N=1.8 RS=3 CJO=20p BV=5 IBV=10u)',
  NMOS_L1: '.model NMOS_L1 NMOS(LEVEL=1 VTO=0.5 KP=200u GAMMA=0.4 PHI=0.7 LAMBDA=0.1 TOX=4n CGSO=0.3n CGDO=0.3n CJ=0.5m)',
  PMOS_L1: '.model PMOS_L1 PMOS(LEVEL=1 VTO=-0.5 KP=80u GAMMA=0.4 PHI=0.7 LAMBDA=0.1 TOX=4n CGSO=0.3n CGDO=0.3n CJ=0.5m)',
};

const twoPin: PinDef[] = [{ name: 'p', x: 0, y: -3 }, { name: 'n', x: 0, y: 3 }];
const diodePins: PinDef[] = [{ name: 'a', x: 0, y: -3 }, { name: 'k', x: 0, y: 3 }];
const nmosPins: PinDef[] = [
  { name: 'd', x: 2, y: -3 }, { name: 'g', x: -3, y: 0 }, { name: 's', x: 2, y: 3 }, { name: 'b', x: 2, y: 0 },
];
const pmosPins: PinDef[] = [
  { name: 's', x: 2, y: -3 }, { name: 'g', x: -3, y: 0 }, { name: 'd', x: 2, y: 3 }, { name: 'b', x: 2, y: 0 },
];

const nmosSymbol = (tag?: string): SymbolDef => ({
  paths: [
    'M-3,0 H-1 M-1,-1.5 V1.5', 'M-0.5,-2 V2',
    'M-0.5,-1.5 H2 V-3', 'M-0.5,1.5 H2 V3',
    'M-0.5,0 H2', 'M0.5,-0.45 L-0.2,0 L0.5,0.45',
  ],
  tag: tag ? { x: 0.6, y: 2.6, text: tag } : undefined,
});
const pmosSymbol = (tag?: string): SymbolDef => ({
  paths: [
    'M-3,0 H-1.7 M-1,-1.5 V1.5', 'M-0.5,-2 V2',
    'M-0.5,-1.5 H2 V-3', 'M-0.5,1.5 H2 V3',
    'M-0.5,0 H2', 'M0.6,-0.45 L1.3,0 L0.6,0.45',
  ],
  circles: [{ cx: -1.35, cy: 0, r: 0.35 }],
  tag: tag ? { x: 0.6, y: 2.6, text: tag } : undefined,
});

const L = (zh: string, en: string): Localized => ({ 'zh-TW': zh, en });

const sourceLine = (p: LogicalPart) => {
  const dc = p.params.dc || '0';
  const ac = p.params.ac && p.params.ac !== '0' ? ` AC ${p.params.ac}` : '';
  const tr = p.params.tran?.trim() ? ` ${p.params.tran.trim()}` : '';
  return `DC ${dc}${ac}${tr}`;
};

const mosOp = (inst: string): Record<string, string> => ({
  id: `@${inst}[id]`, gm: `@${inst}[gm]`, gds: `@${inst}[gds]`,
  vth: `@${inst}[vth]`, vdsat: `@${inst}[vdsat]`, vgs: `@${inst}[vgs]`, vds: `@${inst}[vds]`,
});

export const PARTS: Record<PartKind, PartDef> = {
  R: {
    kind: 'R', prefix: 'R', spicePrefix: 'R', title: L('電阻', 'Resistor'), pins: twoPin,
    params: [{ key: 'value', label: L('電阻值', 'Resistance'), default: '1k', unit: 'Ω' }],
    symbol: { paths: ['M0,-3 V-2 L0.7,-1.67 L-0.7,-1 L0.7,-0.33 L-0.7,0.33 L0.7,1 L-0.7,1.67 L0,2 V3'] },
    valueText: (p) => `${p.value} Ω`,
    spice: (p) => ({ lines: [`${spiceName(PARTS.R, p.name)} ${p.nets.p} ${p.nets.n} ${p.params.value}`] }),
    opVectors: (p) => ({ i: `@${lc(spiceName(PARTS.R, p.name))}[i]` }),
  },
  C: {
    kind: 'C', prefix: 'C', spicePrefix: 'C', title: L('電容', 'Capacitor'), pins: twoPin,
    params: [{ key: 'value', label: L('電容值', 'Capacitance'), default: '1u', unit: 'F' }],
    symbol: { paths: ['M0,-3 V-0.4 M-1.3,-0.4 H1.3 M-1.3,0.4 H1.3 M0,0.4 V3'] },
    valueText: (p) => `${p.value} F`,
    spice: (p) => ({ lines: [`${spiceName(PARTS.C, p.name)} ${p.nets.p} ${p.nets.n} ${p.params.value}`] }),
  },
  L: {
    kind: 'L', prefix: 'L', spicePrefix: 'L', title: L('電感', 'Inductor'), pins: twoPin,
    params: [{ key: 'value', label: L('電感值', 'Inductance'), default: '1m', unit: 'H' }],
    symbol: { paths: ['M0,-3 V-2 a0.5,0.5 0 0 1 0,1 a0.5,0.5 0 0 1 0,1 a0.5,0.5 0 0 1 0,1 a0.5,0.5 0 0 1 0,1 V3'] },
    valueText: (p) => `${p.value} H`,
    spice: (p) => ({ lines: [`${spiceName(PARTS.L, p.name)} ${p.nets.p} ${p.nets.n} ${p.params.value}`] }),
  },
  V: {
    kind: 'V', prefix: 'V', spicePrefix: 'V', title: L('電壓源', 'Voltage source'), pins: twoPin,
    params: [
      { key: 'dc', label: L('直流電壓', 'DC voltage'), default: '1', unit: 'V' },
      { key: 'ac', label: L('AC 振幅', 'AC magnitude'), default: '0', unit: 'V' },
      { key: 'tran', label: L('暫態波形', 'Transient waveform'), default: '', text: true },
    ],
    symbol: {
      paths: ['M0,-3 V-1.5 M0,1.5 V3', 'M-0.4,-0.8 H0.4 M0,-1.2 V-0.4', 'M-0.4,0.8 H0.4'],
      circles: [{ cx: 0, cy: 0, r: 1.5 }],
    },
    valueText: (p) => [p.tran?.trim() ? p.tran.split('(')[0] : `${p.dc} V`, p.ac && p.ac !== '0' ? `AC ${p.ac}` : ''].filter(Boolean).join(' '),
    spice: (p) => ({ lines: [`${spiceName(PARTS.V, p.name)} ${p.nets.p} ${p.nets.n} ${sourceLine(p)}`] }),
    opVectors: (p) => ({ i: `${lc(spiceName(PARTS.V, p.name))}#branch` }),
  },
  I: {
    kind: 'I', prefix: 'I', spicePrefix: 'I', title: L('電流源', 'Current source'), pins: twoPin,
    params: [
      { key: 'dc', label: L('直流電流', 'DC current'), default: '10u', unit: 'A' },
      { key: 'ac', label: L('AC 振幅', 'AC magnitude'), default: '0', unit: 'A' },
      { key: 'tran', label: L('暫態波形', 'Transient waveform'), default: '', text: true },
    ],
    symbol: {
      paths: ['M0,-3 V-1.5 M0,1.5 V3', 'M0,-0.9 V0.9 M-0.45,0.35 L0,0.9 L0.45,0.35'],
      circles: [{ cx: 0, cy: 0, r: 1.5 }],
    },
    valueText: (p) => `${p.dc} A`,
    spice: (p) => ({ lines: [`${spiceName(PARTS.I, p.name)} ${p.nets.p} ${p.nets.n} ${sourceLine(p)}`] }),
  },
  GND: {
    kind: 'GND', prefix: 'GND', spicePrefix: '', title: L('接地', 'Ground'), pins: [{ name: 'g', x: 0, y: 0 }],
    params: [],
    symbol: { paths: ['M0,0 V1 M-1.2,1 H1.2 M-0.75,1.45 H0.75 M-0.3,1.9 H0.3'] },
    valueText: () => '',
    spice: () => ({ lines: [] }),
  },
  D: {
    kind: 'D', prefix: 'D', spicePrefix: 'D', title: L('二極體', 'Diode'), pins: diodePins,
    params: [],
    symbol: { paths: ['M0,-3 V-0.8 M-1,-0.8 H1 L0,0.8 Z M-1,0.8 H1 M0,0.8 V3'] },
    valueText: () => '',
    spice: (p) => ({ lines: [`${spiceName(PARTS.D, p.name)} ${p.nets.a} ${p.nets.k} DGEN`], models: [MODELS.DGEN] }),
    opVectors: (p) => ({ i: `@${lc(spiceName(PARTS.D, p.name))}[id]` }),
  },
  LED: {
    kind: 'LED', prefix: 'LED', spicePrefix: 'D', title: L('發光二極體', 'LED'), pins: diodePins,
    params: [],
    symbol: {
      paths: ['M0,-3 V-0.8 M-1,-0.8 H1 L0,0.8 Z M-1,0.8 H1 M0,0.8 V3',
        'M1.3,-0.2 L2.2,-1.1 M1.7,-1.1 H2.2 V-0.6', 'M1.3,0.6 L2.2,-0.3 M1.7,-0.3 H2.2 V0.2'],
      extent: [-1.4, -3, 2.6, 3],
    },
    valueText: () => '',
    spice: (p) => ({ lines: [`${spiceName(PARTS.LED, p.name)} ${p.nets.a} ${p.nets.k} DLED`], models: [MODELS.DLED] }),
    opVectors: (p) => ({ i: `@${lc(spiceName(PARTS.LED, p.name))}[id]` }),
  },
  NMOS: {
    kind: 'NMOS', prefix: 'M', spicePrefix: 'M', title: L('NMOS（教學模型）', 'NMOS (teaching model)'), pins: nmosPins,
    params: [
      { key: 'w', label: L('寬度 W', 'Width W'), default: '1u', unit: 'm' },
      { key: 'l', label: L('長度 L', 'Length L'), default: '1u', unit: 'm' },
    ],
    symbol: nmosSymbol(),
    valueText: (p) => `${p.w}/${p.l}`,
    spice: (p) => ({
      lines: [`${spiceName(PARTS.NMOS, p.name)} ${p.nets.d} ${p.nets.g} ${p.nets.s} ${p.nets.b} NMOS_L1 W=${p.params.w} L=${p.params.l}`],
      models: [MODELS.NMOS_L1],
    }),
    opVectors: (p) => mosOp(lc(spiceName(PARTS.NMOS, p.name))),
  },
  PMOS: {
    kind: 'PMOS', prefix: 'M', spicePrefix: 'M', title: L('PMOS（教學模型）', 'PMOS (teaching model)'), pins: pmosPins,
    params: [
      { key: 'w', label: L('寬度 W', 'Width W'), default: '2u', unit: 'm' },
      { key: 'l', label: L('長度 L', 'Length L'), default: '1u', unit: 'm' },
    ],
    symbol: pmosSymbol(),
    valueText: (p) => `${p.w}/${p.l}`,
    spice: (p) => ({
      lines: [`${spiceName(PARTS.PMOS, p.name)} ${p.nets.d} ${p.nets.g} ${p.nets.s} ${p.nets.b} PMOS_L1 W=${p.params.w} L=${p.params.l}`],
      models: [MODELS.PMOS_L1],
    }),
    opVectors: (p) => mosOp(lc(spiceName(PARTS.PMOS, p.name))),
  },
  NFET: {
    kind: 'NFET', prefix: 'M', spicePrefix: 'X', title: L('NFET（SKY130 1.8V）', 'NFET (SKY130 1.8V)'), pins: nmosPins,
    params: [
      { key: 'w', label: L('寬度 W', 'Width W'), default: '1u', unit: 'm' },
      { key: 'l', label: L('長度 L', 'Length L'), default: '0.15u', unit: 'm' },
      { key: 'nf', label: L('指數 nf', 'Fingers nf'), default: '1' },
    ],
    symbol: nmosSymbol('130'),
    valueText: (p) => `${p.w}/${p.l}${p.nf && p.nf !== '1' ? ` ×${p.nf}` : ''}`,
    spice: (p) => ({
      lines: [`${spiceName(PARTS.NFET, p.name)} ${p.nets.d} ${p.nets.g} ${p.nets.s} ${p.nets.b} sky130_fd_pr__nfet_01v8 W=${p.params.w} L=${p.params.l} nf=${p.params.nf || 1}`],
      sky130: true,
    }),
    opVectors: (p) => mosOp(`m.${lc(spiceName(PARTS.NFET, p.name))}.msky130_fd_pr__nfet_01v8`),
  },
  PFET: {
    kind: 'PFET', prefix: 'M', spicePrefix: 'X', title: L('PFET（SKY130 1.8V）', 'PFET (SKY130 1.8V)'), pins: pmosPins,
    params: [
      { key: 'w', label: L('寬度 W', 'Width W'), default: '2u', unit: 'm' },
      { key: 'l', label: L('長度 L', 'Length L'), default: '0.15u', unit: 'm' },
      { key: 'nf', label: L('指數 nf', 'Fingers nf'), default: '1' },
    ],
    symbol: pmosSymbol('130'),
    valueText: (p) => `${p.w}/${p.l}${p.nf && p.nf !== '1' ? ` ×${p.nf}` : ''}`,
    spice: (p) => ({
      lines: [`${spiceName(PARTS.PFET, p.name)} ${p.nets.d} ${p.nets.g} ${p.nets.s} ${p.nets.b} sky130_fd_pr__pfet_01v8 W=${p.params.w} L=${p.params.l} nf=${p.params.nf || 1}`],
      sky130: true,
    }),
    opVectors: (p) => mosOp(`m.${lc(spiceName(PARTS.PFET, p.name))}.msky130_fd_pr__pfet_01v8`),
  },
};

export const isMos = (k: PartKind) => k === 'NMOS' || k === 'PMOS' || k === 'NFET' || k === 'PFET';
export const isPChannel = (k: PartKind) => k === 'PMOS' || k === 'PFET';

/** Transform a local symbol point into world grid coordinates. */
export function xform(pt: Pt, part: Pick<Part, 'x' | 'y' | 'rot' | 'mirror'>): Pt {
  let { x, y } = pt;
  if (part.mirror) x = -x;
  for (let i = 0; i < part.rot; i++) [x, y] = [-y, x];
  return { x: x + part.x, y: y + part.y };
}

export function pinPositions(part: Part): { name: string; pt: Pt }[] {
  return PARTS[part.kind].pins.map((p) => ({ name: p.name, pt: xform(p, part) }));
}

export function defaultParams(kind: PartKind): Record<string, string> {
  return Object.fromEntries(PARTS[kind].params.map((p) => [p.key, p.default]));
}

export const nextRot = (r: Rot): Rot => ((r + 1) % 4) as Rot;
