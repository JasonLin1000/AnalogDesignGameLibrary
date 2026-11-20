import { useState } from 'react';
import { useSession, type Probe } from '../game/session';
import { useT } from '../i18n';
import { nodeMag, nodePhaseDeg, nodeRe, plotFor, toDb, xVector, type SimResult } from '../sim/measure';
import type { Plot as RawPlot } from '../sim/raw';
import { Plot, TRACE_COLORS, type Series } from './Plot';

function xAxis(kind: string, p: RawPlot): { x: string; logX: boolean } {
  if (kind === 'ac' || kind === 'noise') return { x: 'Hz', logX: true };
  if (kind === 'tran') return { x: 's', logX: false };
  const name = p.vectors[0].name;
  return { x: name.startsWith('temp') ? '°C' : name.startsWith('i') ? 'A' : 'V', logX: false };
}

function trace(p: RawPlot, node: string, show: string): number[] {
  return show === 'db' ? toDb(nodeMag(p, node)) : show === 'phase' ? nodePhaseDeg(p, node) : Array.from(nodeRe(p, node));
}

export function WaveformPanel() {
  const { t } = useT();
  const s = useSession();
  const [overlay, setOverlay] = useState(true);
  const res = s.result;
  if (!res) return <p className="empty">{t('wave.empty')}</p>;
  const kinds = [...new Set(res.analyses.map((a) => a.kind))].filter((k) => k !== 'op');
  if (!kinds.length) return <p className="empty">{t('wave.opOnly')}</p>;
  const others: { label: string; res: SimResult }[] = s.outcomes.slice(1).filter((o) => o.result).map((o) => ({ label: o.spec.label, res: o.result! }));

  const groups: { key: string; kind: string; show: string; probes: (Probe & { idx: number })[]; plot: RawPlot }[] = [];
  for (const kind of kinds) {
    const plot = plotFor(res, kind);
    if (!plot) continue;
    if (kind === 'noise') { groups.push({ key: 'noise', kind, show: 'noise', probes: [], plot }); continue; }
    const ps = s.probes.map((p, idx) => ({ ...p, idx })).filter((p) => p.analysis === kind);
    const shows = kind === 'ac' ? ['db', 'phase'] : ['v'];
    for (const show of shows) {
      const sub = ps.filter((p) => (p.show ?? (kind === 'ac' ? 'db' : 'v')) === show);
      if (sub.length || (show !== 'phase' && !ps.length)) groups.push({ key: `${kind}-${show}`, kind, show, probes: sub, plot });
    }
  }

  return (
    <div className="waves">
      <div className="wave-bar">
        <p className="wave-hint">{t('wave.hint')}</p>
        {others.length > 0 && (
          <label className="check small"><input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} /> {t('wave.overlay', { n: others.length })}</label>
        )}
      </div>
      {groups.map((g) => {
        const series: Series[] = [];
        const ax = xAxis(g.kind, g.plot);
        if (g.kind === 'noise') {
          const add = (name: string, label: string, color: string) => {
            const v = g.plot.byName.get(name);
            if (v) series.push({ name: label, y: Array.from(v.re), color });
          };
          add('onoise_spectrum', t('wave.noiseOut'), TRACE_COLORS[0]);
          add('inoise_spectrum', t('wave.noiseIn'), TRACE_COLORS[1]);
          return (
            <section key={g.key} className="wave-group">
              <header><strong>{t('analysis.noise')}</strong></header>
              <Plot x={xVector(g.plot)} logX logY series={series} xUnit="Hz" yUnit="V/√Hz" />
            </section>
          );
        }
        g.probes.forEach((p, k) => {
          const color = TRACE_COLORS[k % TRACE_COLORS.length];
          if (overlay) {
            for (const o of others) {
              const op = plotFor(o.res, g.kind as 'ac');
              if (!op || op.points !== g.plot.points) continue;
              try { series.push({ name: `${p.node} · ${o.label}`, y: trace(op, p.node, g.show), color, faint: true }); } catch { /* missing */ }
            }
          }
          try { series.push({ name: p.node, y: trace(g.plot, p.node, g.show), color }); } catch { /* node not in this plot */ }
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
              <Plot x={xVector(g.plot)} logX={ax.logX} series={series} xUnit={ax.x} yUnit={unit} />
            ) : <p className="empty">{t('wave.noTraces')}</p>}
          </section>
        );
      })}
    </div>
  );
}
