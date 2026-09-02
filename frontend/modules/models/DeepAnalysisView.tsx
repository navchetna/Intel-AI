"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { COMPARISON_CHIPS, type ComparisonChip } from "@/modules/silicon/comparison-data";
import {
  ABBR, QWEN_3_8_27B, DEFAULT_USECASE_INPUTS, WEIGHT_DTYPE_OPTIONS, KV_DTYPE_OPTIONS,
  PREFILL_ROW_SYMBOLS, PREFILL_ROW_USECASE_FIELDS, PREFILL_ROW_USES_SILICON_PEAK,
  INTERCONNECTS, DEFAULT_TP_CONFIG, TP_ROW_HIGHLIGHTS,
  getSiliconPeak, calcPrefill, calcPrefillTp, calcPrefillTpSweep, updateUsecaseField, resetDecodeContextToAuto,
  type UsecaseInputs, type PrefillRowKey, type TpConfig, type TpRowKey,
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
      field: "overheadFraction", label: "Overhead fraction", hint: "Activation / runtime overhead — CUDA graphs, workspace buffers, block tables",
      control: <input type="number" min={0} max={1} step={0.01} value={usecase.overheadFraction} onChange={e => set("overheadFraction", Math.min(1, Math.max(0, Number(e.target.value) || 0)))} className={compactNumberInput} style={compactInputStyle} />,
    },
    {
      field: "achievableEfficiency", label: "Compute efficiency", hint: "Fraction of peak TFLOPS real kernels realistically achieve",
      control: <input type="number" min={0} max={1} step={0.01} value={usecase.achievableEfficiency} onChange={e => set("achievableEfficiency", Math.min(1, Math.max(0, Number(e.target.value) || 0)))} className={compactNumberInput} style={compactInputStyle} />,
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

function SiliconPanel({ chip, onChange, highlightPeak }: {
  chip: ComparisonChip | undefined; onChange: (id: string) => void; highlightPeak: boolean;
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
          <CompactRow label="Memory bandwidth" index={3}>
            <span className="text-xs font-mono" style={{ color: "var(--dm-txt-body)" }}>{chip.memory.bandwidth}</span>
          </CompactRow>
          <CompactRow label="Memory capacity" index={4} hint={chip.sourceNote}>
            <span className="text-xs font-mono" style={{ color: "var(--dm-txt-body)" }}>{chip.memory.capacity}</span>
          </CompactRow>
        </>
      )}
    </CompactPanel>
  );
}

// ── Interconnect panel (selector — drives Prefill-TP's communication cost) ─────────────
// First cut: this table is deliberately minimal (selection + the four specs Prefill-TP
// actually reads). Everything in it renders in green — the interconnect color — to keep it
// visually distinct from the cyan compute panels above.

function InterconnectPanel({ tp, onChange, highlighted }: {
  tp: TpConfig; onChange: (next: TpConfig) => void; highlighted: Set<"linkBw" | "latency"> | null;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  return (
    <CompactPanel title="Interconnect" subtitle="Drives tensor-parallel communication cost — used by Prefill-TP." accent={INTERCONNECT_GREEN}>
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
          <CompactRow label="Link bandwidth" index={1} lit={highlighted?.has("linkBw") ?? false} litRgb={INTERCONNECT_GREEN_RGB}>
            <span className="text-xs font-mono font-semibold" style={{ color: INTERCONNECT_GREEN }}>{fmtInt(link.linkBwGBs)} GB/s</span>
          </CompactRow>
          <CompactRow label="Latency / hop" index={2} lit={highlighted?.has("latency") ?? false} litRgb={INTERCONNECT_GREEN_RGB}>
            <span className="text-xs font-mono font-semibold" style={{ color: INTERCONNECT_GREEN }}>{link.latencyUsPerHop} µs</span>
          </CompactRow>
          <CompactRow label="Fabric type" index={3} hint={link.notes}>
            <span className="text-xs" style={{ color: "var(--dm-txt-body)" }}>{link.fabricType}</span>
          </CompactRow>
        </>
      )}
    </CompactPanel>
  );
}

// ── Architecture panel — always visible, pinned to the right of every section ──────────

interface ArchRow { label: string; abbrev: string; value: string; note?: string }

