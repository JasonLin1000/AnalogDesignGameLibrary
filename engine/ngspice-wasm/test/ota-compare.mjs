// Run the 5T OTA with ngspice-WASM in Node and compare to native ngspice results.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNgspice, parseWrdata } from '../runner.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const modelRoot = join(here, '../../models');

function collect(dir, base, out = {}) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p, base, out);
    else if (name.endsWith('.spice')) out['/work/' + relative(base, p).replaceAll('\\', '/')] = readFileSync(p, 'utf8');
  }
  return out;
}

const files = collect(join(modelRoot, 'sky130'), modelRoot);
files['/work/.spiceinit'] = 'set ngbehavior=hsa\n';
console.log(`model files: ${Object.keys(files).length}`);

const netlist = readFileSync(join(here, 'ota5t.cir'), 'utf8');
const r = await runNgspice(netlist, { files, outputs: ['/work/ota_ac.txt'] });
const pick = (k) => Number((r.stdout.match(new RegExp(`${k}\\s*=\\s*([-+0-9.eE]+)`)) || [])[1]);
const res = { a0_db: pick('a0_db'), ugb: pick('ugb'), pm: pick('pm'), vout: pick('v\\(out\\)') };
console.log(`exit=${r.exitCode} time=${r.elapsedMs.toFixed(0)} ms`);
console.log('WASM  :', res);

// Native ngspice-42 reference (run in WSL with the same netlist + model pack)
const ref = { a0_db: 36.53316, ugb: 2.211022e7, pm: 89.54802, vout: 0.675832 };
console.log('Native:', ref);
let ok = Number.isFinite(res.a0_db);
for (const k of Object.keys(ref)) {
  const err = Math.abs(res[k] - ref[k]) / Math.abs(ref[k]);
  console.log(`  ${k.padEnd(6)} rel.err = ${(err * 100).toFixed(4)} %`);
  if (!(err < 0.01)) ok = false;
}
if (!ok) { console.log(r.stdout.slice(-3000)); console.log(r.stderr.slice(-2000)); }
const rows = r.files['/work/ota_ac.txt'] ? parseWrdata(r.files['/work/ota_ac.txt']) : [];
console.log(`AC points: ${rows.length}`);
process.exit(ok ? 0 : 1);
