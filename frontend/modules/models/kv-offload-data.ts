/** Reference data for the KV-Cache Offload vs Recompute analysis, sourced from
 *  intel_catalog_kv_offload_sizing-17Aug.xlsx ("Offload Refs" sheet). Provenance:
 *  "G" = verified from a model card / HF config or well-established; "Y" = estimate,
 *  inferred, or a speculative 2026-dated release — verify before using externally. */

export type Provenance = "G" | "Y";

export interface OffloadModelRef {
  name: string;
  activeParamsB: number;
  layers: number;
  denseLayers: number;
  windowLayers: number;
  windowSize: number;
  qHeads: number;
  kvHeads: number;
  headDim: number;
  prov: Provenance;
  note: string;
}

export const OFFLOAD_MODELS: OffloadModelRef[] = [
  { name: "Gemma 4 26B-A4B-IT", activeParamsB: 3.8, layers: 30, denseLayers: 4, windowLayers: 26, windowSize: 4096, qHeads: 8, kvHeads: 4, headDim: 256, prov: "Y", note: "MoE 3.8B active. Global layers hd512 (approx as 256). Verify" },
  { name: "Gemma-3-4B-it", activeParamsB: 4, layers: 34, denseLayers: 6, windowLayers: 28, windowSize: 1024, qHeads: 8, kvHeads: 4, headDim: 256, prov: "G", note: "Dense. 5:1 local:global, window 1024" },
  { name: "Gemma-4-E4B-it", activeParamsB: 4, layers: 34, denseLayers: 6, windowLayers: 28, windowSize: 1024, qHeads: 8, kvHeads: 4, headDim: 256, prov: "Y", note: "Elastic 4B; arch assumed Gemma-3-4B-like" },
  { name: "GPT-OSS-120B", activeParamsB: 5.1, layers: 36, denseLayers: 18, windowLayers: 18, windowSize: 128, qHeads: 64, kvHeads: 8, headDim: 64, prov: "G", note: "MoE 5.1B active. 18 dense/18 banded(128). Model card 2508.10925" },
  { name: "LFM2.5-1.2B-Instruct", activeParamsB: 1.2, layers: 6, denseLayers: 6, windowLayers: 0, windowSize: 0, qHeads: 16, kvHeads: 8, headDim: 128, prov: "Y", note: "Liquid hybrid: only ~6 attention layers; conv blocks add compute NOT captured by 2PT. Rough" },
  { name: "Llama 3.3 70B Instruct", activeParamsB: 70, layers: 80, denseLayers: 80, windowLayers: 0, windowSize: 0, qHeads: 64, kvHeads: 8, headDim: 128, prov: "G", note: "Dense 70B" },
  { name: "Llama-3.2-1B-it", activeParamsB: 1.24, layers: 16, denseLayers: 16, windowLayers: 0, windowSize: 0, qHeads: 32, kvHeads: 8, headDim: 64, prov: "G", note: "Dense 1.24B" },
  { name: "Llama-3.2-8B-it", activeParamsB: 8, layers: 32, denseLayers: 32, windowLayers: 0, windowSize: 0, qHeads: 32, kvHeads: 8, headDim: 128, prov: "Y", note: "No real Meta 3.2-8B; treated as Llama 3.1 8B" },
  { name: "Qwen3-30B-A3B", activeParamsB: 3.3, layers: 48, denseLayers: 48, windowLayers: 0, windowSize: 0, qHeads: 32, kvHeads: 4, headDim: 128, prov: "G", note: "MoE 3.3B active (HF verified)" },
  { name: "Qwen3.5-4B", activeParamsB: 4, layers: 36, denseLayers: 36, windowLayers: 0, windowSize: 0, qHeads: 32, kvHeads: 8, headDim: 128, prov: "Y", note: "2026-dated; Qwen3-4B arch assumed" },
  { name: "Qwen3.6-27B", activeParamsB: 27, layers: 64, denseLayers: 64, windowLayers: 0, windowSize: 0, qHeads: 40, kvHeads: 8, headDim: 128, prov: "Y", note: "2026-dated dense; Q-heads/layers estimated" },
  { name: "Sarvam-105B", activeParamsB: 10, layers: 80, denseLayers: 80, windowLayers: 0, windowSize: 0, qHeads: 40, kvHeads: 8, headDim: 128, prov: "Y", note: "MoE; ACTIVE PARAMS UNKNOWN - placeholder 10B. Do not assert" },
  { name: "Sarvam-30B", activeParamsB: 2.4, layers: 48, denseLayers: 48, windowLayers: 0, windowSize: 0, qHeads: 32, kvHeads: 4, headDim: 128, prov: "Y", note: "MoE ~2.4B active; arch placeholder" },
];

export interface MediaRef {
  key: string;
  name: string;
  readBwGBps: number;
  prov: Provenance;
  note: string;
}

/** Read-bandwidth media. "Write → GPU" is not a source medium — it's the fixed PCIe
 *  write leg every offload path pays, applied on top of whichever medium is read. */
export const OFFLOAD_MEDIA: MediaRef[] = [
  { key: "dram", name: "DRAM (host DDR5-6400, 12ch/socket)", readBwGBps: 600, prov: "G", note: "~614 GB/s per socket; MRDIMM-8800 ~845. Per-socket aggregate" },
  { key: "cxl", name: "CXL Flat Memory Mode (Gen5 x16 expander)", readBwGBps: 50, prov: "Y", note: "~50 GB/s per module (Gen5 x16 ~64 theoretical). Flat mode HW-interleaves DRAM+CXL; scales with modules" },
  { key: "nvme", name: "NVMe (PCIe Gen5 x4 SSD, seq read)", readBwGBps: 14, prov: "G", note: "~14 GB/s/drive Gen5 (Gen4 ~7). RAID/multiple drives scale linearly" },
  { key: "flash", name: "All-Flash array (NVMe-oF over fabric)", readBwGBps: 40, prov: "Y", note: "NIC-bound: dual 200GbE ~40-50 GB/s; 800GbE ~100. Aggregate array BW higher, per-client capped" },
];

export const WRITE_TO_GPU_BW_GBPS = 55; // PCIe Gen5 x16, "G" provenance
export const WRITE_TO_GPU_NOTE = "~55 GB/s effective (Gen5 x16 ~64 theo). Same write cost for every medium.";

export interface AcceleratorRef {
  name: string;
  peakBf16TFLOPS: number;
  prov: Provenance;
  note: string;
}

export const OFFLOAD_ACCELERATORS: AcceleratorRef[] = [
  { name: "Intel Arc Pro B70", peakBf16TFLOPS: 183.5, prov: "Y", note: "XMX BF16 = INT8 peak (367 TOPS) / 2. Vector FP16 (~45.9) is a different, lower path - not used for matmul-bound prefill" },
  { name: "Intel Crescent Island (CRI)", peakBf16TFLOPS: 600, prov: "Y", note: "Intel has NOT published throughput (Computex 2026). Placeholder - edit on disclosure. 350W Xe3P, 160-480GB LPDDR5X" },
];

export const KV_BYTES_PER_ELEMENT_OPTIONS = [
  { value: 2, label: "FP16 / BF16 (2 bytes)" },
  { value: 1, label: "FP8 (1 byte)" },
  { value: 0.5, label: "INT4 (0.5 bytes)" },
] as const;

export const DEFAULT_CONTEXT_LENGTHS = [4096, 8192, 16384, 32768];

export const DEFAULT_MFU = 0.6;
export const DEFAULT_CAUSAL_FACTOR = 0.5;
