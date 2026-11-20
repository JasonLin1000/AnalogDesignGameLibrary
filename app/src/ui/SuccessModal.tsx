import { useEffect } from 'react';
import { useProgress } from '../game/progress';
import { sfx } from '../game/sfx';
import { useT } from '../i18n';
import { EVERY_LEVEL } from '../levels';
import { maxStars } from '../levels/evaluate';
import type { AnyLevel } from '../levels/types';
import { Stars } from './BriefPanel';
import { Confetti } from './Confetti';
import { Modal } from './Dialogs';

export const FINAL_LEVEL = '10-1';

export function SuccessModal({ level, stars, onNext, onStay, hasNext }: {
  level: AnyLevel; stars: number; onNext: () => void; onStay: () => void; hasNext: boolean;
}) {
  const { t, L } = useT();
  const max = maxStars(level);
  const progress = useProgress();
  const graduate = level.id === FINAL_LEVEL;
  useEffect(() => { if (graduate) sfx.tapeout(); else sfx.success(stars); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const totalMax = EVERY_LEVEL.reduce((a, l) => a + maxStars(l), 0);
  return (
    <>
      <Confetti run={stars === max || graduate} />
      <Modal title={graduate ? t('grad.title') : t('success.title')} onClose={onStay}>
        <div className="success">
          <div className="big-stars"><Stars n={stars} max={max} /></div>
          {graduate ? (
            <div className="certificate">
              <div className="cert-seal" aria-hidden="true">⏚</div>
              <h4>{t('grad.cert')}</h4>
              <p>{t('grad.body')}</p>
              <p className="cert-stars">★ {total} / {totalMax}</p>
              <p className="note">{new Date().toLocaleDateString()}</p>
              <button onClick={() => window.print()}>{t('grad.print')}</button>
            </div>
          ) : <p>{stars < max ? t('success.more', { n: max - stars }) : t('success.perfect')}</p>}
          <div className="codex-card">
            <span className="codex-tag">{t('success.codex')}</span>
            <h4>{L(level.concept.title)}</h4>
            <p>{L(level.concept.body)}</p>
          </div>
          <div className="actions">
            <button onClick={onStay}>{t('success.stay')}</button>
            {hasNext && <button className="primary" onClick={onNext}>{t('success.next')} →</button>}
          </div>
        </div>
      </Modal>
    </>
  );
}
