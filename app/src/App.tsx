import { useEffect, useState } from 'react';
import { Icon, Logo } from './ui/Icon';
import { useCustom } from './game/custom';
import { useTheme } from './game/theme';
import { useT } from './i18n';
import { useSettings } from './game/settings';
import { SettingsPage } from './ui/SettingsPage';
import { findLevel } from './levels';
import { isLayoutLevel, type Level } from './levels/types';
import { CodexPage } from './ui/CodexPage';
import { HomeScreen } from './ui/HomeScreen';
import { LayoutWorkbench } from './ui/LayoutWorkbench';
import { LevelEditor } from './ui/LevelEditor';
import { Prologue, seenPrologue } from './ui/Prologue';
import { Workbench } from './ui/Workbench';
import { Toasts } from './ui/Toasts';
import { AchievementsPage } from './ui/AchievementsPage';

type Route =
  | { page: 'home' } | { page: 'level'; id: string } | { page: 'sandbox' } | { page: 'codex' }
  | { page: 'editor'; id?: string } | { page: 'custom'; id: string } | { page: 'settings' } | { page: 'achv' };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'sandbox') return { page: 'sandbox' };
  if (h === 'codex') return { page: 'codex' };
  if (h === 'settings') return { page: 'settings' };
  if (h === 'achievements') return { page: 'achv' };
  let m = h.match(/^editor(?:\/(.+))?$/);
  if (m) return { page: 'editor', id: m[1] };
  m = h.match(/^custom\/(.+)$/);
  if (m) return { page: 'custom', id: m[1] };
  m = h.match(/^level\/(.+)$/);
  if (m && findLevel(m[1])) return { page: 'level', id: m[1] };
  return { page: 'home' };
}

export function App() {
  const { t, lang } = useT();
  useTheme(); // applies the stored theme
  useSettings(); // applies the stored font size
  const custom = useCustom();
  const [route, setRoute] = useState<Route>(parseHash);
  const [story, setStory] = useState(!seenPrologue());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : 'en';
    return () => window.removeEventListener('hashchange', on);
  }, [lang]);
  const go = (hash: string) => { location.hash = hash; };
  const customLevel = route.page === 'custom' ? custom.levels.find((l) => l.id === route.id) : undefined;

  return (
    <div className="app">
      <header className="appbar">
        <button className="brand" onClick={() => go('')}>
          <Logo /> <span className="brand-name">{t('app.name')}</span>
        </button>
        <span className="grow" />
        <nav className="appnav">
          <button className={route.page === 'home' ? 'active' : ''} onClick={() => go('')}>{t('nav.home')}</button>
          <button className={route.page === 'codex' ? 'active' : ''} onClick={() => go('codex')}><Icon name="book" /> {t('nav.codex')}</button>
          <button className={route.page === 'achv' ? 'active' : ''} onClick={() => go('achievements')}><Icon name="trophy" /> {t('nav.achv')}</button>
          <button className={route.page === 'settings' ? 'active' : ''} onClick={() => go('settings')}><Icon name="gear" /> {t('nav.settings')}</button>
        </nav>
      </header>
      {route.page === 'home' && <HomeScreen onPlay={(id) => go(`level/${id}`)} onSandbox={() => go('sandbox')} />}
      {route.page === 'level' && (() => {
        const lv = findLevel(route.id)!;
        return isLayoutLevel(lv)
          ? <LayoutWorkbench level={lv} onExit={() => go('')} onGoto={(id) => go(`level/${id}`)} />
          : <Workbench level={lv as Level} onExit={() => go('')} onGoto={(id) => go(`level/${id}`)} />;
      })()}
      {route.page === 'sandbox' && <Workbench level={null} onExit={() => go('')} onGoto={(id) => go(`level/${id}`)} />}
      {route.page === 'codex' && <CodexPage onPlay={(id) => go(`level/${id}`)} />}
      {route.page === 'editor' && <LevelEditor editId={route.id} onPlay={(id) => go(`custom/${id}`)} onExit={() => go('')} />}
      {route.page === 'custom' && (customLevel
        ? <Workbench level={customLevel} onExit={() => go('')} onGoto={() => go('')} />
        : <main className="home"><p className="empty">{t('custom.missing')}</p></main>)}
      {route.page === 'settings' && <SettingsPage onStory={() => setStory(true)} />}
      {route.page === 'achv' && <AchievementsPage />}
      <Toasts />
      {story && <Prologue onClose={() => setStory(false)} />}
    </div>
  );
}
