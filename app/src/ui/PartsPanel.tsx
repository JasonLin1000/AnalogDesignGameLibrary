import { useT } from '../i18n';
import type { PaletteItem } from '../levels/types';
import { PARTS } from '../schematic/parts';
import { PartIcon } from '../schematic/PartSymbol';
import { makePlaceTool, useEditor } from '../schematic/store';
import type { PartKind } from '../schematic/types';

const SANDBOX: PartKind[] = ['R', 'C', 'L', 'V', 'I', 'D', 'LED', 'NMOS', 'PMOS', 'NFET', 'PFET'];

export function PartsPanel() {
  const { t, L } = useT();
  const ed = useEditor();
  const items: PaletteItem[] = ed.palette ?? SANDBOX.map((kind) => ({ kind }));
  const all: PaletteItem[] = [...items, { kind: 'GND' }];
  return (
    <aside className="parts-panel" aria-label={t('parts.title')}>
      <h3>{t('parts.title')}</h3>
      <div className="parts-list">
        {all.map((it) => {
          const left = ed.remaining(it.kind);
          const active = ed.tool.kind === 'place' && ed.tool.partKind === it.kind;
          return (
            <button key={it.kind} className={`part-btn${active ? ' active' : ''}`} disabled={left <= 0}
              onClick={() => ed.setTool(makePlaceTool(it.kind, it))}>
              <PartIcon kind={it.kind} />
              <span className="part-btn-name">{L(PARTS[it.kind].title)}</span>
              {Number.isFinite(left) && <span className="part-btn-left">×{left}</span>}
            </button>
          );
        })}
        <button className={`part-btn${ed.tool.kind === 'label' ? ' active' : ''}`} onClick={() => ed.setAskLabel(true)}>
          <span className="part-icon label-icon" aria-hidden="true">abc</span>
          <span className="part-btn-name">{t('parts.label')}</span>
        </button>
      </div>
      <details className="keys">
        <summary>{t('keys.title')}</summary>
        <dl>
          <dt>W</dt><dd>{t('tool.wire')}</dd>
          <dt>L</dt><dd>{t('tool.label')}</dd>
          <dt>R / E</dt><dd>{t('tool.rotate')} / {t('tool.mirror')}</dd>
          <dt>Q</dt><dd>{t('tool.props')}</dd>
          <dt>P</dt><dd>{t('tool.probe')}</dd>
          <dt>Del</dt><dd>{t('tool.delete')}</dd>
          <dt>U</dt><dd>{t('tool.undo')}</dd>
          <dt>F</dt><dd>{t('keys.fit')}</dd>
          <dt>Esc</dt><dd>{t('keys.cancel')}</dd>
          <dt>{t('keys.wheel')}</dt><dd>{t('keys.zoom')}</dd>
          <dt>{t('keys.middle')}</dt><dd>{t('keys.pan')}</dd>
          <dt>Ctrl+Enter</dt><dd>{t('tool.run')}</dd>
        </dl>
      </details>
    </aside>
  );
}
