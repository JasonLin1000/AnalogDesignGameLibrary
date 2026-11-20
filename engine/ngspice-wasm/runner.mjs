// Minimal ngspice-WASM runner: works in Node, browser main thread, or Web Worker.
// Each call creates a fresh module instance (ngspice keeps global state),
// writes the netlist to the in-memory FS, runs batch mode, and returns
// the stdout/stderr text plus any files the netlist wrote via `wrdata`.
import createNgspice from './dist/ngspice.mjs';

let wasmBinary = null;

export async function runNgspice(netlist, { files = {}, outputs = [], wasm } = {}) {
  if (wasm) wasmBinary = wasm;
  const stdout = [];
  const stderr = [];
  const mod = await createNgspice({
    wasmBinary: wasmBinary ?? undefined,
    print: (s) => stdout.push(s),
    printErr: (s) => stderr.push(s),
    noExitRuntime: true,
  });
  const { FS } = mod;
  FS.mkdirTree('/work');
  for (const [name, text] of Object.entries(files)) {
    const dir = name.substring(0, name.lastIndexOf('/'));
    if (dir) FS.mkdirTree(dir);
    FS.writeFile(name, text);
  }
  FS.writeFile('/work/circuit.cir', netlist);
  FS.chdir('/work');

  const t0 = performance.now();
  let exitCode = 0;
  try {
    exitCode = mod.callMain(['-b', '/work/circuit.cir']);
  } catch (e) {
    if (e && e.name === 'ExitStatus') exitCode = e.status;
    else throw e;
  }
  const elapsedMs = performance.now() - t0;

  const out = {};
  for (const name of outputs) {
    try { out[name] = FS.readFile(name, { encoding: 'utf8' }); } catch { out[name] = null; }
  }
  return { exitCode, elapsedMs, stdout: stdout.join('\n'), stderr: stderr.join('\n'), files: out };
}

// Parse `wrdata` output: whitespace-separated columns, one row per line.
export function parseWrdata(text) {
  return text.trim().split(/\r?\n/).map((l) => l.trim().split(/\s+/).map(Number));
}
