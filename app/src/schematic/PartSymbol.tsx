import { PARTS } from './parts';
import type { PartKind, Rot } from './types';

export const G = 10; // world pixels per grid unit

/** Symbol drawn in world pixels at (x, y) grid units. */
export function PartSymbol({ kind, x, y, rot, mirror, className }: {
  kind: PartKind; x: number; y: number; rot: Rot; mirror?: boolean; className?: string;
}) {
  const def = PARTS[kind];
  return (
    <g className={className} transform={`translate(${x * G} ${y * G}) rotate(${rot * 90}) scale(${mirror ? -G : G} ${G})`}>
      {def.symbol.paths.map((d, i) => (
        <path key={i} d={d} fill="none" vectorEffect="non-scaling-stroke" />
      ))}
      {def.symbol.circles?.map((c, i) => (
        <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="none" vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

/** Small standalone icon for the parts palette. */
export function PartIcon({ kind, size = 36 }: { kind: PartKind; size?: number }) {
  const horizontal = false;
  return (
    <svg width={size} height={size} viewBox="-45 -45 90 90" className="part-icon" aria-hidden="true">
      <g strokeWidth={2.2}>
        <PartSymbol kind={kind} x={0} y={kind === 'GND' ? -1 : 0} rot={horizontal ? 1 : 0} />
      </g>
    </svg>
  );
}
