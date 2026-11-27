// Experience and rank: stars (10 XP each), concept checks answered right on the first try (5 XP each)
// and achievements (15 XP each).
import { create } from 'zustand';
import type { Localized } from '../i18n';
import { L } from '../levels/build';

const KEY = 'adg.quiz.v1';
const load = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; } };

/** Quiz answers keyed `${levelId}:${slide}`; the first answer counts. */
export const useQuiz = create<{ answers: Record<string, boolean>; answer: (key: string, correct: boolean) => void }>((set, get) => ({
  answers: load(),
  answer: (key, correct) => {
    if (key in get().answers) return;
    const answers = { ...get().answers, [key]: correct };
    set({ answers });
    try { localStorage.setItem(KEY, JSON.stringify(answers)); } catch { /* ignore */ }
  },
}));

export const RANKS: { xp: number; title: Localized }[] = [
  { xp: 0, title: L('實習生', 'Intern') },
  { xp: 50, title: L('助理工程師', 'Junior engineer') },
  { xp: 180, title: L('類比工程師', 'Analog engineer') },
  { xp: 380, title: L('資深工程師', 'Senior engineer') },
  { xp: 600, title: L('首席工程師', 'Principal engineer') },
];

export function experience(stars: Record<string, number>, answers: Record<string, boolean>, achievements = 0) {
  const xp = Object.values(stars).reduce((s, n) => s + n * 10, 0) + Object.values(answers).filter(Boolean).length * 5 + achievements * 15;
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1];
  const progress = next ? (xp - RANKS[i].xp) / (next.xp - RANKS[i].xp) : 1;
  return { xp, rank: RANKS[i], level: i, next, progress };
}
