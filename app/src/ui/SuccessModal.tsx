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
import { Icon } from './Icon';
import { ACHV_XP, type Achievement } from '../game/achievements';
import { METRICS } from '../game/records';
import { METRIC_ICON, fmtMetric } from './AchievementsPage';
import type { DesignReport } from './Workbench';
import type { MessageKey } from '../i18n';

export const FINAL_LEVEL = '10-1';

export function SuccessModal({ level, stars, onNext, onStay, hasNext, design, achv }: {
  level: AnyLevel; stars: number; onNext: () => void; onStay: () => void; hasNext: boolean; design?: DesignReport; achv?: Achievement[];
}) {
  const got = achv ?? design?.achv ?? [];
  const { t, L } = useT();
  const max = maxStars(level);
  const progress = useProgress();
  const graduate = level.id === FINAL_LEVEL;
  useEffect(() => {
    if (graduate) sfx.tapeout(); else sfx.success(stars);
    if (got.length) { const id = setTimeout(() => sfx.achievement(), 900); return () => clearTimeout(id); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const totalMax = EVERY_LEVEL.reduce((a, l) => a + maxStars(l), 0);
  return (
    <>
      <Confetti run={stars === max || graduate} />
      <Modal title={graduate ? t('grad.title') : t('success.title')} onClose={onStay}>
        <div className="success">
          <div className="big-stars pop"><Stars n={stars} max={max} /></div>
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
          {design && <DesignCard d={design} />}
          {got.length > 0 && (
            <div className="modal-achv">
              {got.map((a, i) => (
                <span key={a.id} className="achv-chip" style={{ animationDelay: `${0.9 + i * 0.15}s` }} title={L(a.desc)}>
                  <Icon name={a.icon} size={14} /> {L(a.title)} <small>+{ACHV_XP} XP</small>
                </span>
              ))}
            </div>
          )}
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

/** Opus Magnum-style design record: this run's metrics, par for the part count, personal bests. */
function DesignCard({ d }: { d: DesignReport }) {
  const { t } = useT();
  return (
    <div className="design-rec" aria-label={t('rec2.title')}>
      {METRICS.filter((m) => d.rec[m] !== undefined && Number.isFinite(d.rec[m]!)).map((m, i) => {
        const v = d.rec[m]!;
        const isNew = d.improved.includes(m);
        const prev = d.prev?.[m];
        let note: string;
        if (m === 'parts' && d.par) note = v < d.par ? t('par.under', { par: d.par }) : v === d.par ? t('par.on', { par: d.par }) : t('par.over', { par: d.par });
        else note = prev === undefined ? t('rec2.first') : isNew ? t('rec2.was', { v: fmtMetric(m, prev) }) : t('rec2.best', { v: fmtMetric(m, prev) });
        const good = isNew || (m === 'parts' && !!d.par && v <= d.par);
        return (
          <div key={m} className={`metric${good ? ' good' : ''}`} style={{ animationDelay: `${0.35 + i * 0.08}s` }}>
            <span className="metric-head"><Icon name={METRIC_ICON[m]} size={13} /> {t(`metric.${m}` as MessageKey)}</span>
            <b>{fmtMetric(m, v)}</b>
            <span className="metric-note">{note}</span>
            {isNew && <span className="new-rec">{t('rec2.new')}</span>}
          </div>
        );
      })}
    </div>
  );
}
