// Line icons (24 × 24 grid, stroke = currentColor) used instead of emoji across the UI.
const P: Record<string, string[]> = {
  select: ['M5 3l13 8-6 1.5L9 19z'],
  wire: ['M4 18h6V6h10', 'M4 18m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0', 'M20 6m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'],
  label: ['M3 12l6-7h11v14H9z', 'M13 12h.01'],
  probe: ['M12 3v5', 'M12 16v5', 'M3 12h5', 'M16 12h5', 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  rotate: ['M20 11a8 8 0 1 1-2.3-5.7', 'M20 4v5h-5'],
  mirror: ['M12 3v18', 'M8 7L3 12l5 5z', 'M16 7l5 5-5 5z'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  undo: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  redo: ['M15 14l5-5-5-5', 'M20 9H10a6 6 0 0 0 0 12h3'],
  play: ['M7 4l13 8-13 8z'],
  check: ['M4 12.5l5 5L20 6.5'],
  rect: ['M4 6h16v12H4z'],
  pcell: ['M4 9h16v6H4z', 'M10 4v16', 'M14 4v16'],
  contact: ['M5 5h14v14H5z', 'M9 9h6v6H9z', 'M9 9l6 6', 'M15 9l-6 6'],
  ruler: ['M3 16L16 3l5 5L8 21z', 'M7 12l2 2', 'M10 9l2 2', 'M13 6l2 2'],
  net: ['M5 12h14', 'M5 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M19 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0', 'M12 12V5', 'M12 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0'],
  copy: ['M8 8h12v12H8z', 'M4 16V4h12'],
  book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21V5', 'M8 7h7'],
  wrench: ['M14.5 4a5 5 0 0 0-5.6 6.7L3 16.6 7.4 21l5.9-5.9A5 5 0 0 0 20 9.5l-3 3-3.5-1-1-3.5z'],
  sound: ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 8.5a5 5 0 0 1 0 7', 'M19 6a8.5 8.5 0 0 1 0 12'],
  mute: ['M4 9h4l5-4v14l-5-4H4z', 'M17 9l5 6', 'M22 9l-5 6'],
  hint: ['M9 18h6', 'M10 21h4', 'M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z'],
  lock: ['M6 11h12v10H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  flask: ['M9 3h6', 'M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3', 'M7 15h10'],
  skip: ['M5 5l8 7-8 7z', 'M13 5l8 7-8 7z'],
  folder: ['M3 6h6l2 2h10v11H3z'],
  save: ['M5 3h11l3 3v15H5z', 'M8 3v5h7V3', 'M8 14h8v7H8z'],
  error: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M8.5 8.5l7 7', 'M15.5 8.5l-7 7'],
  warning: ['M12 3l10 18H2z', 'M12 10v5', 'M12 18h.01'],
  info: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0', 'M12 11v6', 'M12 7.5h.01'],
  arrowRight: ['M4 12h15', 'M13 6l6 6-6 6'],
  arrowLeft: ['M20 12H5', 'M11 6l-6 6 6 6'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  chip: ['M7 7h10v10H7z', 'M10 3v4', 'M14 3v4', 'M10 17v4', 'M14 17v4', 'M3 10h4', 'M3 14h4', 'M17 10h4', 'M17 14h4'],
  microscope: ['M6 21h12', 'M9 17h6', 'M12 17a5 5 0 0 0 5-5', 'M8 4l4-1 3 8-4 1z', 'M11 12l1 5'],
  factory: ['M3 21V10l6 4V10l6 4V6h6v15z', 'M7 18h2', 'M12 18h2', 'M17 18h2'],
  cap: ['M2 9l10-5 10 5-10 5z', 'M6 11v5c3 2.5 9 2.5 12 0v-5', 'M22 9v6'],
  ground: ['M12 3v9', 'M5 12h14', 'M8 16h8', 'M10.5 20h3'],
  cards: ['M7 4h11a2 2 0 0 1 2 2v11', 'M4 8h12v12H4z'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  gear: ['M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  sun: ['M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M12 2v2', 'M12 20v2', 'M2 12h2', 'M20 12h2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4'],
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16, className }: { name: IconName | string; size?: number; className?: string }) {
  const paths = P[name] ?? P.info;
  return (
    <svg className={`icon${className ? ' ' + className : ''}`} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** The mentor, Ohm: a small resistor-shaped character drawn in the accent colour. */
export function Mentor({ size = 40 }: { size?: number }) {
  return (
    <svg className="mentor-face" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="19" fill="var(--accent-soft)" />
      <path d="M20 3v5M20 32v5" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="10" y="8" width="20" height="24" rx="7" fill="var(--panel)" stroke="var(--accent)" strokeWidth="2.2" />
      <circle cx="16" cy="18" r="1.8" fill="var(--ink)" />
      <circle cx="24" cy="18" r="1.8" fill="var(--ink)" />
      <path d="M15.5 24c2.5 2.4 6.5 2.4 9 0" stroke="var(--ink)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** App mark: a resistor zig-zag inside a rounded square, in the accent colour. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="var(--accent)" />
      <path d="M4 12h3l1.5-4 3 8 3-8 1.5 4h4" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
