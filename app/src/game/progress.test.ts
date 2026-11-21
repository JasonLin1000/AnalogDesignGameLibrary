import { describe, expect, it } from 'vitest';
import { findLevel } from '../levels';
import { chapterComplete, chapterUnlocked, levelUnlocked } from './progress';

describe('unlocking around the inserted tool tutorials', () => {
  it('a fresh player starts at 0-0 and must pass it before 0-1', () => {
    expect(levelUnlocked({}, findLevel('0-0')!)).toBe(true);
    expect(levelUnlocked({}, findLevel('0-1')!)).toBe(false);
    expect(levelUnlocked({ '0-0': 1 }, findLevel('0-1')!)).toBe(true);
  });

  it('existing progress (made before 0-0 / 7-0 existed) keeps its levels and chapters open', () => {
    const old = { '0-1': 2, '0-2': 2, '7-1': 1 };
    expect(levelUnlocked(old, findLevel('0-1')!)).toBe(true);
    expect(levelUnlocked(old, findLevel('0-2')!)).toBe(true);
    expect(levelUnlocked(old, findLevel('0-3')!)).toBe(true);
    expect(chapterComplete({ '0-1': 2, '0-2': 2, '0-3': 2 }, 0)).toBe(true); // tutorial is optional
    expect(chapterUnlocked({ '0-1': 2, '0-2': 2, '0-3': 2 }, 1)).toBe(true);
    expect(levelUnlocked({ ...old, '6-1': 1, '6-2': 1 }, findLevel('7-1')!, false)).toBe(true);
  });
});
