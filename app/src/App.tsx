import { useEffect, useState } from 'react';
import { Icon, Logo } from './ui/Icon';
import { useCustom } from './game/custom';
import { useSound } from './game/sfx';
import { useTheme } from './game/theme';
import { useLang, useT } from './i18n';
import { findLevel } from './levels';
import { isLayoutLevel, type Level } from './levels/types';
import { CodexPage } from './ui/CodexPage';
import { HomeScreen } from './ui/HomeScreen';
import { LayoutWorkbench } from './ui/LayoutWorkbench';
import { LevelEditor } from './ui/LevelEditor';
import { Prologue, seenPrologue } from './ui/Prologue';
import { Workbench } from './ui/Workbench';

type Route =
  | { page: 'home' } | { page: 'level'; id: string } | { page: 'sandbox' } | { page: 'codex' }
  | { page: 'editor'; id?: string } | { page: 'custom'; id: string };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'sandbox') return { page: 'sandbox' };
  if (h === 'codex') return { page: 'codex' };
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
  const setLang = useLang((s) => s.setLang);
  const sound = useSound();
  const theme = useTheme();
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
        <nav className="appnav">
          <button className={route.page === 'codex' ? 'active' : ''} onClick={() => go('codex')}><Icon name="book" /> {t('nav.codex')}</button>
          <button className={route.page === 'editor' ? 'active' : ''} onClick={() => go('editor')}><Icon name="wrench" /> {t('nav.editor')}</button>
          <button onClick={() => setStory(true)}><Icon name="cards" /> {t('nav.story')}</button>
        </nav>
        <span className="grow" />
        <button className="icon-btn" onClick={theme.toggle} aria-label={t(theme.theme === 'light' ? 'nav.dark' : 'nav.light')} title={t(theme.theme === 'light' ? 'nav.dark' : 'nav.light')}>
          <Icon name={theme.theme === 'light' ? 'moon' : 'sun'} size={18} />
        </button>
        <button className="icon-btn" onClick={sound.toggle} aria-label={sound.muted ? t('nav.unmute') : t('nav.mute')} title={sound.muted ? t('nav.unmute') : t('nav.mute')}>
          <Icon name={sound.muted ? 'mute' : 'sound'} size={18} />
        </button>
        <button className="lang" onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')} aria-label={t('app.switchLang')}>
          {lang === 'zh-TW' ? 'EN' : '中文'}
        </button>
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
      {story && <Prologue onClose={() => setStory(false)} />}
    </div>
  );
}
