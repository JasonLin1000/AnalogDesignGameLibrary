import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../i18n';
import type { Violation } from './drc';
import { flatten } from './flatten';
import { bbox, contains, norm } from './geom';
import { contactStack, expandInstance } from './pcell';
import { useLayout } from './store';
import { LAYER, LAYERS, type Box, type LayerId, type Layout } from './types';

type Drag =
  | { mode: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { mode: 'move'; start: { x: number; y: number }; d: { x: number; y: number } }
  | { mode: 'band'; a: { x: number; y: number }; b: { x: number; y: number } }
  | { mode: 'rect'; moved: boolean };

export interface Highlight { boxes: Box[]; label?: string }
/** LDE overlay: gradient direction (mV/µm) and ΔVth tags at gate centres (nm). */
export interface Heat { gx: number; gy: number; tags: { x: number; y: number; text: string }[] }

export function hitLayout(doc: Layout, p: { x: number; y: number }, tolNm: number, hidden: LayerId[]): string | null {
  for (const l of doc.labels) if (Math.abs(l.x - p.x) <= tolNm * 3 && Math.abs(l.y - p.y) <= tolNm * 3) return l.id;
  for (let i = doc.instances.length - 1; i >= 0; i--) {
    const b = bbox(expandInstance(doc.instances[i]));
    if (b && contains(b, p)) return doc.instances[i].id;
  }
  for (const layer of [...LAYERS].reverse()) {
    if (hidden.includes(layer.id)) continue;
    const s = [...doc.shapes].reverse().find((q) => q.layer === layer.id && contains(q, p));
    if (s) return s.id;
  }
  return null;
}

export function LayoutCanvas({ violations, focus, highlight, heat, onNetPick, onFit }: {
  violations: Violation[]; focus: number | null; highlight: Highlight | null; heat?: Heat | null;
  onNetPick: (p: { x: number; y: number }) => void; onFit?: (fit: () => void) => void;
}) {
  const { t } = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const st = useLayout();
  const { doc, view, tool, selection, cursor, hidden } = st;
  const [drag, setDrag] = useState<Drag | null>(null);
  const sel = useMemo(() => new Set(selection), [selection]);
  const k = view.zoom / 1000; // px per nm

  const shown: Layout = useMemo(() => {
    if (drag?.mode !== 'move' || (!drag.d.x && !drag.d.y)) return doc;
    const c = structuredClone(doc);
    const { x: dx, y: dy } = drag.d;
    for (const s of c.shapes) if (sel.has(s.id) && !s.locked) { s.x0 += dx; s.x1 += dx; s.y0 += dy; s.y1 += dy; }
    for (const s of c.labels) if (sel.has(s.id) && !s.locked) { s.x += dx; s.y += dy; }
    for (const s of c.instances) if (sel.has(s.id) && !s.locked) { s.x += dx; s.y += dy; }
    return c;
  }, [doc, drag, sel]);
  const flat = useMemo(() => flatten(shown), [shown]);

  const toWorld = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / k, y: (view.y - (e.clientY - r.top)) / k };
  };
  const snap = (p: { x: number; y: number }) => ({ x: Math.round(p.x / st.snap) * st.snap, y: Math.round(p.y / st.snap) * st.snap });
  const sx = (x: number) => view.x + x * k, sy = (y: number) => view.y - y * k;

  const fit = () => {
    const svg = svgRef.current;
    const all = flatten(useLayout.getState().doc);
    const b = bbox(all);
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (!b) { st.set({ view: { zoom: 120, x: r.width / 3, y: r.height * 0.66 } }); return; }
    const w = (b.x1 - b.x0) / 1000 + 2, h = (b.y1 - b.y0) / 1000 + 2;
    const zoom = Math.max(20, Math.min(2000, Math.min(r.width / w, r.height / h)));
    st.set({ view: { zoom, x: r.width / 2 - ((b.x0 + b.x1) / 2 / 1000) * zoom, y: r.height / 2 + ((b.y0 + b.y1) / 2 / 1000) * zoom } });
  };
  useEffect(() => { onFit?.(fit); }); // expose fit to the workbench
  useEffect(() => { requestAnimationFrame(fit); }, [st.docId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus === null || !violations[focus]) return;
    const b = violations[focus].box, r = svgRef.current!.getBoundingClientRect();
    const zoom = Math.max(view.zoom, 400);
    st.set({ view: { zoom, x: r.width / 2 - ((b.x0 + b.x1) / 2 / 1000) * zoom, y: r.height / 2 + ((b.y0 + b.y1) / 2 / 1000) * zoom } });
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMouseDown = (e: React.MouseEvent) => {
    const w = toWorld(e), s = snap(w);
    if (e.button === 1 || (e.button === 0 && e.altKey)) { e.preventDefault(); setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }); return; }
    if (e.button === 2) { cancel(); return; }
    if (e.button !== 0) return;
    switch (tool.kind) {
      case 'select': {
        const h = hitLayout(doc, w, 6 / k, hidden);
        if (h) {
          st.set({ selection: e.shiftKey ? (sel.has(h) ? selection.filter((x) => x !== h) : [...selection, h]) : sel.has(h) ? selection : [h] });
          setDrag({ mode: 'move', start: s, d: { x: 0, y: 0 } });
        } else {
          if (!e.shiftKey) st.set({ selection: [] });
          setDrag({ mode: 'band', a: w, b: w });
        }
        break;
      }
      case 'rect':
        if (!tool.from) { st.set({ tool: { kind: 'rect', from: s } }); setDrag({ mode: 'rect', moved: false }); }
        else { st.addRect(st.layer, norm({ x0: tool.from.x, y0: tool.from.y, x1: s.x, y1: s.y })); st.set({ tool: { kind: 'rect' } }); }
        break;
      case 'label': st.addLabel(tool.text, s.x, s.y); st.set({ tool: { kind: 'select' } }); break;
      case 'pcell': st.addInstance(tool.cell, s.x, s.y, tool.params); break;
      case 'stack': st.addStack(tool.stack, s.x, s.y); break;
      case 'ruler':
        if (!tool.from) st.set({ tool: { kind: 'ruler', from: s } });
        else { st.set({ rulers: [...st.rulers, { a: tool.from, b: s }], tool: { kind: 'ruler' } }); }
        break;
      case 'net': onNetPick(w); break;
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const w = toWorld(e), s = snap(w);
    if (!cursor || cursor.x !== s.x || cursor.y !== s.y) st.set({ cursor: s });
    if (!drag) return;
    if (drag.mode === 'pan') st.set({ view: { ...view, x: drag.vx + e.clientX - drag.sx, y: drag.vy + e.clientY - drag.sy } });
    else if (drag.mode === 'move') { const d = { x: s.x - drag.start.x, y: s.y - drag.start.y }; if (d.x !== drag.d.x || d.y !== drag.d.y) setDrag({ ...drag, d }); }
    else if (drag.mode === 'band') setDrag({ ...drag, b: w });
    else if (drag.mode === 'rect' && tool.kind === 'rect' && tool.from && (s.x !== tool.from.x || s.y !== tool.from.y)) setDrag({ mode: 'rect', moved: true });
  };

  const onMouseUp = () => {
    if (drag?.mode === 'move') st.moveSelection(drag.d.x, drag.d.y);
    if (drag?.mode === 'band') {
      const b = norm({ x0: drag.a.x, y0: drag.a.y, x1: drag.b.x, y1: drag.b.y });
      if ((b.x1 - b.x0) * k > 4 || (b.y1 - b.y0) * k > 4) {
        const inside = (q: Box) => q.x0 >= b.x0 && q.x1 <= b.x1 && q.y0 >= b.y0 && q.y1 <= b.y1;
        const ids = [
          ...doc.shapes.filter((q) => !hidden.includes(q.layer) && inside(q)).map((q) => q.id),
          ...doc.labels.filter((q) => contains(b, q)).map((q) => q.id),
          ...doc.instances.filter((q) => { const bb = bbox(expandInstance(q)); return bb && inside(bb); }).map((q) => q.id),
        ];
        st.set({ selection: [...new Set([...selection, ...ids])] });
      }
    }
    if (drag?.mode === 'rect' && drag.moved && tool.kind === 'rect' && tool.from && cursor) {
      st.addRect(st.layer, norm({ x0: tool.from.x, y0: tool.from.y, x1: cursor.x, y1: cursor.y }));
      st.set({ tool: { kind: 'rect' } });
    }
    setDrag(null);
  };

  const cancel = () => {
    if ((tool.kind === 'rect' || tool.kind === 'ruler') && tool.from) st.set({ tool: { kind: tool.kind } });
    else st.set({ tool: { kind: 'select' } });
  };

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const zoom = Math.max(10, Math.min(5000, view.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const f = zoom / view.zoom;
    st.set({ view: { zoom, x: mx - (mx - view.x) * f, y: my - (my - view.y) * f } });
  };

  // keyboard (Virtuoso-style)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT')) return;
      const s = useLayout.getState();
      if (s.editing || s.askLabel || s.askPcell) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) s.redo(); else s.undo(); return; }
      if (ctrl && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); s.redo(); return; }
      if (ctrl) return;
      const nudge = (dx: number, dy: number) => s.moveSelection(dx * (e.shiftKey ? 50 : s.snap), dy * (e.shiftKey ? 50 : s.snap));
      const idx = '1234567890'.indexOf(e.key);
      if (idx >= 0 && LAYERS[idx]) { s.set({ layer: LAYERS[idx].id }); e.preventDefault(); return; }
      switch (e.key) {
        case 'Escape': cancel(); s.set({ selection: [] }); break;
        case 'r': case 'R': s.set({ tool: { kind: 'rect' } }); break;
        case 'l': case 'L': s.set({ askLabel: true }); break;
        case 'i': case 'I': if (s.allowed.pcells.length) s.set({ askPcell: s.allowed.pcells[0] }); break;
        case 'o': case 'O': s.set({ tool: { kind: 'stack', stack: tool.kind === 'stack' ? (tool.stack === 'licon' ? 'mcon' : tool.stack === 'mcon' ? 'via' : 'licon') : 'licon' } }); break;
        case 'k': s.set({ tool: { kind: 'ruler' } }); break;
        case 'K': s.set({ rulers: [] }); break;
        case 'n': case 'N': s.set({ tool: { kind: 'net' } }); break;
        case 'q': case 'Q': if (s.selection[0]) s.set({ editing: s.selection[0] }); break;
        case 'c': case 'C': s.duplicateSelection(); break;
        case 'Delete': case 'Backspace': s.deleteSelection(); break;
        case 'u': s.undo(); break;
        case 'U': s.redo(); break;
        case 'f': case 'F': fit(); break;
        case 'ArrowLeft': nudge(-1, 0); break;
        case 'ArrowRight': nudge(1, 0); break;
        case 'ArrowUp': nudge(0, 1); break;
        case 'ArrowDown': nudge(0, -1); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- render ----------
  const pat = 8 / k; // stipple period in nm (constant on screen)
  const ghost: { layer: LayerId; box: Box }[] = [];
  if (cursor && tool.kind === 'rect' && tool.from) ghost.push({ layer: st.layer, box: norm({ x0: tool.from.x, y0: tool.from.y, x1: cursor.x, y1: cursor.y }) });
  if (cursor && tool.kind === 'pcell') ghost.push(...expandInstance({ id: 'g', kind: tool.cell, name: '', x: cursor.x, y: cursor.y, params: tool.params }).map((s) => ({ layer: s.layer, box: s })));
  if (cursor && tool.kind === 'stack') ghost.push(...contactStack(tool.stack, cursor.x, cursor.y));
  const selectedBoxes: Box[] = [
    ...shown.shapes.filter((s) => sel.has(s.id)),
    ...shown.instances.filter((i) => sel.has(i.id)).map((i) => bbox(expandInstance(i))!).filter(Boolean),
  ];
  const gridUm = view.zoom > 400 ? 0.1 : view.zoom > 60 ? 1 : 10;

  return (
    <svg ref={svgRef} className={`lay-canvas tool-${tool.kind}`} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
      onMouseLeave={() => { st.set({ cursor: null }); if (drag?.mode !== 'move') setDrag(null); }}
      onDoubleClick={(e) => { if (tool.kind !== 'select') return; const h = hitLayout(doc, toWorld(e), 6 / k, hidden); if (h) st.set({ editing: h }); }}
      onWheel={onWheel} onContextMenu={(e) => e.preventDefault()} role="application" aria-label={t('lay.canvas')}>
      <defs>
        {LAYERS.map((l) => (
          <pattern key={l.id} id={`p-${l.id}`} width={pat} height={pat} patternUnits="userSpaceOnUse">
            {l.pattern === 'hatch' && <path d={`M0,${pat} L${pat},0`} stroke={l.color} strokeWidth={1.2 / k} />}
            {l.pattern === 'cross' && <path d={`M0,${pat} L${pat},0 M0,0 L${pat},${pat}`} stroke={l.color} strokeWidth={1 / k} />}
            {l.pattern === 'dots' && <circle cx={pat / 2} cy={pat / 2} r={1 / k} fill={l.color} />}
          </pattern>
        ))}
        <pattern id="lgrid" width={gridUm * view.zoom} height={gridUm * view.zoom} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
          <circle cx={0} cy={0} r={1} className="grid-dot" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lgrid)" />
      {heat && (heat.gx || heat.gy) ? (() => {
        // colour ramp along the gradient direction, centred on the layout
        const b = bbox(flat) ?? { x0: 0, y0: 0, x1: 1000, y1: 1000 };
        const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, n = Math.hypot(heat.gx, heat.gy), span = 40000;
        const ux = heat.gx / n, uy = heat.gy / n;
        return (
          <>
            <defs>
              <linearGradient id="heat" gradientUnits="userSpaceOnUse" x1={sx(cx - ux * span / 2)} y1={sy(cy - uy * span / 2)} x2={sx(cx + ux * span / 2)} y2={sy(cy + uy * span / 2)}>
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" /><stop offset="50%" stopColor="#a3a3a3" stopOpacity="0.08" /><stop offset="100%" stopColor="#dc2626" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#heat)" />
          </>
        );
      })() : null}
      <g transform={`translate(${view.x} ${view.y}) scale(${k} ${-k})`}>
        {LAYERS.filter((l) => !hidden.includes(l.id)).map((l) => (
          <g key={l.id} className={`ly ly-${l.id}`}>
            {flat.filter((s) => s.layer === l.id).map((s) => (
              <g key={s.id}>
                <rect x={s.x0} y={s.y0} width={s.x1 - s.x0} height={s.y1 - s.y0}
                  fill={l.cut ? '#111' : `url(#p-${l.id})`} fillOpacity={l.cut ? 0.9 : 1}
                  stroke={l.color} strokeWidth={1.3 / k} strokeDasharray={l.pattern === 'dots' ? `${6 / k} ${4 / k}` : undefined} />
                {l.cut && <path d={`M${s.x0},${s.y0} L${s.x1},${s.y1} M${s.x0},${s.y1} L${s.x1},${s.y0}`} stroke={l.color} strokeWidth={1 / k} />}
              </g>
            ))}
          </g>
        ))}
        {shown.instances.map((i) => { const b = bbox(expandInstance(i)); return b ? <rect key={i.id} className="inst-box" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} strokeWidth={1 / k} strokeDasharray={`${4 / k} ${3 / k}`} /> : null; })}
        {ghost.map((g, i) => <rect key={`g${i}`} className="lay-ghost" x={g.box.x0} y={g.box.y0} width={g.box.x1 - g.box.x0} height={g.box.y1 - g.box.y0} stroke={LAYER[g.layer].color} strokeWidth={1.5 / k} />)}
        {selectedBoxes.map((b, i) => <rect key={`s${i}`} className="lay-sel" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} strokeWidth={2.5 / k} />)}
        {highlight?.boxes.map((b, i) => <rect key={`h${i}`} className="lay-net" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} strokeWidth={3 / k} />)}
        {violations.map((v, i) => {
          const b = v.box; const pad = 4 / k;
          return <rect key={`v${i}`} className={`drc-mark${i === focus ? ' focus' : ''}`} x={b.x0 - pad} y={b.y0 - pad} width={b.x1 - b.x0 + 2 * pad} height={b.y1 - b.y0 + 2 * pad} strokeWidth={(i === focus ? 3 : 1.6) / k} />;
        })}
        {drag?.mode === 'band' && (() => { const b = norm({ x0: drag.a.x, y0: drag.a.y, x1: drag.b.x, y1: drag.b.y }); return <rect className="band" x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} />; })()}
      </g>
      {/* labels, rulers and cursor are drawn in screen space so the text is upright */}
      {shown.labels.filter((l) => !hidden.includes(l.layer)).map((l) => (
        <g key={l.id} className={`lay-label${sel.has(l.id) ? ' selected' : ''}`}>
          <path d={`M${sx(l.x) - 4},${sy(l.y)} h8 M${sx(l.x)},${sy(l.y) - 4} v8`} stroke={LAYER[l.layer].color} strokeWidth={1.5} />
          <text x={sx(l.x) + 5} y={sy(l.y) - 5} fill={LAYER[l.layer].color}>{l.text}</text>
        </g>
      ))}
      {highlight?.label && <text className="net-name" x={12} y={22}>{highlight.label}</text>}
      {heat?.tags.map((g, i) => <text key={`ht${i}`} className="lde-tag" x={sx(g.x)} y={sy(g.y)} textAnchor="middle">{g.text}</text>)}
      {[...st.rulers, ...(tool.kind === 'ruler' && tool.from && cursor ? [{ a: tool.from, b: cursor }] : [])].map((r, i) => {
        const d = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y) / 1000;
        return (
          <g key={`r${i}`} className="ruler">
            <line x1={sx(r.a.x)} y1={sy(r.a.y)} x2={sx(r.b.x)} y2={sy(r.b.y)} />
            <text x={(sx(r.a.x) + sx(r.b.x)) / 2 + 6} y={(sy(r.a.y) + sy(r.b.y)) / 2 - 6}>{d.toFixed(3)} µm</text>
          </g>
        );
      })}
      {cursor && tool.kind !== 'select' && <circle className="cursor-dot" cx={sx(cursor.x)} cy={sy(cursor.y)} r={3} />}
    </svg>
  );
}
