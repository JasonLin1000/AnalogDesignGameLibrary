// Level editor: draw the starting circuit, write the story, pick parts / analyses / specs, test, save, export.
import { useEffect, useState } from 'react';
import { useCustom } from '../game/custom';
import { useSession } from '../game/session';
import { useT, type Localized } from '../i18n';
import type { Level, PaletteItem, Spec } from '../levels/types';
import { PARTS } from '../schematic/parts';
import { SchematicCanvas } from '../schematic/SchematicCanvas';
import { useEditor } from '../schematic/store';
import type { PartKind } from '../schematic/types';
import { emptySchematic } from '../schematic/types';
import { parseSpice } from '../schematic/units';
import type { Measure } from '../sim/measure';
import { BottomPanel } from './BottomPanel';
import { LabelPrompt, PropertyDialog } from './Dialogs';
import { PartsPanel } from './PartsPanel';
import { SandboxPanel, defaultSetup, setupToAnalyses, setupToSweep, type SandboxSetup } from './SandboxPanel';
import { StatusBar, Toolbar } from './Toolbar';
import { Icon } from './Icon';

const KINDS: PartKind[] = ['R', 'C', 'L', 'V', 'I', 'D', 'LED', 'NMOS', 'PMOS', 'NFET', 'PFET', 'PNP', 'OPAMP'];
type MKind = 'op_v' | 'op_i' | 'ac_gain_db' | 'ac_f3db' | 'ac_ugb' | 'ac_pm' | 'tran_v' | 'tran_cross' | 'dc_v' | 'part_count';
const UNIT: Record<MKind, string> = { op_v: 'V', op_i: 'A', ac_gain_db: 'dB', ac_f3db: 'Hz', ac_ugb: 'Hz', ac_pm: '°', tran_v: 'V', tran_cross: 's', dc_v: 'V', part_count: '' };
interface ESpec { zh: string; en: string; kind: MKind; node: string; part: string; x: string; min: string; max: string; tier: 1 | 2 | 3 }
const blankSpec = (): ESpec => ({ zh: '', en: '', kind: 'op_v', node: 'out', part: 'V1', x: '', min: '', max: '', tier: 1 });

function toMeasure(s: ESpec): Measure {
  const x = parseSpice(s.x);
  switch (s.kind) {
    case 'op_v': return { kind: 'op_v', node: s.node };
    case 'op_i': return { kind: 'op_i', part: s.part };
    case 'ac_gain_db': return { kind: 'ac_gain_db', node: s.node, freq: x || 1e3 };
    case 'ac_f3db': return { kind: 'ac_f3db', node: s.node };
    case 'ac_ugb': return { kind: 'ac_ugb', node: s.node };
    case 'ac_pm': return { kind: 'ac_pm', node: s.node };
    case 'tran_v': return { kind: 'tran_v', node: s.node, t: x || 0 };
    case 'tran_cross': return { kind: 'tran_cross', node: s.node, level: x || 0.5 };
    case 'dc_v': return { kind: 'dc_v', node: s.node, at: x || 0 };
    case 'part_count': return { kind: 'part_count' };
  }
}
function fromMeasure(m: Measure): Partial<ESpec> {
  const a = m as Measure & { node?: string; part?: string; freq?: number; t?: number; level?: number; at?: number };
  return { kind: m.kind as MKind, node: a.node ?? 'out', part: a.part ?? 'V1', x: String(a.freq ?? a.t ?? a.level ?? a.at ?? '') };
}
const loc = (zh: string, en: string): Localized => ({ 'zh-TW': zh || en, en: en || zh });

