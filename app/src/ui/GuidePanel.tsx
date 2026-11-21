import { useEffect, useState } from 'react';
import { advanceGuide, type GuideCtx } from '../game/guide';
import { useT } from '../i18n';
import type { GuideStep } from '../levels/types';
import { Icon } from './Icon';

/** Tool-tutorial checklist: steps tick themselves as the player performs them. */
export function GuidePanel({ levelId, steps, ctx }: { levelId: string; steps: GuideStep[]; ctx: GuideCtx }) {
  const { t, L } = useT();
  const [done, setDone] = useState<Set<string>>(() => new Set());
  useEffect(() => { setDone(new Set()); }, [levelId]);
  const keys = steps.map((s) => s.key);
  useEffect(() => {
    setDone((d) => advanceGuide(keys, ctx, d));
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const current = steps.findIndex((s) => !done.has(s.key));
  return (
    <section className="guide" aria-label={t('guide.title')}>
      <h3>{t('guide.title')} <span className="muted">{done.size} / {steps.length}</span></h3>
      <ol>
        {steps.map((s, i) => {
          const state = done.has(s.key) ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={s.key} className={`guide-step ${state}`}>
              <span className="guide-mark" aria-hidden="true">{state === 'done' ? <Icon name="check" size={13} /> : i + 1}</span>
              <span>{L(s.text)}</span>
              <span className="sr-only">{state === 'done' ? t('spec.pass') : ''}</span>
            </li>
          );
        })}
      </ol>
      {current === -1 && <p className="guide-done">{t('guide.allDone')}</p>}
    </section>
  );
}
