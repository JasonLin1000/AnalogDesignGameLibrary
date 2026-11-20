import { ch0 } from './ch0';
import { ch1 } from './ch1';
import { ch2 } from './ch2';
import { ch3 } from './ch3';
import { ch4 } from './ch4';
import { ch5 } from './ch5';
import { ch6 } from './ch6';
import { ch7 } from './ch7';
import { isLayoutLevel, type AnyLevel, type Chapter, type Level, type LayoutLevel } from './types';

export const CHAPTERS: Chapter[] = [ch0, ch1, ch2, ch3, ch4, ch5, ch6, ch7];
export const EVERY_LEVEL: AnyLevel[] = CHAPTERS.flatMap((c) => c.levels);
/** Schematic / simulation levels. */
export const ALL_LEVELS: Level[] = EVERY_LEVEL.filter((l): l is Level => !isLayoutLevel(l));
export const LAYOUT_LEVELS: LayoutLevel[] = EVERY_LEVEL.filter(isLayoutLevel);
export const findLevel = (id: string): AnyLevel | undefined => EVERY_LEVEL.find((l) => l.id === id);
