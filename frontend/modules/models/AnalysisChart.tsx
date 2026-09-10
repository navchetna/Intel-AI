"use client";

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

export function StackedAreaChart({ xValues, xLabel, yLabel, series, formatValue, stacked = true }: StackedAreaChartProps) {
  const fmt = formatValue ?? ((ms: number) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(2)));
  const n = xValues.length;

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
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const val = (yMax / yTicks) * i;
          const y = yPos(val);
          return (
            <g key={i}>
              <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="var(--dm-border-a)" strokeWidth={0.5} />
              <text x={M.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="var(--dm-txt-faint)">{fmt(val)}</text>
            </g>
          );
        })}

        {xValues.map((x, i) => (
          <text key={x} x={xPos(i)} y={H - M.bottom + 18} textAnchor="middle" className="text-[10px]" fill="var(--dm-txt-faint)">{x}</text>
        ))}

        <text x={M.left + PLOT_W / 2} y={H - 8} textAnchor="middle" className="text-[11px]" fill="var(--dm-txt-muted)">{xLabel}</text>
        <text x={-(M.top + PLOT_H / 2)} y={16} textAnchor="middle" transform="rotate(-90)" className="text-[11px]" fill="var(--dm-txt-muted)">{yLabel}</text>

        {/* Stacked: bottom-of-band is the previous series' cumulative line, so bands sum to the
            total. Overlay: every band starts at 0, drawn with more transparency so overlaps
            between series are visible rather than one fully occluding another. */}
        {series.map((s, sIdx) => {
          const topPts = cumulative[sIdx].map((v, i) => [xPos(i), yPos(v)] as const);
          const bottomBase = stacked ? (sIdx === 0 ? new Array(n).fill(0) : cumulative[sIdx - 1]) : new Array(n).fill(0);
          const bottomPts = bottomBase.map((v: number, i: number) => [xPos(i), yPos(v)] as const);
          const d =
            topPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") +
            " " +
            [...bottomPts].reverse().map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
            " Z";
          return (
            <path
              key={s.key} d={d} fill={s.color} fillOpacity={stacked ? 0.75 : 0.35}
              stroke={s.color} strokeWidth={stacked ? 1 : 1.5}
              className={s.onClick ? "cursor-pointer transition-opacity duration-150 hover:opacity-90" : undefined}
              onClick={s.onClick}
            >
              <title>{s.label}</title>
            </path>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3">
        {series.map(s => (
          <button
            key={s.key} type="button" onClick={s.onClick} disabled={!s.onClick}
            className="flex items-center gap-1.5 text-xs rounded px-1.5 py-0.5 transition-colors"
            style={{ color: "var(--dm-txt-secondary)", cursor: s.onClick ? "pointer" : "default" }}
            title={s.disabledNote}
          >
            <span className="inline-block h-2.5 w-3.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
            {s.label}
            {s.onClick && <span style={{ color: "var(--dm-txt-faint)" }}>›</span>}
            {s.disabledNote && <span className="text-[10px]" style={{ color: "var(--dm-txt-faintest)" }}>({s.disabledNote})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
