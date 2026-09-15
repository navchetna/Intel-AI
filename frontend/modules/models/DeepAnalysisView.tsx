"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { useRegisterExport } from "@/contexts/ExportContext";
import { useRequestSidebarCollapsed } from "@/contexts/SidebarCollapseContext";
import { COMPARISON_CHIPS, type ComparisonChip } from "@/modules/silicon/comparison-data";
import { StackedAreaChart, type StackedAreaSeries } from "./AnalysisChart";
import { ArchitectureSection } from "./ArchitectureView";
import { exportDeepAnalysisToExcel, type ExportScenario } from "./deep-analysis-export";
import {
  ABBR, TFLOPS, MODEL_CATALOG, DEFAULT_MODEL_ID, getModelArchitecture,
  DEFAULT_USECASE_INPUTS, WEIGHT_DTYPE_OPTIONS, KV_DTYPE_OPTIONS,
  getPrefillRowSymbols, PREFILL_ROW_USECASE_FIELDS, PREFILL_ROW_USES_SILICON_PEAK,
  DEFAULT_DELTANET_PREFILL_CONFIG,
  INTERCONNECTS, DEFAULT_TP_CONFIG, B70_DEFAULT_INTERCONNECT_ID, TP_ROW_HIGHLIGHTS, DECODE_ROW_HIGHLIGHTS,
  DEFAULT_KV_CACHE_CONFIG, KV_CACHE_ROW_HIGHLIGHTS,
  getSiliconPeak, getSiliconMemoryBandwidthGBs, getSiliconMemoryCapacityGB, getSiliconMemoryLabel,
  calcPrefill, calcPrefillTp, calcPrefillTpSweep, TP_SWEEP_DEGREES, calcDecode, calcKvCacheBaseline, calcKvCacheAtContext,
  calcKvPoolOccupancy, calcAnalysisSweep,
  updateUsecaseField, resetDecodeContextToAuto,
  type UsecaseInputs, type PrefillRowKey, type TpConfig, type TpRowKey, type DecodeRowKey,
  type KvCacheConfig, type KvCacheRowKey, type KvCacheBaseline, type KvPoolOccupancy, type ModelArchitecture, type DeltaNetPrefillConfig,
  type PrefillTpResult,
} from "./deep-analysis-data";

// ── shared styling helpers (same conventions as KvOffloadView/ModelBenchmarksView) ─────

function selectStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }
    : { background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.15)", color: "#1e293b", colorScheme: "light" };
}

const inputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-[var(--dm-border-a)] overflow-hidden mb-6"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold text-[var(--dm-txt-primary)]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--dm-txt-muted)] leading-relaxed">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** Compact header + striped-row container — the same density as the Architecture panel, reused
 *  by Use Case and Silicon so all three "driver" panels in the rail read as one family. */
function CompactPanel({ title, subtitle, accent, children }: { title: string; subtitle?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", borderColor: accent ? `${accent}59` : "var(--dm-border-a)" }}
    >
      <div className="px-4 pt-2.5 pb-2" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold" style={{ color: accent ?? "var(--dm-txt-primary)" }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-[var(--dm-txt-muted)] leading-snug">{subtitle}</p>}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

/** Interconnect concerns render in this green throughout — a distinct color from the cyan
 *  used for compute, so a reader can tell "communication cost" apart from "compute cost" at
 *  a glance across the Interconnect panel and the Prefill-TP breakdown. */
const INTERCONNECT_GREEN = "#34d399";
const INTERCONNECT_GREEN_RGB = "52,211,153";
/** Memory concerns render in this orange when clicked — same "only on interaction" rule as
 *  interconnect green, just a different color family for a different kind of dependency. */
const MEMORY_ORANGE = "#fb923c";
const MEMORY_ORANGE_RGB = "251,146,60";

/** One compact label ↔ control/value row — striping and sizing match the Architecture panel's
 *  rows exactly. `hint` becomes a hover tooltip instead of always-rendered helper text. `lit`
 *  applies the same "light up" treatment as a matched Architecture row, for the same reason:
 *  a clicked Prefill row highlighting the Use Case/Silicon inputs its formula actually reads. */
/** `litRgb` is an "r,g,b" triplet — defaults to the cyan used for compute; pass the green
 *  triplet ("52,211,153") for rows that light up because of an interconnect/network dependency. */
function CompactRow({ label, hint, index, lit, litRgb = "34,211,238", children }: {
  label: string; hint?: string; index: number; lit?: boolean; litRgb?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-1 transition-colors duration-200"
      style={{
        background: lit ? `rgba(${litRgb},0.16)` : index % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)",
        boxShadow: lit ? `inset 2px 0 0 rgb(${litRgb})` : "none",
      }}
      title={hint}
    >
      <span className="text-[11px] truncate" style={{ color: lit ? "var(--dm-txt-primary)" : "var(--dm-txt-faint)" }}>{label}</span>
      <div
        className="flex-shrink-0 rounded transition-all duration-200"
        style={{ boxShadow: lit ? `0 0 0 1px rgb(${litRgb}), 0 0 8px rgba(${litRgb},0.5)` : "none" }}
      >
        {children}
      </div>
    </div>
  );
}

const compactInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: "5.5rem",
  textAlign: "right",
};

const compactSelectStyleBase: React.CSSProperties = { width: "9rem" };

function fmtInt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtTflops(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 2 : 1 });
}

/** Monospace pill for a formula symbol — used both in the Architecture panel (label ↔
 *  abbreviation) and inline inside formula strings elsewhere, so the same token always
 *  looks the same wherever it appears. */
function Symbol({ children, lit }: { children: React.ReactNode; lit?: boolean }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold transition-all duration-200"
      style={{
        background: lit ? "#22d3ee" : "var(--dm-surface-b)",
        color: lit ? "#04222b" : "#22d3ee",
        boxShadow: lit ? "0 0 8px rgba(34,211,238,0.7)" : "none",
      }}
    >
      {children}
    </span>
  );
}

// ── Use Case panel (persistent inputs — shared by every section) ───────────────────────

function UsecasePanel({ usecase, onChange, highlightedFields }: {
  usecase: UsecaseInputs; onChange: (next: UsecaseInputs) => void; highlightedFields: Set<keyof UsecaseInputs> | null;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  function set<K extends keyof UsecaseInputs>(key: K, value: UsecaseInputs[K]) {
    onChange(updateUsecaseField(usecase, key, value));
  }

  const compactNumberInput = "rounded px-1.5 py-0.5 text-xs focus:outline-none";
  const compactSelect = "rounded px-1.5 py-0.5 text-xs focus:outline-none";

  const rows: { field: keyof UsecaseInputs; label: string; hint?: string; control: React.ReactNode }[] = [
    {
      field: "concurrency", label: `Concurrency (${ABBR.B})`, hint: "Max concurrent sequences",
      control: <input type="number" min={1} value={usecase.concurrency} onChange={e => set("concurrency", Math.max(1, Number(e.target.value) || 1))} className={compactNumberInput} style={compactInputStyle} />,
    },
    {
      field: "inputTokens", label: `Input tokens (${ABBR.L})`, hint: "Prefill prompt length",
      control: <input type="number" min={1} value={usecase.inputTokens} onChange={e => set("inputTokens", Math.max(1, Number(e.target.value) || 1))} className={compactNumberInput} style={compactInputStyle} />,
    },
    {
      field: "outputTokens", label: `Output tokens (${ABBR.L_out})`, hint: "Max new tokens generated",
      control: <input type="number" min={1} value={usecase.outputTokens} onChange={e => set("outputTokens", Math.max(1, Number(e.target.value) || 1))} className={compactNumberInput} style={compactInputStyle} />,
    },
    {
      field: "decodeContextLen",
      label: `Decode context (${ABBR.L_ctx})`,
      hint: usecase.decodeContextLenAuto
        ? "Auto = input tokens + output tokens. Edit to override; click Auto to resync."
        : "Manually overridden — click Auto to resync with input + output tokens.",
      control: (
        <div className="flex items-center gap-1.5">
          {!usecase.decodeContextLenAuto && (
            <button
              type="button" onClick={() => onChange(resetDecodeContextToAuto(usecase))}
              className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors"
              style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
              title="Resync with input + output tokens"
            >
              Auto
            </button>
          )}
          <input
            type="number" min={1} value={usecase.decodeContextLen}
            onChange={e => set("decodeContextLen", Math.max(1, Number(e.target.value) || 1))}
            className={compactNumberInput} style={compactInputStyle}
          />
        </div>
      ),
    },
    {
      field: "weightDtypeBytes", label: "Weight dtype",
      control: (
        <select value={usecase.weightDtypeBytes} onChange={e => set("weightDtypeBytes", Number(e.target.value))} className={compactSelect} style={{ ...selectStyle(isDark), ...compactSelectStyleBase }}>
          {WEIGHT_DTYPE_OPTIONS.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      field: "kvDtypeBytes", label: "KV-cache dtype",
      control: (
        <select value={usecase.kvDtypeBytes} onChange={e => set("kvDtypeBytes", Number(e.target.value))} className={compactSelect} style={{ ...selectStyle(isDark), ...compactSelectStyleBase }}>
          {KV_DTYPE_OPTIONS.map(o => <option key={o.label} value={o.value}>{o.label}</option>)}
        </select>
      ),
    },
    {
      field: "gemmMfu", label: "Achieved compute MFU", hint: "Achieved fraction of peak TFLOPS real GEMM kernels hit on the selected silicon — used by Prefill's and Decode's compute time.",
      control: <input type="number" min={0} max={1} step={0.01} value={usecase.gemmMfu} onChange={e => set("gemmMfu", Math.min(1, Math.max(0, Number(e.target.value) || 0)))} className={compactNumberInput} style={compactInputStyle} />,
    },
    {
      field: "commEfficiency", label: "Comm efficiency", hint: "Fraction of theoretical link bandwidth the all-reduce collective actually realizes (oneCCL/NCCL over the selected fabric) — used by Prefill-TP's and Decode's communication time.",
      control: <input type="number" min={0} max={1} step={0.01} value={usecase.commEfficiency} onChange={e => set("commEfficiency", Math.min(1, Math.max(0, Number(e.target.value) || 0)))} className={compactNumberInput} style={compactInputStyle} />,
    },
  ];

  return (
    <CompactPanel title="Use Case" subtitle="Serving-workload parameters — shared by every section.">
      {rows.map((r, i) => (
        <CompactRow key={r.label} label={r.label} hint={r.hint} index={i} lit={highlightedFields?.has(r.field) ?? false}>{r.control}</CompactRow>
      ))}
    </CompactPanel>
  );
}

// ── Compute panel (selector — pulls specs from the Silicon module, doesn't redefine them) ──

function SiliconPanel({ chip, onChange, highlightPeak, highlightBandwidth, highlightCapacity }: {
  chip: ComparisonChip | undefined; onChange: (id: string) => void;
  highlightPeak: boolean; highlightBandwidth: boolean; highlightCapacity: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const peak = chip ? getSiliconPeak(chip) : null;

  return (
    <CompactPanel title="GPU Compute" subtitle="Pulled from the Silicon page's own comparison data — not re-entered here.">
      <CompactRow label="Selected compute" index={0}>
        <select
          value={chip?.id ?? ""} onChange={e => onChange(e.target.value)}
          className="rounded px-1.5 py-0.5 text-xs focus:outline-none" style={{ ...selectStyle(isDark), width: "12rem" }}
        >
          <option value="" disabled>Choose…</option>
          {COMPARISON_CHIPS.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
          ))}
        </select>
      </CompactRow>

      {!chip ? (
        <p className="text-xs px-3 py-2" style={{ color: "var(--dm-txt-faint)" }}>No compute selected — pick one above to drive the Prefill/Decode estimates.</p>
      ) : (
        <>
          <CompactRow label="Peak throughput used" index={1} hint={peak?.note} lit={highlightPeak}>
            {peak ? (
              <span className="text-xs font-mono font-semibold" style={{ color: chip.accent }}>{peak.raw} ({peak.dataType})</span>
            ) : (
              <span className="text-[11px]" style={{ color: "var(--dm-txt-faintest)" }}>Not published</span>
            )}
          </CompactRow>
          <CompactRow label="Memory type" index={2}>
            <span className="text-xs" style={{ color: "var(--dm-txt-body)" }}>{chip.memory.type}</span>
          </CompactRow>
          <CompactRow label="Memory bandwidth" index={3} lit={highlightBandwidth} litRgb={MEMORY_ORANGE_RGB}>
            <span className="text-xs font-mono" style={{ color: highlightBandwidth ? MEMORY_ORANGE : "var(--dm-txt-body)" }}>{chip.memory.bandwidth}</span>
          </CompactRow>
          <CompactRow label="Memory capacity" index={4} hint={chip.sourceNote} lit={highlightCapacity} litRgb={MEMORY_ORANGE_RGB}>
            <span className="text-xs font-mono" style={{ color: highlightCapacity ? MEMORY_ORANGE : "var(--dm-txt-body)" }}>{chip.memory.capacity}</span>
          </CompactRow>
        </>
      )}
    </CompactPanel>
  );
}

// ── Memory panel (reference — bandwidth/capacity ranges across the memory hierarchy,
// independent of whichever chip is selected above). Cost per tier is deliberately not modeled
// yet — flagged in the subtitle rather than guessed at. HBM is on-package and CXL is itself a
// point-to-point link, so both carry their own fixed bandwidth spec; DDR (host) and All-Flash
// are only reachable *over* the selected fabric here, so their bandwidth is whatever that
// Interconnect link can actually deliver, not the local DDR-channel/array spec.

interface MemoryTier { id: string; name: string; capacityRange: string; note: string; bwRange?: string; bwFromInterconnect?: boolean }

const MEMORY_TIERS: MemoryTier[] = [
  {
    id: "hbm", name: "HBM", bwRange: "1.2 – 8 TB/s", capacityRange: "24 – 288 GB",
    note: "On-package stacked memory (HBM2e/HBM3/HBM3e) — highest bandwidth of any tier here, but capacity is fixed at manufacture and not field-expandable.",
  },
  {
    id: "ddr", name: "DDR (host)", capacityRange: "256 GB – 1.5+ TB", bwFromInterconnect: true,
    note: "Host DDR reached over the fabric — bandwidth is capped by the selected Interconnect link, not the local DDR-channel spec.",
  },
  {
    id: "cxl", name: "CXL", bwRange: "32 – 64 GB/s", capacityRange: "128 GB – 2+ TB",
    note: "Pooled/tiered memory over a CXL expander — lower per-module bandwidth than DDR, but composable capacity beyond local DIMM slots.",
  },
  {
    id: "flash", name: "All-Flash", capacityRange: "10s of TB – PB-scale", bwFromInterconnect: true,
    note: "NVMe-oF array reached over the fabric — bandwidth is capped by the selected Interconnect link, not the raw array/media spec.",
  },
];

function MemoryPanel({ tp }: { tp: TpConfig }) {
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);
  const interconnectBw = link ? `${fmtInt(link.linkBwGBs)} GB/s` : "—";

  return (
    <CompactPanel title="Memory" subtitle="Reference bandwidth/capacity ranges across the memory hierarchy — independent of the selected compute. Cost per tier to follow.">
      {MEMORY_TIERS.map((t, i) => {
        const bw = t.bwFromInterconnect ? interconnectBw : t.bwRange;
        const hint = t.bwFromInterconnect && link ? `${t.note} Currently capped by ${link.name} at ${interconnectBw}.` : t.note;
        return (
          <div
            key={t.id}
            title={hint}
            className="flex items-center justify-between gap-3 px-3 py-1.5"
            style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}
          >
            <div className="min-w-0">
              <div className="text-[11px] truncate" style={{ color: "var(--dm-txt-faint)" }}>{t.name}</div>
              <div className="text-[9px] truncate" style={{ color: "var(--dm-txt-faint)" }}>{t.capacityRange}</div>
            </div>
            <span className="text-xs font-mono text-left whitespace-nowrap flex-shrink-0" style={{ color: "var(--dm-txt-body)" }}>{bw}</span>
          </div>
        );
      })}
    </CompactPanel>
  );
}

// ── Interconnect panel (selector — drives Prefill-TP's communication cost) ─────────────
// First cut: this table is deliberately minimal (selection + the four specs Prefill-TP
// actually reads). Neutral by default — a row only turns green when a clicked Prefill-TP
// row's formula actually reads it (see the `highlighted` prop).

