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

describe('IP part-steps', () => {
  it('old progress that finished chapter 5 keeps it complete without the new part levels', () => {
    expect(chapterComplete({ '5-1': 2, '5-2': 1 }, 5)).toBe(true);
    expect(levelUnlocked({ '4-3': 1, '5-1': 1 }, findLevel('5-1')!)).toBe(true);
  });
  it('a new player walks the parts in order', () => {
    const s = { '4-1': 1, '4-2': 1, '4-3': 1 };
    expect(levelUnlocked(s, findLevel('5-1a')!)).toBe(true);
    expect(levelUnlocked(s, findLevel('5-1b')!)).toBe(false);
    expect(levelUnlocked({ ...s, '5-1a': 1 }, findLevel('5-1b')!)).toBe(true);
  });
});
