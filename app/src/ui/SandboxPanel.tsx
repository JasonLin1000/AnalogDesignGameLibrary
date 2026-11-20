import { useT } from '../i18n';
import type { Analysis, Corner } from '../schematic/types';
import { Diagnostics } from './BriefPanel';

export interface SandboxSetup {
  op: boolean;
  dc: { on: boolean; source: string; start: string; stop: string; step: string };
  ac: { on: boolean; fstart: string; fstop: string; ppd: number };
  tran: { on: boolean; tstep: string; tstop: string };
  corner: Corner;
}

export const defaultSetup = (): SandboxSetup => ({
  op: true,
  dc: { on: false, source: 'V1', start: '0', stop: '1.8', step: '0.01' },
  ac: { on: false, fstart: '1', fstop: '1g', ppd: 20 },
  tran: { on: false, tstep: '1u', tstop: '1m' },
  corner: 'tt',
});

export function setupToAnalyses(s: SandboxSetup): Analysis[] {
  const a: Analysis[] = [];
  if (s.op) a.push({ kind: 'op' });
  if (s.dc.on) a.push({ kind: 'dc', source: s.dc.source, start: s.dc.start, stop: s.dc.stop, step: s.dc.step });
  if (s.ac.on) a.push({ kind: 'ac', fstart: s.ac.fstart, fstop: s.ac.fstop, ppd: s.ac.ppd });
  if (s.tran.on) a.push({ kind: 'tran', tstep: s.tran.tstep, tstop: s.tran.tstop });
  return a;
}

export function SandboxPanel({ setup, onChange }: { setup: SandboxSetup; onChange: (s: SandboxSetup) => void }) {
  const { t } = useT();
  const field = (label: string, value: string, set: (v: string) => void) => (
    <label className="field"><span>{label}</span><input value={value} onChange={(e) => set(e.target.value)} /></label>
  );
  return (
    <aside className="brief sandbox" aria-label={t('sandbox.title')}>
      <div className="brief-head"><h2>{t('sandbox.title')}</h2></div>
      <p className="objective">{t('sandbox.intro')}</p>
      <h3>{t('sandbox.analyses')}</h3>
      <label className="check"><input type="checkbox" checked={setup.op} onChange={(e) => onChange({ ...setup, op: e.target.checked })} /> {t('analysis.op')}</label>

      <label className="check"><input type="checkbox" checked={setup.dc.on} onChange={(e) => onChange({ ...setup, dc: { ...setup.dc, on: e.target.checked } })} /> {t('analysis.dc')}</label>
      {setup.dc.on && <div className="fields">
        {field(t('sandbox.source'), setup.dc.source, (v) => onChange({ ...setup, dc: { ...setup.dc, source: v } }))}
        {field(t('sandbox.start'), setup.dc.start, (v) => onChange({ ...setup, dc: { ...setup.dc, start: v } }))}
        {field(t('sandbox.stop'), setup.dc.stop, (v) => onChange({ ...setup, dc: { ...setup.dc, stop: v } }))}
        {field(t('sandbox.step'), setup.dc.step, (v) => onChange({ ...setup, dc: { ...setup.dc, step: v } }))}
      </div>}

      <label className="check"><input type="checkbox" checked={setup.ac.on} onChange={(e) => onChange({ ...setup, ac: { ...setup.ac, on: e.target.checked } })} /> {t('analysis.ac')}</label>
      {setup.ac.on && <div className="fields">
        {field(t('sandbox.fstart'), setup.ac.fstart, (v) => onChange({ ...setup, ac: { ...setup.ac, fstart: v } }))}
        {field(t('sandbox.fstop'), setup.ac.fstop, (v) => onChange({ ...setup, ac: { ...setup.ac, fstop: v } }))}
      </div>}

      <label className="check"><input type="checkbox" checked={setup.tran.on} onChange={(e) => onChange({ ...setup, tran: { ...setup.tran, on: e.target.checked } })} /> {t('analysis.tran')}</label>
      {setup.tran.on && <div className="fields">
        {field(t('sandbox.tstep'), setup.tran.tstep, (v) => onChange({ ...setup, tran: { ...setup.tran, tstep: v } }))}
        {field(t('sandbox.tstop'), setup.tran.tstop, (v) => onChange({ ...setup, tran: { ...setup.tran, tstop: v } }))}
      </div>}

      <h3>{t('sandbox.corner')}</h3>
      <select value={setup.corner} onChange={(e) => onChange({ ...setup, corner: e.target.value as Corner })} aria-label={t('sandbox.corner')}>
        {(['tt', 'ff', 'ss', 'sf', 'fs'] as Corner[]).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <p className="note">{t('sandbox.cornerHelp')}</p>
      <Diagnostics />
    </aside>
  );
}
