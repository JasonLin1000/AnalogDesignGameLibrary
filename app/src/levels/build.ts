// Helpers for authoring levels compactly.
import type { Localized } from '../i18n';
import { defaultParams } from '../schematic/parts';
import type { Circuit, LogicalPart, Part, PartKind, Rot, Schematic } from '../schematic/types';

export const L = (zh: string, en: string): Localized => ({ 'zh-TW': zh, en });

let seq = 0;
const id = (p: string) => `${p}${++seq}`;

/** A part in the starting schematic. Locked unless `free` is set. */
export function P(kind: PartKind, name: string, x: number, y: number,
  params: Record<string, string> = {}, opt: { rot?: Rot; free?: boolean; lockedParams?: string[] } = {}): Part {
  return {
    id: id('p'), kind, name, x, y, rot: opt.rot ?? 0,
    params: { ...defaultParams(kind), ...params },
    locked: !opt.free, lockedParams: opt.lockedParams,
  };
}

export const W = (x1: number, y1: number, x2: number, y2: number) =>
  ({ id: id('w'), a: { x: x1, y: y1 }, b: { x: x2, y: y2 }, locked: true });

export const Lb = (name: string, x: number, y: number) => ({ id: id('l'), name, x, y, locked: true });

export const sch = (parts: Part[], wires: ReturnType<typeof W>[] = [], labels: ReturnType<typeof Lb>[] = []): Schematic =>
  ({ parts, wires, labels });

/** Logical part for reference solutions: X('R','R1',{value:'1k'},{p:'a',n:'0'}) */
export function X(kind: PartKind, name: string, params: Record<string, string>, nets: Record<string, string>): LogicalPart {
  return { kind, name, params: { ...defaultParams(kind), ...params }, nets };
}
export const C = (...parts: LogicalPart[]): Circuit => ({ parts });
