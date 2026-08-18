/**
 * DIRECTION CONTRACT - Model Catalog Redesign
 *
 * THESIS: Technical catalog as precision instrument. Category-coded visual lanes replace table rows;
 * specs become scannable data chips; the catalog reads as a deployment reference, not a database dump.
 *
 * OWN-WORLD: Category accent system (cyan/violet/emerald/amber/blue/rose/indigo) governs vertical
 * lanes with distinctive row striping; specs render as compact data chips with mono numerics;
 * expandable details slide in as technical datasheets; dark aerospace/technical aesthetic with
 * Intel engineering precision.
 *
 * STORY: User scans category lanes visually distinct by color; spots target model by name or key
 * spec in data chips; expands for full deployment sheet; selects for sizing workflow; filters
 * narrow the field without losing spatial sense of categories.
 *
 * FIRST VIEWPORT: Full-width category lanes stack vertically, each with distinct accent stripe and
 * row shading; model rows show name (bold white), params (accent mono), key specs as inline chips
 * (VRAM, commercial, CPU), expand chevron left; filter bar floats above as translucent command
 * palette; selection checkboxes appear when sizing mode active.
 *
 * FORM: Enhanced table with category-lane visual system, inline spec chips, and technical datasheet
 * expansion - chosen for scanability and deployment precision.
 *
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
 * verdict, and DESIGN.md
 */
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { GripVertical, Rows3 } from "lucide-react";
import { models, CATEGORY_ORDER, type Category, type Model } from "./data";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme } from "@/contexts/ThemeContext";
import { CATEGORY_STYLE as DARK_CAT, badgeTextColor } from "./category-style";

// ── VRAM data types ───────────────────────────────────────────────────────────

interface VramData {
  model: string;
  category: string;
  kvCacheType: string;
  totalLayers: number;
  denseSelfattnLayers: number;
  windowLayers: number;
  windowSize: number;
  kvHeads: number;
  headDim: number;
  imageTokens: number;
  weightVramGiB: number;
  kvBytesPerTokPerLayer: number;
  cachedTokenLayersPerSeq: number;
  kvPerSeqMiB: number;
  kvTotalAtConcurrencyGiB: number;
  totalVramGiB: number;
  kvFormula: string;
  prov: string;
  notes: string;
  smallestSingleCard: { formula?: string; result?: string } | string | null;
}

type CatStyle = (typeof DARK_CAT)[Category];

// ── helpers ───────────────────────────────────────────────────────────────────

const GROUP_OPTIONS = [
  { value: "none",     label: "No grouping" },
  { value: "category", label: "Category" },
  { value: "year",     label: "Year" },
  { value: "origin",   label: "Origin" },
] as const;
type GroupKey = typeof GROUP_OPTIONS[number]["value"];

const EMPTY_SELECTION: Set<string> = new Set();

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

function extractNumber(s?: string): number {
  if (!s) return -1;
  const m = s.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : -1;
}

function toNum(val: number | string | undefined | null): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
}

// ── columns ────────────────────────────────────────────────────────────────────
// Every column (besides the pinned Model identity column) is independently
// sortable, reorderable via drag-and-drop on the header, and can be shown/hidden
// via the Columns picker — including the columns that appear only in Detailed view.

type ColKey =
  | "hfId" | "category" | "architecture" | "params" | "size" | "vram" | "year" | "origin"
  | "layers" | "kvHeads" | "headDim" | "imgTokens" | "weightVram" | "kvSeq" | "kvTotal" | "totalVram";

interface ColumnDef {
  key: ColKey;
  label: string;
  align: "left" | "center";
  detail?: boolean; // only rendered while Detailed view is on
  sortValue: (model: Model, vdata: VramData | undefined) => number | string;
  render: (model: Model, vdata: VramData | undefined, cat: CatStyle, isDark: boolean, compact: boolean) => React.ReactNode;
}

