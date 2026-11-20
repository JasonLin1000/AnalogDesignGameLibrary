import { useEffect, useMemo, useRef, useState } from 'react';
import { nextLevel, useProgress } from '../game/progress';
import { useT, type MessageKey } from '../i18n';
import { maxStars } from '../levels/evaluate';
import type { LayoutLevel, LayoutSpec } from '../levels/types';
import { extract } from '../layout/extract';
import { contains } from '../layout/geom';
import { LayerPanel } from '../layout/LayerPanel';
import { LayoutCanvas, type Heat, type Highlight } from '../layout/LayoutCanvas';
import { LayoutLabelPrompt, LayoutProps, PcellPrompt } from '../layout/LayoutDialogs';
import { checkLayout, checkLayoutFull, layoutArea, needsSim, type LayoutCheck, type LSpecResult } from '../layout/score';
import { simulate } from '../sim/client';
import { sfx } from '../game/sfx';
import { LdePane, PostPane, WaferMap } from './LayoutResults';
import { fmtValue } from './BriefPanel';
import { useLayout } from '../layout/store';
import { LAYERS, LAYER, type Layout } from '../layout/types';
import { Stars } from './BriefPanel';
import { StaticSchematic } from './StaticSchematic';
import { SuccessModal } from './SuccessModal';

const draftKey = (id: string) => `adg.layout.${id}`;
const loadDraft = (id: string): Layout | null => { try { const s = localStorage.getItem(draftKey(id)); return s ? JSON.parse(s) : null; } catch { return null; } };
const f3 = (nmv: number) => (nmv / 1000).toFixed(3);

function Btn({ icon, label, k, active, disabled, onClick }: { icon: string; label: string; k?: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={`tb${active ? ' active' : ''}`} onClick={onClick} disabled={disabled} title={k ? `${label} (${k})` : label} aria-label={label}>
      <span className="tb-icon" aria-hidden="true">{icon}</span><span className="tb-label">{label}</span>
    </button>
  );
}

