"use client";

import { useState, useMemo } from "react";
import { models, CATEGORY_ORDER, CATEGORY_COLORS, type Category, type Model } from "./data";

// ── helpers ──────────────────────────────────────────────────────────────────

function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${className}`}>
      {text}
    </span>
  );
}

function BoolIcon({ val }: { val: boolean }) {
  return val
    ? <span className="text-emerald-600 font-bold text-sm">✓</span>
    : <span className="text-gray-300 text-sm">—</span>;
}

const SORT_OPTIONS = [
  { value: "name",       label: "Name" },
  { value: "year",       label: "Year" },
  { value: "params",     label: "Params" },
  { value: "category",   label: "Category" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["value"];

const GROUP_OPTIONS = [
  { value: "none",     label: "No grouping" },
  { value: "category", label: "Category" },
  { value: "year",     label: "Year" },
  { value: "origin",   label: "Origin region" },
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

// ── expanded row detail ───────────────────────────────────────────────────────

function ExpandedRow({ model, colSpan }: { model: Model; colSpan: number }) {
  const colors = CATEGORY_COLORS[model.category];
  return (
    <tr>
      <td colSpan={colSpan} className={`${colors.row} px-6 py-4 border-b border-gray-200`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Architecture</p>
            <p className="text-gray-700">{model.architecture}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Key Benchmarks</p>
            <p className="text-gray-700">{model.keyBenchmarks}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Recommended Use</p>
            <p className="text-gray-700">{model.recommendedUse}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Serving Options</p>
            <div className="flex flex-wrap gap-1">
              {model.serving.map(s => (
                <span key={s} className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-600">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Quantization</p>
            <div className="flex flex-wrap gap-1">
              {model.quantization.map(q => (
                <span key={q} className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[11px] text-gray-600">{q}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">HuggingFace Adoption</p>
            <p className="text-gray-700">{model.hfAdoption}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Known Limitations</p>
            <p className="text-gray-700">{model.knownLimitations}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Cloud / Edge</p>
            <p className="text-gray-700">{model.cloudEdge}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Max Tokens</p>
            <p className="text-gray-700">{model.maxTokens}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center gap-2">
          <a
            href={`https://huggingface.co/${model.hfId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            🤗 {model.hfId}
          </a>
        </div>
      </td>
    </tr>
  );
}

// ── group header row ──────────────────────────────────────────────────────────

