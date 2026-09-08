/** Data + formulas backing the Models → Deep Analysis tab. Ported 1:1 from the Qwen3.8-27B
 *  sizing-model workbook (public/Qwen3.8-27B_Sizing_Model.xlsx) — every constant and formula
 *  below is reproduced exactly from that file's "Model Architecture" / "Prefill TFLOPs" sheets,
 *  so results here should match the workbook cell-for-cell given the same inputs. */

import type { ComparisonChip, DataType } from "@/modules/silicon/comparison-data";

// ── symbol abbreviations — the single source of truth for every element's short form, so the
// Architecture panel and every formula elsewhere (Prefill today; Decode/KV Cache/Persistent
// Memory as they're built) always reference the model in the same notation. ───────────────

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
  MTP: "MTP",
  c: "c",
} as const;

/** Every FLOPs figure in this module is expressed in TFLOPS (rate) and every memory figure in
 *  GiB — this is the one place both conversions live so every section stays consistent. */
export const TFLOPS = 1e12;
export const GIB = 1024 ** 3;
export function bytesToGiB(bytes: number): number { return bytes / GIB; }

// ── model architecture (static — specific to Qwen3.8-27B) ──────────────────────────────

export interface ModelArchitecture {
  name: string;
  sourceUrl: string;
  totalParamsB: number;
  totalLayers: number;
  fullAttnLayers: number;
  deltaNetLayers: number;
  hiddenDim: number;
  ffnIntermediateDim: number;
  vocabSize: number;
  nativeContextLen: number;
  extendedContextLen: number;
  fullAttn: { qHeads: number; kvHeads: number; headDim: number; ropeDim: number };
  deltaNet: { vHeads: number; qkHeads: number; headDim: number };
  multiTokenPrediction: boolean;
  deltaNetKernelConstant: number;
  /** Fixed-size recurrent state per DeltaNet layer's resident sequence — O(1) in context length,
   *  unlike the full-attention KV cache. From kv_capacity_eviction_model.xlsx's Inputs sheet. */
  deltaNetFixedStateMB: number;
}

export const QWEN_3_8_27B: ModelArchitecture = {
  name: "Qwen3.8-27B",
  sourceUrl: "huggingface.co/Qwen/Qwen3.8-27B",
  totalParamsB: 27.8,
  totalLayers: 64,
  fullAttnLayers: 16,
  deltaNetLayers: 48,
  hiddenDim: 5120,
  ffnIntermediateDim: 17408,
  vocabSize: 248320,
  nativeContextLen: 262144,
  extendedContextLen: 1000000,
  fullAttn: { qHeads: 24, kvHeads: 4, headDim: 256, ropeDim: 64 },
  deltaNet: { vHeads: 48, qkHeads: 16, headDim: 128 },
  multiTokenPrediction: true,
  // Approximates the extra matmuls in the chunked delta-rule update (correction/beta gate,
  // chunk-local state, output readout). Kernel-dependent — validate against a profiled kernel.
  deltaNetKernelConstant: 5,
  deltaNetFixedStateMB: 75,
};

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
  overheadFraction: number;
  /** Prefill Efficiency Stack (calibrated against measured TTFT — see Qwen3.8-27B_Sizing_Model_Calliberated.xlsx's
   *  "Prefill Calibration" sheet). Replaces the old single flat "achievable efficiency": a FLOP-only
   *  model badly underestimates prefill wall-clock on this hybrid architecture because the 48
   *  memory-bound / low-MFU Gated DeltaNet layers, convs, norms, gates and RoPE burn far more
   *  wall-clock than their tiny FLOP share. */
  /** Best-case dense-GEMM MFU on the selected silicon — a microbenchmark number. */
  gemmMfu: number;
  /** Everything a FLOP-only model misses on the compute side beyond the GEMM ceiling (DeltaNet
   *  scan layers, norms, gates, RoPE, kernel-launch + stack overhead). Fit to reproduce measured TTFT. */
  hybridStackDerate: number;
  /** Fraction of theoretical link bandwidth the all-reduce collective actually realizes — applies
   *  to Prefill-TP's communication time only, separate from the compute-side derate above. */
  commEfficiency: number;
}

