import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../game/session';
import { useT } from '../i18n';
import { mosRegion, partCurrent, plotFor } from '../sim/measure';
import { analyze, key } from './connectivity';
import { hitTest, itemsInBox, partBox, schematicBox, type Box } from './geometry';
import { PARTS, isMos, pinPositions } from './parts';
import { G, PartSymbol } from './PartSymbol';
import { lRoute, moveItems, useEditor } from './store';
import type { Pt, Schematic } from './types';
import { formatEng } from './units';

type Drag =
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { mode: 'move'; start: Pt; delta: Pt }
  | { mode: 'band'; start: Pt; end: Pt };

export function SchematicCanvas({ onRun }: { onRun: () => void }) {
  const { t } = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const ed = useEditor();
  const { sch, view, tool, selection, cursor } = ed;
  const session = useSession();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoverNet, setHoverNet] = useState<string | null>(null);
  const sel = useMemo(() => new Set(selection), [selection]);

  // While dragging, show the moved result live
  const shown: Schematic = useMemo(() => {
    if (drag?.mode !== 'move' || (!drag.delta.x && !drag.delta.y)) return sch;
    const c = structuredClone(sch);
    moveItems(c, sel, drag.delta.x, drag.delta.y);
    return c;
  }, [sch, drag, sel]);

  const conn = useMemo(() => analyze(shown), [shown]);
  const fresh = session.status === 'done' && session.simVersion === ed.version && session.result;
  const opPlot = fresh ? plotFor(session.result!, 'op') : null;

  // ---------- coordinates ----------
  const toWorld = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / (view.zoom * G), y: (e.clientY - r.top - view.y) / (view.zoom * G) };
  };
  const snap = (p: Pt): Pt => ({ x: Math.round(p.x), y: Math.round(p.y) });

  const fit = () => {
    const svg = svgRef.current;
    const b = schematicBox(useEditor.getState().sch);
    if (!svg || !b) return;
    const r = svg.getBoundingClientRect();
    const w = (b.x1 - b.x0 + 8) * G, h = (b.y1 - b.y0 + 8) * G;
    const zoom = Math.max(0.5, Math.min(4, Math.min(r.width / w, r.height / h)));
    ed.setView({ zoom, x: r.width / 2 - ((b.x0 + b.x1) / 2) * G * zoom, y: r.height / 2 - ((b.y0 + b.y1) / 2) * G * zoom });
  };
  // fit on load of a new document
  useEffect(() => { requestAnimationFrame(fit); }, [ed.docId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isConnectionPoint = (p: Pt) => conn.netOfPoint.has(key(p)) || sch.wires.some((w) => hitTest({ parts: [], labels: [], wires: [w] }, p));

  const netAt = (p: Pt): string | null => {
    const s = snap(p);
    const n = conn.netOfPoint.get(key(s));
    if (n) return n;
    const h = hitTest({ parts: [], labels: [], wires: shown.wires }, p);
    if (h) { const w = shown.wires.find((x) => x.id === h.id)!; return conn.netOfPoint.get(key(w.a)) ?? null; }
    return null;
  };

  // ---------- mouse ----------
  const onMouseDown = (e: React.MouseEvent) => {
    const w = toWorld(e), s = snap(w);
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y });
      return;
    }
    if (e.button === 2) { cancel(); return; }
    if (e.button !== 0) return;
    switch (tool.kind) {
      case 'select': {
        const h = hitTest(sch, w);
        if (h) {
          const ids = e.shiftKey ? (sel.has(h.id) ? selection.filter((x) => x !== h.id) : [...selection, h.id]) : sel.has(h.id) ? selection : [h.id];
          ed.setSelection(ids);
          setDrag({ mode: 'move', start: s, delta: { x: 0, y: 0 } });
        } else {
          if (!e.shiftKey) ed.setSelection([]);
          setDrag({ mode: 'band', start: w, end: w });
        }
        break;
      }
      case 'wire': {
        if (!tool.from) { ed.setTool({ kind: 'wire', from: s }); break; }
        if (s.x === tool.from.x && s.y === tool.from.y) break;
        const endsOnSomething = isConnectionPoint(s);
        ed.addWirePath(tool.from, s);
        ed.setTool({ kind: 'wire', from: endsOnSomething ? undefined : s });
        break;
      }
      case 'place': ed.placePart(s); break;
      case 'label': ed.addLabel(s, tool.name); ed.setTool({ kind: 'select' }); break;
      case 'probe': {
        const n = netAt(w);
        if (n && n !== '0') addProbe(n);
        break;
      }
    }
  };

  const addProbe = (net: string) => {
    const res = session.result;
    const kinds = res ? res.analyses.map((a) => a.kind).filter((k) => k !== 'op' && k !== 'noise') : [];
    const analysis = kinds[0];
    if (!analysis) return;
    session.addProbe({ analysis, node: net, show: analysis === 'ac' ? 'db' : 'v' });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const w = toWorld(e), s = snap(w);
    if (!cursor || cursor.x !== s.x || cursor.y !== s.y) ed.setCursor(s);
    if (tool.kind === 'probe') setHoverNet(netAt(w));
    if (!drag) return;
    if (drag.mode === 'pan') ed.setView({ ...view, x: drag.vx + e.clientX - drag.sx, y: drag.vy + e.clientY - drag.sy });
    else if (drag.mode === 'move') {
      const d = { x: s.x - drag.start.x, y: s.y - drag.start.y };
      if (d.x !== drag.delta.x || d.y !== drag.delta.y) setDrag({ ...drag, delta: d });
    } else if (drag.mode === 'band') setDrag({ ...drag, end: w });
  };

  const onMouseUp = () => {
    if (drag?.mode === 'move') ed.moveSelection(drag.delta.x, drag.delta.y);
    if (drag?.mode === 'band') {
      const b: Box = { x0: Math.min(drag.start.x, drag.end.x), y0: Math.min(drag.start.y, drag.end.y), x1: Math.max(drag.start.x, drag.end.x), y1: Math.max(drag.start.y, drag.end.y) };
      if (b.x1 - b.x0 > 0.5 || b.y1 - b.y0 > 0.5) ed.setSelection([...new Set([...selection, ...itemsInBox(sch, b)])]);
    }
    setDrag(null);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (tool.kind === 'wire') { ed.setTool({ kind: 'wire' }); return; }
    if (tool.kind !== 'select') return;
    const h = hitTest(sch, toWorld(e));
    if (h?.type === 'part') ed.setEditing(h.id);
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const zoom = Math.max(0.3, Math.min(8, view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const k = zoom / view.zoom;
    ed.setView({ zoom, x: mx - (mx - view.x) * k, y: my - (my - view.y) * k });
  };

  const cancel = () => {
    if (tool.kind === 'wire' && tool.from) ed.setTool({ kind: 'wire' });
    else ed.setTool({ kind: 'select' });
  };

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.tagName === 'SELECT' || tgt.isContentEditable)) return;
      const st = useEditor.getState();
      if (st.editing || st.askLabel || document.querySelector('.modal-backdrop')) return;
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && k === 'Enter') { e.preventDefault(); onRun(); return; }
      if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo(); return; }
      if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); st.redo(); return; }
      if (ctrl) return;
      switch (k) {
        case 'Escape': cancel(); st.setSelection([]); break;
        case 'w': case 'W': st.setTool({ kind: 'wire' }); break;
        case 'l': case 'L': st.setAskLabel(true); break;
        case 'p': case 'P': st.setTool({ kind: 'probe' }); break;
        case 'r': case 'R': st.rotateSelection(); break;
        case 'e': case 'E': st.mirrorSelection(); break;
        case 'u': st.undo(); break;
        case 'U': st.redo(); break;
        case 'f': case 'F': fit(); break;
        case 'q': case 'Q': {
          const id = st.selection.find((s) => st.sch.parts.some((p) => p.id === s));
          if (id) st.setEditing(id);
          break;
        }
        case 'Delete': case 'Backspace': st.deleteSelection(); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- render ----------
  const gridStep = G * view.zoom;
  const unconnected = conn.danglingPins;

  const opV = (net: string) => {
    const v = opPlot?.byName.get(net);
    return v ? v.re[0] : undefined;
  };

  const partNote = (name: string) => {
    if (!fresh) return null;
    try { return partCurrent(session.result!, name); } catch { return null; }
  };

  return (
    <svg
      ref={svgRef}
      className={`sch-canvas tool-${tool.kind}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { ed.setCursor(null); if (drag?.mode !== 'move') setDrag(null); }}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      role="application"
      aria-label={t('canvas.aria')}
    >
      <defs>
        <pattern id="grid" width={gridStep} height={gridStep} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
          {gridStep >= 6 && <circle cx={0} cy={0} r={gridStep >= 14 ? 1.1 : 0.8} className="grid-dot" />}
        </pattern>
        <radialGradient id="ledglow">
          <stop offset="0%" stopColor="var(--led-glow)" stopOpacity="0.95" />
          <stop offset="100%" stopColor="var(--led-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
        {/* LED glow behind everything */}
        {fresh && shown.parts.filter((p) => p.kind === 'LED').map((p) => {
          const i = partNote(p.name) ?? 0;
          const a = Math.max(0, Math.min(1, i / 0.012));
          if (a < 0.03) return null;
          return <circle key={`glow${p.id}`} cx={p.x * G} cy={p.y * G} r={G * (2 + 3 * a)} fill="url(#ledglow)" opacity={a} />;
        })}

        {/* wires */}
        {shown.wires.map((w) => {
          const net = conn.netOfPoint.get(key(w.a));
          return (
            <line key={w.id} x1={w.a.x * G} y1={w.a.y * G} x2={w.b.x * G} y2={w.b.y * G}
              className={`wire${sel.has(w.id) ? ' selected' : ''}${w.locked ? ' locked' : ''}${hoverNet && net === hoverNet ? ' hover' : ''}`} />
          );
        })}
        {conn.junctions.map((p) => <circle key={`j${p.x},${p.y}`} cx={p.x * G} cy={p.y * G} r={3} className="junction" />)}

        {/* parts */}
        {shown.parts.map((p) => {
          const box = partBox(p);
          const vertical = p.rot % 2 === 0;
          const def = PARTS[p.kind];
          const value = def.valueText(p.params);
          // vertical parts: text to the right; horizontal parts: name/value above, results below
          const tx = vertical ? box.x1 + 0.5 : (box.x0 + box.x1) / 2;
          const ty = vertical ? (box.y0 + box.y1) / 2 - 0.6 : box.y0 - 1.6;
          const ry = vertical ? ty + 2.6 : box.y1 + 1.2;
          const raw = p.kind !== 'GND' && p.kind !== 'C' && p.kind !== 'L' && p.kind !== 'I' ? partNote(p.name) : null;
          const cur = raw !== null && p.kind !== 'V' ? Math.abs(raw) : raw;
          let region: number | null = null;
          if (fresh && isMos(p.kind)) { try { region = mosRegion(session.result!, p.name); } catch { region = null; } }
          return (
            <g key={p.id} className={`part${sel.has(p.id) ? ' selected' : ''}${p.locked ? ' locked' : ''}`}>
              <PartSymbol kind={p.kind} x={p.x} y={p.y} rot={p.rot} mirror={p.mirror} />
              {p.kind !== 'GND' && (
                <text x={tx * G} y={ty * G} className="part-name" textAnchor={vertical ? 'start' : 'middle'}>
                  {p.name}{def.symbol.tag ? <tspan className="part-tag"> {def.symbol.tag.text}</tspan> : null}
                </text>
              )}
              {value && <text x={tx * G} y={(ty + 1.3) * G} className="part-value" textAnchor={vertical ? 'start' : 'middle'}>{value}</text>}
              {cur !== null && Number.isFinite(cur) && (
                <text x={tx * G} y={ry * G} className="annot-i" textAnchor={vertical ? 'start' : 'middle'}>
                  {formatEng(cur, 'A')}
                </text>
              )}
              {region !== null && (
                <text x={tx * G} y={(ry + 1.3) * G} className={`region r${region}`} textAnchor={vertical ? 'start' : 'middle'}>
                  {t(region === 2 ? 'region.sat' : region === 1 ? 'region.triode' : 'region.off')}
                </text>
              )}
            </g>
          );
        })}

        {/* labels */}
        {shown.labels.map((l) => (
          <g key={l.id} className={`label${sel.has(l.id) ? ' selected' : ''}${l.locked ? ' locked' : ''}`}>
            <path d={`M${l.x * G},${l.y * G} l3,-3 l-6,0 z`} className="label-anchor" />
            <text x={l.x * G + 4} y={l.y * G - 4} className="label-text">{l.name}</text>
          </g>
        ))}

        {/* unconnected pins */}
        {unconnected.map((p) => <rect key={`u${p.x},${p.y}`} x={p.x * G - 3} y={p.y * G - 3} width={6} height={6} className="pin-open" />)}

        {/* OP voltage annotations */}
        {opPlot && [...conn.netPoints.entries()].filter(([n]) => n !== '0').map(([net, pts]) => {
          const v = opV(net);
          if (v === undefined) return null;
          // next to a label's text if the net has one, otherwise just below its first point
          const lbl = shown.labels.find((l) => conn.netOfPoint.get(key(l)) === net);
          const [x, y] = lbl ? [lbl.x * G + 10 + lbl.name.length * 6.2, lbl.y * G - 4] : [pts[0].x * G + 4, pts[0].y * G + 12];
          return <text key={`v${net}`} x={x} y={y} className="annot-v">{formatEng(v, 'V')}</text>;
        })}

        {/* tool ghosts */}
        {cursor && tool.kind === 'place' && (
          <g className="ghost"><PartSymbol kind={tool.partKind} x={cursor.x} y={cursor.y} rot={tool.rot} mirror={tool.mirror} /></g>
        )}
        {cursor && tool.kind === 'wire' && tool.from && lRoute(tool.from, cursor).map(([a, b], i) => (
          <line key={`gw${i}`} x1={a.x * G} y1={a.y * G} x2={b.x * G} y2={b.y * G} className="wire ghost" />
        ))}
        {cursor && tool.kind === 'label' && (
          <g className="ghost"><text x={cursor.x * G + 4} y={cursor.y * G - 4} className="label-text">{tool.name}</text></g>
        )}
        {cursor && tool.kind !== 'select' && (
          <circle cx={cursor.x * G} cy={cursor.y * G} r={2.5} className="cursor-dot" />
        )}
        {drag?.mode === 'band' && (
          <rect className="band"
            x={Math.min(drag.start.x, drag.end.x) * G} y={Math.min(drag.start.y, drag.end.y) * G}
            width={Math.abs(drag.end.x - drag.start.x) * G} height={Math.abs(drag.end.y - drag.start.y) * G} />
        )}
        {/* pins of selected parts (helps beginners see where to connect) */}
        {shown.parts.filter((p) => sel.has(p.id)).flatMap((p) => pinPositions(p)).map((q, i) => (
          <circle key={`sp${i}`} cx={q.pt.x * G} cy={q.pt.y * G} r={2.2} className="pin-sel" />
        ))}
      </g>
    </svg>
  );
}
