/** Data + formulas backing the Models → Deep Analysis tab. Every model's constants are pulled
 *  from its own published config.json / model card (see each `sourceUrl`) rather than guessed.
 *  Two families of hybrid architecture are supported, generically, by every formula below:
 *  Gated DeltaNet linear-attention (Qwen3.8-27B, Qwen3.5-9B) and sliding-window local attention
 *  (Gemma4-31B, Gemma4-26B-A4B) — see `SecondaryAttn` below. */

import type { ComparisonChip, DataType } from "@/modules/silicon/comparison-data";

// ── symbol abbreviations — the single source of truth for every element's short form, so the
// Architecture panel and every formula elsewhere always reference the model in the same
// notation. `w` (window size) only applies to sliding-window hybrid models. ────────────────

export const ABBR = {
  N: "N",
  L: "L",
  L_out: "L_out",
  L_ctx: "L_ctx",
  B: "B",
  n_layers: "n_layers",
  n_fa: "n_fa",
  n_dn: "n_dn",
  d_model: "d_model",
  d_ffn: "d_ffn",
  V: "V",
  L_native: "L_native",
  L_ext: "L_ext",
  n_q: "n_q",
  n_kv: "n_kv",
  d_head: "d_head",
  d_rope: "d_rope",
  n_v: "n_v",
  n_qk: "n_qk",
  d_dn: "d_dn",
  /** Sliding-window secondary group's own head config — distinct symbols from n_q/n_kv/d_head
   *  because a windowed hybrid (e.g. Gemma4) publishes DIFFERENT head counts/dims for its
   *  global vs. windowed layers (unified KV + wider head_dim on the global layers) — reusing
   *  n_q/n_kv/d_head for both would make two different numbers show the same symbol. */
  n_q_sw: "n_q_sw",
  n_kv_sw: "n_kv_sw",
  d_head_sw: "d_head_sw",
  w: "w",
  MTP: "MTP",
  c: "c",
} as const;

/** Every FLOPs figure in this module is expressed in TFLOPS (rate) and every memory figure in
 *  GiB — this is the one place both conversions live so every section stays consistent. */
export const TFLOPS = 1e12;
export const GIB = 1024 ** 3;
export function bytesToGiB(bytes: number): number { return bytes / GIB; }

// ── model architecture (one entry per model in MODEL_CATALOG, each sourced from its own
// published config.json / model card) ───────────────────────────────────────────────────

/** Gated DeltaNet linear-attention layers (Qwen hybrid family): O(1) recurrent state per
 *  sequence — independent of context length — and a chunked-parallel-scan compute cost that's
 *  linear in context length. */
export interface DeltaNetSecondary {
  kind: "deltaNet";
  vHeads: number;
  qkHeads: number;
  headDim: number;
  /** Approximates the extra matmuls in the chunked delta-rule update (correction/beta gate,
   *  chunk-local state, output readout). Kernel-dependent — validate against a profiled kernel. */
  kernelConstant: number;
  /** Fixed-size recurrent state per layer's resident sequence, in MB — O(1) in context length,
   *  unlike a full-attention KV cache. Derived as layers × vHeads × headDim² × 2 bytes (bf16
   *  state) — this reproduces Qwen3.8-27B's published 75MB almost exactly (75.50MB), so the
   *  same derivation is used for every DeltaNet model rather than re-guessing per model. */
  fixedStateMB: number;
}

/** Local sliding-window attention layers (Gemma hybrid family): ordinary multi-head attention
 *  restricted to the most recent `window` tokens — so, unlike full attention, both its KV cache
 *  and its prefill compute are capped once context exceeds the window, rather than growing/
 *  scaling quadratically without bound. */
export interface WindowedSecondary {
  kind: "windowed";
  qHeads: number;
  kvHeads: number;
  headDim: number;
  window: number;
}

export type SecondaryAttn = DeltaNetSecondary | WindowedSecondary;

export interface ModelArchitecture {
  id: string;
  name: string;
  sourceUrl: string;
  totalParamsB: number;
  /** MoE only: parameters actually touched per token. Compute-bound formulas (Prefill/Decode
   *  FLOPs) use this; weight-loading/VRAM formulas (Decode's t_mem, KV Cache's weights) always
   *  use `totalParamsB`, since every expert must still be resident even if only some activate.
   *  Undefined for a dense model, where totalParamsB is used for both. */
  activeParamsB?: number;
  totalLayers: number;
  /** Layers running ordinary full (unbounded, global) causal attention — the O(L²) term. */
  fullAttnLayers: number;
  /** Layers running the model's secondary/high-frequency attention variant (DeltaNet or
   *  sliding-window) — 0 for a plain dense transformer, where `secondary` is null. */
  secondaryLayers: number;
  hiddenDim: number;
  ffnIntermediateDim: number;
  vocabSize: number;
  nativeContextLen: number;
  extendedContextLen: number;
  fullAttn: { qHeads: number; kvHeads: number; headDim: number; ropeDim: number };
  secondary: SecondaryAttn | null;
  multiTokenPrediction: boolean;
  moe?: {
    totalExperts: number;
    activeExperts: number;
    sharedExperts?: number;
    /** FFN intermediate width of one routed expert (config's moe_intermediate_size). */
    expertIntermediateSize: number;
    /** FFN intermediate width of the always-on shared expert. Gemma4-26B-A4B's config doesn't
     *  publish this separately from moe_intermediate_size, so it's assumed equal — flagged here
     *  rather than silently treated as fact. */
    sharedIntermediateSize: number;
  };
}

export const QWEN_3_8_27B: ModelArchitecture = {
  id: "qwen3.8-27b",
  name: "Qwen3.8-27B",
  sourceUrl: "huggingface.co/Qwen/Qwen3.8-27B",
  totalParamsB: 27.8,
  totalLayers: 64,
  fullAttnLayers: 16,
  secondaryLayers: 48,
  hiddenDim: 5120,
  ffnIntermediateDim: 17408,
  vocabSize: 248320,
  nativeContextLen: 262144,
  extendedContextLen: 1000000,
  fullAttn: { qHeads: 24, kvHeads: 4, headDim: 256, ropeDim: 64 },
  secondary: { kind: "deltaNet", vHeads: 48, qkHeads: 16, headDim: 128, kernelConstant: 5, fixedStateMB: 75 },
  multiTokenPrediction: true,
};

/** Same hybrid pattern as Qwen3.8-27B (8 × (3× Gated DeltaNet → FFN → 1× Gated Attention →
 *  FFN)), per the model card's own "Hidden Layout" line. `fixedStateMB` uses the same
 *  layers×vHeads×headDim²×2-bytes derivation validated against Qwen3.8-27B's published figure. */
export const QWEN_3_5_9B: ModelArchitecture = {
  id: "qwen3.5-9b",
  name: "Qwen3.5-9B",
  sourceUrl: "huggingface.co/Qwen/Qwen3.5-9B",
  totalParamsB: 9,
  totalLayers: 32,
  fullAttnLayers: 8,
  secondaryLayers: 24,
  hiddenDim: 4096,
  ffnIntermediateDim: 12288,
  vocabSize: 248320,
  nativeContextLen: 262144,
  extendedContextLen: 1010000,
  fullAttn: { qHeads: 16, kvHeads: 4, headDim: 256, ropeDim: 64 },
  secondary: { kind: "deltaNet", vHeads: 32, qkHeads: 16, headDim: 128, kernelConstant: 5, fixedStateMB: 25.17 },
  multiTokenPrediction: true,
};

/** Dense model. Global (full-attention) layers use unified KV heads + a wider head_dim than the
 *  sliding-window layers (config's `num_global_key_value_heads`/`global_head_dim`, vs.
 *  `num_key_value_heads`/`head_dim` for the sliding layers) — a real, published asymmetry, not
 *  an approximation. Global-layer RoPE dim derived as head_dim × partial_rotary_factor (0.25). */
export const GEMMA4_31B: ModelArchitecture = {
  id: "gemma4-31b",
  name: "Gemma4-31B",
  sourceUrl: "huggingface.co/google/gemma-4-31B",
  totalParamsB: 30.7,
  totalLayers: 60,
  fullAttnLayers: 10,
  secondaryLayers: 50,
  hiddenDim: 5376,
  ffnIntermediateDim: 21504,
  vocabSize: 262144,
  nativeContextLen: 262144,
  extendedContextLen: 262144,
  fullAttn: { qHeads: 32, kvHeads: 4, headDim: 512, ropeDim: 128 },
  secondary: { kind: "windowed", qHeads: 32, kvHeads: 16, headDim: 256, window: 1024 },
  multiTokenPrediction: false,
};

/** Same global/sliding-window split as Gemma4-31B, plus a 128-expert MoE FFN (8 routed + 1
 *  shared active per token) — `activeParamsB` is the vendor-published "Active Parameters"
 *  figure, used everywhere a compute-bound formula would otherwise use totalParamsB. */
