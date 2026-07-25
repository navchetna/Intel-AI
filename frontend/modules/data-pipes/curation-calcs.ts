// Multimodal Data Curation Pipeline Sizing.
// Modeled directly on the "Multimodal data curation pipeline" architecture diagram:
// Ingestion -> Dedup -> Quality filtering -> Modality processing -> Safety/PII -> Packaging,
// with Orchestration/versioning and Storage as cross-cutting rows.
//
// Unlike the Training/RL/Fine-Tuning sizing tools (ported from source spreadsheets and
// verified cell-by-cell), there is no ground-truth sheet here — every throughput default
// below is a planning-grade order-of-magnitude estimate, clearly editable, and should be
// calibrated against real profiling before being used to commit capital.

export type Modality = "text" | "vision" | "speech" | "video";

export interface CorpusInputs {
  textEnabled: boolean;
  textDocsM: number;   // millions of documents
  textAvgKB: number;   // avg document size, KB

  visionEnabled: boolean;
  visionImagesM: number; // millions of images
  visionAvgMB: number;   // avg image size, MB

  speechEnabled: boolean;
  speechHours: number; // total audio hours
  speechKbps: number;  // avg encoded bitrate, kbps

  videoEnabled: boolean;
  videoHours: number; // total video hours
  videoMbps: number;  // avg encoded bitrate, Mbps
}

export type HardwareType = "cpu" | "gpu";

export type WorkloadId =
  | "ingestion"
  | "dedupCpu" | "dedupGpu"
  | "qualityCpu" | "qualityGpu"
  | "modalityCpu" | "modalityGpu"
  | "safetyCpu" | "safetyGpu"
  | "packaging"
  | "orchestration";

export const WORKLOAD_ORDER: WorkloadId[] = [
  "ingestion",
  "dedupCpu", "dedupGpu",
  "qualityCpu", "qualityGpu",
  "modalityCpu", "modalityGpu",
  "safetyCpu", "safetyGpu",
  "packaging",
  "orchestration",
];

export interface WorkloadMeta {
  id: WorkloadId;
  stage: string;
  label: string;
  tools: string[];
  modalities: Modality[];
  hardware: HardwareType;
  compliance?: boolean;
  description: string;
}

