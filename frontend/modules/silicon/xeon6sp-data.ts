export type WorkloadTag =
  | "Bulk LLM Throughput"
  | "Balanced Inference"
  | "Low-Latency Serving"
  | "Best Value"
  | "Edge / Low-TDP"
  | "FP / BF16 AI"
  | "High-Frequency";

export interface XeonSKU {
  model: string;
  cores: number;
  cacheMB: number;
  baseFreqGHz: number;
  tdpW: number;
  listPriceUSD: number;
  sirPerfPerK: number | null;
  sirPerfPerCore: number | null;
  intPeak2S: number | null;
  fpPeak2S: number | null;
  intBase2S: number | null;
  fpBase2S: number | null;
  tags: WorkloadTag[];
}

// Tag derivation rationale (computed from screenshot data, baked in for fast render):
//   Best Value      → sirPerfPerK ≥ 100
//   Edge / Low-TDP  → tdpW ≤ 165
//   Bulk Throughput → cores ≥ 64
//   Balanced Inf.   → cores 32–63
//   Low-Latency     → sirPerfPerCore ≥ 17 (high single-thread output)
//   FP / BF16 AI    → fpPeak / intPeak ≥ 1.2  (meaningfully better at FP)
//   High-Frequency  → baseFreqGHz ≥ 3.5