export function LevelEditor({ editId, onPlay, onExit }: { editId?: string; onPlay: (id: string) => void; onExit: () => void }) {
  const { t, L } = useT();
  const ed = useEditor();
  const session = useSession();
  const custom = useCustom();
  const existing = custom.levels.find((l) => l.id === editId);
  const [meta, setMeta] = useState({ titleZh: '', titleEn: '', storyZh: '', storyEn: '', objZh: '', objEn: '', cTitleZh: '', cTitleEn: '', cBodyZh: '', cBodyEn: '', hintsZh: '', hintsEn: '' });
  const [palette, setPalette] = useState<Record<string, { on: boolean; max: string }>>(() => Object.fromEntries(KINDS.map((k) => [k, { on: k === 'R', max: '2' }])));
  const [setup, setSetup] = useState<SandboxSetup>(defaultSetup);
  const [specs, setSpecs] = useState<ESpec[]>([blankSpec()]);
  const [lockStart, setLockStart] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (existing) {
      setMeta({
        titleZh: existing.title['zh-TW'], titleEn: existing.title.en, storyZh: existing.story['zh-TW'], storyEn: existing.story.en,
        objZh: existing.objective['zh-TW'], objEn: existing.objective.en, cTitleZh: existing.concept.title['zh-TW'], cTitleEn: existing.concept.title.en,
        cBodyZh: existing.concept.body['zh-TW'], cBodyEn: existing.concept.body.en,
        hintsZh: existing.hints.map((h) => h['zh-TW']).join('\n'), hintsEn: existing.hints.map((h) => h.en).join('\n'),
      });
      setPalette(Object.fromEntries(KINDS.map((k) => { const p = existing.palette.find((q) => q.kind === k); return [k, { on: !!p, max: String(p?.max ?? 2) }]; })));
      const all = [...existing.specs.map((s) => [s, 1] as const), ...(existing.stars ?? []).flatMap((tier, i) => tier.map((s) => [s, (i + 2) as 2 | 3] as const))];
      setSpecs(all.map(([s, tier]) => ({ ...blankSpec(), ...fromMeasure(s.measure), zh: s.label['zh-TW'], en: s.label.en, min: s.min?.toString() ?? '', max: s.max?.toString() ?? '', tier })));
      ed.load({ ...existing.start, parts: existing.start.parts.map((p) => ({ ...p, locked: false })), wires: existing.start.wires.map((w) => ({ ...w, locked: false })), labels: existing.start.labels.map((l) => ({ ...l, locked: false })) }, null);
    } else ed.load(emptySchematic(), null);
    session.reset([]);
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const build = (): Level | null => {
    const analyses = setupToAnalyses(setup);
    const mk = (s: ESpec): Spec => ({
      id: `s${Math.random().toString(36).slice(2, 7)}`, label: loc(s.zh, s.en), measure: toMeasure(s), unit: UNIT[s.kind] || undefined,
      min: s.min.trim() ? Number(s.min) : undefined, max: s.max.trim() ? Number(s.max) : undefined,
    });
    const valid = specs.filter((s) => (s.zh || s.en) && (s.min.trim() || s.max.trim()));
    if (!meta.titleZh && !meta.titleEn) { setMsg(t('edit.needTitle')); return null; }
    if (!analyses.length) { setMsg(t('edit.needAnalysis')); return null; }
    if (!valid.some((s) => s.tier === 1)) { setMsg(t('edit.needSpec')); return null; }
    const lockAll = <T extends { locked?: boolean }>(x: T): T => ({ ...x, locked: lockStart || x.locked });
    const pal: PaletteItem[] = KINDS.filter((k) => palette[k].on).map((k) => ({ kind: k, max: Math.max(1, Number(palette[k].max) || 1) }));
    const tiers = [2, 3].map((n) => valid.filter((s) => s.tier === n).map(mk)).filter((x) => x.length);
    const lines = (zh: string, en: string) => { const a = zh.split('\n').filter(Boolean), b = en.split('\n').filter(Boolean); return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => loc(a[i] ?? '', b[i] ?? '')); };
    return {
      id: existing?.id ?? `c-${Date.now().toString(36)}`, chapter: -1,
      title: loc(meta.titleZh, meta.titleEn), story: loc(meta.storyZh, meta.storyEn), objective: loc(meta.objZh, meta.objEn),
      concept: { title: loc(meta.cTitleZh, meta.cTitleEn), body: loc(meta.cBodyZh, meta.cBodyEn) },
      hints: lines(meta.hintsZh, meta.hintsEn), palette: pal,
      start: { parts: ed.sch.parts.map(lockAll), wires: ed.sch.wires.map(lockAll), labels: ed.sch.labels.map(lockAll) },
      analyses, sweep: setupToSweep(setup), corner: setup.corner,
      specs: valid.filter((s) => s.tier === 1).map(mk), stars: tiers.length ? tiers : undefined, solutions: [],
    };
  };
  const saveLevel = () => { const l = build(); if (!l) return null; custom.upsert(l); setMsg(t('edit.saved')); return l; };
  const tryRun = () => void session.start({ sch: ed.sch, version: ed.version, level: null, analyses: setupToAnalyses(setup), corner: setup.corner, sweep: setupToSweep(setup) });
  const field = (k: keyof typeof meta, label: string, area = false) => (
    <label className="field"><span>{label}</span>{area
      ? <textarea rows={2} value={meta[k]} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} />
      : <input value={meta[k]} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} />}</label>
  );
  const upd = (i: number, p: Partial<ESpec>) => setSpecs(specs.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <div className="workbench">
      <div className="wb-top">
        <button className="link" onClick={onExit}>← {t('wb.back')}</button>
        <Toolbar onRun={tryRun} running={session.status === 'running'} progress={session.progress} />
        <button onClick={saveLevel}><Icon name="save" /> {t('edit.save')}</button>
        <button className="primary" onClick={() => { const l = saveLevel(); if (l) onPlay(l.id); }}><Icon name="play" size={14} /> {t('edit.play')}</button>
      </div>
      <div className="wb-main">
        <aside className="brief editor-form" aria-label={t('edit.title')}>
          <div className="brief-head"><h2>{t('edit.title')}</h2></div>
          <p className="note">{t('edit.intro')}</p>
          {msg && <p className="ok-msg">{msg}</p>}
          <h3>{t('edit.text')}</h3>
          <div className="grid2">{field('titleZh', '標題（中文）')}{field('titleEn', 'Title (English)')}</div>
          <div className="grid2">{field('storyZh', '導師的話', true)}{field('storyEn', 'Mentor story', true)}</div>
          <div className="grid2">{field('objZh', '任務', true)}{field('objEn', 'Mission', true)}</div>
          <div className="grid2">{field('cTitleZh', '圖鑑標題')}{field('cTitleEn', 'Codex title')}</div>
          <div className="grid2">{field('cBodyZh', '圖鑑內容', true)}{field('cBodyEn', 'Codex text', true)}</div>
          <div className="grid2">{field('hintsZh', '提示（每行一則）', true)}{field('hintsEn', 'Hints (one per line)', true)}</div>

          <h3>{t('edit.palette')}</h3>
          <div className="pal-grid">
            {KINDS.map((k) => (
              <label key={k} className="check small">
                <input type="checkbox" checked={palette[k].on} onChange={(e) => setPalette({ ...palette, [k]: { ...palette[k], on: e.target.checked } })} />
                {L(PARTS[k].title)}
                {palette[k].on && <input className="tiny" value={palette[k].max} onChange={(e) => setPalette({ ...palette, [k]: { ...palette[k], max: e.target.value } })} aria-label="max" />}
              </label>
            ))}
          </div>
          <label className="check small"><input type="checkbox" checked={lockStart} onChange={(e) => setLockStart(e.target.checked)} /> {t('edit.lock')}</label>

          <h3>{t('edit.specs')}</h3>
          {specs.map((s, i) => (
            <div key={i} className="spec-edit">
              <div className="grid2">
                <input placeholder="規格名稱" value={s.zh} onChange={(e) => upd(i, { zh: e.target.value })} />
                <input placeholder="Spec label" value={s.en} onChange={(e) => upd(i, { en: e.target.value })} />
              </div>
              <div className="spec-row-edit">
                <select value={s.kind} onChange={(e) => upd(i, { kind: e.target.value as MKind })}>
                  {(Object.keys(UNIT) as MKind[]).map((k) => <option key={k} value={k}>{t(`edit.m.${k}` as 'edit.m.op_v')}</option>)}
                </select>
                {s.kind === 'op_i' ? <input placeholder={t('edit.part')} value={s.part} onChange={(e) => upd(i, { part: e.target.value })} />
                  : s.kind !== 'part_count' && <input placeholder={t('edit.node')} value={s.node} onChange={(e) => upd(i, { node: e.target.value })} />}
                {['ac_gain_db', 'tran_v', 'tran_cross', 'dc_v'].includes(s.kind) && <input placeholder={t(`edit.x.${s.kind}` as 'edit.x.tran_v')} value={s.x} onChange={(e) => upd(i, { x: e.target.value })} />}
              </div>
              <div className="spec-row-edit">
                <input placeholder="min" value={s.min} onChange={(e) => upd(i, { min: e.target.value })} />
                <input placeholder="max" value={s.max} onChange={(e) => upd(i, { max: e.target.value })} />
                <span className="muted small">{UNIT[s.kind]}</span>
                <select value={s.tier} onChange={(e) => upd(i, { tier: Number(e.target.value) as 1 | 2 | 3 })}>
                  <option value={1}>★</option><option value={2}>★★</option><option value={3}>★★★</option>
                </select>
                <button className="link" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} aria-label={t('tool.delete')}>✕</button>
              </div>
            </div>
          ))}
          <button onClick={() => setSpecs([...specs, blankSpec()])}>+ {t('edit.addSpec')}</button>
          <p className="note">{t('edit.specHelp')}</p>
          <SandboxPanel setup={setup} onChange={setSetup} />
        </aside>
        <div className="wb-center">
          <div className="canvas-wrap"><SchematicCanvas onRun={tryRun} /></div>
          <StatusBar />
          <BottomPanel />
        </div>
        <PartsPanel />
      </div>
      <PropertyDialog />
      <LabelPrompt />
    </div>
  );
}
