import { useState } from 'react';
import { useSession } from '../game/session';
import { useT } from '../i18n';
import { WaveformPanel } from '../waveform/WaveformPanel';

type Tab = 'wave' | 'netlist' | 'log';

export function BottomPanel() {
  const { t } = useT();
  const s = useSession();
  const [tab, setTab] = useState<Tab>('wave');
  const [open, setOpen] = useState(true);
  return (
    <section className={`bottom${open ? '' : ' closed'}`}>
      <div className="tabs" role="tablist">
        {(['wave', 'netlist', 'log'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => { setTab(k); setOpen(true); }}>
            {t(`bottom.${k}`)}
          </button>
        ))}
        <span className="grow" />
        {s.run && <span className="muted small">{t('run.time', { ms: s.run.elapsedMs.toFixed(0) })}</span>}
        <button className="icon" onClick={() => setOpen(!open)} aria-label={open ? t('bottom.collapse') : t('bottom.expand')}>{open ? '▾' : '▴'}</button>
      </div>
      {open && (
        <div className="tab-body">
          {tab === 'wave' && <WaveformPanel />}
          {tab === 'netlist' && (s.deck ? <pre className="code">{s.deck.text}</pre> : <p className="empty">{t('bottom.noNetlist')}</p>)}
          {tab === 'log' && (s.run ? <pre className="code">{s.run.log}</pre> : <p className="empty">{t('bottom.noLog')}</p>)}
        </div>
      )}
    </section>
  );
}
