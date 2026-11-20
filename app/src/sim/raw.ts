// Parser for ngspice ASCII raw files (`set filetype=ascii` + `write`).

export interface Vector {
  name: string;      // normalized: "out" for v(out), "v1#branch", "@m1[id]"
  type: string;      // voltage / current / frequency / time ...
  re: Float64Array;
  im?: Float64Array; // present for complex plots (AC)
}

export interface Plot {
  title: string;
  plotname: string;  // e.g. "AC Analysis"
  complex: boolean;
  points: number;
  vectors: Vector[];
  byName: Map<string, Vector>;
}

export const normName = (s: string) => {
  const n = s.trim().toLowerCase();
  const v = n.match(/^v\(([^,()]+)\)$/);
  if (v) return v[1];
  // currents: i(@dev[param]) -> @dev[param];  i(v1) -> v1#branch
  const i = n.match(/^i\((.+)\)$/);
  if (i) return i[1].startsWith('@') ? i[1] : `${i[1]}#branch`;
  return n;
};

export function parseRaw(text: string): Plot[] {
  const lines = text.split(/\r?\n/);
  const plots: Plot[] = [];
  let i = 0;
  while (i < lines.length) {
    let title = '', plotname = '', flags = '', nvars = 0, npts = 0;
    for (; i < lines.length; i++) {
      const l = lines[i];
      const [k, ...rest] = l.split(':');
      const v = rest.join(':').trim();
      if (k === 'Title') title = v;
      else if (k === 'Plotname') plotname = v;
      else if (k === 'Flags') flags = v;
      else if (k === 'No. Variables') nvars = Number(v);
      else if (k === 'No. Points') npts = Number(v);
      else if (k === 'Variables') { i++; break; }
    }
    if (!nvars) break;
    const complex = /complex/i.test(flags);
    const vectors: Vector[] = [];
    for (let j = 0; j < nvars; j++, i++) {
      const parts = lines[i].trim().split(/\s+/);
      vectors.push({
        name: normName(parts[1]), type: parts[2] ?? '',
        re: new Float64Array(npts), im: complex ? new Float64Array(npts) : undefined,
      });
    }
    while (i < lines.length && !lines[i].startsWith('Values:')) i++;
    i++;
    // values: "idx\tval" then (nvars-1) lines of "\tval"; tokens may also be on one line
    const tokens: string[] = [];
    const need = npts * (nvars + 1);
    while (i < lines.length && tokens.length < need) {
      const l = lines[i];
      if (/^[A-Za-z]/.test(l)) break; // next header
      for (const t of l.trim().split(/\s+/)) if (t) tokens.push(t);
      i++;
    }
    let t = 0;
    for (let p = 0; p < npts; p++) {
      t++; // point index
      for (let j = 0; j < nvars; j++) {
        const tok = tokens[t++] ?? 'NaN';
        if (complex) {
          const [re, im] = tok.split(',');
          vectors[j].re[p] = Number(re);
          vectors[j].im![p] = Number(im ?? 0);
        } else vectors[j].re[p] = Number(tok);
      }
    }
    plots.push({ title, plotname, complex, points: npts, vectors, byName: new Map(vectors.map((v) => [v.name, v])) });
  }
  return plots;
}