export const XEON6_SP_SKUS: XeonSKU[] = [
  {
    model: "6787P", cores: 86, cacheMB: 336, baseFreqGHz: 2.0, tdpW: 350, listPriceUSD: 10400,
    sirPerfPerK: 80.28, sirPerfPerCore: 10.58, intPeak2S: 1720, fpPeak2S: 1880, intBase2S: 1670, fpBase2S: 1820,
    tags: ["Bulk LLM Throughput", "FP / BF16 AI"],
  },
  {
    model: "6788P", cores: 86, cacheMB: 336, baseFreqGHz: 2.0, tdpW: 350, listPriceUSD: 19000,
    sirPerfPerK: 41.31, sirPerfPerCore: 9.19, intPeak2S: 1620, fpPeak2S: 1670, intBase2S: 1570, fpBase2S: 1580,
    tags: ["Bulk LLM Throughput"],
  },
  {
    model: "6774P", cores: 64, cacheMB: 336, baseFreqGHz: 2.5, tdpW: 350, listPriceUSD: 6760,
    sirPerfPerK: null, sirPerfPerCore: null, intPeak2S: null, fpPeak2S: null, intBase2S: null, fpBase2S: null,
    tags: ["Bulk LLM Throughput"],
  },
  {
    model: "6776P", cores: 64, cacheMB: 336, baseFreqGHz: 2.3, tdpW: 350, listPriceUSD: 9875,
    sirPerfPerK: null, sirPerfPerCore: null, intPeak2S: null, fpPeak2S: null, intBase2S: null, fpBase2S: null,
    tags: ["Bulk LLM Throughput"],
  },
  {
    model: "6760P", cores: 64, cacheMB: 320, baseFreqGHz: 2.2, tdpW: 330, listPriceUSD: 7803,
    sirPerfPerK: 83.94, sirPerfPerCore: 11.56, intPeak2S: 1350, fpPeak2S: 1530, intBase2S: 1310, fpBase2S: 1480,
    tags: ["Bulk LLM Throughput", "FP / BF16 AI"],
  },
  {
    model: "6767P", cores: 64, cacheMB: 336, baseFreqGHz: 2.4, tdpW: 350, listPriceUSD: 9595,
    sirPerfPerK: 71.39, sirPerfPerCore: 12.66, intPeak2S: 1390, fpPeak2S: 1510, intBase2S: 1370, fpBase2S: 1620,
    tags: ["Bulk LLM Throughput", "FP / BF16 AI"],
  },
  {
    model: "6768P", cores: 64, cacheMB: 336, baseFreqGHz: 2.4, tdpW: 330, listPriceUSD: 16000,
    sirPerfPerK: 41.56, sirPerfPerCore: 11.56, intPeak2S: 1380, fpPeak2S: 1530, intBase2S: 1330, fpBase2S: 1480,
    tags: ["Bulk LLM Throughput", "FP / BF16 AI"],
  },
  {
    model: "6740P", cores: 48, cacheMB: 288, baseFreqGHz: 2.1, tdpW: 270, listPriceUSD: 4650,
    sirPerfPerK: 107.53, sirPerfPerCore: 13.13, intPeak2S: 1030, fpPeak2S: 1280, intBase2S: 1000, fpBase2S: 1260,
    tags: ["Balanced Inference", "Best Value", "FP / BF16 AI"],
  },
  {
    model: "6747P", cores: 48, cacheMB: 288, baseFreqGHz: 2.7, tdpW: 330, listPriceUSD: 6497,
    sirPerfPerK: 87.73, sirPerfPerCore: 15.10, intPeak2S: 1170, fpPeak2S: 1470, intBase2S: 1140, fpBase2S: 1450,
    tags: ["Balanced Inference", "FP / BF16 AI"],
  },
  {
    model: "6748P", cores: 48, cacheMB: 192, baseFreqGHz: 2.5, tdpW: 300, listPriceUSD: 12702,
    sirPerfPerK: null, sirPerfPerCore: null, intPeak2S: null, fpPeak2S: null, intBase2S: null, fpBase2S: null,
    tags: ["Balanced Inference"],
  },
  {
    model: "6736P", cores: 36, cacheMB: 144, baseFreqGHz: 2.0, tdpW: 205, listPriceUSD: 3351,
    sirPerfPerK: 116.08, sirPerfPerCore: 14.31, intPeak2S: 798, fpPeak2S: 1030, intBase2S: 778, fpBase2S: 1030,
    tags: ["Balanced Inference", "Best Value", "FP / BF16 AI"],
  },
  {
    model: "6732P", cores: 32, cacheMB: 144, baseFreqGHz: 3.8, tdpW: 350, listPriceUSD: 5295,
    sirPerfPerK: 73.84, sirPerfPerCore: 15.52, intPeak2S: 807, fpPeak2S: 1010, intBase2S: 782, fpBase2S: 993,
    tags: ["Balanced Inference", "High-Frequency"],
  },
  {
    model: "6745P", cores: 32, cacheMB: 336, baseFreqGHz: 3.1, tdpW: 300, listPriceUSD: 5250,
    sirPerfPerK: 88.67, sirPerfPerCore: 17.19, intPeak2S: 824, fpPeak2S: 1080, intBase2S: 826, fpBase2S: 1100,
    tags: ["Balanced Inference", "Low-Latency Serving", "FP / BF16 AI"],
  },
  {
    model: "6530P", cores: 32, cacheMB: 144, baseFreqGHz: 2.3, tdpW: 225, listPriceUSD: 2234,
    sirPerfPerK: 166.29, sirPerfPerCore: 15.58, intPeak2S: 757, fpPeak2S: 982, intBase2S: 743, fpBase2S: 997,
    tags: ["Balanced Inference", "Best Value"],
  },
  {
    model: "6730P", cores: 32, cacheMB: 288, baseFreqGHz: 2.5, tdpW: 250, listPriceUSD: 3726,
    sirPerfPerK: 100.38, sirPerfPerCore: 16.25, intPeak2S: 769, fpPeak2S: 1040, intBase2S: 748, fpBase2S: 1040,
    tags: ["Balanced Inference", "Best Value", "FP / BF16 AI"],
  },
  {
    model: "6737P", cores: 32, cacheMB: 144, baseFreqGHz: 2.9, tdpW: 270, listPriceUSD: 4995,
    sirPerfPerK: 77.88, sirPerfPerCore: 15.94, intPeak2S: 798, fpPeak2S: 1020, intBase2S: 778, fpBase2S: 1020,
    tags: ["Balanced Inference", "FP / BF16 AI"],
  },
  {
    model: "6738P", cores: 32, cacheMB: 144, baseFreqGHz: 2.9, tdpW: 270, listPriceUSD: 6540,
    sirPerfPerK: null, sirPerfPerCore: null, intPeak2S: null, fpPeak2S: null, intBase2S: null, fpBase2S: null,
    tags: ["Balanced Inference"],
  },
  {
    model: "6520P", cores: 24, cacheMB: 144, baseFreqGHz: 2.4, tdpW: 210, listPriceUSD: 1295,
    sirPerfPerK: 205.40, sirPerfPerCore: 16.04, intPeak2S: 546, fpPeak2S: 772, intBase2S: 532, fpBase2S: 770,
    tags: ["Best Value"],
  },
  {
    model: "6527P", cores: 24, cacheMB: 144, baseFreqGHz: 3.0, tdpW: 255, listPriceUSD: 2878,
    sirPerfPerK: 106.67, sirPerfPerCore: 17.54, intPeak2S: 630, fpPeak2S: 840, intBase2S: 614, fpBase2S: 842,
    tags: ["Best Value", "Low-Latency Serving"],
  },
  {
    model: "6728P", cores: 24, cacheMB: 144, baseFreqGHz: 2.7, tdpW: 210, listPriceUSD: 2478,
    sirPerfPerK: 115.01, sirPerfPerCore: 16.55, intPeak2S: 589, fpPeak2S: 808, intBase2S: 570, fpBase2S: 796,
    tags: ["Best Value", "FP / BF16 AI"],
  },
  {
    model: "6725P", cores: 16, cacheMB: 192, baseFreqGHz: 3.7, tdpW: 235, listPriceUSD: 3845,
    sirPerfPerK: 52.93, sirPerfPerCore: 19.28, intPeak2S: 418, fpPeak2S: null, intBase2S: 407, fpBase2S: 617,
    tags: ["Low-Latency Serving", "High-Frequency"],
  },
  {
    model: "6515P", cores: 16, cacheMB: 72, baseFreqGHz: 2.3, tdpW: 150, listPriceUSD: 740,
    sirPerfPerK: 263.51, sirPerfPerCore: 17.81, intPeak2S: 402, fpPeak2S: 578, intBase2S: 390, fpBase2S: 570,
    tags: ["Edge / Low-TDP", "Best Value", "Low-Latency Serving"],
  },
  {
    model: "6517P", cores: 16, cacheMB: 72, baseFreqGHz: 3.2, tdpW: 190, listPriceUSD: 1195,
    sirPerfPerK: 169.46, sirPerfPerCore: 18.16, intPeak2S: 415, fpPeak2S: 587, intBase2S: 405, fpBase2S: 581,
    tags: ["Edge / Low-TDP", "Best Value", "Low-Latency Serving"],
  },
  {
    model: "6724P", cores: 16, cacheMB: 72, baseFreqGHz: 3.6, tdpW: 210, listPriceUSD: 3622,
    sirPerfPerK: 55.63, sirPerfPerCore: 17.44, intPeak2S: 416, fpPeak2S: 574, intBase2S: 403, fpBase2S: 558,
    tags: ["Low-Latency Serving", "High-Frequency"],
  },
  {
    model: "6505P", cores: 12, cacheMB: 48, baseFreqGHz: 2.2, tdpW: 150, listPriceUSD: 563,
    sirPerfPerK: 263.77, sirPerfPerCore: 17.83, intPeak2S: 306, fpPeak2S: 432, intBase2S: 297, fpBase2S: 428,
    tags: ["Edge / Low-TDP", "Best Value", "Low-Latency Serving"],
  },
  {
    model: "6507P", cores: 8, cacheMB: 48, baseFreqGHz: 3.5, tdpW: 150, listPriceUSD: 765,
    sirPerfPerK: 141.83, sirPerfPerCore: 20.63, intPeak2S: 223, fpPeak2S: 326, intBase2S: 217, fpBase2S: 330,
    tags: ["Edge / Low-TDP", "Best Value", "Low-Latency Serving", "High-Frequency"],
  },
  {
    model: "6714P", cores: 8, cacheMB: 48, baseFreqGHz: 4.0, tdpW: 165, listPriceUSD: 2816,
    sirPerfPerK: 37.29, sirPerfPerCore: 19.56, intPeak2S: 217, fpPeak2S: 316, intBase2S: 210, fpBase2S: 313,
    tags: ["Edge / Low-TDP", "Low-Latency Serving", "High-Frequency"],
  },
];

