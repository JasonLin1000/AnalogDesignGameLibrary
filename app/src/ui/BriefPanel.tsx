import { useEffect, useMemo, useState } from 'react';
import { sfx } from '../game/sfx';
import { useProgress } from '../game/progress';
import { circuitToSchematic } from '../levels/autoplace';
import { useSession } from '../game/session';
import { useT, type MessageKey } from '../i18n';
import { maxStars, type SpecResult } from '../levels/evaluate';
import type { Level, Spec } from '../levels/types';
import { useEditor } from '../schematic/store';
import { formatEng } from '../schematic/units';
import { toCircuit } from '../schematic/connectivity';
import { GuidePanel } from './GuidePanel';
import { Icon, Mentor } from './Icon';
import { IpStepper } from './IpStepper';

export function fmtValue(v: number, unit = '') {
  if (!Number.isFinite(v)) return '—';
  if (unit === 'dB') return `${v.toFixed(2)} dB`;
  if (unit === '°') return `${v.toFixed(1)}°`;
  return formatEng(v, unit, 4);
}

export function fmtTarget(s: Spec) {
  const u = s.unit ?? '';
  if (s.min !== undefined && s.max !== undefined) return `${fmtValue(s.min, u)} – ${fmtValue(s.max, u)}`;
  if (s.min !== undefined) return `≥ ${fmtValue(s.min, u)}`;
  if (s.max !== undefined) return `≤ ${fmtValue(s.max, u)}`;
  return '';
}

/** How comfortably a value meets a spec: > 0 inside (1 = a full target-width of room), < 0 outside. */
export function specMargin(spec: Spec, v: number): number | null {
  if (!Number.isFinite(v)) return null;
  const { min, max } = spec;
  if (min !== undefined && max !== undefined) {
    const half = (max - min) / 2 || 1;
    return v < min ? (v - min) / half : v > max ? (max - v) / half : Math.min(v - min, max - v) / half;
  }
  if (min !== undefined) return (v - min) / (Math.abs(min) || 1);
  if (max !== undefined) return (max - v) / (Math.abs(max) || 1);
  return null;
}

function SpecRow({ spec, r, stale, prev, flash }: { spec: Spec; r?: SpecResult; stale: boolean; prev?: number; flash?: boolean }) {
  const { t, L } = useT();
  const state = !r || stale ? 'pending' : r.pass ? 'pass' : 'fail';
  const m = r && !stale && !r.error ? specMargin(spec, r.value) : null;
  const pm = prev !== undefined ? specMargin(spec, prev) : null;
  const trend = m !== null && pm !== null && Math.abs(m - pm) > 1e-3 ? (m > pm ? 'up' : 'down') : null;
  const fill = m === null ? 0 : Math.max(-1, Math.min(1, m)); // -1..1, drawn around the centre line
  return (
    <li className={`spec ${state}${flash && state === 'pass' ? ' flash' : ''}`}>
      <span className="spec-icon" aria-hidden="true">{state === 'pass' ? <Icon name="check" size={14} /> : state === 'fail' ? <Icon name="close" size={14} /> : <span className="dot" />}</span>
      <span className="spec-label">{L(spec.label)}{spec.over === 'pvt' && <span className="tag">PVT</span>}{spec.over === 'mc' && <span className="tag">{spec.stat === 'abs3sigma' ? 'MC |μ|+3σ' : 'MC'}</span>}</span>
      <span className="spec-target">{fmtTarget(spec)}</span>
      {r && !stale && (
        <span className="spec-value">
          {r.error ? t(`merr.${r.error.code}` as MessageKey, r.error.vars) : fmtValue(r.value, spec.unit)}
          {r.worstLabel && r.values && r.values.length > 1 && <span className="worst"> {t('spec.worstAt', { label: r.worstLabel })}</span>}
          {trend && <span className={`trend ${trend}`} title={t(trend === 'up' ? 'spec.toward' : 'spec.away')} aria-label={t(trend === 'up' ? 'spec.toward' : 'spec.away')}>{trend === 'up' ? '▲' : '▼'}</span>}
        </span>
      )}
      {m !== null && (
        <span className="gauge" title={t('spec.margin', { pct: Math.round(m * 100) })} aria-hidden="true">
          <span className={`gauge-fill ${fill >= 0 ? 'in' : 'out'}`} style={fill >= 0 ? { left: '50%', width: `${fill * 50}%` } : { right: '50%', width: `${-fill * 50}%` }} />
        </span>
      )}
      <span className="sr-only">{state === 'pass' ? t('spec.pass') : state === 'fail' ? t('spec.fail') : t('spec.pending')}</span>
    </li>
  );
}

export function Stars({ n, max }: { n: number; max: number }) {
  return (
    <span className="stars" aria-label={`${n} / ${max} ★`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < n ? 'on' : 'off'}>★</span>)}
    </span>
  );
}

