"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { models, CATEGORY_ORDER, type Category, type Model } from "./data";
import { useDismiss } from "@/hooks/useDismiss";
import { useTheme } from "@/contexts/ThemeContext";
import { CATEGORY_STYLE as DARK_CAT, badgeTextColor } from "./category-style";
import { useRegisterExport } from "@/contexts/ExportContext";
import { exportModelCatalogToExcel } from "./export";

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

// ── columns ────────────────────────────────────────────────────────────────────
// The table is dense (12–13 columns). Every column (besides the pinned Model
// identity column) is independently sortable, reorderable via drag-and-drop on
// the header, and can be shown/hidden via the Columns picker — including the
// columns that appear only in Detailed view.

type ColKey =
  | "category" | "year" | "params" | "vram" | "origin"
  | "layers" | "kvHeads" | "headDim" | "imgTokens" | "weightVram" | "kvSeq" | "kvTotal" | "totalVram";

interface ColumnDef {
  key: ColKey;
  label: string;
  width: string;
  align: "left" | "center";
  detail?: boolean; // only rendered while Detailed view is on
  sortValue: (model: Model, vdata: VramData | undefined) => number | string;
  render: (model: Model, vdata: VramData | undefined, cat: CatStyle, isDark: boolean) => React.ReactNode;
}

const COLUMN_DEFS: ColumnDef[] = [
  {
    key: "category", label: "Category", width: "w-36", align: "left",
    sortValue: m => CATEGORY_ORDER.indexOf(m.category),
    render: (m, _v, cat, isDark) => (
      <span
        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none truncate max-w-full"
        style={{ background: cat.badge, color: badgeTextColor(isDark, cat.badgeText) }}
      >
        {m.category}
      </span>
    ),
  },
  {
    key: "year", label: "Year", width: "w-24", align: "left",
    sortValue: m => m.year,
    render: m => <span className="text-white/50 whitespace-nowrap text-xs font-mono">{m.yearLabel}</span>,
  },
  {
    key: "params", label: "Params", width: "w-28", align: "left",
    sortValue: m => paramToNumber(m.params),
    render: (m, _v, cat) => (
      <span className="font-mono text-xs font-semibold truncate block" style={{ color: cat.accent }} title={m.params}>{m.params}</span>
    ),
  },
  {
    key: "vram", label: "VRAM", width: "w-28", align: "left",
    sortValue: (m, v) => v?.totalVramGiB ?? paramToNumber(m.vram),
    render: (m, v) => {
      const vramDisplay = v?.totalVramGiB ? `${v.totalVramGiB.toFixed(1)} GiB` : m.vram;
      return <span className="text-white/50 text-xs truncate block font-semibold" title={vramDisplay}>{vramDisplay}</span>;
    },
  },
  {
    key: "origin", label: "Origin", width: "w-auto", align: "left",
    sortValue: m => m.origin,
    render: m => <span className="text-white/40 text-xs">{m.origin}</span>,
  },
  {
    key: "layers", label: "Layers", width: "w-20", align: "center", detail: true,
    sortValue: (_m, v) => v?.totalLayers ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.totalLayers ?? "—"}</span>,
  },
  {
    key: "kvHeads", label: "KV Heads", width: "w-20", align: "center", detail: true,
    sortValue: (_m, v) => v?.kvHeads ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.kvHeads ?? "—"}</span>,
  },
  {
    key: "headDim", label: "Head Dim", width: "w-20", align: "center", detail: true,
    sortValue: (_m, v) => v?.headDim ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.headDim ?? "—"}</span>,
  },
  {
    key: "imgTokens", label: "Img Tokens", width: "w-24", align: "center", detail: true,
    sortValue: (_m, v) => v?.imageTokens ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.imageTokens ?? "—"}</span>,
  },
  {
    key: "weightVram", label: "Weight VRAM", width: "w-28", align: "center", detail: true,
    sortValue: (_m, v) => v?.weightVramGiB ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs font-semibold">{v?.weightVramGiB ? `${v.weightVramGiB.toFixed(1)} GiB` : "—"}</span>,
  },
  {
    key: "kvSeq", label: "KV/seq (MiB)", width: "w-32", align: "center", detail: true,
    sortValue: (_m, v) => v?.kvPerSeqMiB ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.kvPerSeqMiB ? `${v.kvPerSeqMiB.toFixed(1)} MiB` : "—"}</span>,
  },
  {
    key: "kvTotal", label: "KV Total (GiB)", width: "w-32", align: "center", detail: true,
    sortValue: (_m, v) => v?.kvTotalAtConcurrencyGiB ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs">{v?.kvTotalAtConcurrencyGiB ? `${v.kvTotalAtConcurrencyGiB.toFixed(2)} GiB` : "—"}</span>,
  },
  {
    key: "totalVram", label: "Total VRAM", width: "w-32", align: "center", detail: true,
    sortValue: (_m, v) => v?.totalVramGiB ?? -1,
    render: (_m, v) => <span className="text-white/50 text-xs font-bold" style={{ color: "#22d3ee" }}>{v?.totalVramGiB ? `${v.totalVramGiB.toFixed(2)} GiB` : "—"}</span>,
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
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        Columns{hiddenCount > 0 ? ` (${applicable.length - hiddenCount}/${applicable.length})` : ""}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-60 rounded-lg border py-2 z-20 max-h-96 overflow-y-auto"
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

function selectStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }
    : { background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.15)", color: "#1e293b", colorScheme: "light" };
}

