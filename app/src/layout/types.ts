// Layout data model. Coordinates are integers in nanometres (SKY130 manufacturing grid = 5 nm).
import type { Localized } from '../i18n';

export type LayerId = 'nwell' | 'diff' | 'tap' | 'poly' | 'licon' | 'li1' | 'mcon' | 'met1' | 'via' | 'met2';

export interface LayerDef {
  id: LayerId;
  name: string;          // short name shown in the layer panel
  title: Localized;
  color: string;         // CSS colour (both themes)
  pattern: 'solid' | 'hatch' | 'cross' | 'dots' | 'outline' | 'cut';
  conducts: boolean;     // can carry a net label
  cut?: boolean;         // contact / via layer
}

export const LAYERS: LayerDef[] = [
  { id: 'nwell', name: 'nwell', title: { 'zh-TW': 'N 型井', en: 'N-well' }, color: '#c9a227', pattern: 'dots', conducts: true },
  { id: 'diff', name: 'diff', title: { 'zh-TW': '主動區（擴散）', en: 'Active (diffusion)' }, color: '#2fb36b', pattern: 'hatch', conducts: true },
  { id: 'tap', name: 'tap', title: { 'zh-TW': '基體接點區', en: 'Tap (body contact)' }, color: '#5fd3c0', pattern: 'cross', conducts: true },
  { id: 'poly', name: 'poly', title: { 'zh-TW': '多晶矽（閘極）', en: 'Poly (gate)' }, color: '#e04646', pattern: 'hatch', conducts: true },
  { id: 'licon', name: 'licon', title: { 'zh-TW': '局部接觸窗', en: 'Local contact' }, color: '#f2f2f2', pattern: 'cut', conducts: false, cut: true },
  { id: 'li1', name: 'li1', title: { 'zh-TW': '局部互連', en: 'Local interconnect' }, color: '#b77ce0', pattern: 'hatch', conducts: true },
  { id: 'mcon', name: 'mcon', title: { 'zh-TW': '金屬接觸窗', en: 'Metal contact' }, color: '#d0d0d0', pattern: 'cut', conducts: false, cut: true },
  { id: 'met1', name: 'met1', title: { 'zh-TW': '金屬 1', en: 'Metal 1' }, color: '#3d8af7', pattern: 'hatch', conducts: true },
  { id: 'via', name: 'via', title: { 'zh-TW': '介層窗 1', en: 'Via 1' }, color: '#ffffff', pattern: 'cut', conducts: false, cut: true },
  { id: 'met2', name: 'met2', title: { 'zh-TW': '金屬 2', en: 'Metal 2' }, color: '#ec5fa6', pattern: 'cross', conducts: true },
];
export const LAYER: Record<LayerId, LayerDef> = Object.fromEntries(LAYERS.map((l) => [l.id, l])) as Record<LayerId, LayerDef>;

export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Shape extends Box { id: string; layer: LayerId; locked?: boolean }
export interface LLabel { id: string; layer: LayerId; text: string; x: number; y: number; locked?: boolean }

/** Parameterised cells, expanded into shapes for checking and extraction. */
export type PCellKind = 'nmos' | 'pmos' | 'ptap' | 'ntap';
export interface Instance {
  id: string;
  kind: PCellKind;
  name: string;
  x: number; y: number;        // lower-left origin
  params: { w: number; l: number; nf: number }; // nm; taps use w × l as their size
  locked?: boolean;
}

export interface Layout { shapes: Shape[]; labels: LLabel[]; instances: Instance[] }
export const emptyLayout = (): Layout => ({ shapes: [], labels: [], instances: [] });

export const um = (nm: number) => nm / 1000;
export const nm = (micron: number) => Math.round(micron * 1000 / 5) * 5;