export function LayoutWorkbench({ level, onExit, onGoto }: { level: LayoutLevel; onExit: () => void; onGoto: (id: string) => void }) {
  const { t, L } = useT();
  const st = useLayout();
  const progress = useProgress();
  const [check, setCheck] = useState<{ r: LayoutCheck; version: number } | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [tab, setTab] = useState<'ref' | 'drc' | 'lvs' | 'ex' | 'lde' | 'post' | 'yield'>('ref');
  const [running, setRunning] = useState(false);
  const [prog, setProg] = useState({ done: 0, total: 0 });
  const [showHeat, setShowHeat] = useState(true);
  const sim = needsSim(level);
  const hasYield = [...level.specs, ...(level.stars ?? []).flat()].some((s) => s.kind === 'yield');
  const [hl, setHl] = useState<Highlight | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const fitRef = useRef<() => void>(() => {});

  useEffect(() => {
    st.load(loadDraft(level.id) ?? level.start, { pcells: level.pcells });
    setCheck(null); setFocus(null); setHl(null); setSuccess(null); setHints(0); setTab('ref');
  }, [level.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setTimeout(() => { try { localStorage.setItem(draftKey(level.id), JSON.stringify(st.doc)); } catch { /* ignore */ } }, 300);
    return () => clearTimeout(id);
  }, [st.doc, level.id]);

  const stale = check ? check.version !== st.version : false;
  const runCheck = async () => {
    if (running) return;
    const version = st.version, doc = st.doc;
    const quick = checkLayout(level, doc);
    setCheck({ r: quick, version });
    setFocus(null);
    setTab(quick.violations.length ? 'drc' : !quick.lvs.ok ? 'lvs' : sim ? 'post' : level.lde ? 'lde' : 'lvs');
    let r = quick;
    if (sim && quick.lvs.ok) {
      setRunning(true); setProg({ done: 0, total: 0 });
      try {
        r = await checkLayoutFull(level, doc, simulate, (done, total) => setProg({ done, total }));
        setCheck({ r, version });
        if (hasYield && r.post) setTab('yield');
      } finally { setRunning(false); }
    }
    if (r.stars > 0) { progress.record(level.id, r.stars); setSuccess(r.stars); } else sfx.fail();
  };

  const ex = useMemo(() => (st.tool.kind === 'net' ? extract(st.doc) : null), [st.doc, st.tool.kind]);
  const pickNet = (p: { x: number; y: number }) => {
    if (!ex) return;
    for (const layer of [...LAYERS].reverse()) {
      if (st.hidden.includes(layer.id)) continue;
      for (const [net, shapes] of ex.netShapes) {
        if (shapes.some((s) => s.layer === layer.id && contains(s.box, p))) {
          const devs = ex.devices.filter((d) => d.g === net || d.sd.includes(net) || d.b === net).length;
          setHl({ boxes: shapes.map((s) => s.box), label: t('lay.netInfo', { net, n: shapes.length, d: devs }) });
          return;
        }
      }
    }
    setHl(null);
  };
  useEffect(() => { if (st.tool.kind !== 'net') setHl(null); }, [st.tool.kind]);

  const restart = () => {
    if (!confirm(t('wb.restartConfirm'))) return;
    try { localStorage.removeItem(draftKey(level.id)); } catch { /* ignore */ }
    st.load(level.start, { pcells: level.pcells });
    setCheck(null);
  };

  const tool = st.tool.kind;
  const prompt = tool === 'rect' ? (st.tool.kind === 'rect' && st.tool.from ? t('lay.p.rect2') : t('lay.p.rect1'))
    : tool === 'label' ? t('lay.p.label') : tool === 'pcell' ? t('lay.p.pcell') : tool === 'stack' ? t('lay.p.stack')
      : tool === 'ruler' ? t('lay.p.ruler') : tool === 'net' ? t('lay.p.net') : t('lay.p.select');
  const r = check?.r;
  const specRow = (s: LayoutSpec, res?: LSpecResult) => {
    const state = !res || stale ? 'pending' : res.pass ? 'pass' : 'fail';
    const val = res && !stale ? (s.kind === 'area' ? `${(res.value ?? 0).toFixed(2)} µm²` : s.kind === 'drc' ? t('lay.nViol', { n: res.value ?? 0 })
      : s.kind === 'mismatch' || s.kind === 'ldeAbs' ? (Number.isFinite(res.value) ? `${(res.value ?? 0).toFixed(3)} mV` : '')
      : s.kind === 'post' ? (res.value !== undefined ? `${fmtValue(res.value, s.unit)}${res.pre !== undefined ? ` (pre ${fmtValue(res.pre, s.unit)})` : ''}` : (running ? '…' : ''))
      : s.kind === 'yield' ? (Number.isFinite(res.value) ? `${((res.value ?? 0) * 100).toFixed(0)}%` : (running ? '…' : '')) : '') : '';
    return (
      <li key={s.id} className={`spec ${state}`}>
        <span className="spec-icon" aria-hidden="true">{state === 'pass' ? '✓' : state === 'fail' ? '✗' : '○'}</span>
        <span className="spec-label">{L(s.label)}</span><span className="spec-target" />
        {val && <span className="spec-value">{val}</span>}
      </li>
    );
  };
  const next = nextLevel(level);
  const heat: Heat | null = level.lde && showHeat && (level.lde.gx || level.lde.gy || (r && !stale))
    ? { gx: level.lde.gx ?? 0, gy: level.lde.gy ?? 0, tags: r && !stale ? r.ex.devices.map((d) => ({ x: (d.gate.x0 + d.gate.x1) / 2, y: (d.gate.y0 + d.gate.y1) / 2, text: `${((r.shifts[d.id]?.total ?? 0) * 1000).toFixed(2)} mV` })) : [] }
    : null;

  return (
    <div className="workbench">
      <div className="wb-top">
        <button className="link" onClick={onExit}>← {t('wb.back')}</button>
        <div className="toolbar" role="toolbar">
          <Btn icon="↖" label={t('tool.select')} k="Esc" active={tool === 'select'} onClick={() => st.set({ tool: { kind: 'select' } })} />
          <Btn icon="▭" label={t('lay.t.rect')} k="R" active={tool === 'rect'} onClick={() => st.set({ tool: { kind: 'rect' } })} />
          <Btn icon="🏷" label={t('tool.label')} k="L" active={tool === 'label'} onClick={() => st.set({ askLabel: true })} />
          {level.pcells.length > 0 && <Btn icon="⧉" label={t('lay.t.pcell')} k="I" active={tool === 'pcell'} onClick={() => st.set({ askPcell: level.pcells[0] })} />}
          {(['licon', 'mcon', 'via'] as const).map((s) => (
            <Btn key={s} icon="⊠" label={s} k="O" active={st.tool.kind === 'stack' && st.tool.stack === s} onClick={() => st.set({ tool: { kind: 'stack', stack: s } })} />
          ))}
          <span className="tb-sep" />
          <Btn icon="📏" label={t('lay.t.ruler')} k="K" active={tool === 'ruler'} onClick={() => st.set({ tool: { kind: 'ruler' } })} />
          <Btn icon="🔦" label={t('lay.t.net')} k="N" active={tool === 'net'} onClick={() => st.set({ tool: { kind: 'net' } })} />
          <Btn icon="✎" label={t('tool.props')} k="Q" disabled={!st.selection.length} onClick={() => st.set({ editing: st.selection[0] })} />
          <Btn icon="⧉" label={t('lay.t.copy')} k="C" disabled={!st.selection.length} onClick={st.duplicateSelection} />
          <Btn icon="🗑" label={t('tool.delete')} k="Del" disabled={!st.selection.length} onClick={st.deleteSelection} />
          <Btn icon="↶" label={t('tool.undo')} k="U" disabled={!st.past.length} onClick={st.undo} />
          <Btn icon="↷" label={t('tool.redo')} k="Shift+U" disabled={!st.future.length} onClick={st.redo} />
          <span className="tb-grow" />
          <button className="run" onClick={runCheck} disabled={running} title="DRC + LVS">{running ? t('post.running', { done: prog.done, total: prog.total }) : `✔ ${t(sim ? 'lay.checkPost' : 'lay.check')}`}</button>
        </div>
        <button className="link" onClick={restart}>{t('wb.restart')}</button>
      </div>
      <div className="wb-main">
        <aside className="brief" aria-label={t('brief.title')}>
          <div className="brief-head"><span className="level-id">{level.id}</span><h2>{L(level.title)}</h2><Stars n={progress.stars[level.id] ?? 0} max={maxStars(level)} /></div>
          <div className="mentor"><span className="avatar" aria-hidden="true">🤖</span><p>{L(level.story)}</p></div>
          <h3>{t('brief.objective')}</h3>
          <p className="objective">{L(level.objective)}</p>
          <h3>{t('brief.specs')} <span className="muted">★</span></h3>
          <ul className="specs">{level.specs.map((s, i) => specRow(s, r?.main[i]))}</ul>
          {level.stars?.map((tier, k) => (
            <div key={k}><h3 className="bonus">{t('brief.bonus')} <span className="muted">{'★'.repeat(k + 2)}</span></h3>
              <ul className="specs">{tier.map((s, i) => specRow(s, r?.bonus[k]?.[i]))}</ul></div>
          ))}
          <p className="note">{t('lay.areaNow', { a: layoutArea(st.doc).toFixed(2) })}</p>
          {stale && <p className="note">{t('brief.stale')}</p>}
          <h3>{t('brief.hints')}</h3>
          <ol className="hints">{level.hints.slice(0, hints).map((h, i) => <li key={i}>{L(h)}</li>)}</ol>
          {hints < level.hints.length && <button className="hint-btn" onClick={() => setHints(hints + 1)}>💡 {t('brief.showHint', { n: hints + 1, total: level.hints.length })}</button>}
          {progress.unlockAll && (
            <details className="teacher"><summary>{t('teacher.title')}</summary>
              {[...level.solutions].sort((a, b) => b.stars - a.stars).map((s, i) => (
                <button key={i} onClick={() => st.commit((d) => { Object.assign(d, structuredClone(s.layout)); })}>{t('teacher.load', { stars: '★'.repeat(s.stars) || '0★' })}</button>
              ))}
            </details>
          )}
        </aside>
        <div className="wb-center">
          <div className="canvas-wrap lay-wrap">
            <LayoutCanvas violations={r && !stale ? r.violations : []} focus={focus} highlight={hl} heat={heat} onNetPick={pickNet} onFit={(f) => { fitRef.current = f; }} />
          </div>
          <div className="statusbar">
            <span className="prompt">{prompt}</span>
            <span className="coords">
              <span style={{ color: LAYER[st.layer].color }}>■</span> {st.layer} · {st.cursor ? `x ${f3(st.cursor.x)}  y ${f3(st.cursor.y)} µm` : ''} · {Math.round(st.view.zoom)} px/µm
            </span>
          </div>
          <section className="bottom">
            <div className="tabs" role="tablist">
              {(['ref', 'drc', 'lvs', 'ex', ...(level.lde ? ['lde'] as const : []), ...(sim ? ['post'] as const : []), ...(hasYield ? ['yield'] as const : [])] as const).map((k) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
                  {t(`lay.tab.${k}` as MessageKey)}{k === 'drc' && r && !stale ? ` (${r.violations.length})` : ''}{k === 'lvs' && r && !stale ? (r.lvs.ok ? ' ✓' : ' ✗') : ''}
                </button>
              ))}
            </div>
            <div className="tab-body">
              {tab === 'ref' && (
                <div className="ref-pane">
                  <StaticSchematic circuit={level.reference} />
                  <p className="note">{t('lay.refHelp', { ports: level.ports.join(', ') })}{level.checkBody ? ' ' + t('lay.bodyHelp') : ''}</p>
                </div>
              )}
              {tab === 'drc' && (!r || stale ? <p className="empty">{t('lay.runFirst')}</p> : r.violations.length === 0 ? <p className="empty ok-msg">✓ {t('lay.drcClean')}</p> : (
                <ul className="drc-list">
                  {r.violations.map((v, i) => (
                    <li key={i}><button className={focus === i ? 'active' : ''} onClick={() => setFocus(i)}>
                      <code>{v.rule.id}</code> {L(v.rule.text)} <span className="muted">@ ({f3(v.box.x0)}, {f3(v.box.y0)})</span>
                    </button></li>
                  ))}
                </ul>
              ))}
              {tab === 'lvs' && (!r || stale ? <p className="empty">{t('lay.runFirst')}</p> : (
                <div className="lvs-pane">
                  <p className={r.lvs.ok ? 'ok-msg' : 'err'}>{r.lvs.ok ? `✓ ${t('lvs.ok')}` : `✗ ${t('lvs.fail')}`}</p>
                  <ul>{r.lvs.issues.map((x, i) => <li key={i} className={`diag ${x.level}`}>{x.level === 'error' ? '⛔' : '⚠️'} {t(`lvs.${x.code}` as MessageKey, x.vars)}</li>)}</ul>
                  {r.lvs.ok && <ul className="muted small">{Object.entries(r.lvs.deviceMap).map(([s, l]) => <li key={s}>{s} ↔ {l.join(' + ')}</li>)}</ul>}
                </div>
              ))}
              {tab === 'lde' && (!r || stale ? <p className="empty">{t('lay.runFirst')}</p> : (
                <div><label className="check small" style={{ padding: '6px 12px' }}><input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} /> {t('lde.showHeat')}</label><LdePane r={r} level={level} /></div>
              ))}
              {tab === 'post' && <PostPane r={r && !stale ? r : null} level={level} running={running} progress={prog} />}
              {tab === 'yield' && <WaferMap r={r && !stale ? r : null} />}
              {tab === 'ex' && (!r || stale ? <p className="empty">{t('lay.runFirst')}</p> : (
                <table className="runs-table">
                  <thead><tr><th>#</th><th>{t('lay.type')}</th><th>W (µm)</th><th>L (µm)</th><th>G</th><th>S/D</th><th>B</th></tr></thead>
                  <tbody>{r.ex.devices.map((d) => <tr key={d.id}><td>{d.id}</td><td>{d.type}</td><td>{f3(d.w)}</td><td>{f3(d.l)}</td><td>{d.g}</td><td>{d.sd.join(' / ')}</td><td>{d.b}</td></tr>)}</tbody>
                </table>
              ))}
            </div>
          </section>
        </div>
        <LayerPanel />
      </div>
      <LayoutProps />
      <LayoutLabelPrompt />
      <PcellPrompt />
      {success !== null && (
        <SuccessModal level={level} stars={success} hasNext={!!next} onStay={() => setSuccess(null)} onNext={() => { setSuccess(null); if (next) onGoto(next.id); }} />
      )}
    </div>
  );
}
