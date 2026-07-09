"use client";

import { useState, useMemo } from "react";
import {
  XEON6_SP_SKUS, TAG_META, MAX_INT_PEAK, MAX_FP_PEAK, MAX_PERF_PER_K, MAX_PERF_CORE,
  type XeonSKU, type WorkloadTag,
} from "./xeon6sp-data";

// ── mini bar ──────────────────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number | null; max: number; color: string }) {
  if (value === null) return <span className="text-white/20 text-xs">—</span>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden min-w-[48px]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-white/70 w-10 text-right shrink-0">{value.toLocaleString()}</span>
    </div>
  );
}

function ScoreBar({ value, max, color }: { value: number | null; max: number; color: string }) {
  if (value === null) return <span className="text-white/20 text-xs">—</span>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden min-w-[48px]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono text-white/70 w-12 text-right shrink-0">{value.toFixed(1)}</span>
    </div>
  );
}

// ── tag pill ──────────────────────────────────────────────────────────────────

function TagPill({ tag, small }: { tag: WorkloadTag; small?: boolean }) {
  const m = TAG_META[tag];
  return (
    <span
      className={`rounded-full font-semibold whitespace-nowrap ${small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.color}33` }}
    >
      {tag}
    </span>
  );
}

// ── expanded row detail ───────────────────────────────────────────────────────

