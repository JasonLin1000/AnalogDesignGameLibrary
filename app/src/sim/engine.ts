// Simulation core shared by the Web Worker and the Node tests.
import { runNgspice } from '../../../engine/ngspice-wasm/runner.mjs';
import type { Deck } from '../schematic/netlist';
import type { Corner } from '../schematic/types';
import { parseRaw, type Plot } from './raw';

/** Loads a file of the SKY130 model pack by path relative to the pack root. */
export type FileLoader = (relPath: string) => Promise<string>;

export interface SimRun {
  ok: boolean;
  plots: (Plot | null)[]; // one per analysis
  log: string;
  errors: string[];
  elapsedMs: number;
}

let manifest: string[] | null = null;
const cornerCache = new Map<string, Record<string, string>>();

async function modelFiles(corner: Corner, load: FileLoader): Promise<Record<string, string>> {
  const hit = cornerCache.get(corner);
  if (hit) return hit;
  manifest ??= JSON.parse(await load('manifest.json')) as string[];
  const want = manifest.filter((p) =>
    !p.startsWith('cells/') || p.includes(`__${corner}.`) || p.includes('__mismatch.'));
  const files: Record<string, string> = {};
  await Promise.all(want.map(async (p) => { files[`/work/sky130/${p}`] = await load(p); }));
  // ngspice resolves the includes of every .lib section, so keep only the selected corner
  const libPath = '/work/sky130/sky130_game.lib.spice';
  const m = files[libPath]?.match(new RegExp(`^\\.lib ${corner}\\b[\\s\\S]*?^\\.endl`, 'm'));
  if (m) files[libPath] = m[0] + '\n';
  cornerCache.set(corner, files);
  return files;
}

const ERROR_RE = /error|singular|too small|failed|not found|unknown|cannot/i;

export async function runDeck(deck: Deck, corner: Corner, load: FileLoader): Promise<SimRun> {
  const files: Record<string, string> = { '/work/.spiceinit': 'set ngbehavior=hsa\n' };
  if (deck.usesSky130) Object.assign(files, await modelFiles(corner, load));
  const r = await runNgspice(deck.text, { files, outputs: deck.outputs });
  const plots = deck.outputs.map((f) => {
    const txt = r.files[f];
    if (!txt) return null;
    return parseRaw(txt)[0] ?? null;
  });
  const log = [r.stdout, r.stderr].filter(Boolean).join('\n')
    .split('\n').filter((l) => !/proc\/meminfo|initialization file spinit/.test(l)).join('\n');
  const errors = log.split('\n').filter((l) => ERROR_RE.test(l) && !/^\s*$/.test(l)).slice(0, 20);
  const ok = plots.every((p) => p !== null);
  return { ok, plots, log, errors: ok ? [] : errors.length ? errors : ['simulation produced no output'], elapsedMs: r.elapsedMs };
}