function ArchitecturePanel({ highlighted }: { highlighted: Set<string> | null }) {
  const a = QWEN_3_8_27B;
  const rows: ArchRow[] = [
    { label: "Total parameters", abbrev: ABBR.N, value: `${a.totalParamsB}B`, note: "Dense (non-MoE), BF16 safetensors" },
    { label: "Total layers", abbrev: ABBR.n_layers, value: fmtInt(a.totalLayers), note: "16 × (3× Gated DeltaNet + 1× Gated Attention)" },
    { label: "Full-attention layers", abbrev: ABBR.n_fa, value: fmtInt(a.fullAttnLayers), note: "1 of every 4 layers" },
    { label: "Gated DeltaNet layers", abbrev: ABBR.n_dn, value: fmtInt(a.deltaNetLayers), note: "3 of every 4 layers" },
    { label: "Hidden dimension", abbrev: ABBR.d_model, value: fmtInt(a.hiddenDim) },
    { label: "FFN intermediate dimension", abbrev: ABBR.d_ffn, value: fmtInt(a.ffnIntermediateDim) },
    { label: "Vocabulary size", abbrev: ABBR.V, value: fmtInt(a.vocabSize), note: "Padded token embedding" },
    { label: "Native context length", abbrev: ABBR.L_native, value: fmtInt(a.nativeContextLen) },
    { label: "Extended context length (YaRN)", abbrev: ABBR.L_ext, value: fmtInt(a.extendedContextLen) },
    { label: "Full-attention: Q heads", abbrev: ABBR.n_q, value: fmtInt(a.fullAttn.qHeads), note: "GQA" },
    { label: "Full-attention: KV heads", abbrev: ABBR.n_kv, value: fmtInt(a.fullAttn.kvHeads), note: `GQA, ${a.fullAttn.qHeads / a.fullAttn.kvHeads}:1 Q:KV ratio` },
    { label: "Full-attention: head dimension", abbrev: ABBR.d_head, value: fmtInt(a.fullAttn.headDim) },
    { label: "Full-attention: RoPE dimension", abbrev: ABBR.d_rope, value: fmtInt(a.fullAttn.ropeDim) },
    { label: "DeltaNet: V heads", abbrev: ABBR.n_v, value: fmtInt(a.deltaNet.vHeads) },
    { label: "DeltaNet: QK heads", abbrev: ABBR.n_qk, value: fmtInt(a.deltaNet.qkHeads) },
    { label: "DeltaNet: head dimension", abbrev: ABBR.d_dn, value: fmtInt(a.deltaNet.headDim), note: "Used for both K and V dims of the recurrent state matrix — distinct from d_head above" },
    { label: "Multi-token prediction", abbrev: ABBR.MTP, value: a.multiTokenPrediction ? "Yes" : "No", note: "Not modeled in the formulas — inference-time speculative use is a separate calculation" },
    { label: "DeltaNet kernel constant", abbrev: ABBR.c, value: fmtInt(a.deltaNetKernelConstant), note: "Approximates extra matmuls in the chunked delta-rule update — kernel-dependent, validate against a profiled kernel" },
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

function PrefillSection({ usecase, chip, highlightedRow, onSelectRow }: {
  usecase: UsecaseInputs; chip: ComparisonChip | undefined;
  highlightedRow: PrefillRowKey | null; onSelectRow: (key: PrefillRowKey | null) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const result = useMemo(() => calcPrefill(QWEN_3_8_27B, usecase, peak?.teraflops ?? null), [usecase, peak?.teraflops]);

  const rows: { key: PrefillRowKey; label: string; formula: string; value: number }[] = [
    { key: "dense", label: "Dense term (all layers)", formula: `2 × ${ABBR.N} × ${ABBR.L} × ${ABBR.B}`, value: result.denseTermTflops },
    { key: "fullAttn", label: "Full-attention term — O(L²)", formula: `2 × ${ABBR.n_q} × ${ABBR.d_head} × ${ABBR.L}² × ${ABBR.B} × ${ABBR.n_fa}`, value: result.fullAttnTermTflops },
    { key: "deltaNet", label: "DeltaNet term — O(L)", formula: `${ABBR.c} × ${ABBR.n_v} × ${ABBR.d_dn}² × ${ABBR.L} × ${ABBR.B} × ${ABBR.n_dn}`, value: result.deltaNetTermTflops },
  ];

  function toggleRow(key: PrefillRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  return (
    <SectionCard
      title="Prefill TFLOPS"
      subtitle={`Prefill processes the full prompt (${ABBR.L}) in one pass across ${ABBR.B} sequences. Full-attention layers cost O(L²); DeltaNet layers cost O(L). All figures in TFLOPS. Click a row to light up the Architecture parameters it uses.`}
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
            <p className="text-lg font-mono font-bold" style={{ color: "var(--dm-txt-primary)" }}>{result.estimatedComputeTimeSec.toFixed(2)} <span className="text-xs font-normal" style={{ color: "var(--dm-txt-faint)" }}>s</span></p>
          ) : (
            <p className="text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon above</p>
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
        Assumes prefill is compute-bound (high arithmetic intensity — every weight read from HBM is reused across
        many tokens in one batched pass). Estimated compute time = Total TFLOPS ÷ (peak TFLOPS × Achievable
        efficiency). The O(L²) full-attention term is what erodes efficiency as prompt length grows.
      </p>
    </SectionCard>
  );
}

// ── Prefill under Tensor Parallelism (from the "Prefill TP" sheet) ─────────────────────
// First cut — TP degree/collective-ops/activation-dtype live here since they're specific to
// this analysis; the Interconnect itself is selected in the rail (shared, in case other
// sections need it later). Every communication-side figure renders in green.

function PrefillTpCard({ usecase, chip, tp, onChangeTp, highlightedRow, onSelectRow }: {
  usecase: UsecaseInputs; chip: ComparisonChip | undefined; tp: TpConfig; onChangeTp: (next: TpConfig) => void;
  highlightedRow: TpRowKey | null; onSelectRow: (key: TpRowKey | null) => void;
}) {
  const peak = chip ? getSiliconPeak(chip) : null;
  const prefill = useMemo(() => calcPrefill(QWEN_3_8_27B, usecase, peak?.teraflops ?? null), [usecase, peak?.teraflops]);
  const result = useMemo(
    () => calcPrefillTp(QWEN_3_8_27B, usecase, tp, peak?.teraflops ?? null, prefill.totalTflops),
    [usecase, tp, peak?.teraflops, prefill.totalTflops],
  );
  const sweep = useMemo(
    () => calcPrefillTpSweep(QWEN_3_8_27B, usecase, tp, peak?.teraflops ?? null, prefill.totalTflops),
    [usecase, tp, peak?.teraflops, prefill.totalTflops],
  );
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);

  function setTp<K extends keyof TpConfig>(key: K, value: TpConfig[K]) {
    onChangeTp({ ...tp, [key]: value });
  }

  function toggleRow(key: TpRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  const localLit = (field: keyof TpConfig): boolean =>
    !!highlightedRow && (TP_ROW_HIGHLIGHTS[highlightedRow].localFields?.includes(field) ?? false);

  const tpNumberInput = "rounded-lg px-2.5 py-1.5 text-sm focus:outline-none w-24";
  const glowWrap = (lit: boolean, rgb: string): React.CSSProperties => ({
    display: "inline-block", borderRadius: "0.5rem", transition: "box-shadow 200ms",
    boxShadow: lit ? `0 0 0 1px rgb(${rgb}), 0 0 8px rgba(${rgb},0.5)` : "none",
  });

  type TpTableRow = { key: TpRowKey; label: string; formula: string; value: string; green?: boolean };
  const rows: TpTableRow[] = [
    { key: "singleGpu", label: "Single-GPU compute time (TP=1)", formula: "Total prefill ÷ (P_peak × eff)", value: result.singleGpuTimeSec != null ? `${result.singleGpuTimeSec.toFixed(4)} s` : "—" },
    { key: "perGpu", label: `Per-GPU compute time (TP=${tp.tpDegree})`, formula: "(Total prefill ÷ TP) ÷ (P_peak × eff)", value: result.perGpuComputeTimeSec != null ? `${result.perGpuComputeTimeSec.toFixed(4)} s` : "—" },
    { key: "msgSize", label: "All-reduce message size", formula: `${ABBR.B} × ${ABBR.L} × ${ABBR.d_model} × act_bytes ÷ 1e9`, value: `${result.allReduceMsgGB.toFixed(4)} GB`, green: true },
    { key: "numAllReduces", label: "Number of all-reduces", formula: `k_coll × ${ABBR.n_layers}`, value: fmtInt(result.numAllReduces), green: true },
    { key: "bwTerm", label: "Bandwidth term (per all-reduce)", formula: "2×(TP−1)/TP × msg_GB ÷ link_BW", value: `${result.bwTermSec.toFixed(6)} s`, green: true },
    { key: "latencyTerm", label: "Latency term (per all-reduce)", formula: "2×(TP−1) × lat_hop ÷ 1e6", value: `${result.latencyTermSec.toFixed(6)} s`, green: true },
    { key: "commTime", label: `Communication time (Σ ${result.numAllReduces} all-reduces)`, formula: "n_allreduce × (bw_term + lat_term)", value: result.commTimeSec != null ? `${result.commTimeSec.toFixed(4)} s` : "—", green: true },
  ];

  return (
    <SectionCard
      title="Prefill under Tensor Parallelism"
      subtitle="Compute shards near-ideally across TP GPUs. Communication (green) is 2 all-reduces/layer on the [B×L×hidden] activation tensor, costed against the selected interconnect. Click a row to light up the parameters it uses."
    >
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-faint)" }}>Tensor-parallel degree (TP)</label>
          <div style={glowWrap(localLit("tpDegree"), "34,211,238")}>
            <input type="number" min={1} value={tp.tpDegree} onChange={e => setTp("tpDegree", Math.max(1, Number(e.target.value) || 1))} className={tpNumberInput} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: INTERCONNECT_GREEN }}>Interconnect (set in rail)</label>
          <p className="text-sm font-mono font-semibold px-2.5 py-1.5" style={{ color: INTERCONNECT_GREEN }}>{link?.name ?? "—"}</p>
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
              const baseColor = r.green ? INTERCONNECT_GREEN : "var(--dm-txt-body)";
              const activeBg = r.green ? "rgba(52,211,153,0.16)" : "rgba(34,211,238,0.14)";
              const idleBg = r.green ? "rgba(52,211,153,0.08)" : i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)";
              return (
                <tr key={r.key} onClick={() => toggleRow(r.key)} className="cursor-pointer transition-colors duration-150" style={{ background: active ? activeBg : idleBg }}>
                  <td className="px-4 py-2.5" style={{ color: active ? (r.green ? INTERCONNECT_GREEN : "#22d3ee") : baseColor }}>{r.label}</td>
                  <td className="px-4 py-2.5 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>{r.formula}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: active ? (r.green ? INTERCONNECT_GREEN : "#22d3ee") : baseColor }}>{r.value}</td>
                </tr>
              );
            })}
            <tr
              onClick={() => toggleRow("wallClock")}
              className="cursor-pointer transition-colors duration-150"
              style={{ borderTop: "2px solid var(--dm-border-a)", background: highlightedRow === "wallClock" ? "rgba(34,211,238,0.14)" : "transparent" }}
            >
              <td className="px-4 py-2.5 font-bold" style={{ color: "var(--dm-txt-primary)" }}>Wall-clock (compute + comm, no overlap)</td>
              <td className="px-4 py-2.5 text-left font-mono text-xs whitespace-nowrap" style={{ color: "var(--dm-txt-faint)" }}>T_compute(TP) + T_comm(TP)</td>
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
          <p className="text-sm font-bold" style={{ color: result.regime === "Communication-bound" ? INTERCONNECT_GREEN : "#22d3ee" }}>{result.regime ?? "Select a silicon"}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)" }}>
              <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>TP</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: "var(--dm-txt-faint)" }}>Compute (s)</th>
              <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest text-[9px]" style={{ color: INTERCONNECT_GREEN }}>Comm (s)</th>
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
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: INTERCONNECT_GREEN }}>{row.commTimeSec != null ? row.commTimeSec.toFixed(4) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.wallClockSec != null ? row.wallClockSec.toFixed(4) : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.speedup != null ? `${row.speedup.toFixed(2)}×` : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{row.parallelEfficiency != null ? `${(row.parallelEfficiency * 100).toFixed(1)}%` : "—"}</td>
                  <td className="px-3 py-1.5" style={{ color: row.regime === "Communication-bound" ? INTERCONNECT_GREEN : "var(--dm-txt-faint)" }}>{row.regime ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!chip && <p className="mt-3 text-xs" style={{ color: "var(--dm-txt-faintest)" }}>Select a silicon in the rail to compute times, speedup, and efficiency.</p>}

      <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
        Assumes a bandwidth-optimal ring all-reduce and no compute/comm overlap (a hard sync point,
        so the two are additive) — real NCCL and fine-grained pipelining land the true number
        between this wall-clock and the pure per-GPU compute time above.
      </p>
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

type Section = "prefill" | "decode" | "kv-cache" | "routing" | "persistent-memory";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "prefill", label: "Prefill" },
  { key: "decode", label: "Decode" },
  { key: "kv-cache", label: "KV Cache" },
  { key: "routing", label: "Routing" },
  { key: "persistent-memory", label: "Persistent Memory" },
];