export const DEFAULT_USECASE_INPUTS: UsecaseInputs = {
  concurrency: 32,
  inputTokens: 8192,
  outputTokens: 1024,
  decodeContextLen: 9216,
  decodeContextLenAuto: true,
  weightDtypeBytes: 2,
  kvDtypeBytes: 1,
  overheadFraction: 0.12,
  gemmMfu: 0.7,
  hybridStackDerate: 0.64,
  commEfficiency: 0.85,
};

/** GEMM MFU × hybrid+stack derate — the fraction of peak TFLOPS the compute side actually
 *  sustains before communication/overhead, used everywhere the old flat `achievableEfficiency`
 *  used to be (Prefill compute time, Prefill-TP compute time, KV-Cache eviction recompute). */
export function getEffectiveComputeMfu(usecase: UsecaseInputs): number {
  return usecase.gemmMfu * usecase.hybridStackDerate;
}

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

// ── prefill FLOPs / TFLOPS calculation (from the "Prefill TFLOPs" sheet) ───────────────

export type PrefillRowKey = "dense" | "fullAttn" | "deltaNet" | "total";

/** Which Architecture symbols each Prefill row's formula actually reads — drives the
 *  click-to-highlight link from the Prefill table back to the Architecture panel. */
export const PREFILL_ROW_SYMBOLS: Record<PrefillRowKey, string[]> = {
  dense: [ABBR.N, ABBR.L, ABBR.B],
  fullAttn: [ABBR.n_q, ABBR.d_head, ABBR.L, ABBR.B, ABBR.n_fa],
  deltaNet: [ABBR.c, ABBR.n_v, ABBR.d_dn, ABBR.L, ABBR.B, ABBR.n_dn],
  total: [ABBR.N, ABBR.L, ABBR.B, ABBR.n_q, ABBR.d_head, ABBR.n_fa, ABBR.c, ABBR.n_v, ABBR.d_dn, ABBR.n_dn],
};

/** Which Use Case inputs each Prefill row's formula actually reads — same click-to-highlight
 *  link as PREFILL_ROW_SYMBOLS, but into the Use Case panel instead of Architecture. Every term
 *  reads concurrency/input tokens; only the Total row's compute-time/achieved-TFLOPS figures
 *  additionally depend on the achievable-efficiency input. */
export const PREFILL_ROW_USECASE_FIELDS: Record<PrefillRowKey, (keyof UsecaseInputs)[]> = {
  dense: ["concurrency", "inputTokens"],
  fullAttn: ["concurrency", "inputTokens"],
  deltaNet: ["concurrency", "inputTokens"],
  total: ["concurrency", "inputTokens", "gemmMfu", "hybridStackDerate"],
};

/** Only the Total row's compute-time/achieved-TFLOPS figures depend on the selected silicon's
 *  peak throughput — the raw FLOP terms are silicon-independent. */
export const PREFILL_ROW_USES_SILICON_PEAK: Record<PrefillRowKey, boolean> = {
  dense: false,
  fullAttn: false,
  deltaNet: false,
  total: true,
};

export interface PrefillResult {
  /** All *Tflops fields are in TFLOPS (i.e. already divided by 1e12) — see the TFLOPS constant above. */
  denseTermTflops: number;
  fullAttnTermTflops: number;
  deltaNetTermTflops: number;
  totalTflops: number;
  estimatedComputeTimeSec: number | null;
  achievedTflops: number | null;
}

/** `peakTflops` comes from the selected Silicon; `getEffectiveComputeMfu(usecase)` (GEMM MFU ×
 *  hybrid+stack derate) is the fraction of it real kernels hit — see UsecaseInputs' Prefill
 *  Efficiency Stack fields. Pass `peakTflops: null` (no silicon selected, or its peak figure
 *  didn't parse) to still get the FLOPS breakdown with time/achieved-throughput left unset. */
