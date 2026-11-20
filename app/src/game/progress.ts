// Player progress (stars per level). Stored in localStorage; the game works without it.
import { create } from 'zustand';
import { CHAPTERS } from '../levels';
import type { AnyLevel } from '../levels/types';

interface ProgressState {
  stars: Record<string, number>;
  unlockAll: boolean;
  record: (levelId: string, stars: number) => void;
  setUnlockAll: (b: boolean) => void;
  reset: () => void;
}

const KEY = 'adg.progress.v1';
function load(): Pick<ProgressState, 'stars' | 'unlockAll'> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      return { stars: j.stars ?? {}, unlockAll: !!j.unlockAll };
    }
  } catch { /* ignore */ }
  return { stars: {}, unlockAll: false };
}
function save(s: Pick<ProgressState, 'stars' | 'unlockAll'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ stars: s.stars, unlockAll: s.unlockAll })); } catch { /* ignore */ }
}

export const useProgress = create<ProgressState>((set, get) => ({
  ...load(),
  record: (id, stars) => {
    const cur = get().stars[id] ?? 0;
    if (stars <= cur) return;
    const next = { ...get().stars, [id]: stars };
    set({ stars: next });
    save({ stars: next, unlockAll: get().unlockAll });
  },
  setUnlockAll: (unlockAll) => { set({ unlockAll }); save({ stars: get().stars, unlockAll }); },
  reset: () => { set({ stars: {} }); save({ stars: {}, unlockAll: get().unlockAll }); },
}));

export const passed = (stars: Record<string, number>, id: string) => (stars[id] ?? 0) > 0;

export function chapterComplete(stars: Record<string, number>, chapterId: number): boolean {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return false;
  return ch.levels.some((l) => l.skipTest && passed(stars, l.id)) || ch.levels.every((l) => passed(stars, l.id));
}

export function chapterUnlocked(stars: Record<string, number>, chapterId: number, all = false): boolean {
  if (all || chapterId === CHAPTERS[0].id) return true;
  const idx = CHAPTERS.findIndex((c) => c.id === chapterId);
  return idx > 0 && chapterComplete(stars, CHAPTERS[idx - 1].id);
}

/** Levels unlock in order; a chapter's skip test is always open once the chapter is. */
export function levelUnlocked(stars: Record<string, number>, level: AnyLevel, all = false): boolean {
  if (all) return true;
  if (!chapterUnlocked(stars, level.chapter)) return false;
  const ch = CHAPTERS.find((c) => c.id === level.chapter)!;
  const i = ch.levels.findIndex((l) => l.id === level.id);
  return i === 0 || level.skipTest === true || passed(stars, ch.levels[i - 1].id) || chapterComplete(stars, level.chapter);
}

export function nextLevel(level: AnyLevel): AnyLevel | undefined {
  const flat = CHAPTERS.flatMap((c) => c.levels);
  return flat[flat.findIndex((l) => l.id === level.id) + 1];
}