export const GEMMA4_26B_A4B: ModelArchitecture = {
  id: "gemma4-26b-a4b",
  name: "Gemma4-26B-A4B",
  sourceUrl: "huggingface.co/google/gemma-4-26B-A4B",
  totalParamsB: 25.2,
  activeParamsB: 3.8,
  totalLayers: 30,
  fullAttnLayers: 5,
  secondaryLayers: 25,
  hiddenDim: 2816,
  ffnIntermediateDim: 2112,
  vocabSize: 262144,
  nativeContextLen: 262144,
  extendedContextLen: 262144,
  fullAttn: { qHeads: 16, kvHeads: 2, headDim: 512, ropeDim: 128 },
  secondary: { kind: "windowed", qHeads: 16, kvHeads: 8, headDim: 256, window: 1024 },
  multiTokenPrediction: false,
  moe: { totalExperts: 128, activeExperts: 8, sharedExperts: 1, expertIntermediateSize: 704, sharedIntermediateSize: 704 },
};

export const MODEL_CATALOG: ModelArchitecture[] = [QWEN_3_8_27B, QWEN_3_5_9B, GEMMA4_31B, GEMMA4_26B_A4B];
export const DEFAULT_MODEL_ID = QWEN_3_8_27B.id;

export function getModelArchitecture(id: string): ModelArchitecture {
  return MODEL_CATALOG.find(m => m.id === id) ?? QWEN_3_8_27B;
}

// ── use-case / serving-workload inputs (shared across every section) ───────────────────

export interface UsecaseInputs {
  concurrency: number;
  inputTokens: number;
  outputTokens: number;
  decodeContextLen: number;
  /** Per the workbook: "Default = input+output (end-of-generation, worst case). Overwrite with
   *  a fixed number to model an earlier point in generation." While true, decodeContextLen
   *  tracks inputTokens+outputTokens automatically; editing it directly sets this false. */
  decodeContextLenAuto: boolean;
  weightDtypeBytes: number;
  kvDtypeBytes: number;
  /** Achieved fraction of peak TFLOPS real GEMM kernels hit on the selected silicon — used
   *  everywhere a compute-bound formula needs a realistic (not theoretical-peak) throughput:
   *  Prefill compute time, Prefill-TP compute time, Decode's t_compute, and KV-Cache eviction
   *  recompute. */
  gemmMfu: number;
  /** Fraction of theoretical link bandwidth the all-reduce collective actually realizes — applies
   *  to both Prefill-TP's and Decode's communication time. */
  commEfficiency: number;
}

export const DEFAULT_USECASE_INPUTS: UsecaseInputs = {
  concurrency: 32,
  inputTokens: 8192,
  outputTokens: 1,
  decodeContextLen: 8193,
  decodeContextLenAuto: true,
  weightDtypeBytes: 2,
  kvDtypeBytes: 2,
  gemmMfu: 0.8,
  commEfficiency: 0.62,
};

/** Applies one field edit to a UsecaseInputs, keeping decodeContextLen in sync with
 *  inputTokens+outputTokens whenever decodeContextLenAuto is still true. Editing
 *  decodeContextLen directly flips it to a manual override; both token fields re-derive it
 *  while still in auto mode. */
export function updateUsecaseField<K extends keyof UsecaseInputs>(prev: UsecaseInputs, key: K, value: UsecaseInputs[K]): UsecaseInputs {
  const next: UsecaseInputs = { ...prev, [key]: value };
  if (key === "decodeContextLen") {
    next.decodeContextLenAuto = false;
  } else if ((key === "inputTokens" || key === "outputTokens") && next.decodeContextLenAuto) {
    next.decodeContextLen = next.inputTokens + next.outputTokens;
  }
  return next;
}

/** Re-enables auto-tracking and immediately resyncs decodeContextLen. */
export function resetDecodeContextToAuto(prev: UsecaseInputs): UsecaseInputs {
  return { ...prev, decodeContextLenAuto: true, decodeContextLen: prev.inputTokens + prev.outputTokens };
}

export const WEIGHT_DTYPE_OPTIONS = [
  { label: "BF16 / FP16 (2 bytes)", value: 2 },
  { label: "FP8 (1 byte)", value: 1 },
  { label: "INT4 (0.5 bytes)", value: 0.5 },
];

export const KV_DTYPE_OPTIONS = [
  { label: "BF16 / FP16 (2 bytes)", value: 2 },
  { label: "FP8 (1 byte)", value: 1 },
];

// ── silicon selection — reuses the Silicon module's own comparison catalog ─────────────

/** Preference order for "the" peak-throughput datatype to drive sizing math — BF16 is what
 *  the source workbook itself defaults to; fall back down the precision ladder if a chip
 *  (e.g. an early-gen part) doesn't publish a BF16 figure. */
const PEAK_DTYPE_PREFERENCE: DataType[] = ["BF16", "FP16", "TF32", "FP32"];

export interface SiliconPeak {
  dataType: DataType;
  raw: string;
  note?: string;
  teraflops: number | null;
}

/** Pulls the first available peak-throughput figure off a chip's `flops` map, in precision
 *  preference order, and parses out a plain TFLOPS number for use in the compute-bound
 *  formulas below. Returns null teraflops (but still surfaces the raw string) if the value
 *  can't be parsed as a plain number — e.g. a range like "684 GB/s – 1.54 TB/s". */
export function getSiliconPeak(chip: ComparisonChip): SiliconPeak | null {
  for (const dt of PEAK_DTYPE_PREFERENCE) {
    const cell = chip.flops[dt];
    if (!cell) continue;
    const match = cell.value.replace(/,/g, "").match(/[\d.]+/);
    const teraflops = match ? parseFloat(match[0]) : null;
    return { dataType: dt, raw: cell.value, note: cell.note, teraflops };
  }
  return null;
}

/** Pulls a plain GB/s number out of a chip's free-text memory bandwidth string, for Decode's
 *  weight-read-bandwidth formula. Prefers an explicit "GB/s" figure if the string states one
 *  (e.g. "1.79 TB/s (1,792 GB/s)" → 1792); otherwise converts the first "TB/s" figure ×1000.
 *  Where a string lists both a per-device and an aggregate figure (e.g. GB200's "8 TB/s per
 *  GPU (576 TB/s aggregate...)"), the per-device one is always written first, so a first-match
 *  regex picks the right one. */
export function getSiliconMemoryBandwidthGBs(chip: ComparisonChip): number | null {
  const text = chip.memory.bandwidth.replace(/,/g, "");
  const gbMatch = text.match(/([\d.]+)\s*GB\/s/);
  if (gbMatch) return parseFloat(gbMatch[1]);
  const tbMatch = text.match(/([\d.]+)\s*TB\/s/);
  if (tbMatch) return parseFloat(tbMatch[1]) * 1000;
  return null;
}

/** Same idea as getSiliconMemoryBandwidthGBs, for capacity — used by the KV Cache section's
 *  VRAM-per-card figure. Picks the first "GB"/"TB" figure in the string, which is always the
 *  per-device one by this app's own authoring convention (aggregate/rack figures, where they
 *  exist, are always stated second). */
export function getSiliconMemoryCapacityGB(chip: ComparisonChip): number | null {
  const text = chip.memory.capacity.replace(/,/g, "");
  const gbMatch = text.match(/([\d.]+)\s*GB\b/);
  if (gbMatch) return parseFloat(gbMatch[1]);
  const tbMatch = text.match(/([\d.]+)\s*TB\b/);
  if (tbMatch) return parseFloat(tbMatch[1]) * 1000;
  return null;
}

/** Short on-package memory technology label for a chip — "HBM3e", "GDDR6", "LPDDR5X", etc.,
 *  read straight off the leading token of `chip.memory.type` (e.g. "GDDR6, ECC, 256-bit" →
 *  "GDDR6"). Used anywhere the KV Pool view would otherwise hardcode "HBM" — that term is
 *  NVIDIA-specific (GB200/GB300/H100); Arc Pro B70 is GDDR6 and Crescent Island is LPDDR5X, so
 *  the label must track whichever GPU is actually selected. Falls back to "HBM" (the most
 *  common case among this app's silicon options) when no chip is selected yet. */
export function getSiliconMemoryLabel(chip: ComparisonChip | undefined | null): string {
  if (!chip) return "HBM";
  const m = chip.memory.type.match(/^[A-Za-z0-9]+/);
  return m ? m[0] : "HBM";
}

