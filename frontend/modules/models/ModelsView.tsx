"use client";

import { useState, useMemo, useRef } from "react";
import { models, CATEGORY_ORDER, type Category, type Model } from "./data";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme } from "@/contexts/ThemeContext";

// ── category palette (per-theme) ────────────────────────────────────────────
// Same accent hues in both themes; badge/badgeText/accent are tuned per
// theme since a pastel-on-15%-tint pairing that reads fine on the dark
// navy table background becomes near-invisible on the light one.

type CatPalette = Record<Category, { accent: string; row: string; rowAlt: string; badge: string; badgeText: string }>;

const DARK_CAT: CatPalette = {
  "OCR & Document":         { accent: "#22d3ee", row: "rgba(34,211,238,0.04)",  rowAlt: "rgba(34,211,238,0.07)",  badge: "rgba(34,211,238,0.15)",  badgeText: "#67e8f9" },
  "Vision & Multimodal":    { accent: "#a78bfa", row: "rgba(167,139,250,0.04)", rowAlt: "rgba(167,139,250,0.07)", badge: "rgba(167,139,250,0.15)", badgeText: "#c4b5fd" },
  "Speech & Audio":         { accent: "#34d399", row: "rgba(52,211,153,0.04)",  rowAlt: "rgba(52,211,153,0.07)",  badge: "rgba(52,211,153,0.15)",  badgeText: "#6ee7b7" },
  "Translation":            { accent: "#fbbf24", row: "rgba(251,191,36,0.04)",  rowAlt: "rgba(251,191,36,0.07)",  badge: "rgba(251,191,36,0.15)",  badgeText: "#fcd34d" },
  "Embeddings & Retrieval": { accent: "#60a5fa", row: "rgba(96,165,250,0.04)",  rowAlt: "rgba(96,165,250,0.07)",  badge: "rgba(96,165,250,0.15)",  badgeText: "#93c5fd" },
  "Safety & Guardrails":    { accent: "#f87171", row: "rgba(248,113,113,0.04)", rowAlt: "rgba(248,113,113,0.07)", badge: "rgba(248,113,113,0.15)", badgeText: "#fca5a5" },
  "LLM":                    { accent: "#818cf8", row: "rgba(129,140,248,0.04)", rowAlt: "rgba(129,140,248,0.07)", badge: "rgba(129,140,248,0.15)", badgeText: "#a5b4fc" },
  "Code & Agents":          { accent: "#fb923c", row: "rgba(251,146,60,0.04)",  rowAlt: "rgba(251,146,60,0.07)",  badge: "rgba(251,146,60,0.15)",  badgeText: "#fdba74" },
};

const LIGHT_CAT: CatPalette = {
  "OCR & Document":         { accent: "#0e7490", row: "rgba(14,116,144,0.04)",  rowAlt: "rgba(14,116,144,0.07)",  badge: "rgba(14,116,144,0.12)",  badgeText: "#0e7490" },
  "Vision & Multimodal":    { accent: "#6d28d9", row: "rgba(109,40,217,0.04)",  rowAlt: "rgba(109,40,217,0.07)",  badge: "rgba(109,40,217,0.12)",  badgeText: "#6d28d9" },
  "Speech & Audio":         { accent: "#047857", row: "rgba(4,120,87,0.04)",    rowAlt: "rgba(4,120,87,0.07)",    badge: "rgba(4,120,87,0.12)",    badgeText: "#047857" },
  "Translation":            { accent: "#b45309", row: "rgba(180,83,9,0.04)",    rowAlt: "rgba(180,83,9,0.07)",    badge: "rgba(180,83,9,0.12)",    badgeText: "#b45309" },
  "Embeddings & Retrieval": { accent: "#1d4ed8", row: "rgba(29,78,216,0.04)",   rowAlt: "rgba(29,78,216,0.07)",   badge: "rgba(29,78,216,0.12)",   badgeText: "#1d4ed8" },
  "Safety & Guardrails":    { accent: "#b91c1c", row: "rgba(185,28,28,0.04)",   rowAlt: "rgba(185,28,28,0.07)",   badge: "rgba(185,28,28,0.12)",   badgeText: "#b91c1c" },
  "LLM":                    { accent: "#4338ca", row: "rgba(67,56,202,0.04)",   rowAlt: "rgba(67,56,202,0.07)",   badge: "rgba(67,56,202,0.12)",   badgeText: "#4338ca" },
  "Code & Agents":          { accent: "#c2410c", row: "rgba(194,65,12,0.04)",   rowAlt: "rgba(194,65,12,0.07)",   badge: "rgba(194,65,12,0.12)",   badgeText: "#c2410c" },
};