const COMING_SOON_BLURB: Record<Exclude<Section, "prefill">, string> = {
  "decode": "Per-token decode TFLOPS and the bandwidth-bound roofline verdict, from the workbook's Decode TFLOPs and Decode BW sheets.",
  "kv-cache": "Growing KV-cache memory footprint (full-attention layers) and the fixed-size DeltaNet recurrent-state memory, in GiB, from the VRAM Calculation sheet.",
  "routing": "Reserved for MoE expert-routing overhead once a routed model is added — Qwen3.8-27B is dense, so this section doesn't apply to it yet.",
  "persistent-memory": "Constant, concurrency-independent memory — model weights, in GiB — plus GPU capacity fit-checks, from the VRAM Calculation sheet.",
};

export function DeepAnalysisView() {
  const [usecase, setUsecase] = useState<UsecaseInputs>(DEFAULT_USECASE_INPUTS);
  const [siliconId, setSiliconId] = useState<string>("");
  const [tpConfig, setTpConfig] = useState<TpConfig>(DEFAULT_TP_CONFIG);
  const [section, setSection] = useState<Section>("prefill");
  const [highlightedRow, setHighlightedRow] = useState<PrefillRowKey | null>(null);
  const [highlightedTpRow, setHighlightedTpRow] = useState<TpRowKey | null>(null);

  const chip = COMPARISON_CHIPS.find(c => c.id === siliconId);
  const rowActive = section === "prefill" ? highlightedRow : null;
  const tpRowActive = section === "prefill" ? highlightedTpRow : null;
  const tpHighlights = tpRowActive ? TP_ROW_HIGHLIGHTS[tpRowActive] : null;

  const highlightedAbbrevs = rowActive || tpHighlights?.archAbbrevs
    ? new Set([...(rowActive ? PREFILL_ROW_SYMBOLS[rowActive] : []), ...(tpHighlights?.archAbbrevs ?? [])])
    : null;
  const highlightedUsecaseFields = rowActive || tpHighlights?.usecaseFields
    ? new Set([...(rowActive ? PREFILL_ROW_USECASE_FIELDS[rowActive] : []), ...(tpHighlights?.usecaseFields ?? [])])
    : null;
  const highlightSiliconPeak = (rowActive ? PREFILL_ROW_USES_SILICON_PEAK[rowActive] : false) || (tpHighlights?.siliconPeak ?? false);
  const highlightedInterconnectFields = tpHighlights?.interconnectFields ? new Set(tpHighlights.interconnectFields) : null;

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-12">
      <div className="mb-6">
        <p className="text-sm max-w-3xl leading-relaxed" style={{ color: "var(--dm-txt-muted)" }}>
          A sizing deep-dive for Qwen3.8-27B (hybrid Gated DeltaNet / Gated Attention), ported from the
          Qwen3.8-27B sizing-model workbook. Pick a section above; Architecture, Use Case, and Silicon
          in the right-hand rail drive every one of them and stay pinned as you switch.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="radiogroup" aria-label="Deep Analysis section">
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

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 min-w-0">
          {section === "prefill" && (
            <>
              <PrefillSection usecase={usecase} chip={chip} highlightedRow={highlightedRow} onSelectRow={setHighlightedRow} />
              <PrefillTpCard
                usecase={usecase} chip={chip} tp={tpConfig} onChangeTp={setTpConfig}
                highlightedRow={highlightedTpRow} onSelectRow={setHighlightedTpRow}
              />
            </>
          )}
          {section !== "prefill" && (
            <ComingSoonSection title={SECTIONS.find(s => s.key === section)!.label} blurb={COMING_SOON_BLURB[section]} />
          )}
        </div>

        <div className="w-full lg:w-[680px] flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="sm:w-[300px] flex-shrink-0">
              <ArchitecturePanel highlighted={highlightedAbbrevs} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-6">
              <UsecasePanel usecase={usecase} onChange={setUsecase} highlightedFields={highlightedUsecaseFields} />
              <SiliconPanel chip={chip} onChange={setSiliconId} highlightPeak={highlightSiliconPeak} />
              <InterconnectPanel tp={tpConfig} onChange={setTpConfig} highlighted={highlightedInterconnectFields} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
