// LLM Pretraining Sizing — ported 1:1 from public/llm_training_sizing.xlsx ("Sizing" sheet).
// Every formula below was verified against the sheet's actual cell formulas (not just sample values).

export type ParameterActivation = "Dense" | "MoE";
export type SequenceMixer = "Attention" | "Hybrid-SSM";
export type Modality = "Text" | "Multi-modal";
export type ComputePrecision = "BF16" | "FP8";
export type Optimizer = "AdamW" | "Muon";
export type HardwarePlatform = "DGX B300" | "GB300 NVL72";

export interface TrainingInputs {
  // 0 · Configuration — composable axes
  parameterActivation: ParameterActivation;
  sequenceMixer: SequenceMixer;
  modality: Modality;
  computePrecision: ComputePrecision;
  optimizer: Optimizer;
  hardwarePlatform: HardwarePlatform;

  // 1 · Model & training inputs
  totalParamsB: number;
  activatedParamsB: number;
  encoderParamsB: number;
  trainingTokensT: number;
  visualTokenFraction: number; // 0–1
  sequenceLength: number;
  globalBatchSizeMTok: number;
  totalLayers: number;
  attentionLayers: number;
  moeLayers: number;
  hiddenSize: number;
  microBatchSeqsPerGpu: number;
  recomputeOverhead: number;
  activationMultPerLayer: number;
  multiModalActivationFactor: number;
  muonTokenEfficiencyFactor: number;

  // 2 · MoE parameters (used only when parameterActivation === "MoE")
  numExperts: number;
  topK: number;
  capacityFactor: number;
  moeEfficiencyDerate: number;
  ssmKernelDerate: number;

  // 3 · Hardware platform
  physicalGpusPerNode: number;
  hbmPerGpuGB: number;
  gpuTdpW: number;
  densePeakBf16PFPerGpu: number;
  densePeakFp8PFPerGpu: number;
  achievedMfuBase: number;
  scaleOutBwPerGpuGBs: number;
  nvlinkBwPerGpuGBs: number;
  facilityPowerOverhead: number;

  // 4 · Parallelism plan
  totalGpus: number;
  tp: number;
  pp: number;
  cp: number;
  ep: number;

  // 8 · Storage & checkpoint
  checkpointIntervalMin: number;
  writeWindowTargetSec: number;
  rawCorpusMultiplier: number;
}

export const TRAINING_DEFAULTS: TrainingInputs = {
  parameterActivation: "Dense",
  sequenceMixer: "Attention",
  modality: "Text",
  computePrecision: "BF16",
  optimizer: "Muon",
  hardwarePlatform: "DGX B300",

  totalParamsB: 120,
  activatedParamsB: 120,
  encoderParamsB: 0,
  trainingTokensT: 3,
  visualTokenFraction: 0,
  sequenceLength: 8192,
  globalBatchSizeMTok: 8,
  totalLayers: 88,
  attentionLayers: 88,
  moeLayers: 0,
  hiddenSize: 12288,
  microBatchSeqsPerGpu: 1,
  recomputeOverhead: 1.2,
  activationMultPerLayer: 10,
  multiModalActivationFactor: 1,
  muonTokenEfficiencyFactor: 1.45,

  numExperts: 1,
  topK: 1,
  capacityFactor: 1.25,
  moeEfficiencyDerate: 0.9,
  ssmKernelDerate: 0.9,

  physicalGpusPerNode: 8,
  hbmPerGpuGB: 288,
  gpuTdpW: 1400,
  densePeakBf16PFPerGpu: 2.5,
  densePeakFp8PFPerGpu: 5,
  achievedMfuBase: 0.35,
  scaleOutBwPerGpuGBs: 100,
  nvlinkBwPerGpuGBs: 900,
  facilityPowerOverhead: 1.4,

  totalGpus: 1024,
  tp: 8,
  pp: 4,
  cp: 1,
  ep: 1,

  checkpointIntervalMin: 20,
  writeWindowTargetSec: 60,
  rawCorpusMultiplier: 3,
};

