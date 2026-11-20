import { useEffect, useRef, useState } from 'react';
import { nextLevel, useProgress } from '../game/progress';
import { useSession } from '../game/session';
import { useT } from '../i18n';
import { sfx } from '../game/sfx';
import type { Level } from '../levels/types';
import { SchematicCanvas } from '../schematic/SchematicCanvas';
import { useEditor } from '../schematic/store';
import type { Schematic } from '../schematic/types';
import { emptySchematic } from '../schematic/types';
import { BottomPanel } from './BottomPanel';
import { BriefPanel } from './BriefPanel';
import { LabelPrompt, PropertyDialog } from './Dialogs';
import { PartsPanel } from './PartsPanel';
import { SandboxPanel, defaultSetup, setupToAnalyses, setupToSweep, type SandboxSetup } from './SandboxPanel';
import { SuccessModal } from './SuccessModal';
import { StatusBar, Toolbar } from './Toolbar';

const draftKey = (id: string) => `adg.draft.${id}`;
function loadDraft(id: string): Schematic | null {
  try { const s = localStorage.getItem(draftKey(id)); return s ? JSON.parse(s) : null; } catch { return null; }
}

export function Workbench({ level, onExit, onGoto }: { level: Level | null; onExit: () => void; onGoto: (id: string) => void }) {
  const { t } = useT();
  const ed = useEditor();
  const session = useSession();
  const progress = useProgress();
  const [setup, setSetup] = useState<SandboxSetup>(defaultSetup);
  const [success, setSuccess] = useState<number | null>(null);
  const docKey = level ? level.id : 'sandbox';
  const lastRun = useRef(-1);

  // load document
  useEffect(() => {
    const draft = loadDraft(docKey);
    ed.load(draft ?? (level ? level.start : emptySchematic()), level ? level.palette : null);
    session.reset((level?.plots ?? []).map((p) => ({ analysis: p.analysis, node: p.node, show: p.show })));
    setSuccess(null);
  }, [docKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // autosave drafts (per-viewer convenience)
  useEffect(() => {
    const id = setTimeout(() => { try { localStorage.setItem(draftKey(docKey), JSON.stringify(ed.sch)); } catch { /* ignore */ } }, 300);
    return () => clearTimeout(id);
  }, [ed.sch, docKey]);

  const run = async () => {
    if (session.status === 'running') return;
    const analyses = level ? level.analyses : setupToAnalyses(setup);
    if (!analyses.length) return;
    lastRun.current = ed.version;
    await session.start({ sch: ed.sch, version: ed.version, level, analyses, corner: level?.corner ?? setup.corner, sweep: level ? undefined : setupToSweep(setup) });
    const s = useSession.getState();
    if (!level && s.status === 'done' && !s.probes.length) {
      // sandbox: probe every labelled net by default
      const kind = analyses.find((a) => a.kind !== 'op' && a.kind !== 'noise')?.kind;
      if (kind) for (const l of ed.sch.labels) s.addProbe({ analysis: kind, node: l.name.toLowerCase(), show: kind === 'ac' ? 'db' : 'v' });
    }
    if (level && s.status === 'done' && s.score && s.score.stars === 0) sfx.fail();
    if (level && s.score && s.score.stars > 0) {
      progress.record(level.id, s.score.stars);
      setSuccess(s.score.stars);
    }
  };

  const restart = () => {
    if (!confirm(t('wb.restartConfirm'))) return;
    try { localStorage.removeItem(draftKey(docKey)); } catch { /* ignore */ }
    ed.load(level ? level.start : emptySchematic(), level ? level.palette : null);
    session.reset((level?.plots ?? []).map((p) => ({ ...p })));
  };

  const next = level ? nextLevel(level) : undefined;

  return (
    <div className="workbench">
      <div className="wb-top">
        <button className="link" onClick={onExit}>← {t('wb.back')}</button>
        <Toolbar onRun={run} running={session.status === 'running'} progress={session.progress} />
        <button className="link" onClick={restart}>{t('wb.restart')}</button>
      </div>
      <div className="wb-main">
        {level ? <BriefPanel level={level} best={progress.stars[level.id] ?? 0} /> : <SandboxPanel setup={setup} onChange={setSetup} />}
        <div className="wb-center">
          <div className="canvas-wrap"><SchematicCanvas onRun={run} /></div>
          <StatusBar />
          <BottomPanel />
        </div>
        <PartsPanel />
      </div>
      <PropertyDialog />
      <LabelPrompt />
      {level && success !== null && (
        <SuccessModal level={level} stars={success} hasNext={!!next}
          onStay={() => setSuccess(null)} onNext={() => { setSuccess(null); if (next) onGoto(next.id); }} />
      )}
    </div>
  );
}
