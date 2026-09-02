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
  achievableEfficiency: number;
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
  achievableEfficiency: 0.45,
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
  total: ["concurrency", "inputTokens", "achievableEfficiency"],
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

/** `peakTflops` comes from the selected Silicon; `usecase.achievableEfficiency` is the fraction
 *  of it real kernels hit. Pass `peakTflops: null` (no silicon selected, or its peak figure
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
    estimatedComputeTimeSec = totalTflops / (peakTflops * usecase.achievableEfficiency);
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
  const eff = usecase.achievableEfficiency;
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
    if (linkBwGBs) bwTermSec = ((2 * (tp.tpDegree - 1)) / tp.tpDegree) * (allReduceMsgGB / linkBwGBs);
  }
  const commTimeSec = tp.tpDegree > 1 && !linkBwGBs ? null : numAllReduces * (bwTermSec + latencyTermSec);

  const wallClockSec = perGpuComputeTimeSec != null && commTimeSec != null ? perGpuComputeTimeSec + commTimeSec : null;
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
  singleGpu: { siliconPeak: true, usecaseFields: ["achievableEfficiency"] },
  perGpu: { siliconPeak: true, usecaseFields: ["achievableEfficiency"], localFields: ["tpDegree"] },
  msgSize: { archAbbrevs: [ABBR.d_model], usecaseFields: ["concurrency", "inputTokens"], localFields: ["activationDtypeBytes"] },
  numAllReduces: { archAbbrevs: [ABBR.n_layers], localFields: ["collectiveOpsPerLayer"] },
  bwTerm: { localFields: ["tpDegree"], interconnectFields: ["linkBw"] },
  latencyTerm: { localFields: ["tpDegree"], interconnectFields: ["latency"] },
  commTime: { localFields: ["collectiveOpsPerLayer"], interconnectFields: ["linkBw", "latency"] },
  wallClock: {
    siliconPeak: true, usecaseFields: ["achievableEfficiency"],
    localFields: ["tpDegree", "collectiveOpsPerLayer"], interconnectFields: ["linkBw", "latency"],
  },
};
