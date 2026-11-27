// Operating-point power per part, and "magic smoke" when a part runs past its rating.
// Works on schematic parts (pins resolved through connectivity) and on logical circuit parts (nets).
import type { PinCurrent } from '../schematic/flow';
import type { Part, PartKind } from '../schematic/types';
import { parseSpice } from '../schematic/units';
import { partOpVec, plotFor, type SimResult } from './measure';

type PartLike = Pick<Part, 'kind' | 'name' | 'params'>;

/** Current flowing INTO each pin of a part at the operating point (undefined = unknown). */
export function pinCurrentFor(res: SimResult): PinCurrent {
  return (p: PartLike, pin: string) => {
    const two = (i: number | undefined, pos: string) => (i === undefined ? undefined : pin === pos ? i : -i);
    switch (p.kind) {
      case 'R': return two(partOpVec(res, p.name, 'i'), 'p');
      case 'D': case 'LED': return two(partOpVec(res, p.name, 'i'), 'a');
      case 'V': return two(partOpVec(res, p.name, 'i'), 'p');
      case 'I': { const i = parseSpice(p.params.dc); return Number.isFinite(i) ? two(i, 'p') : undefined; }
      case 'C': return 0;
      case 'NMOS': case 'PMOS': case 'NFET': case 'PFET':
        return pin === 'g' || pin === 'b' ? 0 : two(partOpVec(res, p.name, 'id'), 'd');
      case 'PNP': return pin === 'b' ? 0 : two(partOpVec(res, p.name, 'i'), 'c');
      default: return undefined; // ground, op-amp output...: solved by KCL when possible
    }
  };
}

/** Power (W) a part can dissipate before it "burns" — roughly a 1/4 W resistor, a 5 mm LED,
 *  a small signal diode, and a generous figure for transistors (ideal current sources can force large drops). */
export const RATING: Partial<Record<PartKind, number>> = {
  R: 0.25, LED: 0.075, D: 0.5, PNP: 0.25, NMOS: 0.25, PMOS: 0.25, NFET: 0.25, PFET: 0.25,
};

export interface Heat { name: string; kind: PartKind; power: number; rating: number; frac: number }

/** Dissipated power of one part: Σ V(pin) · I(into pin). `netOf` maps a pin to its net name. */
export function partPower(res: SimResult, part: PartLike, pins: string[], netOf: (pin: string) => string | undefined): number | undefined {
  const op = plotFor(res, 'op');
  if (!op) return undefined;
  const pc = pinCurrentFor(res);
  let p = 0;
  for (const pin of pins) {
    const i = pc(part as Part, pin);
    if (i === undefined) return undefined;
    if (i === 0) continue;
    const net = netOf(pin);
    if (net === undefined) return undefined;
    const v = net === '0' ? 0 : op.byName.get(net.toLowerCase())?.re[0];
    if (v === undefined || !Number.isFinite(v)) return undefined;
    p += v * i;
  }
  return Math.abs(p);
}

/** Heat of every rated part in a logical circuit (used by tests and achievements). */
export function circuitHeat(res: SimResult): Heat[] {
  const out: Heat[] = [];
  for (const p of res.circuit.parts) {
    const rating = RATING[p.kind];
    if (!rating) continue;
    const power = partPower(res, p, Object.keys(p.nets), (pin) => p.nets[pin]);
    if (power === undefined) continue;
    out.push({ name: p.name, kind: p.kind, power, rating, frac: power / rating });
  }
  return out;
}

/** Total power delivered by the voltage sources (W), or undefined without an operating point. */
export function supplyPower(res: SimResult): number | undefined {
  const op = plotFor(res, 'op');
  if (!op) return undefined;
  let total = 0, any = false;
  for (const p of res.circuit.parts) {
    if (p.kind !== 'V') continue;
    const i = partOpVec(res, p.name, 'i');
    const vp = p.nets.p === '0' ? 0 : op.byName.get(p.nets.p.toLowerCase())?.re[0];
    const vn = p.nets.n === '0' ? 0 : op.byName.get(p.nets.n.toLowerCase())?.re[0];
    if (i === undefined || vp === undefined || vn === undefined) continue;
    const delivered = -i * (vp - vn);
    if (delivered > 0) total += delivered;
    any = true;
  }
  return any ? total : undefined;
}
