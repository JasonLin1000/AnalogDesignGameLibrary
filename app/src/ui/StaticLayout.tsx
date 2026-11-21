// Read-only drawing of a layout (instances expanded) for tutorial cards.
import { useMemo } from 'react';
import { flatten } from '../layout/flatten';
import { bbox } from '../layout/geom';
import { LAYERS, LAYER, type Layout } from '../layout/types';

export function LayoutDrawing({ layout, height = 220 }: { layout: Layout; height?: number }) {
  const flat = useMemo(() => flatten(layout), [layout]);
  const b = bbox(flat) ?? { x0: 0, y0: 0, x1: 1000, y1: 1000 };
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  const pad = Math.max(w, h) * 0.12 + 200;
  const vw = w + 2 * pad, vh = h + 2 * pad;
  // svg y axis points down: flip y so layout "up" is up
  const X = (x: number) => x - b.x0 + pad;
  const Y = (y: number) => b.y1 - y + pad;
  const unit = Math.max(vw, vh) / 300; // ≈ one screen pixel at the default size
  return (
    <svg className="static-lay" viewBox={`0 0 ${vw} ${vh}`} style={{ height, width: '100%' }} role="img" aria-label="layout">
      <defs>
        {LAYERS.map((l) => (
          <pattern key={l.id} id={`sp-${l.id}`} width={unit * 6} height={unit * 6} patternUnits="userSpaceOnUse">
            {l.pattern === 'hatch' && <path d={`M0,${unit * 6} L${unit * 6},0`} stroke={l.color} strokeWidth={unit} />}
            {l.pattern === 'cross' && <path d={`M0,${unit * 6} L${unit * 6},0 M0,0 L${unit * 6},${unit * 6}`} stroke={l.color} strokeWidth={unit * 0.8} />}
            {l.pattern === 'dots' && <circle cx={unit * 3} cy={unit * 3} r={unit * 0.8} fill={l.color} />}
          </pattern>
        ))}
      </defs>
      <rect width={vw} height={vh} className="static-lay-bg" />
      {LAYERS.map((l) => flat.filter((s) => s.layer === l.id).map((s) => (
        <g key={s.id}>
          <rect x={X(s.x0)} y={Y(s.y1)} width={s.x1 - s.x0} height={s.y1 - s.y0}
            fill={l.cut ? '#111' : `url(#sp-${l.id})`} fillOpacity={l.cut ? 0.9 : 1} stroke={l.color} strokeWidth={unit * 1.2}
            strokeDasharray={l.pattern === 'dots' ? `${unit * 5} ${unit * 3}` : undefined} />
          {l.cut && <path d={`M${X(s.x0)},${Y(s.y0)} L${X(s.x1)},${Y(s.y1)} M${X(s.x0)},${Y(s.y1)} L${X(s.x1)},${Y(s.y0)}`} stroke={l.color} strokeWidth={unit * 0.8} />}
        </g>
      )))}
      {layout.labels.map((l) => (
        <text key={l.id} x={X(l.x)} y={Y(l.y)} fill={LAYER[l.layer].color} className="static-lay-label"
          fontSize={unit * 26} textAnchor="middle" dominantBaseline="central" stroke="#1b1a18" strokeWidth={unit * 4} style={{ paintOrder: 'stroke' }}>{l.text}</text>
      ))}
    </svg>
  );
}
