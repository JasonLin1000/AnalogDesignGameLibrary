// Node smoke test: RC lowpass, check -3 dB point ≈ 1/(2πRC) = 159.15 Hz.
import { readFileSync } from 'node:fs';
import { runNgspice, parseWrdata } from '../runner.mjs';

const netlist = readFileSync(new URL('./rc.cir', import.meta.url), 'utf8');
const r = await runNgspice(netlist, { outputs: ['/work/rc_ac.txt'] });
console.log(`exit=${r.exitCode} time=${r.elapsedMs.toFixed(1)} ms`);
const txt = r.files['/work/rc_ac.txt'];
if (!txt) { console.log(r.stdout); console.log(r.stderr); process.exit(1); }
const rows = parseWrdata(txt); // [f, vdb, f, vp]
let f3 = null;
for (let i = 1; i < rows.length; i++) {
  const [fa, da] = rows[i - 1], [fb, db] = rows[i];
  if (da > -3.0103 && db <= -3.0103) { f3 = fa + (fb - fa) * (-3.0103 - da) / (db - da); break; }
}
console.log(`points=${rows.length} f(-3dB)≈${f3?.toFixed(2)} Hz (theory 159.15 Hz)`);
process.exit(Math.abs(f3 - 159.15) / 159.15 < 0.05 ? 0 : 1);
