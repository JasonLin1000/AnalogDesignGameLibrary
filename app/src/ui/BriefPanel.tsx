import { useMemo, useState } from 'react';
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

function SpecRow({ spec, r, stale }: { spec: Spec; r?: SpecResult; stale: boolean }) {
  const { t, L } = useT();
  const state = !r || stale ? 'pending' : r.pass ? 'pass' : 'fail';
  return (
    <li className={`spec ${state}`}>
      <span className="spec-icon" aria-hidden="true">{state === 'pass' ? <Icon name="check" size={14} /> : state === 'fail' ? <Icon name="close" size={14} /> : <span className="dot" />}</span>
      <span className="spec-label">{L(spec.label)}{spec.over === 'pvt' && <span className="tag">PVT</span>}{spec.over === 'mc' && <span className="tag">{spec.stat === 'abs3sigma' ? 'MC |μ|+3σ' : 'MC'}</span>}</span>
      <span className="spec-target">{fmtTarget(spec)}</span>
      {r && !stale && (
        <span className="spec-value">
          {r.error ? t(`merr.${r.error.code}` as MessageKey, r.error.vars) : fmtValue(r.value, spec.unit)}
          {r.worstLabel && r.values && r.values.length > 1 && <span className="worst"> {t('spec.worstAt', { label: r.worstLabel })}</span>}
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
  return (
    <aside className="brief" aria-label={t('brief.title')}>
      <div className="brief-head">
        <span className="level-id">{level.id}</span>
        <h2>{L(level.title)}</h2>
        <Stars n={best} max={maxStars(level)} />
      </div>
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
        {level.specs.map((sp, i) => <SpecRow key={sp.id} spec={sp} r={score?.main[i]} stale={stale} />)}
      </ul>
      {level.stars?.map((tier, k) => (
        <div key={k}>
          <h3 className="bonus">{t('brief.bonus')} <span className="muted">{'★'.repeat(k + 2)}</span></h3>
          <ul className="specs">
            {tier.map((sp, i) => <SpecRow key={sp.id} spec={sp} r={score?.bonus[k]?.[i]} stale={stale} />)}
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
