import { useRef, useState } from 'react';
import { downloadJson, readJsonFile, useCustom, validateLevel } from '../game/custom';
import { chapterComplete, chapterUnlocked, levelUnlocked, passed, useProgress } from '../game/progress';
import { experience, useQuiz } from '../game/xp';
import { useT } from '../i18n';
import { CHAPTERS } from '../levels';
import { maxStars } from '../levels/evaluate';
import type { AnyLevel } from '../levels/types';
import { Stars } from './BriefPanel';
import { Icon } from './Icon';
import { IpStepper } from './IpStepper';

/** The level the player should do next: the first open, unpassed level of the first unfinished chapter. */
export function currentLevel(stars: Record<string, number>, all: boolean): AnyLevel | null {
  for (const ch of CHAPTERS) {
    if (!chapterUnlocked(stars, ch.id, all)) break;
    if (chapterComplete(stars, ch.id)) continue;
    const open = ch.levels.filter((l) => levelUnlocked(stars, l, all) && !passed(stars, l.id));
    return open.find((l) => !l.skipTest) ?? open[0] ?? null;
  }
  return CHAPTERS.flatMap((c) => c.levels).find((l) => !passed(stars, l.id)) ?? null;
}

export function HomeScreen({ onPlay, onSandbox }: { onPlay: (id: string) => void; onSandbox: () => void }) {
  const { t, L } = useT();
  const p = useProgress();
  const answers = useQuiz((s) => s.answers);
  const cur = currentLevel(p.stars, p.unlockAll);
  const curChapter = cur ? cur.chapter : CHAPTERS[CHAPTERS.length - 1].id;
  const [sel, setSel] = useState(curChapter);
  const ch = CHAPTERS.find((c) => c.id === sel) ?? CHAPTERS[0];
  const total = CHAPTERS.flatMap((c) => c.levels).reduce((s, l) => s + maxStars(l), 0);
  const got = Object.values(p.stars).reduce((s, n) => s + n, 0);
  const xp = experience(p.stars, answers);
  const curCh = CHAPTERS.find((c) => c.id === curChapter)!;
  const test = curCh.levels.find((l) => l.skipTest);

  return (
    <main className="home">
      {/* ---------- current mission ---------- */}
      <section className="mission" aria-labelledby="mission-title">
        <div className="mission-main">
          {cur ? (
            <>
              <p className="eyebrow">{t('home.mission')} · {L(curCh.title)}</p>
              <h1 id="mission-title"><span className="mission-id">{cur.id}</span> {L(cur.title)}</h1>
              {cur.part && <IpStepper levelId={cur.id} part={cur.part} />}
              <p className="mission-story">{L(cur.story)}</p>
              <p className="mission-goal"><strong>{t('brief.objective')}</strong>{L(cur.objective)}</p>
              <div className="mission-actions">
                <button className="primary big" onClick={() => onPlay(cur.id)}>
                  {(p.stars[cur.id] ?? 0) > 0 || hasDraft(cur.id) ? t('home.continue') : t('home.start')} <Icon name="arrowRight" size={18} />
                </button>
                {test && test.id !== cur.id && !chapterComplete(p.stars, curCh.id) && (
                  <button className="link" onClick={() => onPlay(test.id)}><Icon name="skip" size={14} /> {t('home.skipTo', { id: test.id })}</button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="eyebrow">{t('home.mission')}</p>
              <h1 id="mission-title">{t('home.allDone')}</h1>
              <p className="mission-story">{t('home.allDoneBody')}</p>
              <div className="mission-actions"><button className="primary big" onClick={onSandbox}><Icon name="flask" /> {t('home.sandbox')}</button></div>
            </>
          )}
        </div>
        <aside className="rank" aria-label={t('rank.title')}>
          <span className="rank-label">{t('rank.title')}</span>
          <span className="rank-name">{L(xp.rank.title)}</span>
          <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xp.progress * 100)}>
            <span style={{ width: `${Math.round(xp.progress * 100)}%` }} />
          </div>
          <span className="rank-next">{xp.next ? t('rank.next', { xp: xp.xp, need: xp.next.xp - xp.xp, name: L(xp.next.title) }) : t('rank.max', { xp: xp.xp })}</span>
          <span className="rank-stars"><span className="stars"><span className="on">★</span></span> {got} / {total}</span>
        </aside>
      </section>

      {/* ---------- chapter map ---------- */}
      <nav className="chapter-map" aria-label={t('home.map')}>
        <ol>
          {CHAPTERS.map((c) => {
            const open = chapterUnlocked(p.stars, c.id, p.unlockAll);
            const done = chapterComplete(p.stars, c.id);
            const state = done ? 'done' : c.id === curChapter ? 'current' : open ? 'open' : 'locked';
            return (
              <li key={c.id} className={`node ${state}${c.id === sel ? ' sel' : ''}`}>
                <button onClick={() => setSel(c.id)} aria-current={c.id === sel ? 'true' : undefined} title={L(c.title)}>
                  <span className="node-dot">{done ? <Icon name="check" size={14} /> : !open ? <Icon name="lock" size={12} /> : c.id}</span>
                  <span className="node-label">{shortTitle(L(c.title))}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ---------- selected chapter ---------- */}
      <section className="chapter-detail">
        <header>
          <h2>{L(ch.title)}</h2>
          {chapterComplete(p.stars, ch.id) && <span className="badge"><Icon name="check" size={12} /> {t('home.done')}</span>}
          {!chapterUnlocked(p.stars, ch.id, p.unlockAll) && <span className="lock"><Icon name="lock" size={14} /> {t('home.locked')}</span>}
        </header>
        <p className="intro">{L(ch.intro)}</p>
        <ol className="level-rows">
          {ch.levels.map((lv) => {
            const unlocked = levelUnlocked(p.stars, lv, p.unlockAll);
            const isCur = cur?.id === lv.id;
            return (
              <li key={lv.id}>
                <button className={`level-row${isCur ? ' current' : ''}${lv.skipTest ? ' test' : ''}`} disabled={!unlocked} onClick={() => onPlay(lv.id)}>
                  <span className="level-id">{lv.id}</span>
                  <span className="level-title">{L(lv.title)}</span>
                  <span className="level-tags">
                    {lv.guide && <span className="tag soft">{t('home.tagTutorial')}</span>}
                    {lv.part && <span className="tag soft">{lv.part.step < lv.part.of ? t('home.tagPart', { n: lv.part.step, of: lv.part.of }) : t('home.tagAssemble')}</span>}
                    {lv.skipTest && <span className="tag gold">{t('home.skipTest')}</span>}
                  </span>
                  {unlocked ? <Stars n={p.stars[lv.id] ?? 0} max={maxStars(lv)} /> : <Icon name="lock" size={14} />}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------- everything else, folded away ---------- */}
      <details className="more">
        <summary>{t('home.more')}</summary>
        <div className="more-links">
          <button onClick={onSandbox}><Icon name="flask" /> {t('home.sandbox')}</button>
          <button onClick={() => { location.hash = 'editor'; }}><Icon name="wrench" /> {t('nav.editor')}</button>
        </div>
        <CustomSection onEdit={(id) => { location.hash = id ? `editor/${id}` : 'editor'; }} onPlayCustom={(id) => { location.hash = `custom/${id}`; }} />
      </details>
    </main>
  );
}

const hasDraft = (id: string) => { try { return !!localStorage.getItem(`adg.draft.${id}`) || !!localStorage.getItem(`adg.layout.${id}`); } catch { return false; } };
/** "第 4 章：差動電路" → "差動電路"; "Chapter 4: Differential circuits" → "Differential circuits" */
const shortTitle = (s: string) => s.replace(/^[^：:]*[：:]\s*/, '');

/** Player-made levels: play, edit, export, delete, import. */
function CustomSection({ onEdit, onPlayCustom }: { onEdit: (id?: string) => void; onPlayCustom: (id: string) => void }) {
  const { t, L } = useT();
  const custom = useCustom();
  const p = useProgress();
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const importFile = async (f: File) => {
    try {
      const d = await readJsonFile(f);
      if (!validateLevel(d)) throw new Error('invalid');
      const id = custom.levels.some((l) => l.id === d.id) ? `${d.id}-${Date.now().toString(36)}` : d.id;
      custom.upsert({ ...d, id, chapter: -1 });
      setMsg(t('custom.imported', { title: L(d.title) }));
    } catch { setMsg(t('rec.badFile')); }
  };
  return (
    <section className="custom-levels">
      <h3>{t('custom.title')}</h3>
      <p className="note">{t('custom.intro')}</p>
      {custom.levels.length > 0 && (
        <div className="levels">
          {custom.levels.map((lv) => (
            <div key={lv.id} className="level-card custom">
              <span className="level-id">{t('custom.tag')}</span>
              <span className="level-title">{L(lv.title)}</span>
              <Stars n={p.stars[lv.id] ?? 0} max={maxStars(lv)} />
              <div className="card-actions">
                <button onClick={() => onPlayCustom(lv.id)} aria-label={t('edit.play')}><Icon name="play" size={14} /></button>
                <button onClick={() => onEdit(lv.id)} aria-label={t('custom.edit')}><Icon name="edit" size={14} /></button>
                <button onClick={() => downloadJson(`${lv.id}.level.json`, lv)} aria-label={t('custom.export')}>⤓</button>
                <button onClick={() => { if (confirm(t('custom.deleteConfirm'))) custom.remove(lv.id); }} aria-label={t('tool.delete')}><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="hero-actions">
        <button onClick={() => onEdit()}>+ {t('custom.new')}</button>
        <button onClick={() => file.current?.click()}><Icon name="folder" /> {t('custom.import')}</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
        {msg && <span className="muted">{msg}</span>}
      </div>
    </section>
  );
}
