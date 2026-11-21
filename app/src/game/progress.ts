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
      const stars: Record<string, number> = j.stars ?? {};
      if ((j.v ?? 1) < 2) {
        // v2 swapped levels 0-1 (was LED) and 0-2 (was Ohm's law): keep stars with their level.
        const a = stars['0-1'], b = stars['0-2'];
        delete stars['0-1']; delete stars['0-2'];
        if (b !== undefined) stars['0-1'] = b;
        if (a !== undefined) stars['0-2'] = a;
        const d1 = localStorage.getItem('adg.draft.0-1'), d2 = localStorage.getItem('adg.draft.0-2');
        localStorage.removeItem('adg.draft.0-1'); localStorage.removeItem('adg.draft.0-2');
        if (d2 !== null) localStorage.setItem('adg.draft.0-1', d2);
        if (d1 !== null) localStorage.setItem('adg.draft.0-2', d1);
        save({ stars, unlockAll: !!j.unlockAll });
      }
      return { stars, unlockAll: !!j.unlockAll };
    }
  } catch { /* ignore */ }
  return { stars: {}, unlockAll: false };
}
function save(s: Pick<ProgressState, 'stars' | 'unlockAll'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 2, stars: s.stars, unlockAll: s.unlockAll })); } catch { /* ignore */ }
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
  // tool tutorials (levels with a guide) are optional for completing a chapter
  return ch.levels.some((l) => l.skipTest && passed(stars, l.id)) || ch.levels.filter((l) => !l.guide).every((l) => passed(stars, l.id));
}

export function chapterUnlocked(stars: Record<string, number>, chapterId: number, all = false): boolean {
  if (all || chapterId === CHAPTERS[0].id) return true;
  const idx = CHAPTERS.findIndex((c) => c.id === chapterId);
  return idx > 0 && chapterComplete(stars, CHAPTERS[idx - 1].id);
}

/** Levels unlock in order; a chapter's skip test is always open once the chapter is.
 *  A level also stays open once it or any later level of its chapter is passed (e.g. after a tutorial was inserted before it). */
export function levelUnlocked(stars: Record<string, number>, level: AnyLevel, all = false): boolean {
  if (all) return true;
  if (!chapterUnlocked(stars, level.chapter)) return false;
  const ch = CHAPTERS.find((c) => c.id === level.chapter)!;
  const i = ch.levels.findIndex((l) => l.id === level.id);
  return i === 0 || level.skipTest === true || ch.levels.slice(i - 1).some((l) => passed(stars, l.id)) || chapterComplete(stars, level.chapter);
}

export function nextLevel(level: AnyLevel): AnyLevel | undefined {
  const flat = CHAPTERS.flatMap((c) => c.levels);
  const i = flat.findIndex((l) => l.id === level.id);
  return i < 0 ? undefined : flat[i + 1]; // custom levels have no next level
}