export interface TrainingResults {
  hardware: {
    nvlinkDomainSize: number;
  };
  parallelism: {
    dp: number;
    nodes: number;
    gpusPerReplica: number;
    tpWithinDomain: boolean;
    epWithinDomain: "n/a" | "on NVLink" | "CROSSES IB — MoE penalty";
    gpuCountConsistent: boolean;
  };
  compute: {
    activeParamsEffectiveB: number;
    attentionLayerFraction: number;
    attnSeqCorrection: number;
    effectiveMfu: number;
    effectivePeakPerGpuPF: number;
    effectiveThroughputPerGpuPF: number;
    clusterThroughputPF: number;
    llmFlops: number;
    encoderFlops: number;
    totalTrainingFlops: number;
    trainingTimeRawDays: number;
    optimizerTokenEffFactor: number;
    trainingTimeOptimizerAdjDays: number;
    computeCostGpuHours: number;
    stepTimeSec: number;
  };
  memory: {
    optimizerStateBytesPerParamFull: number;
    modelShardDegree: number;
    weightsGradsPerGpuGB: number;
    optimizerStatePerGpuGB: number;
    staticStatePerGpuGB: number;
    activationsPerGpuGB: number;
    totalHbmUsedPerGpuGB: number;
    hbmHeadroomPerGpuGB: number;
    fitsInHbm: boolean;
    fullModelStateCheckpointGB: number;
  };
  comms: {
    gradAllReducePerGpuGB: number;
    gradCommsTimeSec: number;
    moeAllToAllPerGpuGB: number;
    allToAllTimeSec: number;
    totalExposedCommsSec: number;
    commsComputeRatio: number;
    overlapVerdict: "comfortably overlappable" | "overlap carefully" | "raise batch / rebalance parallelism";
    minMicroBatches: number;
  };
  storage: {
    checkpointSizeTB: number;
    requiredCheckpointBWGBs: number;
    tokenizedDatasetTB: number;
    rawCorpusSizeTB: number;
  };
  power: {
    gpuOnlyPowerMW: number;
    facilityPowerMW: number;
    powerPerNodeKW: number;
  };
  summary: {
    bindingConstraint: "All-to-all bandwidth (EP crosses IB)" | "Memory / HBM" | "Interconnect (DP + all-to-all)" | "Compute";
    fitsCheck: boolean;
  };
}

