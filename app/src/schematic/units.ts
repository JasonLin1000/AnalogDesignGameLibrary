// SPICE-style number parsing/formatting: 1k, 4.7u, 10meg, 2.2n ...
const SUFFIX: [string, number][] = [
  ['meg', 1e6], ['mil', 25.4e-6], ['t', 1e12], ['g', 1e9], ['k', 1e3],
  ['m', 1e-3], ['u', 1e-6], ['µ', 1e-6], ['n', 1e-9], ['p', 1e-12], ['f', 1e-15],
];

export function parseSpice(s: string | number | undefined): number {
  if (typeof s === 'number') return s;
  if (!s) return NaN;
  const m = String(s).trim().toLowerCase().match(/^([-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)([a-zµ]*)/);
  if (!m) return NaN;
  const base = Number(m[1]);
  const suf = m[2];
  if (!suf) return base;
  for (const [k, v] of SUFFIX) if (suf.startsWith(k)) return base * v;
  return base; // unit letters like "v", "a", "hz" are ignored
}

const PREFIX: [number, string][] = [
  [1e12, 'T'], [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''],
  [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'],
];

/** 0.00123, 'A' -> "1.23 mA" */
export function formatEng(v: number, unit = '', digits = 3): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return `0 ${unit}`.trim();
  const a = Math.abs(v);
  for (const [s, p] of PREFIX) {
    // Number(...) turns "1.0e+2" back into 100 and drops trailing zeros
    if (a >= s * 0.9995) return `${Number((v / s).toPrecision(digits))} ${p}${unit}`.trim();
  }
  return `${v.toExponential(2)} ${unit}`.trim();
}
