"use client";

import { useState, useMemo } from "react";
import {
  XEON6_SP_SKUS, TAG_META, MAX_INT_PEAK, MAX_FP_PEAK, MAX_PERF_PER_K, MAX_PERF_CORE,
  type XeonSKU, type WorkloadTag,
} from "./xeon6sp-data";


// ── mini bars ────────────────────────────────────────────────────────────────

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

// ── expanded row ──────────────────────────────────────────────────────────────

function ExpandedSKU({ sku, colSpan }: { sku: XeonSKU; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan}
        style={{ background: "rgba(56,189,248,0.04)", borderBottom: "1px solid rgba(56,189,248,0.12)" }}>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <div className="rounded-xl border border-white/[0.07] overflow-hidden">
            {([
              ["Model",           `Intel Xeon ${sku.model}`],
              ["Cores",           `${sku.cores}C (P-core Lion Cove)`],
              ["Cache",           `${sku.cacheMB} MB L3`],
              ["Base Freq",       `${sku.baseFreqGHz} GHz`],
              ["TDP",             `${sku.tdpW} W`],
              ["List Price",      `$${sku.listPriceUSD.toLocaleString()}`],
              ["INT Peak 2S",     sku.intPeak2S?.toLocaleString() ?? "—"],
              ["FP Peak 2S",      sku.fpPeak2S?.toLocaleString() ?? "—"],
              ["INT Base 2S",     sku.intBase2S?.toLocaleString() ?? "—"],
              ["FP Base 2S",      sku.fpBase2S?.toLocaleString() ?? "—"],
              ["SIR Perf/$K",     sku.sirPerfPerK?.toFixed(1) ?? "—"],
              ["SIR Perf/Core",   sku.sirPerfPerCore?.toFixed(2) ?? "—"],
            ] as [string, string][]).map(([label, val], i) => (
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

// ── Condition editor types & constants ────────────────────────────────────────

type NumAttrKey =
  | "cores" | "cacheMB" | "baseFreqGHz" | "tdpW" | "listPriceUSD"
  | "sirPerfPerK" | "sirPerfPerCore"
  | "intPeak2S" | "fpPeak2S" | "intBase2S" | "fpBase2S";

type NumOp = ">=" | "<=" | "=" | "!=" | ">" | "<" | "in" | "not in" | "between";
type StrOp = "contains" | "not contains" | "=" | "!=" | "starts with" | "ends with";
type TagOp = "includes" | "excludes";

interface NumCond { id: string; attr: NumAttrKey;  op: NumOp; value: string; value2: string; }
interface StrCond { id: string; attr: "model";     op: StrOp; value: string; }
interface TagCond { id: string; attr: "tags";      op: TagOp; value: string; }
type Condition = NumCond | StrCond | TagCond;

interface AttrMeta {
  key: NumAttrKey | "model" | "tags";
  label: string;
  unit: string;
  type: "num" | "str" | "tags";
}

const ATTR_META: AttrMeta[] = [
  { key: "model",          label: "Model (SKU)",    unit: "",    type: "str"  },
  { key: "cores",          label: "Cores",          unit: "",    type: "num"  },
  { key: "cacheMB",        label: "Cache",          unit: "MB",  type: "num"  },
  { key: "baseFreqGHz",    label: "Base Freq",      unit: "GHz", type: "num"  },
  { key: "tdpW",           label: "TDP",            unit: "W",   type: "num"  },
  { key: "listPriceUSD",   label: "List Price",     unit: "$",   type: "num"  },
  { key: "sirPerfPerK",    label: "SIR / $K",       unit: "",    type: "num"  },
  { key: "sirPerfPerCore", label: "SIR / Core",     unit: "",    type: "num"  },
  { key: "intPeak2S",      label: "INT Peak 2S",    unit: "",    type: "num"  },
  { key: "fpPeak2S",       label: "FP Peak 2S",     unit: "",    type: "num"  },
  { key: "intBase2S",      label: "INT Base 2S",    unit: "",    type: "num"  },
  { key: "fpBase2S",       label: "FP Base 2S",     unit: "",    type: "num"  },
  { key: "tags",           label: "Workload Tag",   unit: "",    type: "tags" },
];

const NUM_OPS: { op: NumOp; label: string }[] = [
  { op: ">=",      label: "≥  —  greater than or equal" },
  { op: "<=",      label: "≤  —  less than or equal"    },
  { op: "=",       label: "=  —  exactly equal"         },
  { op: "!=",      label: "≠  —  not equal"             },
  { op: ">",       label: ">  —  strictly greater"      },
  { op: "<",       label: "<  —  strictly less"         },
  { op: "in",      label: "∈  —  one of (csv)"          },
  { op: "not in",  label: "∉  —  none of (csv)"         },
  { op: "between", label: "⟷  —  between (inclusive)"   },
];

const STR_OPS: { op: StrOp; label: string }[] = [
  { op: "contains",     label: "contains"          },
  { op: "not contains", label: "does not contain"  },
  { op: "=",            label: "exactly equals"    },
  { op: "!=",           label: "not equals"        },
  { op: "starts with",  label: "starts with"       },
  { op: "ends with",    label: "ends with"         },
];

// ── Condition evaluation ──────────────────────────────────────────────────────

function evalCondition(sku: XeonSKU, cond: Condition): boolean {
  if (cond.attr === "tags") {
    if (!cond.value) return true;
    const has = sku.tags.includes(cond.value as WorkloadTag);
    return cond.op === "includes" ? has : !has;
  }

  if (cond.attr === "model") {
    if (!cond.value.trim()) return true;
    const s = sku.model.toLowerCase();
    const v = cond.value.toLowerCase().trim();
    switch (cond.op) {
      case "contains":     return s.includes(v);
      case "not contains": return !s.includes(v);
      case "=":            return s === v;
      case "!=":           return s !== v;
      case "starts with":  return s.startsWith(v);
      case "ends with":    return s.endsWith(v);
    }
  }

  // Numeric
  const numCond = cond as NumCond;
  const raw = sku[numCond.attr] as number | null;

  if (numCond.op === "between") {
    const lo = parseFloat(numCond.value);
    const hi = parseFloat(numCond.value2);
    if (isNaN(lo) || isNaN(hi)) return true;
    if (raw === null) return false;
    return raw >= lo && raw <= hi;
  }

  if (numCond.op === "in" || numCond.op === "not in") {
    if (!numCond.value.trim()) return true;
    const vals = numCond.value.split(",").map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    if (vals.length === 0) return true;
    const found = raw !== null && vals.some(v => Math.abs(raw - v) < 0.001);
    return numCond.op === "in" ? found : !found;
  }

  if (!numCond.value.trim()) return true;
  const target = parseFloat(numCond.value);
  if (isNaN(target)) return true;
  if (raw === null) return numCond.op === "!=" ? true : false;

  switch (numCond.op) {
    case ">=": return raw >= target;
    case "<=": return raw <= target;
    case "=":  return Math.abs(raw - target) < 0.001;
    case "!=": return Math.abs(raw - target) >= 0.001;
    case ">":  return raw > target;
    case "<":  return raw < target;
    default:   return true;
  }
}

function isComplete(cond: Condition): boolean {
  if (cond.attr === "tags")  return !!cond.value;
  if (cond.attr === "model") return !!cond.value.trim();
  const c = cond as NumCond;
  if (c.op === "between")  return !!c.value.trim() && !isNaN(parseFloat(c.value)) && !!c.value2.trim() && !isNaN(parseFloat(c.value2));
  if (c.op === "in" || c.op === "not in") {
    return c.value.split(",").some(v => !isNaN(parseFloat(v.trim())));
  }
  return !!c.value.trim() && !isNaN(parseFloat(c.value));
}

function mkId() { return Math.random().toString(36).slice(2, 9); }

function defaultCondition(): NumCond {
  return { id: mkId(), attr: "cores", op: ">=", value: "", value2: "" };
}

// ── Condition label formatter ─────────────────────────────────────────────────

function conditionLabel(cond: Condition): string {
  const meta = ATTR_META.find(a => a.key === cond.attr)!;
  const aLbl = meta.label + (meta.unit ? ` (${meta.unit})` : "");
  if (cond.attr === "tags")  return `Tag ${cond.op} "${cond.value}"`;
  if (cond.attr === "model") return `Model ${cond.op} "${cond.value}"`;
  const nc = cond as NumCond;
  if (nc.op === "between")  return `${aLbl}  ${nc.value} – ${nc.value2}`;
  if (nc.op === "in")       return `${aLbl}  ∈ {${nc.value}}`;
  if (nc.op === "not in")   return `${aLbl}  ∉ {${nc.value}}`;
  return `${aLbl}  ${nc.op}  ${nc.value}`;
}

// ── Shared input styles ───────────────────────────────────────────────────────

const SI: React.CSSProperties = {
  background: "#0e1d38",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.85)",
  borderRadius: 6,
  outline: "none",
  fontSize: 12,
  padding: "5px 8px",
  width: "100%",
  colorScheme: "dark",
};

// ── Condition editor sidebar ──────────────────────────────────────────────────

function ConditionEditor({
  conditions, onChange, onRun, onClose,
  pendingCount, matchCount,
}: {
  conditions: Condition[];
  onChange: (cs: Condition[]) => void;
  onRun: () => void;
  onClose: () => void;
  pendingCount: number;
  matchCount: number;
}) {
  const ALL_TAGS = Object.keys(TAG_META) as WorkloadTag[];
  const completeCount = conditions.filter(isComplete).length;
  const hasPending    = pendingCount > 0;

  function add() {
    onChange([...conditions, defaultCondition()]);
  }

  function remove(id: string) {
    onChange(conditions.filter(c => c.id !== id));
  }

  function changeAttr(id: string, attr: string) {
    const meta = ATTR_META.find(a => a.key === attr)!;
    const base = { id };
    if (meta.type === "tags")  onChange(conditions.map(c => c.id === id ? { ...base, attr: "tags"  as const, op: "includes" as TagOp, value: "" } as TagCond : c));
    if (meta.type === "str")   onChange(conditions.map(c => c.id === id ? { ...base, attr: "model" as const, op: "contains" as StrOp, value: "" } as StrCond : c));
    if (meta.type === "num")   onChange(conditions.map(c => c.id === id ? { ...base, attr: attr as NumAttrKey, op: ">=" as NumOp, value: "", value2: "" } as NumCond : c));
  }

  function patch(id: string, delta: Partial<Condition>) {
    onChange(conditions.map(c => c.id === id ? { ...c, ...delta } as Condition : c));
  }

  return (
    <div className="flex flex-col h-full select-none">

      {/* Header — title + Run button + close */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold text-white/90 leading-none">Condition Filter</h3>
          <p className="text-[10px] text-white/28 mt-0.5">AND logic</p>
        </div>

        {/* Run / Apply button — lives here */}
        <button
          onClick={onRun}
          disabled={completeCount === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-shrink-0"
          style={{
            background: completeCount > 0
              ? (hasPending ? "linear-gradient(135deg, #0284c7, #0369a1)" : "rgba(56,189,248,0.10)")
              : "rgba(255,255,255,0.04)",
            color: completeCount > 0
              ? (hasPending ? "#ffffff" : "rgba(56,189,248,0.55)")
              : "rgba(255,255,255,0.18)",
            border: `1px solid ${completeCount > 0
              ? (hasPending ? "rgba(56,189,248,0.55)" : "rgba(56,189,248,0.18)")
              : "rgba(255,255,255,0.06)"}`,
            cursor: completeCount === 0 ? "not-allowed" : "pointer",
            boxShadow: hasPending && completeCount > 0 ? "0 2px 12px rgba(2,132,199,0.40)" : "none",
          }}
        >
          {hasPending && completeCount > 0 ? (
            <>
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <polygon points="2,1 10,6 2,11" fill="currentColor" />
              </svg>
              Run Filter
            </>
          ) : completeCount > 0 ? (
            <>
              <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                <path d="M2 6l2.5 2.5 5.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Applied
            </>
          ) : "Run Filter"}
        </button>

        <button onClick={onClose}
          className="text-white/25 hover:text-white/70 transition-colors text-xl leading-none flex-shrink-0">×</button>
      </div>

      {/* Scrollable conditions list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conditions.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[30px] mb-3 opacity-30">⚗</p>
            <p className="text-[11px] text-white/30 leading-relaxed">
              No conditions yet.<br />Add one below to start narrowing SKUs.
            </p>
            <div className="mt-4 space-y-1 text-[10px] text-white/18">
              <p>e.g.  Base Freq  ≥  2.7</p>
              <p>e.g.  Cores  ∈  48, 64</p>
              <p>e.g.  TDP  ≤  270</p>
              <p>e.g.  Model  contains  6745</p>
            </div>
          </div>
        )}

        {conditions.map((cond, idx) => {
          const meta  = ATTR_META.find(a => a.key === cond.attr)!;
          const done  = isComplete(cond);

          return (
            <div key={cond.id}
              className="rounded-xl p-3 space-y-2"
              style={{
                background: done ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${done ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.07)"}`,
              }}>

              {/* Row label + remove */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: idx === 0 ? "#38bdf8" : "rgba(255,255,255,0.28)" }}>
                  {idx === 0 ? "WHERE" : "AND"}
                </span>
                <button onClick={() => remove(cond.id)}
                  className="text-white/18 hover:text-red-400 transition-colors text-base leading-none">×</button>
              </div>

              {/* Attribute */}
              <select value={cond.attr} onChange={e => changeAttr(cond.id, e.target.value)}
                style={{ ...SI, appearance: "none" as const }}>
                {ATTR_META.map(a => (
                  <option key={a.key} value={a.key}>
                    {a.label}{a.unit ? ` (${a.unit})` : ""}
                  </option>
                ))}
              </select>

              {/* Operator + value(s) */}
              {meta.type === "tags" && (
                <div className="grid grid-cols-2 gap-2">
                  <select value={cond.op} onChange={e => patch(cond.id, { op: e.target.value as TagOp })}
                    style={{ ...SI, appearance: "none" as const }}>
                    <option value="includes">includes</option>
                    <option value="excludes">excludes</option>
                  </select>
                  <select value={cond.value} onChange={e => patch(cond.id, { value: e.target.value })}
                    style={{ ...SI, appearance: "none" as const }}>
                    <option value="">— pick tag —</option>
                    {ALL_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {meta.type === "str" && (
                <div className="space-y-2">
                  <select value={cond.op} onChange={e => patch(cond.id, { op: e.target.value as StrOp })}
                    style={{ ...SI, appearance: "none" as const }}>
                    {STR_OPS.map(o => <option key={o.op} value={o.op}>{o.op}</option>)}
                  </select>
                  <input type="text" value={cond.value}
                    onChange={e => patch(cond.id, { value: e.target.value })}
                    placeholder="e.g. 6745" style={SI} />
                </div>
              )}

              {meta.type === "num" && (() => {
                const nc = cond as NumCond;
                const isBetween = nc.op === "between";
                const isCsv     = nc.op === "in" || nc.op === "not in";
                return (
                  <div className="space-y-2">
                    <select value={nc.op} onChange={e => patch(cond.id, { op: e.target.value as NumOp, value: "", value2: "" } as Partial<NumCond>)}
                      style={{ ...SI, appearance: "none" as const }}>
                      {NUM_OPS.map(o => <option key={o.op} value={o.op}>{o.op}</option>)}
                    </select>

                    {isBetween ? (
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <div>
                          <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-widest">From</label>
                          <input type="text" value={nc.value}
                            onChange={e => patch(cond.id, { value: e.target.value } as Partial<NumCond>)}
                            placeholder="min" style={SI} />
                        </div>
                        <div>
                          <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-widest">To</label>
                          <input type="text" value={nc.value2}
                            onChange={e => patch(cond.id, { value2: e.target.value } as Partial<NumCond>)}
                            placeholder="max" style={SI} />
                        </div>
                      </div>
                    ) : (
                      <div>
                        {isCsv && (
                          <label className="block text-[9px] text-white/25 mb-1 uppercase tracking-widest">
                            Values — comma-separated
                          </label>
                        )}
                        <input type="text" value={nc.value}
                          onChange={e => patch(cond.id, { value: e.target.value } as Partial<NumCond>)}
                          placeholder={isCsv ? "48, 64, 86" : `e.g. ${meta.unit === "GHz" ? "2.7" : meta.unit === "W" ? "270" : "64"}`}
                          style={SI} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status dot */}
              <p className="text-[10px] flex items-center gap-1.5"
                style={{ color: done ? "rgba(52,211,153,0.70)" : "rgba(255,255,255,0.20)" }}>
                <span style={{ fontSize: 8 }}>{done ? "●" : "○"}</span>
                {done ? "ready" : "incomplete — fill in a value"}
              </p>
            </div>
          );
        })}

        {/* Add button */}
        <button onClick={add}
          className="w-full rounded-xl py-2.5 text-xs font-semibold transition-colors"
          style={{
            background: "rgba(56,189,248,0.04)",
            border: "1px dashed rgba(56,189,248,0.22)",
            color: "rgba(56,189,248,0.65)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#38bdf8"; (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.09)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(56,189,248,0.65)"; (e.currentTarget as HTMLElement).style.background = "rgba(56,189,248,0.04)"; }}
        >
          + Add Condition
        </button>
      </div>

      {/* Footer: match count + clear */}
      <div className="px-4 pb-4 pt-3 flex-shrink-0 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-xs">
          <span className="font-bold" style={{ color: "#38bdf8" }}>{matchCount}</span>
          <span className="text-white/30"> / {XEON6_SP_SKUS.length} shown</span>
        </p>
        {conditions.length > 0 && (
          <button onClick={() => onChange([])}
            className="text-[11px] text-white/25 hover:text-white/60 transition-colors">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// ── main detail view ──────────────────────────────────────────────────────────

type SortCol = "cores" | "tdp" | "price" | "value" | "perfCore" | "intPeak" | "fpPeak";

export function Xeon6SPDetailView({ onBack }: { onBack: () => void }) {
  const [tagFilter, setTagFilter]         = useState<WorkloadTag | null>(null);
  const [sortCol, setSortCol]             = useState<SortCol>("cores");
  const [sortDir, setSortDir]             = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  // Staged: conditions = editor state; appliedConditions = what actually filters
  const [conditions, setConditions]           = useState<Condition[]>([]);
  const [appliedConditions, setAppliedConditions] = useState<Condition[]>([]);

  const ALL_TAGS = Object.keys(TAG_META) as WorkloadTag[];

  // Pending = editor has complete conditions not yet applied
  const completePending = conditions.filter(isComplete);
  const completedApplied = appliedConditions.filter(isComplete);
  const hasPending = JSON.stringify(completePending) !== JSON.stringify(completedApplied);

  function runFilter() {
    setAppliedConditions([...conditions]);
  }

  const filtered = useMemo(() => {
    let result = tagFilter
      ? XEON6_SP_SKUS.filter(s => s.tags.includes(tagFilter))
      : XEON6_SP_SKUS;
    const active = appliedConditions.filter(isComplete);
    if (active.length > 0) {
      result = result.filter(sku => active.every(c => evalCondition(sku, c)));
    }
    return result;
  }, [tagFilter, appliedConditions]);

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
    return sortDir === "asc" ? get(a) - get(b) : get(b) - get(a);
  }), [filtered, sortCol, sortDir]);

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="text-white/20 ml-1 text-[10px]">↕</span>;
    return <span className="ml-1 text-[10px]" style={{ color: "#38bdf8" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const COLS = 8;
  const benchmarked   = XEON6_SP_SKUS.filter(s => s.intPeak2S !== null);
  const activeApplied = appliedConditions.filter(isComplete).length;
  const activePending = conditions.filter(isComplete).length;

  function removeAppliedCondition(id: string) {
    const next = conditions.filter(c => c.id !== id);
    setConditions(next);
    setAppliedConditions(next);
  }

  return (
    <div className="min-h-screen flex"
      style={{ background: "linear-gradient(170deg, #020c1f 0%, #040d20 50%, #020c1f 100%)" }}>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="px-6 pt-8 pb-12">

          {/* breadcrumb */}
          <div className="flex items-center gap-3 mb-8">
            <button onClick={onBack}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors">
              <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Silicon
            </button>
            <span className="text-white/15">/</span>
            <span className="text-sm font-semibold" style={{ color: "#38bdf8" }}>Xeon® 6 SP — SKU Catalog</span>
          </div>

          {/* header */}
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

          {/* workload chips + condition toggle */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <button onClick={() => setTagFilter(null)}
              className="rounded-full px-3 py-1 text-xs font-medium transition-all"
              style={{
                background: tagFilter === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                color: tagFilter === null ? "white" : "rgba(255,255,255,0.4)",
                border: `1px solid ${tagFilter === null ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
              }}>
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

            {/* Condition toggle */}
            <button onClick={() => setSidebarOpen(o => !o)}
              className="ml-auto rounded-full px-3.5 py-1 text-xs font-semibold transition-all flex items-center gap-2"
              style={{
                background: sidebarOpen
                  ? "rgba(56,189,248,0.15)"
                  : activeApplied > 0
                    ? "rgba(56,189,248,0.10)"
                    : hasPending && activePending > 0
                      ? "rgba(251,191,36,0.10)"
                      : "rgba(255,255,255,0.05)",
                color: sidebarOpen
                  ? "#38bdf8"
                  : activeApplied > 0
                    ? "#38bdf8"
                    : hasPending && activePending > 0
                      ? "#fbbf24"
                      : "rgba(255,255,255,0.40)",
                border: `1px solid ${
                  sidebarOpen
                    ? "rgba(56,189,248,0.35)"
                    : activeApplied > 0
                      ? "rgba(56,189,248,0.25)"
                      : hasPending && activePending > 0
                        ? "rgba(251,191,36,0.25)"
                        : "rgba(255,255,255,0.09)"
                }`,
              }}>
              <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 shrink-0">
                <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <line x1="6" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {activeApplied > 0
                ? `Filter (${activeApplied} active)`
                : hasPending && activePending > 0
                  ? `Conditions (${activePending} pending)`
                  : "Conditions"}
            </button>
          </div>

          {/* Active condition chips above table */}
          {activeApplied > 0 && (
            <div className="mb-4 rounded-xl px-4 py-3"
              style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#38bdf8" }}>
                  Active filter
                </span>
                <span className="text-white/25 text-[10px]">·</span>
                <span className="text-[10px] text-white/40">
                  {filtered.length} of {XEON6_SP_SKUS.length} SKUs shown
                </span>
                <button
                  onClick={() => { setConditions([]); setAppliedConditions([]); }}
                  className="ml-auto text-[11px] text-white/25 hover:text-white/60 transition-colors">
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {appliedConditions.filter(isComplete).map(cond => (
                  <span key={cond.id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.28)", color: "#7dd3fc" }}>
                    <span className="font-mono">{conditionLabel(cond)}</span>
                    <button
                      onClick={() => removeAppliedCondition(cond.id)}
                      className="text-white/35 hover:text-red-400 transition-colors leading-none ml-0.5">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pending-but-not-run nudge */}
          {hasPending && activePending > 0 && activeApplied === 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs"
              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
              <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }}>
                <path d="M7 2v5M7 9.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span style={{ color: "#fbbf24" }}>
                {activePending} condition{activePending > 1 ? "s" : ""} ready — press <strong>Run Filter</strong> in the sidebar to apply
              </span>
            </div>
          )}

          {/* table */}
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
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={COLS + 1} className="px-6 py-16 text-center text-sm">
                        <p className="text-white/30">No SKUs match the current conditions.</p>
                        <button onClick={() => { setConditions([]); setAppliedConditions([]); }}
                          className="mt-2 text-[#38bdf8] text-xs hover:underline">
                          Clear all conditions
                        </button>
                      </td>
                    </tr>
                  )}
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
                          <td className="px-4 py-3 min-w-[120px]"><ScoreBar value={sku.sirPerfPerK}    max={MAX_PERF_PER_K} color="#fbbf24" /></td>
                          <td className="px-4 py-3 min-w-[120px]"><ScoreBar value={sku.sirPerfPerCore} max={MAX_PERF_CORE}  color="#a78bfa" /></td>
                          <td className="px-4 py-3 min-w-[120px]"><Bar value={sku.intPeak2S} max={MAX_INT_PEAK} color="#38bdf8" /></td>
                          <td className="px-4 py-3 min-w-[120px]"><Bar value={sku.fpPeak2S}  max={MAX_FP_PEAK}  color="#f472b6" /></td>
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

      {/* ── Condition editor sidebar ── */}
      {sidebarOpen && (
        <div className="w-[300px] flex-shrink-0 sticky top-0 h-screen overflow-hidden"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", background: "rgba(3,8,22,0.97)" }}>
          <ConditionEditor
            conditions={conditions}
            onChange={setConditions}
            onRun={runFilter}
            onClose={() => setSidebarOpen(false)}
            pendingCount={hasPending ? activePending : 0}
            matchCount={filtered.length}
          />
        </div>
      )}
    </div>
  );
}
