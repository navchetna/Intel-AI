// Fine-Tuning Sizing — ported 1:1 from public/finetuning_sizing.xlsx ("Sizing" sheet).
// Every formula below was verified against the sheet's actual cell formulas.

export type FTMethod = "Full-FT" | "LoRA" | "QLoRA" | "DoRA" | "Prefix-tuning";
export type FTModality = "Text" | "Vision-VLM" | "Speech-gen-TTS" | "Transcription-ASR" | "Audio-understanding";
export type FTObjective = "Instruction-SFT" | "Continued-pretrain" | "DPO" | "ORPO";
export type FTDomainPreset = "General" | "BFSI" | "Legal" | "Telco";
export type FTComputePrecision = "BF16" | "FP8";
export type FTHardwareGpu = "B300 (288GB)" | "H200 (141GB)" | "H100 (80GB)" | "A100 (40GB)" | "L40S (48GB)";
export type FTOptimizer = "AdamW" | "Muon";
export type FTGradCheckpointing = "On" | "Off";

export interface FinetuningInputs {
  // 0 · Configuration
  method: FTMethod;
  modality: FTModality;
  objective: FTObjective;
  domainPreset: FTDomainPreset;
  computePrecision: FTComputePrecision;
  hardwareGpu: FTHardwareGpu;

  // 1 · Base model & architecture
  baseModelParamsB: number;
  layers: number;
  hiddenSize: number;
  encoderParamsB: number;
  optimizer: FTOptimizer;

  // 2 · Method (PEFT) parameters
  loraRank: number;
  loraTargetModules: number;
  prefixVirtualTokens: number;
  baseQuantBits: number;

  // 3 · Dataset & schedule
  datasetSizeSamples: number;
  tokensPerSample: number;
  epochs: number;
  sequenceLength: number;
  microBatchSeqsPerGpu: number;
  gradientCheckpointing: FTGradCheckpointing;

  // 4 · Hardware
  gpusAvailable: number;
  peakBf16PFPerGpu: number;
  peakFp8PFPerGpu: number;
  achievedMfu: number;
  gpuTdpW: number;
}

export const FINETUNING_DEFAULTS: FinetuningInputs = {
  method: "QLoRA",
  modality: "Text",
  objective: "Instruction-SFT",
  domainPreset: "General",
  computePrecision: "BF16",
  hardwareGpu: "B300 (288GB)",

  baseModelParamsB: 8,
  layers: 32,
  hiddenSize: 4096,
  encoderParamsB: 0,
  optimizer: "AdamW",

  loraRank: 16,
  loraTargetModules: 7,
  prefixVirtualTokens: 20,
  baseQuantBits: 4,

  datasetSizeSamples: 50000,
  tokensPerSample: 1024,
  epochs: 3,
  sequenceLength: 1024,
  microBatchSeqsPerGpu: 1,
  gradientCheckpointing: "On",

  gpusAvailable: 1,
  peakBf16PFPerGpu: 2.5,
  peakFp8PFPerGpu: 5,
  achievedMfu: 0.35,
  gpuTdpW: 1400,
};

export interface FinetuningResults {
  hardware: {
    hbmPerGpuGB: number;
  };
  flags: {
    isFullFT: boolean;
    isQLoRA: boolean;
    referenceModelNeeded: boolean;
    hasEncoder: boolean;
    baseFrozenBytesPerParam: number;
    flopFactor: number;
    tokenMultiplier: number;
  };
  params: {
    adapterParams: number;
    trainableFraction: number;
    totalTokens: number;
  };
  memory: {
    optimizerBytesPerTrainableParam: number;
    baseWeightsMemoryGB: number;
    trainableStateMemoryGB: number;
    encoderMemoryGB: number;
    referenceModelMemoryGB: number;
    activationMemoryGB: number;
    totalMemorySingleGpuGB: number;
    fitsOn1Gpu: boolean;
    minGpusForMemory: number;
    memoryPerGpuAtAvailableGB: number;
  };
  compute: {
    totalFlops: number;
    effectivePeakPerGpuPF: number;
    throughputPerGpuPF: number;
    effectiveGpus: number;
    trainingTimeHours: number;
    gpuHours: number;
  };
  storage: {
    adapterCheckpointSizeGB: number;
    mergedModelSizeGB: number;
    tokenizedDatasetGB: number;
  };
  power: {
    powerDrawKW: number;
    energyKWh: number;
  };
  summary: {
    verdict: string;
    memorySavingVsFullFT: number;
    domainGuidance: string;
  };
}