// ── prefill FLOPs / TFLOPS calculation — ported from qwen3_x_model_ttft_calculator.xlsx's
// "TTFT Model" sheet. More granular than a blanket "total-params × 2" dense term: FFN, the
// full-attention (global) layers' Q/K/V/O projections, their O(L²) score/weighted-sum matmuls,
// and — for a DeltaNet hybrid — the secondary layers' own projections plus the chunked
// delta-rule recurrence, modeled as its own timing bucket at its own achieved TFLOP/s (the
// chunked-scan kernel realistically hits a different, usually worse, utilization than a dense
// GEMM). A sliding-window hybrid (Gemma) has no equivalent in that source sheet — its secondary
// term reuses the same projection formula (ordinary attention, just windowed) plus a quadratic
// term capped at L×min(L,window), both costed at the same GEMM throughput as everything else. ─

export type PrefillRowKey = "ffn" | "fullAttnProj" | "fullAttnQuadratic" | "secondaryProj" | "secondaryCompute" | "total";

/** Which Architecture symbols each Prefill row's formula actually reads — drives the
 *  click-to-highlight link from the Prefill table back to the Architecture panel. Depends on
 *  the model's secondary attention kind (DeltaNet vs. sliding-window use different symbols),
 *  so this is a function of the selected architecture rather than a static table. */
export function getPrefillRowSymbols(arch: ModelArchitecture, key: PrefillRowKey): string[] {
  const secondaryProjSymbols: string[] =
    arch.secondary?.kind === "deltaNet" ? [ABBR.d_model, ABBR.n_qk, ABBR.d_dn, ABBR.n_v, ABBR.L, ABBR.B, ABBR.n_dn]
    : arch.secondary?.kind === "windowed" ? [ABBR.d_model, ABBR.n_q_sw, ABBR.n_kv_sw, ABBR.d_head_sw, ABBR.L, ABBR.B, ABBR.n_dn]
    : [];
  const secondaryComputeSymbols: string[] =
    arch.secondary?.kind === "deltaNet" ? [ABBR.n_v, ABBR.d_dn, ABBR.L, ABBR.B, ABBR.n_dn]
    : arch.secondary?.kind === "windowed" ? [ABBR.n_q_sw, ABBR.d_head_sw, ABBR.w, ABBR.L, ABBR.B, ABBR.n_dn]
    : [];
  switch (key) {
    case "ffn": return arch.moe ? [ABBR.d_model, ABBR.L, ABBR.B, ABBR.n_layers] : [ABBR.d_model, ABBR.d_ffn, ABBR.L, ABBR.B, ABBR.n_layers];
    case "fullAttnProj": return [ABBR.d_model, ABBR.n_q, ABBR.n_kv, ABBR.d_head, ABBR.L, ABBR.B, ABBR.n_fa];
    case "fullAttnQuadratic": return [ABBR.n_q, ABBR.d_head, ABBR.L, ABBR.B, ABBR.n_fa];
    case "secondaryProj": return secondaryProjSymbols;
    case "secondaryCompute": return secondaryComputeSymbols;
    case "total": return [ABBR.d_model, ABBR.d_ffn, ABBR.n_q, ABBR.n_kv, ABBR.d_head, ABBR.n_fa, ABBR.L, ABBR.B, ...secondaryProjSymbols, ...secondaryComputeSymbols];
  }
}

/** Which Use Case inputs each Prefill row's formula actually reads. Every raw FLOP term reads
 *  concurrency/input tokens; only the Total row's compute-time/achieved-TFLOPS figures
 *  additionally depend on the Prefill Efficiency Stack inputs. Model-independent. */
export const PREFILL_ROW_USECASE_FIELDS: Record<PrefillRowKey, (keyof UsecaseInputs)[]> = {
  ffn: ["concurrency", "inputTokens"],
  fullAttnProj: ["concurrency", "inputTokens"],
  fullAttnQuadratic: ["concurrency", "inputTokens"],
  secondaryProj: ["concurrency", "inputTokens"],
  secondaryCompute: ["concurrency", "inputTokens"],
  total: ["concurrency", "inputTokens", "gemmMfu"],
};

/** Only the Total row's compute-time/achieved-TFLOPS figures depend on the selected silicon's
 *  peak throughput — the raw FLOP terms are silicon-independent. */
export const PREFILL_ROW_USES_SILICON_PEAK: Record<PrefillRowKey, boolean> = {
  ffn: false,
  fullAttnProj: false,
  fullAttnQuadratic: false,
  secondaryProj: false,
  secondaryCompute: false,
  total: true,
};

/** Chunked delta-rule ("DeltaNet") arithmetic — a real kernel with its own achieved throughput,
 *  distinct from the GEMM rate everything else in this model uses. Only meaningful when the
 *  selected model's `secondary.kind === "deltaNet"`; ignored otherwise. */
export interface DeltaNetPrefillConfig {
  /** Chunk size C — DeltaNet processes complete chunks, so the workload pads up to a multiple of C. */
  chunkSize: number;
  /** Achieved TFLOP/s/GPU for the chunked recurrent-scan kernel — separate from, and typically
   *  well below, the GEMM rate used for FFN/projection/quadratic terms. */
  deltaTflopsPerGpu: number;
  /** Optional fixed kernel-launch/sync overhead per chunk per linear layer, in microseconds. */
  fixedOverheadUsPerChunkPerLayer: number;
}

export const DEFAULT_DELTANET_PREFILL_CONFIG: DeltaNetPrefillConfig = {
  chunkSize: 64,
  deltaTflopsPerGpu: 150,
  fixedOverheadUsPerChunkPerLayer: 0,
};

export interface PrefillResult {
  /** All *Tflops fields are in TFLOPS (i.e. already divided by 1e12) — see the TFLOPS constant above. */
  ffnTermTflops: number;
  /** Q/K/V/O projection FLOPs for the global (full-attention) layers only — linear in L. */
  fullAttnProjTermTflops: number;
  /** QKᵀ + weighted-sum FLOPs for the global layers only — O(L²). */
  fullAttnQuadraticTermTflops: number;
  /** Secondary layers' own projection FLOPs (DeltaNet's Q/K/V/z/a/b/O, or a windowed hybrid's
   *  ordinary Q/K/V/O) — 0 for a plain dense transformer. Linear in L either way. */
  secondaryProjTermTflops: number;
  /** The secondary layers' core mixing-operation FLOPs: DeltaNet's chunked delta-rule
   *  recurrence, or a windowed hybrid's QKᵀ + weighted-sum capped at L×min(L,window). 0 for a
   *  plain dense transformer. */
  secondaryComputeTermTflops: number;
  totalTflops: number;
  /** FFN + both projection terms + the quadratic term (+ windowed secondaryCompute, which is
   *  ordinary GEMM-shaped attention) — everything costed at the shared GEMM rate. Null if no
   *  silicon peak is known. */
  gemmComputeTimeSec: number | null;
  /** DeltaNet's chunked-recurrence time at its own achieved TFLOP/s — 0 for non-DeltaNet models.
   *  Independent of silicon peak (it's a wholly separate, directly-set throughput assumption). */
  deltaComputeTimeSec: number;
  /** Fixed per-chunk-per-layer overhead — 0 unless configured. Independent of silicon peak. */
  deltaFixedOverheadSec: number;
  /** gemmComputeTimeSec + deltaComputeTimeSec + deltaFixedOverheadSec. Null if gemmComputeTimeSec is null. */
  estimatedComputeTimeSec: number | null;
  achievedTflops: number | null;
}

/** `peakTflops` comes from the selected Silicon; `usecase.gemmMfu` is the achieved fraction of it
 *  real kernels hit. `deltaCfg` only matters for a DeltaNet-hybrid model. Pass
 *  `peakTflops: null` (no silicon selected, or its peak figure didn't parse) to still get the
 *  FLOPS breakdown with the GEMM-side time/achieved-throughput left unset — DeltaNet's own
 *  compute time is independent of silicon peak, so it's still computed either way.
 *
 *  This is a TP=1 baseline throughout (no sharding) — see calcPrefillTp for the TP-parallel view. */
