import { useEffect, useState } from 'react';
import { useLang, useT } from './i18n';
import { findLevel } from './levels';
import { HomeScreen } from './ui/HomeScreen';
import { Workbench } from './ui/Workbench';

type Route = { page: 'home' } | { page: 'level'; id: string } | { page: 'sandbox' };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  if (h === 'sandbox') return { page: 'sandbox' };
  const m = h.match(/^level\/(.+)$/);
  if (m && findLevel(m[1])) return { page: 'level', id: m[1] };
  return { page: 'home' };
}

export function App() {
  const { t, lang } = useT();
  const setLang = useLang((s) => s.setLang);
  const [route, setRoute] = useState<Route>(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : 'en';
    return () => window.removeEventListener('hashchange', on);
  }, [lang]);
  const go = (hash: string) => { location.hash = hash; };

  return (
    <div className="app">
      <header className="appbar">
        <button className="brand" onClick={() => go('')}>
          <span className="logo" aria-hidden="true">⏚</span> {t('app.name')}
        </button>
        <span className="grow" />
        <button className="lang" onClick={() => setLang(lang === 'zh-TW' ? 'en' : 'zh-TW')} aria-label={t('app.switchLang')}>
          {lang === 'zh-TW' ? 'EN' : '中文'}
        </button>
      </header>
      {route.page === 'home' && <HomeScreen onPlay={(id) => go(`level/${id}`)} onSandbox={() => go('sandbox')} />}
      {route.page === 'level' && (
        <Workbench level={findLevel(route.id)!} onExit={() => go('')} onGoto={(id) => go(`level/${id}`)} />
      )}
      {route.page === 'sandbox' && <Workbench level={null} onExit={() => go('')} onGoto={(id) => go(`level/${id}`)} />}
    </div>
  );
}