export function calcPrefill(arch: ModelArchitecture, usecase: UsecaseInputs, peakTflops: number | null): PrefillResult {
  const N = arch.totalParamsB * 1e9;
  const L = usecase.inputTokens;
  const B = usecase.concurrency;
  const { qHeads, headDim } = arch.fullAttn;

  const denseTermTflops = (2 * N * L * B) / TFLOPS;
  const fullAttnTermTflops = (2 * qHeads * headDim * L * L * B * arch.fullAttnLayers) / TFLOPS;
  const deltaNetTermTflops =
    (arch.deltaNetKernelConstant * arch.deltaNet.vHeads * arch.deltaNet.headDim ** 2 * L * B * arch.deltaNetLayers) / TFLOPS;

  const totalTflops = denseTermTflops + fullAttnTermTflops + deltaNetTermTflops;

  let estimatedComputeTimeSec: number | null = null;
  let achievedTflops: number | null = null;
  if (peakTflops && peakTflops > 0) {
    estimatedComputeTimeSec = totalTflops / (peakTflops * getEffectiveComputeMfu(usecase));
    achievedTflops = totalTflops / estimatedComputeTimeSec;
  }

  return { denseTermTflops, fullAttnTermTflops, deltaNetTermTflops, totalTflops, estimatedComputeTimeSec, achievedTflops };
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
  tpDegree: 8,
  interconnectId: "nvlink4",
  collectiveOpsPerLayer: 2,
  activationDtypeBytes: 2,
};

export interface PrefillTpResult {
  singleGpuTflops: number;
  singleGpuTimeSec: number | null;
  perGpuTflops: number;
  perGpuComputeTimeSec: number | null;
  /** Everything from here down is the communication side — rendered in green in the UI. */
  allReduceMsgGB: number;
  numAllReduces: number;
  bwTermSec: number;
  latencyTermSec: number;
  commTimeSec: number | null;
  wallClockSec: number | null;
  speedup: number | null;
  parallelEfficiency: number | null;
  regime: "Compute-bound scaling" | "Communication-bound" | null;
}

/** `totalPrefillTflops` is `calcPrefill(...).totalTflops` for the same architecture/usecase —
 *  passed in rather than recomputed so callers that already have it don't do the work twice. */
export function calcPrefillTp(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, peakTflops: number | null, totalPrefillTflops: number
): PrefillTpResult {
  const B = usecase.concurrency;
  const L = usecase.inputTokens;
  const eff = getEffectiveComputeMfu(usecase);
  const link = INTERCONNECTS.find(i => i.id === tp.interconnectId);
  const linkBwGBs = link?.linkBwGBs ?? null;
  const latencyUs = link?.latencyUsPerHop ?? 0;

  const singleGpuTflops = totalPrefillTflops;
  const singleGpuTimeSec = peakTflops && peakTflops > 0 ? singleGpuTflops / (peakTflops * eff) : null;

  const perGpuTflops = singleGpuTflops / tp.tpDegree;
  const perGpuComputeTimeSec = peakTflops && peakTflops > 0 ? perGpuTflops / (peakTflops * eff) : null;

  const allReduceMsgGB = (B * L * arch.hiddenDim * tp.activationDtypeBytes) / 1e9;
  const numAllReduces = tp.collectiveOpsPerLayer * arch.totalLayers;

  let bwTermSec = 0;
  let latencyTermSec = 0;
  if (tp.tpDegree > 1) {
    latencyTermSec = (2 * (tp.tpDegree - 1) * latencyUs) / 1e6;
    // Effective link BW is derated by the realized comm efficiency (real NCCL/oneCCL achieves
    // ~70-85% of theoretical), not the full theoretical link bandwidth.
    if (linkBwGBs) bwTermSec = ((2 * (tp.tpDegree - 1)) / tp.tpDegree) * (allReduceMsgGB / (linkBwGBs * usecase.commEfficiency));
  }
  const commTimeSec = tp.tpDegree > 1 && !linkBwGBs ? null : numAllReduces * (bwTermSec + latencyTermSec);

  // All-reduce is a hard sync point in vanilla TP (compute + comm additive), then runtime/workspace
  // overhead is applied on top — previously omitted from the Prefill-TP wall-clock.
  const wallClockSec = perGpuComputeTimeSec != null && commTimeSec != null
    ? (perGpuComputeTimeSec + commTimeSec) * (1 + usecase.overheadFraction)
    : null;
  const speedup = singleGpuTimeSec != null && wallClockSec != null && wallClockSec > 0 ? singleGpuTimeSec / wallClockSec : null;
  const parallelEfficiency = speedup != null ? speedup / tp.tpDegree : null;
  const regime = commTimeSec != null && perGpuComputeTimeSec != null
    ? (commTimeSec > perGpuComputeTimeSec ? "Communication-bound" : "Compute-bound scaling")
    : null;

  return {
    singleGpuTflops, singleGpuTimeSec, perGpuTflops, perGpuComputeTimeSec,
    allReduceMsgGB, numAllReduces, bwTermSec, latencyTermSec, commTimeSec,
    wallClockSec, speedup, parallelEfficiency, regime,
  };
}

