import { useToasts } from '../game/toast';
import { useT } from '../i18n';
import { Icon } from './Icon';

/** Pop-up notices in the top-right corner: achievements, burnt parts. */
export function Toasts() {
  const { t, L } = useT();
  const { list, dismiss } = useToasts();
  const text = (s: string | { 'zh-TW': string; en: string } | undefined) => (s === undefined ? '' : typeof s === 'string' ? s : L(s));
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((n) => (
        <button key={n.id} className={`toast ${n.kind}`} onClick={() => dismiss(n.id)}>
          <span className="toast-icon"><Icon name={n.icon} size={22} /></span>
          <span className="toast-text">
            {n.kind === 'achv' && <span className="toast-eyebrow">{t('achv.unlocked')}{n.xp ? ` · +${n.xp} XP` : ''}</span>}
            <strong>{text(n.title)}</strong>
            {n.body && <span className="toast-body">{text(n.body)}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
