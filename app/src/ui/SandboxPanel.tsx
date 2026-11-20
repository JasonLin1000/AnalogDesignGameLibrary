import { useT } from '../i18n';
import type { Sweep } from '../levels/types';
import type { Analysis, Corner } from '../schematic/types';
import { Diagnostics } from './BriefPanel';

export interface SandboxSetup {
  op: boolean;
  dc: { on: boolean; source: string; start: string; stop: string; step: string };
  ac: { on: boolean; fstart: string; fstop: string; ppd: number };
  tran: { on: boolean; tstep: string; tstop: string };
  noise: { on: boolean; out: string; src: string; fstart: string; fstop: string };
  corner: Corner;
  pvt: boolean;
  mc: number;
}

export const defaultSetup = (): SandboxSetup => ({
  op: true,
  dc: { on: false, source: 'V1', start: '0', stop: '1.8', step: '0.01' },
  ac: { on: false, fstart: '1', fstop: '1g', ppd: 20 },
  tran: { on: false, tstep: '1u', tstop: '1m' },
  noise: { on: false, out: 'out', src: 'V1', fstart: '1', fstop: '100meg' },
  corner: 'tt',
  pvt: false,
  mc: 0,
});

export function setupToAnalyses(s: SandboxSetup): Analysis[] {
  const a: Analysis[] = [];
  if (s.op) a.push({ kind: 'op' });
  if (s.dc.on) a.push({ kind: 'dc', source: s.dc.source, start: s.dc.start, stop: s.dc.stop, step: s.dc.step });
  if (s.ac.on) a.push({ kind: 'ac', fstart: s.ac.fstart, fstop: s.ac.fstop, ppd: s.ac.ppd });
  if (s.tran.on) a.push({ kind: 'tran', tstep: s.tran.tstep, tstop: s.tran.tstop });
  if (s.noise.on) a.push({ kind: 'noise', out: s.noise.out, src: s.noise.src, fstart: s.noise.fstart, fstop: s.noise.fstop, ppd: 20 });
  return a;
}

export function setupToSweep(s: SandboxSetup): Sweep | undefined {
  if (!s.pvt && !s.mc) return undefined;
  return {
    corners: s.pvt ? ['tt', 'ff', 'ss', 'sf', 'fs'] : undefined,
    temps: s.pvt ? [-40, 27, 125] : undefined,
    mc: s.mc || undefined,
  };
}

export function SandboxPanel({ setup, onChange }: { setup: SandboxSetup; onChange: (s: SandboxSetup) => void }) {
  const { t } = useT();
  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="field"><span>{label}</span><input value={value} onChange={(e) => set(e.target.value)} /></label>
  );
  const S = setup;
  return (
    <aside className="brief sandbox" aria-label={t('sandbox.title')}>
      <div className="brief-head"><h2>{t('sandbox.title')}</h2></div>
      <p className="objective">{t('sandbox.intro')}</p>
      <h3>{t('sandbox.analyses')}</h3>
      <label className="check"><input type="checkbox" checked={S.op} onChange={(e) => onChange({ ...S, op: e.target.checked })} /> {t('analysis.op')}</label>

      <label className="check"><input type="checkbox" checked={S.dc.on} onChange={(e) => onChange({ ...S, dc: { ...S.dc, on: e.target.checked } })} /> {t('analysis.dc')}</label>
      {S.dc.on && <div className="fields">
        {field(t('sandbox.source'), S.dc.source, (v) => onChange({ ...S, dc: { ...S.dc, source: v } }))}
        {field(t('sandbox.start'), S.dc.start, (v) => onChange({ ...S, dc: { ...S.dc, start: v } }))}
        {field(t('sandbox.stop'), S.dc.stop, (v) => onChange({ ...S, dc: { ...S.dc, stop: v } }))}
        {field(t('sandbox.step'), S.dc.step, (v) => onChange({ ...S, dc: { ...S.dc, step: v } }))}
        <p className="note span2">{t('sandbox.tempHelp')}</p>
      </div>}

      <label className="check"><input type="checkbox" checked={S.ac.on} onChange={(e) => onChange({ ...S, ac: { ...S.ac, on: e.target.checked } })} /> {t('analysis.ac')}</label>
      {S.ac.on && <div className="fields">
        {field(t('sandbox.fstart'), S.ac.fstart, (v) => onChange({ ...S, ac: { ...S.ac, fstart: v } }))}
        {field(t('sandbox.fstop'), S.ac.fstop, (v) => onChange({ ...S, ac: { ...S.ac, fstop: v } }))}
      </div>}

      <label className="check"><input type="checkbox" checked={S.tran.on} onChange={(e) => onChange({ ...S, tran: { ...S.tran, on: e.target.checked } })} /> {t('analysis.tran')}</label>
      {S.tran.on && <div className="fields">
        {field(t('sandbox.tstep'), S.tran.tstep, (v) => onChange({ ...S, tran: { ...S.tran, tstep: v } }))}
        {field(t('sandbox.tstop'), S.tran.tstop, (v) => onChange({ ...S, tran: { ...S.tran, tstop: v } }))}
      </div>}

      <label className="check"><input type="checkbox" checked={S.noise.on} onChange={(e) => onChange({ ...S, noise: { ...S.noise, on: e.target.checked } })} /> {t('analysis.noise')}</label>
      {S.noise.on && <div className="fields">
        {field(t('sandbox.noiseOut'), S.noise.out, (v) => onChange({ ...S, noise: { ...S.noise, out: v } }))}
        {field(t('sandbox.noiseSrc'), S.noise.src, (v) => onChange({ ...S, noise: { ...S.noise, src: v } }))}
        {field(t('sandbox.fstart'), S.noise.fstart, (v) => onChange({ ...S, noise: { ...S.noise, fstart: v } }))}
        {field(t('sandbox.fstop'), S.noise.fstop, (v) => onChange({ ...S, noise: { ...S.noise, fstop: v } }))}
      </div>}

      <h3>{t('sandbox.corner')}</h3>
      <select value={S.corner} onChange={(e) => onChange({ ...S, corner: e.target.value as Corner })} aria-label={t('sandbox.corner')}>
        {(['tt', 'ff', 'ss', 'sf', 'fs'] as Corner[]).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <p className="note">{t('sandbox.cornerHelp')}</p>

      <h3>{t('sandbox.variation')}</h3>
      <label className="check"><input type="checkbox" checked={S.pvt} onChange={(e) => onChange({ ...S, pvt: e.target.checked })} /> {t('sandbox.pvt')}</label>
      <label className="field inline"><span>{t('sandbox.mc')}</span>
        <input type="number" min={0} max={200} value={S.mc} onChange={(e) => onChange({ ...S, mc: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
      </label>
      <p className="note">{t('sandbox.mcHelp')}</p>
      <Diagnostics />
    </aside>
  );
}