export const TP_SWEEP_DEGREES = [1, 2, 4, 8, 16];

/** The "TP sweep" table — same calculation at a fixed ladder of TP degrees, independent of
 *  the currently-selected TP, to show where communication starts eating the scaling gains. */
export function calcPrefillTpSweep(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, peakTflops: number | null, totalPrefillTflops: number
): (PrefillTpResult & { tpDegree: number })[] {
  return TP_SWEEP_DEGREES.map(tpDegree => ({
    tpDegree,
    ...calcPrefillTp(arch, usecase, { ...tp, tpDegree }, peakTflops, totalPrefillTflops),
  }));
}

// ── click-to-highlight: which inputs each Prefill-TP row's formula actually reads ──────
// Mirrors PREFILL_ROW_SYMBOLS/PREFILL_ROW_USECASE_FIELDS above, but for the Prefill-TP
// table, and split out by WHERE each dependency lives so the UI can color interconnect
// dependencies green and everything else the usual cyan.

export type TpRowKey = "singleGpu" | "perGpu" | "msgSize" | "numAllReduces" | "bwTerm" | "latencyTerm" | "commTime" | "wallClock";

export interface TpRowHighlights {
  archAbbrevs?: string[];
  usecaseFields?: (keyof UsecaseInputs)[];
  siliconPeak?: boolean;
  /** Interconnect-panel rows this Prefill-TP row's formula reads — rendered in green. */
  interconnectFields?: ("linkBw" | "latency")[];
  /** TP-config inputs rendered inline on the Prefill-TP card itself (not in the rail). */
  localFields?: (keyof TpConfig)[];
}

