"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { COMPARISON_CHIPS, type ComparisonChip } from "@/modules/silicon/comparison-data";
import { StackedAreaChart, type StackedAreaSeries } from "./AnalysisChart";
import {
  ABBR, TFLOPS, MODEL_CATALOG, DEFAULT_MODEL_ID, getModelArchitecture,
  DEFAULT_USECASE_INPUTS, WEIGHT_DTYPE_OPTIONS, KV_DTYPE_OPTIONS,
  getPrefillRowSymbols, PREFILL_ROW_USECASE_FIELDS, PREFILL_ROW_USES_SILICON_PEAK,
  DEFAULT_DELTANET_PREFILL_CONFIG,
  INTERCONNECTS, DEFAULT_TP_CONFIG, TP_ROW_HIGHLIGHTS, DECODE_ROW_HIGHLIGHTS,
  DEFAULT_KV_CACHE_CONFIG, KV_CACHE_ROW_HIGHLIGHTS,
  getSiliconPeak, getSiliconMemoryBandwidthGBs, getSiliconMemoryCapacityGB,
  calcPrefill, calcPrefillTp, calcPrefillTpSweep, calcDecode, calcKvCacheBaseline, calcKvCacheAtContext, calcKvCacheSweep,
  calcAnalysisSweep,
  updateUsecaseField, resetDecodeContextToAuto,
  type UsecaseInputs, type PrefillRowKey, type TpConfig, type TpRowKey, type DecodeRowKey,
  type KvCacheConfig, type KvCacheRowKey, type ModelArchitecture, type DeltaNetPrefillConfig,
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

// ── Silicon panel (selector — pulls specs from the Silicon module, doesn't redefine them) ──

function SiliconPanel({ chip, onChange, highlightPeak, highlightBandwidth, highlightCapacity }: {
  chip: ComparisonChip | undefined; onChange: (id: string) => void;
  highlightPeak: boolean; highlightBandwidth: boolean; highlightCapacity: boolean;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const peak = chip ? getSiliconPeak(chip) : null;

  return (
    <CompactPanel title="Silicon" subtitle="Pulled from the Silicon page's own comparison data — not re-entered here.">
      <CompactRow label="Selected silicon" index={0}>
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
        <p className="text-xs px-3 py-2" style={{ color: "var(--dm-txt-faint)" }}>No silicon selected — pick one above to drive the Prefill/Decode estimates.</p>
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
    src: "/Qwen3.8-27B_labeled_architecture.svg",
    width: 1560, height: 1600,
    alt: "Qwen3.8-27B labeled architecture diagram — token embedding through Gated DeltaNet / Gated Attention hybrid layers to output logits, with every dimension and parameter abbreviation labeled",
    caption: "Layout after Sebastian Raschka. Abbreviations match the Architecture panel and every formula elsewhere in this tab.",
  },
  "gemma4-31b": {
    src: "/gemma4-31B.png",
    width: 730, height: 719,
    alt: "Gemma4-31B labeled architecture diagram — 60 layers at a 5:1 local (sliding-window) to global (full-attention) ratio, with embedding/intermediate dimensions and head counts labeled",
    caption: "Layout after Sebastian Raschka. 5:1 local:global ratio — local layers use 32 Q / 16 KV heads, global layers use 32 Q / 4 KV heads, matching the Architecture panel.",
  },
};

function ArchitectureDiagram({ arch }: { arch: ModelArchitecture }) {
  const diagram = ARCHITECTURE_DIAGRAMS[arch.id];
  if (!diagram) return null;
  return (
    <div
      className="rounded-2xl border border-[var(--dm-border-a)] overflow-hidden"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold text-[var(--dm-txt-primary)]">{arch.name} — Labeled Architecture</h2>
        <p className="mt-0.5 text-[11px] text-[var(--dm-txt-muted)] leading-snug">{diagram.caption}</p>
      </div>
      <div className="p-3" style={{ background: "#f8fafc" }}>
        <Image
          src={diagram.src}
          alt={diagram.alt}
          width={diagram.width} height={diagram.height}
          className="w-full h-auto rounded-lg"
        />
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

// ── Prefill section ──────────────────────────────────────────────────────────────────────

function PrefillSection({ arch, usecase, deltaCfg, chip, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; deltaCfg: DeltaNetPrefillConfig; chip: ComparisonChip | undefined;
  highlightedRow: PrefillRowKey | null; onSelectRow: (key: PrefillRowKey | null) => void;
}) {
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
  const isDeltaNet = arch.secondary?.kind === "deltaNet";
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
    { key: "perGpu", label: `Per-GPU GEMM compute time (TP=${tp.tpDegree})`, formula: "(GEMM FLOPs ÷ TP) ÷ (P_peak × eff_mfu)", value: result.perGpuComputeTimeSec != null ? `${result.perGpuComputeTimeSec.toFixed(4)} s` : "—", final: true },
    ...(isDeltaNet ? [
      { key: "deltaCompute" as TpRowKey, label: `Per-GPU delta compute (TP=${tp.tpDegree})`, formula: "(Delta FLOPs ÷ TP) ÷ delta_TFLOPs", value: `${result.perGpuDeltaComputeTimeSec.toFixed(4)} s`, final: true },
      { key: "deltaFixedOverhead" as TpRowKey, label: "Delta fixed overhead", formula: "chunks × n_dn × overhead_µs ÷ 1e6", value: `${result.deltaFixedOverheadSec.toFixed(4)} s` },
    ] : []),
  ];
  const commRows: TpTableRow[] = [
    { key: "msgSize", label: "All-reduce message size", formula: `${ABBR.B} × ${ABBR.L} × ${ABBR.d_model} × act_bytes ÷ 1e9`, value: `${result.allReduceMsgGB.toFixed(4)} GB` },
    { key: "numAllReduces", label: "Number of all-reduces", formula: `k_coll × ${ABBR.n_layers}`, value: fmtInt(result.numAllReduces) },
    { key: "bwTerm", label: "Bandwidth term (per all-reduce)", formula: "2×(TP−1)/TP × msg_GB ÷ (link_BW × comm_eff)", value: `${result.bwTermSec.toFixed(6)} s` },
    { key: "commTime", label: `Communication time (Σ ${result.numAllReduces} all-reduces)`, formula: "n_allreduce × bw_term", value: result.commTimeSec != null ? `${result.commTimeSec.toFixed(4)} s` : "—", final: true },
  ];

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

// ── KV Cache — capacity & eviction model ────────────────────────────────────────────────
// Ported from kv_capacity_eviction_model.xlsx: how many concurrent requests' KV cache fits in
// VRAM after weights + reserve, and whether evicting a resident request to an offload tier
// beats recomputing it from scratch on resume. "Cards" reuses the same TP degree as
// Prefill-TP/Decode; the reserve fraction and per-tier bandwidths are new, KV-Cache-only inputs.

function KvCacheSection({ arch, usecase, chip, tp, onChangeTp, kv, onChangeKv, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; chip: ComparisonChip | undefined; tp: TpConfig; onChangeTp: (next: TpConfig) => void;
  kv: KvCacheConfig; onChangeKv: (next: KvCacheConfig) => void;
  highlightedRow: KvCacheRowKey | null; onSelectRow: (key: KvCacheRowKey | null) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const vramPerCardGB = chip ? getSiliconMemoryCapacityGB(chip) : null;
  const baseline = useMemo(
    () => calcKvCacheBaseline(arch, usecase, tp, kv, vramPerCardGB),
    [arch, usecase, tp, kv, vramPerCardGB],
  );
  const current = useMemo(
    () => calcKvCacheAtContext(arch, usecase, tp, baseline, usecase.decodeContextLen, peak?.teraflops ?? null),
    [arch, usecase, tp, baseline, peak?.teraflops],
  );
  const sweep = useMemo(
    () => calcKvCacheSweep(arch, usecase, tp, baseline, peak?.teraflops ?? null),
    [arch, usecase, tp, baseline, peak?.teraflops],
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

  const rowHighlights = highlightedRow ? KV_CACHE_ROW_HIGHLIGHTS[highlightedRow] : null;
  const localLit = (field: keyof TpConfig): boolean => field === "tpDegree" && !!rowHighlights?.tpDegreeField;
  const kvConfigLit = (field: keyof KvCacheConfig): boolean => !!rowHighlights?.kvConfigFields?.includes(field);
  const smallNumberInput = "rounded-lg px-2.5 py-1.5 text-sm focus:outline-none w-24";
  const glowWrap = (lit: boolean, rgb: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: "0.5rem", transition: "box-shadow 200ms",
    boxShadow: lit ? `0 0 0 1px rgb(${rgb}), 0 0 8px rgba(${rgb},0.5)` : "none",
  });

  type Row = { key: KvCacheRowKey; label: string; formula: string; value: string; color?: "orange" };
  const rows: Row[] = [
    { key: "kvPerToken", label: "KV per token", formula: `2 × ${ABBR.n_fa} × ${ABBR.n_kv} × ${ABBR.d_head} × kv_bytes`, value: `${fmtInt(baseline.kvPerTokenBytes)} bytes` },
    { key: "weights", label: "Weights", formula: `${ABBR.N} × bytes_per_param`, value: `${baseline.weightsGB.toFixed(1)} GB` },
    { key: "vramTotal", label: "VRAM total", formula: "cards × VRAM_card", value: `${fmtInt(baseline.vramTotalGB)} GB`, color: "orange" },
    { key: "reserve", label: "Reserve", formula: "VRAM_total × reserve%", value: `${baseline.reserveGB.toFixed(1)} GB`, color: "orange" },
    { key: "kvBudget", label: "KV budget", formula: "VRAM_total − weights − reserve", value: `${baseline.kvBudgetGB.toFixed(1)} GB`, color: "orange" },
    { key: "minCardsForWeights", label: "Min cards for weights", formula: "⌈ weights ÷ VRAM_card ⌉", value: baseline.minCardsForWeights > 0 ? `${fmtInt(baseline.minCardsForWeights)} cards` : "—", color: "orange" },
    { key: "ddrEgress", label: "DDR egress (aggregate)", formula: "ddr_per_card × cards", value: `${fmtInt(baseline.ddrEgressAggGBs)} GB/s`, color: "orange" },
    { key: "cxlEgress", label: "CXL egress (aggregate)", formula: "cxl_per_card × cards", value: `${fmtInt(baseline.cxlEgressAggGBs)} GB/s`, color: "orange" },
    { key: "flashEgress", label: "Flash egress (aggregate)", formula: "flash_per_card × cards", value: `${fmtInt(baseline.flashEgressAggGBs)} GB/s`, color: "orange" },
  ];

  return (
    <SectionCard
      title="KV Cache — Capacity & Eviction"
      subtitle="How many concurrent requests' KV cache fits in VRAM after weights + reserve, and whether evicting to an offload tier beats recomputing on resume. Click a row to light up the parameters it uses — memory/VRAM dependencies light up in orange."
    >
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Cards (TP group)</label>
          <div style={glowWrap(localLit("tpDegree"), "34,211,238")}>
            <input type="number" min={1} value={tp.tpDegree} onChange={e => setTp("tpDegree", Math.max(1, Number(e.target.value) || 1))} className={smallNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>Reserve %</label>
          <div style={glowWrap(kvConfigLit("reserveFraction"), MEMORY_ORANGE_RGB)}>
            <input
              type="number" min={0} max={1} step={0.01} value={kv.reserveFraction}
              onChange={e => setKv("reserveFraction", Math.min(1, Math.max(0, Number(e.target.value) || 0)))}
              className={smallNumberInput} style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>DDR GB/s · card</label>
          <div style={glowWrap(kvConfigLit("ddrBWGBs"), MEMORY_ORANGE_RGB)}>
            <input type="number" min={0} value={kv.ddrBWGBs} onChange={e => setKv("ddrBWGBs", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>CXL GB/s · card</label>
          <div style={glowWrap(kvConfigLit("cxlBWGBs"), MEMORY_ORANGE_RGB)}>
            <input type="number" min={0} value={kv.cxlBWGBs} onChange={e => setKv("cxlBWGBs", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>Flash GB/s · card</label>
          <div style={glowWrap(kvConfigLit("flashBWGBs"), MEMORY_ORANGE_RGB)}>
            <input type="number" min={0} value={kv.flashBWGBs} onChange={e => setKv("flashBWGBs", Math.max(0, Number(e.target.value) || 0))} className={smallNumberInput} style={inputStyle} />
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Component</th>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Formula</th>
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const active = highlightedRow === r.key;
              const activeColor = r.color === "orange" ? MEMORY_ORANGE : "#22d3ee";
              const activeBg = r.color === "orange" ? "rgba(251,146,60,0.16)" : "rgba(34,211,238,0.14)";
              const idleBg = i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)";
              return (
                <tr key={r.key} onClick={() => toggleRow(r.key)} className="cursor-pointer transition-colors duration-150" style={{ background: active ? activeBg : idleBg }}>
                  <td className="px-4 py-2.5" style={{ color: active ? activeColor : "var(--dm-txt-body)" }}>{r.label}</td>
                  <td className="px-4 py-2.5 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>{r.formula}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: active ? activeColor : "var(--dm-txt-body)" }}>{r.value}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>
        At the current Use Case context ({fmtInt(usecase.decodeContextLen)} tokens)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>KV / request</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{current.kvPerReqGB.toFixed(2)} GB</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Max concurrency</p>
          <p className="text-lg font-mono font-bold" style={{ color: "#22d3ee" }}>{fmtInt(current.maxConcurrency)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Recompute</p>
          <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{current.recomputeSec != null ? `${current.recomputeSec.toFixed(2)} s` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>DDR / CXL read-back</p>
          <p className="text-lg font-mono font-bold" style={{ color: MEMORY_ORANGE }}>{current.ddrMs.toFixed(2)} / {current.cxlMs.toFixed(2)} ms</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: MEMORY_ORANGE }}>Flash read-back</p>
          <p className="text-lg font-mono font-bold" style={{ color: MEMORY_ORANGE }}>{current.flashMs.toFixed(2)} ms</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Context</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>KV / req (GB)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Max concurrency</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Recompute (s)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: MEMORY_ORANGE }}>DDR ↔ (ms)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: MEMORY_ORANGE }}>CXL ↔ (ms)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: MEMORY_ORANGE }}>Flash ↔ (ms)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Recompute ÷ flash</th>
            </tr>
          </thead>
          <tbody>
            {sweep.map((row, i) => (
              <tr key={row.contextTokens} style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                <td className="px-3 py-1.5 font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{fmtInt(row.contextTokens / 1000)}K</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.kvPerReqGB.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{fmtInt(row.maxConcurrency)}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.recomputeSec != null ? row.recomputeSec.toFixed(2) : "—"}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.ddrMs.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.cxlMs.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.flashMs.toFixed(1)}</td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.recomputeOverFlash != null ? `${fmtInt(row.recomputeOverFlash)}×` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail for VRAM capacity, KV budget, and recompute time.</p>}

      <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
        Read-back beats recompute at every context here — re-prefilling this model is roughly two
        orders of magnitude slower per token than reading its KV cache back from any offload tier.
        So the real eviction decision is which tier to use, not whether to recompute; tier choice
        is set by aggregate egress bandwidth under concurrent eviction.
      </p>
    </SectionCard>
  );
}

// ── Analysis — cross-stage time breakdown swept across concurrency ─────────────────────
// Level 1: Prefill / Decode / KV-Cache (+ Routing, greyed out — not yet modeled) stacked by
// total time at each concurrency. Click a band to drill into Level 2: that stage's Compute /
// Memory / Interconnect split. Click Prefill's Compute to drill into Level 3: FFN / Attention
// / DeltaNet. Stage colors are deliberately distinct from the Compute=cyan/Memory=orange/
// Interconnect=green convention used one level down, so the two levels never look like the same axis.

type AnalysisStageKey = "prefill" | "decode" | "kvCache";

const STAGE_COLORS: Record<AnalysisStageKey, string> = {
  prefill: "#818cf8",   // indigo
  decode: "#f472b6",    // pink
  kvCache: "#fbbf24",   // amber
};
const STAGE_LABELS: Record<AnalysisStageKey, string> = { prefill: "Prefill", decode: "Decode", kvCache: "KV Cache" };
const FFN_CYAN = "#67e8f9";
const ATTENTION_CYAN = "#22d3ee";
const DELTANET_CYAN = "#0e7490";

function AnalysisSection({ arch, usecase, chip, tp, deltaCfg, kv }: {
  arch: ModelArchitecture; usecase: UsecaseInputs; chip: ComparisonChip | undefined;
  tp: TpConfig; deltaCfg: DeltaNetPrefillConfig; kv: KvCacheConfig;
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
      { key: "kvCache", label: "KV Cache", color: STAGE_COLORS.kvCache, values: sweep.map(p => p.kvCache.totalMs), onClick: () => goToStage("kvCache") },
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

  return (
    <SectionCard
      title="Analysis"
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
    </SectionCard>
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

type Section = "prefill" | "decode" | "kv-cache" | "routing" | "persistent-memory" | "analysis";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "prefill", label: "Prefill" },
  { key: "decode", label: "Decode" },
  { key: "kv-cache", label: "KV Cache" },
  { key: "routing", label: "Routing" },
  { key: "persistent-memory", label: "Persistent Memory" },
  { key: "analysis", label: "Analysis" },
];

const COMING_SOON_BLURB: Record<Exclude<Section, "prefill" | "decode" | "kv-cache" | "analysis">, string> = {
  "routing": "Reserved for MoE expert-routing overhead once a routed model is added — Qwen3.8-27B is dense, so this section doesn't apply to it yet.",
  "persistent-memory": "Constant, concurrency-independent memory — model weights, in GiB — plus GPU capacity fit-checks, from the VRAM Calculation sheet.",
};

type PrefillStep = 1 | 2 | 3 | 4 | 5;

const PREFILL_STEPS: { step: PrefillStep; label: string }[] = [
  { step: 1, label: "Architecture" },
  { step: 2, label: "Use Case & Silicon" },
  { step: 3, label: "Prefill TFLOPS" },
  { step: 4, label: "Interconnect" },
  { step: 5, label: "Prefill under Tensor Parallelism" },
];

export function DeepAnalysisView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const arch = getModelArchitecture(modelId);
  const [usecase, setUsecase] = useState<UsecaseInputs>(DEFAULT_USECASE_INPUTS);
  const [siliconId, setSiliconId] = useState<string>("b70");
  const [tpConfig, setTpConfig] = useState<TpConfig>(DEFAULT_TP_CONFIG);
  const [deltaNetConfig, setDeltaNetConfig] = useState<DeltaNetPrefillConfig>(DEFAULT_DELTANET_PREFILL_CONFIG);
  const [kvCacheConfig, setKvCacheConfig] = useState<KvCacheConfig>(DEFAULT_KV_CACHE_CONFIG);
  const [section, setSection] = useState<Section>("prefill");
  const [revealedSteps, setRevealedSteps] = useState<Set<PrefillStep>>(new Set([1]));
  const [highlightedRow, setHighlightedRow] = useState<PrefillRowKey | null>(null);
  const [highlightedTpRow, setHighlightedTpRow] = useState<TpRowKey | null>(null);
  const [highlightedDecodeRow, setHighlightedDecodeRow] = useState<DecodeRowKey | null>(null);
  const [highlightedKvCacheRow, setHighlightedKvCacheRow] = useState<KvCacheRowKey | null>(null);

  const chip = COMPARISON_CHIPS.find(c => c.id === siliconId);
  const rowActive = section === "prefill" ? highlightedRow : null;
  const tpRowActive = section === "prefill" ? highlightedTpRow : null;
  const decodeRowActive = section === "decode" ? highlightedDecodeRow : null;
  const kvCacheRowActive = section === "kv-cache" ? highlightedKvCacheRow : null;
  const tpHighlights = tpRowActive ? TP_ROW_HIGHLIGHTS[tpRowActive] : null;
  const decodeHighlights = decodeRowActive ? DECODE_ROW_HIGHLIGHTS[decodeRowActive] : null;
  const kvCacheHighlights = kvCacheRowActive ? KV_CACHE_ROW_HIGHLIGHTS[kvCacheRowActive] : null;

  const highlightedAbbrevs = rowActive || tpHighlights?.archAbbrevs || decodeHighlights?.archAbbrevs || kvCacheHighlights?.archAbbrevs
    ? new Set([
        ...(rowActive ? getPrefillRowSymbols(arch, rowActive) : []),
        ...(tpHighlights?.archAbbrevs ?? []),
        ...(decodeHighlights?.archAbbrevs ?? []),
        ...(kvCacheHighlights?.archAbbrevs ?? []),
      ])
    : null;
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
  /** The labeled architecture diagram is a lot of screen real estate — only worth it when
   *  step 1 is the sole thing revealed. As soon as anything else joins the story, drop it and
   *  keep just the compact Architecture panel (still needed for click-to-highlight). It's also
   *  a static asset drawn per model, so it only applies where one's on file. */
  const showArchitectureDiagram = show1 && revealedSteps.size === 1 && arch.id in ARCHITECTURE_DIAGRAMS;

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

      {section === "prefill" ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {(show3 || show5) && (
            <div className="flex-1 min-w-0 flex flex-col gap-6">
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
          )}
          {(show1 || show2 || show4) && (
            <div className={showArchitectureDiagram ? "w-full flex flex-col gap-6" : "w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start"}>
              {show1 && (
                showArchitectureDiagram ? (
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex-1 min-w-0">
                      <ArchitectureDiagram arch={arch} />
                    </div>
                    <div className="w-full md:w-[340px] flex-shrink-0 md:sticky md:top-6 md:self-start">
                      <ArchitecturePanel arch={arch} highlighted={highlightedAbbrevs} />
                    </div>
                  </div>
                ) : (
                  <ArchitecturePanel arch={arch} highlighted={highlightedAbbrevs} />
                )
              )}
              {show2 && (
                <>
                  <UsecasePanel usecase={usecase} onChange={setUsecase} highlightedFields={highlightedUsecaseFields} />
                  <SiliconPanel chip={chip} onChange={setSiliconId} highlightPeak={highlightSiliconPeak} highlightBandwidth={highlightSiliconBandwidth} highlightCapacity={highlightSiliconCapacity} />
                </>
              )}
              {show4 && <InterconnectPanel tp={tpConfig} onChange={setTpConfig} highlighted={highlightedInterconnectFields} />}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0">
            {section === "decode" ? (
              <DecodeSection
                arch={arch} usecase={usecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                highlightedRow={highlightedDecodeRow} onSelectRow={setHighlightedDecodeRow}
              />
            ) : section === "kv-cache" ? (
              <KvCacheSection
                arch={arch} usecase={usecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                kv={kvCacheConfig} onChangeKv={setKvCacheConfig}
                highlightedRow={highlightedKvCacheRow} onSelectRow={setHighlightedKvCacheRow}
              />
            ) : section === "analysis" ? (
              <AnalysisSection arch={arch} usecase={usecase} chip={chip} tp={tpConfig} deltaCfg={deltaNetConfig} kv={kvCacheConfig} />
            ) : (
              <ComingSoonSection title={SECTIONS.find(s => s.key === section)!.label} blurb={COMING_SOON_BLURB[section as Exclude<Section, "prefill" | "decode" | "kv-cache" | "analysis">]} />
            )}
          </div>

          <div className="w-full lg:w-[680px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-[300px] flex-shrink-0">
                <ArchitecturePanel arch={arch} highlighted={highlightedAbbrevs} />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <UsecasePanel usecase={usecase} onChange={setUsecase} highlightedFields={highlightedUsecaseFields} />
                <SiliconPanel chip={chip} onChange={setSiliconId} highlightPeak={highlightSiliconPeak} highlightBandwidth={highlightSiliconBandwidth} highlightCapacity={highlightSiliconCapacity} />
                <InterconnectPanel tp={tpConfig} onChange={setTpConfig} highlighted={highlightedInterconnectFields} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
