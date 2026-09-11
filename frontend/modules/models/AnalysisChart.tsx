"use client";

import { useMemo } from "react";

// Lightweight dependency-free SVG stacked-area chart — same "no charting library" convention
// as modules/inference/benchmarks/LineChart.tsx, but theme-aware (uses the --dm-* tokens the
// rest of Deep Analysis is built on) and click-driven for drill-down instead of static.

export interface StackedAreaSeries {
  key: string;
  label: string;
  color: string;
  /** One value per x-position, same order/length as `xValues`. */
  values: number[];
  /** Present when this band can be drilled into further (e.g. Prefill → Compute/Memory/Interconnect). */
  onClick?: () => void;
  /** Rendered as a note under the legend swatch — e.g. "not yet modeled" for Routing. */
  disabledNote?: string;
}

interface StackedAreaChartProps {
  xValues: number[];
  xLabel: string;
  yLabel: string;
  series: StackedAreaSeries[];
  /** Formats a raw ms value for tooltips/labels — defaults to 2 decimal places. */
  formatValue?: (ms: number) => string;
  /** true (default): bands sum to a real total (e.g. FFN+Attention+DeltaNet = Compute).
   *  false: each series is drawn independently from 0, overlaid with transparency — for values
   *  that are alternatives or MAX-bound rather than additive (e.g. Decode's t_mem/t_compute,
   *  where only the larger of the two is actually paid; or KV-Cache's recompute-vs-read-back). */
  stacked?: boolean;
}

const W = 720;
const H = 340;
const M = { top: 16, right: 20, bottom: 44, left: 64 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

let chartIdCounter = 0;

export function StackedAreaChart({ xValues, xLabel, yLabel, series, formatValue, stacked = true }: StackedAreaChartProps) {
  const fmt = formatValue ?? ((ms: number) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(2)));
  const n = xValues.length;
  const uid = useMemo(() => `chart-${++chartIdCounter}`, []);

  // Stacked: cumulative sum per x-index, in the order `series` is given (bottom-to-top).
  // Overlay: each series' own band runs from 0 to its own value — no summing.
  const cumulative: number[][] = series.map(() => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let running = 0;
    for (let s = 0; s < series.length; s++) {
      running = stacked ? running + (series[s].values[i] ?? 0) : (series[s].values[i] ?? 0);
      cumulative[s][i] = running;
    }
  }
  const yMax = stacked
    ? Math.max(...Array.from({ length: n }, (_, i) => cumulative[series.length - 1]?.[i] ?? 0), 1) * 1.1
    : Math.max(...series.flatMap(s => s.values), 1) * 1.1;

  const xPos = (i: number) => (n <= 1 ? M.left + PLOT_W / 2 : M.left + (i / (n - 1)) * PLOT_W);
  const yPos = (v: number) => M.top + PLOT_H - (v / yMax) * PLOT_H;
  const yTicks = 4;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Time breakdown vs. concurrency">
        <defs>
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodOpacity="0.28" />
          </filter>
          {series.map(s => (
            <linearGradient key={s.key} id={`${uid}-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={stacked ? 0.95 : 0.32} />
              <stop offset="100%" stopColor={s.color} stopOpacity={stacked ? 0.55 : 0.06} />
            </linearGradient>
          ))}
        </defs>

        {/* Plot-area canvas so the grid/data reads as a distinct surface, not floating on the page bg. */}
        <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="var(--dm-surface-a)" rx={6} />

        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = (yMax / yTicks) * i;
          const y = yPos(val);
          return (
            <g key={i}>
              <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="var(--dm-border-a)" strokeWidth={i === 0 ? 1.25 : 0.75} />
              <text x={M.left - 8} y={y + 4} textAnchor="end" className="text-[10px] font-medium" fill="var(--dm-txt-muted)">{fmt(val)}</text>
            </g>
          );
        })}

        {xValues.map((x, i) => (
          <text key={x} x={xPos(i)} y={H - M.bottom + 18} textAnchor="middle" className="text-[10px] font-semibold" fill="var(--dm-txt-muted)">{x}</text>
        ))}

        <text x={M.left + PLOT_W / 2} y={H - 8} textAnchor="middle" className="text-[11px] font-semibold" fill="var(--dm-txt-secondary)">{xLabel}</text>
        <text x={-(M.top + PLOT_H / 2)} y={16} textAnchor="middle" transform="rotate(-90)" className="text-[11px] font-semibold" fill="var(--dm-txt-secondary)">{yLabel}</text>

        {/* Stacked: bottom-of-band is the previous series' cumulative line, so bands sum to the
            total — filled with a top-lit gradient and a crisp top edge for depth. Overlay: every
            band starts at 0, drawn with a light fill (so overlaps stay legible) but a bold,
            saturated stroke + point markers, so each line reads sharply against the others. */}
        {series.map((s, sIdx) => {
          const topPts = cumulative[sIdx].map((v, i) => [xPos(i), yPos(v)] as const);
          const bottomBase = stacked ? (sIdx === 0 ? new Array(n).fill(0) : cumulative[sIdx - 1]) : new Array(n).fill(0);
          const bottomPts = bottomBase.map((v: number, i: number) => [xPos(i), yPos(v)] as const);
          const d =
            topPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") +
            " " +
            [...bottomPts].reverse().map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
            " Z";
          const topLine = topPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
          return (
            <g key={s.key}>
              <path
                d={d} fill={`url(#${uid}-grad-${s.key})`}
                stroke="none"
                className={s.onClick ? "cursor-pointer transition-opacity duration-150 hover:opacity-95" : undefined}
                onClick={s.onClick}
              >
                <title>{s.label}</title>
              </path>
              <path
                d={topLine} fill="none" stroke={s.color} strokeWidth={stacked ? 2 : 2.75}
                strokeLinejoin="round" strokeLinecap="round" filter={`url(#${uid}-shadow)`}
                className={s.onClick ? "cursor-pointer" : undefined} onClick={s.onClick}
              />
              {!stacked && topPts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3} fill={s.color} stroke="var(--dm-surface-a)" strokeWidth={1.25} />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-2">
        {series.map(s => (
          <button
            key={s.key} type="button" onClick={s.onClick} disabled={!s.onClick}
            className="flex items-center gap-2 text-xs font-semibold rounded-full pl-1.5 pr-3 py-1 transition-colors"
            style={{ color: "var(--dm-txt-primary)", background: "var(--dm-surface-a)", cursor: s.onClick ? "pointer" : "default" }}
            title={s.disabledNote}
          >
            <span className="inline-block h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
            {s.label}
            {s.onClick && <span style={{ color: "var(--dm-txt-faint)" }}>›</span>}
            {s.disabledNote && <span className="text-[10px] font-normal" style={{ color: "var(--dm-txt-faintest)" }}>({s.disabledNote})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