function SortableTh({ label, k, width, sortKey, sortDir, onSort }: {
  label: string; k: SortKey; width: string; sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void;
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

/** A sortable header that also supports drag-and-drop reordering of the column. */
function DraggableTh({ col, sortKey, sortDir, onSort, draggedKey, onDragStart, onDragOver, onDrop, onDragEnd }: {
  col: ColumnDef;
  sortKey: SortKey; sortDir: "asc" | "desc"; onSort: (k: SortKey) => void;
  draggedKey: ColKey | null;
  onDragStart: (k: ColKey) => void;
  onDragOver: (k: ColKey) => void;
  onDrop: (k: ColKey) => void;
  onDragEnd: () => void;
}) {
  const active = sortKey === col.key;
  const alignCls = col.align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      draggable
      onDragStart={() => onDragStart(col.key)}
      onDragOver={e => { e.preventDefault(); onDragOver(col.key); }}
      onDrop={e => { e.preventDefault(); onDrop(col.key); }}
      onDragEnd={onDragEnd}
      className={`${col.width} px-4 py-3 ${alignCls} font-semibold text-white/50 text-xs uppercase tracking-wider cursor-grab active:cursor-grabbing transition-opacity`}
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

function ExpandedRow({ model, colSpan, isDark, vramData, detailedView }: {
  model: Model;
  colSpan: number;
  isDark: boolean;
  vramData?: VramData;
  detailedView: boolean;
}) {
  const c = DARK_CAT[model.category];
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
                    style={{ background: c.badge, color: badgeTextColor(isDark, c.badgeText), border: `1px solid ${c.accent}33` }}>
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed VRAM Info Section */}
          {detailedView && vramData && (
            <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-3">KV Cache & VRAM Details</p>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-white/40 mb-0.5">KV Cache Type</p>
                  <p className="text-white/70 font-medium">{vramData.kvCacheType}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-0.5">Dense / Self-attn Layers</p>
                  <p className="text-white/70 font-medium">{vramData.denseSelfattnLayers}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-0.5">Window Layers</p>
                  <p className="text-white/70 font-medium">{vramData.windowLayers} {vramData.windowSize > 0 ? `(size: ${vramData.windowSize})` : ""}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-0.5">KV Bytes/tok/layer</p>
                  <p className="text-white/70 font-medium">{vramData.kvBytesPerTokPerLayer.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/40 mb-0.5">Cached Token-layers/seq</p>
                  <p className="text-white/70 font-medium">{vramData.cachedTokenLayersPerSeq.toLocaleString()}</p>
                </div>
                {vramData.notes && (
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-white/40 mb-0.5">Notes</p>
                    <p className="text-white/60 text-xs italic leading-relaxed">{vramData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
  const accent = DARK_CAT[cat]?.accent ?? "#3399ff";
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [originFilter, setOriginFilter]     = useState<string>("All");
  const [cpuFilter, setCpuFilter]           = useState<boolean | null>(null);
  const [commercialFilter, setCommercialFilter] = useState<boolean | null>(null);
  const [sortKey, setSortKey]               = useState<SortKey>("category");
  const [sortDir, setSortDir]               = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy]               = useState<GroupKey>("category");
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [columnOrder, setColumnOrder]       = useState<ColKey[]>(DEFAULT_COLUMN_ORDER);
  const [visibleCols, setVisibleCols]       = useState<Record<ColKey, boolean>>(DEFAULT_VISIBLE);
  const [draggedKey, setDraggedKey]         = useState<ColKey | null>(null);
  const [detailedView, setDetailedView]     = useState(false);
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

  // Register Excel export handler
  useRegisterExport(async () => {
    await exportModelCatalogToExcel(models);
  }, "Export Model Catalog to Excel");

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
            <ColumnToggle columnOrder={columnOrder} visible={visibleCols} detailedView={detailedView} onChangeVisible={setVisibleCols} />

            {/* Detailed View Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none py-2 px-4 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-sm text-white/40">Detailed</span>
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
                setCpuFilter(null); setCommercialFilter(null);
                setSortKey("category"); setSortDir("asc"); setGroupBy("category");
                setColumnOrder(DEFAULT_COLUMN_ORDER); setVisibleCols(DEFAULT_VISIBLE);
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
                  <SortableTh label="Model" k="name" width="w-44" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {displayedColumns.map(col => (
                    <DraggableTh
                      key={col.key}
                      col={col}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                      draggedKey={draggedKey}
                      onDragStart={setDraggedKey}
                      onDragOver={() => {}}
                      onDrop={handleColumnDrop}
                      onDragEnd={() => setDraggedKey(null)}
                    />
                  ))}
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
                      const col = DARK_CAT[model.category];
                      const isExpanded = expandedId === model.hfId;
                      const bg = idx % 2 === 0 ? col.row : col.rowAlt;
                      const vdata = getVramDataForModel(model);
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
                            {/* dynamic columns */}
                            {displayedColumns.map(colDef => (
                              <td key={colDef.key} className={`py-3 overflow-hidden ${colDef.align === "center" ? "px-2 text-center" : "px-4"}`}>
                                {colDef.render(model, vdata, col, isDark)}
                              </td>
                            ))}
                          </tr>
                          {isExpanded && (
                            <ExpandedRow
                              key={`${model.hfId}-exp`}
                              model={model}
                              colSpan={COLS}
                              isDark={isDark}
                              vramData={vdata}
                              detailedView={detailedView}
                            />
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
