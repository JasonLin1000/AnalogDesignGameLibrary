// Circuit + analyses -> SPICE deck with a .control block that writes ASCII raw files.
import { PARTS } from './parts';
import type { Analysis, Circuit, Corner } from './types';

export interface Deck {
  text: string;
  outputs: string[];          // raw files written, one per analysis (same order)
  usesSky130: boolean;
  opVectors: Record<string, Record<string, string>>; // part name -> label -> spice vector
}

export function analysisCommand(a: Analysis): string {
  switch (a.kind) {
    case 'op': return 'op';
    case 'dc': return `dc ${a.source} ${a.start} ${a.stop} ${a.step}`;
    case 'ac': return `ac dec ${a.ppd} ${a.fstart} ${a.fstop}`;
    case 'tran': return `tran ${a.tstep} ${a.tstop}`;
  }
}

export function buildDeck(circuit: Circuit, analyses: Analysis[], opts: { title?: string; corner?: Corner; temp?: number } = {}): Deck {
  const lines: string[] = [`* ${opts.title ?? 'Analog Design Game circuit'}`];
  const models = new Set<string>();
  let usesSky130 = false;
  const body: string[] = [];
  const opVectors: Deck['opVectors'] = {};
  for (const p of circuit.parts) {
    const def = PARTS[p.kind];
    const out = def.spice(p);
    body.push(...out.lines);
    out.models?.forEach((m) => models.add(m));
    if (out.sky130) usesSky130 = true;
    if (def.opVectors) opVectors[p.name] = def.opVectors(p);
  }
  if (usesSky130) lines.push(`.lib "sky130/sky130_game.lib.spice" ${opts.corner ?? 'tt'}`);
  lines.push(...models, ...body);
  if (opts.temp !== undefined) lines.push(`.temp ${opts.temp}`);

  const saves = Object.values(opVectors).flatMap((r) => Object.values(r)).filter((v) => v.startsWith('@'));
  const outputs: string[] = [];
  lines.push('.control', 'set filetype=ascii');
  analyses.forEach((a, i) => {
    const file = `/work/a${i}.raw`;
    outputs.push(file);
    // device-internal parameters (@dev[...]) are only valid for the operating point
    lines.push('delete all', a.kind === 'op' ? `save all ${saves.join(' ')}`.trim() : 'save all');
    lines.push(analysisCommand(a), `write ${file}`);
  });
  lines.push('quit', '.endc', '.end', '');
  return { text: lines.join('\n'), outputs, usesSky130, opVectors };
}
