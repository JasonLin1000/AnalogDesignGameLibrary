import { levelUnlocked, passed, useProgress } from '../game/progress';
import { useT } from '../i18n';
import { EVERY_LEVEL } from '../levels';
import type { IpPart } from '../levels/types';
import { Icon } from './Icon';

/** "Two-stage op-amp: ① stage two → ② compensation → ③ assemble", with done / current marks. */
export function IpStepper({ levelId, part, onGo }: { levelId: string; part: IpPart; onGo?: (id: string) => void }) {
  const { t, L } = useT();
  const stars = useProgress((s) => s.stars);
  const all = useProgress((s) => s.unlockAll);
  const steps = EVERY_LEVEL.filter((l) => l.part && l.part.ip['zh-TW'] === part.ip['zh-TW']).sort((a, b) => a.part!.step - b.part!.step);
  return (
    <div className="ip-stepper" aria-label={t('ip.label', { ip: L(part.ip) })}>
      <span className="ip-name">{L(part.ip)}</span>
      <ol>
        {steps.map((l) => {
          const state = l.id === levelId ? 'current' : passed(stars, l.id) ? 'done' : 'todo';
          const label = l.part!.step < l.part!.of ? L(l.title).split(/[：:]/)[0] : t('home.tagAssemble');
          const inner = (
            <>
              <span className="ip-dot">{state === 'done' ? <Icon name="check" size={11} /> : l.part!.step}</span>
              <span className="ip-step-label">{label}</span>
            </>
          );
          return (
            <li key={l.id} className={state}>
              {onGo && l.id !== levelId && levelUnlocked(stars, l, all) ? <button className="ip-step" onClick={() => onGo(l.id)}>{inner}</button> : <span className="ip-step">{inner}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
