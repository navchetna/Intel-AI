// RL / Post-Training Sizing — ported 1:1 from public/rl_posttraining_sizing.xlsx ("Sizing" sheet).
// Every formula below was verified against the sheet's actual cell formulas.

export type RlAlgorithm = "PPO" | "GRPO" | "RLOO" | "DPO" | "RFT";
export type Deployment = "Colocated" | "Disaggregated";
export type RewardSource = "Rule-based" | "Model-based" | "Hybrid";
export type TaskType = "Single-turn" | "Agentic";
export type ComputePrecision = "BF16" | "FP8";
export type HardwarePlatform = "DGX B300" | "GB300 NVL72";
export type RlOptimizer = "AdamW" | "Muon";

export interface RLTrainingInputs {
  // 0 · Configuration
  rlAlgorithm: RlAlgorithm;
  deployment: Deployment;
  rewardSource: RewardSource;
  taskType: TaskType;
  computePrecision: ComputePrecision;
  hardwarePlatform: HardwarePlatform;

  // 1 · Models in play
  policyParamsB: number;
  referenceParamsB: number;
  rewardModelParamsB: number;
  criticParamsB: number;
  optimizer: RlOptimizer;
  modelLayers: number;
  hiddenSize: number;
  gqaRatio: number;

  // 2 · RL algorithm parameters
  promptsPerStep: number;
  groupSize: number;
  promptLength: number;
  generationLengthPerTurn: number;
  turnsAgentic: number;
  toolLatencyPerTurnSec: number;
  ppoUpdateEpochs: number;
  rftAcceptRate: number;
  stepsToConvergence: number;

  // 3 · Hardware platform
  physicalGpusPerNode: number;
  hbmPerGpuGB: number;
  gpuTdpW: number;
  densePeakBf16PFPerGpu: number;
  densePeakFp8PFPerGpu: number;
  trainingMfu: number;
  decodeThroughputPerRolloutGpu: number;
  scaleOutBwPerGpuGBs: number;
  nvlinkBwPerGpuGBs: number;
  facilityPowerOverhead: number;

  // 5 · Rollout / generation cluster
  rolloutGpus: number;
  rolloutTp: number;

  // 6 · Training cluster
  trainingGpus: number;

  // 7 · Cross-cluster weight sync
  syncEveryNSteps: number;

  // 10 · Storage & checkpoint
  checkpointIntervalSteps: number;
}

export const RL_TRAINING_DEFAULTS: RLTrainingInputs = {
  rlAlgorithm: "GRPO",
  deployment: "Disaggregated",
  rewardSource: "Rule-based",
  taskType: "Single-turn",
  computePrecision: "BF16",
  hardwarePlatform: "DGX B300",

  policyParamsB: 32,
  referenceParamsB: 32,
  rewardModelParamsB: 32,
  criticParamsB: 32,
  optimizer: "AdamW",
  modelLayers: 64,
  hiddenSize: 8192,
  gqaRatio: 8,

  promptsPerStep: 1024,
  groupSize: 8,
  promptLength: 1024,
  generationLengthPerTurn: 4096,
  turnsAgentic: 1,
  toolLatencyPerTurnSec: 2,
  ppoUpdateEpochs: 1,
  rftAcceptRate: 0.3,
  stepsToConvergence: 1000,

  physicalGpusPerNode: 8,
  hbmPerGpuGB: 288,
  gpuTdpW: 1400,
  densePeakBf16PFPerGpu: 2.5,
  densePeakFp8PFPerGpu: 5,
  trainingMfu: 0.3,
  decodeThroughputPerRolloutGpu: 3000,
  scaleOutBwPerGpuGBs: 100,
  nvlinkBwPerGpuGBs: 900,
  facilityPowerOverhead: 1.4,

  rolloutGpus: 64,
  rolloutTp: 8,

  trainingGpus: 256,

  syncEveryNSteps: 1,

  checkpointIntervalSteps: 50,
};

