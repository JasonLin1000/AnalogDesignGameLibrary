import { useT } from '../i18n';
import { Icon } from './Icon';

/** Floating bottom-right shortcut to the next level, shown once the current one has been passed. */
export function NextLevelButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  return (
    <button className="next-fab" onClick={onClick}>
      {t('success.next')} <Icon name="arrowRight" size={16} />
    </button>
  );
}
