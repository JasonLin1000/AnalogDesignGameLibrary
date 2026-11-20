import { useEffect, useState } from 'react';
import { useSession } from '../game/session';
import { useT } from '../i18n';
import { WaveformPanel } from '../waveform/WaveformPanel';
import { RunsPanel } from './RunsPanel';

type Tab = 'wave' | 'runs' | 'netlist' | 'log';

export function BottomPanel() {
  const { t } = useT();
  const s = useSession();
  const [tab, setTab] = useState<Tab>('wave');
  const [open, setOpen] = useState(true);
  const multi = s.outcomes.length > 1 || s.progress.total > 1;
  useEffect(() => { if (!multi && tab === 'runs') setTab('wave'); }, [multi, tab]);
  const tabs: Tab[] = multi ? ['wave', 'runs', 'netlist', 'log'] : ['wave', 'netlist', 'log'];
  return (
    <section className={`bottom${open ? '' : ' closed'}`}>
      <div className="tabs" role="tablist">
        {tabs.map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => { setTab(k); setOpen(true); }}>
            {t(`bottom.${k}`)}{k === 'runs' && s.status === 'running' ? ` (${s.progress.done}/${s.progress.total})` : ''}
          </button>
        ))}
        <span className="grow" />
        {s.run && <span className="muted small">{t('run.time', { ms: s.run.elapsedMs.toFixed(0) })}</span>}
        <button className="icon" onClick={() => setOpen(!open)} aria-label={open ? t('bottom.collapse') : t('bottom.expand')}>{open ? '▾' : '▴'}</button>
      </div>
      {open && (
        <div className="tab-body">
          {tab === 'wave' && <WaveformPanel />}
          {tab === 'runs' && <RunsPanel />}
          {tab === 'netlist' && (s.deck ? <pre className="code">{s.deck.text}</pre> : <p className="empty">{t('bottom.noNetlist')}</p>)}
          {tab === 'log' && (s.run ? <pre className="code">{s.run.log}</pre> : <p className="empty">{t('bottom.noLog')}</p>)}
        </div>
      )}
    </section>
  );
}
