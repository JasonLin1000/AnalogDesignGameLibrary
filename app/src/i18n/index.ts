// Tiny i18n: two languages, flat keys, `{name}` interpolation.
// Level content carries its own { 'zh-TW', en } objects (see Localized).
import { create } from 'zustand';
import { zhTW } from './zh-TW';
import { en } from './en';

export type Lang = 'zh-TW' | 'en';
export type Localized = { 'zh-TW': string; en: string };
export type MessageKey = keyof typeof zhTW;

const dicts: Record<Lang, Record<MessageKey, string>> = { 'zh-TW': zhTW, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('adg.lang');
    if (saved === 'en' || saved === 'zh-TW') return saved;
  } catch { /* storage unavailable */ }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('zh')) return 'zh-TW';
  return 'en';
}

interface LangState { lang: Lang; setLang: (l: Lang) => void }
export const useLang = create<LangState>((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    try { localStorage.setItem('adg.lang', lang); } catch { /* ignore */ }
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-Hant' : 'en';
    set({ lang });
  },
}));

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let s = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Hook returning a translator bound to the current language. */
export function useT() {
  const lang = useLang((s) => s.lang);
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
  const L = (text: Localized | string | undefined) =>
    text === undefined ? '' : typeof text === 'string' ? text : text[lang] ?? text.en;
  return { t, L, lang };
}
