import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { PARTS } from '../schematic/parts';
import { useEditor } from '../schematic/store';
import { parseSpice } from '../schematic/units';

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function PropertyDialog() {
  const { t, L } = useT();
  const ed = useEditor();
  const part = ed.sch.parts.find((p) => p.id === ed.editing);
  const [name, setName] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (part) { setName(part.name); setVals({ ...part.params }); setTimeout(() => first.current?.select(), 0); }
  }, [ed.editing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!part) return null;
  const def = PARTS[part.kind];
  const close = () => ed.setEditing(null);
  const bad = def.params.filter((p) => !p.text && vals[p.key] !== undefined && vals[p.key] !== '' && Number.isNaN(parseSpice(vals[p.key])));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bad.length) return;
    ed.updatePart(part.id, name, vals);
    close();
  };
  return (
    <Modal title={`${L(def.title)} · ${part.name}`} onClose={close}>
      <form onSubmit={submit} className="props">
        {part.locked && <p className="note">{t('props.locked')}</p>}
        <label>
          <span>{t('props.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={part.locked} ref={def.params.length ? undefined : first} />
        </label>
        {def.params.map((p, i) => {
          const locked = part.locked || part.lockedParams?.includes(p.key);
          return (
            <label key={p.key}>
              <span>{L(p.label)}{p.unit ? ` (${p.unit})` : ''}</span>
              <input ref={i === 0 ? first : undefined} value={vals[p.key] ?? ''} disabled={locked}
                placeholder={p.text ? 'PULSE(0 1 0 1n 1n 1m 2m)' : p.default}
                onChange={(e) => setVals({ ...vals, [p.key]: e.target.value })}
                aria-invalid={bad.includes(p)} />
              {!p.text && !locked && vals[p.key] && !Number.isNaN(parseSpice(vals[p.key])) && (
                <small className="parsed">= {parseSpice(vals[p.key]).toPrecision(4)}</small>
              )}
            </label>
          );
        })}
        {bad.length > 0 && <p className="err">{t('props.badNumber')}</p>}
        <p className="note">{t('props.suffixHelp')}</p>
        <div className="actions">
          <button type="button" onClick={close}>{t('common.cancel')}</button>
          {!part.locked && <button type="submit" className="primary">{t('common.ok')}</button>}
        </div>
      </form>
    </Modal>
  );
}

export function LabelPrompt() {
  const { t } = useT();
  const ed = useEditor();
  const [name, setName] = useState('');
  if (!ed.askLabel) return null;
  const close = () => ed.setAskLabel(false);
  return (
    <Modal title={t('label.title')} onClose={close}>
      <form className="props" onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        ed.setTool({ kind: 'label', name: n });
        close();
      }}>
        <label>
          <span>{t('label.name')}</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="out" />
        </label>
        <p className="note">{t('label.help')}</p>
        <div className="actions">
          <button type="button" onClick={close}>{t('common.cancel')}</button>
          <button type="submit" className="primary">{t('common.ok')}</button>
        </div>
      </form>
    </Modal>
  );
}

export { Modal };