export function calcPrefill(
  arch: ModelArchitecture, usecase: UsecaseInputs, deltaCfg: DeltaNetPrefillConfig, peakTflops: number | null,
): PrefillResult {
  const H = arch.hiddenDim;
  const L = usecase.inputTokens;
  const B = usecase.concurrency;

  const ffnPerLayer = arch.moe
    ? 6 * H * (arch.moe.activeExperts * arch.moe.expertIntermediateSize + arch.moe.sharedIntermediateSize)
    : 6 * H * arch.ffnIntermediateDim;
  const ffnTermTflops = (ffnPerLayer * arch.totalLayers * L * B) / TFLOPS;

  const { qHeads, kvHeads, headDim } = arch.fullAttn;
  const fullAttnProjPerLayer = 2 * H * (3 * qHeads * headDim + 2 * kvHeads * headDim);
  const fullAttnProjTermTflops = (fullAttnProjPerLayer * arch.fullAttnLayers * L * B) / TFLOPS;
  const fullAttnQuadCoeffPerLayer = 4 * qHeads * headDim;
  const fullAttnQuadraticTermTflops = (fullAttnQuadCoeffPerLayer * arch.fullAttnLayers * L * L * B) / TFLOPS;

  let secondaryProjTermTflops = 0;
  let secondaryComputeTermTflops = 0;
  let deltaComputeTimeSec = 0;
  let deltaFixedOverheadSec = 0;
  let windowedComputeIsGemm = false;

  if (arch.secondary?.kind === "deltaNet") {
    const s = arch.secondary;
    // Q/K/V + z (gate) + a/b (correction) + output projections — see the Formula Guide's
    // "Linear-attention projections" row: 2H(2·N_k·D_k + 3·N_v·D_v + 2·N_v). Our DeltaNetSecondary
    // uses one shared headDim for both K and V dims, matching every model in the source catalog.
    const linearProjPerLayer = 2 * H * (2 * s.qkHeads * s.headDim + 3 * s.vHeads * s.headDim + 2 * s.vHeads);
    secondaryProjTermTflops = (linearProjPerLayer * arch.secondaryLayers * L * B) / TFLOPS;

    const C = deltaCfg.chunkSize;
    const D = s.headDim;
    const deltaFlopsPerTokenLayer = s.vHeads * (4 * C * C * D + C * C * (D + D) + 6 * C * D * D + 2 * C * C * D);
    const paddedTokens = Math.ceil(L / C) * C;
    secondaryComputeTermTflops = (deltaFlopsPerTokenLayer * paddedTokens * arch.secondaryLayers * B) / TFLOPS;

    if (deltaCfg.deltaTflopsPerGpu > 0) deltaComputeTimeSec = secondaryComputeTermTflops / deltaCfg.deltaTflopsPerGpu;
    const chunksPerBatch = B * Math.ceil(L / C);
    deltaFixedOverheadSec = (chunksPerBatch * arch.secondaryLayers * deltaCfg.fixedOverheadUsPerChunkPerLayer) / 1e6;
  } else if (arch.secondary?.kind === "windowed") {
    const s = arch.secondary;
    const windowedProjPerLayer = 2 * H * (3 * s.qHeads * s.headDim + 2 * s.kvHeads * s.headDim);
    secondaryProjTermTflops = (windowedProjPerLayer * arch.secondaryLayers * L * B) / TFLOPS;
    const windowedQuadCoeffPerLayer = 4 * s.qHeads * s.headDim;
    secondaryComputeTermTflops = (windowedQuadCoeffPerLayer * arch.secondaryLayers * L * Math.min(L, s.window) * B) / TFLOPS;
    windowedComputeIsGemm = true; // ordinary attention, just windowed — costed at the shared GEMM rate below, not a separate throughput.
  }

  const gemmFlopsTflops =
    ffnTermTflops + fullAttnProjTermTflops + fullAttnQuadraticTermTflops + secondaryProjTermTflops
    + (windowedComputeIsGemm ? secondaryComputeTermTflops : 0);
  const totalTflops = gemmFlopsTflops + (windowedComputeIsGemm ? 0 : secondaryComputeTermTflops);

  let gemmComputeTimeSec: number | null = null;
  let estimatedComputeTimeSec: number | null = null;
  let achievedTflops: number | null = null;
  if (peakTflops && peakTflops > 0) {
    gemmComputeTimeSec = gemmFlopsTflops / (peakTflops * usecase.gemmMfu);
    estimatedComputeTimeSec = gemmComputeTimeSec + deltaComputeTimeSec + deltaFixedOverheadSec;
    achievedTflops = totalTflops / estimatedComputeTimeSec;
  }

  return {
    ffnTermTflops, fullAttnProjTermTflops, fullAttnQuadraticTermTflops, secondaryProjTermTflops, secondaryComputeTermTflops,
    totalTflops, gemmComputeTimeSec, deltaComputeTimeSec, deltaFixedOverheadSec, estimatedComputeTimeSec, achievedTflops,
  };
}

// ── interconnect reference (from the "Silicon" sheet's Interconnect Reference table) ───
// Everything interconnect-related is surfaced in green in the UI — this is the one place
// the actual link-bandwidth/latency numbers live, reused by the Interconnect panel and Prefill-TP.

export interface Interconnect {
  id: string;
  name: string;
  linkBwGBs: number;
  latencyUsPerHop: number;
  fabricType: string;
  notes: string;
}

export const INTERCONNECTS: Interconnect[] = [
  { id: "nvlink5", name: "NVLink 5 (GB200/GB300)", linkBwGBs: 1800, latencyUsPerHop: 1.5, fabricType: "NVLink switch fabric", notes: "Blackwell NVL72 rack, NVLink 5. Per-GPU aggregate bidirectional. Highest-bandwidth option for TP." },
  { id: "nvlink4", name: "NVLink 4 (H100 SXM5)", linkBwGBs: 900, latencyUsPerHop: 2.0, fabricType: "NVLink switch fabric", notes: "Hopper SXM5 / HGX-DGX 8-GPU. 18 links × 50 GB/s. The default for H100-class TP." },
  { id: "nvlink3", name: "NVLink 3 (A100 SXM4)", linkBwGBs: 600, latencyUsPerHop: 2.5, fabricType: "NVLink switch fabric", notes: "Ampere SXM4. 12 links × 50 GB/s." },
  { id: "pcie-gen5", name: "PCIe Gen5 x16", linkBwGBs: 64, latencyUsPerHop: 4.0, fabricType: "PCIe (host / P2P)", notes: "Effective cross-GPU bandwidth without NVLink — ~1 order of magnitude below NVLink, TP prefill often becomes comm-bound here." },
  { id: "pcie-gen4", name: "PCIe Gen4 x16", linkBwGBs: 32, latencyUsPerHop: 5.0, fabricType: "PCIe (host / P2P)", notes: "Older platform ceiling. Rarely a good TP-prefill fabric." },
  { id: "infiniband-ndr", name: "InfiniBand NDR (400G)", linkBwGBs: 50, latencyUsPerHop: 6.0, fabricType: "Network (inter-node)", notes: "~400 Gb/s = 50 GB/s per port. Inter-node TP is possible but latency + bandwidth make it a last resort vs. intra-node NVLink." },
];

// ── Prefill under Tensor Parallelism (from the "Prefill TP" sheet) ─────────────────────

export interface TpConfig {
  tpDegree: number;
  interconnectId: string;
  collectiveOpsPerLayer: number;
  activationDtypeBytes: number;
}

export const DEFAULT_TP_CONFIG: TpConfig = {
  tpDegree: 4,
  interconnectId: "pcie-gen4",
  collectiveOpsPerLayer: 2,
  activationDtypeBytes: 2,
};

/** Arc Pro B70's default interconnect — PCIe Gen4 x16, not Gen5 — surfaced here so both the
 *  page's initial state and the "silicon changed" auto-default logic use the same source. */
export const B70_DEFAULT_INTERCONNECT_ID = "pcie-gen4";

export interface PrefillTpResult {
  singleGpuTflops: number;
  singleGpuTimeSec: number | null;
  perGpuTflops: number;
  /** GEMM-side (FFN/projections/quadratic) compute time only, sharded across TP GPUs. */
  perGpuComputeTimeSec: number | null;
  /** DeltaNet's chunked-recurrence time, sharded across TP GPUs, at its own achieved TFLOP/s —
   *  0 for non-DeltaNet models. Independent of silicon peak. */
  perGpuDeltaComputeTimeSec: number;
  /** Fixed per-chunk-per-layer overhead — not sharded by TP (every GPU still launches the same
   *  number of chunk kernels along the token dimension). 0 unless configured. */
  deltaFixedOverheadSec: number;
  /** Everything from here down is the communication side — rendered in green in the UI. Bandwidth-
   *  only (no latency term): negligible next to the bandwidth term at realistic message sizes. */
  allReduceMsgGB: number;
  numAllReduces: number;
  bwTermSec: number;
  commTimeSec: number | null;
  wallClockSec: number | null;
  speedup: number | null;
  parallelEfficiency: number | null;
  regime: "Compute-bound scaling" | "Communication-bound" | null;
}

/** `totalPrefillTflops` is `calcPrefill(...).totalTflops` for the same architecture/usecase —
 *  passed in rather than recomputed so callers that already have it don't do the work twice.
 *  `deltaCfg` only matters for a DeltaNet-hybrid model. */
