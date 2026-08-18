"use client";

import { useState, useMemo, useCallback } from "react";
import {
  WORKFLOWS, CATEGORY_ORDER, CATEGORY_META, CONVENTIONS,
  type WorkflowDef, type CategoryName, type Impl,
} from "./data";
import { getTaskIcon } from "./task-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useRegisterExport } from "@/contexts/ExportContext";
import { exportWorkflowsToExcel } from "./export";
import { X, ArrowRight, Shrink, Expand } from "lucide-react";

/** Darkens an "r,g,b" triplet toward black — used in light mode where a category's raw bright
 *  accent color would have poor contrast directly on a light card. */
function darkenRgb(rgb: string, amount = 0.4): string {
  const [r, g, b] = rgb.split(",").map(Number);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type ViewMode = "cards" | "table";

const IMPL_COLORS: Record<Impl, string> = {
  Deterministic: "#60a5fa",
  Model:         "#c084fc",
  Hybrid:        "#fbbf24",
};

// ── Detail panel ───────────────────────────────────────────────────────────────

/** Section label — same treatment across every field in the panel. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">
      {children}
    </span>
  );
}

/** Prose fields (instructions, business logic, escalation rule) — flowing text, not itemized. */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <p className="text-[12.5px] leading-relaxed text-white/70 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/** One `name: type` / `name=default` pair parsed out of a semicolon-delimited signature string. */
interface Param { name: string; op: "" | ":" | "="; rest: string }

function parseParamList(raw: string): Param[] {
  return raw
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const m = pair.match(/^([A-Za-z_][A-Za-z0-9_/]*)\s*(:|=)\s*(.*)$/s);
      if (!m) return { name: pair, op: "", rest: "" };
      return { name: m[1], op: m[2] as ":" | "=", rest: m[3] };
    });
}

/** Inputs / Outputs / Config Parameters — one parameter per line, name and type/default
 *  visually distinct so the signature scans like a spec sheet instead of a text blob. */
