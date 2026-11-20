/// <reference lib="webworker" />
import type { Deck } from '../schematic/netlist';
import type { Corner } from '../schematic/types';
import { runDeck } from './engine';

interface Req { id: number; deck: Deck; corner: Corner; modelBase: string }

self.onmessage = async (e: MessageEvent<Req>) => {
  const { id, deck, corner, modelBase } = e.data;
  try {
    const run = await runDeck(deck, corner, async (p) => {
      const r = await fetch(new URL(p, modelBase));
      if (!r.ok) throw new Error(`model fetch failed: ${p} (${r.status})`);
      return r.text();
    });
    self.postMessage({ id, ok: true, run });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err as Error)?.stack ?? err) });
  }
};
