// Tutorial cards for a level: shown on first entry, reopenable from the brief panel.
import { useState } from 'react';
import { useT } from '../i18n';
import { INTROS, type Figure } from '../levels/intros';
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
