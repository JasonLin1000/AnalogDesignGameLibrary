// Web Worker: runs ngspice-WASM off the UI thread.
// Message in:  { id, netlist, outputs: [path...] }
// Message out: { id, ok, result | error, loadMs }
import { runNgspice } from '../ngspice-wasm/runner.mjs';

const MODEL_BASE = new URL('../models/sky130/', import.meta.url);
let filesPromise = null;

async function loadModels() {
  const t0 = performance.now();
  const list = await fetch(new URL('manifest.json', MODEL_BASE)).then((r) => r.json());
  const files = { '/work/.spiceinit': 'set ngbehavior=hsa\n' };
  await Promise.all(list.map(async (p) => {
    files['/work/sky130/' + p] = await fetch(new URL(p, MODEL_BASE)).then((r) => r.text());
  }));
  return { files, loadMs: performance.now() - t0 };
}

self.onmessage = async ({ data }) => {
  const { id, netlist, outputs = [] } = data;
  try {
    filesPromise ??= loadModels();
    const { files, loadMs } = await filesPromise;
    const result = await runNgspice(netlist, { files, outputs });
    self.postMessage({ id, ok: true, result, loadMs });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.stack || e) });
  }
};