function GroupHeader({ label, count, colSpan }: { label: string; count: number; colSpan: number }) {
  return (
    <tr className="bg-gray-100 border-t-2 border-b border-gray-300">
      <td colSpan={colSpan} className="px-6 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-700">{label}</span>
          <span className="text-xs text-gray-400 font-medium">({count} model{count !== 1 ? "s" : ""})</span>
        </div>
      </td>
    </tr>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function ModelsView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Category | "All">("All");
  const [originFilter, setOriginFilter] = useState<string>("All");
  const [cpuFilter, setCpuFilter] = useState<boolean | null>(null);
  const [commercialFilter, setCommercialFilter] = useState<boolean | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<GroupKey>("category");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      return CATEGORY_ORDER
        .filter(c => map.has(c))
        .map(c => ({ label: c, rows: map.get(c)! }));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rows]) => ({ label, rows }));
  }

  const groups = groupModels();

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-intel-blue ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const COLS = 9;

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6">
      {/* ── page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-intel-dark">Model Catalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          {filtered.length} of {models.length} models · {CATEGORY_ORDER.length} categories
        </p>
      </div>

      {/* ── filter bar ── */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Search</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, task, category, origin…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30 focus:border-intel-blue"
              />
            </div>
          </div>

          {/* Category */}
          <div className="min-w-[180px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as Category | "All")}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30"
            >
              <option value="All">All categories</option>
              {CATEGORY_ORDER.map(c => (
                <option key={c} value={c}>{c} ({models.filter(m => m.category === c).length})</option>
              ))}
            </select>
          </div>

          {/* Origin */}
          <div className="min-w-[160px]">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Origin</label>
            <select
              value={originFilter}
              onChange={e => setOriginFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30"
            >
              {origins.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {/* CPU */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">CPU Support</label>
            <select
              value={cpuFilter === null ? "any" : cpuFilter ? "yes" : "no"}
              onChange={e => setCpuFilter(e.target.value === "any" ? null : e.target.value === "yes")}
              className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30"
            >
              <option value="any">Any</option>
              <option value="yes">CPU ✓</option>
              <option value="no">GPU only</option>
            </select>
          </div>

          {/* Commercial */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Commercial</label>
            <select
              value={commercialFilter === null ? "any" : commercialFilter ? "yes" : "no"}
              onChange={e => setCommercialFilter(e.target.value === "any" ? null : e.target.value === "yes")}
              className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30"
            >
              <option value="any">Any</option>
              <option value="yes">Commercial ✓</option>
              <option value="no">Non-commercial</option>
            </select>
          </div>

          {/* Group by */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Group by</label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as GroupKey)}
              className="py-2 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-intel-blue/30"
            >
              {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Reset */}
          <button
            onClick={() => {
              setSearch(""); setCategoryFilter("All"); setOriginFilter("All");
              setCpuFilter(null); setCommercialFilter(null);
              setSortKey("category"); setSortDir("asc"); setGroupBy("category");
            }}
            className="py-2 px-3 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Category legend */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map(c => {
            const col = CATEGORY_COLORS[c];
            const count = models.filter(m => m.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setCategoryFilter(categoryFilter === c ? "All" : c)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  categoryFilter === c
                    ? `${col.badge} ${col.badgeText} border-current`
                    : `bg-white ${col.badgeText} border-gray-200 hover:${col.badge}`
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                {c} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── table ── */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600 w-8" />
                <th className="px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => toggleSort("name")}>
                  Model <SortIcon k="name" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none"
                    onClick={() => toggleSort("category")}>
                  Category <SortIcon k="category" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none"
                    onClick={() => toggleSort("year")}>
                  Year <SortIcon k="year" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 cursor-pointer select-none"
                    onClick={() => toggleSort("params")}>
                  Params <SortIcon k="params" />
                </th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Model Size</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">VRAM</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">CPU</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Commercial</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Maintained</th>
                <th className="px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Finetune</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Origin</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLS + 3} className="px-6 py-12 text-center text-gray-400">
                    No models match your filters.
                  </td>
                </tr>
              )}
              {groups.map(({ label, rows }) => (
                <>
                  {groupBy !== "none" && label && (
                    <GroupHeader
                      key={`group-${label}`}
                      label={label}
                      count={rows.length}
                      colSpan={COLS + 3}
                    />
                  )}
                  {rows.map((model, idx) => {
                    const colors = CATEGORY_COLORS[model.category];
                    const isExpanded = expandedId === model.hfId;
                    const rowBg = idx % 2 === 0 ? colors.row : colors.rowAlt;
                    return (
                      <>
                        <tr
                          key={model.hfId}
                          className={`${rowBg} border-b border-gray-200/70 hover:brightness-95 transition-all cursor-pointer`}
                          onClick={() => setExpandedId(isExpanded ? null : model.hfId)}
                        >
                          {/* expand chevron */}
                          <td className="px-3 py-3 text-center">
                            <span className={`text-gray-400 text-xs transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                          </td>
                          {/* name */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 text-sm leading-tight">{model.name}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5 font-mono">{model.hfId}</div>
                          </td>
                          {/* category */}
                          <td className="px-4 py-3">
                            <Badge
                              text={model.category}
                              className={`${colors.badge} ${colors.badgeText}`}
                            />
                          </td>
                          {/* year */}
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{model.yearLabel}</td>
                          {/* params */}
                          <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">{model.params}</td>
                          {/* model size */}
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{model.modelSize}</td>
                          {/* vram */}
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{model.vram}</td>
                          {/* cpu */}
                          <td className="px-4 py-3 text-center"><BoolIcon val={model.cpuSupport} /></td>
                          {/* commercial */}
                          <td className="px-4 py-3 text-center"><BoolIcon val={model.commercial} /></td>
                          {/* maintained */}
                          <td className="px-4 py-3 text-center"><BoolIcon val={model.maintained} /></td>
                          {/* finetune */}
                          <td className="px-4 py-3 text-center"><BoolIcon val={model.finetuning} /></td>
                          {/* origin */}
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{model.origin}</td>
                        </tr>
                        {isExpanded && (
                          <ExpandedRow key={`${model.hfId}-expanded`} model={model} colSpan={COLS + 3} />
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

      {/* ── footer count ── */}
      <p className="mt-3 text-xs text-gray-400 text-right">
        Showing {filtered.length} of {models.length} models
      </p>
    </main>
  );
}