export function calcPrefillTp(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, deltaCfg: DeltaNetPrefillConfig,
  peakTflops: number | null, prefill: PrefillResult,
): PrefillTpResult {
  const B = usecase.concurrency;
  const L = usecase.inputTokens;
  const eff = usecase.gemmMfu;
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);
  const linkBwGBs = link?.linkBwGBs ?? null;

  const singleGpuTflops = prefill.totalTflops;
  const singleGpuTimeSec = prefill.estimatedComputeTimeSec;

  const gemmFlopsTflops = prefill.ffnTermTflops + prefill.fullAttnProjTermTflops + prefill.fullAttnQuadraticTermTflops
    + prefill.secondaryProjTermTflops + (arch.secondary?.kind === "windowed" ? prefill.secondaryComputeTermTflops : 0);
  const perGpuTflops = singleGpuTflops / tp.tpDegree;
  const perGpuComputeTimeSec = peakTflops && peakTflops > 0 ? (gemmFlopsTflops / tp.tpDegree) / (peakTflops * eff) : null;

  const perGpuDeltaComputeTimeSec =
    arch.secondary?.kind === "deltaNet" && deltaCfg.deltaTflopsPerGpu > 0
      ? (prefill.secondaryComputeTermTflops / tp.tpDegree) / deltaCfg.deltaTflopsPerGpu
      : 0;
  const deltaFixedOverheadSec = prefill.deltaFixedOverheadSec;

  const allReduceMsgGB = (B * L * arch.hiddenDim * tp.activationDtypeBytes) / 1e9;
  const numAllReduces = tp.collectiveOpsPerLayer * arch.totalLayers;

  let bwTermSec = 0;
  if (tp.tpDegree > 1 && linkBwGBs) {
    // Effective link BW is derated by the realized comm efficiency — real NCCL/oneCCL falls well
    // short of theoretical, so this is never the full theoretical link bandwidth.
    bwTermSec = ((2 * (tp.tpDegree - 1)) / tp.tpDegree) * (allReduceMsgGB / (linkBwGBs * usecase.commEfficiency));
  }
  const commTimeSec = tp.tpDegree > 1 && !linkBwGBs ? null : numAllReduces * bwTermSec;

  // Compute + delta + delta-fixed-overhead + comm all sit on the same serialized critical path —
  // each layer's all-reduce blocks the next layer, so they're additive with no overlap.
  const wallClockSec = perGpuComputeTimeSec != null && commTimeSec != null
    ? perGpuComputeTimeSec + perGpuDeltaComputeTimeSec + deltaFixedOverheadSec + commTimeSec
    : null;
  const speedup = singleGpuTimeSec != null && wallClockSec != null && wallClockSec > 0 ? singleGpuTimeSec / wallClockSec : null;
  const parallelEfficiency = speedup != null ? speedup / tp.tpDegree : null;
  const regime = commTimeSec != null && perGpuComputeTimeSec != null
    ? (commTimeSec > perGpuComputeTimeSec + perGpuDeltaComputeTimeSec ? "Communication-bound" : "Compute-bound scaling")
    : null;

  return {
    singleGpuTflops, singleGpuTimeSec, perGpuTflops, perGpuComputeTimeSec, perGpuDeltaComputeTimeSec, deltaFixedOverheadSec,
    allReduceMsgGB, numAllReduces, bwTermSec, commTimeSec,
    wallClockSec, speedup, parallelEfficiency, regime,
  };
}

export const TP_SWEEP_DEGREES = [1, 2, 4, 8, 16];

/** The "TP sweep" table — same calculation at a fixed ladder of TP degrees, independent of
 *  the currently-selected TP, to show where communication starts eating the scaling gains. */
export function calcPrefillTpSweep(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, deltaCfg: DeltaNetPrefillConfig,
  peakTflops: number | null, prefill: PrefillResult,
): (PrefillTpResult & { tpDegree: number })[] {
  return TP_SWEEP_DEGREES.map(tpDegree => ({
    tpDegree,
    ...calcPrefillTp(arch, usecase, { ...tp, tpDegree }, deltaCfg, peakTflops, prefill),
  }));
}

// ── click-to-highlight: which inputs each Prefill-TP row's formula actually reads ──────
// Mirrors getPrefillRowSymbols/PREFILL_ROW_USECASE_FIELDS above, but for the Prefill-TP
// table, and split out by WHERE each dependency lives so the UI can color interconnect
// dependencies green and everything else the usual cyan.

export type TpRowKey = "singleGpu" | "perGpu" | "deltaCompute" | "deltaFixedOverhead" | "msgSize" | "numAllReduces" | "bwTerm" | "commTime" | "wallClock";

export interface TpRowHighlights {
  archAbbrevs?: string[];
  usecaseFields?: (keyof UsecaseInputs)[];
  siliconPeak?: boolean;
  /** Interconnect-panel rows this Prefill-TP row's formula reads — rendered in green. */
  interconnectFields?: ("linkBw" | "latency")[];
  /** TP-config inputs rendered inline on the Prefill-TP card itself (not in the rail). */
  localFields?: (keyof TpConfig)[];
  /** DeltaNet-specific inputs rendered inline on the Prefill-TP card (chunk size / delta TFLOP/s
   *  / fixed overhead) — only ever set for a DeltaNet-hybrid model. */
  deltaConfigFields?: (keyof DeltaNetPrefillConfig)[];
}

export const TP_ROW_HIGHLIGHTS: Record<TpRowKey, TpRowHighlights> = {
  singleGpu: { siliconPeak: true, usecaseFields: ["gemmMfu"] },
  perGpu: { siliconPeak: true, usecaseFields: ["gemmMfu"], localFields: ["tpDegree"] },
  deltaCompute: { localFields: ["tpDegree"], deltaConfigFields: ["chunkSize", "deltaTflopsPerGpu"] },
  deltaFixedOverhead: { localFields: ["tpDegree"], deltaConfigFields: ["chunkSize", "fixedOverheadUsPerChunkPerLayer"] },
  msgSize: { archAbbrevs: [ABBR.d_model], usecaseFields: ["concurrency", "inputTokens"], localFields: ["activationDtypeBytes"] },
  numAllReduces: { archAbbrevs: [ABBR.n_layers], localFields: ["collectiveOpsPerLayer"] },
  bwTerm: { localFields: ["tpDegree"], interconnectFields: ["linkBw"], usecaseFields: ["commEfficiency"] },
  commTime: { localFields: ["collectiveOpsPerLayer"], interconnectFields: ["linkBw"], usecaseFields: ["commEfficiency"] },
  wallClock: {
    siliconPeak: true, usecaseFields: ["gemmMfu", "commEfficiency"],
    localFields: ["tpDegree", "collectiveOpsPerLayer"], interconnectFields: ["linkBw"],
    deltaConfigFields: ["chunkSize", "deltaTflopsPerGpu", "fixedOverheadUsPerChunkPerLayer"],
  },
};

// ── Decode — tensor-parallel, memory-bandwidth model (from qwen_decode_prefill_calculator.xlsx,
// "Decode" sheet) — t_token = MAX(t_mem, t_compute) + t_comm. KV-cache read traffic is
// intentionally excluded, per that workbook's own README: negligible at low batch size with
// only 16 full-attention layers / 4 KV heads; a worse approximation at large batch × long
// context, where KV bytes scale with B×T (see the KV Cache section once it's built). ─────────

export interface DecodeResult {
  totalWeightBytes: number;
  weightBytesPerDevice: number;
  weightGBPerDevice: number;
  /** ms to read this device's weight shard once — null if no silicon memory bandwidth is known. */
  tMemMs: number | null;
  totalDecodeFlops: number;
  flopsPerDevice: number;
  /** ms for this device's matmul share — null if no silicon peak TFLOPS is known. */
  tComputeMs: number | null;
  allReduceMsgBytes: number;
  ringFactor: number;
  /** ms per all-reduce — null if no interconnect link bandwidth is known. */
  timePerAllReduceMs: number | null;
  totalSyncPoints: number;
  tCommMs: number | null;
  boundRegime: "Memory-bound" | "Compute-bound" | null;
  totalTimePerTokenMs: number | null;
  tokensPerSecPerStream: number | null;
  tokensPerSecAggregate: number | null;
  /** TP-sharding sanity flags — real overhead beyond what the formulas above capture if false. */
  kvHeadShardingOk: boolean;
  qkHeadShardingOk: boolean;
}

