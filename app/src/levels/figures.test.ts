import { describe, expect, it } from 'vitest';
import { toCircuit } from '../schematic/connectivity';
import type { Schematic } from '../schematic/types';
import * as F from './figures';

/** net of part.pin in the extracted circuit */
function nets(s: Schematic) {
  const { circuit, diagnostics } = toCircuit(s);
  expect(diagnostics.filter((d) => d.level === 'error' && d.code !== 'floatingNet')).toEqual([]);
  return (name: string, pin: string) => {
    const p = circuit.parts.find((q) => q.name === name);
    if (!p) throw new Error(`no part ${name}`);
    return p.nets[pin];
  };
}

describe('tutorial figures are wired as drawn', () => {
  it('Ohm / LED / divider / RC', () => {
    let N = nets(F.figOhm);
    expect(N('R1', 'p')).toBe(N('V1', 'p')); expect(N('R1', 'n')).toBe('0');
    N = nets(F.figLed);
    expect([N('R1', 'p'), N('R1', 'n')].sort()).toEqual([N('V1', 'p'), N('LED1', 'a')].sort()); expect(N('LED1', 'k')).toBe('0');
    N = nets(F.figDivider);
    expect(N('R1', 'p')).toBe(N('V1', 'p')); expect(N('R1', 'n')).toBe('out'); expect(N('R2', 'p')).toBe('out'); expect(N('R2', 'n')).toBe('0');
    N = nets(F.figRc);
    expect([N('R1', 'p'), N('R1', 'n')].sort()).toEqual([N('VIN', 'p'), 'out'].sort()); expect(N('C1', 'p')).toBe('out'); expect(N('C1', 'n')).toBe('0');
  });

  it('NMOS switch, mirror and common-source amp', () => {
    let N = nets(F.figNmosSwitch);
    expect(N('RD', 'p')).toBe('vdd'); expect(N('RD', 'n')).toBe('drain'); expect(N('M1', 'd')).toBe('drain'); expect(N('M1', 'g')).toBe('gate'); expect(N('M1', 's')).toBe('0');
    N = nets(F.figMirror);
    expect(N('IREF', 'p')).toBe('vdd');
    expect(N('M1', 'd')).toBe(N('IREF', 'n')); expect(N('M1', 'g')).toBe(N('M1', 'd')); expect(N('M2', 'g')).toBe(N('M1', 'g'));
    expect(N('M2', 'd')).toBe('out'); expect(N('M1', 's')).toBe('0'); expect(N('M2', 's')).toBe('0');
    N = nets(F.figCsAmp);
    expect(N('M1', 'g')).toBe('in'); expect(N('M1', 'd')).toBe('out'); expect(N('RD', 'n')).toBe('out');
  });

  it('differential pair', () => {
    const N = nets(F.figDiffPair);
    expect(N('M1', 'g')).toBe('inp'); expect(N('M2', 'g')).toBe('inn');
    expect(N('M1', 'd')).toBe('outn'); expect(N('M2', 'd')).toBe('outp');
    expect(N('R1', 'n')).toBe('outn'); expect(N('R2', 'n')).toBe('outp'); expect(N('R1', 'p')).toBe('vdd'); expect(N('R2', 'p')).toBe('vdd');
    expect(N('M1', 's')).toBe('tail'); expect(N('M2', 's')).toBe('tail'); expect(N('ITAIL', 'p')).toBe('tail'); expect(N('ITAIL', 'n')).toBe('0');
  });

  const checkOta = (N: (a: string, b: string) => string, inL: string, inR: string, out: string) => {
    expect(N('M1', 'g')).toBe(inL); expect(N('M2', 'g')).toBe(inR);
    expect(N('M3', 's')).toBe('vdd'); expect(N('M4', 's')).toBe('vdd'); expect(N('IB', 'p')).toBe('vdd');
    const x = N('M1', 'd');
    expect(N('M3', 'd')).toBe(x); expect(N('M3', 'g')).toBe(x); expect(N('M4', 'g')).toBe(x);
    expect(N('M2', 'd')).toBe(out); expect(N('M4', 'd')).toBe(out);
    expect(N('M1', 's')).toBe('tail'); expect(N('M2', 's')).toBe('tail'); expect(N('M5', 'd')).toBe('tail');
    expect(N('M6', 'd')).toBe('nbias'); expect(N('M6', 'g')).toBe('nbias'); expect(N('M5', 'g')).toBe('nbias'); expect(N('IB', 'n')).toBe('nbias');
    expect(N('M5', 's')).toBe('0'); expect(N('M6', 's')).toBe('0');
  };

  it('5T OTA', () => {
    const N = nets(F.figOta);
    checkOta(N, 'inp', 'inn', 'out');
    expect(N('CL', 'p')).toBe('out');
  });

  it('two-stage Miller op-amp', () => {
    const N = nets(F.figTwoStage);
    checkOta(N, 'vn', 'vp', 'x1');
    expect(N('M7', 'g')).toBe('x1'); expect(N('M7', 's')).toBe('vdd'); expect(N('M7', 'd')).toBe('out');
    expect(N('M8', 'd')).toBe('out'); expect(N('M8', 'g')).toBe('nbias'); expect(N('M8', 's')).toBe('0');
    expect(N('RZ', 'p') === 'x1' || N('RZ', 'n') === 'x1').toBe(true);
    const z = N('RZ', 'p') === 'x1' ? N('RZ', 'n') : N('RZ', 'p');
    expect(z).toBe('z');
    expect([N('CC', 'p'), N('CC', 'n')].sort()).toEqual(['out', 'z']);
    expect(N('CL', 'p')).toBe('out');
  });

  it('LDO', () => {
    const N = nets(F.figLdo);
    expect(N('U1', 'inp')).toBe('fb'); expect(N('U1', 'inn')).toBe('vref'); expect(N('U1', 'out')).toBe('vg');
    expect(N('MPASS', 'g')).toBe('vg'); expect(N('MPASS', 's')).toBe('vin'); expect(N('MPASS', 'd')).toBe('out');
    expect(N('R1', 'p')).toBe('out'); expect(N('R1', 'n')).toBe('fb'); expect(N('R2', 'p')).toBe('fb'); expect(N('R2', 'n')).toBe('0');
    expect(N('CL', 'p')).toBe('out'); expect(N('ILOAD', 'p')).toBe('out');
  });
});