export function BriefPanel({ level, best, onIntro }: { level: Level; best: number; onIntro?: () => void }) {
  const { t, L } = useT();
  const s = useSession();
  const version = useEditor((e) => e.version);
  const [hintsShown, setHintsShown] = useState(0);
  const stale = s.simVersion !== version;
  const score = s.score;
  const sch = useEditor((e) => e.sch);
  const circuit = useMemo(() => (level.guide ? toCircuit(sch).circuit : null), [sch, level.guide]);
  // previous run's values, for the "closer / further than last time" arrows
  const hist = useMemo(() => ({ score: null as unknown, prev: {} as Record<string, number>, cur: {} as Record<string, number>, pass: {} as Record<string, boolean>, flipped: [] as string[], gen: 0 }), [level.id]);
  if (score && hist.score !== score) {
    const cur: Record<string, number> = {};
    level.specs.forEach((sp, i) => { const r = score.main[i]; if (r && !r.error) cur[sp.id] = r.value; });
    level.stars?.forEach((tier, k) => tier.forEach((sp, i) => { const r = score.bonus[k]?.[i]; if (r && !r.error) cur[sp.id] = r.value; }));
    // specs that just turned green flash and ring a rising scale
    const pass: Record<string, boolean> = {};
    level.specs.forEach((sp, i) => { pass[sp.id] = !!score.main[i]?.pass; });
    level.stars?.forEach((tier, k) => tier.forEach((sp, i) => { pass[sp.id] = !!score.bonus[k]?.[i]?.pass; }));
    hist.flipped = Object.keys(pass).filter((id) => pass[id] && !hist.pass[id]);
    hist.prev = hist.cur; hist.cur = cur; hist.score = score; hist.pass = pass; hist.gen++;
  }
  useEffect(() => { hist.flipped.forEach((_, k) => sfx.ding(k)); }, [score]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowKey = (id: string) => (hist.flipped.includes(id) ? `${id}-${hist.gen}` : id);
  const flash = (id: string) => !stale && hist.flipped.includes(id);
  return (
    <aside className="brief" aria-label={t('brief.title')}>
      <div className="brief-head">
        <span className="level-id">{level.id}</span>
        <h2>{L(level.title)}</h2>
        <Stars n={best} max={maxStars(level)} />
      </div>
      {level.part && <IpStepper levelId={level.id} part={level.part} onGo={(id) => { location.hash = `level/${id}`; }} />}
      {onIntro && <button className="intro-btn" onClick={onIntro}><Icon name="cards" size={15} /> {t('intro.open')}</button>}
      <div className="mentor">
        <span className="avatar"><Mentor size={36} /></span>
        <p>{L(level.story)}</p>
      </div>
      <h3>{t('brief.objective')}</h3>
      <p className="objective">{L(level.objective)}</p>
      {level.guide && (
        <GuidePanel levelId={level.id} steps={level.guide} ctx={{ kind: 'sch', sch, start: level.start, circuit, simulated: s.status === 'done' || s.status === 'error', passed: best > 0 || (score?.stars ?? 0) > 0 }} />
      )}

      <h3>{t('brief.specs')} <span className="muted">★</span></h3>
      <ul className="specs">
        {level.specs.map((sp, i) => <SpecRow key={rowKey(sp.id)} spec={sp} r={score?.main[i]} stale={stale} prev={hist.prev[sp.id]} flash={flash(sp.id)} />)}
      </ul>
      {level.stars?.map((tier, k) => (
        <div key={k}>
          <h3 className="bonus">{t('brief.bonus')} <span className="muted">{'★'.repeat(k + 2)}</span></h3>
          <ul className="specs">
            {tier.map((sp, i) => <SpecRow key={rowKey(sp.id)} spec={sp} r={score?.bonus[k]?.[i]} stale={stale} prev={hist.prev[sp.id]} flash={flash(sp.id)} />)}
          </ul>
        </div>
      ))}
      {stale && s.status === 'done' && <p className="note">{t('brief.stale')}</p>}

      <Diagnostics />

      <h3>{t('brief.hints')}</h3>
      <ol className="hints">
        {level.hints.slice(0, hintsShown).map((h, i) => <li key={i}>{L(h)}</li>)}
      </ol>
      {hintsShown < level.hints.length && (
        <button className="hint-btn" onClick={() => setHintsShown(hintsShown + 1)}>
          <Icon name="hint" size={15} /> {t('brief.showHint', { n: hintsShown + 1, total: level.hints.length })}
        </button>
      )}
      <TeacherTools level={level} />
    </aside>
  );
}

/** Teacher mode: load any reference solution onto the canvas (auto-placed, connected by labels). */
function TeacherTools({ level }: { level: Level }) {
  const { t } = useT();
  const unlockAll = useProgress((p) => p.unlockAll);
  const ed = useEditor();
  if (!unlockAll) return null;
  const sols = [...level.solutions].sort((a, b) => b.stars - a.stars);
  return (
    <details className="teacher">
      <summary>{t('teacher.title')}</summary>
      <p className="note">{t('teacher.help')}</p>
      {sols.map((s, i) => (
        <button key={i} onClick={() => ed.commit((doc) => { Object.assign(doc, circuitToSchematic(s.circuit, level.start)); })}>
          {t('teacher.load', { stars: '★'.repeat(s.stars) || '0★' })}
        </button>
      ))}
    </details>
  );
}

export function Diagnostics() {
  const { t } = useT();
  const s = useSession();
  const shown = s.diagnostics.filter((d) => d.level !== 'info' || s.status === 'error');
  if (!shown.length && !s.error) return null;
  return (
    <div className="diagnostics" role="status">
      {shown.map((d, i) => (
        <p key={i} className={`diag ${d.level}`}><Icon name={d.level === 'error' ? 'error' : d.level === 'warning' ? 'warning' : 'info'} size={14} /> {t(`diag.${d.code}` as MessageKey, d.vars)}</p>
      ))}
      {s.error && <p className="diag error"><Icon name="error" size={14} /> {t('diag.simFailed')}<br /><code>{s.error.split('\n').slice(0, 4).join('\n')}</code></p>}
    </div>
  );
}
