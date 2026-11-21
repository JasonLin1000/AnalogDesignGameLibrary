// Phase 4 result panes: LDE table, pre vs post comparison, Monte Carlo wafer map.
import { useT } from '../i18n';
import type { LayoutLevel } from '../levels/types';
import { deviceShift } from '../layout/lde';
import type { LayoutCheck, LSpecResult } from '../layout/score';
import { fmtValue } from './BriefPanel';

export function LdePane({ r, level }: { r: LayoutCheck; level: LayoutLevel }) {
  const { t } = useT();
  const mv = (v: number) => `${(v * 1000).toFixed(3)} mV`;
  const groups = Object.entries(r.lvs.deviceMap);
  return (
    <div className="lde-pane">
      <p className="note">{t('lde.model', { gx: level.lde?.gx ?? 0, gy: level.lde?.gy ?? 0, wpe: level.lde?.wpe ? t('lde.on') : t('lde.off') })}</p>
      <table className="runs-table">
        <thead><tr><th>#</th><th>{t('lay.type')}</th><th>{t('lde.pos')}</th><th>{t('lde.grad')}</th><th>WPE</th><th>{t('lde.total')}</th></tr></thead>
        <tbody>{r.ex.devices.map((d) => {
          const s = r.shifts[d.id];
          return <tr key={d.id}><td>{d.id}</td><td>{d.type}</td><td>({((d.gate.x0 + d.gate.x1) / 2000).toFixed(2)}, {((d.gate.y0 + d.gate.y1) / 2000).toFixed(2)})</td>
            <td>{mv(s?.gradient ?? 0)}</td><td>{mv(s?.wpe ?? 0)}</td><td>{mv(s?.total ?? 0)}</td></tr>;
        })}</tbody>
      </table>
      {r.lvs.ok && groups.length > 0 && (
        <>
          <h4>{t('lde.perDevice')}</h4>
          <ul className="small">{groups.map(([name, ids]) => <li key={name}><code>{name}</code> = {ids.join(' + ')} → {mv(deviceShift(ids, r.ex.devices, r.shifts))}</li>)}</ul>
        </>
      )}
    </div>
  );
}

export function PostPane({ r, level, running, progress }: { r: LayoutCheck | null; level: LayoutLevel; running: boolean; progress: { done: number; total: number } }) {
  const { t, L } = useT();
  if (running) return <p className="empty">{t('post.running', { done: progress.done, total: progress.total })}</p>;
  if (!r) return <p className="empty">{t('lay.runFirst')}</p>;
  if (!r.lvs.ok) return <p className="empty err">{t('post.needLvs')}</p>;
  if (!r.post) return <p className="empty">{t('lay.runFirst')}</p>;
  const posts = [...r.main, ...r.bonus.flat()].filter((x) => x.spec.kind === 'post');
  const seen = new Set<string>();
  const rows = posts.filter((x) => { const k = JSON.stringify(x.spec.measure); if (seen.has(k)) return false; seen.add(k); return true; });
  const top = Object.entries(r.post.pex.stats.totalC).filter(([n]) => n !== '?').sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="post-pane">
      {r.post.error && <p className="err">{r.post.error}</p>}
      <table className="runs-table">
        <thead><tr><th>{t('post.measure')}</th><th>Pre-sim</th><th>Post-sim</th><th>Δ</th></tr></thead>
        <tbody>{rows.map((x: LSpecResult) => {
          const d = x.pre && x.value !== undefined ? ((x.value - x.pre) / Math.abs(x.pre)) * 100 : NaN;
          return <tr key={x.spec.id}><td>{L(x.spec.label)}</td><td>{fmtValue(x.pre ?? NaN, x.spec.unit)}</td>
            <td className={x.pass ? 'ok' : 'bad'}>{fmtValue(x.value ?? NaN, x.spec.unit)}</td><td>{Number.isFinite(d) ? `${d >= 0 ? '+' : ''}${d.toFixed(2)}%` : '—'}</td></tr>;
        })}</tbody>
      </table>
      <p className="note">{t('post.pex', { nodes: r.post.pex.stats.nodes, r: r.post.pex.stats.resistors, c: r.post.pex.stats.capacitors })}</p>
      <ul className="small">{top.map(([n, c]) => <li key={n}><code>{n}</code>: {c.toFixed(2)} fF</li>)}</ul>
      {level.bench && <p className="note">{t('post.bench')}</p>}
    </div>
  );
}

/** Monte Carlo dies laid out on a round wafer: green = in spec, red = out of spec. */
export function WaferMap({ r }: { r: LayoutCheck | null }) {
  const { t, L } = useT();
  const y = r && [...r.main, ...r.bonus.flat()].find((x) => x.spec.kind === 'yield');
  if (!r || !y || !y.values) return <p className="empty">{t('lay.runFirst')}</p>;
  const vals = y.values;
  const s = y.spec;
  // place dies on a square grid clipped to a circle, filling from the centre outwards
  const cells: { x: number; y: number }[] = [];
  const n = Math.ceil(Math.sqrt(vals.length * 1.4)) + 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = i - (n - 1) / 2, cy = j - (n - 1) / 2;
    if (Math.hypot(cx, cy) <= n / 2 - 0.3) cells.push({ x: cx, y: cy });
  }
  cells.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  const dies = cells.slice(0, vals.length);
  const R = n / 2 + 0.4, size = 260;
  const pass = (v: number) => Number.isFinite(v) && (s.min === undefined || v >= s.min) && (s.max === undefined || v <= s.max);
  const good = vals.filter(pass).length;
  return (
    <div className="wafer">
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} width={size} height={size} role="img" aria-label={t('yield.wafer')}>
        <circle cx={0} cy={0} r={R} className="wafer-disc" />
        <path d={`M${-0.8},${R - 0.05} L${0.8},${R - 0.05}`} className="wafer-flat" />
        {dies.map((c, i) => (
          <rect key={i} x={c.x - 0.45} y={c.y - 0.45} width={0.9} height={0.9} rx={0.08} className={`die ${pass(vals[i]) ? 'good' : 'bad'}`} style={{ animationDelay: `${i * 40}ms` }}>
            <title>{`#${i + 1}: ${fmtValue(vals[i], s.unit)}`}</title>
          </rect>
        ))}
      </svg>
      <div className="wafer-info">
        <div className={`yield-big ${y.pass ? 'ok' : 'bad'}`}>{((good / vals.length) * 100).toFixed(0)}%</div>
        <p>{t('yield.summary', { good, n: vals.length })}</p>
        <p className="note">{L(s.label)} · {fmtValue(s.min ?? NaN, s.unit)} – {fmtValue(s.max ?? NaN, s.unit)}</p>
        <p className="note">{t('yield.help')}</p>
      </div>
    </div>
  );
}