export const WORKLOAD_META: Record<WorkloadId, WorkloadMeta> = {
  ingestion: {
    id: "ingestion", stage: "Ingestion", label: "Ingest & buffer", hardware: "cpu",
    tools: ["fastAPI / gRPC", "Kafka"], modalities: ["text", "vision", "speech", "video"],
    description: "Network/serialization-bound passthrough with light validation — not a major compute driver, which is why the source diagram doesn't annotate it with a CPU/GPU-fit chip the way every other stage is. Sized here as a lightweight service so the pipeline has a start.",
  },
  dedupCpu: {
    id: "dedupCpu", stage: "Dedup", label: "CPU — exact/near-dup hashing", hardware: "cpu",
    tools: ["datatrove MinHash-LSH, SimHash", "imagededup pHash/dHash"], modalities: ["text", "vision"],
    description: "Fast, hash-based duplicate detection: MinHash/SimHash for near-duplicate text, perceptual hashing for near-duplicate images. Cheap per item, runs on the full ingested corpus.",
  },
  dedupGpu: {
    id: "dedupGpu", stage: "Dedup", label: "GPU — semantic (embedding) dedup", hardware: "gpu",
    tools: ["NeMo Curator (GPU dedup)", "SemDeDup / D4", "E5 / CLIP ViT-B/32 embeddings"], modalities: ["text", "vision"],
    description: "Embedding-based semantic near-dup removal — catches paraphrases and re-encoded near-identical images that hashing misses. Needs a forward pass per item through an embedding model.",
  },
  qualityCpu: {
    id: "qualityCpu", stage: "Quality filtering", label: "CPU — heuristics & language ID", hardware: "cpu",
    tools: ["fastText langid", "KenLM perplexity", "Gopher rules", "FineWeb-Edu classifier", "PySceneDetect"], modalities: ["text", "video"],
    description: "Cheap rule- and statistics-based quality signals for text (language ID, perplexity, heuristic rules, the FineWeb-Edu quality classifier) plus CPU-based scene-boundary detection for video.",
  },
  qualityGpu: {
    id: "qualityGpu", stage: "Quality filtering", label: "GPU — model-scored quality", hardware: "gpu",
    tools: ["CLIP-score", "aesthetic predictor", "Whisper / NeMo ASR-WER"], modalities: ["vision", "speech"],
    description: "Deep-model quality scoring: CLIP image-text alignment and aesthetic prediction for images, ASR-based word-error-rate quality checks for speech. Whisper transcription dominates this workload's cost — the throughput default below is calibrated toward it, not toward CLIP.",
  },
  modalityCpu: {
    id: "modalityCpu", stage: "Modality processing", label: "CPU — VAD, alignment, transcode", hardware: "cpu",
    tools: ["Silero / WebRTC VAD", "ctc-forced-aligner", "ffmpeg transcode/resample", "PyAV"], modalities: ["speech", "video"],
    description: "Lightweight per-frame/per-segment audio and video processing: voice-activity detection, forced text-audio alignment, and transcode/resample/decode via ffmpeg and PyAV.",
  },
  modalityGpu: {
    id: "modalityGpu", stage: "Modality processing", label: "GPU — diarization & embeddings", hardware: "gpu",
    tools: ["pyannote (diarization)", "DINOv2-large embeddings"], modalities: ["speech", "vision", "video"],
    description: "Deep-model modality processing: speaker diarization for audio, DINOv2 visual embeddings for images and video frames.",
  },
  safetyCpu: {
    id: "safetyCpu", stage: "Safety / PII", label: "CPU — PII redaction & CSAM hash match", hardware: "cpu", compliance: true,
    tools: ["Presidio (PII) + spaCy NER", "PhotoDNA-compatible hash match"], modalities: ["text", "vision"],
    description: "PII detection/redaction for text, and perceptual hash-matching against known-CSAM hash databases for images. The hash-match step is a legal compliance gate, not a quality preference — see the note below the results.",
  },
  safetyGpu: {
    id: "safetyGpu", stage: "Safety / PII", label: "GPU — toxicity & NSFW classifiers", hardware: "gpu",
    tools: ["Detoxify classifier", "NudeNet (small CNN)"], modalities: ["text", "vision"],
    description: "Model-based safety classifiers: text toxicity scoring and NSFW image classification. Both are comparatively small models per the source diagram, so this workload is cheaper per GPU-hour than the other GPU stages.",
  },
  packaging: {
    id: "packaging", stage: "Packaging", label: "CPU — shard & serialize", hardware: "cpu",
    tools: ["WebDataset (vision/speech)", "HF datasets (Arrow)", "Megatron-preprocess (bin/idx)", "JSONL / Parquet"], modalities: ["text", "vision", "speech", "video"],
    description: "Serialization into training-ready shards/formats. I/O-bound, not model-bound — runs once over whatever survives every upstream filtering stage.",
  },
  orchestration: {
    id: "orchestration", stage: "Orchestration / versioning", label: "CPU — scheduling & lineage", hardware: "cpu",
    tools: ["Ray Data", "Apache Spark / Dask", "Airflow / Dagster / Prefect", "LakeFS / DVC"], modalities: ["text", "vision", "speech", "video"],
    description: "Cross-cutting scheduling, distributed ETL coordination, and dataset lineage/versioning overhead across every stage above. Light relative to the model-bearing stages.",
  },
};

export interface WorkloadInput {
  enabled: boolean;
  throughputGBPerHour: number; // per CPU core, or per GPU
}

export interface CurationInputs {
  corpus: CorpusInputs;

  cpuCoresAvailable: number;
  gpusAvailable: number;