function ExpandedSKU({ sku, colSpan }: { sku: XeonSKU; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan}
        style={{ background: "rgba(56,189,248,0.04)", borderBottom: "1px solid rgba(56,189,248,0.12)" }}>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

          {/* Workload fit cards */}
          {sku.tags.map(tag => {
            const m = TAG_META[tag];
            return (
              <div key={tag} className="rounded-xl p-4"
                style={{ background: m.bg, border: `1px solid ${m.color}33` }}>
                <p className="text-xs font-bold mb-1" style={{ color: m.color }}>{tag}</p>
                <p className="text-xs text-white/55 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}

          {/* Full spec breakdown */}
          <div className="rounded-xl border border-white/[0.07] overflow-hidden">
            {[
              ["Model",          `Intel Xeon ${sku.model}`],
              ["Cores",          `${sku.cores}C (P-core Lion Cove)`],
              ["Cache",          `${sku.cacheMB} MB L3`],
              ["Base Freq",      `${sku.baseFreqGHz} GHz`],
              ["TDP",            `${sku.tdpW} W`],
              ["List Price",     `$${sku.listPriceUSD.toLocaleString()}`],
              ["SPECrate INT pk", sku.intPeak2S?.toLocaleString() ?? "—"],
              ["SPECrate FP pk",  sku.fpPeak2S?.toLocaleString() ?? "—"],
              ["SIR Perf/$K",    sku.sirPerfPerK?.toFixed(1) ?? "—"],
              ["SIR Perf/Core",  sku.sirPerfPerCore?.toFixed(2) ?? "—"],
            ].map(([label, val], i) => (
              <div key={label} className={`flex justify-between px-3 py-1.5 text-xs ${i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.04]"}`}>
                <span className="text-white/35">{label}</span>
                <span className="text-white/75 font-mono">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── main detail view ──────────────────────────────────────────────────────────

type SortCol = "cores" | "tdp" | "price" | "value" | "perfCore" | "intPeak" | "fpPeak";

export function Xeon6SPDetailView({ onBack }: { onBack: () => void }) {
  const [tagFilter, setTagFilter] = useState<WorkloadTag | null>(null);
  const [sortCol, setSortCol]     = useState<SortCol>("cores");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ALL_TAGS = Object.keys(TAG_META) as WorkloadTag[];

  const filtered = useMemo(() =>
    tagFilter ? XEON6_SP_SKUS.filter(s => s.tags.includes(tagFilter)) : XEON6_SP_SKUS,
    [tagFilter]
  );

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const get = (s: XeonSKU): number => ({
      cores:    s.cores,
      tdp:      s.tdpW,
      price:    s.listPriceUSD,
      value:    s.sirPerfPerK ?? -1,
      perfCore: s.sirPerfPerCore ?? -1,
      intPeak:  s.intPeak2S ?? -1,
      fpPeak:   s.fpPeak2S ?? -1,
    }[sortCol] ?? 0);
    const cmp = get(a) - get(b);
    return sortDir === "asc" ? cmp : -cmp;
  }), [filtered, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-white/20 ml-1 text-[10px]">↕</span>;
    return <span className="ml-1 text-[10px]" style={{ color: "#38bdf8" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const COLS = 9;

  // Summary stats
  const benchmarked = XEON6_SP_SKUS.filter(s => s.intPeak2S !== null);
  const bestValue   = [...benchmarked].sort((a, b) => (b.sirPerfPerK ?? 0) - (a.sirPerfPerK ?? 0))[0];
  const bestCore    = [...benchmarked].sort((a, b) => (b.sirPerfPerCore ?? 0) - (a.sirPerfPerCore ?? 0))[0];
  const bestThrput  = [...benchmarked].sort((a, b) => (b.intPeak2S ?? 0) - (a.intPeak2S ?? 0))[0];

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(170deg, #020c1f 0%, #040d20 50%, #020c1f 100%)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-8 pb-12">

        {/* ── breadcrumb + back ── */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Silicon
          </button>
          <span className="text-white/15">/</span>
          <span className="text-sm font-semibold" style={{ color: "#38bdf8" }}>Xeon® 6 SP — SKU Catalog</span>
        </div>

        {/* ── header ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-3">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38bdf8" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#38bdf8cc" }}>
              Intel® Xeon® 6 — Scalable Performance · Granite Rapids
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">SKU Catalog &amp; Workload Fit</h1>
          <p className="mt-1.5 text-base text-white/40 max-w-2xl">
            {XEON6_SP_SKUS.length} SKUs · {benchmarked.length} with SPEC CPU2017 benchmarks ·
            2S SPECrate2017 · SIR 17 performance index
          </p>
        </div>

        {/* ── top-picks strip ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Best Value",         sku: bestValue,  metric: `${bestValue?.sirPerfPerK?.toFixed(0)} SIR/$K`, sub: "maximum perf-per-dollar",    color: "#fbbf24" },
            { label: "Highest Throughput", sku: bestThrput, metric: `${bestThrput?.intPeak2S?.toLocaleString()} INT pk`, sub: "peak 2S SPECrate INT",  color: "#38bdf8" },
            { label: "Best Per-Core",      sku: bestCore,   metric: `${bestCore?.sirPerfPerCore?.toFixed(1)} SIR/core`, sub: "low-latency inference",  color: "#a78bfa" },
          ].map(({ label, sku, metric, sub, color }) => (
            <div key={label} className="rounded-xl border border-white/[0.07] p-5"
              style={{ background: "linear-gradient(135deg, #050f22, #071535)", boxShadow: `0 0 40px rgba(0,0,0,0.4)` }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-2">{label}</p>
              <p className="text-xl font-black text-white leading-tight">{sku?.model}</p>
              <p className="text-2xl font-black mt-0.5" style={{ color }}>{metric}</p>
              <p className="text-xs text-white/35 mt-1">{sub} · {sku?.cores}C / {sku?.tdpW}W</p>
            </div>
          ))}
        </div>

        {/* ── workload filter chips ── */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setTagFilter(null)}
            className="rounded-full px-3 py-1 text-xs font-medium transition-all"
            style={{
              background: tagFilter === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              color: tagFilter === null ? "white" : "rgba(255,255,255,0.4)",
              border: `1px solid ${tagFilter === null ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            All SKUs ({XEON6_SP_SKUS.length})
          </button>
          {ALL_TAGS.map(tag => {
            const m = TAG_META[tag];
            const count = XEON6_SP_SKUS.filter(s => s.tags.includes(tag)).length;
            const active = tagFilter === tag;
            return (
              <button key={tag} onClick={() => setTagFilter(active ? null : tag)}
                className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                style={{
                  background: active ? m.bg : "rgba(255,255,255,0.03)",
                  color: active ? m.color : "rgba(255,255,255,0.35)",
                  border: `1px solid ${active ? m.color + "55" : "rgba(255,255,255,0.07)"}`,
                }}>
                {tag} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── table ── */}
        <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "rgba(5,15,34,0.85)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="w-8 px-3 py-3" />
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35">SKU</th>
                  {([
                    ["cores",    "Cores"],
                    ["tdp",      "TDP (W)"],
                    ["price",    "List ($)"],
                    ["value",    "SIR / $K ↑"],
                    ["perfCore", "SIR / Core"],
                    ["intPeak",  "INT Peak 2S"],
                    ["fpPeak",   "FP Peak 2S"],
                  ] as [SortCol, string][]).map(([col, lbl]) => (
                    <th key={col} onClick={() => toggleSort(col)}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35 cursor-pointer select-none whitespace-nowrap">
                      {lbl}<SortIcon col={col} />
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/35">Workload Fit</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sku, idx) => {
                  const isExpanded = expandedId === sku.model;
                  const rowBg = idx % 2 === 0 ? "rgba(56,189,248,0.02)" : "rgba(56,189,248,0.045)";
                  return (
                    <>
                      <tr key={sku.model}
                        className="cursor-pointer transition-colors"
                        style={{ background: rowBg, borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.10)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                        onClick={() => setExpandedId(isExpanded ? null : sku.model)}
                      >
                        <td className="px-3 py-3 text-center">
                          <span className="text-[10px] inline-block transition-transform duration-150"
                            style={{ color: "#38bdf8", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-white/90 text-sm">Xeon {sku.model}</div>
                          <div className="text-[11px] text-white/30 font-mono">{sku.cacheMB}MB L3 · {sku.baseFreqGHz}GHz base</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm font-semibold" style={{ color: "#38bdf8" }}>{sku.cores}</td>
                        <td className="px-4 py-3 text-white/55 text-xs font-mono">{sku.tdpW}</td>
                        <td className="px-4 py-3 text-white/55 text-xs font-mono">${sku.listPriceUSD.toLocaleString()}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <ScoreBar value={sku.sirPerfPerK} max={MAX_PERF_PER_K} color="#fbbf24" />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <ScoreBar value={sku.sirPerfPerCore} max={MAX_PERF_CORE} color="#a78bfa" />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <Bar value={sku.intPeak2S} max={MAX_INT_PEAK} color="#38bdf8" />
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <Bar value={sku.fpPeak2S} max={MAX_FP_PEAK} color="#f472b6" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {sku.tags.map(t => <TagPill key={t} tag={t} small />)}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <ExpandedSKU key={`${sku.model}-exp`} sku={sku} colSpan={COLS + 1} />}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-3 text-xs text-white/20 text-right">
          Source: Intel ARK + SPEC CPU2017 Rate 2-socket · SIR = System Intel Ranking
        </p>
      </div>
    </div>
  );
}
