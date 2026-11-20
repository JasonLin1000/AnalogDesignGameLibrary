import { useSession, type Probe } from '../game/session';
import { useT } from '../i18n';
import { nodeMag, nodePhaseDeg, nodeRe, toDb, xVector } from '../sim/measure';
import type { Plot as RawPlot } from '../sim/raw';
import { Plot, TRACE_COLORS, type Series } from './Plot';

const AX: Record<string, { x: string; logX: boolean }> = {
  ac: { x: 'Hz', logX: true }, tran: { x: 's', logX: false }, dc: { x: 'V', logX: false },
};

export function WaveformPanel() {
  const { t } = useT();
  const s = useSession();
  const res = s.result;
  if (!res) return <p className="empty">{t('wave.empty')}</p>;
  const kinds = [...new Set(res.analyses.map((a) => a.kind))].filter((k) => k !== 'op');
  if (!kinds.length) return <p className="empty">{t('wave.opOnly')}</p>;

  const groups: { key: string; kind: string; show: string; probes: (Probe & { idx: number })[]; plot: RawPlot }[] = [];
  for (const kind of kinds) {
    const i = res.analyses.findIndex((a) => a.kind === kind);
    const plot = res.plots[i];
    if (!plot) continue;
    const ps = s.probes.map((p, idx) => ({ ...p, idx })).filter((p) => p.analysis === kind);
    const shows = kind === 'ac' ? ['db', 'phase'] : ['v'];
    for (const show of shows) {
      const sub = ps.filter((p) => (p.show ?? (kind === 'ac' ? 'db' : 'v')) === show);
      if (sub.length || (show !== 'phase' && !ps.length)) groups.push({ key: `${kind}-${show}`, kind, show, probes: sub, plot });
    }
  }

  return (
    <div className="waves">
      <p className="wave-hint">{t('wave.hint')}</p>
      {groups.map((g) => {
        const series: Series[] = [];
        g.probes.forEach((p, k) => {
          try {
            const y = g.show === 'db' ? toDb(nodeMag(g.plot, p.node)) : g.show === 'phase' ? nodePhaseDeg(g.plot, p.node) : Array.from(nodeRe(g.plot, p.node));
            series.push({ name: p.node, y, color: TRACE_COLORS[k % TRACE_COLORS.length] });
          } catch { /* node not in this plot */ }
        });
        const unit = g.show === 'db' ? 'dB' : g.show === 'phase' ? '°' : 'V';
        return (
          <section key={g.key} className="wave-group">
            <header>
              <strong>{t(`analysis.${g.kind}` as 'analysis.ac')}{g.kind === 'ac' ? ` · ${g.show === 'db' ? t('wave.mag') : t('wave.phase')}` : ''}</strong>
              <span className="chips">
                {g.probes.map((p) => (
                  <button key={p.idx} className="chip" onClick={() => s.removeProbe(p.idx)} title={t('wave.remove')}>{p.node} ×</button>
                ))}
                {g.kind === 'ac' && g.show === 'db' && g.probes.map((p) => (
                  <button key={`ph${p.idx}`} className="chip ghost" onClick={() => s.addProbe({ analysis: 'ac', node: p.node, show: 'phase' })}>+ {t('wave.phase')} {p.node}</button>
                ))}
              </span>
            </header>
            {series.length ? (
              <Plot x={xVector(g.plot)} logX={AX[g.kind].logX} series={series} xUnit={AX[g.kind].x} yUnit={unit} />
            ) : <p className="empty">{t('wave.noTraces')}</p>}
          </section>
        );
      })}
    </div>
  );
}
