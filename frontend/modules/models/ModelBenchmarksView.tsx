"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { fetchPlatforms, fetchRecords } from "@/modules/inference/benchmarks/api";
import { DEFAULT_HARDWARE, SERVING_ENGINES, type BenchmarkRecord } from "@/modules/inference/benchmarks/types";
import { models, CATEGORY_ORDER, type Model } from "./data";
import { useTheme } from "@/contexts/ThemeContext";
import { BenchmarkAnalysis } from "./BenchmarkAnalysis";
import { MultiSelect } from "./MultiSelect";
import { selectStyle } from "./benchmarks-ui";
import { CATEGORY_STYLE, badgeTextColor } from "./category-style";
import { useRegisterExport } from "@/contexts/ExportContext";
import { exportBenchmarksToExcel } from "./export-benchmarks";

const ALL_RECORDS_LIMIT = 2000;

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 min-w-[140px]"
        style={selectStyle(theme === "dark")}
      >
        {children}
      </select>
    </div>
  );
}

/** Editable "TTFT ≤ 1100 ms" / "Tokens/sec/user > 9"-style condition — an operator
 *  dropdown plus a numeric threshold, used to configure the Gold SLA gate. */
function ConditionField({ label, unit, op, value, onOpChange, onValueChange }: {
  label: string; unit?: string; op: CompareOp; value: number;
  onOpChange: (op: CompareOp) => void; onValueChange: (value: number) => void;
}) {
  const { theme } = useTheme();
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-semibold text-white/45 whitespace-nowrap">{label}</span>
      <select
        value={op}
        onChange={e => onOpChange(e.target.value as CompareOp)}
        className="py-1 px-1.5 text-xs rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={selectStyle(theme === "dark")}
      >
        {(Object.keys(COMPARE_OP_SYMBOL) as CompareOp[]).map(o => (
          <option key={o} value={o}>{COMPARE_OP_SYMBOL[o]}</option>
        ))}
      </select>
      <input
        type="number"
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        className="w-16 py-1 px-2 text-xs rounded-md focus:outline-none"
        style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
      />
      {unit && <span className="text-[10px] text-white/30">{unit}</span>}
    </div>
  );
}

/** Best-effort match of an uploaded benchmark `model` string against a catalog entry. */
export function findCatalogModel(rowModel: string): Model | undefined {
  const needle = rowModel.trim().toLowerCase();
  if (!needle) return undefined;
  return models.find(m => {
    const hfId = m.hfId.toLowerCase();
    return hfId === needle || hfId.includes(needle) || needle.includes(hfId);
  });
}

export interface JoinedRow { record: BenchmarkRecord; model: Model }

// Golden-config SLA gate: the user sets a condition on TTFT and on tokens/sec/user
// (operator + threshold each); a row must clear both before it's even eligible. Among
// rows that clear the gate, the golden pick maximizes concurrency and input tokens — the
// two levers that drive deployment cost down (higher concurrency per node means fewer
// nodes; longer input tokens means a harder, more representative workload was still
// sustained within the SLA).
export type CompareOp = "<" | "<=" | ">" | ">=" | "==";

export const COMPARE_OP_SYMBOL: Record<CompareOp, string> = { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "==": "=" };

export const DEFAULT_GOLD_TTFT_OP: CompareOp = "<=";
export const DEFAULT_GOLD_TTFT_VALUE = 1100;
export const DEFAULT_GOLD_TOK_OP: CompareOp = ">";
export const DEFAULT_GOLD_TOK_VALUE = 9;

export interface GoldSlaLevers {
  ttftOp: CompareOp; ttftValue: number;
  tokOp: CompareOp; tokValue: number;
}

function compareValue(value: number, op: CompareOp, threshold: number): boolean {
  switch (op) {
    case "<":  return value < threshold;
    case "<=": return value <= threshold;
    case ">":  return value > threshold;
    case ">=": return value >= threshold;
    case "==": return value === threshold;
  }
}

function passesGoldSla(r: BenchmarkRecord, levers: GoldSlaLevers): boolean {
  if (r.mean_ttft_ms == null || r.interactivity_tokens_per_sec_per_user == null) return false;
  return compareValue(r.mean_ttft_ms, levers.ttftOp, levers.ttftValue) &&
    compareValue(r.interactivity_tokens_per_sec_per_user, levers.tokOp, levers.tokValue);
}

