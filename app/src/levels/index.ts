import { ch0 } from './ch0';
import { ch1 } from './ch1';
import { ch2 } from './ch2';
import { ch3 } from './ch3';
import { ch4 } from './ch4';
import { ch5 } from './ch5';
import { ch6 } from './ch6';
import type { Chapter, Level } from './types';

export const CHAPTERS: Chapter[] = [ch0, ch1, ch2, ch3, ch4, ch5, ch6];
export const ALL_LEVELS: Level[] = CHAPTERS.flatMap((c) => c.levels);
export const findLevel = (id: string) => ALL_LEVELS.find((l) => l.id === id);
