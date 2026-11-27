// Achievement wall, play statistics and per-level design records.
import { ACHIEVEMENTS, ACHV_XP, liveStreak, useAchv } from '../game/achievements';
import { METRICS, useRecords, type Metric } from '../game/records';
import { useT, type MessageKey } from '../i18n';
import { EVERY_LEVEL } from '../levels';
import { formatEng } from '../schematic/units';
import { Icon } from './Icon';

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export function fmtMetric(m: Metric, v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return '—';
  return m === 'power' ? formatEng(v, 'W') : m === 'time' ? fmtTime(v) : String(Math.round(v));
}
export const METRIC_ICON: Record<Metric, string> = { parts: 'chip', power: 'bolt', time: 'clock', sims: 'live' };

export function AchievementsPage() {
  const { t, L } = useT();
  const { unlocked, stats } = useAchv();
  const best = useRecords((r) => r.best);
  const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const levels = EVERY_LEVEL.filter((l) => best[l.id]);
  return (
    <main className="home achv-page">
      <section className="hero">
        <h1>{t('achv.title')}</h1>
        <p>{t('achv.intro', { xp: ACHV_XP })}</p>
      </section>
      <section className="stat-row" aria-label={t('achv.stats')}>
        <div className="stat"><Icon name="trophy" size={20} /><b>{got} / {ACHIEVEMENTS.length}</b><span>{t('achv.count')}</span></div>
        <div className="stat"><Icon name="flame" size={20} /><b>{liveStreak(stats)}</b><span>{t('achv.streak', { best: stats.bestStreak })}</span></div>
        <div className="stat"><Icon name="bolt" size={20} /><b>{stats.sims}</b><span>{t('achv.sims')}</span></div>
        <div className="stat"><Icon name="smoke" size={20} /><b>{stats.burns}</b><span>{t('achv.burns')}</span></div>
      </section>
      <ul className="achv-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = !!unlocked[a.id];
          const hide = !on && a.secret;
          return (
            <li key={a.id} className={`achv ${on ? 'on' : 'off'}`}>
              <span className="achv-icon"><Icon name={hide ? 'lock' : a.icon} size={22} /></span>
              <span className="achv-text">
                <strong>{hide ? '???' : L(a.title)}</strong>
                <span>{hide ? t('achv.secret') : L(a.desc)}</span>
                {on && <span className="achv-date">{new Date(unlocked[a.id]).toLocaleDateString()}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <section className="chapter">
        <header><h2>{t('rec2.title')}</h2></header>
        {levels.length === 0 ? <p className="note">{t('rec2.empty')}</p> : (
          <div className="table-scroll">
            <table className="runs-table rec-table">
              <thead><tr><th>{t('rec2.level')}</th>{METRICS.map((m) => <th key={m}>{t(`metric.${m}` as MessageKey)}</th>)}</tr></thead>
              <tbody>{levels.map((l) => (
                <tr key={l.id}><td><span className="level-id">{l.id}</span> {L(l.title)}</td>
                  {METRICS.map((m) => <td key={m} className="num">{fmtMetric(m, best[l.id][m])}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
