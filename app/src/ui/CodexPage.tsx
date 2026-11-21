// Codex (concept cards unlocked by passing levels), progress records and backup / restore.
import { useRef, useState } from 'react';
import { downloadJson, readJsonFile } from '../game/custom';
import { useProgress } from '../game/progress';
import { useT } from '../i18n';
import { CHAPTERS } from '../levels';
import { maxStars } from '../levels/evaluate';
import { Stars } from './BriefPanel';
import { Icon } from './Icon';

export function CodexPage({ onPlay }: { onPlay: (id: string) => void }) {
  const { t, L } = useT();
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const backup = () => {
    const data: Record<string, unknown> = { app: 'analog-design-game', version: 1, savedAt: new Date().toISOString(), storage: {} };
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('adg.')) (data.storage as Record<string, string>)[k] = localStorage.getItem(k)!;
    } catch { /* ignore */ }
    downloadJson(`analog-design-game-save-${new Date().toISOString().slice(0, 10)}.json`, data);
  };
  const restore = async (f: File) => {
    try {
      const d = (await readJsonFile(f)) as { app?: string; storage?: Record<string, string> };
      if (d.app !== 'analog-design-game' || !d.storage) throw new Error('bad file');
      if (!confirm(t('rec.restoreConfirm'))) return;
      for (const [k, v] of Object.entries(d.storage)) if (k.startsWith('adg.')) localStorage.setItem(k, v);
      location.reload();
    } catch { setMsg(t('rec.badFile')); }
  };

  return (
    <main className="home codex">
      <section className="hero">
        <h1>{t('codex.title')}</h1>
        <p>{t('codex.intro')}</p>
      </section>
      <section className="chapter">
        <header><h2>{t('rec.title')}</h2></header>
        <table className="runs-table rec-table">
          <thead><tr><th>{t('rec.chapter')}</th><th>★</th><th>{t('rec.done')}</th></tr></thead>
          <tbody>{CHAPTERS.map((c) => {
            const got = c.levels.reduce((a, l) => a + (p.stars[l.id] ?? 0), 0);
            const max = c.levels.reduce((a, l) => a + maxStars(l), 0);
            const done = c.levels.filter((l) => (p.stars[l.id] ?? 0) > 0).length;
            return <tr key={c.id}><td>{L(c.title)}</td><td>{got} / {max}</td><td>{done} / {c.levels.length}</td></tr>;
          })}</tbody>
        </table>
        <div className="hero-actions">
          <button onClick={backup}><Icon name="save" /> {t('rec.backup')}</button>
          <button onClick={() => file.current?.click()}><Icon name="folder" /> {t('rec.restore')}</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ''; }} />
          {msg && <span className="err">{msg}</span>}
        </div>
        <p className="note">{t('rec.note')}</p>
      </section>
      {CHAPTERS.map((c) => (
        <section key={c.id} className="chapter">
          <header><h2>{L(c.title)}</h2></header>
          <div className="codex-grid">
            {c.levels.map((l) => {
              const got = p.stars[l.id] ?? 0;
              return got > 0 ? (
                <article key={l.id} className="codex-card">
                  <span className="codex-tag">{l.id} · <Stars n={got} max={maxStars(l)} /></span>
                  <h4>{L(l.concept.title)}</h4>
                  <p>{L(l.concept.body)}</p>
                </article>
              ) : (
                <button key={l.id} className="codex-card locked" onClick={() => onPlay(l.id)}>
                  <span className="codex-tag">{l.id}</span>
                  <h4><Icon name="lock" size={14} /> {L(l.title)}</h4>
                  <p className="muted">{t('codex.locked')}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