export interface RLTrainingResults {
  hardware: {
    nvlinkDomainSize: number;
  };
  flags: {
    generationActive: boolean;
    referenceActive: boolean;
    criticActive: boolean;
    rewardModelActive: boolean;
    effectiveGroupSize: number;
  };
  rollout: {
    generatedDecodeTokensPerStep: number;
    decodeTimePerStepSec: number;
    toolLatencyTimePerStepSec: number;
    rolloutTimePerStepSec: number;
    kvBytesPerToken: number;
    maxContextPerTrajectory: number;
    kvPerSequenceGB: number;
    rolloutWeightMemPerGpuGB: number;
    kvBudgetPerGpuGB: number;
    maxConcurrentTrajectoriesPerGpu: number;
  };
  training: {
    trainedTokensPerStep: number;
    policyUpdateFlopsPerStep: number;
    referenceForwardFlops: number;
    rewardForwardFlops: number;
    criticFlops: number;
    totalTrainFlopsPerStep: number;
    effectivePeakPerGpuPF: number;
    trainThroughputPerGpuPF: number;
    trainTimePerStepSec: number;
  };
  sync: {
    policyWeightPayloadGB: number;
    syncBandwidthGBs: number;
    weightSyncTimePerStepSec: number;
  };
  memory: {
    optimizerBytesPerParam: number;
    policyStatePerGpuGB: number;
    referencePerGpuGB: number;
    rewardModelPerGpuGB: number;
    criticPerGpuGB: number;
    totalResidentPerGpuGB: number;
    fitsTrainingHbm: boolean;
  };
  balance: {
    rlStepTimeSec: number;
    generationFractionOfActiveTime: number;
    rolloutTrainTimeRatio: number;
    balanceVerdict: "offline — no rollout pool" | "generation-bound — grow rollout or shrink train pool" | "train-bound — grow train or shrink rollout pool" | "balanced";
    totalGpus: number;
    totalWallClockHours: number;
    gpuHours: number;
  };
  storage: {
    policyCheckpointSizeTB: number;
    experienceBufferPerStepGB: number;
  };
  power: {
    rolloutPowerMW: number;
    trainingPowerMW: number;
    totalFacilityPowerMW: number;
  };
  summary: {
    bindingCluster: "Training (offline)" | "Rollout / generation" | "Training" | "Balanced";
    configValid: boolean;
  };
}