/** For each (model, platform) pair, the golden row is the one that clears the SLA gate
 *  and maximizes concurrency, then input tokens as the tiebreak. Pairs with no
 *  SLA-passing row are excluded. */
function computeGoldenRows(rowsIn: JoinedRow[], levers: GoldSlaLevers): JoinedRow[] {
  const groups = new Map<string, JoinedRow[]>();
  for (const r of rowsIn) {
    if (r.record.concurrency == null || !passesGoldSla(r.record, levers)) continue;
    const key = `${r.model.hfId}|${r.record.platform}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(r); else groups.set(key, [r]);
  }

  const golden: JoinedRow[] = [];
  for (const groupRows of groups.values()) {
    golden.push(groupRows.reduce((best, r) => {
      if (r.record.concurrency! !== best.record.concurrency!) return r.record.concurrency! > best.record.concurrency! ? r : best;
      const rInput = r.record.input_tokens ?? -Infinity;
      const bestInput = best.record.input_tokens ?? -Infinity;
      if (rInput !== bestInput) return rInput > bestInput ? r : best;
      return r.record.mean_ttft_ms! < best.record.mean_ttft_ms! ? r : best;
    }));
  }

  return golden.sort((a, b) => a.model.name.localeCompare(b.model.name) || a.record.platform.localeCompare(b.record.platform));
}

type SortCol = "input_tokens" | "output_tokens" | "concurrency" | "mean_ttft_ms" | "interactivity_tokens_per_sec_per_user" | "request_throughput";
type SortDir = "asc" | "desc";

export const DEFAULT_TTFT_THRESHOLD_MS = 2000;
export const DEFAULT_TOK_PER_USER_THRESHOLD = 10;

export function ModelBenchmarksView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [modelFilter, setModelFilter]       = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [engineFilter, setEngineFilter]     = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [inputTokFilter, setInputTokFilter]   = useState("");
  const [outputTokFilter, setOutputTokFilter] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const [sortCol, setSortCol] = useState<SortCol | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [goldMode, setGoldMode] = useState(false);
  const [goldTtftOp, setGoldTtftOp] = useState<CompareOp>(DEFAULT_GOLD_TTFT_OP);
  const [goldTtftValue, setGoldTtftValue] = useState(DEFAULT_GOLD_TTFT_VALUE);
  const [goldTokOp, setGoldTokOp] = useState<CompareOp>(DEFAULT_GOLD_TOK_OP);
  const [goldTokValue, setGoldTokValue] = useState(DEFAULT_GOLD_TOK_VALUE);
  const goldLevers: GoldSlaLevers = { ttftOp: goldTtftOp, ttftValue: goldTtftValue, tokOp: goldTokOp, tokValue: goldTokValue };
  const goldConditionText = `TTFT ${COMPARE_OP_SYMBOL[goldTtftOp]} ${goldTtftValue}ms and tokens/sec/user ${COMPARE_OP_SYMBOL[goldTokOp]} ${goldTokValue}`;

  const [records, setRecords] = useState<BenchmarkRecord[] | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(DEFAULT_HARDWARE);

  // Full, unfiltered snapshot — used to derive filter facets (distinct token
  // lengths, TTFT / tok-per-user bounds) and as the data source for the
  // cross-model Analysis panel.
  const [allRecords, setAllRecords] = useState<BenchmarkRecord[] | null>(null);

  useEffect(() => {
    fetchPlatforms()
      .then(ps => setPlatforms(Array.from(new Set([...DEFAULT_HARDWARE, ...ps])).sort()))
      .catch(() => setPlatforms(DEFAULT_HARDWARE));
    fetchRecords({ model: "", serving_engine: "", platform: "", input_tokens: "", output_tokens: "", batch_size: "" }, ALL_RECORDS_LIMIT)
      .then(res => setAllRecords(res.rows))
      .catch(() => setAllRecords([]));
  }, []);

  const { inputTokenOptions, outputTokenOptions } = useMemo(() => {
    const inSet = new Set<number>();
    const outSet = new Set<number>();
    (allRecords ?? []).forEach(r => {
      if (r.input_tokens !== null) inSet.add(r.input_tokens);
      if (r.output_tokens !== null) outSet.add(r.output_tokens);
    });
    return {
      inputTokenOptions: Array.from(inSet).sort((a, b) => a - b),
      outputTokenOptions: Array.from(outSet).sort((a, b) => a - b),
    };
  }, [allRecords]);

  const availableModels = useMemo(
    () => (categoryFilter ? models.filter(m => m.category === categoryFilter) : models),
    [categoryFilter],
  );

  // Model filtering happens client-side (multi-select isn't expressible as the
  // backend's single `model` ilike param), so the record fetch omits it.
  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    setError(null);
    fetchRecords({
      model: "",
      serving_engine: engineFilter,
      platform: platformFilter,
      input_tokens: inputTokFilter,
      output_tokens: outputTokFilter,
      batch_size: "",
    }, 500)
      .then(res => { if (!cancelled) setRecords(res.rows); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [engineFilter, platformFilter, inputTokFilter, outputTokFilter]);

  const rows: JoinedRow[] = useMemo(() => {
    if (!records) return [];
    let joined = records
      .map(r => ({ record: r, model: findCatalogModel(r.model) }))
      .filter((r): r is JoinedRow => r.model !== undefined)
      .filter(r => !categoryFilter || r.model.category === categoryFilter)
      .filter(r => modelFilter.size === 0 || modelFilter.has(r.model.hfId));

    if (sortCol) {
      joined = [...joined].sort((a, b) => {
        const av = a.record[sortCol] ?? -Infinity;
        const bv = b.record[sortCol] ?? -Infinity;
        return sortDir === "asc" ? av - bv : bv - av;
      });
    }
    return joined;
  }, [records, categoryFilter, modelFilter, sortCol, sortDir]);

  // Gold mode collapses the currently filtered rows to one golden configuration per
  // (model, platform) pair. Toggling it off returns to the normal filtered/sorted view.
  const displayRows: JoinedRow[] = useMemo(
    () => (goldMode ? computeGoldenRows(rows, goldLevers) : rows),
    [rows, goldMode, goldTtftOp, goldTtftValue, goldTokOp, goldTokValue],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  );

  const allJoinedRows: JoinedRow[] = useMemo(() => {
    if (!allRecords) return [];
    return allRecords
      .map(r => ({ record: r, model: findCatalogModel(r.model) }))
      .filter((r): r is JoinedRow => r.model !== undefined);
  }, [allRecords]);

  // Register Excel export handler - exports currently visible rows
  const exportHandler = useCallback(
    async () => {
      await exportBenchmarksToExcel(rows);
    },
    [rows]
  );

  useRegisterExport(
    rows.length > 0 ? exportHandler : null,
    "Export Benchmarks to Excel"
  );

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortHeader({ col, children, color }: { col: SortCol; children: React.ReactNode; color?: { dark: string; light: string } }) {
    const active = sortCol === col;
    const baseColor = color ? (isDark ? color.dark : color.light) : (isDark ? "rgba(255,255,255,0.6)" : "rgba(51,65,85,0.8)");
    const activeColor = color ? (isDark ? color.dark : color.light) : (isDark ? "#38bdf8" : "#0284c7");
    return (
      <th
        onClick={() => toggleSort(col)}
        className="w-16 px-1.5 py-1.5 text-right font-bold text-[10px] uppercase tracking-[0.08em] cursor-pointer select-none whitespace-nowrap transition-colors hover:opacity-90"
        style={{ color: active ? activeColor : baseColor }}
      >
        <div className="flex items-center justify-end gap-1">
          {color && <span className="w-1 h-1 rounded-full" style={{ background: isDark ? color.dark : color.light }} />}
          {children}
          <span className="text-[9px]" style={{ opacity: active ? 1 : 0.4 }}>
            {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </div>
      </th>
    );
  }

  const modelOptions = availableModels.map(m => ({ value: m.hfId, label: m.name }));

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <div
        className="rounded-2xl border border-white/[0.07] p-5 mb-6"
        style={{ background: "var(--dm-filterbar-bg, #0a1730)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        {/* Category chip row — same look as the Model → Catalog tab */}
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/[0.06]">
          {CATEGORY_ORDER.map(c => {
            const col = CATEGORY_STYLE[c];
            const count = models.filter(m => m.category === c).length;
            const active = categoryFilter === c;
            return (
              <button
                key={c}
                onClick={() => { setCategoryFilter(active ? "" : c); setModelFilter(new Set()); }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? col.badge : "var(--dm-surface-a)",
                  color: active ? badgeTextColor(isDark, col.badgeText) : "var(--dm-txt-faint)",
                  border: `1px solid ${active ? col.accent + "55" : "var(--dm-border-a)"}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
                {c}
                <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <MultiSelect label="Model" options={modelOptions} selected={modelFilter} onChange={setModelFilter} allLabel="All models" />
          <Select label="Serving Engine" value={engineFilter} onChange={setEngineFilter}>
            <option value="">All engines</option>
            {SERVING_ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Select label="Platform" value={platformFilter} onChange={setPlatformFilter}>
            <option value="">All platforms</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select label="Input Tokens" value={inputTokFilter} onChange={setInputTokFilter}>
            <option value="">All</option>
            {inputTokenOptions.map(t => <option key={t} value={t}>{t.toLocaleString()}</option>)}
          </Select>
          <Select label="Output Tokens" value={outputTokFilter} onChange={setOutputTokFilter}>
            <option value="">All</option>
            {outputTokenOptions.map(t => <option key={t} value={t}>{t.toLocaleString()}</option>)}
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setAnalysisOpen(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8" }}
            >
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M2 13V8M6 13V3M10 13V6M14 13v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Analyze
            </button>
            <div
              className="flex items-center gap-3 rounded-lg pl-3 pr-2 py-1.5"
              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)" }}
            >
              <ConditionField label="TTFT" unit="ms" op={goldTtftOp} value={goldTtftValue} onOpChange={setGoldTtftOp} onValueChange={setGoldTtftValue} />
              <ConditionField label="Tok/s/user" op={goldTokOp} value={goldTokValue} onOpChange={setGoldTokOp} onValueChange={setGoldTokValue} />
              <button
                onClick={() => setGoldMode(v => !v)}
                title={`Show one golden configuration per model × platform — max concurrency and input tokens with ${goldConditionText}`}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                style={goldMode
                  ? { background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.5)", color: "#fbbf24" }
                  : { background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-faint)" }}
              >
                <Trophy className="w-4 h-4" strokeWidth={1.8} fill={goldMode ? "#fbbf24" : "none"} />
                Gold
              </button>
            </div>
          </div>
        </div>

        {goldMode && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-[11px]" style={{ color: "#fbbf24" }}>
              Showing the golden configuration only — max concurrency and input tokens per model × platform with {goldConditionText}. Click Gold again for the full list.
            </span>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: "var(--dm-table-bg, #0a1730)",
          borderColor: "rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.04)"
        }}
      >
        {records === null && !error && (
          <div className="py-12 text-center text-white/30 text-sm">Loading benchmark data…</div>
        )}
        {error && (
          <div className="py-12 text-center text-danger text-sm">{error}</div>
        )}
        {records !== null && !error && displayRows.length === 0 && (
          <div className="py-12 text-center text-white/30 text-sm">
            {goldMode && rows.length > 0
              ? `No row meets the golden SLA gate (${goldConditionText}) for this filter combination.`
              : "No benchmark data for this filter combination."}
          </div>
        )}
        {displayRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse table-fixed" style={{ minWidth: "1400px" }}>
              <thead>
                <tr style={{
                  background: isDark
                    ? "linear-gradient(to bottom, #0e1d38 0%, #0a1730 100%)"
                    : "linear-gradient(to bottom, #e2e8f0 0%, #cbd5e1 100%)",
                  borderBottom: isDark ? "2px solid rgba(56,189,248,0.15)" : "2px solid rgba(100,116,139,0.2)"
                }}>
                  <th className="w-48 px-2 py-1.5 text-left font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(51,65,85,0.8)" }}>Model</th>
                  <th className="w-20 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(51,65,85,0.8)" }}>Cat</th>
                  <th className="w-16 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(51,65,85,0.8)" }}>Engine</th>
                  <th className="w-32 px-1.5 py-1.5 text-left font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(51,65,85,0.8)" }}>Platform</th>
                  <SortHeader col="input_tokens">In Tok</SortHeader>
                  <SortHeader col="output_tokens">Out Tok</SortHeader>
                  <SortHeader col="concurrency">Conc</SortHeader>
                  <SortHeader col="mean_ttft_ms" color={{ dark: "#fbbf24", light: "#d97706" }}>TTFT</SortHeader>
                  <th className="w-20 px-1.5 py-1.5 text-right font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}>
                    <div className="flex items-center justify-end gap-1">
                      <span className="w-1 h-1 rounded-full" style={{ background: isDark ? "#a78bfa" : "#7c3aed" }} />
                      TPOT
                    </div>
                  </th>
                  <th className="w-20 px-1.5 py-1.5 text-right font-bold text-[10px] uppercase tracking-[0.08em]" style={{ color: isDark ? "#34d399" : "#059669" }}>
                    <div className="flex items-center justify-end gap-1">
                      <span className="w-1 h-1 rounded-full" style={{ background: isDark ? "#34d399" : "#059669" }} />
                      Out/s
                    </div>
                  </th>
                  <SortHeader col="interactivity_tokens_per_sec_per_user" color={{ dark: "#38bdf8", light: "#0284c7" }}>Tok/u</SortHeader>
                  <SortHeader col="request_throughput" color={{ dark: "#f87171", light: "#dc2626" }}>Req/s</SortHeader>
                </tr>
              </thead>
              <tbody>
                {displayRows.map(({ record: r, model: m }, idx) => {
                  const col = CATEGORY_STYLE[m.category];
                  return (
                    <tr
                      key={r.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                      style={{
                        background: idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                        borderBottom: "1px solid rgba(255,255,255,0.04)"
                      }}
                    >
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-0.5 h-7 rounded-full flex-shrink-0"
                            style={{ background: col.accent, opacity: 0.6 }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 font-semibold text-[10px] leading-tight truncate" style={{ color: isDark ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.9)" }}>
                              {goldMode && <Trophy className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "#fbbf24" }} strokeWidth={2} fill="#fbbf24" />}
                              <span className="truncate">{m.name}</span>
                            </div>
                            <div className="text-[8px] font-mono mt-0.5 truncate" style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(100,116,139,0.6)" }}>{m.hfId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-1.5 py-1 text-[9px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>
                        {m.category.split(" ")[0]}
                      </td>
                      <td className="px-1.5 py-1 text-[9px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>
                        {r.serving_engine || "vLLM"}
                      </td>
                      <td className="px-1.5 py-1 text-[9px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "rgba(51,65,85,0.9)" }}>{r.platform}</td>
                      <td className="px-1.5 py-1 font-mono text-[9px] text-center" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>{r.input_tokens?.toLocaleString() ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}</td>
                      <td className="px-1.5 py-1 font-mono text-[9px] text-center" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>{r.output_tokens?.toLocaleString() ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}</td>
                      <td className="px-1.5 py-1 font-mono text-[9px] text-center" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>{r.concurrency ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}</td>
                      <td className="px-1.5 py-1 text-right">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: isDark ? "#fbbf24" : "#d97706" }}>
                          {r.mean_ttft_ms?.toFixed(1) ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}>
                          {r.mean_tpot_ms?.toFixed(1) ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: isDark ? "#34d399" : "#059669" }}>
                          {r.output_token_throughput?.toFixed(1) ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: isDark ? "#38bdf8" : "#0284c7" }}>
                          {r.interactivity_tokens_per_sec_per_user?.toFixed(1) ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}
                        </span>
                      </td>
                      <td className="px-1.5 py-1 text-right">
                        <span className="font-mono text-[10px] font-semibold" style={{ color: isDark ? "#f87171" : "#dc2626" }}>
                          {r.request_throughput?.toFixed(2) ?? <span style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(148,163,184,0.5)" }}>—</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {analysisOpen && (
        <BenchmarkAnalysis
          allRows={allJoinedRows}
          ttftThreshold={DEFAULT_TTFT_THRESHOLD_MS}
          tokPerUserThreshold={DEFAULT_TOK_PER_USER_THRESHOLD}
          onClose={() => setAnalysisOpen(false)}
        />
      )}
    </section>
  );
}
