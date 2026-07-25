"use client";

import { useState, useMemo } from "react";
import {
  WORKFLOWS, CATEGORY_ORDER, CATEGORY_META,
  type WorkflowDef, type CategoryName, type ConfigField,
} from "./data";

// ── Types ──────────────────────────────────────────────────────────────────────

type ConfigValues = Record<string, string | number | boolean>;
type ViewMode     = "cards" | "table";
type ExportTab    = "json" | "docker" | "api";

// ── Helpers ────────────────────────────────────────────────────────────────────

function initValues(fields: ConfigField[]): ConfigValues {
  return Object.fromEntries(fields.map(f => [f.key, f.defaultValue]));
}

function downloadFile(content: string, filename: string, mime: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Export generators ──────────────────────────────────────────────────────────

function genJSON(wf: WorkflowDef, v: ConfigValues) {
  return JSON.stringify({ name: wf.name, id: wf.id, version: "1.0.0", tool: wf.tool, category: wf.category, config: v }, null, 2);
}

function genDocker(wf: WorkflowDef, v: ConfigValues) {
  const env = Object.entries(v)
    .map(([k, val]) => `      - ${k.toUpperCase()}=${String(val)}`)
    .join("\n");
  return `version: '3.8'
services:
  ${wf.id}:
    image: intel-ai/workflow-runner:latest
    restart: unless-stopped
    environment:
      - WORKFLOW_ID=${wf.id}
${env}
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data`;
}

function genAPI(wf: WorkflowDef, v: ConfigValues) {
  const body = JSON.stringify({ workflow_id: wf.id, config: v, input: "<your input>" }, null, 2);
  return `# REST endpoint — Intel-AI Workflow Runner
curl -X POST https://api.intel-ai.local/v1/workflows/run \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '${body}'

# Response schema
# { "result": any, "metadata": { "workflow_id": string, "duration_ms": number } }`;
}

// ── Field renderer ─────────────────────────────────────────────────────────────

const FIELD_BASE = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 transition-colors";
const FIELD_STYLE: React.CSSProperties = {
  background: "#0e1d38",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  colorScheme: "dark",
};

function FieldRow({ field, value, onChange }: {
  field: ConfigField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">{field.label}</span>

      {field.type === "bool" ? (
        <div className="flex items-center gap-2 h-9">
          <button
            type="button"
            onClick={() => onChange(!value)}
            className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a1428] focus-visible:ring-white/40"
            style={{ background: value ? "#1262B5" : "rgba(255,255,255,0.12)" }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 mt-0.5"
              style={{ transform: value ? "translateX(18px)" : "translateX(2px)" }}
            />
          </button>
          <span className="text-xs text-white/50">{value ? "Enabled" : "Disabled"}</span>
        </div>
      ) : field.type === "select" ? (
        <select
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          className={FIELD_BASE}
          style={FIELD_STYLE}
        >
          {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${FIELD_BASE} resize-none`}
          style={FIELD_STYLE}
        />
      ) : field.type === "password" ? (
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={String(value)}
            onChange={e => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`${FIELD_BASE} pr-10`}
            style={FIELD_STYLE}
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs px-1"
          >{show ? "hide" : "show"}</button>
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          value={String(value)}
          onChange={e => onChange(field.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={field.placeholder}
          className={FIELD_BASE}
          style={FIELD_STYLE}
        />
      )}

      {field.note && <span className="text-[10px] text-white/30 leading-tight">{field.note}</span>}
    </label>
  );
}

// ── Config sidebar ─────────────────────────────────────────────────────────────

function ConfigSidebar({ wf, onClose }: { wf: WorkflowDef; onClose: () => void }) {
  const meta = CATEGORY_META[wf.category];
  const [values, setValues]       = useState<ConfigValues>(() => initValues(wf.configFields));
  const [exportTab, setExportTab] = useState<ExportTab>("json");
  const [copied, setCopied]       = useState(false);

  const exportContent = useMemo(() => {
    if (exportTab === "json")   return genJSON(wf, values);
    if (exportTab === "docker") return genDocker(wf, values);
    return genAPI(wf, values);
  }, [wf, values, exportTab]);

  function handleCopy() {
    navigator.clipboard.writeText(exportContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleDownload() {
    if (exportTab === "json")   downloadFile(exportContent, `${wf.id}.json`,             "application/json");
    if (exportTab === "docker") downloadFile(exportContent, `${wf.id}-compose.yml`,      "text/yaml");
    if (exportTab === "api")    downloadFile(exportContent, `${wf.id}-api-example.sh`,   "text/plain");
  }

  const set = (key: string, val: string | number | boolean) =>
    setValues(p => ({ ...p, [key]: val }));

  const TAB_LABELS: { id: ExportTab; label: string }[] = [
    { id: "json",   label: "JSON" },
    { id: "docker", label: "Docker" },
    { id: "api",    label: "API / curl" },
  ];

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
          width: 440,
          background: "linear-gradient(160deg, #050f22 0%, #070d1e 100%)",
          borderLeft: `1px solid rgba(${meta.accentRgb},0.20)`,
          boxShadow: `-20px 0 60px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-start gap-3 px-5 py-4 border-b border-white/[0.07]"
          style={{ background: `rgba(${meta.accentRgb},0.05)` }}
        >
          <div
            className="mt-0.5 w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-black"
            style={{ background: `rgba(${meta.accentRgb},0.15)`, color: meta.accent, border: `1px solid rgba(${meta.accentRgb},0.3)` }}
          >
            {meta.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white/90 leading-tight">{wf.name}</h2>
            <p className="text-[11px] mt-0.5 leading-snug text-white/40">{wf.description}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white/70 hover:bg-white/5 transition-colors text-lg leading-none"
          >×</button>
        </div>

        {/* Config form */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-4">Configuration</p>
          <div className="flex flex-col gap-4">
            {wf.configFields.map(field => (
              <FieldRow
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={v => set(field.key, v)}
              />
            ))}
          </div>
        </div>

        {/* Export section */}
        <div
          className="flex-shrink-0 border-t border-white/[0.07]"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          {/* Tab strip */}
          <div className="flex items-center gap-0 px-5 pt-3 pb-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 mr-3">Export as</span>
            {TAB_LABELS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setExportTab(id)}
                className="px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors"
                style={exportTab === id
                  ? { background: "#0e1d38", color: meta.accent, borderBottom: `2px solid ${meta.accent}` }
                  : { color: "rgba(255,255,255,0.35)", borderBottom: "2px solid transparent" }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Code preview */}
          <div className="mx-5 mb-3 rounded-b-lg rounded-tr-lg overflow-hidden" style={{ background: "#0e1d38", border: "1px solid rgba(255,255,255,0.08)" }}>
            <pre className="p-3 text-[10px] leading-relaxed font-mono text-white/60 overflow-x-auto max-h-[160px] overflow-y-auto whitespace-pre">
              {exportContent}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-5 pb-4">
            <button
              onClick={handleCopy}
              className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all hover:brightness-110"
              style={{ background: `rgba(${meta.accentRgb},0.18)`, border: `1px solid rgba(${meta.accentRgb},0.30)`, color: meta.accent }}
            >
              ↓ Download
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ── Workflow card ──────────────────────────────────────────────────────────────

function WorkflowCard({ wf, onConfigure }: { wf: WorkflowDef; onConfigure: () => void }) {
  const meta = CATEGORY_META[wf.category];
  return (
    <div
      onClick={onConfigure}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onConfigure(); } }}
      className="flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(150deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `rgba(${meta.accentRgb},0.35)`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      {/* Top accent strip */}
      <div className="h-1 flex-shrink-0" style={{ background: `linear-gradient(90deg, rgba(${meta.accentRgb},0.9) 0%, rgba(${meta.accentRgb},0.3) 100%)` }} />

      <div className="flex flex-col gap-2 p-4 flex-1">
        <h3 className="text-sm font-bold text-white/90 leading-tight">{wf.name}</h3>
        <p className="text-[11px] text-white/45 leading-relaxed flex-1">{wf.description}</p>
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
      <span className="text-xs text-white/30 font-medium">{count} workflow{count !== 1 ? "s" : ""}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, rgba(${meta.accentRgb},0.25) 0%, transparent 100%)` }} />
    </div>
  );
}

// ── Table view ─────────────────────────────────────────────────────────────────

function WorkflowTable({ workflows, onConfigure }: { workflows: WorkflowDef[]; onConfigure: (wf: WorkflowDef) => void }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{ background: "var(--dm-table-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="w-48 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Workflow</th>
              <th className="w-44 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Category</th>
              <th className="w-20 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Tool</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/40">Description</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf, idx) => {
              const meta = CATEGORY_META[wf.category];
              return (
                <tr
                  key={wf.id}
                  onClick={() => onConfigure(wf)}
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
                    <span className="text-[10px] font-bold uppercase tracking-wide"
                      style={wf.tool === "n8n" ? { color: "#fb923c" } : { color: "#60a5fa" }}>
                      {wf.tool === "n8n" ? "N8N" : "Custom"}
                    </span>
                  </td>
                  <td className="px-4 py-3 overflow-hidden">
                    <span className="text-white/40 text-xs truncate block">{wf.description}</span>
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

// ── Main view ──────────────────────────────────────────────────────────────────

export function WorkflowsView() {
  const [viewMode, setViewMode]         = useState<ViewMode>("cards");
  const [search, setSearch]             = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryName | "All">("All");
  const [toolFilter, setToolFilter]     = useState<"all" | "n8n" | "custom">("all");
  const [selectedWf, setSelectedWf]     = useState<WorkflowDef | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return WORKFLOWS.filter(wf => {
      if (categoryFilter !== "All" && wf.category !== categoryFilter) return false;
      if (toolFilter !== "all" && wf.tool !== toolFilter) return false;
      if (q && !wf.name.toLowerCase().includes(q) &&
          !wf.description.toLowerCase().includes(q) &&
          !wf.tags.some(t => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [search, categoryFilter, toolFilter]);

  // Group filtered by category
  const groups = useMemo(() => {
    return CATEGORY_ORDER
      .map(cat => ({ cat, rows: filtered.filter(wf => wf.category === cat) }))
      .filter(g => g.rows.length > 0);
  }, [filtered]);

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-xl px-6 pt-10 pb-16">

        {/* ── Header ── */}
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#818cf8] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#818cf8]/80">Workflow Catalog</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Workflows</h1>
            <p className="mt-1 text-base text-white/40">
              {filtered.length} of {WORKFLOWS.length} workflows &middot; {CATEGORY_ORDER.length} categories
            </p>
          </div>

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
                placeholder="Name, tag, description…"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 placeholder-white/20"
                style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
              />
            </div>

            {/* Tool filter */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Tool</label>
              <select
                value={toolFilter}
                onChange={e => setToolFilter(e.target.value as "all" | "n8n" | "custom")}
                className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                style={{ background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }}
              >
                <option value="all">All tools</option>
                <option value="n8n">N8N</option>
                <option value="custom">Intel Custom</option>
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => { setSearch(""); setCategoryFilter("All"); setToolFilter("all"); }}
              className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Reset
            </button>
          </div>

          {/* Category chip strip */}
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setCategoryFilter("All")}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: categoryFilter === "All" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                color: categoryFilter === "All" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.40)",
                border: `1px solid ${categoryFilter === "All" ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.08)"}`,
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
                    background: active ? `rgba(${meta.accentRgb},0.15)` : "rgba(255,255,255,0.04)",
                    color:      active ? meta.accent : "rgba(255,255,255,0.45)",
                    border:     `1px solid ${active ? `rgba(${meta.accentRgb},0.35)` : "rgba(255,255,255,0.08)"}`,
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
          <div className="py-24 text-center text-white/30 text-sm">No workflows match your filters.</div>
        ) : viewMode === "table" ? (
          <WorkflowTable workflows={filtered} onConfigure={setSelectedWf} />
        ) : (
          <div className="flex flex-col gap-10">
            {groups.map(({ cat, rows }) => (
              <section key={cat}>
                <CategoryHeader name={cat} count={rows.length} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rows.map(wf => (
                    <WorkflowCard key={wf.id} wf={wf} onConfigure={() => setSelectedWf(wf)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ── Config sidebar ── */}
      {selectedWf && (
        <ConfigSidebar
          key={selectedWf.id}
          wf={selectedWf}
          onClose={() => setSelectedWf(null)}
        />
      )}
    </main>
  );
}