  dedupSurvivorFraction: number;   // 0–1, fraction of raw corpus surviving Dedup
  qualitySurvivorFraction: number; // 0–1, fraction of post-Dedup corpus surviving Quality filtering
  safetySurvivorFraction: number;  // 0–1, fraction of post-Quality corpus surviving Safety/PII

  coresPerXeon6Socket: number;
  xeon6SocketTdpW: number;
  gpuTdpW: number;
  facilityPowerOverhead: number;

  workloads: Record<WorkloadId, WorkloadInput>;
}

const DEFAULT_WORKLOAD_THROUGHPUT: Record<WorkloadId, number> = {
  ingestion: 150,
  dedupCpu: 20,
  dedupGpu: 8,
  qualityCpu: 15,
  qualityGpu: 6,
  modalityCpu: 25,
  modalityGpu: 5,
  safetyCpu: 18,
  safetyGpu: 10,
  packaging: 80,
  orchestration: 300,
};

function defaultWorkloads(): Record<WorkloadId, WorkloadInput> {
  const out = {} as Record<WorkloadId, WorkloadInput>;
  for (const id of WORKLOAD_ORDER) {
    out[id] = { enabled: true, throughputGBPerHour: DEFAULT_WORKLOAD_THROUGHPUT[id] };
  }
  return out;
}

export const CURATION_DEFAULTS: CurationInputs = {
  corpus: {
    textEnabled: true, textDocsM: 500, textAvgKB: 8,
    visionEnabled: true, visionImagesM: 50, visionAvgMB: 0.3,
    speechEnabled: true, speechHours: 10000, speechKbps: 64,
    videoEnabled: true, videoHours: 2000, videoMbps: 4,
  },
  cpuCoresAvailable: 512,
  gpusAvailable: 16,
  dedupSurvivorFraction: 0.85,
  qualitySurvivorFraction: 0.70,
  safetySurvivorFraction: 0.98,
  coresPerXeon6Socket: 128,
  xeon6SocketTdpW: 500,
  gpuTdpW: 1400,
  facilityPowerOverhead: 1.4,
  workloads: defaultWorkloads(),
};

export interface CorpusGB {
  textGB: number;
  visionGB: number;
  speechGB: number;
  videoGB: number;
  totalGB: number;
}

export interface WorkloadResult {
  id: WorkloadId;
  enabled: boolean;
  volumeGB: number;
  unitsAvailable: number;
  timeHours: number;
  resourceHours: number; // core-hours (cpu) or GPU-hours (gpu)
}

export interface CurationResults {
  raw: CorpusGB;
  cascade: {
    postDedupGB: number;
    postQualityGB: number;
    postSafetyGB: number; // final packaged size
  };
  workloads: Record<WorkloadId, WorkloadResult>;
  totals: {
    wallClockHours: number;
    cpuCoreHours: number;
    gpuHours: number;
    bindingWorkload: WorkloadId | null;
    bindingHours: number;
  };
  power: {
    cpuPowerKW: number;
    gpuPowerKW: number;
    totalPowerKW: number;
  };
  storage: {
    rawGB: number;
    postDedupGB: number;
    postQualityGB: number;
    packagedGB: number;
    peakTransientGB: number;   // raw + every intermediate stage retained simultaneously
    steadyStateGB: number;     // raw (provenance) + packaged (training-ready) only
  };
}

/** Cascade multiplier applied to a workload's raw-modality GB, based on its position in the pipeline. */
function cascadeMultiplierFor(id: WorkloadId, inp: CurationInputs): number {
  switch (id) {
    case "ingestion":
    case "dedupCpu":
    case "dedupGpu":
    case "orchestration":
      return 1;
    case "qualityCpu":
    case "qualityGpu":
      return inp.dedupSurvivorFraction;
    case "modalityCpu":
    case "modalityGpu":
    case "safetyCpu":
    case "safetyGpu":
      return inp.dedupSurvivorFraction * inp.qualitySurvivorFraction;
    case "packaging":
      return inp.dedupSurvivorFraction * inp.qualitySurvivorFraction * inp.safetySurvivorFraction;
  }
}

