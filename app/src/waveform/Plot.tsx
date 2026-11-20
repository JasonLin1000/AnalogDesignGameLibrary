// Canvas waveform plot: linear or log x, auto y range, hover crosshair readout.
import { useEffect, useRef, useState } from 'react';
import { formatEng } from '../schematic/units';

export interface Series { name: string; y: ArrayLike<number>; color: string; faint?: boolean }

export const TRACE_COLORS = ['var(--tr1)', 'var(--tr2)', 'var(--tr3)', 'var(--tr4)', 'var(--tr5)', 'var(--tr6)'];

function niceStep(range: number, target: number) {
  const raw = range / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

export function Plot({ x, logX, logY, series: rawSeries, xUnit, yUnit, height = 220 }: {
  x: ArrayLike<number>; logX?: boolean; logY?: boolean; series: Series[]; xUnit: string; yUnit: string; height?: number;
}) {
  // log-Y: plot log10 of the values, label ticks as powers of ten
  const series = logY ? rawSeries.map((s) => ({ ...s, y: Array.from(s.y, (v) => (v > 0 ? Math.log10(v) : NaN)) })) : rawSeries;
  const yText = (v: number) => (logY ? formatEng(10 ** v, yUnit, 3) : formatEng(v, '', 3));
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null); // x pixel
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const L = 64, R = 14, T = 10, B = 28;
  const n = x.length;
  const xv = (i: number) => (logX ? Math.log10(Math.max(x[i], 1e-30)) : x[i]);
  const x0 = n ? xv(0) : 0, x1 = n ? xv(n - 1) : 1;
  let y0 = Infinity, y1 = -Infinity;
  for (const s of series) for (let i = 0; i < s.y.length; i++) { const v = s.y[i]; if (Number.isFinite(v)) { y0 = Math.min(y0, v); y1 = Math.max(y1, v); } }
  if (!Number.isFinite(y0)) { y0 = 0; y1 = 1; }
  if (y1 - y0 < 1e-12) { const c = y0; y0 = c - Math.max(Math.abs(c) * 0.1, 1e-3); y1 = c + Math.max(Math.abs(c) * 0.1, 1e-3); }
  const pad = (y1 - y0) * 0.06; y0 -= pad; y1 += pad;
  const px = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (width - L - R);
  const py = (v: number) => T + ((y1 - v) / (y1 - y0)) * (height - T - B);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr; cv.height = height * dpr;
    const g = cv.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(cv);
    const col = (v: string) => css.getPropertyValue(v).trim() || '#888';
    g.clearRect(0, 0, width, height);
    g.font = '11px ui-monospace, Consolas, monospace';
    g.lineWidth = 1;
    // grid + ticks
    g.strokeStyle = col('--plot-grid'); g.fillStyle = col('--muted');
    g.textAlign = 'center'; g.textBaseline = 'top';
    if (logX) {
      for (let d = Math.ceil(x0); d <= Math.floor(x1); d++) {
        const X = px(d);
        g.beginPath(); g.moveTo(X, T); g.lineTo(X, height - B); g.stroke();
        g.fillText(formatEng(10 ** d, '', 2), X, height - B + 6);
      }
    } else {
      const st = niceStep(x1 - x0, 6);
      for (let v = Math.ceil(x0 / st) * st; v <= x1 + st * 1e-6; v += st) {
        const X = px(v);
        g.beginPath(); g.moveTo(X, T); g.lineTo(X, height - B); g.stroke();
        g.fillText(formatEng(v, '', 3), X, height - B + 6);
      }
    }
    g.textAlign = 'right'; g.textBaseline = 'middle';
    const sy = logY ? Math.max(1, Math.round(niceStep(y1 - y0, 5))) : niceStep(y1 - y0, 5);
    // enough significant digits to tell neighbouring ticks apart
    const yDigits = Math.min(8, Math.max(3, Math.ceil(Math.log10(Math.max(Math.abs(y0), Math.abs(y1)) / sy)) + 1));
    for (let v = Math.ceil(y0 / sy) * sy; v <= y1; v += sy) {
      const Y = py(v);
      g.beginPath(); g.moveTo(L, Y); g.lineTo(width - R, Y); g.stroke();
      g.fillText(logY ? yText(v) : formatEng(Math.abs(v) < sy * 1e-6 ? 0 : v, '', yDigits), L - 6, Y);
    }
    g.strokeStyle = col('--line'); g.strokeRect(L, T, width - L - R, height - T - B);
    g.save(); g.translate(12, (T + height - B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(yUnit, 0, 0); g.restore();
    g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(xUnit, width - R, height - 1);
    // traces
    g.save(); g.beginPath(); g.rect(L, T, width - L - R, height - T - B); g.clip();
    for (const s of [...series.filter((q) => q.faint), ...series.filter((q) => !q.faint)]) {
      g.lineWidth = s.faint ? 1 : 2;
      g.globalAlpha = s.faint ? 0.35 : 1;
      g.strokeStyle = s.color.startsWith('var(') ? col(s.color.slice(4, -1)) : s.color;
      g.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const v = s.y[i];
        if (!Number.isFinite(v)) { started = false; continue; }
        const X = px(xv(i)), Y = py(v);
        if (started) g.lineTo(X, Y); else { g.moveTo(X, Y); started = true; }
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.restore();
    // hover readout
    if (hover !== null && n) {
      const target = x0 + ((hover - L) / (width - L - R)) * (x1 - x0);
      let i = 0;
      while (i < n - 1 && xv(i + 1) < target) i++;
      if (i < n - 1 && Math.abs(xv(i + 1) - target) < Math.abs(xv(i) - target)) i++;
      const X = px(xv(i));
      g.strokeStyle = col('--muted'); g.setLineDash([3, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(X, T); g.lineTo(X, height - B); g.stroke(); g.setLineDash([]);
      const bold = series.filter((q) => !q.faint);
      const val = (v: number) => (logY ? formatEng(10 ** v, yUnit, 4) : `${formatEng(v, yUnit === 'dB' || yUnit === '°' ? '' : yUnit, 4)}${yUnit === 'dB' ? ' dB' : yUnit === '°' ? '°' : ''}`);
      const lines = [`${formatEng(x[i], xUnit, 4)}`, ...bold.map((s) => `${s.name}: ${val(s.y[i])}`)];
      const w = Math.max(...lines.map((l) => g.measureText(l).width)) + 14;
      const bx = X + w + 12 > width ? X - w - 8 : X + 8;
      g.fillStyle = col('--panel'); g.strokeStyle = col('--line');
      g.fillRect(bx, T + 4, w, lines.length * 15 + 8); g.strokeRect(bx, T + 4, w, lines.length * 15 + 8);
      g.textAlign = 'left'; g.textBaseline = 'top';
      lines.forEach((l, k) => {
        g.fillStyle = k === 0 ? col('--muted') : (bold[k - 1].color.startsWith('var(') ? col(bold[k - 1].color.slice(4, -1)) : bold[k - 1].color);
        g.fillText(l, bx + 7, T + 9 + k * 15);
        if (k > 0) { g.beginPath(); g.arc(X, py(bold[k - 1].y[i]), 3, 0, 7); g.fill(); }
      });
    }
  });

  return (
    <div ref={wrap} className="plot">
      <canvas
        ref={ref}
        style={{ width: '100%', height }}
        onMouseMove={(e) => setHover(e.clientX - e.currentTarget.getBoundingClientRect().left)}
        onMouseLeave={() => setHover(null)}
      />
      <div className="legend">
        {series.filter((q) => !q.faint).map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
}