function useCatPalette(): CatPalette {
  const { theme } = useTheme();
  return theme === "light" ? LIGHT_CAT : DARK_CAT;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "name",     label: "Name" },
  { value: "year",     label: "Year" },
  { value: "params",   label: "Params" },
  { value: "category", label: "Category" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["value"];

const GROUP_OPTIONS = [
  { value: "none",     label: "No grouping" },
  { value: "category", label: "Category" },
  { value: "year",     label: "Year" },
  { value: "origin",   label: "Origin" },
] as const;
type GroupKey = typeof GROUP_OPTIONS[number]["value"];

const EMPTY_SELECTION: Set<string> = new Set();

// ── column visibility ─────────────────────────────────────────────────────────
// The table is dense (12–13 columns); let users hide the ones they don't need
// instead of every column fighting for space via truncate+tooltip.

const COLUMN_OPTIONS = [
  { key: "size",        label: "Size" },
  { key: "vram",         label: "VRAM" },
  { key: "cpu",          label: "CPU support" },
  { key: "commercial",   label: "Commercial" },
  { key: "maintained",   label: "Actively maintained" },
  { key: "finetuning",   label: "Fine-tunable" },
  { key: "origin",       label: "Origin" },
] as const;
type ColumnKey = typeof COLUMN_OPTIONS[number]["key"];
type ColumnVisibility = Record<ColumnKey, boolean>;
const ALL_COLUMNS_VISIBLE: ColumnVisibility = { size: true, vram: true, cpu: true, commercial: true, maintained: true, finetuning: true, origin: true };

function ColumnToggle({ visible, onChange }: { visible: ColumnVisibility; onChange: (v: ColumnVisibility) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useDismiss<HTMLDivElement>(open, () => { setOpen(false); triggerRef.current?.focus(); });
  const hiddenCount = COLUMN_OPTIONS.filter(c => !visible[c.key]).length;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        Columns{hiddenCount > 0 ? ` (${COLUMN_OPTIONS.length - hiddenCount}/${COLUMN_OPTIONS.length})` : ""}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-lg border py-2 z-20"
          style={{ background: "var(--dm-card-bg)", borderColor: "var(--dm-card-border)", boxShadow: "var(--dm-card-depth)" }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
            Visible columns
          </p>
          {COLUMN_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className="nav-menu-item flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer"
              style={{ color: "var(--dm-txt-secondary)" }}
            >
              <input
                type="checkbox"
                checked={visible[key]}
                onChange={() => onChange({ ...visible, [key]: !visible[key] })}
                className="w-3.5 h-3.5 cursor-pointer accent-[#22d3ee]"
              />
              {label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function paramToNumber(p: string): number {
  const m = p.match(/([\d.]+)\s*(B|M|K)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const unit = (m[2] || "").toUpperCase();
  if (unit === "B") return n * 1e9;
  if (unit === "M") return n * 1e6;
  if (unit === "K") return n * 1e3;
  return n;
}

// ── ui primitives ─────────────────────────────────────────────────────────────

function BoolIcon({ val }: { val: boolean }) {
  return val
    ? <span className="text-success font-bold text-sm select-none">✓</span>
    : <span className="text-white/20 text-sm select-none">—</span>;
}

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
  colorScheme: "var(--dm-color-scheme)",
};

function SortableTh<K extends string>({ label, k, width, sortKey, sortDir, onSort }: {
  label: string; k: K; width: string; sortKey: K; sortDir: "asc" | "desc"; onSort: (k: K) => void;
}) {
  const active = sortKey === k;
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`${width} px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider`}
    >
      <button
        type="button" onClick={() => onSort(k)}
        className="flex items-center select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
      >
        {label}
        {active
          ? <span className="ml-1" style={{ color: "#22d3ee" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
          : <span className="text-white/20 ml-1">↕</span>}
      </button>
    </th>
  );
}

function DarkSelect({ label, value, onChange, children }: {
  label: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={SELECT_STYLE}
      >
        {children}
      </select>
    </div>
  );
}

// ── expanded detail panel ─────────────────────────────────────────────────────

function ExpandedRow({ model, colSpan }: { model: Model; colSpan: number }) {
  const c = useCatPalette()[model.category];
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: `rgba(${hexToRgb(c.accent)},0.05)`, borderBottom: `1px solid rgba(${hexToRgb(c.accent)},0.12)` }}>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 text-sm">
            {[
              { label: "Architecture",       val: model.architecture },
              { label: "Key Benchmarks",     val: model.keyBenchmarks },
              { label: "Recommended Use",    val: model.recommendedUse },
              { label: "HuggingFace Adoption", val: model.hfAdoption },
              { label: "Known Limitations",  val: model.knownLimitations },
              { label: "Cloud / Edge",       val: model.cloudEdge },
              { label: "Max Tokens",         val: model.maxTokens },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">{label}</p>
                <p className="text-white/65 text-xs leading-relaxed">{val}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Serving Options</p>
              <div className="flex flex-wrap gap-1">
                {model.serving.map(s => (
                  <span key={s} className="rounded px-1.5 py-0.5 text-[11px] text-white/60"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-1">Quantization</p>
              <div className="flex flex-wrap gap-1">
                {model.quantization.map(q => (
                  <span key={q} className="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: c.badge, color: c.badgeText, border: `1px solid ${c.accent}33` }}>
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <a
              href={`https://huggingface.co/${model.hfId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors"
              style={{ color: c.accent }}
            >
              🤗 {model.hfId}
            </a>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── group header ──────────────────────────────────────────────────────────────

function GroupHeader({ label, count, colSpan }: { label: string; count: number; colSpan: number }) {
  const cat = label as Category;
  const accent = useCatPalette()[cat]?.accent ?? "#3399ff";
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: "rgba(255,255,255,0.03)", borderTop: `2px solid ${accent}44`, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-6 py-2.5 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
          <span className="font-semibold text-sm text-white/80">{label}</span>
          <span className="text-xs text-white/30 font-medium">{count} model{count !== 1 ? "s" : ""}</span>
        </div>
      </td>
    </tr>
  );
}

// ── tiny helper (used in ExpandedRow) ────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── main component ────────────────────────────────────────────────────────────

interface ModelsViewProps {
  selectionMode?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (hfId: string) => void;
}

export function ModelsView({
  selectionMode = false,
  selected = EMPTY_SELECTION,
  onToggleSelect = () => {},
}: ModelsViewProps = {}) {
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [originFilter, setOriginFilter]     = useState<string>("All");
  const [cpuFilter, setCpuFilter]           = useState<boolean | null>(null);
  const [commercialFilter, setCommercialFilter] = useState<boolean | null>(null);
  const [sortKey, setSortKey]               = useState<SortKey>("category");
  const [sortDir, setSortDir]               = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy]               = useState<GroupKey>("category");
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [visibleCols, setVisibleCols]       = useState<ColumnVisibility>(ALL_COLUMNS_VISIBLE);
  const catPalette = useCatPalette();

  const origins = useMemo(() => {
    const raw = models.map(m => m.origin.split("(")[0].trim().split("—")[0].trim()).filter(Boolean);
    return ["All", ...Array.from(new Set(raw)).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return models.filter(m => {
      if (q && !m.name.toLowerCase().includes(q) && !m.hfId.toLowerCase().includes(q) &&
          !m.tasks.some(t => t.toLowerCase().includes(q)) &&
          !m.category.toLowerCase().includes(q) && !m.origin.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "All" && m.category !== categoryFilter) return false;
      if (originFilter !== "All" && !m.origin.toLowerCase().includes(originFilter.toLowerCase())) return false;
      if (cpuFilter !== null && m.cpuSupport !== cpuFilter) return false;
      if (commercialFilter !== null && m.commercial !== commercialFilter) return false;
      return true;
    });
  }, [search, categoryFilter, originFilter, cpuFilter, commercialFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")     cmp = a.name.localeCompare(b.name);
      if (sortKey === "year")     cmp = a.year - b.year;
      if (sortKey === "params")   cmp = paramToNumber(a.params) - paramToNumber(b.params);
      if (sortKey === "category") cmp = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function groupModels(): { label: string; rows: Model[] }[] {
    if (groupBy === "none") return [{ label: "", rows: sorted }];
    const map = new Map<string, Model[]>();
    for (const m of sorted) {
      let key = "";
      if (groupBy === "category") key = m.category;
      if (groupBy === "year")     key = String(m.year);
      if (groupBy === "origin")   key = m.origin.split("(")[0].trim().split("—")[0].trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    if (groupBy === "category") {
      return CATEGORY_ORDER.filter(c => map.has(c)).map(c => ({ label: c, rows: map.get(c)! }));
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([label, rows]) => ({ label, rows }));
  }

  const groups = groupModels();

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const visibleColCount = COLUMN_OPTIONS.filter(c => visibleCols[c.key]).length;
  const COLS = (selectionMode ? 1 : 0) + 1 /* chevron */ + 4 /* model, category, year, params */ + visibleColCount;

  const inputStyle = {
    background: "var(--dm-input-bg)",
    border: "1px solid var(--dm-input-border)",
    color: "var(--dm-input-color)",
  } as React.CSSProperties;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-12">

        <p className="mb-4 text-sm text-white/40">
          {filtered.length} of {models.length} models &middot; {CATEGORY_ORDER.length} categories
        </p>

        {/* ── filter bar ── */}
        <div
          className="rounded-2xl border border-white/[0.07] p-5 mb-6"
          style={{ background: "var(--dm-filterbar-bg)", boxShadow: "0 0 0 1px var(--dm-border-a)" }}
        >
          <div className="flex flex-wrap gap-3 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Search</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">⌕</span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Name, task, category, origin…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 placeholder-white/20"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Category */}
            <div className="min-w-[180px]">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as Category | "All")}
                className="w-full py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                style={SELECT_STYLE}
              >
                <option value="All">All categories</option>
                {CATEGORY_ORDER.map(c => (
                  <option key={c} value={c}>{c} ({models.filter(m => m.category === c).length})</option>
                ))}
              </select>
            </div>

            {/* Origin */}
            <DarkSelect label="Origin" value={originFilter} onChange={setOriginFilter}>
              {origins.map(o => <option key={o} value={o}>{o}</option>)}
            </DarkSelect>

            {/* CPU */}
            <DarkSelect label="CPU Support"
              value={cpuFilter === null ? "any" : cpuFilter ? "yes" : "no"}
              onChange={v => setCpuFilter(v === "any" ? null : v === "yes")}>
              <option value="any">Any</option>
              <option value="yes">CPU ✓</option>
              <option value="no">GPU only</option>
            </DarkSelect>

            {/* Commercial */}
            <DarkSelect label="License"
              value={commercialFilter === null ? "any" : commercialFilter ? "yes" : "no"}
              onChange={v => setCommercialFilter(v === "any" ? null : v === "yes")}>
              <option value="any">Any</option>
              <option value="yes">Commercial ✓</option>
              <option value="no">Non-commercial</option>
            </DarkSelect>

            {/* Group by */}
            <DarkSelect label="Group by" value={groupBy} onChange={v => setGroupBy(v as GroupKey)}>
              {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </DarkSelect>

            {/* Columns */}
            <ColumnToggle visible={visibleCols} onChange={setVisibleCols} />

            {/* Reset */}
            <button
              onClick={() => {
                setSearch(""); setCategoryFilter("All"); setOriginFilter("All");
                setCpuFilter(null); setCommercialFilter(null);
                setSortKey("category"); setSortDir("asc"); setGroupBy("category");
              }}
              className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Reset
            </button>
          </div>

          {/* Category legend */}
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {CATEGORY_ORDER.map(c => {
              const col = catPalette[c];
              const count = models.filter(m => m.category === c).length;
              const active = categoryFilter === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(active ? "All" : c)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: active ? col.badge : "var(--dm-surface-b)",
                    color: active ? col.badgeText : "var(--dm-txt-muted)",
                    border: `1px solid ${active ? col.accent + "55" : "var(--dm-border-b)"}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: col.accent }} />
                  {c}
                  <span style={{ opacity: 0.6 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── table ── */}
        <div
          className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead>
                <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                  {selectionMode && <th className="w-10 px-3 py-3" />}
                  <th className="w-10 px-3 py-3" />
                  <SortableTh<SortKey> label="Model" k="name" width="w-44" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh<SortKey> label="Category" k="category" width="w-36" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh<SortKey> label="Year" k="year" width="w-24" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <SortableTh<SortKey> label="Params" k="params" width="w-28" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {visibleCols.size && <th className="w-28 px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Size</th>}
                  {visibleCols.vram && <th className="w-28 px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">VRAM</th>}
                  {visibleCols.cpu && <th className="w-12 px-2 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">CPU</th>}
                  {visibleCols.commercial && <th className="w-20 px-2 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Com.</th>}
                  {visibleCols.maintained && <th className="w-14 px-2 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Act.</th>}
                  {visibleCols.finetuning && <th className="w-16 px-2 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Fine.</th>}
                  {visibleCols.origin && <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Origin</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={COLS} className="px-6 py-16 text-center text-white/30 text-sm">
                      No models match your filters.
                    </td>
                  </tr>
                )}
                {groups.map(({ label, rows }) => (
                  <>
                    {groupBy !== "none" && label && (
                      <GroupHeader key={`group-${label}`} label={label} count={rows.length} colSpan={COLS} />
                    )}
                    {rows.map((model, idx) => {
                      const col = catPalette[model.category];
                      const isExpanded = expandedId === model.hfId;
                      const bg = idx % 2 === 0 ? col.row : col.rowAlt;
                      return (
                        <>
                          <tr
                            key={model.hfId}
                            onClick={() => setExpandedId(isExpanded ? null : model.hfId)}
                            onKeyDown={e => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setExpandedId(isExpanded ? null : model.hfId);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-expanded={isExpanded}
                            className="cursor-pointer transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
                            style={{
                              background: bg,
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                            }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.background = `rgba(${hexToRgb(col.accent)},0.12)`;
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.background = bg;
                            }}
                          >
                            {/* select */}
                            {selectionMode && (
                              <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selected.has(model.hfId)}
                                  onChange={() => onToggleSelect(model.hfId)}
                                  aria-label={`Select ${model.name} for deployment sizing`}
                                  className="w-4 h-4 cursor-pointer accent-[#22d3ee]"
                                />
                              </td>
                            )}
                            {/* chevron */}
                            <td className="px-3 py-3 text-center">
                              <span
                                className="text-[10px] inline-block transition-transform duration-150"
                                style={{ color: col.accent, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                              >▶</span>
                            </td>
                            {/* name */}
                            <td className="px-4 py-3 overflow-hidden">
                              <div className="font-semibold text-white/90 text-sm leading-tight truncate">{model.name}</div>
                              <div className="text-[11px] text-white/30 mt-0.5 font-mono truncate">{model.hfId}</div>
                            </td>
                            {/* category */}
                            <td className="px-4 py-3 overflow-hidden">
                              <span
                                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none truncate max-w-full"
                                style={{ background: col.badge, color: col.badgeText }}
                              >
                                {model.category}
                              </span>
                            </td>
                            {/* year */}
                            <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs font-mono">{model.yearLabel}</td>
                            {/* params */}
                            <td className="px-4 py-3 overflow-hidden">
                              <span className="font-mono text-xs font-semibold truncate block" style={{ color: col.accent }} title={model.params}>{model.params}</span>
                            </td>
                            {/* size */}
                            {visibleCols.size && (
                              <td className="px-4 py-3 overflow-hidden">
                                <span className="text-white/50 text-xs truncate block" title={model.modelSize}>{model.modelSize}</span>
                              </td>
                            )}
                            {/* vram */}
                            {visibleCols.vram && (
                              <td className="px-4 py-3 overflow-hidden">
                                <span className="text-white/50 text-xs truncate block" title={model.vram}>{model.vram}</span>
                              </td>
                            )}
                            {/* cpu */}
                            {visibleCols.cpu && <td className="px-2 py-3 text-center"><BoolIcon val={model.cpuSupport} /></td>}
                            {/* commercial */}
                            {visibleCols.commercial && <td className="px-2 py-3 text-center"><BoolIcon val={model.commercial} /></td>}
                            {/* maintained */}
                            {visibleCols.maintained && <td className="px-2 py-3 text-center"><BoolIcon val={model.maintained} /></td>}
                            {/* finetune */}
                            {visibleCols.finetuning && <td className="px-2 py-3 text-center"><BoolIcon val={model.finetuning} /></td>}
                            {/* origin */}
                            {visibleCols.origin && <td className="px-4 py-3 text-white/40 text-xs">{model.origin}</td>}
                          </tr>
                          {isExpanded && (
                            <ExpandedRow key={`${model.hfId}-exp`} model={model} colSpan={COLS} />
                          )}
                        </>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── footer ── */}
        <p className="mt-3 text-xs text-white/25 text-right">
          {filtered.length} of {models.length} models displayed
        </p>
    </div>
  );
}
