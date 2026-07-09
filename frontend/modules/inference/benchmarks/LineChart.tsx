"use client";

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

interface LineChartProps {
  title: string;
  series: ChartSeries[];
  xLabel: string;
  yLabel: string;
}

const PALETTE = ["#0071c5", "#00c7fd", "#5577ee", "#00aaee", "#3a77cc", "#55aadd"];

export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length];
}

const W = 560;
const H = 300;
const M = { top: 16, right: 16, bottom: 48, left: 56 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

/** Lightweight dependency-free SVG line chart for power-of-two x axes. */
export function LineChart({ title, series, xLabel, yLabel }: LineChartProps) {
  const allX = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.x))),
  ).sort((a, b) => a - b);
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const hasData = allX.length > 0 && allY.length > 0;
  const yMax = hasData ? Math.max(...allY) * 1.1 || 1 : 1;

  // Categorical x positioning gives even spacing for powers of two.
  const xPos = (x: number) => {
    const idx = allX.indexOf(x);
    if (allX.length <= 1) return M.left + PLOT_W / 2;
    return M.left + (idx / (allX.length - 1)) * PLOT_W;
  };
  const yPos = (y: number) => M.top + PLOT_H - (y / yMax) * PLOT_H;

  const yTicks = 4;

  return (
    <figure className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <figcaption className="mb-2 text-sm font-semibold text-intel-dark">{title}</figcaption>
      {!hasData ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-gray-400">
          No data for the current filters.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          {/* Y grid + labels */}
          {Array.from({ length: yTicks + 1 }).map((_, i) => {
            const val = (yMax / yTicks) * i;
            const y = yPos(val);
            return (
              <g key={i}>
                <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="#eef2f6" />
                <text x={M.left - 8} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">
                  {val >= 100 ? val.toFixed(0) : val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {allX.map((x) => (
            <text
              key={x}
              x={xPos(x)}
              y={H - M.bottom + 18}
              textAnchor="middle"
              className="fill-gray-400 text-[10px]"
            >
              {x}
            </text>
          ))}

          {/* Axis titles */}
          <text x={M.left + PLOT_W / 2} y={H - 6} textAnchor="middle" className="fill-gray-500 text-[11px]">
            {xLabel}
          </text>
          <text
            x={-(M.top + PLOT_H / 2)}
            y={14}
            textAnchor="middle"
            transform="rotate(-90)"
            className="fill-gray-500 text-[11px]"
          >
            {yLabel}
          </text>

          {/* Series lines + points */}
          {series.map((s) => {
            const pts = [...s.points].sort((a, b) => a.x - b.x);
            const d = pts
              .map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.x)} ${yPos(p.y)}`)
              .join(" ");
            return (
              <g key={s.label}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
                {pts.map((p) => (
                  <circle key={p.x} cx={xPos(p.x)} cy={yPos(p.y)} r={3} fill={s.color} />
                ))}
              </g>
            );
          })}
        </svg>
      )}

      {/* Legend */}
      {hasData && series.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
