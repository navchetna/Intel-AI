"use client";

import { useMemo, useState } from "react";
import {
  XEON6_WORKLOAD_SKUS, CATEGORY_ORDER, CATEGORY_META, TIER_META,
  type XeonWorkloadSKU, type XeonTier,
} from "./xeon6-workload-data";
import { useTheme } from "@/contexts/ThemeContext";

/** Raw accent hex reads fine on the dark canvas but collapses to near-invisible
 *  text-on-light in light mode, so light mode darkens it toward black instead. */
function darkenRgb(rgb: string, amount = 0.42): string {
  const [r, g, b] = rgb.split(",").map(Number);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

function accentText(isDark: boolean, hex: string, rgb: string): string {
  return isDark ? hex : darkenRgb(rgb);
}

/** Numeric spec fields sometimes hold a text sentinel (e.g. "N/A (no AMX)" for E-core SKUs) — pass those through as-is instead of appending a unit. */
function fmtOrUnit(v: number | string | null, unit: string): string {
  if (v === null) return "—";
  return typeof v === "number" ? `${v} ${unit}` : v;
}

// ── group the flat row list into Category → Workload → {Good,Better,Best} ─────

interface WorkloadGroup {
  key: string;
  category: string;
  workload: string;
  subWorkload: string;
  tiers: Record<XeonTier, XeonWorkloadSKU[]>;
}
interface CategorySection { category: string; groups: WorkloadGroup[] }

function buildSections(): CategorySection[] {
  const sections: CategorySection[] = CATEGORY_ORDER.map(category => ({ category, groups: [] }));
  const byCategory = new Map(sections.map(s => [s.category, s]));
  const byKey = new Map<string, WorkloadGroup>();
  for (const row of XEON6_WORKLOAD_SKUS) {
    const key = `${row.category}__${row.workload}__${row.subWorkload}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, category: row.category, workload: row.workload, subWorkload: row.subWorkload, tiers: { Good: [], Better: [], Best: [] } };
      byKey.set(key, group);
      byCategory.get(row.category)?.groups.push(group);
    }
    group.tiers[row.tier].push(row);
  }
  return sections;
}
const SECTIONS = buildSections();
const TOTAL_GROUPS = SECTIONS.reduce((n, s) => n + s.groups.length, 0);
const TOTAL_SKUS = new Set(XEON6_WORKLOAD_SKUS.map(r => r.sku)).size;

function matchesQuery(group: WorkloadGroup, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const haystack = [
    group.workload, group.subWorkload,
    ...Object.values(group.tiers).flat().map(s => s.sku),
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

// ── spec chip ───────────────────────────────────────────────────────────────

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md px-2 py-1 text-center" style={{ background: "var(--dm-surface-b)", border: "1px solid var(--dm-border-a)" }}>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--dm-txt-faintest)" }}>{label}</div>
      <div className="text-[12px] font-mono font-semibold" style={{ color: "var(--dm-txt-body)" }}>{value}</div>
    </div>
  );
}

// ── one SKU card within a tier column ─────────────────────────────────────────

function SkuCard({ sku, tier, isDark, categoryColor, categoryRgb }: {
  sku: XeonWorkloadSKU; tier: XeonTier; isDark: boolean; categoryColor: string; categoryRgb: string;
}) {
  const tm = TIER_META[tier];
  const isBest = tier === "Best";

  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-2.5 transition-transform"
      style={{
        background: isBest
          ? (isDark ? `linear-gradient(160deg, rgba(${tm.colorRgb},0.14) 0%, var(--dm-card-bg) 60%)` : `linear-gradient(160deg, rgba(${tm.colorRgb},0.10) 0%, var(--dm-card-bg) 60%)`)
          : "var(--dm-card-bg)",
        border: `1px solid ${isBest ? `${tm.color}55` : "var(--dm-card-border)"}`,
        boxShadow: isBest ? (isDark ? `0 12px 32px rgba(${tm.colorRgb},0.18)` : `0 8px 22px rgba(${tm.colorRgb},0.14)`) : "none",
      }}
    >
      {isBest && (
        <div className="flex items-center gap-1 -mt-1 -mx-0.5">
          <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 shrink-0">
            <path d="M6 0.5l1.4 3.3 3.6.3-2.7 2.4.8 3.5L6 8.2 2.9 10l.8-3.5L1 4.1l3.6-.3L6 .5z" fill={tm.color} />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: accentText(isDark, tm.color, tm.colorRgb) }}>
            Top Pick
          </span>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[15px] font-black" style={{ color: "var(--dm-txt-primary)" }}>Xeon {sku.sku}</span>
        <span className="text-[10px] font-mono" style={{ color: "var(--dm-txt-faint)" }}>{sku.coreType.replace(" (Granite Rapids)", "")}</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Chip label="Cores" value={sku.cores !== null ? String(sku.cores) : "—"} />
        <Chip label="TDP" value={sku.tdpW !== null ? `${sku.tdpW}W` : "—"} />
        <Chip label="Base" value={sku.baseFreq || "—"} />
      </div>

      {(sku.allCoreTurbo || sku.maxTurbo) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono" style={{ color: "var(--dm-txt-faint)" }}>
          {sku.allCoreTurbo && <span>All-core turbo <b style={{ color: "var(--dm-txt-secondary)" }}>{sku.allCoreTurbo}</b></span>}
          {sku.maxTurbo && <span>Max turbo <b style={{ color: "var(--dm-txt-secondary)" }}>{sku.maxTurbo}</b></span>}
          {sku.extraFreq && <span>{sku.extraFreq}</span>}
        </div>
      )}

      {sku.performance && (
        <p className="text-[11px] italic leading-snug" style={{ color: "var(--dm-txt-secondary)" }}>
          &ldquo;{sku.performance}&rdquo;
        </p>
      )}

      <details className="group">
        <summary
          className="text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none list-none flex items-center gap-1"
          style={{ color: accentText(isDark, categoryColor, categoryRgb) }}
        >
          <span className="inline-block transition-transform group-open:rotate-90">▶</span> Full specs
        </summary>
        <div className="mt-2 space-y-2">
          {sku.why && (
            <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faint)" }}>{sku.why}</p>
          )}
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--dm-border-a)" }}>
            {([
              ["Platform", sku.platform],
              ["Mem channels", sku.memChannels !== null ? String(sku.memChannels) : "—"],
              ["DDR5 RDIMM", sku.ddr5Rdimm !== null ? `${sku.ddr5Rdimm} MT/s` : "—"],
              ["DDR5 MRDIMM", fmtOrUnit(sku.ddr5Mrdimm, "MT/s")],
              ["Peak BW (RDIMM)", sku.peakBwRdimm !== null ? `${sku.peakBwRdimm} GB/s` : "—"],
              ["Peak BW (MRDIMM)", fmtOrUnit(sku.peakBwMrdimm, "GB/s")],
              ["AVX-512 FP64", sku.fp64 !== null ? `${sku.fp64} TFLOPS` : "—"],
              ["AVX-512 FP32", sku.fp32 !== null ? `${sku.fp32} TFLOPS` : "—"],
              ["AMX BF16/FP16", fmtOrUnit(sku.amxBf16, "TFLOPS")],
              ["AMX INT8", fmtOrUnit(sku.amxInt8, "TOPS")],
            ] as [string, string][]).map(([label, val], i) => (
              <div key={label} className="flex justify-between px-2.5 py-1 text-[10px]"
                style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                <span style={{ color: "var(--dm-txt-faintest)" }}>{label}</span>
                <span className="font-mono text-right" style={{ color: "var(--dm-txt-secondary)" }}>{val}</span>
              </div>
            ))}
          </div>
          {sku.source && <p className="text-[9px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>{sku.source}</p>}
        </div>
      </details>
    </div>
  );
}

// ── Good / Better / Best column ────────────────────────────────────────────────

function TierColumn({ tier, skus, isDark, categoryColor, categoryRgb }: {
  tier: XeonTier; skus: XeonWorkloadSKU[]; isDark: boolean; categoryColor: string; categoryRgb: string;
}) {
  const tm = TIER_META[tier];
  if (skus.length === 0) {
    return (
      <div className="rounded-xl p-3.5 flex items-center justify-center text-[11px]"
        style={{ background: "var(--dm-surface-a)", border: "1px dashed var(--dm-border-a)", color: "var(--dm-txt-faintest)", minHeight: 96 }}>
        No {tier} SKU listed
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-0.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: tm.color }} />
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accentText(isDark, tm.color, tm.colorRgb) }}>
          {tm.label}
        </span>
      </div>
      {skus.map((sku, i) => (
        <SkuCard key={`${sku.sku}-${i}`} sku={sku} tier={tier} isDark={isDark} categoryColor={categoryColor} categoryRgb={categoryRgb} />
      ))}
    </div>
  );
}

// ── one workload group (a "Machine Learning", "SQL Database", ...) ────────────

function WorkloadGroupCard({ group, isDark }: { group: WorkloadGroup; isDark: boolean }) {
  const meta = CATEGORY_META[group.category];
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--dm-table-bg)", border: "1px solid var(--dm-card-border)" }}>
      <div className="mb-3 flex items-baseline gap-2 flex-wrap">
        <h3 className="text-[15px] font-bold" style={{ color: "var(--dm-txt-primary)" }}>{group.workload}</h3>
        {group.subWorkload && (
          <span className="text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>{group.subWorkload}</span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["Good", "Better", "Best"] as XeonTier[]).map(tier => (
          <TierColumn key={tier} tier={tier} skus={group.tiers[tier]} isDark={isDark} categoryColor={meta.color} categoryRgb={meta.colorRgb} />
        ))}
      </div>
    </div>
  );
}

// ── category section banner + its workload groups ─────────────────────────────

function CategorySectionView({ section, isDark }: { section: CategorySection; isDark: boolean }) {
  const meta = CATEGORY_META[section.category];
  return (
    <div className="mb-10">
      <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
        style={{ background: `rgba(${meta.colorRgb},${isDark ? 0.09 : 0.06})`, border: `1px solid rgba(${meta.colorRgb},0.22)` }}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: `rgba(${meta.colorRgb},0.16)`, color: accentText(isDark, meta.color, meta.colorRgb) }}>
          {meta.icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black" style={{ color: "var(--dm-txt-primary)" }}>{section.category}</h2>
          <p className="text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>{meta.desc}</p>
        </div>
        <span className="ml-auto text-[11px] font-mono shrink-0" style={{ color: "var(--dm-txt-faint)" }}>
          {section.groups.length} workload{section.groups.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {section.groups.map(group => <WorkloadGroupCard key={group.key} group={group} isDark={isDark} />)}
      </div>
    </div>
  );
}

// ── main detail view ────────────────────────────────────────────────────────

export function Xeon6SPDetailView({ onBack }: { onBack: () => void }) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const visibleSections = useMemo(() => {
    const base = categoryFilter ? SECTIONS.filter(s => s.category === categoryFilter) : SECTIONS;
    if (!query.trim()) return base;
    return base
      .map(s => ({ ...s, groups: s.groups.filter(g => matchesQuery(g, query.trim())) }))
      .filter(s => s.groups.length > 0);
  }, [categoryFilter, query]);

  return (
    <div className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="px-6 pt-8 pb-16 max-w-screen-2xl mx-auto">

        {/* breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--dm-txt-faint)" }}>
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Silicon
          </button>
          <span style={{ color: "var(--dm-txt-faintest)" }}>/</span>
          <span className="text-sm font-semibold" style={{ color: "#38bdf8" }}>Xeon® 6 SP — Workload SKU Guide</span>
        </div>

        {/* header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 mb-3"
            style={{ borderColor: "var(--dm-border-b)", background: "var(--dm-surface-a)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#38bdf8" }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#38bdf8cc" }}>
              Intel® Xeon® 6 — Scalable Performance · Granite Rapids
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>
            Good / Better / Best — Workload SKU Guide
          </h1>
          <p className="mt-1.5 text-base max-w-3xl" style={{ color: "var(--dm-txt-faint)" }}>
            {TOTAL_GROUPS} workloads across {CATEGORY_ORDER.length} categories · {TOTAL_SKUS} distinct SKUs ·
            recommendations sourced directly from Intel&apos;s Xeon 6 Good/Better/Best workload slides
          </p>
        </div>

        {/* category chips + search */}
        <div className="flex flex-wrap gap-2 mb-8 items-center">
          <button onClick={() => setCategoryFilter(null)}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              background: categoryFilter === null ? "var(--dm-surface-c)" : "var(--dm-surface-a)",
              color: categoryFilter === null ? "var(--dm-txt-primary)" : "var(--dm-txt-faint)",
              border: `1px solid ${categoryFilter === null ? "var(--dm-border-b)" : "var(--dm-border-a)"}`,
            }}>
            All categories ({TOTAL_GROUPS})
          </button>
          {CATEGORY_ORDER.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = SECTIONS.find(s => s.category === cat)?.groups.length ?? 0;
            const active = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => setCategoryFilter(active ? null : cat)}
                className="rounded-full px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: active ? `rgba(${meta.colorRgb},0.15)` : "var(--dm-surface-a)",
                  color: active ? accentText(isDark, meta.color, meta.colorRgb) : "var(--dm-txt-faint)",
                  border: `1px solid ${active ? `${meta.color}55` : "var(--dm-border-a)"}`,
                }}>
                <span>{meta.icon}</span>{cat} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}

          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search workload or SKU…"
            className="ml-auto rounded-full px-4 py-1.5 text-xs outline-none min-w-[220px]"
            style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
          />
        </div>

        {/* sections */}
        {visibleSections.length === 0 ? (
          <div className="text-center py-16">
            <p style={{ color: "var(--dm-txt-faint)" }}>No workloads match &ldquo;{query}&rdquo;.</p>
            <button onClick={() => setQuery("")} className="mt-2 text-xs hover:underline" style={{ color: "#38bdf8" }}>
              Clear search
            </button>
          </div>
        ) : (
          visibleSections.map(section => <CategorySectionView key={section.category} section={section} isDark={isDark} />)
        )}

        <p className="mt-3 text-xs text-right" style={{ color: "var(--dm-txt-faintest)" }}>
          Source: Intel Xeon 6 Good/Better/Best workload-recommendation guidance · peak theoretical figures, not measured
        </p>
      </div>
    </div>
  );
}