// ── workload recommendation text ───────────────────────────────────────────────

export const TAG_META: Record<WorkloadTag, { color: string; bg: string; desc: string }> = {
  "Bulk LLM Throughput":  { color: "#38bdf8", bg: "rgba(56,189,248,0.15)",   desc: "High core-count enables many parallel inference requests — ideal for multi-user LLM APIs" },
  "Balanced Inference":   { color: "#34d399", bg: "rgba(52,211,153,0.15)",   desc: "Good mix of cores and per-core speed; handles mixed INT8/BF16 inference without tuning" },
  "Low-Latency Serving":  { color: "#a78bfa", bg: "rgba(167,139,250,0.15)",  desc: "High per-core throughput minimises TTFT — best for interactive chat and agentic loops" },
  "Best Value":           { color: "#fbbf24", bg: "rgba(251,191,36,0.15)",   desc: "Best-in-class SPECrate per $1K spent — cost-sensitive production deployments" },
  "Edge / Low-TDP":       { color: "#4ade80", bg: "rgba(74,222,128,0.15)",   desc: "≤165 W TDP fits air-cooled edge nodes, on-prem inference boxes, and dense rack configs" },
  "FP / BF16 AI":         { color: "#f472b6", bg: "rgba(244,114,182,0.15)",  desc: "fp_peak ≥1.2× int_peak — AMX engine shines on BF16 transformer workloads and embeddings" },
  "High-Frequency":       { color: "#fb923c", bg: "rgba(251,146,60,0.15)",   desc: "≥3.5 GHz base clock accelerates sequential decode and single-thread model loading" },
};

// Normalisation maxima for bar charts
export const MAX_INT_PEAK   = 1720;
export const MAX_FP_PEAK    = 1880;
export const MAX_PERF_PER_K = 264;
export const MAX_PERF_CORE  = 20.63;
