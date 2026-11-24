// Tutorial cards for a level: shown on first entry, reopenable from the brief panel.
import { useState } from 'react';
import { useQuiz } from '../game/xp';
import { useT } from '../i18n';
import { INTROS, type Figure, type Quiz } from '../levels/intros';
import { Modal } from './Dialogs';
import { Icon } from './Icon';
import { LayoutDrawing } from './StaticLayout';
import { SchematicDrawing } from './StaticSchematic';

const seenKey = (id: string) => `adg.intro.${id}`;
export const hasIntro = (id: string) => !!INTROS[id]?.length;
export function introSeen(id: string): boolean {
  try { return localStorage.getItem(seenKey(id)) === '1'; } catch { return true; }
}

function FigureView({ fig }: { fig: Figure }) {
  const { L } = useT();
  if ('sch' in fig) return <SchematicDrawing sch={fig.sch} values={fig.values ?? true} height={fig.height ?? 200} />;
  if ('lay' in fig) return <LayoutDrawing layout={fig.lay} height={fig.height ?? 200} />;
  return (
    <dl className="keys">
      {fig.keys.map(([key, text]) => (
        <div key={key}><dt><kbd>{key}</kbd></dt><dd>{L(text)}</dd></div>
      ))}
    </dl>
  );
}

/** Multiple-choice concept check. The first answer is recorded for experience points. */
function QuizView({ quiz, qkey }: { quiz: Quiz; qkey: string }) {
  const { t, L } = useT();
  const record = useQuiz((s) => s.answer);
  const [pick, setPick] = useState<number | null>(null);
  const choose = (i: number) => { if (pick !== null) return; setPick(i); record(qkey, i === quiz.answer); };
  return (
    <div className="quiz">
      <div className="quiz-options" role="group">
        {quiz.options.map((o, i) => {
          const state = pick === null ? '' : i === quiz.answer ? ' right' : i === pick ? ' wrong' : ' dim';
          return (
            <button key={i} className={`quiz-option${state}`} onClick={() => choose(i)} aria-pressed={pick === i}>
              <span className="quiz-letter">{String.fromCharCode(65 + i)}</span>
              <span>{L(o)}</span>
              {pick !== null && i === quiz.answer && <Icon name="check" size={16} />}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <p className={`quiz-explain ${pick === quiz.answer ? 'right' : 'wrong'}`} role="status">
          <strong>{pick === quiz.answer ? t('quiz.right') : t('quiz.wrong')}</strong> {L(quiz.explain)}
        </p>
      )}
    </div>
  );
}

export function IntroCards({ levelId, onClose }: { levelId: string; onClose: () => void }) {
  const { t, L } = useT();
  const slides = INTROS[levelId] ?? [];
  const [i, setI] = useState(0);
  const close = () => { try { localStorage.setItem(seenKey(levelId), '1'); } catch { /* ignore */ } onClose(); };
  if (!slides.length) return null;
  const s = slides[i];
  return (
    <Modal title={t('intro.title', { id: levelId })} onClose={close}>
      <div className="intro">
        <h4>{L(s.title)}</h4>
        {L(s.body).split('\n').map((p, k) => <p key={k}>{p}</p>)}
        {s.fig && <figure className="intro-fig"><FigureView fig={s.fig} />{s.caption && <figcaption>{L(s.caption)}</figcaption>}</figure>}
        {s.quiz && <QuizView key={`${levelId}:${i}`} quiz={s.quiz} qkey={`${levelId}:${i}`} />}
        <div className="intro-foot">
          {slides.length > 1
            ? <div className="dots" aria-label={`${i + 1} / ${slides.length}`}>{slides.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}</div>
            : <span />}
          <div className="actions">
            {i > 0 && <button onClick={() => setI(i - 1)}><Icon name="arrowLeft" size={14} /> {t('intro.prev')}</button>}
            {i < slides.length - 1
              ? <button className="primary" onClick={() => setI(i + 1)}>{t('story.next')} <Icon name="arrowRight" size={14} /></button>
              : <button className="primary" onClick={close}>{t('intro.start')}</button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
