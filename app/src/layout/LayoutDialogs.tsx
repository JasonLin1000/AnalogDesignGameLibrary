import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { Modal } from '../ui/Dialogs';
import { useLayout } from './store';
import { LAYERS, nm, um, type LayerId, type PCellKind } from './types';

const num = (s: string) => { const v = Number(s); return Number.isFinite(v) ? v : NaN; };

/** Edit a rectangle (coordinates in µm), an instance (W/L/nf) or a label. */
export function LayoutProps() {
  const { t } = useT();
  const st = useLayout();
  const id = st.editing;
  const shape = st.doc.shapes.find((s) => s.id === id);
  const inst = st.doc.instances.find((s) => s.id === id);
  const label = st.doc.labels.find((s) => s.id === id);
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    if (shape) setV({ layer: shape.layer, x0: String(um(shape.x0)), y0: String(um(shape.y0)), x1: String(um(shape.x1)), y1: String(um(shape.y1)) });
    if (inst) setV({ name: inst.name, w: String(um(inst.params.w)), l: String(um(inst.params.l)), nf: String(inst.params.nf) });
    if (label) setV({ text: label.text, layer: label.layer });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!id || (!shape && !inst && !label)) return null;
  const close = () => st.set({ editing: null });
  const locked = shape?.locked || inst?.locked || label?.locked;
  const field = (k: string, lab: string) => (
    <label key={k}><span>{lab}</span><input value={v[k] ?? ''} disabled={locked} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return close();
    st.commit((d) => {
      if (shape) {
        const s = d.shapes.find((q) => q.id === id)!;
        const [x0, y0, x1, y1] = ['x0', 'y0', 'x1', 'y1'].map((k) => nm(num(v[k])));
        if ([x0, y0, x1, y1].every(Number.isFinite)) Object.assign(s, { x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1) });
        s.layer = v.layer as LayerId;
      }
      if (inst) {
        const s = d.instances.find((q) => q.id === id)!;
        s.name = v.name || s.name;
        const w = nm(num(v.w)), l = nm(num(v.l)), nf = Math.max(1, Math.round(num(v.nf)));
        if (w > 0 && l > 0 && nf > 0) s.params = { w, l, nf };
      }
      if (label) { const s = d.labels.find((q) => q.id === id)!; s.text = v.text || s.text; s.layer = v.layer as LayerId; }
    });
    close();
  };
  return (
    <Modal title={shape ? t('lay.rect') : inst ? `${inst.kind.toUpperCase()} · ${inst.name}` : t('lay.labelTitle')} onClose={close}>
      <form className="props" onSubmit={submit}>
        {locked && <p className="note">{t('props.locked')}</p>}
        {(shape || label) && (
          <label><span>{t('lay.layer')}</span>
            <select value={v.layer} disabled={locked} onChange={(e) => setV({ ...v, layer: e.target.value })}>
              {LAYERS.filter((l) => !label || l.conducts).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        )}
        {shape && <div className="grid2">{field('x0', 'x0 (µm)')}{field('y0', 'y0 (µm)')}{field('x1', 'x1 (µm)')}{field('y1', 'y1 (µm)')}</div>}
        {shape && <p className="note">{t('lay.size', { w: (num(v.x1) - num(v.x0)).toFixed(3), h: (num(v.y1) - num(v.y0)).toFixed(3) })}</p>}
        {inst && <>{field('name', t('props.name'))}{inst.kind.endsWith('tap')
          ? <div className="grid2">{field('w', t('lay.tapW'))}{field('l', t('lay.tapH'))}</div>
          : <div className="grid2">{field('w', 'W (µm)')}{field('l', 'L (µm)')}{field('nf', t('lay.nf'))}</div>}</>}
        {label && field('text', t('label.name'))}
        <div className="actions">
          <button type="button" onClick={close}>{t('common.cancel')}</button>
          {!locked && <button type="submit" className="primary">{t('common.ok')}</button>}
        </div>
      </form>
    </Modal>
  );
}

export function LayoutLabelPrompt() {
  const { t } = useT();
  const st = useLayout();
  const [text, setText] = useState('');
  useEffect(() => { if (st.askLabel) setText(''); }, [st.askLabel]); // fresh name every time
  if (!st.askLabel) return null;
  const close = () => { setText(''); st.set({ askLabel: false }); };
  return (
    <Modal title={t('lay.labelTitle')} onClose={close}>
      <form className="props" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { st.set({ tool: { kind: 'label', text: text.trim() }, askLabel: false }); setText(''); } }}>
        <label><span>{t('label.name')}</span><input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="out" /></label>
        <p className="note">{t('lay.labelHelp', { layer: st.layer })}</p>
        <div className="actions"><button type="button" onClick={close}>{t('common.cancel')}</button><button type="submit" className="primary">{t('common.ok')}</button></div>
      </form>
    </Modal>
  );
}

const DEFAULTS: Record<PCellKind, { w: number; l: number; nf: number }> = {
  nmos: { w: 1000, l: 150, nf: 1 }, pmos: { w: 2000, l: 150, nf: 1 }, ptap: { w: 600, l: 400, nf: 1 }, ntap: { w: 600, l: 400, nf: 1 },
};

export function PcellPrompt() {
  const { t } = useT();
  const st = useLayout();
  const [kind, setKind] = useState<PCellKind>('nmos');
  const [v, setV] = useState({ w: '1', l: '0.15', nf: '1' });
  useEffect(() => {
    if (!st.askPcell) return;
    setKind(st.askPcell);
    const d = DEFAULTS[st.askPcell];
    setV({ w: String(um(d.w)), l: String(um(d.l)), nf: String(d.nf) });
  }, [st.askPcell]);
  if (!st.askPcell) return null;
  const close = () => st.set({ askPcell: null });
  const tap = kind.endsWith('tap');
  return (
    <Modal title={t('lay.pcell')} onClose={close}>
      <form className="props" onSubmit={(e) => {
        e.preventDefault();
        const params = { w: nm(num(v.w)), l: nm(num(v.l)), nf: Math.max(1, Math.round(num(v.nf)) || 1) };
        if (!(params.w > 0 && params.l > 0)) return;
        st.set({ tool: { kind: 'pcell', cell: kind, params }, askPcell: null });
      }}>
        <label><span>{t('lay.cellType')}</span>
          <select value={kind} onChange={(e) => { const k = e.target.value as PCellKind; setKind(k); const d = DEFAULTS[k]; setV({ w: String(um(d.w)), l: String(um(d.l)), nf: String(d.nf) }); }}>
            {st.allowed.pcells.map((k) => <option key={k} value={k}>{t(`lay.cell.${k}` as 'lay.cell.nmos')}</option>)}
          </select>
        </label>
        <div className="grid2">
          <label><span>{tap ? t('lay.tapW') : 'W (µm)'}</span><input autoFocus value={v.w} onChange={(e) => setV({ ...v, w: e.target.value })} /></label>
          <label><span>{tap ? t('lay.tapH') : 'L (µm)'}</span><input value={v.l} onChange={(e) => setV({ ...v, l: e.target.value })} /></label>
          {!tap && <label><span>{t('lay.nf')}</span><input value={v.nf} onChange={(e) => setV({ ...v, nf: e.target.value })} /></label>}
        </div>
        <p className="note">{t('lay.pcellHelp')}</p>
        <div className="actions"><button type="button" onClick={close}>{t('common.cancel')}</button><button type="submit" className="primary">{t('lay.place')}</button></div>
      </form>
    </Modal>
  );
}
