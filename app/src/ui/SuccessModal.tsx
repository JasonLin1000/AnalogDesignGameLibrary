import { useT } from '../i18n';
import { maxStars } from '../levels/evaluate';
import type { AnyLevel } from '../levels/types';
import { Stars } from './BriefPanel';
import { Modal } from './Dialogs';

export function SuccessModal({ level, stars, onNext, onStay, hasNext }: {
  level: AnyLevel; stars: number; onNext: () => void; onStay: () => void; hasNext: boolean;
}) {
  const { t, L } = useT();
  const max = maxStars(level);
  return (
    <Modal title={t('success.title')} onClose={onStay}>
      <div className="success">
        <div className="big-stars"><Stars n={stars} max={max} /></div>
        <p>{stars < max ? t('success.more', { n: max - stars }) : t('success.perfect')}</p>
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
  );
}
