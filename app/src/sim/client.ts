// Main-thread pool of simulation workers (PVT / Monte Carlo runs execute in parallel).
import type { Deck } from '../schematic/netlist';
import type { Corner } from '../schematic/types';
import type { SimRun } from './engine';

interface Job { id: number; deck: Deck; corner: Corner; resolve: (r: SimRun) => void; reject: (e: Error) => void }
interface Slot { worker: Worker; busy: Job | null }

const SIZE = Math.max(1, Math.min(4, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 2) - 1 || 1));
const slots: Slot[] = [];
const queue: Job[] = [];
let seq = 0;

function spawn(): Slot {
  const slot: Slot = { worker: new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' }), busy: null };
  slot.worker.onmessage = (e) => {
    const job = slot.busy;
    slot.busy = null;
    if (job && e.data.id === job.id) {
      if (e.data.ok) job.resolve(e.data.run); else job.reject(new Error(e.data.error));
    }
    pump();
  };
  slot.worker.onerror = (e) => {
    const job = slot.busy;
    slot.busy = null;
    job?.reject(new Error(e.message || 'worker error'));
    slot.worker.terminate();
    slots.splice(slots.indexOf(slot), 1);
    pump();
  };
  slots.push(slot);
  return slot;
}

function pump() {
  while (queue.length) {
    const slot = slots.find((s) => !s.busy) ?? (slots.length < SIZE ? spawn() : null);
    if (!slot) return;
    const job = queue.shift()!;
    slot.busy = job;
    const modelBase = new URL('models/sky130/', document.baseURI).href;
    slot.worker.postMessage({ id: job.id, deck: job.deck, corner: job.corner, modelBase });
  }
}

export function simulate(deck: Deck, corner: Corner): Promise<SimRun> {
  return new Promise((resolve, reject) => {
    queue.push({ id: ++seq, deck, corner, resolve, reject });
    pump();
  });
}
