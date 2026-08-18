/** Pure calculations mirroring the "Offload vs Recompute" sheet of
 *  intel_catalog_kv_offload_sizing-17Aug.xlsx. Single sequence (concurrency = 1) —
 *  concurrency scales both the KV-load side and the recompute side equally, so it
 *  cancels out of the crossover and is left out of these formulas on purpose. */

import type { OffloadModelRef } from "./kv-offload-data";
import { WRITE_TO_GPU_BW_GBPS } from "./kv-offload-data";

export interface OffloadLevers {
  model: OffloadModelRef;
  peakAccelTFLOPS: number;
  kvBytesPerElement: number; // 2 = FP16/BF16, 1 = FP8, 0.5 = INT4
  mfu: number;               // achieved efficiency, fraction of peak sustained
  causalFactor: number;      // 0.5 = causal mask halves QK^T/AV work
}

export interface DerivedParams {
  qWidth: number;                 // Q heads x head dim
  kvBytesPerTokLayer: number;     // 2 x kv_heads x head_dim x bytes/element
  achievedTFLOPS: number;         // peak x mfu
}

export function deriveParams(l: OffloadLevers): DerivedParams {
  const qWidth = l.model.qHeads * l.model.headDim;
  const kvBytesPerTokLayer = 2 * l.model.kvHeads * l.model.headDim * l.kvBytesPerElement;
  const achievedTFLOPS = l.peakAccelTFLOPS * l.mfu;
  return { qWidth, kvBytesPerTokLayer, achievedTFLOPS };
}

/** Cached token-layers for a context length T: dense layers cache the full sequence;
 *  window layers cache only min(T, window). windowSize is 0 for pure-dense models
 *  (windowLayers is 0 too in that case), so it's guarded rather than fed into min(). */
function cachedTokenLayersSafe(model: OffloadModelRef, T: number): number {
  const windowContribution = model.windowLayers > 0 ? model.windowLayers * Math.min(T, model.windowSize) : 0;
  return model.denseLayers * T + windowContribution;
}

export function kvSizeGiB(l: OffloadLevers, d: DerivedParams, T: number): number {
  return (d.kvBytesPerTokLayer * cachedTokenLayersSafe(l.model, T)) / 1073741824;
}

/** Prefill FLOPs (raw, not /1e12): 2 x P_active x T (projections + MLP/experts, linear)
 *  + 4 x causal x d_q x [dense_L x T^2 + window_L x T x min(T,window)] (attention, quadratic). */
function prefillFlopsRaw(l: OffloadLevers, d: DerivedParams, T: number): number {
  const linear = 2 * l.model.activeParamsB * 1e9 * T;
  const windowTerm = l.model.windowLayers > 0 ? l.model.windowLayers * T * Math.min(T, l.model.windowSize) : 0;
  const quadratic = 4 * l.causalFactor * d.qWidth * (l.model.denseLayers * T * T + windowTerm);
  return linear + quadratic;
}

export function prefillTFLOP(l: OffloadLevers, d: DerivedParams, T: number): number {
  return prefillFlopsRaw(l, d, T) / 1e12;
}

export function recomputeMs(l: OffloadLevers, d: DerivedParams, T: number, tflops = d.achievedTFLOPS): number {
  return (prefillFlopsRaw(l, d, T) / (tflops * 1e12)) * 1000;
}

/** Read time from a medium, in ms. */
export function readMs(l: OffloadLevers, d: DerivedParams, T: number, mediaBwGBps: number): number {
  return ((d.kvBytesPerTokLayer * cachedTokenLayersSafe(l.model, T)) / (mediaBwGBps * 1e9)) * 1000;
}

/** Write-to-GPU leg, in ms — paid on top of every read, same PCIe cost regardless of source medium. */
export function writeToGpuMs(l: OffloadLevers, d: DerivedParams, T: number): number {
  return readMs(l, d, T, WRITE_TO_GPU_BW_GBPS);
}

/** Total load time (serial read + write) for a given medium, in ms. A pipelined DMA
 *  overlaps read/write instead, so this is the conservative (serial) floor. */
export function totalLoadMs(l: OffloadLevers, d: DerivedParams, T: number, mediaBwGBps: number): number {
  return readMs(l, d, T, mediaBwGBps) + writeToGpuMs(l, d, T);
}

export interface ContextRow {
  contextTokens: number;
  kvGiB: number;
  prefillTFLOP: number;
  recomputeMs: number;
  mediaLoadMs: { key: string; name: string; totalMs: number }[];
  fastestMedia: { key: string; name: string; totalMs: number };
  offloadWins: boolean;
  speedupFactor: number; // always >= 1, the winning side's multiple over the losing side
}

export function buildContextRow(
  l: OffloadLevers, d: DerivedParams, T: number,
  media: { key: string; name: string; readBwGBps: number }[],
): ContextRow {
  const kvGiB = kvSizeGiB(l, d, T);
  const pf = prefillTFLOP(l, d, T);
  const rMs = recomputeMs(l, d, T);
  const mediaLoadMs = media.map(m => ({ key: m.key, name: m.name, totalMs: totalLoadMs(l, d, T, m.readBwGBps) }));
  const fastestMedia = mediaLoadMs.reduce((best, m) => (m.totalMs < best.totalMs ? m : best), mediaLoadMs[0]);
  const offloadWins = fastestMedia.totalMs < rMs;
  const speedupFactor = offloadWins ? rMs / fastestMedia.totalMs : fastestMedia.totalMs / rMs;
  return { contextTokens: T, kvGiB, prefillTFLOP: pf, recomputeMs: rMs, mediaLoadMs, fastestMedia, offloadWins, speedupFactor };
}

export interface IncrementalRow {
  fromTokens: number;
  toTokens: number;
  extraKvGiB: number;
  extraPrefillTFLOP: number;
  extraRecomputeMs: number;
  extraMediaLoadMs: { key: string; name: string; extraMs: number }[];
  offloadDeltaWins: boolean;
}

export function buildIncrementalRow(
  l: OffloadLevers, d: DerivedParams, fromT: number, toT: number,
  media: { key: string; name: string; readBwGBps: number }[],
): IncrementalRow {
  const extraKvGiB = kvSizeGiB(l, d, toT) - kvSizeGiB(l, d, fromT);
  const extraPrefillTFLOP = prefillTFLOP(l, d, toT) - prefillTFLOP(l, d, fromT);
  const extraRecomputeMs = recomputeMs(l, d, toT) - recomputeMs(l, d, fromT);
  const extraMediaLoadMs = media.map(m => ({
    key: m.key, name: m.name,
    extraMs: totalLoadMs(l, d, toT, m.readBwGBps) - totalLoadMs(l, d, fromT, m.readBwGBps),
  }));
  const minExtraLoad = Math.min(...extraMediaLoadMs.map(m => m.extraMs));
  return { fromTokens: fromT, toTokens: toT, extraKvGiB, extraPrefillTFLOP, extraRecomputeMs, extraMediaLoadMs, offloadDeltaWins: minExtraLoad < extraRecomputeMs };
}