export function calcCuration(inp: CurationInputs): CurationResults {
  const c = inp.corpus;

  const textGB = c.textEnabled ? (c.textDocsM * 1e6 * c.textAvgKB * 1000) / 1e9 : 0;
  const visionGB = c.visionEnabled ? (c.visionImagesM * 1e6 * c.visionAvgMB * 1e6) / 1e9 : 0;
  const speechGB = c.speechEnabled ? (c.speechHours * 3600 * (c.speechKbps * 1000 / 8)) / 1e9 : 0;
  const videoGB = c.videoEnabled ? (c.videoHours * 3600 * (c.videoMbps * 1e6 / 8)) / 1e9 : 0;
  const totalGB = textGB + visionGB + speechGB + videoGB;
  const raw: CorpusGB = { textGB, visionGB, speechGB, videoGB, totalGB };

  const modalityGB: Record<Modality, number> = { text: textGB, vision: visionGB, speech: speechGB, video: videoGB };

  const postDedupGB = totalGB * inp.dedupSurvivorFraction;
  const postQualityGB = postDedupGB * inp.qualitySurvivorFraction;
  const postSafetyGB = postQualityGB * inp.safetySurvivorFraction;

  const workloads = {} as Record<WorkloadId, WorkloadResult>;
  let wallClockHours = 0;
  let cpuCoreHours = 0;
  let gpuHours = 0;
  let bindingWorkload: WorkloadId | null = null;
  let bindingHours = 0;

  for (const id of WORKLOAD_ORDER) {
    const meta = WORKLOAD_META[id];
    const w = inp.workloads[id];
    const rawModalitySum = meta.modalities.reduce((sum, m) => sum + modalityGB[m], 0);
    const volumeGB = rawModalitySum * cascadeMultiplierFor(id, inp);
    const unitsAvailable = meta.hardware === "cpu" ? inp.cpuCoresAvailable : inp.gpusAvailable;
    const timeHours = w.enabled && w.throughputGBPerHour > 0 && unitsAvailable > 0
      ? volumeGB / (w.throughputGBPerHour * unitsAvailable)
      : 0;
    const resourceHours = timeHours * unitsAvailable;

    workloads[id] = { id, enabled: w.enabled, volumeGB, unitsAvailable, timeHours, resourceHours };

    if (w.enabled) {
      wallClockHours += timeHours;
      if (meta.hardware === "cpu") cpuCoreHours += resourceHours; else gpuHours += resourceHours;
      if (timeHours > bindingHours) { bindingHours = timeHours; bindingWorkload = id; }
    }
  }

  const sockets = inp.coresPerXeon6Socket > 0 ? inp.cpuCoresAvailable / inp.coresPerXeon6Socket : 0;
  const cpuPowerKW = (sockets * inp.xeon6SocketTdpW / 1000) * inp.facilityPowerOverhead;
  const gpuPowerKW = (inp.gpusAvailable * inp.gpuTdpW / 1000) * inp.facilityPowerOverhead;
  const totalPowerKW = cpuPowerKW + gpuPowerKW;

  const peakTransientGB = totalGB + postDedupGB + postQualityGB + postSafetyGB;
  const steadyStateGB = totalGB + postSafetyGB;

  return {
    raw,
    cascade: { postDedupGB, postQualityGB, postSafetyGB },
    workloads,
    totals: { wallClockHours, cpuCoreHours, gpuHours, bindingWorkload, bindingHours },
    power: { cpuPowerKW, gpuPowerKW, totalPowerKW },
    storage: {
      rawGB: totalGB, postDedupGB, postQualityGB, packagedGB: postSafetyGB,
      peakTransientGB, steadyStateGB,
    },
  };
}
