export interface Pt { x: number; y: number }

/** NMOS/PMOS = teaching Level-1 model; NFET/PFET = SKY130 1.8V devices. */
export type PartKind =
  | 'R' | 'C' | 'L' | 'V' | 'I' | 'GND' | 'D' | 'LED'
  | 'NMOS' | 'PMOS' | 'NFET' | 'PFET' | 'PNP' | 'OPAMP';

export type Rot = 0 | 1 | 2 | 3;

export interface Part {
  id: string;
  kind: PartKind;
  name: string;
  x: number; // grid units
  y: number;
  rot: Rot;
  mirror?: boolean;
  params: Record<string, string>;
  locked?: boolean;          // cannot move/delete/edit
  lockedParams?: string[];   // these params cannot be edited
}

export interface Wire { id: string; a: Pt; b: Pt; locked?: boolean }
export interface Label { id: string; name: string; x: number; y: number; locked?: boolean }

export interface Schematic { parts: Part[]; wires: Wire[]; labels: Label[] }

/** Geometry-free circuit: what the netlister actually needs. */
export interface LogicalPart {
  kind: PartKind;
  name: string;
  params: Record<string, string>;
  nets: Record<string, string>; // pin name -> net name
}
export interface Circuit { parts: LogicalPart[] }

export type Analysis =
  | { kind: 'op' }
  | { kind: 'dc'; source: string; start: string; stop: string; step: string }
  | { kind: 'ac'; fstart: string; fstop: string; ppd: number }
  | { kind: 'tran'; tstep: string; tstop: string }
  /** Small-signal noise: output node, input source (for input-referred noise). */
  | { kind: 'noise'; out: string; src: string; fstart: string; fstop: string; ppd: number };

export type Corner = 'tt' | 'ff' | 'ss' | 'sf' | 'fs';

export const emptySchematic = (): Schematic => ({ parts: [], wires: [], labels: [] });