function ParamSection({ label, value, accent }: { label: string; value: string; accent: string }) {
  const params = parseParamList(value);
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {params.length === 0 ? (
        <span className="text-[11px] text-white/25">—</span>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
          {params.map((p, i) => (
            <div
              key={i}
              className="px-2.5 py-1.5"
              style={{
                background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span className="font-mono text-[11px] font-bold" style={{ color: accent }}>{p.name}</span>
              {p.op && <span className="font-mono text-[11px] text-white/30">{p.op === "=" ? " = " : ": "}</span>}
              {p.rest && <span className="font-mono text-[11px] text-white/55 break-words">{p.rest}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Typical Chain — steps as connected pills instead of a raw "A → B → C" string. */
function ChainSteps({ value, wfId, accent }: { value: string; wfId: string; accent: string }) {
  const steps = value.split("→").map(s => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => {
        const isThis = step === "THIS";
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center px-2 py-1 rounded-md font-mono text-[10.5px] font-semibold"
              style={isThis
                ? { background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {isThis ? wfId : step}
            </span>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-white/20" strokeWidth={2} />}
          </span>
        );
      })}
    </div>
  );
}

function TaskDetail({ wf, onClose }: { wf: WorkflowDef; onClose: () => void }) {
  const meta = CATEGORY_META[wf.category];
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accentText = isDark ? meta.accent : darkenRgb(meta.accentRgb);
  const Icon = getTaskIcon(wf.id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(1,6,18,0.55)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 z-50 h-full flex flex-col overflow-hidden"
        style={{
          width: 480,
          background: "var(--dm-card-bg)",
          borderLeft: `1px solid rgba(${meta.accentRgb},0.20)`,
          boxShadow: `${isDark ? "-20px 0 60px rgba(0,0,0,0.6)" : "var(--dm-card-depth)"}, 0 0 0 1px rgba(${meta.accentRgb},0.06)`,
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-start gap-3 px-5 py-4 border-b border-white/[0.07]"
          style={{ background: `rgba(${meta.accentRgb},0.05)` }}
        >
          <div
            className="mt-0.5 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
            style={{ background: `rgba(${meta.accentRgb},0.15)`, color: accentText, border: `1px solid rgba(${meta.accentRgb},0.3)` }}
          >
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white/90 leading-tight">{wf.name}</h2>
            <p className="text-[11px] mt-0.5 leading-snug text-white/40 font-mono">{wf.id}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Spec */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `${IMPL_COLORS[wf.impl]}22`, color: IMPL_COLORS[wf.impl] }}
            >
              {wf.impl}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `rgba(${meta.accentRgb},0.12)`, color: meta.accent }}
            >
              {wf.category}
            </span>
          </div>

          {/* Inputs / Outputs / Config Parameters are all the same "spec sheet" shape —
              grouped tightly so they read as one block, distinct from the prose fields below. */}
          <div className="flex flex-col gap-2.5">
            <ParamSection label="Inputs" value={wf.inputs} accent={accentText} />
            <ParamSection label="Outputs" value={wf.outputs} accent={accentText} />
            <ParamSection label="Config Parameters" value={wf.configParameters} accent={accentText} />
          </div>

          <DetailField label="Prompt / Instructions" value={wf.promptInstructions} />
          <DetailField label="Business Logic & Validation" value={wf.businessLogic} />
          <DetailField label="Escalate When" value={wf.escalateWhen} />
          <div>
            <SectionLabel>Typical Chain</SectionLabel>
            <ChainSteps value={wf.typicalChain} wfId={wf.id} accent={accentText} />
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Task card ──────────────────────────────────────────────────────────────────
// Pinterest-tile treatment: the task's own icon is the dominant visual element;
// everything else (inputs/outputs/prompt/etc.) lives one click away in TaskDetail.

const IMPL_LABEL: Record<Impl, string> = {
  Deterministic: "Code",
  Model:         "Model",
  Hybrid:        "Hybrid",
};

function TaskCard({ wf, onSelect }: { wf: WorkflowDef; onSelect: () => void }) {
  const meta = CATEGORY_META[wf.category];
  const Icon = getTaskIcon(wf.id);
  const { theme } = useTheme();
  const iconColor = theme === "dark" ? meta.accent : darkenRgb(meta.accentRgb, 0.25);
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
      style={{
        background: "var(--dm-card-bg)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = `rgba(${meta.accentRgb},0.4)`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 28px rgba(${meta.accentRgb},0.18), 0 2px 10px rgba(0,0,0,0.25)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.25)";
      }}
    >
      {/* Icon hero */}
      <div
        className="relative flex items-center justify-center aspect-[4/3] flex-shrink-0"
        style={{ background: `linear-gradient(160deg, rgba(${meta.accentRgb},0.16) 0%, rgba(${meta.accentRgb},0.05) 100%)` }}
      >
        <Icon
          className="w-9 h-9 transition-transform duration-200 group-hover:scale-110"
          style={{ color: iconColor }}
          strokeWidth={1.6}
        />
        <span
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{ background: IMPL_COLORS[wf.impl] }}
          title={IMPL_LABEL[wf.impl]}
        />
      </div>

      {/* Label */}
      <div className="px-3 py-2.5">
        <h3 className="text-[12.5px] font-bold leading-snug line-clamp-2" style={{ color: "var(--dm-txt-body)" }}>
          {wf.name}
        </h3>
      </div>
    </div>
  );
}

// ── Category section header ────────────────────────────────────────────────────

function CategoryHeader({ name, count }: { name: CategoryName; count: number }) {
  const meta = CATEGORY_META[name];
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ background: `rgba(${meta.accentRgb},0.15)`, color: meta.accent, border: `1px solid rgba(${meta.accentRgb},0.25)` }}
      >
        {meta.icon}
      </div>
      <h2 className="text-base font-bold text-white/80">{name}</h2>
      <span className="text-xs text-white/30 font-medium">{count} task{count !== 1 ? "s" : ""}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, rgba(${meta.accentRgb},0.25) 0%, transparent 100%)` }} />
    </div>
  );
}

// ── Table view ─────────────────────────────────────────────────────────────────

function TaskTable({ tasks, onSelect }: { tasks: WorkflowDef[]; onSelect: (wf: WorkflowDef) => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{ background: "var(--dm-table-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="w-48 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Task</th>
              <th className="w-52 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Category</th>
              <th className="w-28 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Impl</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Typical Chain</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((wf, idx) => {
              const meta = CATEGORY_META[wf.category];
              return (
                <tr
                  key={wf.id}
                  onClick={() => onSelect(wf)}
                  className="cursor-pointer transition-colors"
                  style={{
                    background: idx % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${meta.accentRgb},0.06)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"; }}
                >
                  <td className="px-4 py-3 overflow-hidden">
                    <span className="text-white/80 font-semibold text-xs truncate block">{wf.name}</span>
                  </td>
                  <td className="px-4 py-3 overflow-hidden">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: `rgba(${meta.accentRgb},0.12)`, color: meta.accent }}
                    >
                      <span>{meta.icon}</span>
                      <span className="truncate">{wf.category}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: IMPL_COLORS[wf.impl] }}
                    >
                      {wf.impl}
                    </span>
                  </td>
                  <td className="px-4 py-3 overflow-hidden">
                    <span className="text-white/40 text-xs truncate block font-mono">{wf.typicalChain}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Concise view ───────────────────────────────────────────────────────────────
// Every task reduced to a single small chip, wrapped tightly by category — trades the
// icon-forward card treatment for maximum density, so the full breadth of the catalog
// reads at a glance.

function ConciseTaskList({ groups, onSelect }: {
  groups: { cat: CategoryName; rows: WorkflowDef[] }[];
  onSelect: (wf: WorkflowDef) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ cat, rows }) => {
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="flex flex-col gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: meta.accent }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.accent }} />
              {cat}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {rows.map(wf => (
                <button
                  key={wf.id}
                  onClick={() => onSelect(wf)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium transition-colors whitespace-nowrap"
                  style={{
                    background: `rgba(${meta.accentRgb},0.08)`,
                    border: `1px solid rgba(${meta.accentRgb},0.18)`,
                    color: "var(--dm-txt-body)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${meta.accentRgb},0.2)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${meta.accentRgb},0.08)`; }}
                >
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: IMPL_COLORS[wf.impl] }} />
                  {wf.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main view ──────────────────────────────────────────────────────────────────

export function WorkflowsView() {
  const [viewMode, setViewMode]             = useState<ViewMode>("cards");
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryName | "All">("All");
  const [implFilter, setImplFilter]         = useState<"all" | Impl>("all");
  const [selectedWf, setSelectedWf]         = useState<WorkflowDef | null>(null);
  const [showConventions, setShowConventions] = useState(false);
  const [concise, setConcise] = useState(false);

  const exportHandler = useCallback(() => exportWorkflowsToExcel(WORKFLOWS), []);
  useRegisterExport(exportHandler, "Export Tasks Catalog");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return WORKFLOWS.filter(wf => {
      if (categoryFilter !== "All" && wf.category !== categoryFilter) return false;
      if (implFilter !== "all" && wf.impl !== implFilter) return false;
      if (q && !wf.name.toLowerCase().includes(q) &&
          !wf.id.toLowerCase().includes(q) &&
          !wf.outputs.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, categoryFilter, implFilter]);

  // Group filtered by category
  const groups = useMemo(() => {
    return CATEGORY_ORDER
      .map(cat => ({ cat, rows: filtered.filter(wf => wf.category === cat) }))
      .filter(g => g.rows.length > 0);
  }, [filtered]);

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-xl px-6 pt-10">

        {/* ── Header ── */}
        <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">Tasks</h1>
            <p className="mt-1 text-base text-white/40">
              {filtered.length} of {WORKFLOWS.length} tasks &middot; {CATEGORY_ORDER.length} categories &middot; Pydantic AI task mapping
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConventions(true)}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" }}
            >
              Conventions
            </button>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {(["cards", "table"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all"
                  style={viewMode === mode
                    ? { background: "#1262B5", color: "white" }
                    : { color: "rgba(255,255,255,0.45)" }}
                >
                  {mode === "cards" ? "⊞ Cards" : "☰ Table"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-6 pb-16">
        {/* ── Filter bar ── */}
        <div
          className="rounded-2xl border border-white/[0.07] p-4 mb-8"
          style={{ background: "var(--dm-filterbar-bg)" }}
        >
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, ID, output…"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 placeholder-white/20"
                style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
              />
            </div>

            {/* Impl filter */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Impl</label>
              <select
                value={implFilter}
                onChange={e => setImplFilter(e.target.value as "all" | Impl)}
                className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
              >
                <option value="all">All</option>
                <option value="Deterministic">Deterministic</option>
                <option value="Model">Model</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => { setSearch(""); setCategoryFilter("All"); setImplFilter("all"); }}
              className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Reset
            </button>

            {/* Concise view toggle */}
            <button
              onClick={() => setConcise(v => !v)}
              title={concise ? "Expand back to the full catalog view" : "Concise view — pack every task into one dense, categorized list"}
              aria-label={concise ? "Expand view" : "Concise view"}
              aria-pressed={concise}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors"
              style={concise
                ? { background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8" }
                : { background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-faint)" }}
            >
              {concise ? <Expand className="w-4 h-4" strokeWidth={1.8} /> : <Shrink className="w-4 h-4" strokeWidth={1.8} />}
            </button>
          </div>

          {/* Category chip strip */}
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setCategoryFilter("All")}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: categoryFilter === "All" ? "var(--dm-surface-c)" : "var(--dm-surface-a)",
                color: categoryFilter === "All" ? "var(--dm-txt-body)" : "var(--dm-txt-faint)",
                border: `1px solid ${categoryFilter === "All" ? "var(--dm-border-b)" : "var(--dm-border-a)"}`,
              }}
            >
              All ({WORKFLOWS.length})
            </button>
            {CATEGORY_ORDER.map(cat => {
              const meta  = CATEGORY_META[cat];
              const count = WORKFLOWS.filter(w => w.category === cat).length;
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(active ? "All" : cat)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? `rgba(${meta.accentRgb},0.15)` : "var(--dm-surface-a)",
                    color:      active ? meta.accent : "var(--dm-txt-faint)",
                    border:     `1px solid ${active ? `rgba(${meta.accentRgb},0.35)` : "var(--dm-border-a)"}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.accent }} />
                  {cat}
                  <span style={{ opacity: 0.6 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center text-white/30 text-sm">No tasks match your filters.</div>
        ) : concise ? (
          <div
            className="rounded-2xl border border-white/[0.07] p-5"
            style={{ background: "var(--dm-filterbar-bg)" }}
          >
            <ConciseTaskList groups={groups} onSelect={setSelectedWf} />
          </div>
        ) : viewMode === "table" ? (
          <TaskTable tasks={filtered} onSelect={setSelectedWf} />
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map(({ cat, rows }) => (
              <section key={cat}>
                <CategoryHeader name={cat} count={rows.length} />
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))" }}
                >
                  {rows.map(wf => (
                    <TaskCard key={wf.id} wf={wf} onSelect={() => setSelectedWf(wf)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── Task detail drawer ── */}
      {selectedWf && (
        <TaskDetail
          key={selectedWf.id}
          wf={selectedWf}
          onClose={() => setSelectedWf(null)}
        />
      )}

      {/* ── Conventions modal ── */}
      {showConventions && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(1,6,18,0.55)", backdropFilter: "blur(2px)" }}
            onClick={() => setShowConventions(false)}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl"
            style={{ background: "var(--dm-card-bg)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-white/[0.07]">
              <div>
                <h2 className="text-sm font-bold text-white/90">Cross-cutting conventions</h2>
                <p className="text-[11px] mt-0.5 text-white/40">These apply to every task and are not repeated per row.</p>
              </div>
              <button
                onClick={() => setShowConventions(false)}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors text-lg leading-none"
              >×</button>
            </div>
            <div className="px-6 py-4 flex flex-col gap-4">
              {CONVENTIONS.map(c => (
                <div key={c.convention}>
                  <span className="text-[11px] font-bold text-white/70">{c.convention}</span>
                  <p className="text-[12px] mt-0.5 leading-relaxed text-white/45">{c.rule}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