export const TP_ROW_HIGHLIGHTS: Record<TpRowKey, TpRowHighlights> = {
  singleGpu: { siliconPeak: true, usecaseFields: ["gemmMfu", "hybridStackDerate"] },
  perGpu: { siliconPeak: true, usecaseFields: ["gemmMfu", "hybridStackDerate"], localFields: ["tpDegree"] },
  msgSize: { archAbbrevs: [ABBR.d_model], usecaseFields: ["concurrency", "inputTokens"], localFields: ["activationDtypeBytes"] },
  numAllReduces: { archAbbrevs: [ABBR.n_layers], localFields: ["collectiveOpsPerLayer"] },
  bwTerm: { localFields: ["tpDegree"], interconnectFields: ["linkBw"], usecaseFields: ["commEfficiency"] },
  latencyTerm: { localFields: ["tpDegree"], interconnectFields: ["latency"] },
  commTime: { localFields: ["collectiveOpsPerLayer"], interconnectFields: ["linkBw", "latency"], usecaseFields: ["commEfficiency"] },
  wallClock: {
    siliconPeak: true, usecaseFields: ["gemmMfu", "hybridStackDerate", "commEfficiency", "overheadFraction"],
    localFields: ["tpDegree", "collectiveOpsPerLayer"], interconnectFields: ["linkBw", "latency"],
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
  const N = arch.totalParamsB * 1e9;
  const B = usecase.concurrency;
  const bytesPerParam = usecase.weightDtypeBytes;
  const X = tp.tpDegree;

  const totalWeightBytes = N * bytesPerParam;
  const weightBytesPerDevice = totalWeightBytes / X;
  const weightGBPerDevice = weightBytesPerDevice / 1e9;
  const tMemMs = memBandwidthGBs && memBandwidthGBs > 0 ? (weightBytesPerDevice / (memBandwidthGBs * 1e9)) * 1000 : null;

  const totalDecodeFlops = 2 * N * B;
  const flopsPerDevice = totalDecodeFlops / X;
  const tComputeMs = peakTflops && peakTflops > 0 ? (flopsPerDevice / (peakTflops * 1e12)) * 1000 : null;

  const allReduceMsgBytes = B * arch.hiddenDim * bytesPerParam;
  const ringFactor = X > 1 ? (2 * (X - 1)) / X : 0;
  const timePerAllReduceMs =
    X <= 1 ? 0 : linkBwGBs && linkBwGBs > 0 ? ((ringFactor * allReduceMsgBytes) / (linkBwGBs * 1e9)) * 1000 : null;
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
    qkHeadShardingOk: X <= arch.deltaNet.qkHeads,
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
  tCompute: { siliconPeak: true },
  msgBytes: { archAbbrevs: [ABBR.d_model], usecaseFields: ["concurrency", "weightDtypeBytes"] },
  ringFactor: { localFields: ["tpDegree"] },
  timePerAllReduce: { localFields: ["tpDegree"], interconnectFields: ["linkBw"] },
  syncPoints: { archAbbrevs: [ABBR.n_layers], localFields: ["collectiveOpsPerLayer"] },
  tComm: { localFields: ["collectiveOpsPerLayer"], interconnectFields: ["linkBw"] },
  totalTimePerToken: {
    siliconPeak: true, siliconBandwidth: true, usecaseFields: ["concurrency", "weightDtypeBytes"],
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
  ddrBWGBs: number;
  cxlBWGBs: number;
  flashBWGBs: number;
}

export const DEFAULT_KV_CACHE_CONFIG: KvCacheConfig = {
  reserveFraction: 0.10,
  ddrBWGBs: OFFLOAD_MEDIA[0].perCardBWGBs,
  cxlBWGBs: OFFLOAD_MEDIA[1].perCardBWGBs,
  flashBWGBs: OFFLOAD_MEDIA[2].perCardBWGBs,
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
  const kvPerReqBytes = baseline.kvPerTokenBytes * contextTokens + arch.deltaNetFixedStateMB * 1e6;
  const kvPerReqGB = kvPerReqBytes / 1e9;
  const maxConcurrency = kvPerReqGB > 0 ? Math.max(0, Math.floor(baseline.kvBudgetGB / kvPerReqGB)) : 0;

  const N = arch.totalParamsB * 1e9;
  const prefillFlop =
    2 * N * contextTokens + 4 * arch.fullAttnLayers * (arch.fullAttn.qHeads * arch.fullAttn.headDim) * contextTokens ** 2;
  const recomputeSec = peakTflops && peakTflops > 0
    ? prefillFlop / (tp.tpDegree * peakTflops * 1e12 * getEffectiveComputeMfu(usecase))
    : null;

  const ddrMs = (kvPerReqGB / baseline.ddrEgressAggGBs) * 1000;
  const cxlMs = (kvPerReqGB / baseline.cxlEgressAggGBs) * 1000;
  const flashMs = (kvPerReqGB / baseline.flashEgressAggGBs) * 1000;
  const recomputeOverFlash = recomputeSec != null && flashMs > 0 ? (recomputeSec * 1000) / flashMs : null;

  return { contextTokens, kvPerReqGB, maxConcurrency, recomputeSec, ddrMs, cxlMs, flashMs, recomputeOverFlash };
}

/** The reference context-length ladder the workbook itself sweeps (in thousands of tokens). */
export const KV_CACHE_CONTEXT_SWEEP_K = [8, 16, 32, 64];

export function calcKvCacheSweep(
  arch: ModelArchitecture, usecase: UsecaseInputs, tp: TpConfig, baseline: KvCacheBaseline, peakTflops: number | null,
): KvCacheAtContext[] {
  return KV_CACHE_CONTEXT_SWEEP_K.map(k => calcKvCacheAtContext(arch, usecase, tp, baseline, k * 1000, peakTflops));
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