const COLUMN_DEFS: ColumnDef[] = [
  {
    key: "hfId", label: "HF ID", align: "left",
    sortValue: m => m.hfId,
    render: (m, _v, _c, _d, compact) => <span className={`${compact ? "text-[9px]" : "text-[11px]"} text-white/30 font-mono truncate block`}>{m.hfId}</span>,
  },
  {
    key: "category", label: "Category", align: "left",
    sortValue: m => CATEGORY_ORDER.indexOf(m.category),
    render: (m, _v, cat, isDark, compact) => (
      <span
        className={`inline-block rounded-full font-semibold leading-none ${compact ? "px-1.5 py-[3px] text-[9px]" : "px-2 py-0.5 text-[10px]"}`}
        style={{ background: cat.badge, color: badgeTextColor(isDark, cat.badgeText) }}
      >
        {m.category}
      </span>
    ),
  },
  {
    key: "architecture", label: "Architecture", align: "left",
    sortValue: m => m.architecture,
    render: (m, _v, _c, _d, compact) => <div className={`${compact ? "text-[10px] line-clamp-1 leading-tight" : "text-xs line-clamp-2"} text-white/60`}>{m.architecture}</div>,
  },
  {
    key: "params", label: "Params", align: "center",
    sortValue: m => paramToNumber(m.params),
    render: (m, _v, cat, _d, compact) => <span className={`font-mono ${compact ? "text-[10px]" : "text-sm"} font-bold`} style={{ color: cat.accent }}>{m.params}</span>,
  },
  {
    key: "size", label: "Size", align: "center",
    sortValue: m => extractNumber(m.modelSize),
    render: (m, _v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50 font-mono`}>{m.modelSize}</span>,
  },
  {
    key: "vram", label: "VRAM", align: "center",
    sortValue: (m, v) => v?.totalVramGiB ?? extractNumber(m.vram),
    render: (m, v, _c, _d, compact) => {
      const vramDisplay = v?.totalVramGiB ? `${v.totalVramGiB.toFixed(1)} GiB` : m.vram;
      return <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50 font-mono font-semibold`}>{vramDisplay || "—"}</span>;
    },
  },
  {
    key: "year", label: "Year", align: "center",
    sortValue: m => m.year,
    render: (m, _v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/40 font-mono`}>{m.yearLabel}</span>,
  },
  {
    key: "layers", label: "Layers", align: "center", detail: true,
    sortValue: (_m, v) => v?.totalLayers ?? -1,
    render: (_m, v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{v?.totalLayers ?? "—"}</span>,
  },
  {
    key: "kvHeads", label: "KV Heads", align: "center", detail: true,
    sortValue: (_m, v) => v?.kvHeads ?? -1,
    render: (_m, v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{v?.kvHeads ?? "—"}</span>,
  },
  {
    key: "headDim", label: "Head Dim", align: "center", detail: true,
    sortValue: (_m, v) => v?.headDim ?? -1,
    render: (_m, v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{v?.headDim ?? "—"}</span>,
  },
  {
    key: "imgTokens", label: "Img Tok", align: "center", detail: true,
    sortValue: (_m, v) => v?.imageTokens ?? -1,
    render: (_m, v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{v?.imageTokens ?? "—"}</span>,
  },
  {
    key: "weightVram", label: "Wt VRAM", align: "center", detail: true,
    sortValue: (_m, v) => toNum(v?.weightVramGiB) ?? -1,
    render: (_m, v, _c, _d, compact) => { const n = toNum(v?.weightVramGiB); return <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50 font-semibold`}>{n ? `${n.toFixed(1)} GiB` : "—"}</span>; },
  },
  {
    key: "kvSeq", label: "KV/seq", align: "center", detail: true,
    sortValue: (_m, v) => toNum(v?.kvPerSeqMiB) ?? -1,
    render: (_m, v, _c, _d, compact) => { const n = toNum(v?.kvPerSeqMiB); return <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{n ? `${n.toFixed(1)} MiB` : "—"}</span>; },
  },
  {
    key: "kvTotal", label: "KV Total", align: "center", detail: true,
    sortValue: (_m, v) => toNum(v?.kvTotalAtConcurrencyGiB) ?? -1,
    render: (_m, v, _c, _d, compact) => { const n = toNum(v?.kvTotalAtConcurrencyGiB); return <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/50`}>{n ? `${n.toFixed(2)} GiB` : "—"}</span>; },
  },
  {
    key: "totalVram", label: "Total VRAM", align: "center", detail: true,
    sortValue: (_m, v) => toNum(v?.totalVramGiB) ?? -1,
    render: (_m, v, _c, _d, compact) => { const n = toNum(v?.totalVramGiB); return <span className={`${compact ? "text-[10px]" : "text-xs"} font-bold`} style={{ color: "#22d3ee" }}>{n ? `${n.toFixed(2)} GiB` : "—"}</span>; },
  },
  {
    key: "origin", label: "Origin", align: "left",
    sortValue: m => m.origin,
    render: (m, _v, _c, _d, compact) => <span className={`${compact ? "text-[10px]" : "text-xs"} text-white/40`}>{m.origin}</span>,
  },
];

const COLUMN_DEF_MAP: Record<ColKey, ColumnDef> = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c])) as Record<ColKey, ColumnDef>;

const DEFAULT_COLUMN_ORDER: ColKey[] = COLUMN_DEFS.map(c => c.key);
const DEFAULT_VISIBLE: Record<ColKey, boolean> = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, true])) as Record<ColKey, boolean>;

type SortKey = "name" | ColKey;

function ColumnToggle({
  columnOrder, visible, detailedView, onChangeVisible,
}: {
  columnOrder: ColKey[];
  visible: Record<ColKey, boolean>;
  detailedView: boolean;
  onChangeVisible: (v: Record<ColKey, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useDismiss<HTMLDivElement>(open, () => { setOpen(false); triggerRef.current?.focus(); });

  const applicable = columnOrder.filter(k => detailedView || !COLUMN_DEF_MAP[k].detail);
  const hiddenCount = applicable.filter(k => !visible[k]).length;

  return (
    <div className="relative z-30" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="py-2 px-4 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-faint)" }}
      >
        Columns{hiddenCount > 0 ? ` (${applicable.length - hiddenCount}/${applicable.length})` : ""}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 rounded-lg border py-2 z-50 max-h-96 overflow-y-auto"
          style={{ background: "var(--dm-card-bg)", borderColor: "var(--dm-card-border)", boxShadow: "var(--dm-card-depth)" }}
        >
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
            Visible columns
          </p>
          {applicable.map(key => {
            const def = COLUMN_DEF_MAP[key];
            return (
              <label
                key={key}
                className="nav-menu-item flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer"
                style={{ color: "var(--dm-txt-secondary)" }}
              >
                <input
                  type="checkbox"
                  checked={visible[key]}
                  onChange={() => onChangeVisible({ ...visible, [key]: !visible[key] })}
                  className="w-3.5 h-3.5 cursor-pointer accent-[#22d3ee]"
                />
                {def.label}
                {def.detail && <span className="text-[9px] uppercase tracking-wide" style={{ color: "var(--dm-txt-faint)" }}>detail</span>}
              </label>
            );
          })}
          <p className="px-3 pt-2 mt-1 text-[10px] leading-snug" style={{ color: "var(--dm-txt-faint)", borderTop: "1px solid var(--dm-border-a)" }}>
            Drag a column header in the table to reorder it.
          </p>
        </div>
      )}
    </div>
  );
}

// ── ui primitives ─────────────────────────────────────────────────────────────

function selectStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }
    : { background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.15)", color: "#1e293b", colorScheme: "light" };
}

function SortableModelTh({ sortKey, sortDir, onSort, compact }: { sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void; compact: boolean }) {
  const active = sortKey === "name";
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      className={`px-4 ${compact ? "py-0.5" : "py-3"} text-left font-semibold text-white/50 text-xs uppercase tracking-wider border-l border-white/[0.08]`}
    >
      <button
        type="button" onClick={() => onSort("name")}
        className="flex items-center select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded"
      >
        Model
        {active
          ? <span className="ml-1" style={{ color: "#22d3ee" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
          : <span className="text-white/20 ml-1">↕</span>}
      </button>
    </th>
  );
}

/** A sortable header that also supports drag-and-drop reordering of the column. */
function DraggableTh({ col, sortKey, sortDir, onSort, draggedKey, onDragStart, onDrop, onDragEnd, compact }: {
  col: ColumnDef;
  sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void;
  draggedKey: ColKey | null;
  onDragStart: (k: ColKey) => void;
  onDrop: (k: ColKey) => void;
  onDragEnd: () => void;
  compact: boolean;
}) {
  const active = sortKey === col.key;
  const alignCls = col.align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      draggable
      onDragStart={() => onDragStart(col.key)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); onDrop(col.key); }}
      onDragEnd={onDragEnd}
      className={`px-4 ${compact ? "py-0.5" : "py-3"} ${alignCls} font-semibold text-white/50 text-xs uppercase tracking-wider border-l border-white/[0.08] cursor-grab active:cursor-grabbing transition-opacity`}
      style={{ opacity: draggedKey === col.key ? 0.35 : 1 }}
      title={`Drag to reorder · click to sort by ${col.label}`}
    >
      <button
        type="button" onClick={() => onSort(col.key)}
        className={`flex items-center gap-1 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded ${alignCls === "text-center" ? "mx-auto" : ""}`}
      >
        <GripVertical className="w-3 h-3 text-white/15 flex-shrink-0" aria-hidden />
        {col.label}
        {active
          ? <span style={{ color: "#22d3ee" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
          : <span className="text-white/20">↕</span>}
      </button>
    </th>
  );
}

function DarkSelect({ label, value, onChange, children }: {
  label: string; value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={selectStyle(theme === "dark")}
      >
        {children}
      </select>
    </div>
  );
}

// ── expanded detail panel ─────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function ExpandedDatasheet({ model, onClose, isDark }: { model: Model; onClose: () => void; isDark: boolean }) {
  const c = DARK_CAT[model.category];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border"
        style={{
          background: "var(--dm-card-bg)",
          borderColor: c.accent + "55",
          boxShadow: `0 0 0 1px ${c.accent}22, 0 32px 80px rgba(0,0,0,0.6)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 px-8 py-6 border-b backdrop-blur-sm"
          style={{ background: `linear-gradient(135deg, rgba(${hexToRgb(c.accent)},0.08) 0%, rgba(${hexToRgb(c.accent)},0.02) 100%)`, borderColor: c.accent + "33" }}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: c.badge, color: badgeTextColor(isDark, c.badgeText), border: `1px solid ${c.accent}55` }}
                >
                  {model.category}
                </span>
                <span className="text-xs text-white/30 font-mono">{model.yearLabel}</span>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight mb-1">{model.name}</h2>
              <p className="text-sm font-mono text-white/40">{model.hfId}</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
              aria-label="Close datasheet"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {/* Key specs bar */}
          <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Params</span>
              <span className="text-2xl font-mono font-bold" style={{ color: c.accent }}>{model.params}</span>
            </div>
            {model.modelSize && (
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Size</span>
                <span className="text-lg font-mono text-white/80">{model.modelSize}</span>
              </div>
            )}
            {model.vram && (
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">VRAM</span>
                <span className="text-lg font-mono text-white/80">{model.vram}</span>
              </div>
            )}
          </div>

          {/* Deployment specs grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
            {[
              { label: "Architecture", val: model.architecture },
              { label: "Key Benchmarks", val: model.keyBenchmarks },
              { label: "Recommended Use", val: model.recommendedUse },
              { label: "HuggingFace Adoption", val: model.hfAdoption },
              { label: "Known Limitations", val: model.knownLimitations },
              { label: "Cloud / Edge", val: model.cloudEdge },
              { label: "Max Tokens", val: model.maxTokens },
              { label: "Multilingual", val: model.multilingual },
            ].filter(({ val }) => val).map(({ label, val }) => (
              <div key={label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1.5">{label}</p>
                <p className="text-white/70 text-sm leading-relaxed">{val}</p>
              </div>
            ))}
          </div>

          {/* Technical details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Serving Options</p>
              <div className="flex flex-wrap gap-1.5">
                {model.serving.map(s => (
                  <span key={s} className="rounded px-2 py-1 text-xs text-white/70"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-2">Quantization</p>
              <div className="flex flex-wrap gap-1.5">
                {model.quantization.map(q => (
                  <span key={q} className="rounded px-2 py-1 text-xs font-semibold"
                    style={{ background: c.badge, color: badgeTextColor(isDark, c.badgeText), border: `1px solid ${c.accent}44` }}>
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer link */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <a
              href={`https://huggingface.co/${model.hfId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold hover:underline transition-colors"
              style={{ color: c.accent }}
            >
              🤗 View on HuggingFace
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── category lane header ──────────────────────────────────────────────────────

function CategoryLaneHeader({ category, count, accent }: { category: string; count: number; accent: string }) {
  return (
    <div
      className="sticky top-0 z-10 px-6 py-3 border-b backdrop-blur-sm"
      style={{
        background: `linear-gradient(90deg, rgba(${hexToRgb(accent)},0.12) 0%, rgba(${hexToRgb(accent)},0.04) 100%)`,
        borderLeft: `3px solid ${accent}`,
        borderBottom: `1px solid ${accent}33`,
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}88` }} />
        <h3 className="font-bold text-lg text-white tracking-tight">{category}</h3>
        <span className="text-xs text-white/30 font-medium">{count} model{count !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [originFilter, setOriginFilter]     = useState<string>("All");
  const [sortKey, setSortKey]               = useState<SortKey>("category");
  const [sortDir, setSortDir]               = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy]               = useState<GroupKey>("category");
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [columnOrder, setColumnOrder]       = useState<ColKey[]>(DEFAULT_COLUMN_ORDER);
  const [visibleCols, setVisibleCols]       = useState<Record<ColKey, boolean>>(DEFAULT_VISIBLE);
  const [draggedKey, setDraggedKey]         = useState<ColKey | null>(null);
  const [detailedView, setDetailedView]     = useState(false);
  const [compact, setCompact]               = useState(false);
  const [vramData, setVramData]             = useState<VramData[]>([]);

  // Load VRAM data
  useEffect(() => {
    fetch("/vram_data.json")
      .then(res => res.json())
      .then(data => setVramData(data))
      .catch(err => console.error("Failed to load VRAM data:", err));
  }, []);

  // Helper to find VRAM data for a model
  const getVramDataForModel = (model: Model): VramData | undefined => {
    // Try exact match first
    let match = vramData.find(v => v.model === model.name);
    if (match) return match;

    // Try case-insensitive match
    match = vramData.find(v => v.model.toLowerCase() === model.name.toLowerCase());
    if (match) return match;

    // Try matching by HF ID (extract model name from HF ID)
    const hfModelName = model.hfId.split("/").pop() || "";
    match = vramData.find(v => v.model.toLowerCase().includes(hfModelName.toLowerCase()));
    return match;
  };

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
      return true;
    });
  }, [search, categoryFilter, originFilter]);

  const sorted = useMemo(() => {
    const colDef = sortKey === "name" ? null : COLUMN_DEF_MAP[sortKey];
    return [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (!colDef) {
        av = a.name; bv = b.name;
      } else {
        av = colDef.sortValue(a, getVramDataForModel(a));
        bv = colDef.sortValue(b, getVramDataForModel(b));
      }
      const cmp = typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, sortKey, sortDir, vramData]);

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

  function handleColumnDrop(targetKey: ColKey) {
    setColumnOrder(prev => {
      if (!draggedKey || draggedKey === targetKey) return prev;
      const next = [...prev];
      const from = next.indexOf(draggedKey);
      const to = next.indexOf(targetKey);
      if (from === -1 || to === -1) return prev;
      next.splice(from, 1);
      next.splice(to, 0, draggedKey);
      return next;
    });
    setDraggedKey(null);
  }

  const displayedColumns = columnOrder
    .filter(k => visibleCols[k] && (detailedView || !COLUMN_DEF_MAP[k].detail))
    .map(k => COLUMN_DEF_MAP[k]);

  const COLS = (selectionMode ? 1 : 0) + 1 /* chevron */ + 1 /* model */ + displayedColumns.length;

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

        {/* ── filter command palette ── */}
        <div
          className="rounded-2xl border border-white/[0.07] p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px var(--dm-border-a)", backdropFilter: "blur(8px)" }}
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
            <div className="min-w-[180px] relative z-20">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as Category | "All")}
                className="w-full py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                style={selectStyle(isDark)}
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

            {/* Group by */}
            <DarkSelect label="Group by" value={groupBy} onChange={v => setGroupBy(v as GroupKey)}>
              {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </DarkSelect>

            {/* Columns */}
            <ColumnToggle columnOrder={columnOrder} visible={visibleCols} detailedView={detailedView} onChangeVisible={setVisibleCols} />

            {/* Detailed View Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none py-2 px-4 rounded-lg transition-colors"
              style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
              <span className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>Detailed</span>
              <span
                role="switch"
                aria-checked={detailedView}
                onClick={() => setDetailedView(v => !v)}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                style={{ background: detailedView ? "#22d3ee" : "rgba(255,255,255,0.15)" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                  style={{ transform: detailedView ? "translateX(18px)" : "translateX(3px)" }}
                />
              </span>
            </label>

            {/* Reset */}
            <button
              onClick={() => {
                setSearch(""); setCategoryFilter("All"); setOriginFilter("All");
                setSortKey("category"); setSortDir("asc"); setGroupBy("category");
                setColumnOrder(DEFAULT_COLUMN_ORDER); setVisibleCols(DEFAULT_VISIBLE);
              }}
              className="py-2 px-4 text-sm rounded-lg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-faint)" }}
            >
              Reset
            </button>

            {/* Compact view */}
            <button
              onClick={() => setCompact(v => !v)}
              title={compact ? "Switch back to the normal row height" : "Compact view — minimize row height for the visible columns"}
              aria-label={compact ? "Normal view" : "Compact view"}
              aria-pressed={compact}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors"
              style={compact
                ? { background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)", color: "#38bdf8" }
                : { background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-faint)" }}
            >
              <Rows3 className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>

          {/* Category chips */}
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {CATEGORY_ORDER.map(c => {
              const col = DARK_CAT[c];
              const count = models.filter(m => m.category === c).length;
              const active = categoryFilter === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(active ? "All" : c)}
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
        </div>

        {/* ── traditional table with category-coded styling ── */}
        <div
          className="rounded-2xl border border-white/[0.07] overflow-hidden"
          style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              {filtered.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={COLS} className="px-6 py-16 text-center text-white/30 text-sm">
                      No models match your filters.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <>
                  {groups.map(({ label, rows }) => {
                    const cat = label as Category;
                    const col = DARK_CAT[cat] || { accent: "#3399ff", row: "rgba(51,153,255,0.04)", rowAlt: "rgba(51,153,255,0.07)" };
                    return (
                      <tbody key={label}>
                        {/* Category header */}
                        {groupBy === "category" && label && (
                          <tr>
                            <td colSpan={COLS}>
                              <CategoryLaneHeader category={label} count={rows.length} accent={col.accent} />
                            </td>
                          </tr>
                        )}

                        {/* Table header row */}
                        <tr style={{ background: "var(--dm-table-head)", borderBottom: `2px solid ${col.accent}44` }}>
                          {selectionMode && (
                            <th className={`px-3 ${compact ? "py-0.5" : "py-3"} text-center font-semibold text-white/50 text-xs uppercase tracking-wider w-12`}></th>
                          )}
                          <th className={`px-3 ${compact ? "py-0.5" : "py-3"} text-center font-semibold text-white/50 text-xs uppercase tracking-wider w-12`}></th>
                          <SortableModelTh sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} compact={compact} />
                          {displayedColumns.map(colDef => (
                            <DraggableTh
                              key={colDef.key}
                              col={colDef}
                              sortKey={sortKey}
                              sortDir={sortDir}
                              onSort={toggleSort}
                              draggedKey={draggedKey}
                              onDragStart={setDraggedKey}
                              onDrop={handleColumnDrop}
                              onDragEnd={() => setDraggedKey(null)}
                              compact={compact}
                            />
                          ))}
                        </tr>

                        {/* Model rows */}
                        {rows.map((model, idx) => {
                          const bg = idx % 2 === 0 ? col.row : col.rowAlt;
                          const isExpanded = expandedId === model.hfId;
                          const vdata = getVramDataForModel(model);
                          return (
                            <tr
                              key={model.hfId}
                              className="group transition-all border-b border-white/[0.04]"
                              style={{ background: bg }}
                              onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.background = `rgba(${hexToRgb(col.accent)},0.1)`;
                              }}
                              onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.background = bg;
                              }}
                            >
                              {/* Selection */}
                              {selectionMode && (
                                <td className={`px-3 ${compact ? "py-0.5" : "py-3"} text-center`} onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selected.has(model.hfId)}
                                    onChange={() => onToggleSelect(model.hfId)}
                                    aria-label={`Select ${model.name} for deployment sizing`}
                                    className="w-4 h-4 cursor-pointer accent-[#22d3ee]"
                                  />
                                </td>
                              )}

                              {/* Expand */}
                              <td className={`px-3 ${compact ? "py-0.5" : "py-3"} text-center`}>
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : model.hfId)}
                                  className={`${compact ? "w-4 h-4" : "w-6 h-6"} flex items-center justify-center rounded opacity-40 group-hover:opacity-100 transition-opacity`}
                                  aria-label={`View ${model.name} datasheet`}
                                >
                                  <svg className={compact ? "w-3 h-3" : "w-4 h-4"} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: col.accent }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </td>

                              {/* Model */}
                              <td className={`px-4 ${compact ? "py-0.5" : "py-3"} border-l border-white/[0.05]`}>
                                <div className={`font-bold ${compact ? "text-[11px] leading-tight" : "text-sm"} text-white truncate`}>{model.name}</div>
                              </td>

                              {/* dynamic columns */}
                              {displayedColumns.map(colDef => (
                                <td key={colDef.key} className={`${compact ? "py-0.5" : "py-3"} border-l border-white/[0.05] ${colDef.align === "center" ? "px-2 text-center" : "px-4"} ${colDef.key === "architecture" ? "max-w-xs" : ""}`}>
                                  {colDef.render(model, vdata, col as CatStyle, isDark, compact)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    );
                  })}
                </>
              )}
            </table>
          </div>
        </div>

        {/* ── footer ── */}
        <p className="mt-3 text-xs text-white/25 text-right">
          {filtered.length} of {models.length} models displayed
        </p>

        {/* ── expanded datasheet modal ── */}
        {expandedId && (
          <ExpandedDatasheet
            model={models.find(m => m.hfId === expandedId)!}
            onClose={() => setExpandedId(null)}
            isDark={isDark}
          />
        )}
    </div>
  );
}
