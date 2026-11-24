// Display settings stored per viewer: font scale (applied as the CSS variable --fs).
import { create } from 'zustand';

export const FONT_SCALES = [0.9, 1, 1.15, 1.3] as const;
const KEY = 'adg.fontScale';
const load = (): number => {
  try { const v = Number(localStorage.getItem(KEY)); return (FONT_SCALES as readonly number[]).includes(v) ? v : 1; } catch { return 1; }
};
const apply = (v: number) => { document.documentElement.style.setProperty('--fs', String(v)); };

export const useSettings = create<{ fontScale: number; setFontScale: (v: number) => void }>((set) => {
  const fontScale = load();
  apply(fontScale);
  return {
    fontScale,
    setFontScale: (v) => { apply(v); try { localStorage.setItem(KEY, String(v)); } catch { /* ignore */ } set({ fontScale: v }); },
  };
});
