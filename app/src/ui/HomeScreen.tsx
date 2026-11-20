import { chapterComplete, chapterUnlocked, levelUnlocked, useProgress } from '../game/progress';
import { useT } from '../i18n';
import { CHAPTERS } from '../levels';
import { maxStars } from '../levels/evaluate';
import { Stars } from './BriefPanel';

export function HomeScreen({ onPlay, onSandbox }: { onPlay: (id: string) => void; onSandbox: () => void }) {
  const { t, L } = useT();
  const p = useProgress();
  const total = CHAPTERS.flatMap((c) => c.levels).reduce((s, l) => s + maxStars(l), 0);
  const got = Object.values(p.stars).reduce((s, n) => s + n, 0);
  return (
    <main className="home">
      <section className="hero">
        <h1>{t('home.title')}</h1>
        <p>{t('home.tagline')}</p>
        <div className="hero-actions">
          <button className="primary" onClick={onSandbox}>🧪 {t('home.sandbox')}</button>
          <span className="muted">★ {got} / {total}</span>
        </div>
      </section>
      {CHAPTERS.map((ch) => {
        const open = chapterUnlocked(p.stars, ch.id, p.unlockAll);
        const done = chapterComplete(p.stars, ch.id);
        const test = ch.levels.find((l) => l.skipTest);
        return (
          <section key={ch.id} className={`chapter${open ? '' : ' locked'}`}>
            <header>
              <h2>{L(ch.title)} {done && <span className="badge">✓ {t('home.done')}</span>}</h2>
              {!open && <span className="lock">🔒 {t('home.locked')}</span>}
            </header>
            <p className="intro">{L(ch.intro)}</p>
            <div className="levels">
              {ch.levels.map((lv) => {
                const unlocked = levelUnlocked(p.stars, lv, p.unlockAll);
                return (
                  <button key={lv.id} className={`level-card${lv.skipTest ? ' test' : ''}`} disabled={!unlocked} onClick={() => onPlay(lv.id)}>
                    <span className="level-id">{lv.id}{lv.skipTest ? ` · ${t('home.skipTest')}` : ''}</span>
                    <span className="level-title">{L(lv.title)}</span>
                    <Stars n={p.stars[lv.id] ?? 0} max={maxStars(lv)} />
                    {!unlocked && <span className="lock" aria-label={t('home.locked')}>🔒</span>}
                  </button>
                );
              })}
            </div>
            {open && test && !done && <p className="skip-note">⏩ {t('home.skipNote', { id: test.id })}</p>}
          </section>
        );
      })}
      <section className="settings">
        <label className="check">
          <input type="checkbox" checked={p.unlockAll} onChange={(e) => p.setUnlockAll(e.target.checked)} /> {t('home.unlockAll')}
        </label>
        <button className="link" onClick={() => { if (confirm(t('home.resetConfirm'))) p.reset(); }}>{t('home.reset')}</button>
      </section>
    </main>
  );
}
