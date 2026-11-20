// Device mismatch (Monte Carlo): Pelgrom threshold-voltage variation per MOS instance.
//   sigma(dVth) = AVT / sqrt(W * L)      (W, L in µm)
// AVT for SKY130 comes from vth0_slope in sky130_fd_pr__{n,p}fet_01v8__mismatch.corner.spice.
import { isMos } from '../schematic/parts';
import type { Circuit, PartKind } from '../schematic/types';
import { parseSpice } from '../schematic/units';

export const AVT: Partial<Record<PartKind, number>> = {
  NFET: 3.356e-3,  // V·µm  (sky130 nfet_01v8 vth0_slope)
  PFET: 5.856e-3,  // V·µm  (sky130 pfet_01v8 vth0_slope)
  NMOS: 5e-3,      // teaching models
  PMOS: 5e-3,
};

/** Deterministic PRNG (mulberry32) so a Monte Carlo run is reproducible from its seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussian(r: () => number) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sigmaVth(kind: PartKind, params: Record<string, string>): number {
  const avt = AVT[kind];
  if (!avt) return 0;
  const w = parseSpice(params.w) * 1e6; // W is the total width (all fingers)
  const l = parseSpice(params.l) * 1e6;
  if (!(w > 0 && l > 0)) return 0;
  return avt / Math.sqrt(w * l);
}

/** Sample a threshold shift for every MOS in the circuit. Parts are visited in name order. */
export function sampleMismatch(c: Circuit, seed: number): Record<string, number> {
  const r = rng(seed * 7919 + 17);
  const out: Record<string, number> = {};
  for (const p of [...c.parts].sort((a, b) => a.name.localeCompare(b.name))) {
    if (!isMos(p.kind)) continue;
    out[p.name] = gaussian(r) * sigmaVth(p.kind, p.params);
  }
  return out;
}
