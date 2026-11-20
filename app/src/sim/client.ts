// Main-thread wrapper around the simulation worker.
import type { Deck } from '../schematic/netlist';
import type { Corner } from '../schematic/types';
import type { SimRun } from './engine';

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (r: SimRun) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const { id, ok, run, error } = e.data;
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    if (ok) p.resolve(run); else p.reject(new Error(error));
  };
  worker.onerror = (e) => {
    for (const p of pending.values()) p.reject(new Error(e.message || 'worker error'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

export function simulate(deck: Deck, corner: Corner): Promise<SimRun> {
  const id = ++seq;
  const modelBase = new URL('models/sky130/', document.baseURI).href;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, deck, corner, modelBase });
  });
}
