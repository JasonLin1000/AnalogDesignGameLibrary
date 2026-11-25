import { useView } from '../game/settings';
import { useT, type MessageKey } from '../i18n';
import { useEditor } from '../schematic/store';
import { Icon } from './Icon';

function Btn({ label, keyHint, active, disabled, onClick, icon }: {
  label: string; keyHint?: string; active?: boolean; disabled?: boolean; onClick: () => void; icon: string;
}) {
  return (
    <button className={`tb${active ? ' active' : ''}`} onClick={onClick} disabled={disabled} title={keyHint ? `${label} (${keyHint})` : label} aria-label={label}>
      <span className="tb-icon" aria-hidden="true"><Icon name={icon} /></span>
      <span className="tb-label">{label}</span>
    </button>
  );
}

export function Toolbar({ onRun, running, progress }: { onRun: () => void; running: boolean; progress?: { done: number; total: number } }) {
  const { t } = useT();
  const ed = useEditor();
  const view = useView();
  const k = (key: MessageKey) => t(key);
  const hasSel = ed.selection.length > 0;
  return (
    <div className="toolbar" role="toolbar">
      <Btn icon="select" label={k('tool.select')} keyHint="Esc" active={ed.tool.kind === 'select'} onClick={() => ed.setTool({ kind: 'select' })} />
      <Btn icon="wire" label={k('tool.wire')} keyHint="W" active={ed.tool.kind === 'wire'} onClick={() => ed.setTool({ kind: 'wire' })} />
      <Btn icon="label" label={k('tool.label')} keyHint="L" active={ed.tool.kind === 'label'} onClick={() => ed.setAskLabel(true)} />
      <Btn icon="probe" label={k('tool.probe')} keyHint="P" active={ed.tool.kind === 'probe'} onClick={() => ed.setTool({ kind: 'probe' })} />
      <span className="tb-sep" />
      <Btn icon="rotate" label={k('tool.rotate')} keyHint="R" disabled={!hasSel && ed.tool.kind !== 'place'} onClick={ed.rotateSelection} />
      <Btn icon="mirror" label={k('tool.mirror')} keyHint="E" disabled={!hasSel && ed.tool.kind !== 'place'} onClick={ed.mirrorSelection} />
      <Btn icon="edit" label={k('tool.props')} keyHint="Q" disabled={!ed.selection.some((s) => ed.sch.parts.some((p) => p.id === s))}
        onClick={() => { const id = ed.selection.find((s) => ed.sch.parts.some((p) => p.id === s)); if (id) ed.setEditing(id); }} />
      <Btn icon="trash" label={k('tool.delete')} keyHint="Del" disabled={!hasSel} onClick={ed.deleteSelection} />
      <span className="tb-sep" />
      <Btn icon="undo" label={k('tool.undo')} keyHint="U / Ctrl+Z" disabled={!ed.past.length} onClick={ed.undo} />
      <Btn icon="redo" label={k('tool.redo')} keyHint="Shift+U / Ctrl+Y" disabled={!ed.future.length} onClick={ed.redo} />
      <span className="tb-sep" />
      <Btn icon="flow" label={k('tool.flow')} keyHint={k('tool.flowHint')} active={view.flow} onClick={() => view.setFlow(!view.flow)} />
      <Btn icon="live" label={k('tool.live')} keyHint={k('tool.liveHint')} active={view.live} onClick={() => view.setLive(!view.live)} />
      <span className="tb-grow" />
      <button className="run" onClick={onRun} disabled={running} title={`${t('tool.run')} (Ctrl+Enter)`}>
        {running ? (progress && progress.total > 1 ? t('run.progress', { done: progress.done, total: progress.total }) : t('run.running')) : <><Icon name="play" size={14} /> {t('tool.run')}</>}
      </button>
    </div>
  );
}

/** Virtuoso-style prompt line: tells the player what the current tool expects. */
export function StatusBar() {
  const { t } = useT();
  const { tool, cursor, view } = useEditor();
  const prompt =
    tool.kind === 'wire' ? (tool.from ? t('prompt.wireNext') : t('prompt.wireFirst'))
      : tool.kind === 'place' ? t('prompt.place')
        : tool.kind === 'label' ? t('prompt.label', { name: tool.name })
          : tool.kind === 'probe' ? t('prompt.probe')
            : t('prompt.select');
  return (
    <div className="statusbar">
      <span className="prompt">{prompt}</span>
      <span className="coords">{cursor ? `x ${cursor.x}  y ${cursor.y}` : ''} · {Math.round(view.zoom * 50)}%</span>
    </div>
  );
}
