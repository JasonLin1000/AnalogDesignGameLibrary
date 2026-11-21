// Light (default) / dark theme, stored per viewer. Applied as <html data-theme>.
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
const KEY = 'adg.theme';
const load = (): Theme => { try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } };
const apply = (t: Theme) => { document.documentElement.dataset.theme = t; };

export const useTheme = create<{ theme: Theme; toggle: () => void }>((set, get) => {
  const theme = load();
  apply(theme);
  return {
    theme,
    toggle: () => {
      const next: Theme = get().theme === 'light' ? 'dark' : 'light';
      apply(next);
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
      set({ theme: next });
    },
  };
});
