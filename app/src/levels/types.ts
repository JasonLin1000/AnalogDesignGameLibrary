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

/** A tool-tutorial checklist step; `key` names a predicate in game/guide.ts. */
export interface GuideStep { key: string; text: Localized }

/** A step of a large IP taught in parts; the last step (step === of) assembles the whole block. */
export interface IpPart { ip: Localized; step: number; of: number }

export interface Level {
  id: string;
  chapter: number;
  title: Localized;
  story: Localized;           // short narrative from the mentor
  objective: Localized;       // what to build
  concept: { title: Localized; body: Localized }; // codex card unlocked on success
  hints: Localized[];
  guide?: GuideStep[];        // tool-tutorial checklist
  part?: IpPart;              // step of a multi-part IP track
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
  kind: 'drc' | 'lvs' | 'area' | 'pins' | 'mismatch' | 'ldeAbs' | 'pinRegion' | 'post' | 'yield';
  max?: number;                        // area µm², mismatch / ldeAbs mV, post measure upper bound
  min?: number;                        // post / yield measure lower bound
  unit?: string;
  layer?: import('../layout/types').LayerId; // pins: required pin layer
  devices?: string[];                  // mismatch: [a, b]; ldeAbs: devices to check
  pin?: string;                        // pinRegion: label text
  region?: { x0?: number; x1?: number; y0?: number; y1?: number }; // pinRegion, µm
  measure?: Measure;                   // post / yield
  runs?: number;                       // yield: Monte Carlo runs
  minYield?: number;                   // yield: required fraction of passing runs
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
  guide?: GuideStep[];
  part?: IpPart;
  reference: Circuit;                  // devices the layout must implement
  ports: string[];                     // nets that must carry a pin label
  checkBody?: boolean;                 // compare MOS body connections in LVS
  pcells: import('../layout/types').PCellKind[]; // PCells the player may place
  start: import('../layout/types').Layout;
  specs: LayoutSpec[];
  stars?: LayoutSpec[][];
  skipTest?: boolean;
  /** Post-layout simulation test bench (sources, loads) connected to the pin labels by name. */
  bench?: { parts: import('../schematic/types').LogicalPart[]; analyses: Analysis[] };
  lde?: import('../layout/lde').LdeModel;
  solutions: { layout: import('../layout/types').Layout; stars: number }[];
}

export type AnyLevel = Level | LayoutLevel;
export const isLayoutLevel = (l: AnyLevel): l is LayoutLevel => (l as LayoutLevel).mode === 'layout';
