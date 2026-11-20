// Circuit + analyses -> SPICE deck with a .control block that writes ASCII raw files.
import { PARTS, isMos, isPChannel } from './parts';
import type { Analysis, Circuit, Corner } from './types';

export interface Deck {
  text: string;
  outputs: string[];          // every raw file the deck writes
  plotFiles: string[][];      // per analysis: its raw file(s); noise writes spectrum + integrated
  usesSky130: boolean;
  opVectors: Record<string, Record<string, string>>; // part name -> label -> spice vector
}

export interface DeckOptions {
  title?: string;
  corner?: Corner;
  temp?: number;
  /** Per-MOS threshold shift in volts (Monte Carlo / layout gradients). Positive = harder to turn on. */
  dvth?: Record<string, number>;
}

export function analysisCommand(a: Analysis): string {
  switch (a.kind) {
    case 'op': return 'op';
    case 'dc': return `dc ${a.source} ${a.start} ${a.stop} ${a.step}`;
    case 'ac': return `ac dec ${a.ppd} ${a.fstart} ${a.fstop}`;
    case 'tran': return `tran ${a.tstep} ${a.tstop}`;
    case 'noise': return `noise v(${a.out}) ${a.src} dec ${a.ppd} ${a.fstart} ${a.fstop}`;
  }
}

export function buildDeck(circuit: Circuit, analyses: Analysis[], opts: DeckOptions = {}): Deck {
  const lines: string[] = [`* ${opts.title ?? 'Analog Design Game circuit'}`];
  const models = new Set<string>();
  let usesSky130 = false;
  const body: string[] = [];
  const opVectors: Deck['opVectors'] = {};
  for (const p0 of circuit.parts) {
    const def = PARTS[p0.kind];
    let p = p0;
    const dv = opts.dvth?.[p0.name];
    if (dv && isMos(p0.kind)) {
      // mismatch: a DC source in series with the gate shifts the effective threshold
      const g = `${p0.name.toLowerCase()}_mmg`;
      p = { ...p0, nets: { ...p0.nets, g } };
      const v = dv.toExponential(6);
      body.push(isPChannel(p0.kind) ? `V${p0.name}_mm ${g} ${p0.nets.g} ${v}` : `V${p0.name}_mm ${p0.nets.g} ${g} ${v}`);
    }
    const out = def.spice(p);
    body.push(...out.lines);
    out.models?.forEach((m) => models.add(m));
    if (out.sky130) usesSky130 = true;
    if (def.opVectors) opVectors[p0.name] = def.opVectors(p0);
  }
  if (usesSky130) lines.push(`.lib "sky130/sky130_game.lib.spice" ${opts.corner ?? 'tt'}`);
  lines.push(...models, ...body);
  if (opts.temp !== undefined) lines.push(`.temp ${opts.temp}`);

  const saves = Object.values(opVectors).flatMap((r) => Object.values(r)).filter((v) => v.startsWith('@'));
  const outputs: string[] = [];
  const plotFiles: string[][] = [];
  lines.push('.control', 'set filetype=ascii');
  analyses.forEach((a, i) => {
    const file = `/work/a${i}.raw`;
    // device-internal parameters (@dev[...]) are only valid for the operating point
    lines.push('delete all', a.kind === 'op' ? `save all ${saves.join(' ')}`.trim() : 'save all');
    lines.push(analysisCommand(a));
    if (a.kind === 'noise') {
      const tot = `/work/a${i}_tot.raw`;
      // noise creates two plots: the spectrum (current-1) and integrated totals (current)
      lines.push(`write ${tot}`, 'setplot previous', `write ${file}`);
      outputs.push(file, tot);
      plotFiles.push([file, tot]);
    } else {
      lines.push(`write ${file}`);
      outputs.push(file);
      plotFiles.push([file]);
    }
  });
  lines.push('quit', '.endc', '.end', '');
  return { text: lines.join('\n'), outputs, plotFiles, usesSky130, opVectors };
}
