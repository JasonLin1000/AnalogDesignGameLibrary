// PVT corner table and Monte Carlo histograms.
import { useSession } from '../game/session';
import { useT } from '../i18n';
import type { SpecResult } from '../levels/evaluate';
import { plotFor } from '../sim/measure';
import { fmtValue } from './BriefPanel';

function Histogram({ r }: { r: SpecResult }) {
  const { L } = useT();
  const vals = (r.values ?? []).map((v) => v.value).filter(Number.isFinite);
  if (vals.length < 2) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const bins = 16;
  const w = (hi - lo) / bins || 1;
  const counts = Array.from({ length: bins }, () => 0);
  for (const v of vals) counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++;
  const max = Math.max(...counts);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1));
  const u = r.spec.unit;
  return (
    <figure className="hist">
      <figcaption>
        <strong>{L(r.spec.label)}</strong> · n = {vals.length} · μ = {fmtValue(mean, u)} · σ = {fmtValue(sd, u)}
        {' · '}<span className={r.pass ? 'ok' : 'bad'}>|μ| + 3σ = {fmtValue(Math.abs(mean) + 3 * sd, u)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${bins * 20} 80`} preserveAspectRatio="none" role="img" aria-label={L(r.spec.label)}>
        {counts.map((c, i) => (
          <rect key={i} x={i * 20 + 1} y={80 - (c / max) * 76} width={18} height={(c / max) * 76} className="bar" />
        ))}
      </svg>
      <div className="hist-axis"><span>{fmtValue(lo, u)}</span><span>{fmtValue(hi, u)}</span></div>
    </figure>
  );
}

export function RunsPanel() {
  const { t, L } = useT();
  const s = useSession();
  const score = s.score;
  const specs = score ? [...score.main, ...score.bonus.flat()] : [];
  const pvt = specs.filter((r) => r.spec.over === 'pvt' && r.values);
  // one histogram per distinct measurement (several specs may grade the same quantity)
  const seen = new Set<string>();
  const mc = specs.filter((r) => {
    if (r.spec.over !== 'mc' || !r.values) return false;
    const k = JSON.stringify(r.spec.measure);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (s.outcomes.length <= 1) return <p className="empty">{t('runs.none')}</p>;

  // Sandbox (no level specs): show the operating-point voltage of every labelled net per run
  if (!score) {
    const nets = new Set<string>();
    for (const o of s.outcomes) { const op = o.result && plotFor(o.result, 'op'); op?.vectors.forEach((v) => { if (v.type === 'voltage' && !v.name.includes('#') && !v.name.includes('_')) nets.add(v.name); }); }
    const list = [...nets].slice(0, 8);
    return (
      <div className="runs">
        <table className="runs-table">
          <thead><tr><th>{t('runs.run')}</th>{list.map((n) => <th key={n}>V({n})</th>)}</tr></thead>
          <tbody>
            {s.outcomes.map((o, i) => {
              const op = o.result && plotFor(o.result, 'op');
              return <tr key={i}><td>{o.spec.label}</td>{list.map((n) => <td key={n}>{op ? fmtValue(op.byName.get(n)?.re[0] ?? NaN, 'V') : '⛔'}</td>)}</tr>;
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="runs">
      {pvt.length > 0 && (
        <table className="runs-table">
          <thead>
            <tr><th>{t('runs.corner')}</th>{pvt.map((r) => <th key={r.spec.id}>{L(r.spec.label)}</th>)}</tr>
          </thead>
          <tbody>
            {pvt[0].values!.map((_, i) => (
              <tr key={i}>
                <td>{pvt[0].values![i].label}</td>
                {pvt.map((r) => {
                  const v = r.values![i];
                  return <td key={r.spec.id} className={v.pass ? 'ok' : 'bad'}>{fmtValue(v.value, r.spec.unit)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {mc.map((r) => <Histogram key={r.spec.id} r={r} />)}
      {!pvt.length && !mc.length && <p className="empty">{t('runs.none')}</p>}
    </div>
  );
}