export function calcRLTraining(inp: RLTrainingInputs): RLTrainingResults {
  const isDPO = inp.rlAlgorithm === "DPO";
  const isRFT = inp.rlAlgorithm === "RFT";
  const isPPO = inp.rlAlgorithm === "PPO";
  const isGroupSampled = inp.rlAlgorithm === "GRPO" || inp.rlAlgorithm === "RLOO";
  const isColocated = inp.deployment === "Colocated";
  const isAgentic = inp.taskType === "Agentic";
  const isFP8 = inp.computePrecision === "FP8";
  const isAdamW = inp.optimizer === "AdamW";

  // 3 · Hardware platform
  const nvlinkDomainSize = inp.hardwarePlatform === "DGX B300" ? 8 : 72;

  // 4 · Algorithm flags
  const generationActive = !isDPO;
  const referenceActive = !isRFT;
  const criticActive = isPPO;
  const rewardModelActive = inp.rewardSource !== "Rule-based" && !isDPO;
  const effectiveGroupSize = isGroupSampled ? inp.groupSize : 1;

  // 5 · Rollout / generation cluster
  const generatedDecodeTokensPerStep = (generationActive ? 1 : 0) * inp.promptsPerStep * effectiveGroupSize * inp.turnsAgentic * inp.generationLengthPerTurn;
  const decodeTimePerStepSec = inp.rolloutGpus === 0 ? 0 : generatedDecodeTokensPerStep / (inp.rolloutGpus * inp.decodeThroughputPerRolloutGpu);
  const toolLatencyTimePerStepSec = isAgentic ? inp.turnsAgentic * inp.toolLatencyPerTurnSec : 0;
  const rolloutTimePerStepSec = decodeTimePerStepSec + toolLatencyTimePerStepSec;
  const kvBytesPerToken = 2 * inp.modelLayers * (inp.hiddenSize / inp.gqaRatio) * 2;
  const maxContextPerTrajectory = inp.promptLength + inp.turnsAgentic * inp.generationLengthPerTurn;
  const kvPerSequenceGB = (kvBytesPerToken * maxContextPerTrajectory) / 1e9;
  const rolloutWeightMemPerGpuGB = inp.rolloutTp === 0 ? 0 : (2 * inp.policyParamsB) / inp.rolloutTp;
  const kvBudgetPerGpuGB = inp.hbmPerGpuGB * 0.9 - rolloutWeightMemPerGpuGB;
  const maxConcurrentTrajectoriesPerGpu = kvPerSequenceGB === 0 ? 0 : (kvBudgetPerGpuGB / kvPerSequenceGB) * inp.rolloutTp;

  // 6 · Training cluster
  const trainedTokensPerStep = isDPO
    ? inp.promptsPerStep * 2 * (inp.promptLength + inp.generationLengthPerTurn)
    : isRFT
    ? inp.promptsPerStep * effectiveGroupSize * (inp.promptLength + inp.turnsAgentic * inp.generationLengthPerTurn) * inp.rftAcceptRate
    : inp.promptsPerStep * effectiveGroupSize * (inp.promptLength + inp.turnsAgentic * inp.generationLengthPerTurn);
  const policyUpdateFlopsPerStep = 6 * inp.policyParamsB * 1e9 * trainedTokensPerStep * inp.ppoUpdateEpochs;
  const referenceForwardFlops = (referenceActive ? 1 : 0) * 2 * inp.referenceParamsB * 1e9 * trainedTokensPerStep;
  const rewardForwardFlops = (rewardModelActive ? 1 : 0) * 2 * inp.rewardModelParamsB * 1e9 * inp.promptsPerStep * effectiveGroupSize * (inp.promptLength + inp.turnsAgentic * inp.generationLengthPerTurn);
  const criticFlops = (criticActive ? 1 : 0) * 6 * inp.criticParamsB * 1e9 * trainedTokensPerStep;
  const totalTrainFlopsPerStep = policyUpdateFlopsPerStep + referenceForwardFlops + rewardForwardFlops + criticFlops;
  const effectivePeakPerGpuPF = isFP8 ? inp.densePeakFp8PFPerGpu : inp.densePeakBf16PFPerGpu;
  const trainThroughputPerGpuPF = effectivePeakPerGpuPF * inp.trainingMfu;
  const trainTimePerStepSec = inp.trainingGpus === 0 ? 0 : totalTrainFlopsPerStep / (inp.trainingGpus * trainThroughputPerGpuPF * 1e15);

  // 7 · Cross-cluster weight sync
  const policyWeightPayloadGB = 2 * inp.policyParamsB;
  const syncBandwidthGBs = isColocated ? inp.nvlinkBwPerGpuGBs : inp.scaleOutBwPerGpuGBs;
  const weightSyncTimePerStepSec = inp.syncEveryNSteps === 0 ? 0 : policyWeightPayloadGB / syncBandwidthGBs / inp.syncEveryNSteps;

  // 8 · Training-cluster memory (per GPU)
  const optimizerBytesPerParam = isAdamW ? 18 : 14;
  const policyStatePerGpuGB = inp.trainingGpus === 0 ? 0 : (optimizerBytesPerParam * inp.policyParamsB) / inp.trainingGpus;
  const referencePerGpuGB = inp.trainingGpus === 0 ? 0 : ((referenceActive ? 1 : 0) * 2 * inp.referenceParamsB) / inp.trainingGpus;
  const rewardModelPerGpuGB = inp.trainingGpus === 0 ? 0 : ((rewardModelActive ? 1 : 0) * 2 * inp.rewardModelParamsB) / inp.trainingGpus;
  const criticPerGpuGB = inp.trainingGpus === 0 ? 0 : ((criticActive ? 1 : 0) * optimizerBytesPerParam * inp.criticParamsB) / inp.trainingGpus;
  const totalResidentPerGpuGB = policyStatePerGpuGB + referencePerGpuGB + rewardModelPerGpuGB + criticPerGpuGB;
  const fitsTrainingHbm = totalResidentPerGpuGB <= inp.hbmPerGpuGB * 0.85;

  // 9 · Throughput balance
  const rlStepTimeSec = isColocated
    ? rolloutTimePerStepSec + trainTimePerStepSec + weightSyncTimePerStepSec
    : Math.max(rolloutTimePerStepSec, trainTimePerStepSec) + weightSyncTimePerStepSec;
  const generationFractionOfActiveTime = (rolloutTimePerStepSec + trainTimePerStepSec) === 0 ? 0 : rolloutTimePerStepSec / (rolloutTimePerStepSec + trainTimePerStepSec);
  const rolloutTrainTimeRatio = trainTimePerStepSec === 0 ? 0 : rolloutTimePerStepSec / trainTimePerStepSec;
  const balanceVerdict: RLTrainingResults["balance"]["balanceVerdict"] =
    !generationActive ? "offline — no rollout pool"
    : rolloutTrainTimeRatio > 1.5 ? "generation-bound — grow rollout or shrink train pool"
    : rolloutTrainTimeRatio < 0.67 ? "train-bound — grow train or shrink rollout pool"
    : "balanced";
  const totalGpus = isColocated ? Math.max(inp.rolloutGpus, inp.trainingGpus) : inp.rolloutGpus + inp.trainingGpus;
  const totalWallClockHours = (rlStepTimeSec * inp.stepsToConvergence) / 3600;
  const gpuHours = totalWallClockHours * totalGpus;

  // 10 · Storage & checkpoint
  const policyCheckpointSizeTB = (inp.policyParamsB * optimizerBytesPerParam) / 1000;
  const experienceBufferPerStepGB = ((generatedDecodeTokensPerStep + trainedTokensPerStep) * 4) / 1e9;

  // 11 · Power & facility
  const rolloutPowerMW = (inp.rolloutGpus * inp.gpuTdpW) / 1e6 * inp.facilityPowerOverhead;
  const trainingPowerMW = (inp.trainingGpus * inp.gpuTdpW) / 1e6 * inp.facilityPowerOverhead;
  const totalFacilityPowerMW = isColocated ? Math.max(rolloutPowerMW, trainingPowerMW) : rolloutPowerMW + trainingPowerMW;

  // 12 · Summary & recommended config
  const bindingCluster: RLTrainingResults["summary"]["bindingCluster"] =
    !generationActive ? "Training (offline)"
    : rolloutTrainTimeRatio > 1.2 ? "Rollout / generation"
    : rolloutTrainTimeRatio < 0.83 ? "Training"
    : "Balanced";
  const configValid = fitsTrainingHbm && inp.rolloutTp <= nvlinkDomainSize;

  return {
    hardware: { nvlinkDomainSize },
    flags: { generationActive, referenceActive, criticActive, rewardModelActive, effectiveGroupSize },
    rollout: {
      generatedDecodeTokensPerStep, decodeTimePerStepSec, toolLatencyTimePerStepSec, rolloutTimePerStepSec,
      kvBytesPerToken, maxContextPerTrajectory, kvPerSequenceGB, rolloutWeightMemPerGpuGB,
      kvBudgetPerGpuGB, maxConcurrentTrajectoriesPerGpu,
    },
    training: {
      trainedTokensPerStep, policyUpdateFlopsPerStep, referenceForwardFlops, rewardForwardFlops, criticFlops,
      totalTrainFlopsPerStep, effectivePeakPerGpuPF, trainThroughputPerGpuPF, trainTimePerStepSec,
    },
    sync: { policyWeightPayloadGB, syncBandwidthGBs, weightSyncTimePerStepSec },
    memory: {
      optimizerBytesPerParam, policyStatePerGpuGB, referencePerGpuGB, rewardModelPerGpuGB, criticPerGpuGB,
      totalResidentPerGpuGB, fitsTrainingHbm,
    },
    balance: {
      rlStepTimeSec, generationFractionOfActiveTime, rolloutTrainTimeRatio, balanceVerdict,
      totalGpus, totalWallClockHours, gpuHours,
    },
    storage: { policyCheckpointSizeTB, experienceBufferPerStepGB },
    power: { rolloutPowerMW, trainingPowerMW, totalFacilityPowerMW },
    summary: { bindingCluster, configValid },
  };
}
