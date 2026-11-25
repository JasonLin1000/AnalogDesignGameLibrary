import { describe, expect, it } from 'vitest';
import { parseSpice, scaleSpice, toSpice } from './units';

describe('toSpice / scaleSpice', () => {
  it('uses SPICE suffixes (m = milli, meg = mega)', () => {
    expect(toSpice(1250)).toBe('1.25k');
    expect(toSpice(4.7e-6)).toBe('4.7u');
    expect(toSpice(2e6)).toBe('2meg');
    expect(toSpice(0.0015)).toBe('1.5m');
    expect(toSpice(-1.8)).toBe('-1.8');
  });
  it('round-trips through parseSpice', () => {
    for (const v of [1, 33e3, 0.25e-12, 1.2e9]) expect(parseSpice(toSpice(v))).toBeCloseTo(v, 12);
  });
  it('scales a value string', () => {
    expect(scaleSpice('1k', 1.25)).toBe('1.25k');
    expect(scaleSpice('2u', 0.8)).toBe('1.6u');
    expect(scaleSpice('abc', 2)).toBeNull();
  });
});