export function calcDecode(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig,
  peakTflops: number | null, memBandwidthGBs: number | null, linkBwGBs: number | null,
): DecodeResult {
  // Weight-loading (t_mem) always reads the full resident parameter count — every expert must
  // be in VRAM even if only some activate. Compute (t_compute) uses only active params for MoE.
  const N = arch.totalParamsB * 1e9;
  const N_active = (arch.activeParamsB ?? arch.totalParamsB) * 1e9;
  const B = usecase.concurrency;
  const bytesPerParam = usecase.weightDtypeBytes;
  const X = tp.tpDegree;

  const totalWeightBytes = N * bytesPerParam;
  const weightBytesPerDevice = totalWeightBytes / X;
  const weightGBPerDevice = weightBytesPerDevice / 1e9;
  const tMemMs = memBandwidthGBs && memBandwidthGBs > 0 ? (weightBytesPerDevice / (memBandwidthGBs * 1e9)) * 1000 : null;

  const totalDecodeFlops = 2 * N_active * B;
  const flopsPerDevice = totalDecodeFlops / X;
  // Derated by the achieved-MFU fraction, same as Prefill's compute time — the raw peak TFLOPS
  // figure alone was previously used un-derated here, so this input had no effect on Decode at all.
  const tComputeMs = peakTflops && peakTflops > 0 ? (flopsPerDevice / (peakTflops * usecase.gemmMfu * 1e12)) * 1000 : null;

  const allReduceMsgBytes = B * arch.hiddenDim * bytesPerParam;
  const ringFactor = X > 1 ? (2 * (X - 1)) / X : 0;
  // Derated by the achieved comm-efficiency fraction, same as Prefill-TP's bandwidth term — the
  // raw theoretical link bandwidth alone was previously used un-derated here.
  const timePerAllReduceMs =
    X <= 1 ? 0 : linkBwGBs && linkBwGBs > 0 ? ((ringFactor * allReduceMsgBytes) / (linkBwGBs * usecase.commEfficiency * 1e9)) * 1000 : null;
  const totalSyncPoints = tp.collectiveOpsPerLayer * arch.totalLayers;
  const tCommMs = timePerAllReduceMs != null ? totalSyncPoints * timePerAllReduceMs : null;

  const boundRegime = tMemMs != null && tComputeMs != null ? (tMemMs >= tComputeMs ? "Memory-bound" : "Compute-bound") : null;
  const matmulBoundMs = tMemMs != null && tComputeMs != null ? Math.max(tMemMs, tComputeMs) : null;
  const totalTimePerTokenMs = matmulBoundMs != null && tCommMs != null ? matmulBoundMs + tCommMs : null;
  const tokensPerSecPerStream = totalTimePerTokenMs && totalTimePerTokenMs > 0 ? 1000 / totalTimePerTokenMs : null;
  const tokensPerSecAggregate = tokensPerSecPerStream != null ? tokensPerSecPerStream * B : null;

  return {
    totalWeightBytes, weightBytesPerDevice, weightGBPerDevice, tMemMs,
    totalDecodeFlops, flopsPerDevice, tComputeMs,
    allReduceMsgBytes, ringFactor, timePerAllReduceMs, totalSyncPoints, tCommMs,
    boundRegime, totalTimePerTokenMs, tokensPerSecPerStream, tokensPerSecAggregate,
    kvHeadShardingOk: X <= arch.fullAttn.kvHeads,
    // The secondary attention variant's own head-sharding ceiling — DeltaNet's QK heads, or a
    // windowed hybrid's KV heads. No extra ceiling for a plain dense transformer (secondary null).
    qkHeadShardingOk: !arch.secondary || (arch.secondary.kind === "deltaNet" ? X <= arch.secondary.qkHeads : X <= arch.secondary.kvHeads),
  };
}

// ── click-to-highlight for Decode — mirrors TP_ROW_HIGHLIGHTS above, plus a new
// `siliconBandwidth` flag since Decode (unlike Prefill) is bandwidth- as well as compute-bound. ──

export type DecodeRowKey =
  | "totalWeightBytes" | "weightBytesPerDevice" | "tMem"
  | "totalFlops" | "flopsPerDevice" | "tCompute"
  | "msgBytes" | "ringFactor" | "timePerAllReduce" | "syncPoints" | "tComm"
  | "totalTimePerToken";

export interface DecodeRowHighlights {
  archAbbrevs?: string[];
  usecaseFields?: (keyof UsecaseInputs)[];
  siliconPeak?: boolean;
  siliconBandwidth?: boolean;
  interconnectFields?: ("linkBw" | "latency")[];
  localFields?: (keyof TpConfig)[];
}

export const DECODE_ROW_HIGHLIGHTS: Record<DecodeRowKey, DecodeRowHighlights> = {
  totalWeightBytes: { archAbbrevs: [ABBR.N], usecaseFields: ["weightDtypeBytes"] },
  weightBytesPerDevice: { localFields: ["tpDegree"] },
  tMem: { siliconBandwidth: true },
  totalFlops: { archAbbrevs: [ABBR.N], usecaseFields: ["concurrency"] },
  flopsPerDevice: { localFields: ["tpDegree"] },
  tCompute: { siliconPeak: true, usecaseFields: ["gemmMfu"] },
  msgBytes: { archAbbrevs: [ABBR.d_model], usecaseFields: ["concurrency", "weightDtypeBytes"] },
  ringFactor: { localFields: ["tpDegree"] },
  timePerAllReduce: { localFields: ["tpDegree"], interconnectFields: ["linkBw"], usecaseFields: ["commEfficiency"] },
  syncPoints: { archAbbrevs: [ABBR.n_layers], localFields: ["collectiveOpsPerLayer"] },
  tComm: { localFields: ["collectiveOpsPerLayer"], interconnectFields: ["linkBw"], usecaseFields: ["commEfficiency"] },
  totalTimePerToken: {
    siliconPeak: true, siliconBandwidth: true, usecaseFields: ["concurrency", "weightDtypeBytes", "gemmMfu", "commEfficiency"],
    localFields: ["tpDegree", "collectiveOpsPerLayer"], interconnectFields: ["linkBw"],
  },
};

// ── KV Cache — capacity & eviction model (from kv_capacity_eviction_model.xlsx) ─────────
// Two questions: (1) how many concurrent requests' KV cache fits in VRAM after weights and a
// reserve, at a given context length; (2) when a resident request has to be evicted to admit
// a new one, is it faster to write its KV out to an offload tier and read it back later, or
// just recompute it from scratch on resume. Every figure here is verified against the
// workbook's own displayed values (both its 8K and 64K context rows) before being ported.

export interface OffloadMedium {
  id: string;
  name: string;
  perCardBWGBs: number;
}

/** Reference per-card egress bandwidths from the workbook's Inputs sheet — editable in the UI,
 *  these are just the shipped defaults. Memory/storage-tier concerns, so rendered in orange. */
export const OFFLOAD_MEDIA: OffloadMedium[] = [
  { id: "ddr", name: "DDR (host)", perCardBWGBs: 50 },
  { id: "cxl", name: "CXL pool", perCardBWGBs: 40 },
  { id: "flash", name: "All-flash", perCardBWGBs: 10 },
];

export interface KvCacheConfig {
  /** Fraction of total VRAM reserved for activations/fragmentation, not available for KV. */
  reserveFraction: number;
  /** DDR and All-Flash are only reachable *over* the selected Interconnect (see the Memory
   *  panel) — these two are kept in sync with that link's bandwidth, not hand-edited. CXL is
   *  itself a point-to-point link, so it keeps its own independent spec. */
  ddrBWGBs: number;
  cxlBWGBs: number;
  flashBWGBs: number;
  /** How the placement strategy decides who stays resident in HBM (see KvPoolPlacementMode). */
  placementMode: "naive" | "park";
  /** Compute-bound cap on sequences actively decoding at once — under "park" mode this, not
   *  raw HBM capacity, is what limits residency; everything else parks in a pool tier. */
  decodeBatchSlots: number;
  ddrPoolGB: number;
  cxlPoolGB: number;
  flashPoolGB: number;
}

export const DEFAULT_KV_CACHE_CONFIG: KvCacheConfig = {
  reserveFraction: 0.10,
  ddrBWGBs: OFFLOAD_MEDIA[0].perCardBWGBs,
  cxlBWGBs: OFFLOAD_MEDIA[1].perCardBWGBs,
  flashBWGBs: OFFLOAD_MEDIA[2].perCardBWGBs,
  placementMode: "park",
  decodeBatchSlots: 12,
  ddrPoolGB: 256,
  cxlPoolGB: 1024,
  flashPoolGB: 4096,
};

export interface KvCacheBaseline {
  kvPerTokenBytes: number;
  weightsGB: number;
  vramTotalGB: number;
  reserveGB: number;
  kvBudgetGB: number;
  minCardsForWeights: number;
  ddrEgressAggGBs: number;
  cxlEgressAggGBs: number;
  flashEgressAggGBs: number;
}

/** `vramPerCardGB` comes from the selected Silicon; pass null (no silicon selected, or its
 *  capacity didn't parse) to still get the weight/token-size math with VRAM-dependent fields
 *  left at 0 — callers should treat a null-VRAM baseline as "select a silicon" territory. */
