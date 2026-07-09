"use client";

import { useState, useMemo } from "react";
import { models, CATEGORY_ORDER, type Category, type Model } from "./data";

// ── dark-theme category palette ───────────────────────────────────────────────

const DARK_CAT: Record<Category, { accent: string; row: string; rowAlt: string; badge: string; badgeText: string }> = {
  "OCR & Document":         { accent: "#22d3ee", row: "rgba(34,211,238,0.04)",  rowAlt: "rgba(34,211,238,0.07)",  badge: "rgba(34,211,238,0.15)",  badgeText: "#67e8f9" },
  "Vision & Multimodal":    { accent: "#a78bfa", row: "rgba(167,139,250,0.04)", rowAlt: "rgba(167,139,250,0.07)", badge: "rgba(167,139,250,0.15)", badgeText: "#c4b5fd" },
  "Speech & Audio":         { accent: "#34d399", row: "rgba(52,211,153,0.04)",  rowAlt: "rgba(52,211,153,0.07)",  badge: "rgba(52,211,153,0.15)",  badgeText: "#6ee7b7" },
  "Translation":            { accent: "#fbbf24", row: "rgba(251,191,36,0.04)",  rowAlt: "rgba(251,191,36,0.07)",  badge: "rgba(251,191,36,0.15)",  badgeText: "#fcd34d" },
  "Embeddings & Retrieval": { accent: "#60a5fa", row: "rgba(96,165,250,0.04)",  rowAlt: "rgba(96,165,250,0.07)",  badge: "rgba(96,165,250,0.15)",  badgeText: "#93c5fd" },
  "Safety & Guardrails":    { accent: "#f87171", row: "rgba(248,113,113,0.04)", rowAlt: "rgba(248,113,113,0.07)", badge: "rgba(248,113,113,0.15)", badgeText: "#fca5a5" },
  "LLM":                    { accent: "#818cf8", row: "rgba(129,140,248,0.04)", rowAlt: "rgba(129,140,248,0.07)", badge: "rgba(129,140,248,0.15)", badgeText: "#a5b4fc" },
  "Code & Agents":          { accent: "#fb923c", row: "rgba(251,146,60,0.04)",  rowAlt: "rgba(251,146,60,0.07)",  badge: "rgba(251,146,60,0.15)",  badgeText: "#fdba74" },
};

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
    ? <span style={{ color: "#34d399" }} className="font-bold text-sm select-none">✓</span>
    : <span className="text-white/20 text-sm select-none">—</span>;
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
        className="py-2 px-3 text-sm rounded-lg text-white/80 focus:outline-none focus:ring-1 appearance-none pr-7"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {children}
      </select>
    </div>
  );
}

// ── expanded detail panel ─────────────────────────────────────────────────────

function ExpandedRow({ model, colSpan }: { model: Model; colSpan: number }) {
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

export function ModelsView() {
  const [search, setSearch]                 = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [originFilter, setOriginFilter]     = useState<string>("All");
  const [cpuFilter, setCpuFilter]           = useState<boolean | null>(null);
  const [commercialFilter, setCommercialFilter] = useState<boolean | null>(null);
  const [sortKey, setSortKey]               = useState<SortKey>("category");
  const [sortDir, setSortDir]               = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy]               = useState<GroupKey>("category");
  const [expandedId, setExpandedId]         = useState<string | null>(null);

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

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-white/20 ml-1">↕</span>;
    return <span className="ml-1" style={{ color: "#22d3ee" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const COLS = 12;

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.8)",
  };

  return (
    <main
      className="min-h-screen"
      style={{ background: "linear-gradient(170deg, #020c1f 0%, #040d20 50%, #020c1f 100%)" }}
    >
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-12">

        {/* ── header ── */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#22d3ee]/80">Model Registry</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Model Catalog</h1>
          <p className="mt-1 text-base text-white/40">
            {filtered.length} of {models.length} models &middot; {CATEGORY_ORDER.length} categories
          </p>
        </div>

        {/* ── filter bar ── */}
        <div
          className="rounded-2xl border border-white/[0.07] p-5 mb-6"
          style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.02)" }}
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
                className="w-full py-2 px-3 text-sm rounded-lg text-white/80 focus:outline-none"
                style={inputStyle}
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

            {/* Reset */}
            <button
              onClick={() => {
                setSearch(""); setCategoryFilter("All"); setOriginFilter("All");
                setCpuFilter(null); setCommercialFilter(null);
                setSortKey("category"); setSortDir("asc"); setGroupBy("category");
              }}
              className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors"
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
                    background: active ? col.badge : "rgba(255,255,255,0.04)",
                    color: active ? col.badgeText : "rgba(255,255,255,0.45)",
                    border: `1px solid ${active ? col.accent + "55" : "rgba(255,255,255,0.08)"}`,
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
          style={{ background: "rgba(5,15,34,0.8)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="px-4 py-3 w-8" />
                  <th className="px-4 py-3 text-left font-semibold text-white/50 cursor-pointer select-none whitespace-nowrap text-xs uppercase tracking-wider"
                      onClick={() => toggleSort("name")}>
                    Model <SortIcon k="name" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 cursor-pointer select-none text-xs uppercase tracking-wider"
                      onClick={() => toggleSort("category")}>
                    Category <SortIcon k="category" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 cursor-pointer select-none text-xs uppercase tracking-wider"
                      onClick={() => toggleSort("year")}>
                    Year <SortIcon k="year" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 cursor-pointer select-none text-xs uppercase tracking-wider whitespace-nowrap"
                      onClick={() => toggleSort("params")}>
                    Params <SortIcon k="params" />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider whitespace-nowrap">Size</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">VRAM</th>
                  <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">CPU</th>
                  <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider whitespace-nowrap">Commercial</th>
                  <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider whitespace-nowrap">Active</th>
                  <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider whitespace-nowrap">Finetune</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Origin</th>
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
                      return (
                        <>
                          <tr
                            key={model.hfId}
                            onClick={() => setExpandedId(isExpanded ? null : model.hfId)}
                            className="cursor-pointer transition-all"
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
                            {/* chevron */}
                            <td className="px-3 py-3 text-center">
                              <span
                                className="text-[10px] inline-block transition-transform duration-150"
                                style={{ color: col.accent, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                              >▶</span>
                            </td>
                            {/* name */}
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white/90 text-sm leading-tight">{model.name}</div>
                              <div className="text-[11px] text-white/30 mt-0.5 font-mono">{model.hfId}</div>
                            </td>
                            {/* category */}
                            <td className="px-4 py-3">
                              <span
                                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
                                style={{ background: col.badge, color: col.badgeText }}
                              >
                                {model.category}
                              </span>
                            </td>
                            {/* year */}
                            <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs font-mono">{model.yearLabel}</td>
                            {/* params */}
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap font-semibold" style={{ color: col.accent }}>{model.params}</td>
                            {/* size */}
                            <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">{model.modelSize}</td>
                            {/* vram */}
                            <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">{model.vram}</td>
                            {/* cpu */}
                            <td className="px-4 py-3 text-center"><BoolIcon val={model.cpuSupport} /></td>
                            {/* commercial */}
                            <td className="px-4 py-3 text-center"><BoolIcon val={model.commercial} /></td>
                            {/* maintained */}
                            <td className="px-4 py-3 text-center"><BoolIcon val={model.maintained} /></td>
                            {/* finetune */}
                            <td className="px-4 py-3 text-center"><BoolIcon val={model.finetuning} /></td>
                            {/* origin */}
                            <td className="px-4 py-3 text-white/40 text-xs whitespace-nowrap">{model.origin}</td>
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
    </main>
  );
}