function InterconnectPanel({ tp, onChange, highlighted }: {
  tp: TpConfig; onChange: (next: TpConfig) => void; highlighted: Set<"linkBw" | "latency"> | null;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  const linkBwLit = highlighted?.has("linkBw") ?? false;
  const latencyLit = highlighted?.has("latency") ?? false;

  return (
    <CompactPanel title="Interconnect" subtitle="Drives tensor-parallel communication cost — used by Prefill-TP.">
      <CompactRow label="Selected interconnect" index={0}>
        <select
          value={tp.interconnectId} onChange={e => onChange({ ...tp, interconnectId: e.target.value })}
          className="rounded px-1.5 py-0.5 text-xs focus:outline-none" style={{ ...selectStyle(isDark), width: "12rem" }}
        >
          {INTERCONNECTS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </CompactRow>
      {link && (
        <>
          <CompactRow label="Link bandwidth" index={1} lit={linkBwLit} litRgb={INTERCONNECT_GREEN_RGB}>
            <span className="text-xs font-mono font-semibold" style={{ color: linkBwLit ? INTERCONNECT_GREEN : "var(--dm-txt-body)" }}>{fmtInt(link.linkBwGBs)} GB/s</span>
          </CompactRow>
          <CompactRow label="Latency / hop" index={2} lit={latencyLit} litRgb={INTERCONNECT_GREEN_RGB}>
            <span className="text-xs font-mono font-semibold" style={{ color: latencyLit ? INTERCONNECT_GREEN : "var(--dm-txt-body)" }}>{link.latencyUsPerHop} µs</span>
          </CompactRow>
          <CompactRow label="Fabric type" index={3} hint={link.notes}>
            <span className="text-xs" style={{ color: "var(--dm-txt-body)" }}>{link.fabricType}</span>
          </CompactRow>
        </>
      )}
    </CompactPanel>
  );
}

// ── Architecture diagram — the labeled block diagram, shown on Prefill step 1 ──────────
// Static images rather than a re-drawn diagram: each is already labeled with the same
// dimensions/head-counts the Architecture panel and formulas elsewhere in this tab use.
// Keyed by model id — only models with a diagram on file get one; others fall back to just
// the compact Architecture panel (see `showArchitectureDiagram` below).

const ARCHITECTURE_DIAGRAMS: Record<string, { src: string; width: number; height: number; alt: string; caption: string }> = {
  "qwen3.8-27b": {
    src: "/Qwen3.8-27B_architecture_inline_3to1.svg",
    width: 1060, height: 1120,
    alt: "Qwen3.8-27B labeled architecture diagram — one period (1 Gated Attention + 3 Gated DeltaNet layers, repeated ×16 = 64 layers) from token embedding to output logits, with every dimension and parameter abbreviation labeled",
    caption: "Layout after Sebastian Raschka. One period = 1 Gated Attention + 3 Gated DeltaNet, repeated ×16. Abbreviations match the Architecture panel and every formula elsewhere in this tab.",
  },
  "gemma4-31b": {
    src: "/gemma4-31B.png",
    width: 730, height: 719,
    alt: "Gemma4-31B labeled architecture diagram — 60 layers at a 5:1 local (sliding-window) to global (full-attention) ratio, with embedding/intermediate dimensions and head counts labeled",
    caption: "Layout after Sebastian Raschka. 5:1 local:global ratio — local layers use 32 Q / 16 KV heads, global layers use 32 Q / 4 KV heads, matching the Architecture panel.",
  },
};

/** Hover regions for the Qwen3.8-27B diagram, in the SVG's own viewBox coordinates (1060×1120)
 *  — read directly off the source SVG's <rect> geometry, so a hover always lines up with the
 *  box a viewer is actually pointing at. Positioned as absolute % overlays on top of the
 *  rendered SVG rather than reconstructing every shape as JSX, so the artwork stays exactly
 *  what the SVG file draws. Only leaf-level boxes/badges get a hotspot — the two big colored
 *  layer containers are deliberately excluded since they'd sit underneath (and block) these. */
interface DiagramHotspot { x: number; y: number; w: number; h: number; abbrevs: string[] }

const QWEN_HOTSPOTS: DiagramHotspot[] = [
  { x: 42, y: 122, w: 150, h: 28, abbrevs: [ABBR.N] },
  { x: 280, y: 198, w: 300, h: 40, abbrevs: [ABBR.V] },
  { x: 660, y: 196, w: 168, h: 28, abbrevs: [ABBR.V] },
  { x: 280, y: 358, w: 300, h: 32, abbrevs: [ABBR.d_ffn] },
  { x: 660, y: 358, w: 160, h: 28, abbrevs: [ABBR.d_ffn] },
  { x: 280, y: 468, w: 300, h: 40, abbrevs: [ABBR.n_q, ABBR.d_head, ABBR.n_kv, ABBR.d_rope] },
  { x: 660, y: 462, w: 120, h: 28, abbrevs: [ABBR.n_q] },
  { x: 786, y: 462, w: 140, h: 28, abbrevs: [ABBR.d_head] },
  { x: 660, y: 494, w: 170, h: 28, abbrevs: [ABBR.n_kv] },
  { x: 660, y: 526, w: 120, h: 28, abbrevs: [ABBR.d_rope] },
  { x: 30, y: 308, w: 150, h: 28, abbrevs: [ABBR.n_layers] },
  { x: 30, y: 342, w: 168, h: 28, abbrevs: [ABBR.n_fa] },
  { x: 30, y: 376, w: 168, h: 28, abbrevs: [ABBR.n_dn] },
  { x: 280, y: 616, w: 300, h: 32, abbrevs: [ABBR.d_ffn] },
  { x: 280, y: 726, w: 300, h: 40, abbrevs: [ABBR.n_v, ABBR.n_qk, ABBR.d_dn] },
  { x: 660, y: 720, w: 120, h: 28, abbrevs: [ABBR.n_v] },
  { x: 786, y: 720, w: 120, h: 28, abbrevs: [ABBR.n_qk] },
  { x: 660, y: 752, w: 140, h: 28, abbrevs: [ABBR.d_dn] },
  { x: 30, y: 712, w: 182, h: 28, abbrevs: [ABBR.L_native] },
  { x: 30, y: 746, w: 182, h: 28, abbrevs: [ABBR.L_ext] },
  { x: 280, y: 830, w: 300, h: 42, abbrevs: [ABBR.d_model] },
  { x: 660, y: 838, w: 160, h: 28, abbrevs: [ABBR.d_model] },
  { x: 30, y: 1020, w: 590, h: 24, abbrevs: [ABBR.MTP] },
  { x: 30, y: 1046, w: 590, h: 24, abbrevs: [ABBR.c] },
];

function ArchitectureDiagram({ arch, onHoverAbbrevs }: { arch: ModelArchitecture; onHoverAbbrevs?: (abbrevs: Set<string> | null) => void }) {
  const diagram = ARCHITECTURE_DIAGRAMS[arch.id];
  if (!diagram) return null;
  const interactive = arch.id === "qwen3.8-27b";
  return (
    <div
      className="rounded-2xl border border-[var(--dm-border-a)] overflow-hidden"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold text-[var(--dm-txt-primary)]">{arch.name} — Labeled Architecture</h2>
        <p className="mt-0.5 text-[11px] text-[var(--dm-txt-muted)] leading-snug">
          {diagram.caption}{interactive ? " Hover a block to light up its row in the Architecture panel." : ""}
        </p>
      </div>
      <div className="p-3" style={{ background: "#f8fafc" }}>
        {interactive ? (
          <div className="relative w-full" style={{ aspectRatio: `${diagram.width} / ${diagram.height}` }}>
            <Image src={diagram.src} alt={diagram.alt} fill className="rounded-lg" style={{ objectFit: "contain" }} />
            {QWEN_HOTSPOTS.map((h, i) => (
              <div
                key={i}
                onMouseEnter={() => onHoverAbbrevs?.(new Set(h.abbrevs))}
                onMouseLeave={() => onHoverAbbrevs?.(null)}
                className="absolute cursor-pointer"
                style={{
                  left: `${(h.x / diagram.width) * 100}%`,
                  top: `${(h.y / diagram.height) * 100}%`,
                  width: `${(h.w / diagram.width) * 100}%`,
                  height: `${(h.h / diagram.height) * 100}%`,
                }}
              />
            ))}
          </div>
        ) : (
          <Image
            src={diagram.src}
            alt={diagram.alt}
            width={diagram.width} height={diagram.height}
            className="w-full h-auto rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

// ── Architecture panel — always visible, pinned to the right of every section ──────────

interface ArchRow { label: string; abbrev: string; value: string; note?: string }

function ArchitecturePanel({ arch: a, highlighted }: { arch: ModelArchitecture; highlighted: Set<string> | null }) {
  const secondaryLabel = a.secondary?.kind === "deltaNet" ? "Gated DeltaNet" : a.secondary?.kind === "windowed" ? "Sliding-window attention" : "—";
  const rows: ArchRow[] = [
    { label: "Total parameters", abbrev: ABBR.N, value: `${a.totalParamsB}B`, note: a.moe ? "Total resident (all experts) — every expert must be in VRAM even if only some activate" : "Dense, safetensors" },
    ...(a.activeParamsB != null ? [{ label: "Active parameters", abbrev: `${ABBR.N}_active`, value: `${a.activeParamsB}B`, note: "MoE — parameters actually touched per token; drives compute-bound formulas" }] : []),
    { label: "Total layers", abbrev: ABBR.n_layers, value: fmtInt(a.totalLayers) },
    { label: "Full-attention layers", abbrev: ABBR.n_fa, value: fmtInt(a.fullAttnLayers) },
    ...(a.secondary ? [{ label: `${secondaryLabel} layers`, abbrev: ABBR.n_dn, value: fmtInt(a.secondaryLayers) }] : []),
    { label: "Hidden dimension", abbrev: ABBR.d_model, value: fmtInt(a.hiddenDim) },
    { label: "FFN intermediate dimension", abbrev: ABBR.d_ffn, value: fmtInt(a.ffnIntermediateDim) },
    ...(a.moe ? [{ label: "MoE experts (active / total)", abbrev: "—", value: `${a.moe.activeExperts} / ${a.moe.totalExperts}`, note: a.moe.sharedExperts ? `+ ${a.moe.sharedExperts} always-on shared expert` : undefined }] : []),
    { label: "Vocabulary size", abbrev: ABBR.V, value: fmtInt(a.vocabSize), note: "Padded token embedding" },
    { label: "Native context length", abbrev: ABBR.L_native, value: fmtInt(a.nativeContextLen) },
    { label: "Extended context length", abbrev: ABBR.L_ext, value: fmtInt(a.extendedContextLen) },
    { label: "Full-attention: Q heads", abbrev: ABBR.n_q, value: fmtInt(a.fullAttn.qHeads), note: "GQA" },
    { label: "Full-attention: KV heads", abbrev: ABBR.n_kv, value: fmtInt(a.fullAttn.kvHeads), note: `GQA, ${a.fullAttn.qHeads / a.fullAttn.kvHeads}:1 Q:KV ratio` },
    { label: "Full-attention: head dimension", abbrev: ABBR.d_head, value: fmtInt(a.fullAttn.headDim) },
    { label: "Full-attention: RoPE dimension", abbrev: ABBR.d_rope, value: fmtInt(a.fullAttn.ropeDim) },
    ...(a.secondary?.kind === "deltaNet" ? [
      { label: "DeltaNet: V heads", abbrev: ABBR.n_v, value: fmtInt(a.secondary.vHeads) },
      { label: "DeltaNet: QK heads", abbrev: ABBR.n_qk, value: fmtInt(a.secondary.qkHeads) },
      { label: "DeltaNet: head dimension", abbrev: ABBR.d_dn, value: fmtInt(a.secondary.headDim), note: "Used for both K and V dims of the recurrent state matrix — distinct from d_head above" },
      { label: "DeltaNet kernel constant", abbrev: ABBR.c, value: fmtInt(a.secondary.kernelConstant), note: "Approximates extra matmuls in the chunked delta-rule update — kernel-dependent, validate against a profiled kernel" },
      { label: "DeltaNet fixed state (per sequence)", abbrev: "—", value: `${a.secondary.fixedStateMB.toFixed(1)} MB`, note: "O(1) in context length — unlike a full-attention KV cache" },
    ] : []),
    ...(a.secondary?.kind === "windowed" ? [
      { label: "Sliding-window: Q heads", abbrev: ABBR.n_q_sw, value: fmtInt(a.secondary.qHeads) },
      { label: "Sliding-window: KV heads", abbrev: ABBR.n_kv_sw, value: fmtInt(a.secondary.kvHeads) },
      { label: "Sliding-window: head dimension", abbrev: ABBR.d_head_sw, value: fmtInt(a.secondary.headDim) },
      { label: "Window size", abbrev: ABBR.w, value: `${fmtInt(a.secondary.window)} tokens`, note: "Attention span — both KV cache and compute are capped here, not O(context)" },
    ] : []),
    { label: "Multi-token prediction", abbrev: ABBR.MTP, value: a.multiTokenPrediction ? "Yes" : "No", note: "Not modeled in the formulas — inference-time speculative use is a separate calculation" },
  ];

  return (
    <div
      className="rounded-2xl border border-[var(--dm-border-a)] overflow-hidden"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-4 pt-2.5 pb-2" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold text-[var(--dm-txt-primary)]">Architecture — {a.name}</h2>
        <p className="mt-0.5 text-[11px] text-[var(--dm-txt-muted)] leading-snug">
          Source: {a.sourceUrl}. Hover a row for details — Abbrev is the exact symbol used in the
          formulas elsewhere.
        </p>
      </div>
      <div className="py-1">
        {rows.map((r, i) => {
          const lit = highlighted?.has(r.abbrev) ?? false;
          return (
            <div
              key={r.label} title={r.note}
              className="flex items-center justify-between gap-2 px-3 py-1 transition-colors duration-200"
              style={{
                background: lit ? "rgba(34,211,238,0.16)" : i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)",
                boxShadow: lit ? "inset 2px 0 0 #22d3ee" : "none",
              }}
            >
              <span className="text-[11px] truncate" style={{ color: lit ? "var(--dm-txt-primary)" : "var(--dm-txt-faint)" }}>{r.label}</span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Symbol lit={lit}>{r.abbrev}</Symbol>
                <span className="font-mono text-xs font-semibold text-right" style={{ color: lit ? "#22d3ee" : "var(--dm-txt-body)", minWidth: "3.5rem" }}>{r.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Table/Visual toggle — shared by Prefill and Prefill-TP (same pill style as KV Pool's
// placement-strategy toggle, so the interaction reads the same everywhere it appears). ──────

function ViewToggle({ view, onChange }: { view: "table" | "visual"; onChange: (v: "table" | "visual") => void }) {
  return (
    <div className="inline-flex rounded-lg border overflow-hidden mb-4" style={{ borderColor: "var(--dm-border-a)" }}>
      {(["table", "visual"] as const).map(v => (
        <button
          key={v} type="button" onClick={() => onChange(v)}
          className="px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{ background: view === v ? "rgba(34,211,238,0.15)" : "var(--dm-surface-a)", color: view === v ? "#22d3ee" : "var(--dm-txt-secondary)" }}
        >
          {v === "table" ? "Table" : "Visual"}
        </button>
      ))}
    </div>
  );
}

interface DistributionSlice { label: string; value: number; color: string }
interface StackedBarSpec { key: string; label: string; segments: DistributionSlice[]; emphasis?: boolean }

/** One horizontal stacked bar per entry (a single bar for Prefill, one per TP degree for
 *  Prefill-TP) — plain flex divs sized by percentage rather than an SVG viewBox, so the whole
 *  thing is fluid width (no horizontal scroll) and just grows taller as bars are added. Each
 *  segment is hoverable and reports its label up so the legend below can light up the matching
 *  category, tying the chart and the legend together the way a real dashboard tooltip/legend
 *  pair would. */
function StackedBarChart({ bars, fmtValue, hovered, onHover, barHeight = 30 }: {
  bars: StackedBarSpec[]; fmtValue: (v: number) => string; hovered: string | null; onHover: (label: string | null) => void;
  barHeight?: number;
}) {
  const totals = bars.map(b => b.segments.reduce((s, x) => s + Math.max(0, x.value), 0));
  const maxTotal = Math.max(...totals, 0.0001);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {bars.map((bar, bi) => {
        const total = totals[bi];
        const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
        return (
          <div key={bar.key} className="flex items-center gap-2.5">
            <span
              className="text-[10px] font-semibold w-12 flex-shrink-0 text-right truncate"
              style={{ color: bar.emphasis ? "#22d3ee" : "var(--dm-txt-faint)" }}
            >
              {bar.label}
            </span>
            <div
              className="flex-1 rounded-md overflow-hidden flex"
              style={{ height: barHeight, background: "var(--dm-surface-b)", boxShadow: bar.emphasis ? "0 0 0 1.5px rgba(34,211,238,0.55)" : "none" }}
            >
              <div className="flex h-full" style={{ width: `${widthPct}%` }}>
                {bar.segments.map((s, si) => {
                  const val = Math.max(0, s.value);
                  if (val <= 0) return null;
                  const segPct = total > 0 ? (val / total) * 100 : 0;
                  const isHovered = hovered === s.label;
                  const isDimmed = hovered != null && !isHovered;
                  return (
                    <div
                      key={si}
                      style={{
                        width: `${segPct}%`, background: s.color, opacity: isDimmed ? 0.28 : 1,
                        transition: "opacity 150ms", cursor: "pointer",
                        boxShadow: isHovered ? `inset 0 0 0 9999px ${s.color}20` : undefined,
                      }}
                      onMouseEnter={() => onHover(s.label)}
                      onMouseLeave={() => onHover(null)}
                      title={`${s.label}: ${fmtValue(val)}`}
                    />
                  );
                })}
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold w-16 flex-shrink-0 text-right" style={{ color: "var(--dm-txt-primary)" }}>
              {fmtValue(total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DistributionLegend({ slices, fmtValue, hovered, onHover }: {
  slices: DistributionSlice[]; fmtValue: (v: number) => string; hovered?: string | null; onHover?: (label: string | null) => void;
}) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  return (
    <div className="flex flex-col gap-1 w-full">
      {slices.map((s, i) => {
        const pct = total > 0 ? (Math.max(0, s.value) / total) * 100 : 0;
        const isHovered = hovered === s.label;
        const isDimmed = !!hovered && !isHovered;
        return (
          <div
            key={i} className="flex items-center gap-2 rounded-md px-1.5 -mx-1.5 py-0.5 transition-all duration-150"
            style={{ opacity: isDimmed ? 0.4 : 1, background: isHovered ? `${s.color}1f` : "transparent" }}
            onMouseEnter={() => onHover?.(s.label)}
            onMouseLeave={() => onHover?.(null)}
          >
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: s.color, boxShadow: isHovered ? `0 0 8px ${s.color}c0` : `0 0 5px ${s.color}90`, flexShrink: 0 }} />
            <span className="text-[10.5px] flex-1 truncate" style={{ color: "var(--dm-txt-body)" }}>{s.label}</span>
            <span className="text-[10.5px] font-mono font-bold whitespace-nowrap" style={{ color: s.color }}>{fmtValue(s.value)}</span>
            <span className="text-[9px] font-mono w-10 text-right flex-shrink-0" style={{ color: "var(--dm-txt-faint)" }}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

/** Stacked bar(s) above the legend — the shared "distribution" pictorial for Prefill and
 *  Prefill-TP. Stacked vertically (not side by side) deliberately: horizontal bars plus a
 *  side-by-side legend would force a horizontal scrollbar on narrower panes, whereas stacking
 *  just grows the card taller, which this page has room for. Bright, saturated per-category
 *  colors with a matching glow are deliberate: this is meant to pop next to the dense formula
 *  tables elsewhere on this tab, not blend in. Hovering a segment (in the chart or the legend)
 *  lights up its match on the other side. */
function DistributionViz({ subtitle, bars, legendSlices, fmtValue }: {
  subtitle: string; bars: StackedBarSpec[]; legendSlices?: DistributionSlice[]; fmtValue: (v: number) => string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const legend = legendSlices ?? bars[0]?.segments ?? [];
  return (
    <div className="rounded-xl border overflow-hidden p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)" }}>
      <p className="text-[10.5px] leading-relaxed mb-3" style={{ color: "var(--dm-txt-muted)" }}>{subtitle}</p>
      <div className="flex flex-col gap-4">
        <StackedBarChart bars={bars} fmtValue={fmtValue} hovered={hovered} onHover={setHovered} />
        <DistributionLegend slices={legend} fmtValue={fmtValue} hovered={hovered} onHover={setHovered} />
      </div>
    </div>
  );
}

// ── Prefill section ──────────────────────────────────────────────────────────────────────

/** Vivid, saturated palette for the compute-category distribution — deliberately not the app's
 *  usual cyan-monochrome, so the Visual toggle reads as a distinct, pop-off-the-page view next
 *  to the dense formula table it sits beside. Communication reuses the app-wide green so it
 *  still reads as "network cost" the moment it shows up in Prefill-TP's version below. */
const PREFILL_CATEGORY_COLORS: Record<string, string> = {
  ffn: "#2dd4bf",              // bright teal
  fullAttnProj: "#22d3ee",     // bright cyan
  fullAttnQuadratic: "#f472b6", // bright pink
  secondaryProj: "#a78bfa",    // bright violet
  secondaryCompute: "#facc15", // bright amber
};

function PrefillSection({ arch, usecase, deltaCfg, chip, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; deltaCfg: DeltaNetPrefillConfig; chip: ComparisonChip | undefined;
  highlightedRow: PrefillRowKey | null; onSelectRow: (key: PrefillRowKey | null) => void;
}) {
  const [view, setView] = useState<"table" | "visual">("table");
  const peak = chip ? getSiliconPeak(chip) : null;
  const result = useMemo(() => calcPrefill(arch, usecase, deltaCfg, peak?.teraflops ?? null), [arch, usecase, deltaCfg, peak?.teraflops]);
  const isDeltaNet = arch.secondary?.kind === "deltaNet";
  const isWindowed = arch.secondary?.kind === "windowed";

  const rows: { key: PrefillRowKey; label: string; formula: string; value: number }[] = [
    {
      key: "ffn", label: "FFN (all layers)",
      formula: arch.moe ? `6 × ${ABBR.d_model} × (active × I_e + I_shared)` : `6 × ${ABBR.d_model} × ${ABBR.d_ffn}`,
      value: result.ffnTermTflops,
    },
    {
      key: "fullAttnProj", label: "Full-attention projections — O(L)",
      formula: `2 × ${ABBR.d_model} × (3×${ABBR.n_q}×${ABBR.d_head} + 2×${ABBR.n_kv}×${ABBR.d_head}) × ${ABBR.n_fa}`,
      value: result.fullAttnProjTermTflops,
    },
    {
      key: "fullAttnQuadratic", label: "Full-attention quadratic — O(L²)",
      formula: `4 × ${ABBR.n_q} × ${ABBR.d_head} × ${ABBR.L}² × ${ABBR.n_fa}`,
      value: result.fullAttnQuadraticTermTflops,
    },
    ...(isDeltaNet ? [{
      key: "secondaryProj" as PrefillRowKey, label: "DeltaNet projections (Q/K/V/z/a/b/O) — O(L)",
      formula: `2 × ${ABBR.d_model} × (2×${ABBR.n_qk}×${ABBR.d_dn} + 3×${ABBR.n_v}×${ABBR.d_dn} + 2×${ABBR.n_v}) × ${ABBR.n_dn}`,
      value: result.secondaryProjTermTflops,
    }] : []),
    ...(isWindowed ? [{
      key: "secondaryProj" as PrefillRowKey, label: "Sliding-window projections — O(L)",
      formula: `2 × ${ABBR.d_model} × (3×${ABBR.n_q_sw}×${ABBR.d_head_sw} + 2×${ABBR.n_kv_sw}×${ABBR.d_head_sw}) × ${ABBR.n_dn}`,
      value: result.secondaryProjTermTflops,
    }] : []),
    ...(isDeltaNet ? [{
      key: "secondaryCompute" as PrefillRowKey, label: "Delta-rule arithmetic (chunked, C=" + deltaCfg.chunkSize + ")",
      formula: `${ABBR.n_v} × f(C, ${ABBR.d_dn}) × padded(${ABBR.L},C) × ${ABBR.n_dn}`,
      value: result.secondaryComputeTermTflops,
    }] : []),
    ...(isWindowed ? [{
      key: "secondaryCompute" as PrefillRowKey, label: "Sliding-window quadratic — O(L·min(L,w))",
      formula: `4 × ${ABBR.n_q_sw} × ${ABBR.d_head_sw} × ${ABBR.L} × min(${ABBR.L},${ABBR.w}) × ${ABBR.n_dn}`,
      value: result.secondaryComputeTermTflops,
    }] : []),
  ];

  function toggleRow(key: PrefillRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  return (
    <SectionCard
      title="Prefill TFLOPS"
      subtitle={`Ported from qwen3_x_model_ttft_calculator.xlsx — FFN, attention projections, and the O(L²) quadratic term are broken out separately${isDeltaNet ? "; DeltaNet's chunked-recurrence arithmetic is its own timing bucket, at its own achieved TFLOP/s" : isWindowed ? "; sliding-window layers are capped at the window size" : ""}. All figures in TFLOPS. Click a row to light up the Architecture parameters it uses.`}
    >
      <ViewToggle view={view} onChange={setView} />

      {view === "visual" ? (
        <div className="mb-4">
          <DistributionViz
            subtitle="Share of total prefill compute (TFLOPS) each category demands — the same terms as the table, just sized by how much of the work they actually are."
            bars={[{
              key: "prefill", label: "Prefill",
              segments: rows.map(r => ({ label: r.label, value: r.value, color: PREFILL_CATEGORY_COLORS[r.key] ?? "#94a3b8" })),
            }]}
            fmtValue={v => `${fmtTflops(v)} TF`}
          />
        </div>
      ) : (
      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Component</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Formula</th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>TFLOPS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const active = highlightedRow === r.key;
              return (
                <tr
                  key={r.key} onClick={() => toggleRow(r.key)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{ background: active ? "rgba(34,211,238,0.14)" : i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}
                >
                  <td className="px-4 py-2.5 align-top" style={{ color: active ? "#22d3ee" : "var(--dm-txt-body)" }}>{r.label}</td>
                  <td className="px-4 py-2.5 align-top text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>{r.formula}</td>
                  <td className="px-4 py-2.5 align-top text-right font-mono font-semibold" style={{ color: active ? "#22d3ee" : "var(--dm-txt-primary)" }}>{fmtTflops(r.value)}</td>
                </tr>
              );
            })}
            <tr
              onClick={() => toggleRow("total")}
              className="cursor-pointer transition-colors duration-150"
              style={{ borderTop: "2px solid var(--dm-border-a)", background: highlightedRow === "total" ? "rgba(34,211,238,0.14)" : "transparent" }}
            >
              <td className="px-4 py-2.5 align-top font-bold" style={{ color: "var(--dm-txt-primary)" }}>Total prefill</td>
              <td className="px-4 py-2.5 align-top text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>Σ rows above</td>
              <td className="px-4 py-2.5 align-top text-right font-mono font-bold" style={{ color: "#22d3ee" }}>{fmtTflops(result.totalTflops)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Total prefill</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{fmtTflops(result.totalTflops)} <span className="text-xs font-normal" style={{ color: "var(--dm-txt-faint)" }}>TFLOPS</span></p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Estimated compute time</p>
          {result.estimatedComputeTimeSec != null ? (
            <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>
              {result.estimatedComputeTimeSec.toFixed(2)} <span className="text-xs font-normal" style={{ color: "var(--dm-txt-faint)" }}>s</span>
            </p>
          ) : (
            <p className="text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon above</p>
          )}
          {isDeltaNet && result.gemmComputeTimeSec != null && (
            <p className="text-[10.5px] mt-0.5" style={{ color: "var(--dm-txt-faint)" }}>
              GEMM {result.gemmComputeTimeSec.toFixed(2)}s + Delta {result.deltaComputeTimeSec.toFixed(2)}s
              {result.deltaFixedOverheadSec > 0 ? ` + overhead ${result.deltaFixedOverheadSec.toFixed(3)}s` : ""}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Achieved TFLOPS</p>
          {result.achievedTflops != null ? (
            <p className="text-lg font-mono font-bold" style={{ color: "#22d3ee" }}>{fmtTflops(result.achievedTflops)} <span className="text-xs font-normal" style={{ color: "var(--dm-txt-faint)" }}>TFLOPS</span></p>
          ) : (
            <p className="text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon above</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
        FFN, both projection terms, and the quadratic term are all costed at the shared GEMM rate
        (peak TFLOPS × Achieved compute MFU){isDeltaNet
          ? "; DeltaNet's chunked-recurrence arithmetic runs at its own, separately-set achieved TFLOP/s below (chunked-scan kernels typically realize markedly worse utilization than a dense GEMM)"
          : isWindowed ? "; sliding-window layers use the same GEMM rate, just with attention capped at the window size" : ""}.
        This single-GPU baseline (TP=1) is the reference point for Prefill-TP&rsquo;s speedup calculation below.
      </p>
    </SectionCard>
  );
}

// ── Prefill under Tensor Parallelism (from the "Prefill TP" sheet) ─────────────────────
// First cut — TP degree/collective-ops/activation-dtype live here since they're specific to
// this analysis; the Interconnect itself is selected in the rail (shared, in case other
// sections need it later). Nothing is green by default — a row only turns green once
// clicked, and only if its formula actually reads an interconnect spec (link BW/latency).

function PrefillTpCard({ arch, usecase, chip, tp, onChangeTp, deltaCfg, onChangeDeltaCfg, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; chip: ComparisonChip | undefined; tp: TpConfig; onChangeTp: (next: TpConfig) => void;
  deltaCfg: DeltaNetPrefillConfig; onChangeDeltaCfg: (next: DeltaNetPrefillConfig) => void;
  highlightedRow: TpRowKey | null; onSelectRow: (key: TpRowKey | null) => void;
}) {
  const [view, setView] = useState<"table" | "visual">("table");
  const isDeltaNet = arch.secondary?.kind === "deltaNet";
  const isWindowed = arch.secondary?.kind === "windowed";
  const peak = chip ? getSiliconPeak(chip) : null;
  const prefill = useMemo(() => calcPrefill(arch, usecase, deltaCfg, peak?.teraflops ?? null), [arch, usecase, deltaCfg, peak?.teraflops]);
  const result = useMemo(
    () => calcPrefillTp(arch, usecase, tp, deltaCfg, peak?.teraflops ?? null, prefill),
    [arch, usecase, tp, deltaCfg, peak?.teraflops, prefill],
  );
  const sweep = useMemo(
    () => calcPrefillTpSweep(arch, usecase, tp, deltaCfg, peak?.teraflops ?? null, prefill),
    [arch, usecase, tp, deltaCfg, peak?.teraflops, prefill],
  );
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  function setTp<K extends keyof TpConfig>(key: K, value: TpConfig[K]) {
    onChangeTp({ ...tp, [key]: value });
  }
  function setDelta<K extends keyof DeltaNetPrefillConfig>(key: K, value: DeltaNetPrefillConfig[K]) {
    onChangeDeltaCfg({ ...deltaCfg, [key]: value });
  }

  function toggleRow(key: TpRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  const localLit = (field: keyof TpConfig): boolean =>
    !!highlightedRow && (TP_ROW_HIGHLIGHTS[highlightedRow].localFields?.includes(field) ?? false);
  const deltaLit = (field: keyof DeltaNetPrefillConfig): boolean =>
    !!highlightedRow && (TP_ROW_HIGHLIGHTS[highlightedRow].deltaConfigFields?.includes(field) ?? false);
  const interconnectRowActive = !!highlightedRow && !!TP_ROW_HIGHLIGHTS[highlightedRow].interconnectFields;

  const tpNumberInput = "rounded-lg px-2.5 py-1.5 text-sm focus:outline-none w-24";
  const glowWrap = (lit: boolean, rgb: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: "0.5rem", transition: "box-shadow 200ms",
    boxShadow: lit ? `0 0 0 1px rgb(${rgb}), 0 0 8px rgba(${rgb},0.5)` : "none",
  });

  type TpTableRow = { key: TpRowKey; label: string; formula: string; value: string; final?: boolean };
  const computeRows: TpTableRow[] = [
    { key: "singleGpu", label: "Single-GPU compute time (TP=1)", formula: "Total prefill ÷ (P_peak × eff_mfu) [+ delta]", value: result.singleGpuTimeSec != null ? `${result.singleGpuTimeSec.toFixed(4)} s` : "—" },
    { key: "perGpu", label: `Per-GPU GEMM compute time (TP=${tp.tpDegree})`, formula: "(GEMM FLOPs ÷ TP) ÷ (P_peak × eff_mfu)", value: result.perGpuComputeTimeSec != null ? `${result.perGpuComputeTimeSec.toFixed(4)} s` : "—" },
    ...(isDeltaNet ? [
      { key: "deltaCompute" as TpRowKey, label: `Per-GPU delta compute (TP=${tp.tpDegree})`, formula: "(Delta FLOPs ÷ TP) ÷ delta_TFLOPs", value: `${result.perGpuDeltaComputeTimeSec.toFixed(4)} s` },
      { key: "deltaFixedOverhead" as TpRowKey, label: "Delta fixed overhead", formula: "chunks × n_dn × overhead_µs ÷ 1e6", value: `${result.deltaFixedOverheadSec.toFixed(4)} s` },
    ] : []),
  ];
  const commRows: TpTableRow[] = [
    { key: "msgSize", label: "All-reduce message size", formula: `${ABBR.B} × ${ABBR.L} × ${ABBR.d_model} × act_bytes ÷ 1e9`, value: `${result.allReduceMsgGB.toFixed(4)} GB` },
    { key: "numAllReduces", label: "Number of all-reduces", formula: `k_coll × ${ABBR.n_layers}`, value: fmtInt(result.numAllReduces) },
    { key: "bwTerm", label: "Bandwidth term (per all-reduce)", formula: "2×(TP−1)/TP × msg_GB ÷ (link_BW × comm_eff)", value: `${result.bwTermSec.toFixed(6)} s` },
    { key: "commTime", label: `Communication time (Σ ${result.numAllReduces} all-reduces)`, formula: "n_allreduce × bw_term", value: result.commTimeSec != null ? `${result.commTimeSec.toFixed(4)} s` : "—", final: true },
  ];

  // Per-GPU compute time doesn't come pre-split by category — it's proportionally allocated
  // from the single-GPU TFLOPS shares above, the same allocation the Comparisons tab's
  // cross-stage sweep already uses for its own Prefill Compute → FFN/Attention/DeltaNet drill-down.
  const gemmFlopsTotal =
    prefill.ffnTermTflops + prefill.fullAttnProjTermTflops + prefill.fullAttnQuadraticTermTflops
    + prefill.secondaryProjTermTflops + (isWindowed ? prefill.secondaryComputeTermTflops : 0);
  /** Same category split for any TP-degree result — used both for the current TP's legend
   *  values and for each bar in the 5-degree sweep chart below, so hovering a segment in any
   *  bar lights up the same-named legend row regardless of which TP it belongs to. */
  function tpResultToSegments(r: PrefillTpResult): DistributionSlice[] {
    const gemmComputeSec = r.perGpuComputeTimeSec ?? 0;
    const shareSec = (tflops: number) => (gemmFlopsTotal > 0 ? gemmComputeSec * (tflops / gemmFlopsTotal) : 0);
    return [
      { label: "FFN", value: shareSec(prefill.ffnTermTflops), color: PREFILL_CATEGORY_COLORS.ffn },
      { label: "Full-attention projections", value: shareSec(prefill.fullAttnProjTermTflops), color: PREFILL_CATEGORY_COLORS.fullAttnProj },
      { label: "Full-attention quadratic", value: shareSec(prefill.fullAttnQuadraticTermTflops), color: PREFILL_CATEGORY_COLORS.fullAttnQuadratic },
      ...(isDeltaNet || isWindowed ? [{
        label: isDeltaNet ? "DeltaNet projections" : "Sliding-window projections",
        value: shareSec(prefill.secondaryProjTermTflops), color: PREFILL_CATEGORY_COLORS.secondaryProj,
      }] : []),
      ...(isWindowed ? [{ label: "Sliding-window quadratic", value: shareSec(prefill.secondaryComputeTermTflops), color: PREFILL_CATEGORY_COLORS.secondaryCompute }] : []),
      ...(isDeltaNet ? [{
        label: "Delta-rule arithmetic", value: (r.perGpuDeltaComputeTimeSec ?? 0) + (r.deltaFixedOverheadSec ?? 0),
        color: PREFILL_CATEGORY_COLORS.secondaryCompute,
      }] : []),
      { label: "Communication (all-reduce)", value: r.commTimeSec ?? 0, color: INTERCONNECT_GREEN },
    ];
  }

  const tpSlices: DistributionSlice[] = tpResultToSegments(result);
  const tpBars: StackedBarSpec[] = sweep.map(row => ({
    key: String(row.tpDegree), label: `TP=${row.tpDegree}`,
    segments: tpResultToSegments(row),
    emphasis: row.tpDegree === tp.tpDegree,
  }));

  /** One clearly-labeled sub-table per side of the wall-clock (Compute / Communication) — own
   *  accent color, own row chain, ending in the bold metric(s) that side is named for. Stacked
   *  one below the other so there's room for the Formula column without truncating it. */
  function renderMetricGroup(title: string, accent: string, accentRgb: string, groupRows: TpTableRow[]) {
    return (
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
        <div className="px-4 py-2" style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
          <span className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-4 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Component</th>
              <th className="px-4 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Formula</th>
              <th className="px-4 py-1.5 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {groupRows.map((r, i) => {
              const active = highlightedRow === r.key;
              const activeColor = r.final ? accent : "#22d3ee";
              const activeBg = r.final ? `rgba(${accentRgb},0.16)` : "rgba(34,211,238,0.14)";
              const idleBg = i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)";
              return (
                <tr
                  key={r.key} onClick={() => toggleRow(r.key)} className="cursor-pointer transition-colors duration-150"
                  style={{ background: active ? activeBg : idleBg, borderTop: r.final ? "2px solid var(--dm-border-a)" : "none" }}
                >
                  <td className={`px-4 py-2 ${r.final ? "font-bold" : ""}`} style={{ color: active ? activeColor : r.final ? "var(--dm-txt-primary)" : "var(--dm-txt-body)" }}>{r.label}</td>
                  <td className="px-4 py-2 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>{r.formula}</td>
                  <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${r.final ? "font-bold" : "font-semibold"}`} style={{ color: active ? activeColor : "var(--dm-txt-body)" }}>{r.value}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <SectionCard
      title="Prefill under Tensor Parallelism"
      subtitle={`Ported from qwen3_x_model_ttft_calculator.xlsx. Compute shards near-ideally across TP GPUs${isDeltaNet ? "; DeltaNet's chunked arithmetic shards and is timed separately, at its own achieved TFLOP/s" : ""}. Communication is bandwidth-only (2 all-reduces/layer on the [B×L×hidden] activation tensor), costed against the selected interconnect — no separate latency term, negligible next to bandwidth at realistic message sizes. Click a row to light up the parameters it uses — interconnect/network dependencies light up in green.`}
    >
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Tensor-parallel degree (TP)</label>
          <div style={glowWrap(localLit("tpDegree"), "34,211,238")}>
            <input type="number" min={1} value={tp.tpDegree} onChange={e => setTp("tpDegree", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Interconnect (set in rail)</label>
          <p className="text-sm font-mono font-semibold px-2.5 py-1.5" style={{ color: interconnectRowActive ? INTERCONNECT_GREEN : "var(--dm-txt-body)" }}>{link?.name ?? "—"}</p>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Collective ops / layer</label>
          <div style={glowWrap(localLit("collectiveOpsPerLayer"), "34,211,238")}>
            <input type="number" min={1} value={tp.collectiveOpsPerLayer} onChange={e => setTp("collectiveOpsPerLayer", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Activation dtype bytes</label>
          <div style={glowWrap(localLit("activationDtypeBytes"), "34,211,238")}>
            <input type="number" min={0.5} step={0.5} value={tp.activationDtypeBytes} onChange={e => setTp("activationDtypeBytes", Math.max(0.5, Number(e.target.value) || 2))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
        {isDeltaNet && (
          <>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Delta chunk size (C)</label>
              <div style={glowWrap(deltaLit("chunkSize"), "34,211,238")}>
                <input type="number" min={1} value={deltaCfg.chunkSize} onChange={e => setDelta("chunkSize", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Delta TFLOP/s / GPU</label>
              <div style={glowWrap(deltaLit("deltaTflopsPerGpu"), "34,211,238")}>
                <input type="number" min={0} value={deltaCfg.deltaTflopsPerGpu} onChange={e => setDelta("deltaTflopsPerGpu", Math.max(0, Number(e.target.value) || 0))} className={tpNumberInput} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Fixed overhead (µs/chunk/layer)</label>
              <div style={glowWrap(deltaLit("fixedOverheadUsPerChunkPerLayer"), "34,211,238")}>
                <input type="number" min={0} value={deltaCfg.fixedOverheadUsPerChunkPerLayer} onChange={e => setDelta("fixedOverheadUsPerChunkPerLayer", Math.max(0, Number(e.target.value) || 0))} className={tpNumberInput} style={inputStyle} />
              </div>
            </div>
          </>
        )}
      </div>

      <ViewToggle view={view} onChange={setView} />

      {view === "visual" ? (
        <div className="mb-4">
          <DistributionViz
            subtitle={`One stacked bar per TP degree (${TP_SWEEP_DEGREES.join(", ")}) — compute categories proportionally split from Prefill's TFLOPS breakdown, with communication stacked on top. The highlighted bar is the TP degree set above; legend values match it. Hover any segment to light up its match across bars.`}
            bars={tpBars}
            legendSlices={tpSlices}
            fmtValue={v => `${v.toFixed(3)} s`}
          />
        </div>
      ) : (
      <>
      <div className="flex flex-col gap-4 mb-4">
        {renderMetricGroup("Compute", "#22d3ee", "34,211,238", computeRows)}
        {renderMetricGroup("Communication", INTERCONNECT_GREEN, INTERCONNECT_GREEN_RGB, commRows)}
      </div>

      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr
              onClick={() => toggleRow("wallClock")}
              className="cursor-pointer transition-colors duration-150"
              style={{ background: highlightedRow === "wallClock" ? "rgba(34,211,238,0.14)" : "var(--dm-surface-a)" }}
            >
              <td className="px-4 py-2.5 font-bold" style={{ color: "var(--dm-txt-primary)" }}>Wall-clock (compute + delta + comm, no overlap)</td>
              <td className="px-4 py-2.5 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>T_compute + T_delta + T_delta_fixed + T_comm</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: "#22d3ee" }}>{result.wallClockSec != null ? `${result.wallClockSec.toFixed(4)} s` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      </>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Speedup vs. 1 GPU</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.speedup != null ? `${result.speedup.toFixed(2)}×` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Parallel efficiency</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.parallelEfficiency != null ? `${(result.parallelEfficiency * 100).toFixed(1)}%` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Regime</p>
          <p className="text-sm font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.regime ?? "Select a silicon"}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>TP</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Compute (s)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Comm (s)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Total (s)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Speedup</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Efficiency</th>
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Regime</th>
            </tr>
          </thead>
          <tbody>
            {sweep.map((row, i) => {
              const isCurrent = row.tpDegree === tp.tpDegree;
              return (
                <tr key={row.tpDegree} style={{ background: isCurrent ? "rgba(34,211,238,0.10)" : i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                  <td className="px-3 py-1.5 font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.tpDegree}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.perGpuComputeTimeSec != null ? row.perGpuComputeTimeSec.toFixed(4) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.commTimeSec != null ? row.commTimeSec.toFixed(4) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.wallClockSec != null ? row.wallClockSec.toFixed(4) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.speedup != null ? `${row.speedup.toFixed(2)}×` : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.parallelEfficiency != null ? `${(row.parallelEfficiency * 100).toFixed(1)}%` : "—"}</td>
                  <td className="px-3 py-1.5" style={{ color: "var(--dm-txt-faint)" }}>{row.regime ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail to compute times, speedup, and efficiency.</p>}

      <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
        Assumes a bandwidth-optimal ring all-reduce derated by the comm-efficiency fraction (real NCCL/oneCCL
        realizes well under theoretical link BW), and no compute/comm overlap — all-reduce is a hard sync point,
        so compute, delta, and comm are all additive. Real fine-grained pipelining lands the true number between
        this wall-clock and the pure per-GPU compute time above.
      </p>
    </SectionCard>
  );
}

// ── Decode — tensor-parallel, memory-bandwidth model ────────────────────────────────────
// Ported from qwen_decode_prefill_calculator.xlsx's "Decode" sheet: t_token = MAX(t_mem,
// t_compute) + t_comm. Reuses the same TP degree / interconnect / collective-ops-per-layer
// inputs as Prefill-TP (Decode's "sync points per layer" is the same Megatron all-reduce
// count) rather than introducing a second, parallel set of TP controls.

function DecodeSection({ arch, usecase, chip, tp, onChangeTp, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; chip: ComparisonChip | undefined; tp: TpConfig; onChangeTp: (next: TpConfig) => void;
  highlightedRow: DecodeRowKey | null; onSelectRow: (key: DecodeRowKey | null) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBandwidthGBs = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);
  const result = useMemo(
    () => calcDecode(arch, usecase, tp, peak?.teraflops ?? null, memBandwidthGBs, link?.linkBwGBs ?? null),
    [arch, usecase, tp, peak?.teraflops, memBandwidthGBs, link?.linkBwGBs],
  );

  function toggleRow(key: DecodeRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  function setTp<K extends keyof TpConfig>(key: K, value: TpConfig[K]) {
    onChangeTp({ ...tp, [key]: value });
  }

  const localLit = (field: keyof TpConfig): boolean =>
    !!highlightedRow && (DECODE_ROW_HIGHLIGHTS[highlightedRow].localFields?.includes(field) ?? false);
  const interconnectRowActive = !!highlightedRow && !!DECODE_ROW_HIGHLIGHTS[highlightedRow].interconnectFields;
  const tpNumberInput = "rounded-lg px-2.5 py-1.5 text-sm focus:outline-none w-24";
  const glowWrap = (lit: boolean): React.CSSProperties => ({
    display: "inline-block", borderRadius: "0.5rem", transition: "box-shadow 200ms",
    boxShadow: lit ? "0 0 0 1px rgb(34,211,238), 0 0 8px rgba(34,211,238,0.5)" : "none",
  });

  type Row = { key: DecodeRowKey; label: string; formula: string; value: string; final?: boolean };

  const memRows: Row[] = [
    { key: "totalWeightBytes", label: "Total weight bytes", formula: `${ABBR.N} × bytes_per_param`, value: `${fmtInt(result.totalWeightBytes / 1e9)} GB` },
    { key: "weightBytesPerDevice", label: "Weight bytes per device", formula: "TotalWeightBytes ÷ TP", value: `${result.weightGBPerDevice.toFixed(2)} GB` },
    { key: "tMem", label: "t_mem — weight read time", formula: "WeightBytesPerDevice ÷ mem_BW × 1000", value: result.tMemMs != null ? `${result.tMemMs.toFixed(4)} ms` : "—", final: true },
  ];
  const computeRows: Row[] = [
    { key: "totalFlops", label: "Total decode FLOPs", formula: `2 × ${ABBR.N} × ${ABBR.B}`, value: `${fmtTflops(result.totalDecodeFlops / TFLOPS)} TFLOP` },
    { key: "flopsPerDevice", label: "FLOPs per device", formula: "TotalDecodeFLOPs ÷ TP", value: `${fmtTflops(result.flopsPerDevice / TFLOPS)} TFLOP` },
    { key: "tCompute", label: "t_compute — matmul time", formula: "FLOPsPerDevice ÷ (P_peak × gemm_mfu × 1e12) × 1000", value: result.tComputeMs != null ? `${result.tComputeMs.toFixed(4)} ms` : "—", final: true },
  ];
  const commRows: Row[] = [
    { key: "msgBytes", label: "All-reduce message size", formula: `${ABBR.B} × ${ABBR.d_model} × bytes_per_param`, value: `${fmtInt(result.allReduceMsgBytes)} bytes` },
    { key: "ringFactor", label: "Ring factor", formula: "2×(TP−1) ÷ TP", value: result.ringFactor.toFixed(4) },
    { key: "timePerAllReduce", label: "Time per all-reduce", formula: "ring_factor × msg_bytes ÷ (link_BW × comm_eff) × 1000", value: result.timePerAllReduceMs != null ? `${result.timePerAllReduceMs.toFixed(6)} ms` : "—" },
    { key: "syncPoints", label: "Total sync points / token", formula: `k_coll × ${ABBR.n_layers}`, value: fmtInt(result.totalSyncPoints) },
    { key: "tComm", label: "t_comm — total communication time", formula: "sync_points × time_per_all_reduce", value: result.tCommMs != null ? `${result.tCommMs.toFixed(4)} ms` : "—", final: true },
  ];

  /** One clearly-labeled sub-table per metric (t_mem / t_compute / t_comm) — its own accent
   *  color, its own row chain, ending in the bold metric the section is named for. Stacked
   *  one below the other (not side-by-side) so there's room for the Formula column without
   *  truncating it on smaller screens. */
  function renderMetricGroup(title: string, accent: string, accentRgb: string, groupRows: Row[]) {
    return (
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
        <div className="px-4 py-2" style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
          <span className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-4 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Component</th>
              <th className="px-4 py-1.5 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Formula</th>
              <th className="px-4 py-1.5 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {groupRows.map((r, i) => {
              const active = highlightedRow === r.key;
              const activeColor = r.final ? accent : "#22d3ee";
              const activeBg = r.final ? `rgba(${accentRgb},0.16)` : "rgba(34,211,238,0.14)";
              const idleBg = i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)";
              return (
                <tr
                  key={r.key} onClick={() => toggleRow(r.key)} className="cursor-pointer transition-colors duration-150"
                  style={{ background: active ? activeBg : idleBg, borderTop: r.final ? "2px solid var(--dm-border-a)" : "none" }}
                >
                  <td className={`px-4 py-2 ${r.final ? "font-bold" : ""}`} style={{ color: active ? activeColor : r.final ? "var(--dm-txt-primary)" : "var(--dm-txt-body)" }}>{r.label}</td>
                  <td className="px-4 py-2 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>{r.formula}</td>
                  <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${r.final ? "font-bold" : "font-semibold"}`} style={{ color: active ? activeColor : "var(--dm-txt-body)" }}>{r.value}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <SectionCard
      title="Decode — Tensor-Parallel, Memory-Bandwidth Model"
      subtitle="t_token = MAX(t_mem, t_compute) + t_comm — computed in three separate, clearly labeled chains below. KV-cache traffic is excluded here — negligible at low batch size with only 16 full-attention layers / 4 KV heads (see KV Cache once built). Click a row to light up the parameters it uses."
    >
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Tensor-parallel degree (TP)</label>
          <div style={glowWrap(localLit("tpDegree"))}>
            <input type="number" min={1} value={tp.tpDegree} onChange={e => setTp("tpDegree", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Interconnect (set in rail)</label>
          <p className="text-sm font-mono font-semibold px-2.5 py-1.5" style={{ color: interconnectRowActive ? INTERCONNECT_GREEN : "var(--dm-txt-body)" }}>{link?.name ?? "—"}</p>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Sync points / layer</label>
          <div style={glowWrap(localLit("collectiveOpsPerLayer"))}>
            <input type="number" min={1} value={tp.collectiveOpsPerLayer} onChange={e => setTp("collectiveOpsPerLayer", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-4">
        {renderMetricGroup("Memory — t_mem", MEMORY_ORANGE, MEMORY_ORANGE_RGB, memRows)}
        {renderMetricGroup("Compute — t_compute", "#22d3ee", "34,211,238", computeRows)}
        {renderMetricGroup("Communication — t_comm", INTERCONNECT_GREEN, INTERCONNECT_GREEN_RGB, commRows)}
      </div>

      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr
              onClick={() => toggleRow("totalTimePerToken")}
              className="cursor-pointer transition-colors duration-150"
              style={{ background: highlightedRow === "totalTimePerToken" ? "rgba(34,211,238,0.14)" : "var(--dm-surface-a)" }}
            >
              <td className="px-4 py-2.5 font-bold" style={{ color: "var(--dm-txt-primary)" }}>Total time per token</td>
              <td className="px-4 py-2.5 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>MAX(t_mem, t_compute) + t_comm</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: "#22d3ee" }}>{result.totalTimePerTokenMs != null ? `${result.totalTimePerTokenMs.toFixed(4)} ms` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Bound regime</p>
          <p className="text-sm font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.boundRegime ?? "Select a silicon"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Total time / token</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.totalTimePerTokenMs != null ? `${result.totalTimePerTokenMs.toFixed(2)} ms` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Tokens/sec — per stream</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.tokensPerSecPerStream != null ? fmtTflops(result.tokensPerSecPerStream) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Tokens/sec — aggregate</p>
          <p className="text-lg font-mono font-bold" style={{ color: "#22d3ee" }}>{result.tokensPerSecAggregate != null ? fmtTflops(result.tokensPerSecAggregate) : "—"}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <span
          className="text-[11px] font-semibold rounded-full px-2.5 py-1"
          style={{
            background: result.kvHeadShardingOk ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
            color: result.kvHeadShardingOk ? "#34d399" : "#f87171",
          }}
        >
          KV-head sharding (TP ≤ {arch.fullAttn.kvHeads}): {result.kvHeadShardingOk ? "OK" : "replicated"}
        </span>
        {arch.secondary && (
          <span
            className="text-[11px] font-semibold rounded-full px-2.5 py-1"
            style={{
              background: result.qkHeadShardingOk ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
              color: result.qkHeadShardingOk ? "#34d399" : "#f87171",
            }}
          >
            {arch.secondary.kind === "deltaNet"
              ? `DeltaNet QK-head sharding (TP ≤ ${arch.secondary.qkHeads})`
              : `Sliding-window KV-head sharding (TP ≤ ${arch.secondary.kvHeads})`}: {result.qkHeadShardingOk ? "OK" : "replicated"}
          </span>
        )}
      </div>

      {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail for weight-read time, matmul time, and throughput.</p>}
    </SectionCard>
  );
}

// ── KV Pool — occupancy & decode-aware parking ──────────────────────────────────────────
// Two placement strategies: "naive" keeps every admitted sequence's KV resident in HBM until
// it finishes; "decode-aware parking" keeps only the active decode batch resident and parks
// the rest in DDR → CXL → Flash, promoting a sequence back only when it's next in line to
// decode. The payoff: as long as a park/promote round trip is faster than the queue wait a
// waiting sequence would sit through anyway, parking reclaims HBM at no added latency. "Cards"
// reuses the same TP degree as Prefill-TP/Decode; slot-hold time is derived from calcDecode()
// run at the active-batch size, not manually entered.

const KV_WEIGHTS_COLOR = "#64748b"; // slate — fixed floor, weights
const KV_RESERVE_COLOR = "#94a3b8"; // lighter slate — fixed floor, activation/overhead
const KV_UNSERVED_RED = "#f87171";  // matches the app's existing "not ok" red (see kvHeadShardingOk)

function fmtGB(g: number): string {
  return g >= 100 ? g.toFixed(0) : g >= 10 ? g.toFixed(1) : g.toFixed(2);
}
function fmtSec(s: number): string {
  return s >= 1 ? `${s.toFixed(2)} s` : `${(s * 1000).toFixed(1)} ms`;
}

function LegendSwatch({ color, label, hatch, bordered }: { color: string; label: string; hatch?: boolean; bordered?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <i
        style={{
          width: 13, height: 11, borderRadius: 2, display: "inline-block",
          background: hatch ? `${color}29` : color,
          backgroundImage: hatch ? `repeating-linear-gradient(45deg, transparent, transparent 3px, ${color}66 3px, ${color}66 5px)` : undefined,
          border: bordered ? "1px solid var(--dm-border-a)" : "1px solid rgba(0,0,0,0.12)",
        }}
      />
      {label}
    </span>
  );
}

/** Stacked-bar visualization: one on-package-memory column per GPU (weights → reserve →
 *  resident KV, outlined as the active decode batch → free space, bottom-up) plus a DDR/CXL/
 *  Flash pool column each, hatched to read as "parked" rather than "active". Dashed arrows show
 *  the park/promote flow. `memLabel` names the actual memory technology of the selected GPU
 *  (HBM3e on NVIDIA, GDDR6 on Arc Pro B70, LPDDR5X on Crescent Island, ...) — this diagram never
 *  hardcodes "HBM" since that's NVIDIA-specific. */
function KvPoolViz({ tp, vramPerCardGB, baseline, o, kv, memLabel }: {
  tp: TpConfig; vramPerCardGB: number | null; baseline: KvCacheBaseline; o: KvPoolOccupancy; kv: KvCacheConfig; memLabel: string;
}) {
  const vram = vramPerCardGB ?? 0;
  const nH = Math.max(1, tp.tpDegree);
  const wShardPerGPU = baseline.weightsGB / tp.tpDegree;
  const reservePerGPU = baseline.reserveGB / tp.tpDegree;
  const kvResidentPerGPU = (o.resident * o.seqKVGB) / tp.tpDegree;

  const H = 420, padT = 48, padB = 48, base = H - padB, top = padT, colH = base - top;
  const hbmW = Math.min(70, 460 / nH - 12), gap = 12;
  const hbmCols: number[] = [];
  let x = 46;
  for (let i = 0; i < nH; i++) { hbmCols.push(x); x += hbmW + gap; }
  x += 34;
  const poolW = 96;
  const ddrX = x; x += poolW + 28;
  const cxlX = x; x += poolW + 28;
  const flashX = x;
  const totalW = flashX + poolW + 74;
  const hbmR = hbmCols[hbmCols.length - 1] + hbmW;

  const ppgHbm = vram > 0 ? colH / vram : 0;

  function poolColumn(px: number, seq: number, capGB: number, usedGB: number, bwGBs: number, label: string) {
    const ppg = capGB > 0 ? colH / capGB : 0;
    const uh = Math.min(usedGB, capGB) * ppg;
    const t = bwGBs > 0 ? o.seqKVGB / bwGBs : 0;
    return (
      <g key={label}>
        {uh > 0.3 && <rect x={px} y={base - uh} width={poolW} height={uh} fill={`${MEMORY_ORANGE}48`} stroke={MEMORY_ORANGE} strokeWidth={0.8} />}
        <rect x={px} y={top} width={poolW} height={colH} fill="none" stroke="var(--dm-border-a)" strokeWidth={1} />
        {seq > 0 && <text x={px + poolW / 2} y={base - uh - 8} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={MEMORY_ORANGE}>{seq} seq</text>}
        <text x={px + poolW / 2} y={base + 16} textAnchor="middle" fontSize={11} fill="var(--dm-txt-muted)">{label}</text>
        <text x={px + poolW / 2} y={base + 30} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)">{fmtGB(usedGB)}/{fmtInt(capGB)} GB</text>
        <text x={px + poolW / 2} y={base + 46} textAnchor="middle" fontSize={10} fill="var(--dm-txt-muted)">1 seq ↔ {fmtSec(t)}</text>
        <text x={px + poolW / 2} y={base + 59} textAnchor="middle" fontSize={9} fill="var(--dm-txt-faintest)">@ {fmtInt(bwGBs)} GB/s</text>
      </g>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden p-3" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)" }}>
      <svg viewBox={`0 0 ${totalW} ${H}`} className="w-full h-auto" style={{ display: "block" }}>
        <defs>
          <marker id="kv-ar" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M2 2L8 5L2 8" fill="none" stroke="var(--dm-txt-faint)" strokeWidth={1.4} />
          </marker>
        </defs>

        {hbmCols.map((cx, i) => {
          const wh = wShardPerGPU * ppgHbm;
          const rh = reservePerGPU * ppgHbm;
          const kh = Math.min(kvResidentPerGPU, Math.max(0, vram - wShardPerGPU - reservePerGPU)) * ppgHbm;
          const fh = Math.max(0, colH - wh - rh - kh);
          return (
            <g key={i}>
              <rect x={cx} y={base - wh} width={hbmW} height={wh} fill={KV_WEIGHTS_COLOR} stroke="rgba(0,0,0,0.10)" strokeWidth={0.6} />
              <rect x={cx} y={base - wh - rh} width={hbmW} height={rh} fill={KV_RESERVE_COLOR} stroke="rgba(0,0,0,0.10)" strokeWidth={0.6} />
              {kh > 0.3 && (
                <>
                  <rect x={cx} y={base - wh - rh - kh} width={hbmW} height={kh} fill={MEMORY_ORANGE} stroke="rgba(0,0,0,0.10)" strokeWidth={0.6} />
                  <rect x={cx + 0.8} y={base - wh - rh - kh + 0.8} width={hbmW - 1.6} height={Math.max(0, kh - 1.6)} fill="none" stroke="#22d3ee" strokeWidth={1.6} />
                </>
              )}
              <rect x={cx} y={base - wh - rh - kh - fh} width={hbmW} height={fh} fill="var(--dm-surface-b)" stroke="rgba(0,0,0,0.06)" strokeWidth={0.6} />
              <rect x={cx} y={top} width={hbmW} height={colH} fill="none" stroke="var(--dm-border-a)" strokeWidth={1} />
              <text x={cx + hbmW / 2} y={base + 16} textAnchor="middle" fontSize={11} fill="var(--dm-txt-muted)">GPU {i}</text>
              <text x={cx + hbmW / 2} y={base + 30} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)">{fmtInt(vram)}GB</text>
            </g>
          );
        })}
        <text x={(hbmCols[0] + hbmR) / 2} y={top - 20} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--dm-txt-primary)">
          {memLabel} — sharded ÷{tp.tpDegree} · {o.resident} seq resident
        </text>

        {poolColumn(ddrX, o.ddrSeq, kv.ddrPoolGB, o.ddrSeq * o.seqKVGB, kv.ddrBWGBs, "DDR pool")}
        {poolColumn(cxlX, o.cxlSeq, kv.cxlPoolGB, o.cxlSeq * o.seqKVGB, kv.cxlBWGBs, "CXL pool")}
        {poolColumn(flashX, o.flashSeq, kv.flashPoolGB, o.flashSeq * o.seqKVGB, kv.flashBWGBs, "Flash pool")}
        <text x={(ddrX + flashX + poolW) / 2} y={top - 20} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--dm-txt-primary)">
          Offload pools — parked (waiting) KV
        </text>

        <line x1={hbmR + 6} y1={top + colH * 0.4} x2={ddrX - 6} y2={top + colH * 0.4} stroke="var(--dm-txt-faint)" strokeDasharray="4 3" markerEnd="url(#kv-ar)" />
        <line x1={ddrX - 6} y1={top + colH * 0.6} x2={hbmR + 6} y2={top + colH * 0.6} stroke="var(--dm-txt-faint)" strokeDasharray="4 3" markerEnd="url(#kv-ar)" />
        <text x={(hbmR + ddrX) / 2} y={top + colH * 0.4 - 6} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)">park →</text>
        <text x={(hbmR + ddrX) / 2} y={top + colH * 0.6 + 14} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)">← promote</text>

        {o.unservedSeq > 0 && (
          <>
            <text x={flashX + poolW + 10} y={top + 14} fontSize={11} fill={KV_UNSERVED_RED}>⚠ {o.unservedSeq} seq</text>
            <text x={flashX + poolW + 10} y={top + 28} fontSize={11} fill={KV_UNSERVED_RED}>unservable</text>
          </>
        )}
      </svg>
    </div>
  );
}

/** Compares the queue wait a waiting sequence would sit through anyway against the cost of
 *  parking it to (and promoting it back from) DDR — the tier tried first. */
function KvPoolVerdict({ o, memLabel }: { o: KvPoolOccupancy; memLabel: string }) {
  if (o.unservedSeq > 0) {
    return (
      <div className="mt-3 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed" style={{ background: "rgba(248,113,113,0.12)", color: KV_UNSERVED_RED }}>
        Pools full — {o.unservedSeq} sequences ({fmtGB(o.unservedSeq * o.seqKVGB)} GB) have nowhere to go. Shard wider, add pool capacity, or shed load.
      </div>
    );
  }
  if (o.waiting === 0) {
    return (
      <div className="mt-3 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed" style={{ background: "var(--dm-surface-b)", color: "var(--dm-txt-muted)" }}>
        No queue — every sequence has a slot. Parking is idle here; it starts paying off the moment concurrency exceeds the {o.activeSlots}-slot batch.
      </div>
    );
  }
  const ratio = o.tDdrSec > 0 ? o.queueWaitSec / o.tDdrSec : Infinity;
  return (
    <div className="mt-3 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed" style={{ background: "rgba(52,211,153,0.12)", color: "#34d399" }}>
      Promoting from DDR costs <b>{fmtSec(o.tDdrSec)}</b> against a <b>{fmtSec(o.queueWaitSec)}</b> slot wait — KV returns{" "}
      <b>{Number.isFinite(ratio) ? (ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`) : "—"} before</b> it&apos;s needed.
      Parking {o.waiting} waiting sequences frees <b>{fmtGB(o.waiting * o.seqKVGB)} GB</b> of {memLabel} at no added latency; holding them resident
      would burn the fleet&apos;s most expensive memory to sit idle.
    </div>
  );
}

/** A second, purely time-oriented visual — separate from KvPoolViz's capacity/occupancy bars —
 *  showing the actual back-and-forth: one park (→ into the pool) then one promote (← back to
 *  {memLabel}) round trip per tier, laid on a shared time axis against the queue-wait line a
 *  parked sequence would otherwise sit through. A tier whose round trip lands left of that line
 *  is "free" — it returns before the slot would've opened anyway. Folds in the per-sequence
 *  numbers and the park-vs-hold verdict that used to sit in a separate table below it — the
 *  visual already shows every one of those move times inline, so the table was pure duplication. */
function KvTransferViz({ memLabel, o }: { memLabel: string; o: KvPoolOccupancy }) {
  const tiers: { key: string; label: string; color: string; tSec: number }[] = [
    { key: "ddr", label: "DDR", color: "#fbbf24", tSec: o.tDdrSec },
    { key: "cxl", label: "CXL", color: "#fb923c", tSec: o.tCxlSec },
    { key: "flash", label: "Flash", color: "#f97316", tSec: o.tFlashSec },
  ];
  const maxAxis = Math.max(o.queueWaitSec, ...tiers.map(t => t.tSec * 2), 1e-9);

  return (
    <div className="rounded-xl border overflow-hidden p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)" }}>
      <h3 className="text-xs font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>Park ↔ promote transfer</h3>
      <p className="text-[10.5px] leading-relaxed mb-3" style={{ color: "var(--dm-txt-muted)" }}>
        One full round trip out of {memLabel} and back, per tier — park (→) then promote (←), each segment sized to its one-way
        transfer time on the same time axis as the queue wait a parked sequence would otherwise sit through.
      </p>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-[11px] font-mono" style={{ color: "var(--dm-txt-muted)" }}>
        <span>KV / sequence: <b style={{ color: "var(--dm-txt-primary)" }}>{fmtGB(o.seqKVGB)} GB</b></span>
        <span>{memLabel} freed per parked seq: <b style={{ color: "var(--dm-txt-primary)" }}>{fmtGB(o.seqKVGB)} GB</b></span>
      </div>

      <div className="flex flex-col gap-4">
        {tiers.map(t => {
          const legPct = Math.min(100, (t.tSec / maxAxis) * 100);
          return (
            <div key={t.key} className="flex items-center gap-3">
              <span className="text-[10.5px] font-semibold w-10 text-right flex-shrink-0" style={{ color: "var(--dm-txt-faint)" }}>{t.label}</span>
              <div className="flex-1 relative h-8 rounded-md overflow-hidden" style={{ background: "var(--dm-surface-b)", border: "1px solid var(--dm-border-a)" }}>
                <div
                  className="absolute top-0 left-0 h-full flex items-center justify-end pr-1.5"
                  style={{ width: `${legPct}%`, background: `${t.color}40`, borderRight: `2px solid ${t.color}` }}
                >
                  <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: t.color }}>→ park {fmtSec(t.tSec)}</span>
                </div>
                <div
                  className="absolute top-0 h-full flex items-center pl-1.5"
                  style={{ left: `${legPct}%`, width: `${legPct}%`, background: `${t.color}22` }}
                >
                  <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: t.color }}>← promote {fmtSec(t.tSec)}</span>
                </div>
                {o.queueWaitSec > 0 && (
                  <div
                    className="absolute top-0 h-full"
                    style={{ left: `${Math.min(100, (o.queueWaitSec / maxAxis) * 100)}%`, borderLeft: "2px dashed #f87171" }}
                    title={`Queue wait: ${fmtSec(o.queueWaitSec)}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {o.queueWaitSec > 0 ? (
        <p className="mt-3 text-[10px] font-mono flex items-center gap-1.5" style={{ color: "#f87171" }}>
          <span style={{ display: "inline-block", width: 10, height: 0, borderTop: "2px dashed #f87171" }} />
          queue wait = {fmtSec(o.queueWaitSec)} — a tier's round trip finishing left of this line returns KV before the slot would&apos;ve opened anyway.
        </p>
      ) : (
        <p className="mt-3 text-[10px]" style={{ color: "var(--dm-txt-faintest)" }}>No queue right now — every sequence already has a decode slot, so there's nothing to park or promote.</p>
      )}

      <KvPoolVerdict o={o} memLabel={memLabel} />
    </div>
  );
}

function fmtTok(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)}K` : String(n);
}

/** A workload slider with a live value readout — used for Concurrency/Input/Output tokens so
 *  dragging one shows, immediately, how the whole KV Pool section (budget, resident/parked
 *  split, queue wait, transfer visual) reacts. Shares `usecase` with every other section via
 *  `onChangeUsecase`, so a drag here also updates the Use Case panel in the rail and vice versa. */
function WorkloadSlider({ label, value, min, max, step, format, onChange, accent }: {
  label: string; value: number; min: number; max: number; step: number; format: (v: number) => string;
  onChange: (v: number) => void; accent?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>{label}</label>
        <span className="text-xs font-mono font-bold" style={{ color: accent ?? "var(--dm-txt-primary)" }}>{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: accent ?? "#22d3ee" }}
      />
    </div>
  );
}

function KvCacheSection({ arch, usecase, onChangeUsecase, chip, tp, onChangeTp, kv, onChangeKv, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; onChangeUsecase: (next: UsecaseInputs) => void;
  chip: ComparisonChip | undefined; tp: TpConfig; onChangeTp: (next: TpConfig) => void;
  kv: KvCacheConfig; onChangeKv: (next: KvCacheConfig) => void;
  highlightedRow: KvCacheRowKey | null; onSelectRow: (key: KvCacheRowKey | null) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBandwidthGBs = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  const vramPerCardGB = chip ? getSiliconMemoryCapacityGB(chip) : null;
  const memLabel = getSiliconMemoryLabel(chip);
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  const baseline = useMemo(
    () => calcKvCacheBaseline(arch, usecase, tp, kv, vramPerCardGB),
    [arch, usecase, tp, kv, vramPerCardGB],
  );
  const atContext = useMemo(
    () => calcKvCacheAtContext(arch, usecase, tp, baseline, usecase.decodeContextLen, peak?.teraflops ?? null),
    [arch, usecase, tp, baseline, peak?.teraflops],
  );
  // Placement/capacity don't depend on decode timing — resolve those first to get the active-
  // batch size, then feed that (not the full concurrency) into calcDecode for a realistic
  // slot-hold time, and finally recompute with that for the queue-wait economics below.
  const placementOnly = useMemo(() => calcKvPoolOccupancy(usecase, kv, baseline, atContext, null), [usecase, kv, baseline, atContext]);
  const decodeAtActiveSlots = useMemo(
    () => calcDecode(arch, { ...usecase, concurrency: Math.max(1, placementOnly.activeSlots) }, tp, peak?.teraflops ?? null, memBandwidthGBs, link?.linkBwGBs ?? null),
    [arch, usecase, placementOnly.activeSlots, tp, peak?.teraflops, memBandwidthGBs, link?.linkBwGBs],
  );
  const o = useMemo(
    () => calcKvPoolOccupancy(usecase, kv, baseline, atContext, decodeAtActiveSlots.totalTimePerTokenMs),
    [usecase, kv, baseline, atContext, decodeAtActiveSlots.totalTimePerTokenMs],
  );

  function toggleRow(key: KvCacheRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }
  function setTp<K extends keyof TpConfig>(key: K, value: TpConfig[K]) {
    onChangeTp({ ...tp, [key]: value });
  }
  function setKv<K extends keyof KvCacheConfig>(key: K, value: KvCacheConfig[K]) {
    onChangeKv({ ...kv, [key]: value });
  }
  function setUsecase<K extends keyof UsecaseInputs>(key: K, value: UsecaseInputs[K]) {
    onChangeUsecase(updateUsecaseField(usecase, key, value));
  }

  const smallNumberInput = "rounded-lg px-2.5 py-1.5 text-sm focus:outline-none w-24";
  const cardStyle: React.CSSProperties = { border: "1px solid var(--dm-border-a)", borderRadius: "0.6rem", padding: "0.6rem 0.75rem" };
  const active = { total: o.activeSlots + o.waiting };

  return (
    <SectionCard
      title="KV Pool — Occupancy & Decode-Aware Parking"
      subtitle={`Only the active decode batch needs to sit in ${memLabel} — the rest can park in DDR → CXL → Flash and promote back when it's their turn, freeing ${memLabel} at no latency cost as long as the round trip beats the queue wait anyway.`}
    >
      {/* ── workload sliders — drag to see the impact on budget/resident/parked/queue-wait live ── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-4 p-3 rounded-xl" style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
        <WorkloadSlider
          label={`Concurrency (${ABBR.B})`} value={usecase.concurrency} min={1} max={256} step={1}
          format={v => fmtInt(v)} onChange={v => setUsecase("concurrency", Math.max(1, v))}
        />
        <WorkloadSlider
          label={`Input tokens (${ABBR.L})`} value={usecase.inputTokens} min={128} max={131072} step={128}
          format={fmtTok} onChange={v => setUsecase("inputTokens", Math.max(1, v))}
        />
        <WorkloadSlider
          label={`Output tokens (${ABBR.L_out})`} value={usecase.outputTokens} min={1} max={4096} step={16}
          format={fmtTok} onChange={v => setUsecase("outputTokens", Math.max(1, v))}
        />
      </div>

      {/* ── configuration — cards, reserve, decode batch, and the three pool tiers — moved up
          front since every card/visual below reads straight off these levers. ── */}
      <div className="flex flex-wrap items-end gap-4 mb-5 p-3 rounded-xl" style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Cards (TP group)</label>
          <input type="number" min={1} value={tp.tpDegree} onChange={e => setTp("tpDegree", Math.max(1, Number(e.target.value) || 1))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>Reserve %</label>
          <input type="number" min={0} max={1} step={0.01} value={kv.reserveFraction} onChange={e => setKv("reserveFraction", Math.min(1, Math.max(0, Number(e.target.value) || 0)))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Decode batch (slots)</label>
          <input type="number" min={1} value={kv.decodeBatchSlots} onChange={e => setKv("decodeBatchSlots", Math.max(1, Number(e.target.value) || 1))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>DDR pool (GB)</label>
          <input type="number" min={0} value={kv.ddrPoolGB} onChange={e => setKv("ddrPoolGB", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>CXL pool (GB)</label>
          <input type="number" min={0} value={kv.cxlPoolGB} onChange={e => setKv("cxlPoolGB", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>Flash pool (GB)</label>
          <input type="number" min={0} value={kv.flashPoolGB} onChange={e => setKv("flashPoolGB", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>CXL GB/s · card</label>
          <input type="number" min={0} value={kv.cxlBWGBs} onChange={e => setKv("cxlBWGBs", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>DDR / Flash GB/s</p>
          <p className="text-sm font-mono font-semibold py-1.5" style={{ color: "var(--dm-txt-body)" }}>
            {fmtInt(kv.ddrBWGBs)} <span style={{ color: "var(--dm-txt-faintest)" }}>(via {link?.name ?? "—"})</span>
          </p>
        </div>
      </div>

      {/* ── educate on decode waiting FIRST — this is the "why" that placement strategy answers ── */}
      <div style={cardStyle} className="mb-5">
        <h3 className="text-xs font-bold mb-2" style={{ color: "var(--dm-txt-primary)" }}>Decode occupancy &amp; queue wait</h3>
        <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: "var(--dm-txt-muted)" }}>
          Only {kv.decodeBatchSlots} sequences can actually decode at once — everyone else waits for a slot to free up.
          More concurrency or a smaller batch means more waiting; that wait is exactly what a placement strategy below can hide.
        </p>
        <div className="flex justify-between text-[11px] font-mono mb-1.5" style={{ color: "var(--dm-txt-muted)" }}>
          <span>active decode slots: <b style={{ color: "var(--dm-txt-primary)" }}>{o.activeSlots}</b></span>
          <span>waiting in queue: <b style={{ color: "var(--dm-txt-primary)" }}>{o.waiting}</b></span>
        </div>
        <div className="h-6 rounded-md overflow-hidden flex border mb-2" style={{ borderColor: "var(--dm-border-a)" }}>
          {o.activeSlots > 0 && (
            <div className="flex items-center justify-center text-[11px] font-mono text-white" style={{ width: `${(o.activeSlots / Math.max(1, active.total)) * 100}%`, background: "#f59e0b" }}>{o.activeSlots}</div>
          )}
          {o.waiting > 0 && (
            <div className="flex items-center justify-center text-[11px] font-mono text-white" style={{ width: `${(o.waiting / Math.max(1, active.total)) * 100}%`, background: MEMORY_ORANGE }}>{o.waiting}</div>
          )}
        </div>
        <p className="font-mono text-[10.5px] leading-relaxed p-2 rounded-md" style={{ color: "var(--dm-txt-muted)", background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
          slot held per turn = {fmtInt(usecase.outputTokens)} tok × {decodeAtActiveSlots.totalTimePerTokenMs != null ? decodeAtActiveSlots.totalTimePerTokenMs.toFixed(1) : "—"} ms = <b style={{ color: "var(--dm-txt-primary)" }}>{fmtSec(o.slotHoldSec)}</b><br />
          queue wait ≈ (waiting ÷ active slots) × slot-time = ({o.waiting} ÷ {o.activeSlots || 1}) × {fmtSec(o.slotHoldSec)} = <b style={{ color: "var(--dm-txt-primary)" }}>{fmtSec(o.queueWaitSec)}</b>
        </p>
      </div>

      {/* ── the to/fro transfer this queue wait motivates — right after the wait itself, before
          the strategy that acts on it ── */}
      <div className="mb-5">
        <KvTransferViz memLabel={memLabel} o={o} />
      </div>

      {/* ── now the placement strategy that answers that queue wait ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Placement strategy</span>
        <div className="inline-flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--dm-border-a)" }}>
          {(["naive", "park"] as const).map(m => (
            <button
              key={m} type="button" onClick={() => setKv("placementMode", m)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ background: kv.placementMode === m ? "rgba(34,211,238,0.15)" : "var(--dm-surface-a)", color: kv.placementMode === m ? "#22d3ee" : "var(--dm-txt-secondary)" }}
            >
              {m === "naive" ? `Naïve — all KV in ${memLabel}` : "Decode-aware parking"}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>
          {kv.placementMode === "naive"
            ? `${memLabel} must hold every admitted sequence — it fills and evicts early.`
            : `${memLabel} holds only the decoding batch; the rest wait in the pools.`}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div style={cardStyle} className="cursor-pointer" onClick={() => toggleRow("kvBudget")}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: highlightedRow === "kvBudget" ? MEMORY_ORANGE : "var(--dm-txt-faint)" }}>{memLabel} KV budget</p>
          <p className="text-base font-mono font-bold mt-0.5" style={{ color: "var(--dm-txt-primary)" }}>{fmtGB(o.kvBudgetTotalGB)} GB</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--dm-txt-faintest)" }}>{tp.tpDegree}× after weights+reserve</p>
        </div>
        <div style={cardStyle} className="cursor-pointer" onClick={() => toggleRow("kvPerToken")}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: highlightedRow === "kvPerToken" ? MEMORY_ORANGE : "var(--dm-txt-faint)" }}>KV / sequence</p>
          <p className="text-base font-mono font-bold mt-0.5" style={{ color: "var(--dm-txt-primary)" }}>{fmtGB(o.seqKVGB)} GB</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--dm-txt-faintest)" }}>{fmtInt(usecase.decodeContextLen)} tok context</p>
        </div>
        <div style={cardStyle}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Resident ({memLabel})</p>
          <p className="text-base font-mono font-bold mt-0.5" style={{ color: "#22d3ee" }}>{o.resident} seq</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--dm-txt-faintest)" }}>{fmtGB(o.resident * o.seqKVGB)} GB{o.computeCapped ? " · compute-capped" : ""}</p>
        </div>
        <div style={cardStyle}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Parked (pools)</p>
          <p className="text-base font-mono font-bold mt-0.5" style={{ color: MEMORY_ORANGE }}>{o.parked} seq</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--dm-txt-faintest)" }}>DDR {o.ddrSeq} · CXL {o.cxlSeq} · Flash {o.flashSeq}</p>
        </div>
        <div style={cardStyle}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Served / offered</p>
          <p className="text-base font-mono font-bold mt-0.5" style={{ color: o.unservedSeq > 0 ? KV_UNSERVED_RED : "var(--dm-txt-primary)" }}>{usecase.concurrency - o.unservedSeq} / {usecase.concurrency}</p>
          <p className="text-[10px] font-mono mt-0.5" style={{ color: "var(--dm-txt-faintest)" }}>{o.unservedSeq > 0 ? `${o.unservedSeq} seq unservable` : "all fit"}</p>
        </div>
      </div>

      <KvPoolViz tp={tp} vramPerCardGB={vramPerCardGB} baseline={baseline} o={o} kv={kv} memLabel={memLabel} />

      <div className="flex flex-wrap gap-4 mt-3 text-[11px]" style={{ color: "var(--dm-txt-muted)" }}>
        <LegendSwatch color={KV_WEIGHTS_COLOR} label="Weights (÷TP shard) — fixed" />
        <LegendSwatch color={KV_RESERVE_COLOR} label="Activation / overhead — fixed" />
        <LegendSwatch color={MEMORY_ORANGE} label="KV resident (active decode batch)" />
        <LegendSwatch color={MEMORY_ORANGE} hatch label="KV parked (DDR / CXL / Flash)" />
        <LegendSwatch color="var(--dm-surface-b)" bordered label="Free — promote / prefill staging" />
      </div>

      {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail for {memLabel} capacity and decode timing.</p>}
    </SectionCard>
  );
}

// ── Analysis — cross-stage time breakdown swept across concurrency ─────────────────────
// Level 1: Prefill / Decode / KV-Cache (+ Routing, greyed out — not yet modeled) stacked by
// total time at each concurrency. Click a band to drill into Level 2: that stage's Compute /
// Memory / Interconnect split. Click Prefill's Compute to drill into Level 3: FFN / Attention
// / DeltaNet. Stage colors are deliberately distinct from the Compute=cyan/Memory=orange/
// Interconnect=green convention used one level down, so the two levels never look like the same axis.

/** A hardware what-if combination — one of the 3 slots at the top of the page. Deliberately
 *  just silicon + TP + interconnect (not model or use-case): the point is comparing hardware
 *  choices for the SAME model/workload you're already studying, not switching workloads.
 *  "Active" (driving the whole page) means this combo's three fields match the page's current
 *  siliconId/tpConfig exactly — there's no separate stored "is active" flag. */
export interface WhatIfCombo {
  siliconId: string;
  tpDegree: number;
  interconnectId: string;
}

function comboMatchesCurrent(combo: WhatIfCombo, siliconId: string, tp: TpConfig): boolean {
  return combo.siliconId === siliconId && combo.tpDegree === tp.tpDegree && combo.interconnectId === tp.interconnectId;
}

/** Shipped starting point for the 3 what-if slots — a realistic low/mid/high spread. Slot 1
 *  matches the page's own default silicon/TP/interconnect, so it's the one shown "Active". */
const DEFAULT_WHAT_IF_COMBOS: (WhatIfCombo | null)[] = [
  { siliconId: "b70", tpDegree: 4, interconnectId: "pcie-gen4" },
  { siliconId: "crescent-island", tpDegree: 1, interconnectId: "pcie-gen5" },
  { siliconId: "gb300-nvl72", tpDegree: 1, interconnectId: "nvlink5" },
];

type AnalysisStageKey = "prefill" | "decode" | "kvCache";

const STAGE_COLORS: Record<AnalysisStageKey, string> = {
  prefill: "#6366f1",   // vivid indigo
  decode: "#ec4899",    // vivid pink
  kvCache: "#f59e0b",   // vivid amber
};
const STAGE_LABELS: Record<AnalysisStageKey, string> = { prefill: "Prefill", decode: "Decode", kvCache: "KV Pool" };
const FFN_CYAN = "#5eead4";       // teal-300 — brightest of the three
const ATTENTION_CYAN = "#06b6d4"; // cyan-500 — punchier than the old cyan-400
const DELTANET_CYAN = "#1d4ed8";  // blue-700 — deep, still reads as "compute family"

/** One raw-values table under the chart — a small "spec" strip (the silicon/config numbers
 *  that stay fixed across the sweep) above a Metric × Concurrency grid (the numbers that do
 *  change), so every value on the chart above can be read exactly. */
function AnalysisRawTable({ title, specs, rows, xValues }: {
  title: string;
  specs: { label: string; value: string }[];
  rows: { label: string; values: (number | string)[]; bold?: boolean; format?: (v: number | string) => string }[];
  xValues: number[];
}) {
  return (
    <div className="rounded-xl overflow-hidden border mt-4" style={{ borderColor: "var(--dm-border-a)" }}>
      <div className="px-4 py-2" style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
        <span className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-primary)" }}>{title} — raw values</span>
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-x-4 gap-y-1" style={{ borderBottom: "1px solid var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
        {specs.map(s => (
          <span key={s.label} className="text-[10.5px]" style={{ color: "var(--dm-txt-muted)" }}>
            <span style={{ color: "var(--dm-txt-faint)" }}>{s.label}:</span> <span className="font-mono font-semibold" style={{ color: "var(--dm-txt-body)" }}>{s.value}</span>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest text-[9px] whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>Metric \ Concurrency</th>
              {xValues.map(x => (
                <th key={x} className="px-3 py-1.5 text-right font-mono font-bold text-[10px]" style={{ color: "var(--dm-txt-faint)" }}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} style={{ background: r.bold ? "var(--dm-table-head)" : i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                <td className={`px-3 py-1.5 whitespace-nowrap ${r.bold ? "font-bold" : ""}`} style={{ color: r.bold ? "var(--dm-txt-primary)" : "var(--dm-txt-body)" }}>{r.label}</td>
                {r.values.map((v, j) => (
                  <td key={j} className={`px-3 py-1.5 text-right font-mono ${r.bold ? "font-bold" : ""}`} style={{ color: r.bold ? "var(--dm-txt-primary)" : "var(--dm-txt-body)" }}>
                    {r.format ? r.format(v) : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalysisSection({ arch, usecase, chip, tp, deltaCfg, kv, siliconId, isDark, combos, onUpdateComboField, onApplyCombo, onClearCombo }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; chip: ComparisonChip | undefined;
  tp: TpConfig; deltaCfg: DeltaNetPrefillConfig; kv: KvCacheConfig;
  siliconId: string; isDark: boolean;
  combos: (WhatIfCombo | null)[];
  onUpdateComboField: <K extends keyof WhatIfCombo>(slot: number, field: K, value: WhatIfCombo[K]) => void;
  onApplyCombo: (slot: number) => void;
  onClearCombo: (slot: number) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBandwidthGBs = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  const vramPerCardGB = chip ? getSiliconMemoryCapacityGB(chip) : null;
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  const sweep = useMemo(
    () => calcAnalysisSweep(arch, usecase, tp, deltaCfg, kv, peak?.teraflops ?? null, memBandwidthGBs, link?.linkBwGBs ?? null, vramPerCardGB),
    [arch, usecase, tp, deltaCfg, kv, peak?.teraflops, memBandwidthGBs, link?.linkBwGBs, vramPerCardGB],
  );
  const xValues = sweep.map(p => p.concurrency);

  const [drillStage, setDrillStage] = useState<AnalysisStageKey | null>(null);
  const [drillCategory, setDrillCategory] = useState<"compute" | "memory" | "interconnect" | null>(null);

  function resetToTop() { setDrillStage(null); setDrillCategory(null); }
  function goToStage(stage: AnalysisStageKey) { setDrillStage(stage); setDrillCategory(null); }

  const crumbs: { label: string; onClick: () => void }[] = [{ label: "All stages", onClick: resetToTop }];
  if (drillStage) crumbs.push({ label: STAGE_LABELS[drillStage], onClick: () => goToStage(drillStage) });
  if (drillCategory) crumbs.push({ label: drillCategory[0].toUpperCase() + drillCategory.slice(1), onClick: () => {} });

  let chart: React.ReactNode;
  let caption: string;

  if (!drillStage) {
    const series: StackedAreaSeries[] = [
      { key: "prefill", label: "Prefill", color: STAGE_COLORS.prefill, values: sweep.map(p => p.prefill.totalMs), onClick: () => goToStage("prefill") },
      { key: "decode", label: "Decode", color: STAGE_COLORS.decode, values: sweep.map(p => p.decode.totalMs), onClick: () => goToStage("decode") },
      { key: "kvCache", label: "KV Pool", color: STAGE_COLORS.kvCache, values: sweep.map(p => p.kvCache.totalMs), onClick: () => goToStage("kvCache") },
      { key: "routing", label: "Routing", color: "#94a3b8", values: xValues.map(() => 0), disabledNote: "not yet modeled" },
    ];
    chart = <StackedAreaChart xValues={xValues} xLabel="Concurrency (B)" yLabel="Time (ms)" series={series} />;
    caption = "Total time per stage for one request end-to-end (Prefill wall-clock + Decode's per-token time × output tokens + any KV-Cache eviction cost), at the current input/output token lengths. Click a band to drill in.";
  } else if (!drillCategory && drillStage === "kvCache") {
    const series: StackedAreaSeries[] = [
      { key: "recompute", label: "Recompute (Compute)", color: "#22d3ee", values: sweep.map(p => p.kvCache.recomputeMs ?? 0) },
      { key: "readback", label: "Fastest read-back (Memory)", color: MEMORY_ORANGE, values: sweep.map(p => p.kvCache.fastestReadBackMs ?? 0) },
    ];
    chart = <StackedAreaChart xValues={xValues} xLabel="Concurrency (B)" yLabel="Time (ms)" series={series} stacked={false} />;
    caption = "KV Cache only costs time once concurrency exceeds capacity at the current context length (0 below that line). Recompute and read-back are alternatives, not additive — a real system picks whichever is lower, which is what feeds the Level-1 total.";
  } else if (!drillCategory) {
    const stage: "prefill" | "decode" = drillStage === "prefill" ? "prefill" : "decode";
    const breakdowns = sweep.map(p => p[stage]);
    const series: StackedAreaSeries[] = [
      { key: "compute", label: "Compute", color: "#22d3ee", values: breakdowns.map(b => b.computeMs), onClick: stage === "prefill" ? () => setDrillCategory("compute") : undefined },
      { key: "memory", label: "Memory", color: MEMORY_ORANGE, values: breakdowns.map(b => b.memoryMs) },
      { key: "interconnect", label: "Interconnect", color: INTERCONNECT_GREEN, values: breakdowns.map(b => b.interconnectMs) },
    ];
    if (stage === "prefill") {
      chart = <StackedAreaChart xValues={xValues} xLabel="Concurrency (B)" yLabel="Time (ms)" series={series} stacked />;
      caption = "Prefill is modeled compute-bound by construction (weight reads amortized across the batch), so Memory is 0 here. Compute + Interconnect sum to Prefill's total. Click Compute to drill into FFN/Attention/DeltaNet.";
    } else {
      chart = <StackedAreaChart xValues={xValues} xLabel="Concurrency (B)" yLabel="Time (ms)" series={series} stacked={false} />;
      caption = "Decode's per-token time is MAX(Memory, Compute) + Interconnect — Memory and Compute are alternatives (whichever is larger sets the bound, typically Memory at low concurrency), not additive, so they're overlaid here rather than stacked. Interconnect adds on top of that bound.";
    }
  } else {
    const series: StackedAreaSeries[] = [
      { key: "ffn", label: "FFN", color: FFN_CYAN, values: sweep.map(p => p.prefill.computeSub?.ffnMs ?? 0) },
      { key: "attention", label: "Attention", color: ATTENTION_CYAN, values: sweep.map(p => p.prefill.computeSub?.attentionMs ?? 0) },
      { key: "deltaNet", label: arch.secondary?.kind === "deltaNet" ? "DeltaNet" : "DeltaNet (n/a)", color: DELTANET_CYAN, values: sweep.map(p => p.prefill.computeSub?.deltaNetMs ?? 0) },
    ];
    chart = <StackedAreaChart xValues={xValues} xLabel="Concurrency (B)" yLabel="Time (ms)" series={series} stacked />;
    caption = arch.secondary?.kind === "deltaNet"
      ? "FFN + Attention (both at the shared GEMM rate) + DeltaNet (its own, separately-set achieved TFLOP/s) sum to Prefill's Compute time."
      : "This model has no DeltaNet layers (that band is 0) — FFN + Attention sum to Prefill's Compute time.";
  }

  // ── raw-values tables — the exact numbers behind the chart at every concurrency step,
  // plus the silicon/config specs that stay fixed across the sweep (so a value can always be
  // traced back to "what silicon spec produced this"). ───────────────────────────────────
  const msFmt = (v: number | string) => (typeof v === "number" ? v.toFixed(v >= 100 ? 1 : 3) : v);

  const prefillSpecs = [
    { label: "Peak TFLOPS", value: peak ? `${peak.raw} (${peak.dataType})` : "—" },
    { label: "Achieved compute MFU", value: `${(usecase.gemmMfu * 100).toFixed(0)}%` },
    { label: "Interconnect", value: link ? `${link.name} (${fmtInt(link.linkBwGBs)} GB/s)` : "—" },
    { label: "Comm efficiency", value: `${(usecase.commEfficiency * 100).toFixed(0)}%` },
    { label: "TP degree", value: fmtInt(tp.tpDegree) },
  ];
  const prefillRows = [
    { label: "FFN (ms)", values: sweep.map(p => p.prefill.computeSub?.ffnMs ?? 0), format: msFmt },
    { label: "Attention (ms)", values: sweep.map(p => p.prefill.computeSub?.attentionMs ?? 0), format: msFmt },
    ...(arch.secondary?.kind === "deltaNet" ? [{ label: "DeltaNet (ms)", values: sweep.map(p => p.prefill.computeSub?.deltaNetMs ?? 0), format: msFmt }] : []),
    { label: "Compute total (ms)", values: sweep.map(p => p.prefill.computeMs), format: msFmt },
    { label: "Interconnect (ms)", values: sweep.map(p => p.prefill.interconnectMs), format: msFmt },
    { label: "Total (ms)", values: sweep.map(p => p.prefill.totalMs), bold: true, format: msFmt },
  ];

  const decodeSpecs = [
    { label: "Peak TFLOPS", value: peak ? `${peak.raw} (${peak.dataType})` : "—" },
    { label: "Memory BW", value: memBandwidthGBs != null ? `${fmtInt(memBandwidthGBs)} GB/s` : "—" },
    { label: "Achieved compute MFU", value: `${(usecase.gemmMfu * 100).toFixed(0)}%` },
    { label: "Interconnect", value: link ? `${link.name} (${fmtInt(link.linkBwGBs)} GB/s)` : "—" },
    { label: "Comm efficiency", value: `${(usecase.commEfficiency * 100).toFixed(0)}%` },
    { label: "Output tokens", value: fmtInt(usecase.outputTokens) },
  ];
  const decodeRows = [
    { label: "Memory (ms)", values: sweep.map(p => p.decode.memoryMs), format: msFmt },
    { label: "Compute (ms)", values: sweep.map(p => p.decode.computeMs), format: msFmt },
    { label: "Interconnect (ms)", values: sweep.map(p => p.decode.interconnectMs), format: msFmt },
    { label: "Total decode-phase (ms)", values: sweep.map(p => p.decode.totalMs), bold: true, format: msFmt },
  ];

  const kvSpecs = [
    { label: "VRAM / card", value: vramPerCardGB != null ? `${fmtInt(vramPerCardGB)} GB` : "—" },
    { label: "Peak TFLOPS (recompute)", value: peak ? `${peak.raw} (${peak.dataType})` : "—" },
    { label: "DDR / CXL / Flash", value: `${fmtInt(kv.ddrBWGBs)} / ${fmtInt(kv.cxlBWGBs)} / ${fmtInt(kv.flashBWGBs)} GB/s` },
    { label: "Context length", value: `${fmtInt(usecase.decodeContextLen)} tokens` },
    { label: "TP degree", value: fmtInt(tp.tpDegree) },
  ];
  const kvRows = [
    { label: "Over capacity?", values: sweep.map(p => (p.kvCache.overCapacity ? "Yes" : "No")), format: (v: number | string) => String(v) },
    { label: "Recompute (ms)", values: sweep.map(p => p.kvCache.recomputeMs ?? 0), format: msFmt },
    { label: "Fastest read-back (ms)", values: sweep.map(p => p.kvCache.fastestReadBackMs ?? 0), format: msFmt },
    { label: "Fastest medium", values: sweep.map(p => p.kvCache.fastestMedium ?? "—"), format: (v: number | string) => String(v) },
    { label: "Total (realistic, ms)", values: sweep.map(p => p.kvCache.totalMs), bold: true, format: msFmt },
  ];

  // ── compare saved combinations — one sweep per saved slot, each resolved with the combo's
  // own silicon/TP/interconnect but the SAME model/use-case/delta-config currently being
  // studied (a combo is a hardware variant, not a different workload). KV config isn't part of
  // a combo since it doesn't affect Prefill/Decode at all — the current page's `kv` covers all. ──
  const comboSweeps = useMemo(
    () => combos
      .map((combo, slot) => ({ slot, combo }))
      .filter((x): x is { slot: number; combo: WhatIfCombo } => x.combo != null)
      .map(({ slot, combo }) => {
        const comboChip = COMPARISON_CHIPS.find(c => c.id === combo.siliconId);
        const comboPeak = comboChip ? getSiliconPeak(comboChip) : null;
        const comboMemBW = comboChip ? getSiliconMemoryBandwidthGBs(comboChip) : null;
        const comboLink = INTERCONNECTS.find(i => i.id === combo.interconnectId);
        const comboVram = comboChip ? getSiliconMemoryCapacityGB(comboChip) : null;
        const comboTp: TpConfig = { tpDegree: combo.tpDegree, interconnectId: combo.interconnectId, collectiveOpsPerLayer: tp.collectiveOpsPerLayer, activationDtypeBytes: tp.activationDtypeBytes };
        const comboAnalysis = calcAnalysisSweep(
          arch, usecase, comboTp, deltaCfg, kv,
          comboPeak?.teraflops ?? null, comboMemBW, comboLink?.linkBwGBs ?? null, comboVram,
        );
        const label = `${comboChip?.name ?? combo.siliconId} · TP${combo.tpDegree}`;
        return { slot, combo, label, analysis: comboAnalysis };
      }),
    [combos, arch, usecase, deltaCfg, kv, tp.collectiveOpsPerLayer, tp.activationDtypeBytes],
  );
  const COMBO_COLORS = COMBO_SLOT_COLORS;

  const activeLink = INTERCONNECTS.find(i => i.id === tp.interconnectId);
  const analysisTitle = `Comparisons: ${chip?.name ?? siliconId}, TP=${tp.tpDegree}, ${activeLink?.name ?? tp.interconnectId}`;

  return (
    <>
      <WhatIfComboBar combos={combos} siliconId={siliconId} tp={tp} isDark={isDark} onUpdateField={onUpdateComboField} onApply={onApplyCombo} onClear={onClearCombo} />

      <SectionCard
        title={analysisTitle}
        subtitle="Where does the time go, and how does that shift as concurrency scales? Drill down to see how the selected silicon's TFLOPS, memory bandwidth, and interconnect speed each start to dominate at different points."
      >
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span style={{ color: "var(--dm-txt-faint)" }}>/</span>}
              <button
                type="button" onClick={c.onClick}
                className="text-xs font-semibold rounded px-1.5 py-0.5 transition-colors"
                style={{ color: i === crumbs.length - 1 ? "var(--dm-txt-primary)" : "#22d3ee", cursor: i === crumbs.length - 1 ? "default" : "pointer" }}
              >
                {c.label}
              </button>
            </span>
          ))}
        </div>

        {chart}

        <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>{caption}</p>

        {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail to compute times across the sweep.</p>}

        <AnalysisRawTable title="Prefill" specs={prefillSpecs} rows={prefillRows} xValues={xValues} />
        <AnalysisRawTable title="Decode" specs={decodeSpecs} rows={decodeRows} xValues={xValues} />
        <AnalysisRawTable title="KV Pool" specs={kvSpecs} rows={kvRows} xValues={xValues} />
      </SectionCard>

      <div className="rounded-2xl border mt-6 px-5 py-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Compare saved combinations</p>
        {comboSweeps.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--dm-txt-muted)" }}>Save at least one what-if combination above to see it here — save two or more to compare them against each other.</p>
        ) : (
          <>
            <p className="text-[11px] mb-3" style={{ color: "var(--dm-txt-muted)" }}>
              Same model and workload as everywhere else on this page — only silicon/TP/interconnect vary per combo. Prefill and Decode wall-clock across the same concurrency sweep, overlaid so you can see which combination actually wins, and at what concurrency the ranking might flip.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {comboSweeps.map(({ slot, label }) => (
                <span key={slot} className="text-[11px] font-mono font-semibold rounded px-2 py-1" style={{ color: COMBO_COLORS[slot % 3], background: `${COMBO_COLORS[slot % 3]}1a` }}>
                  {slot + 1}) {label}
                </span>
              ))}
            </div>

            <h4 className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>Prefill — total wall-clock (ms)</h4>
            <StackedAreaChart
              xValues={comboSweeps[0].analysis.map(p => p.concurrency)} xLabel="Concurrency (B)" yLabel="Time (ms)" stacked={false}
              series={comboSweeps.map(({ slot, label, analysis }) => ({
                key: `prefill-${slot}`, label, color: COMBO_COLORS[slot % 3], values: analysis.map(p => p.prefill.totalMs),
              }))}
            />

            <h4 className="text-[10px] font-semibold uppercase tracking-widest mt-6 mb-2" style={{ color: "var(--dm-txt-faint)" }}>Decode — total decode-phase wall-clock (ms)</h4>
            <StackedAreaChart
              xValues={comboSweeps[0].analysis.map(p => p.concurrency)} xLabel="Concurrency (B)" yLabel="Time (ms)" stacked={false}
              series={comboSweeps.map(({ slot, label, analysis }) => ({
                key: `decode-${slot}`, label, color: COMBO_COLORS[slot % 3], values: analysis.map(p => p.decode.totalMs),
              }))}
            />
          </>
        )}
      </div>
    </>
  );
}

// ── coming-soon placeholder for the remaining sections ──────────────────────────────────

function ComingSoonSection({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-20"
      style={{ borderColor: "var(--dm-border-b)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--dm-txt-secondary)" }}>{title} — coming soon</p>
      <p className="mt-1 text-xs max-w-md leading-relaxed" style={{ color: "var(--dm-txt-faint)" }}>{blurb}</p>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────────────────

type Section = "architecture" | "prefill" | "decode" | "kv-cache" | "routing" | "persistent-memory" | "analysis";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "architecture", label: "Architecture" },
  { key: "prefill", label: "Prefill" },
  { key: "decode", label: "Decode" },
  { key: "kv-cache", label: "KV Pool" },
  { key: "routing", label: "Routing" },
  { key: "persistent-memory", label: "Persistent Memory" },
  { key: "analysis", label: "Comparisons" },
];

const COMING_SOON_BLURB: Record<Exclude<Section, "architecture" | "prefill" | "decode" | "kv-cache" | "analysis">, string> = {
  "routing": "Reserved for MoE expert-routing overhead once a routed model is added — Qwen3.8-27B is dense, so this section doesn't apply to it yet.",
  "persistent-memory": "Constant, concurrency-independent memory — model weights, in GiB — plus GPU capacity fit-checks, from the VRAM Calculation sheet.",
};

type PrefillStep = 1 | 2 | 3 | 4 | 5;

const PREFILL_STEPS: { step: PrefillStep; label: string }[] = [
  { step: 1, label: "Architecture" },
  { step: 2, label: "Use Case, Compute & Memory" },
  { step: 3, label: "Prefill TFLOPS" },
  { step: 4, label: "Interconnect" },
  { step: 5, label: "Prefill under Tensor Parallelism" },
];

const COMBO_SLOT_COLORS = ["#8b5cf6", "#14b8a6", "#f43f5e"];
const COMBO_ACTIVE_GREEN = "#34d399";

/** The 3 what-if hardware slots, pinned to the top of the page (above the section tabs) so
 *  they're available no matter which section you're looking at. Each slot is a live, always-
 *  editable mini-form (Silicon / TP / Interconnect) rather than a "save current settings"
 *  snapshot — editing a dropdown updates just that slot, with nothing applied to the rest of
 *  the page until you hit the ✓ apply icon. The slot matching the page's current silicon/TP/
 *  interconnect exactly is outlined in green as the one actually driving every other section. */
function WhatIfComboBar({ combos, siliconId, tp, isDark, onUpdateField, onApply, onClear }: {
  combos: (WhatIfCombo | null)[];
  siliconId: string; tp: TpConfig; isDark: boolean;
  onUpdateField: <K extends keyof WhatIfCombo>(slot: number, field: K, value: WhatIfCombo[K]) => void;
  onApply: (slot: number) => void;
  onClear: (slot: number) => void;
}) {
  const comboSelect = "rounded-md px-2.5 py-1.5 text-xs font-medium focus:outline-none";
  const comboNumberInput = "rounded-md px-2.5 py-1.5 text-xs font-semibold text-center focus:outline-none w-16";

  return (
    <div className="rounded-2xl border mb-6 overflow-hidden" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)" }}>
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--dm-txt-primary)" }}>What-if combinations</h2>
        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: "var(--dm-txt-muted)" }}>
          Hardware to compare for the current model &amp; workload — pick Silicon / TP / Interconnect per slot, then <b>✓</b> to make one active.
        </p>
      </div>
      <div className="flex flex-col gap-3 p-4">
        {[0, 1, 2].map(slot => {
          const combo = combos[slot] ?? { siliconId, tpDegree: tp.tpDegree, interconnectId: tp.interconnectId };
          const isConfigured = combos[slot] != null;
          const isActive = comboMatchesCurrent(combo, siliconId, tp);
          const chip = COMPARISON_CHIPS.find(c => c.id === combo.siliconId);
          const link = INTERCONNECTS.find(i => i.id === combo.interconnectId);
          const accent = isConfigured ? COMBO_SLOT_COLORS[slot % 3] : "var(--dm-txt-faintest)";

          return (
            <div
              key={slot}
              className="w-full flex items-stretch gap-0 rounded-xl overflow-hidden border transition-all duration-150"
              style={{
                borderColor: isActive ? COMBO_ACTIVE_GREEN : "var(--dm-border-a)",
                boxShadow: isActive ? `0 0 0 1.5px ${COMBO_ACTIVE_GREEN}, 0 0 14px rgba(52,211,153,0.35)` : "0 1px 2px rgba(0,0,0,0.04)",
                background: "var(--dm-surface-a)",
              }}
            >
              <div className="w-1.5 flex-shrink-0" style={{ background: accent }} />

              <div className="flex-1 flex items-center gap-3 flex-wrap px-4 py-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold flex-shrink-0"
                  style={{ color: isConfigured ? "#04222b" : "var(--dm-txt-faint)", background: isConfigured ? accent : "var(--dm-surface-b)" }}
                >
                  {slot + 1}
                </span>

                <select
                  value={combo.siliconId} onChange={e => onUpdateField(slot, "siliconId", e.target.value)}
                  className={comboSelect} style={{ ...selectStyle(isDark), width: "12rem" }}
                >
                  <option value="" disabled>Silicon…</option>
                  {COMPARISON_CHIPS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--dm-txt-faint)" }}>
                  TP
                  <input
                    type="number" min={1} value={combo.tpDegree}
                    onChange={e => onUpdateField(slot, "tpDegree", Math.max(1, Number(e.target.value) || 1))}
                    className={comboNumberInput} style={inputStyle}
                  />
                </label>

                <select
                  value={combo.interconnectId} onChange={e => onUpdateField(slot, "interconnectId", e.target.value)}
                  className={comboSelect} style={{ ...selectStyle(isDark), width: "12rem" }}
                >
                  {INTERCONNECTS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>

                <span className="w-px self-stretch flex-shrink-0" style={{ background: "var(--dm-border-a)" }} />

                <span className="text-[10.5px] font-mono rounded px-2 py-1" style={{ color: MEMORY_ORANGE, background: `${MEMORY_ORANGE}1a` }}>
                  {chip ? `${chip.memory.type} · ${chip.memory.bandwidth} · ${chip.memory.capacity}` : "select a silicon"}
                </span>
                <span className="text-[10.5px] font-mono rounded px-2 py-1" style={{ color: INTERCONNECT_GREEN, background: `${INTERCONNECT_GREEN}1a` }}>
                  {link ? `${fmtInt(link.linkBwGBs)} GB/s` : "—"}
                </span>

                {isActive && (
                  <span className="text-[9.5px] font-extrabold uppercase tracking-widest rounded-full px-2 py-0.5" style={{ color: "#042318", background: COMBO_ACTIVE_GREEN }}>
                    ● Active
                  </span>
                )}

                <span className="flex-1" />

                <button
                  type="button" onClick={() => onApply(slot)} title="Make this the active combination"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-150 hover:scale-110"
                  style={{ color: isActive ? "#042318" : COMBO_ACTIVE_GREEN, background: isActive ? COMBO_ACTIVE_GREEN : "rgba(52,211,153,0.14)" }}
                >
                  ✓
                </button>
                <button
                  type="button" onClick={() => onClear(slot)} title="Clear this slot" disabled={!isConfigured}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-150 hover:scale-110 disabled:hover:scale-100"
                  style={{ color: isConfigured ? "#fca5a5" : "var(--dm-txt-faintest)", background: isConfigured ? "rgba(248,113,113,0.14)" : "var(--dm-surface-b)" }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DeepAnalysisView() {
  useRequestSidebarCollapsed(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const arch = getModelArchitecture(modelId);
  const [usecase, setUsecase] = useState<UsecaseInputs>(DEFAULT_USECASE_INPUTS);
  const [siliconId, setSiliconId] = useState<string>("b70");
  const [tpConfig, setTpConfig] = useState<TpConfig>(DEFAULT_TP_CONFIG);
  /** Arc Pro B70's realistic default fabric is PCIe Gen4, not Gen5 — nudge the interconnect
   *  there the moment B70 becomes the selected silicon, without fighting a later manual choice. */
  function handleSiliconChange(nextSiliconId: string) {
    setSiliconId(nextSiliconId);
    if (nextSiliconId === "b70") setTpConfig(prev => ({ ...prev, interconnectId: B70_DEFAULT_INTERCONNECT_ID }));
  }
  const [deltaNetConfig, setDeltaNetConfig] = useState<DeltaNetPrefillConfig>(DEFAULT_DELTANET_PREFILL_CONFIG);
  const [kvCacheConfig, setKvCacheConfig] = useState<KvCacheConfig>(DEFAULT_KV_CACHE_CONFIG);
  /** DDR and All-Flash are only reachable *over* the selected Interconnect (same reasoning as
   *  the Memory panel) — derived here rather than stored, so editing the Interconnect always
   *  keeps these two in sync without an effect fighting the user's own KV Pool inputs. CXL
   *  keeps its own independently-configured spec. */
  const kvInterconnectLinkBwGBs = INTERCONNECTS.find(i => i.id === tpConfig.interconnectId)?.linkBwGBs ?? kvCacheConfig.ddrBWGBs;
  const kvCacheConfigEffective: KvCacheConfig = useMemo(
    () => ({ ...kvCacheConfig, ddrBWGBs: kvInterconnectLinkBwGBs, flashBWGBs: kvInterconnectLinkBwGBs }),
    [kvCacheConfig, kvInterconnectLinkBwGBs],
  );
  const [combos, setCombos] = useState<(WhatIfCombo | null)[]>(DEFAULT_WHAT_IF_COMBOS);
  const [section, setSection] = useState<Section>("prefill");
  const [revealedSteps, setRevealedSteps] = useState<Set<PrefillStep>>(new Set([1]));
  const [highlightedRow, setHighlightedRow] = useState<PrefillRowKey | null>(null);
  const [highlightedTpRow, setHighlightedTpRow] = useState<TpRowKey | null>(null);
  const [highlightedDecodeRow, setHighlightedDecodeRow] = useState<DecodeRowKey | null>(null);
  const [highlightedKvCacheRow, setHighlightedKvCacheRow] = useState<KvCacheRowKey | null>(null);
  const [hoveredAbbrevs, setHoveredAbbrevs] = useState<Set<string> | null>(null);

  const chip = COMPARISON_CHIPS.find(c => c.id === siliconId);

  /** Edits one field of a slot's combo, creating it (from the page's current silicon/TP/
   *  interconnect as a starting point) the first time a slot goes from empty to configured. */
  function updateComboField<K extends keyof WhatIfCombo>(slot: number, field: K, value: WhatIfCombo[K]) {
    setCombos(prev => prev.map((c, i) => {
      if (i !== slot) return c;
      const base: WhatIfCombo = c ?? { siliconId, tpDegree: tpConfig.tpDegree, interconnectId: tpConfig.interconnectId };
      return { ...base, [field]: value };
    }));
  }
  function applyCombo(slot: number) {
    const c = combos[slot];
    if (!c) return;
    setSiliconId(c.siliconId);
    setTpConfig(prev => ({ ...prev, tpDegree: c.tpDegree, interconnectId: c.interconnectId }));
  }
  function clearCombo(slot: number) {
    setCombos(prev => prev.map((c, i) => (i === slot ? null : c)));
  }

  const exportHandler = useCallback(async () => {
    const scenarios: ExportScenario[] = [
      { name: "Current", siliconId, tpDegree: tpConfig.tpDegree, interconnectId: tpConfig.interconnectId },
      ...combos
        .map((c, i) => (c ? { name: `Combo ${i + 1} — ${COMPARISON_CHIPS.find(chip => chip.id === c.siliconId)?.name ?? c.siliconId}`, siliconId: c.siliconId, tpDegree: c.tpDegree, interconnectId: c.interconnectId } : null))
        .filter((s): s is ExportScenario => s != null),
    ];
    await exportDeepAnalysisToExcel(arch, usecase, deltaNetConfig, kvCacheConfigEffective, tpConfig, scenarios);
  }, [arch, usecase, deltaNetConfig, kvCacheConfigEffective, siliconId, tpConfig, combos]);
  useRegisterExport(exportHandler, "Export Deep Analysis to Excel");

  const rowActive = section === "prefill" ? highlightedRow : null;
  const tpRowActive = section === "prefill" ? highlightedTpRow : null;
  const decodeRowActive = section === "decode" ? highlightedDecodeRow : null;
  const kvCacheRowActive = section === "kv-cache" ? highlightedKvCacheRow : null;
  const tpHighlights = tpRowActive ? TP_ROW_HIGHLIGHTS[tpRowActive] : null;
  const decodeHighlights = decodeRowActive ? DECODE_ROW_HIGHLIGHTS[decodeRowActive] : null;
  const kvCacheHighlights = kvCacheRowActive ? KV_CACHE_ROW_HIGHLIGHTS[kvCacheRowActive] : null;

  const clickHighlightedAbbrevs = rowActive || tpHighlights?.archAbbrevs || decodeHighlights?.archAbbrevs || kvCacheHighlights?.archAbbrevs
    ? new Set([
        ...(rowActive ? getPrefillRowSymbols(arch, rowActive) : []),
        ...(tpHighlights?.archAbbrevs ?? []),
        ...(decodeHighlights?.archAbbrevs ?? []),
        ...(kvCacheHighlights?.archAbbrevs ?? []),
      ])
    : null;
  // Hovering the architecture diagram takes priority over a clicked row's highlight — it's a
  // more immediate, transient signal than whatever row happened to be clicked last.
  const highlightedAbbrevs = hoveredAbbrevs ?? clickHighlightedAbbrevs;
  const highlightedUsecaseFields = rowActive || tpHighlights?.usecaseFields || decodeHighlights?.usecaseFields || kvCacheHighlights?.usecaseFields
    ? new Set([
        ...(rowActive ? PREFILL_ROW_USECASE_FIELDS[rowActive] : []),
        ...(tpHighlights?.usecaseFields ?? []),
        ...(decodeHighlights?.usecaseFields ?? []),
        ...(kvCacheHighlights?.usecaseFields ?? []),
      ])
    : null;
  const highlightSiliconPeak =
    (rowActive ? PREFILL_ROW_USES_SILICON_PEAK[rowActive] : false) ||
    (tpHighlights?.siliconPeak ?? false) ||
    (decodeHighlights?.siliconPeak ?? false);
  const highlightSiliconBandwidth = decodeHighlights?.siliconBandwidth ?? false;
  const highlightSiliconCapacity = kvCacheHighlights?.siliconCapacity ?? false;
  const highlightedInterconnectFields = tpHighlights?.interconnectFields || decodeHighlights?.interconnectFields
    ? new Set([...(tpHighlights?.interconnectFields ?? []), ...(decodeHighlights?.interconnectFields ?? [])])
    : null;

  /** Clicking the next step in order builds on what's already revealed (the "story"); clicking
   *  anything else — a step already reached, or one out of order — breaks the sequence and
   *  shows only that step. */
  function revealStep(step: PrefillStep) {
    setRevealedSteps(prev => {
      // Continuing right after the highest step reached so far builds on the story; anything
      // else — including re-clicking an earlier step that's already shown — breaks it and
      // shows only the step just clicked.
      const maxRevealed = Math.max(...prev);
      return step === maxRevealed + 1 ? new Set([...prev, step]) : new Set([step]);
    });
  }

  const show1 = revealedSteps.has(1);
  const show2 = revealedSteps.has(2);
  const show3 = revealedSteps.has(3);
  const show4 = revealedSteps.has(4);
  const show5 = revealedSteps.has(5);
  /** Whether this model has a labeled architecture diagram on file — a static asset drawn per
   *  model. When it's revealed (step 1), it's always shown the same way (full-width, diagram
   *  beside the panel) regardless of which other steps join it, so the layout never has to
   *  resize/reflow other steps as you click through the story. */
  const hasArchitectureDiagram = arch.id in ARCHITECTURE_DIAGRAMS;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-12">
      <div className="mb-6 flex items-center gap-3">
        <label className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Model</label>
        <select
          value={modelId} onChange={e => setModelId(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none"
          style={{ ...selectStyle(isDark), width: "14rem" }}
        >
          {MODEL_CATALOG.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Deep Analysis section">
        {SECTIONS.map(s => {
          const active = section === s.key;
          return (
            <label
              key={s.key}
              className="cursor-pointer select-none rounded-lg px-4 py-2 text-sm font-semibold transition-colors border"
              style={{
                background: active ? "rgba(34,211,238,0.12)" : "var(--dm-surface-a)",
                borderColor: active ? "#22d3ee" : "var(--dm-border-a)",
                color: active ? "#22d3ee" : "var(--dm-txt-secondary)",
              }}
            >
              <input
                type="radio" name="deep-analysis-section" value={s.key} checked={active}
                onChange={() => setSection(s.key)}
                className="sr-only"
              />
              {s.label}
            </label>
          );
        })}
      </div>

      {section === "prefill" && (
        <div className="flex items-center gap-2 mb-6 flex-wrap" role="group" aria-label="Prefill reveal step">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Reveal step</span>
          {PREFILL_STEPS.map(s => {
            const active = revealedSteps.has(s.step);
            return (
              <button
                key={s.step} type="button" onClick={() => revealStep(s.step)}
                title={s.label} aria-pressed={active}
                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors border flex-shrink-0"
                style={{
                  background: active ? "rgba(34,211,238,0.15)" : "var(--dm-surface-a)",
                  borderColor: active ? "#22d3ee" : "var(--dm-border-a)",
                  color: active ? "#22d3ee" : "var(--dm-txt-secondary)",
                }}
              >
                {s.step}
              </button>
            );
          })}
          <span className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
            {PREFILL_STEPS.filter(s => revealedSteps.has(s.step)).map(s => s.label).join(" + ")}
          </span>
        </div>
      )}

      {section === "prefill" ? (() => {
        // The diagram is only worth showing early in the story (steps 1-2), and lives in the
        // main content column — the same column the Prefill TFLOPS / Prefill-TP cards occupy —
        // rather than its own full-width row above everything. That keeps the rail (Architecture
        // panel + Use Case/Silicon/Interconnect) sticky at a FIXED position on the right at all
        // times, exactly like Decode/KV-Cache/Analysis: nothing above it ever pushes it down.
        const showDiagram = show1 && hasArchitectureDiagram && revealedSteps.size <= 2;

        return (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              {showDiagram && <ArchitectureDiagram arch={arch} onHoverAbbrevs={setHoveredAbbrevs} />}
              {show3 && (
                <PrefillSection arch={arch} usecase={usecase} deltaCfg={deltaNetConfig} chip={chip} highlightedRow={highlightedRow} onSelectRow={setHighlightedRow} />
              )}
              {show5 && (
                <PrefillTpCard
                  arch={arch} usecase={usecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                  deltaCfg={deltaNetConfig} onChangeDeltaCfg={setDeltaNetConfig}
                  highlightedRow={highlightedTpRow} onSelectRow={setHighlightedTpRow}
                />
              )}
            </div>

            {(show1 || show2 || show4) && (
              <div className="w-full lg:w-[680px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
                <div className="flex flex-col sm:flex-row gap-6">
                  {show1 && (
                    <div className="sm:w-[300px] flex-shrink-0">
                      <ArchitecturePanel arch={arch} highlighted={highlightedAbbrevs} />
                    </div>
                  )}
                  {(show2 || show4) && (
                    <div className="flex-1 min-w-0 flex flex-col gap-6">
                      {show2 && (
                        <>
                          <UsecasePanel usecase={usecase} onChange={setUsecase} highlightedFields={highlightedUsecaseFields} />
                          <SiliconPanel chip={chip} onChange={handleSiliconChange} highlightPeak={highlightSiliconPeak} highlightBandwidth={highlightSiliconBandwidth} highlightCapacity={highlightSiliconCapacity} />
                          <MemoryPanel tp={tpConfig} />
                        </>
                      )}
                      {show4 && <InterconnectPanel tp={tpConfig} onChange={setTpConfig} highlighted={highlightedInterconnectFields} />}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0">
            {section === "architecture" ? (
              <ArchitectureSection />
            ) : section === "decode" ? (
              <DecodeSection
                arch={arch} usecase={usecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                highlightedRow={highlightedDecodeRow} onSelectRow={setHighlightedDecodeRow}
              />
            ) : section === "kv-cache" ? (
              <KvCacheSection
                arch={arch} usecase={usecase} onChangeUsecase={setUsecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                kv={kvCacheConfigEffective} onChangeKv={setKvCacheConfig}
                highlightedRow={highlightedKvCacheRow} onSelectRow={setHighlightedKvCacheRow}
              />
            ) : section === "analysis" ? (
              <AnalysisSection
                arch={arch} usecase={usecase} chip={chip} tp={tpConfig} deltaCfg={deltaNetConfig} kv={kvCacheConfigEffective}
                siliconId={siliconId} isDark={isDark} combos={combos}
                onUpdateComboField={updateComboField} onApplyCombo={applyCombo} onClearCombo={clearCombo}
              />
            ) : (
              <ComingSoonSection title={SECTIONS.find(s => s.key === section)!.label} blurb={COMING_SOON_BLURB[section as Exclude<Section, "architecture" | "prefill" | "decode" | "kv-cache" | "analysis">]} />
            )}
          </div>

          <div className="w-full lg:w-[680px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-[300px] flex-shrink-0">
                <ArchitecturePanel arch={arch} highlighted={highlightedAbbrevs} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <UsecasePanel usecase={usecase} onChange={setUsecase} highlightedFields={highlightedUsecaseFields} />
                <SiliconPanel chip={chip} onChange={handleSiliconChange} highlightPeak={highlightSiliconPeak} highlightBandwidth={highlightSiliconBandwidth} highlightCapacity={highlightSiliconCapacity} />
                <MemoryPanel tp={tpConfig} />
                <InterconnectPanel tp={tpConfig} onChange={setTpConfig} highlighted={highlightedInterconnectFields} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
