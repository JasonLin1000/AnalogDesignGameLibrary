// Layer selection window (LSW): pick the drawing layer, toggle visibility, see that layer's rules.
import { useT } from '../i18n';
import { RULES, type Rule } from './drc';
import { useLayout } from './store';
import { LAYERS, LAYER, type LayerId } from './types';

const LAYER_RULES: Record<LayerId, Rule[]> = {
  nwell: [RULES.nwellW, RULES.nwellS, RULES.pdiffEnc, RULES.ndiffNw],
  diff: [RULES.diffW, RULES.diffS, RULES.sdExt, RULES.straddle],
  tap: [RULES.tapW, RULES.tapS],
  poly: [RULES.polyW, RULES.polyS, RULES.endcap, RULES.polyDiffS],
  licon: [RULES.liconSize, RULES.liconS, RULES.liconDiff, RULES.liconPoly, RULES.liconGate],
  li1: [RULES.liW, RULES.liS, RULES.liconLi],
  mcon: [RULES.mconSize, RULES.mconS, RULES.mconLi, RULES.mconM1],
  met1: [RULES.m1W, RULES.m1S],
  via: [RULES.viaSize, RULES.viaS, RULES.viaM1, RULES.viaM2],
  met2: [RULES.m2W, RULES.m2S],
};

export function Swatch({ id, size = 22 }: { id: LayerId; size?: number }) {
  const l = LAYER[id];
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
      <defs>
        <pattern id={`sw-${id}`} width="5" height="5" patternUnits="userSpaceOnUse">
          {l.pattern === 'hatch' && <path d="M0,5 L5,0" stroke={l.color} strokeWidth="1.2" />}
          {l.pattern === 'cross' && <path d="M0,5 L5,0 M0,0 L5,5" stroke={l.color} strokeWidth="1" />}
          {l.pattern === 'dots' && <circle cx="2.5" cy="2.5" r="0.9" fill={l.color} />}
        </pattern>
      </defs>
      <rect x="2" y="2" width="18" height="18" fill={l.cut ? '#111' : `url(#sw-${id})`} stroke={l.color} strokeWidth="1.5" strokeDasharray={l.pattern === 'dots' ? '3 2' : undefined} />
      {l.cut && <path d="M2,2 L20,20 M2,20 L20,2" stroke={l.color} strokeWidth="1.2" />}
    </svg>
  );
}

export function LayerPanel() {
  const { t, L } = useT();
  const st = useLayout();
  const toggle = (id: LayerId) => st.set({ hidden: st.hidden.includes(id) ? st.hidden.filter((h) => h !== id) : [...st.hidden, id] });
  return (
    <aside className="parts-panel lsw" aria-label={t('lay.layers')}>
      <h3>{t('lay.layers')}</h3>
      <ul className="layer-list">
        {LAYERS.map((l, i) => (
          <li key={l.id} className={st.layer === l.id ? 'active' : ''}>
            <button className="layer-pick" onClick={() => st.set({ layer: l.id })} title={L(l.title)}>
              <Swatch id={l.id} />
              <span className="layer-name">{l.name}</span>
              <kbd>{(i + 1) % 10}</kbd>
            </button>
            <input type="checkbox" checked={!st.hidden.includes(l.id)} onChange={() => toggle(l.id)} aria-label={t('lay.visible', { layer: l.name })} />
          </li>
        ))}
      </ul>
      <div className="rule-card">
        <strong>{L(LAYER[st.layer].title)}</strong>
        <ul>{LAYER_RULES[st.layer].map((r) => <li key={r.id}><code>{r.id}</code> {L(r.text)}</li>)}</ul>
      </div>
      <label className="field">
        <span>{t('lay.snap')}</span>
        <select value={st.snap} onChange={(e) => st.set({ snap: Number(e.target.value) })}>
          <option value={5}>0.005 µm</option><option value={10}>0.01 µm</option><option value={50}>0.05 µm</option><option value={100}>0.1 µm</option>
        </select>
      </label>
    </aside>
  );
}