export function calcTraining(inp: TrainingInputs): TrainingResults {
  const isMoE = inp.parameterActivation === "MoE";
  const isHybridSSM = inp.sequenceMixer === "Hybrid-SSM";
  const isMultiModal = inp.modality === "Multi-modal";
  const isFP8 = inp.computePrecision === "FP8";
  const isMuon = inp.optimizer === "Muon";

  // 3 · Hardware platform
  const nvlinkDomainSize = inp.hardwarePlatform === "DGX B300" ? 8 : 72;

  // 4 · Parallelism plan
  const gpusPerReplica = inp.tp * inp.pp * inp.cp * inp.ep;
  const dp = gpusPerReplica > 0 ? inp.totalGpus / gpusPerReplica : 0;
  const nodes = inp.physicalGpusPerNode > 0 ? inp.totalGpus / inp.physicalGpusPerNode : 0;
  const tpWithinDomain = inp.tp <= nvlinkDomainSize;
  const epWithinDomain: TrainingResults["parallelism"]["epWithinDomain"] =
    !isMoE ? "n/a" : inp.ep <= nvlinkDomainSize ? "on NVLink" : "CROSSES IB — MoE penalty";
  const gpuCountConsistent = gpusPerReplica > 0 && inp.totalGpus % gpusPerReplica === 0;

  // 5 · Compute sizing
  const activeParamsEffectiveB = isMoE ? inp.activatedParamsB : inp.totalParamsB;
  const attentionLayerFraction = inp.totalLayers > 0 ? inp.attentionLayers / inp.totalLayers : 0;
  const attnSeqCorrection = (inp.sequenceLength / (6 * inp.hiddenSize)) * attentionLayerFraction;
  const effectiveMfu = inp.achievedMfuBase * (isMoE ? inp.moeEfficiencyDerate : 1) * (isHybridSSM ? inp.ssmKernelDerate : 1);
  const effectivePeakPerGpuPF = isFP8 ? inp.densePeakFp8PFPerGpu : inp.densePeakBf16PFPerGpu;
  const effectiveThroughputPerGpuPF = effectivePeakPerGpuPF * effectiveMfu;
  const clusterThroughputPF = effectiveThroughputPerGpuPF * inp.totalGpus;

  const llmFlops = 6 * activeParamsEffectiveB * 1e9 * inp.trainingTokensT * 1e12 * (1 + attnSeqCorrection);
  const encoderFlops = isMultiModal
    ? 6 * inp.encoderParamsB * 1e9 * inp.trainingTokensT * 1e12 * inp.visualTokenFraction
    : 0;
  const totalTrainingFlops = (llmFlops + encoderFlops) * inp.recomputeOverhead;
  const clusterFlopsPerSec = clusterThroughputPF * 1e15;
  const trainingTimeRawDays = clusterFlopsPerSec > 0 ? totalTrainingFlops / clusterFlopsPerSec / 86400 : 0;
  const optimizerTokenEffFactor = isMuon ? inp.muonTokenEfficiencyFactor : 1;
  const trainingTimeOptimizerAdjDays = optimizerTokenEffFactor > 0 ? trainingTimeRawDays / optimizerTokenEffFactor : 0;
  const computeCostGpuHours = trainingTimeRawDays * 24 * inp.totalGpus;
  const stepTimeSec = clusterFlopsPerSec > 0
    ? (6 * activeParamsEffectiveB * 1e9 * inp.globalBatchSizeMTok * 1e6 * (1 + attnSeqCorrection) * inp.recomputeOverhead) / clusterFlopsPerSec
    : 0;

  // 6 · Memory sizing (per GPU)
  const optimizerStateBytesPerParamFull = inp.optimizer === "AdamW" ? 18 : 14;
  const modelShardDegree = inp.tp * inp.pp * inp.ep;
  const weightsGradsPerGpuGB = modelShardDegree > 0 ? (6 * inp.totalParamsB) / modelShardDegree : 0;
  const optimizerStatePerGpuGB = inp.totalGpus > 0 ? ((optimizerStateBytesPerParamFull - 6) * inp.totalParamsB) / inp.totalGpus : 0;
  const staticStatePerGpuGB = weightsGradsPerGpuGB + optimizerStatePerGpuGB;
  const activationsPerGpuGB = inp.pp > 0 && inp.tp * inp.cp > 0
    ? ((inp.microBatchSeqsPerGpu * inp.sequenceLength * inp.hiddenSize * 2 * inp.activationMultPerLayer) * (inp.totalLayers / inp.pp)) /
      (inp.tp * inp.cp) / 1e9 * (isMultiModal ? inp.multiModalActivationFactor : 1)
    : 0;
  const totalHbmUsedPerGpuGB = staticStatePerGpuGB + activationsPerGpuGB;
  const hbmHeadroomPerGpuGB = inp.hbmPerGpuGB - totalHbmUsedPerGpuGB;
  const fitsInHbm = totalHbmUsedPerGpuGB <= inp.hbmPerGpuGB * 0.92;
  const fullModelStateCheckpointGB = inp.totalParamsB * optimizerStateBytesPerParamFull;

  // 7 · Interconnect / comms
  const gradAllReducePerGpuGB = modelShardDegree > 0 ? (4 * inp.totalParamsB) / modelShardDegree : 0;
  const gradCommsTimeSec = inp.scaleOutBwPerGpuGBs > 0 ? gradAllReducePerGpuGB / inp.scaleOutBwPerGpuGBs : 0;
  const moeAllToAllPerGpuGB = isMoE && dp > 0 && inp.ep > 0
    ? (2 * inp.topK * ((inp.globalBatchSizeMTok * 1e6) / dp) * inp.hiddenSize * 2 * inp.capacityFactor * inp.moeLayers) / inp.ep / 1e9
    : 0;
  const a2aBw = inp.ep <= nvlinkDomainSize ? inp.nvlinkBwPerGpuGBs : inp.scaleOutBwPerGpuGBs;
  const allToAllTimeSec = a2aBw > 0 ? moeAllToAllPerGpuGB / a2aBw : 0;
  const totalExposedCommsSec = gradCommsTimeSec + allToAllTimeSec;
  const commsComputeRatio = stepTimeSec > 0 ? totalExposedCommsSec / stepTimeSec : 0;
  const overlapVerdict: TrainingResults["comms"]["overlapVerdict"] =
    commsComputeRatio <= 0.15 ? "comfortably overlappable" : commsComputeRatio <= 0.35 ? "overlap carefully" : "raise batch / rebalance parallelism";
  const minMicroBatches = Math.max(4 * inp.pp, 16);

  // 8 · Storage & checkpoint
  const checkpointSizeTB = fullModelStateCheckpointGB / 1000;
  const requiredCheckpointBWGBs = inp.writeWindowTargetSec > 0 ? (checkpointSizeTB * 1000) / inp.writeWindowTargetSec : 0;
  const tokenizedDatasetTB = inp.trainingTokensT * 2;
  const rawCorpusSizeTB = tokenizedDatasetTB * inp.rawCorpusMultiplier;

  // 9 · Power & facility
  const gpuOnlyPowerMW = (inp.totalGpus * inp.gpuTdpW) / 1e6;
  const facilityPowerMW = gpuOnlyPowerMW * inp.facilityPowerOverhead;
  const powerPerNodeKW = (inp.physicalGpusPerNode * inp.gpuTdpW) / 1000 * inp.facilityPowerOverhead;

  // 10 · Summary & recommended config
  const bindingConstraint: TrainingResults["summary"]["bindingConstraint"] =
    isMoE && inp.ep > nvlinkDomainSize ? "All-to-all bandwidth (EP crosses IB)"
    : hbmHeadroomPerGpuGB < inp.hbmPerGpuGB * 0.15 ? "Memory / HBM"
    : commsComputeRatio > 0.35 ? "Interconnect (DP + all-to-all)"
    : "Compute";
  const fitsCheck = tpWithinDomain && gpuCountConsistent && fitsInHbm;

  return {
    hardware: { nvlinkDomainSize },
    parallelism: { dp, nodes, gpusPerReplica, tpWithinDomain, epWithinDomain, gpuCountConsistent },
    compute: {
      activeParamsEffectiveB, attentionLayerFraction, attnSeqCorrection, effectiveMfu,
      effectivePeakPerGpuPF, effectiveThroughputPerGpuPF, clusterThroughputPF,
      llmFlops, encoderFlops, totalTrainingFlops, trainingTimeRawDays,
      optimizerTokenEffFactor, trainingTimeOptimizerAdjDays, computeCostGpuHours, stepTimeSec,
    },
    memory: {
      optimizerStateBytesPerParamFull, modelShardDegree, weightsGradsPerGpuGB, optimizerStatePerGpuGB,
      staticStatePerGpuGB, activationsPerGpuGB, totalHbmUsedPerGpuGB, hbmHeadroomPerGpuGB,
      fitsInHbm, fullModelStateCheckpointGB,
    },
    comms: {
      gradAllReducePerGpuGB, gradCommsTimeSec, moeAllToAllPerGpuGB, allToAllTimeSec,
      totalExposedCommsSec, commsComputeRatio, overlapVerdict, minMicroBatches,
    },
    storage: { checkpointSizeTB, requiredCheckpointBWGBs, tokenizedDatasetTB, rawCorpusSizeTB },
    power: { gpuOnlyPowerMW, facilityPowerMW, powerPerNodeKW },
    summary: { bindingConstraint, fitsCheck },
  };
}