export function calcKvCacheBaseline(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, kv: KvCacheConfig, vramPerCardGB: number | null,
): KvCacheBaseline {
  const kvPerTokenBytes = 2 * arch.fullAttnLayers * arch.fullAttn.kvHeads * arch.fullAttn.headDim * usecase.kvDtypeBytes;
  const weightsGB = arch.totalParamsB * usecase.weightDtypeBytes;
  const vramTotalGB = (vramPerCardGB ?? 0) * tp.tpDegree;
  const reserveGB = vramTotalGB * kv.reserveFraction;
  const kvBudgetGB = vramTotalGB - weightsGB - reserveGB;
  const minCardsForWeights = vramPerCardGB && vramPerCardGB > 0 ? Math.ceil(weightsGB / vramPerCardGB) : 0;

  return {
    kvPerTokenBytes, weightsGB, vramTotalGB, reserveGB, kvBudgetGB, minCardsForWeights,
    ddrEgressAggGBs: kv.ddrBWGBs * tp.tpDegree,
    cxlEgressAggGBs: kv.cxlBWGBs * tp.tpDegree,
    flashEgressAggGBs: kv.flashBWGBs * tp.tpDegree,
  };
}

export interface KvCacheAtContext {
  contextTokens: number;
  /** The secondary attention variant's own KV contribution at this context — 0 for a plain
   *  dense transformer; the DeltaNet fixed state (O(1), constant across every context) for a
   *  DeltaNet hybrid; the capped sliding-window KV (grows until `window`, then flat) for a
   *  windowed hybrid. Broken out so the breakdown table can show it as its own row. */
  secondaryKvGB: number;
  kvPerReqGB: number;
  maxConcurrency: number;
  recomputeSec: number | null;
  ddrMs: number;
  cxlMs: number;
  flashMs: number;
  recomputeOverFlash: number | null;
}

/** `peakTflops` comes from the selected Silicon; pass null to still get capacity/concurrency
 *  (VRAM-only math) with the recompute-side fields left unset. */
export function calcKvCacheAtContext(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig,
  baseline: KvCacheBaseline, contextTokens: number, peakTflops: number | null,
): KvCacheAtContext {
  let secondaryKvBytes = 0;
  if (arch.secondary?.kind === "deltaNet") {
    secondaryKvBytes = arch.secondary.fixedStateMB * 1e6;
  } else if (arch.secondary?.kind === "windowed") {
    const s = arch.secondary;
    secondaryKvBytes = 2 * arch.secondaryLayers * s.kvHeads * s.headDim * usecase.kvDtypeBytes * Math.min(contextTokens, s.window);
  }
  const secondaryKvGB = secondaryKvBytes / 1e9;

  const kvPerReqBytes = baseline.kvPerTokenBytes * contextTokens + secondaryKvBytes;
  const kvPerReqGB = kvPerReqBytes / 1e9;
  const maxConcurrency = kvPerReqGB > 0 ? Math.max(0, Math.floor(baseline.kvBudgetGB / kvPerReqGB)) : 0;

  const N = arch.totalParamsB * 1e9;
  const prefillFlop =
    2 * N * contextTokens + 4 * arch.fullAttnLayers * (arch.fullAttn.qHeads * arch.fullAttn.headDim) * contextTokens ** 2;
  const recomputeSec = peakTflops && peakTflops > 0
    ? prefillFlop / (tp.tpDegree * peakTflops * 1e12 * usecase.gemmMfu)
    : null;

  const ddrMs = (kvPerReqGB / baseline.ddrEgressAggGBs) * 1000;
  const cxlMs = (kvPerReqGB / baseline.cxlEgressAggGBs) * 1000;
  const flashMs = (kvPerReqGB / baseline.flashEgressAggGBs) * 1000;
  const recomputeOverFlash = recomputeSec != null && flashMs > 0 ? (recomputeSec * 1000) / flashMs : null;

  return { contextTokens, secondaryKvGB, kvPerReqGB, maxConcurrency, recomputeSec, ddrMs, cxlMs, flashMs, recomputeOverFlash };
}

// ── KV Pool — occupancy & decode-aware parking ──────────────────────────────────────────
// A second, complementary question to the capacity/eviction model above: at the CURRENT
// concurrency, who actually needs to sit in HBM right now? Only the sequences in the active
// decode batch do — a compute-bound slot count, not a capacity-bound one. Everything else can
// be "parked" out to DDR → CXL → Flash and "promoted" back when its turn comes, freeing HBM at
// no latency cost as long as the park/promote round trip is faster than the queue wait a
// parked sequence would have sat through anyway. Built on top of calcKvCacheBaseline/
// calcKvCacheAtContext's own numbers (kvBudgetGB, kvPerReqGB) rather than re-deriving them.

export interface KvPoolOccupancy {
  seqKVGB: number;
  kvBudgetTotalGB: number;
  /** How many sequences HBM could hold by capacity alone, ignoring the decode-batch cap. */
  fitByCapacity: number;
  resident: number;
  /** True when "park" mode's batch-slot cap — not raw HBM capacity — is what's limiting residency. */
  computeCapped: boolean;
  parked: number;
  ddrSeq: number;
  cxlSeq: number;
  flashSeq: number;
  /** Parked sequences that don't fit in any pool tier either — nowhere to go. */
  unservedSeq: number;
  /** Sequences actually decoding right now (naive: same as resident; park: capped at decodeBatchSlots). */
  activeSlots: number;
  waiting: number;
  /** Seconds one decode slot is held for a full turn (outputTokens × per-token decode time). */
  slotHoldSec: number;
  /** Mean-field estimate of how long a waiting sequence sits before it gets a decode slot. */
  queueWaitSec: number;
  /** Per-sequence park/promote transfer time, one way, for each tier. */
  tDdrSec: number;
  tCxlSec: number;
  tFlashSec: number;
}

/** `decodeTimePerTokenMs` should come from calcDecode() run at the current active-slot count
 *  (not the full concurrency) — pass null if no silicon is selected yet, which zeroes out the
 *  queue-wait side of the model but leaves the capacity/placement math intact. */
export function calcKvPoolOccupancy(
  usecase: UsecaseInputs, kv: KvCacheConfig, baseline: KvCacheBaseline, atContext: KvCacheAtContext,
  decodeTimePerTokenMs: number | null,
): KvPoolOccupancy {
  const seqKVGB = atContext.kvPerReqGB;
  const conc = usecase.concurrency;
  const fitByCapacity = seqKVGB > 0 ? Math.floor(baseline.kvBudgetGB / seqKVGB) : 0;

  const resident = Math.max(0, kv.placementMode === "naive"
    ? Math.min(conc, fitByCapacity)
    : Math.min(conc, kv.decodeBatchSlots, fitByCapacity));
  const computeCapped = kv.placementMode === "park" && kv.decodeBatchSlots < fitByCapacity && conc > kv.decodeBatchSlots;

  const parked = Math.max(0, conc - resident);
  const ddrSeq = seqKVGB > 0 ? Math.min(parked, Math.floor(kv.ddrPoolGB / seqKVGB)) : 0;
  const cxlSeq = seqKVGB > 0 ? Math.min(parked - ddrSeq, Math.floor(kv.cxlPoolGB / seqKVGB)) : 0;
  const flashSeq = seqKVGB > 0 ? Math.min(parked - ddrSeq - cxlSeq, Math.floor(kv.flashPoolGB / seqKVGB)) : 0;
  const unservedSeq = parked - ddrSeq - cxlSeq - flashSeq;

  // Only resident sequences can actually be decoding — capacity is always the outer bound,
  // even in "park" mode where decodeBatchSlots is usually the tighter one.
  const activeSlots = resident;
  const waiting = Math.max(0, conc - activeSlots);
  const slotHoldSec = decodeTimePerTokenMs != null ? (decodeTimePerTokenMs / 1000) * usecase.outputTokens : 0;
  const queueWaitSec = activeSlots > 0 ? (waiting / activeSlots) * slotHoldSec : 0;

  return {
    seqKVGB, kvBudgetTotalGB: baseline.kvBudgetGB, fitByCapacity, resident, computeCapped, parked,
    ddrSeq, cxlSeq, flashSeq, unservedSeq, activeSlots, waiting, slotHoldSec, queueWaitSec,
    tDdrSec: kv.ddrBWGBs > 0 ? seqKVGB / kv.ddrBWGBs : 0,
    tCxlSec: kv.cxlBWGBs > 0 ? seqKVGB / kv.cxlBWGBs : 0,
    tFlashSec: kv.flashBWGBs > 0 ? seqKVGB / kv.flashBWGBs : 0,
  };
}

// ── click-to-highlight for KV Cache — mirrors DECODE_ROW_HIGHLIGHTS above. Silicon memory
// capacity is a new highlight target (Decode only ever needed bandwidth), so it gets its own
// `siliconCapacity` flag alongside the existing `siliconBandwidth`/`siliconPeak`. ─────────────

export type KvCacheRowKey =
  | "kvPerToken" | "weights" | "vramTotal" | "reserve" | "kvBudget" | "minCardsForWeights"
  | "ddrEgress" | "cxlEgress" | "flashEgress";

