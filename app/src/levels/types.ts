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
  /** Which runs the spec is checked on (default: the nominal tt/27 °C run). */
  over?: 'nominal' | 'pvt' | 'mc';
  /** How runs are combined: every run must pass (worst), or a statistic of the values. */
  stat?: 'worst' | 'mean' | 'abs3sigma';
}

export interface Sweep {
  corners?: Corner[];   // PVT corners (tt is always included)
  temps?: number[];     // temperatures in °C (27 is always included)
  mc?: number;          // Monte Carlo runs (mismatch), at tt / 27 °C
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
  sweep?: Sweep;
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
  levels: AnyLevel[];
}

// ---------------- layout levels (Phase 3) ----------------
export interface LayoutSpec {
  id: string;
  label: Localized;
  kind: 'drc' | 'lvs' | 'area' | 'pins';
  max?: number;                        // area in µm²
  layer?: import('../layout/types').LayerId; // pins: required pin layer
}

export interface LayoutLevel {
  id: string;
  chapter: number;
  mode: 'layout';
  title: Localized;
  story: Localized;
  objective: Localized;
  concept: { title: Localized; body: Localized };
  hints: Localized[];
  reference: Circuit;                  // devices the layout must implement
  ports: string[];                     // nets that must carry a pin label
  checkBody?: boolean;                 // compare MOS body connections in LVS
  pcells: import('../layout/types').PCellKind[]; // PCells the player may place
  start: import('../layout/types').Layout;
  specs: LayoutSpec[];
  stars?: LayoutSpec[][];
  skipTest?: boolean;
  solutions: { layout: import('../layout/types').Layout; stars: number }[];
}

export type AnyLevel = Level | LayoutLevel;
export const isLayoutLevel = (l: AnyLevel): l is LayoutLevel => (l as LayoutLevel).mode === 'layout';