export function calcFinetuning(inp: FinetuningInputs): FinetuningResults {
  const isFullFT = inp.method === "Full-FT";
  const isQLoRA = inp.method === "QLoRA";
  const isPrefixTuning = inp.method === "Prefix-tuning";
  const referenceModelNeeded = inp.objective === "DPO";
  const hasEncoder = inp.modality === "Vision-VLM" || inp.modality === "Transcription-ASR" || inp.modality === "Audio-understanding";
  const isAdamW = inp.optimizer === "AdamW";
  const isGradCkpt = inp.gradientCheckpointing === "On";

  // 4 · Hardware
  const hbmPerGpuGB =
    inp.hardwareGpu === "B300 (288GB)" ? 288
    : inp.hardwareGpu === "H200 (141GB)" ? 141
    : inp.hardwareGpu === "H100 (80GB)" ? 80
    : inp.hardwareGpu === "A100 (40GB)" ? 40
    : 48;

  // 5 · Method & modality flags
  const baseFrozenBytesPerParam = isFullFT ? 0 : isQLoRA ? inp.baseQuantBits / 8 + 0.06 : 2;
  const flopFactor = (isFullFT ? 6 : isQLoRA ? 4.5 : 4) * (isGradCkpt ? 1.3 : 1);
  const tokenMultiplier = inp.objective === "DPO" || inp.objective === "ORPO" ? 2 : 1;

  // 6 · Trainable parameters
  const adapterParams = isFullFT
    ? inp.baseModelParamsB * 1e9
    : isPrefixTuning
    ? inp.prefixVirtualTokens * inp.layers * inp.hiddenSize * 2
    : inp.layers * inp.loraTargetModules * 2 * inp.loraRank * inp.hiddenSize;
  const trainableFraction = inp.baseModelParamsB > 0 ? adapterParams / (inp.baseModelParamsB * 1e9) : 0;
  const totalTokens = inp.datasetSizeSamples * inp.tokensPerSample * inp.epochs * tokenMultiplier;

  // 7 · Memory (per GPU + single-GPU feasibility)
  const optimizerBytesPerTrainableParam = isAdamW ? 18 : 14;
  const baseWeightsMemoryGB = baseFrozenBytesPerParam * inp.baseModelParamsB;
  const trainableStateMemoryGB = (optimizerBytesPerTrainableParam * adapterParams) / 1e9;
  const encoderMemoryGB = (hasEncoder ? 1 : 0) * 2 * inp.encoderParamsB;
  const referenceModelMemoryGB = (referenceModelNeeded ? 1 : 0) * 2 * inp.baseModelParamsB;
  const activationMemoryGB =
    (inp.microBatchSeqsPerGpu * inp.sequenceLength * inp.hiddenSize * 2 * (isGradCkpt ? 4 : 18) * inp.layers) / 1e9;
  const totalMemorySingleGpuGB = baseWeightsMemoryGB + trainableStateMemoryGB + encoderMemoryGB + referenceModelMemoryGB + activationMemoryGB;
  const fitsOn1Gpu = totalMemorySingleGpuGB <= hbmPerGpuGB * 0.9;
  const shardableStateGB = baseWeightsMemoryGB + trainableStateMemoryGB + encoderMemoryGB + referenceModelMemoryGB;
  const minGpusForMemory = fitsOn1Gpu
    ? 1
    : Math.ceil(shardableStateGB / Math.max(hbmPerGpuGB * 0.9 - activationMemoryGB, 1e-9));
  const memoryPerGpuAtAvailableGB = inp.gpusAvailable > 0 ? shardableStateGB / inp.gpusAvailable + activationMemoryGB : activationMemoryGB;

  // 8 · Compute & time
  const totalFlops = flopFactor * inp.baseModelParamsB * 1e9 * totalTokens + (hasEncoder ? 1 : 0) * 2 * inp.encoderParamsB * 1e9 * totalTokens;
  const effectivePeakPerGpuPF = inp.computePrecision === "FP8" ? inp.peakFp8PFPerGpu : inp.peakBf16PFPerGpu;
  const throughputPerGpuPF = effectivePeakPerGpuPF * inp.achievedMfu;
  const effectiveGpus = Math.max(inp.gpusAvailable, minGpusForMemory);
  const trainingTimeHours = effectiveGpus > 0 && throughputPerGpuPF > 0 ? totalFlops / (effectiveGpus * throughputPerGpuPF * 1e15) / 3600 : 0;
  const gpuHours = trainingTimeHours * effectiveGpus;

  // 9 · Output artifacts & storage
  const adapterCheckpointSizeGB = isFullFT ? (inp.baseModelParamsB * 1e9 * 2) / 1e9 : (adapterParams * 2) / 1e9;
  const mergedModelSizeGB = inp.baseModelParamsB * 2;
  const tokenizedDatasetGB = inp.epochs > 0 ? ((totalTokens / inp.epochs) * 2) / 1e9 : 0;

  // 10 · Power
  const powerDrawKW = (effectiveGpus * inp.gpuTdpW) / 1000;
  const energyKWh = powerDrawKW * trainingTimeHours;

  // 11 · Summary & recommendations
  const verdict = fitsOn1Gpu
    ? `Fits on 1 ${inp.hardwareGpu}`
    : `Needs ${minGpusForMemory} GPUs (or switch to QLoRA / smaller rank / shorter seq)`;
  const fullFtDenomGB = 18 * inp.baseModelParamsB + activationMemoryGB + encoderMemoryGB;
  const memorySavingVsFullFT = fullFtDenomGB > 0 ? 1 - totalMemorySingleGpuGB / fullFtDenomGB : 0;
  const domainGuidance =
    inp.domainPreset === "Legal" ? "Long docs (8–32k ctx); citation/hallucination-sensitive; often continued-pretrain then SFT"
    : inp.domainPreset === "BFSI" ? "Structured/tabular + PII/compliance; numeric-accuracy eval; moderate ctx; guardrails"
    : inp.domainPreset === "Telco" ? "Jargon, configs, logs, troubleshooting; medium ctx; RAG often complements FT"
    : "Standard instruction data";

  return {
    hardware: { hbmPerGpuGB },
    flags: { isFullFT, isQLoRA, referenceModelNeeded, hasEncoder, baseFrozenBytesPerParam, flopFactor, tokenMultiplier },
    params: { adapterParams, trainableFraction, totalTokens },
    memory: {
      optimizerBytesPerTrainableParam, baseWeightsMemoryGB, trainableStateMemoryGB, encoderMemoryGB,
      referenceModelMemoryGB, activationMemoryGB, totalMemorySingleGpuGB, fitsOn1Gpu, minGpusForMemory, memoryPerGpuAtAvailableGB,
    },
    compute: { totalFlops, effectivePeakPerGpuPF, throughputPerGpuPF, effectiveGpus, trainingTimeHours, gpuHours },
    storage: { adapterCheckpointSizeGB, mergedModelSizeGB, tokenizedDatasetGB },
    power: { powerDrawKW, energyKWh },
    summary: { verdict, memorySavingVsFullFT, domainGuidance },
  };
}