export interface KvCacheRowHighlights {
  archAbbrevs?: string[];
  usecaseFields?: (keyof UsecaseInputs)[];
  siliconCapacity?: boolean;
  /** TP-degree ("Cards") — the one TpConfig field the KV Cache math reads. */
  tpDegreeField?: boolean;
  /** Reserve fraction / per-tier bandwidth — the inline inputs on the KV Cache card itself. */
  kvConfigFields?: (keyof KvCacheConfig)[];
}

export const KV_CACHE_ROW_HIGHLIGHTS: Record<KvCacheRowKey, KvCacheRowHighlights> = {
  kvPerToken: { archAbbrevs: [ABBR.n_fa, ABBR.n_kv, ABBR.d_head], usecaseFields: ["kvDtypeBytes"] },
  weights: { archAbbrevs: [ABBR.N], usecaseFields: ["weightDtypeBytes"] },
  vramTotal: { siliconCapacity: true, tpDegreeField: true },
  reserve: { siliconCapacity: true, tpDegreeField: true, kvConfigFields: ["reserveFraction"] },
  kvBudget: { siliconCapacity: true, tpDegreeField: true },
  minCardsForWeights: { siliconCapacity: true },
  ddrEgress: { tpDegreeField: true, kvConfigFields: ["ddrBWGBs"] },
  cxlEgress: { tpDegreeField: true, kvConfigFields: ["cxlBWGBs"] },
  flashEgress: { tpDegreeField: true, kvConfigFields: ["flashBWGBs"] },
};

// ── Analysis — cross-stage time breakdown swept across concurrency ─────────────────────
// Answers "as concurrency scales from 1 up, how does the time split across Prefill/Decode/
// KV-Cache shift, and within each, across Compute/Memory/Interconnect (and within Prefill's
// Compute, across FFN/Attention/DeltaNet)?" — the point being to show when the selected
// silicon's TFLOPS vs. memory bandwidth vs. interconnect speed each start to dominate.
// Reuses every existing calc function unchanged — just re-runs them at each concurrency step
// and re-labels/re-groups their already-computed fields; no new formulas are introduced here.

/** Reference concurrency ladder the Analysis view sweeps over. */
export const ANALYSIS_CONCURRENCY_SWEEP = [1, 2, 4, 8, 16, 32, 64];

export interface AnalysisComputeSub {
  ffnMs: number;
  attentionMs: number;
  /** 0 for a windowed-hybrid or plain dense model — only DeltaNet models have this bucket. */
  deltaNetMs: number;
}

export interface AnalysisBreakdown {
  computeMs: number;
  /** 0 for Prefill — its weight reads are amortized/overlapped by construction (compute-bound assumption), so no separate memory-time bucket is modeled for it. */
  memoryMs: number;
  interconnectMs: number;
  totalMs: number;
  /** Only present for Prefill — Decode's compute is a single lumped term, not split by component. */
  computeSub?: AnalysisComputeSub;
}

export interface AnalysisKvBreakdown {
  /** Whether this concurrency exceeds the KV budget at the current context length — below
   *  capacity, no eviction is needed and this stage contributes 0. */
  overCapacity: boolean;
  recomputeMs: number | null;
  fastestReadBackMs: number | null;
  fastestMedium: "DDR" | "CXL" | "Flash" | null;
  /** The realistic modeled cost: min(recomputeMs, fastestReadBackMs) — a real system picks
   *  whichever is faster (per the KV Cache section's own conclusion, read-back always wins). 0 if not overCapacity. */
  totalMs: number;
}

export interface AnalysisPoint {
  concurrency: number;
  prefill: AnalysisBreakdown;
  decode: AnalysisBreakdown;
  kvCache: AnalysisKvBreakdown;
  totalMs: number;
}

/** `vramPerCardGB` comes from the selected Silicon, same as the KV Cache section. Every other
 *  input mirrors what Prefill/Prefill-TP/Decode/KV-Cache already take — this just re-runs them
 *  at each concurrency in ANALYSIS_CONCURRENCY_SWEEP with everything else (arch, token lengths,
 *  TP, silicon, delta config) held at the caller's current settings. */
export function calcAnalysisSweep(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, deltaCfg: DeltaNetPrefillConfig, kv: KvCacheConfig,
  peakTflops: number | null, memBandwidthGBs: number | null, linkBwGBs: number | null, vramPerCardGB: number | null,
): AnalysisPoint[] {
  return ANALYSIS_CONCURRENCY_SWEEP.map(concurrency => {
    const u: UsecaseInputs = { ...usecase, concurrency };

    // ── Prefill: compute (GEMM + delta) and interconnect come straight out of calcPrefillTp;
    // FFN/Attention/DeltaNet sub-shares are allocated proportionally from calcPrefill's own
    // TFLOPS breakdown, since every GEMM-side term shares the same (peak × MFU × TP) denominator.
    const prefillResult = calcPrefill(arch, u, deltaCfg, peakTflops);
    const prefillTp = calcPrefillTp(arch, u, tp, deltaCfg, peakTflops, prefillResult);
    const gemmFlopsTflops =
      prefillResult.ffnTermTflops + prefillResult.fullAttnProjTermTflops + prefillResult.fullAttnQuadraticTermTflops
      + prefillResult.secondaryProjTermTflops + (arch.secondary?.kind === "windowed" ? prefillResult.secondaryComputeTermTflops : 0);
    const gemmComputeMs = (prefillTp.perGpuComputeTimeSec ?? 0) * 1000;
    const attentionTflops =
      prefillResult.fullAttnProjTermTflops + prefillResult.fullAttnQuadraticTermTflops + prefillResult.secondaryProjTermTflops
      + (arch.secondary?.kind === "windowed" ? prefillResult.secondaryComputeTermTflops : 0);
    const ffnMs = gemmFlopsTflops > 0 ? gemmComputeMs * (prefillResult.ffnTermTflops / gemmFlopsTflops) : 0;
    const attentionMs = gemmFlopsTflops > 0 ? gemmComputeMs * (attentionTflops / gemmFlopsTflops) : 0;
    const deltaNetMs = ((prefillTp.perGpuDeltaComputeTimeSec ?? 0) + (prefillTp.deltaFixedOverheadSec ?? 0)) * 1000;

    const prefill: AnalysisBreakdown = {
      computeMs: gemmComputeMs + deltaNetMs,
      memoryMs: 0,
      interconnectMs: (prefillTp.commTimeSec ?? 0) * 1000,
      totalMs: (prefillTp.wallClockSec ?? 0) * 1000,
      computeSub: { ffnMs, attentionMs, deltaNetMs },
    };

    // ── Decode: t_mem/t_compute/t_comm are already exactly Memory/Compute/Interconnect — just
    // scale each per-token figure up by outputTokens for "total decode-phase time for this request".
    const decodeResult = calcDecode(arch, u, tp, peakTflops, memBandwidthGBs, linkBwGBs);
    const outTok = u.outputTokens;
    const decode: AnalysisBreakdown = {
      computeMs: (decodeResult.tComputeMs ?? 0) * outTok,
      memoryMs: (decodeResult.tMemMs ?? 0) * outTok,
      interconnectMs: (decodeResult.tCommMs ?? 0) * outTok,
      totalMs: (decodeResult.totalTimePerTokenMs ?? 0) * outTok,
    };

    // ── KV-Cache: 0 unless this concurrency exceeds the budget at the current context length,
    // in which case the realistic cost is whichever of recompute/read-back is faster.
    const baseline = calcKvCacheBaseline(arch, u, tp, kv, vramPerCardGB);
    const atContext = calcKvCacheAtContext(arch, u, tp, baseline, u.decodeContextLen, peakTflops);
    const overCapacity = concurrency > atContext.maxConcurrency;
    let kvCache: AnalysisKvBreakdown;
    if (!overCapacity) {
      kvCache = { overCapacity: false, recomputeMs: null, fastestReadBackMs: null, fastestMedium: null, totalMs: 0 };
    } else {
      const recomputeMs = atContext.recomputeSec != null ? atContext.recomputeSec * 1000 : null;
      const tiers: [medium: "DDR" | "CXL" | "Flash", ms: number][] = [["DDR", atContext.ddrMs], ["CXL", atContext.cxlMs], ["Flash", atContext.flashMs]];
      const [fastestMedium, fastestReadBackMs] = tiers.reduce((a, b) => (b[1] < a[1] ? b : a));
      const totalMs = recomputeMs != null ? Math.min(recomputeMs, fastestReadBackMs) : fastestReadBackMs;
      kvCache = { overCapacity: true, recomputeMs, fastestReadBackMs, fastestMedium, totalMs };
    }

    return { concurrency, prefill, decode, kvCache, totalMs: prefill.totalMs + decode.totalMs + kvCache.totalMs };
  });
}
