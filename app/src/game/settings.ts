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

// Workbench view toggles (per viewer): animated current flow on wires, live re-simulation on edit.
const flag = (key: string, dflt: boolean) => { try { const v = localStorage.getItem(key); return v === null ? dflt : v === '1'; } catch { return dflt; } };
const saveFlag = (key: string, v: boolean) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* ignore */ } };

export const useView = create<{ flow: boolean; live: boolean; setFlow: (v: boolean) => void; setLive: (v: boolean) => void }>((set) => ({
  flow: flag('adg.view.flow', true),
  live: flag('adg.view.live', false),
  setFlow: (v) => { saveFlag('adg.view.flow', v); set({ flow: v }); },
  setLive: (v) => { saveFlag('adg.view.live', v); set({ live: v }); },
}));
