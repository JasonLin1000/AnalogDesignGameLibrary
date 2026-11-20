import type { Localized } from '../i18n';
import type { Measure } from '../sim/measure';
import type { Analysis, Circuit, Corner, PartKind, Schematic } from '../schematic/types';

export interface PaletteItem {
  kind: PartKind;
  max?: number;                       // how many the player may place
  params?: Record<string, string>;    // initial parameter values
  lockedParams?: string[];            // parameters the player cannot change
}

export interface Spec {
  id: string;
  label: Localized;
  measure: Measure;
  min?: number;
  max?: number;
  unit?: string;     // display unit (A, V, Hz, dB, s, F, ...)
}

export interface PlotRequest {
  analysis: Analysis['kind'];
  node: string;
  show?: 'v' | 'db' | 'phase';
}

export interface Level {
  id: string;
  chapter: number;
  title: Localized;
  story: Localized;           // short narrative from the mentor
  objective: Localized;       // what to build
  concept: { title: Localized; body: Localized }; // codex card unlocked on success
  hints: Localized[];
  palette: PaletteItem[];
  start: Schematic;
  analyses: Analysis[];
  corner?: Corner;
  specs: Spec[];              // all must pass for ★
  stars?: Spec[][];           // extra specs for ★★, ★★★
  plots?: PlotRequest[];
  skipTest?: boolean;         // passing it completes the chapter
  /** Reference solutions, verified by the test suite. `stars` = stars it must earn. */
  solutions: { circuit: Circuit; stars: number }[];
}

export interface Chapter {
  id: number;
  title: Localized;
  intro: Localized;
  levels: Level[];
}
