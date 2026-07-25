// ── Shared types ───────────────────────────────────────────────────────────────

export type SizingTool =
  | "postgres" | "qdrant" | "neo4j" | "mongodb" | "elastic"
  | "pydantic-ai" | "logfire" | "clickhouse";

// ── Shared helpers ─────────────────────────────────────────────────────────────

function snapUp(n: number, tiers: number[]): number {
  return tiers.find(t => t >= n) ?? tiers[tiers.length - 1];
}
function snapUpCores(n: number) { return snapUp(n, [4, 8, 16, 32, 64, 128]); }
function snapUpRAM(n: number)   { return snapUp(n, [16, 32, 64, 128, 256, 512, 1024]); }
function snapUpDisk(n: number)  { return snapUp(n, [100, 200, 500, 1000, 2000, 4000, 8000]); }
function floorPow2(n: number)   { return Math.pow(2, Math.floor(Math.log2(Math.max(n, 1)))); }

// ── PostgreSQL OLTP ────────────────────────────────────────────────────────────

export interface PGInputs {
  datasetGB: number;
  connections: number;
  activeFraction: number;    // 0-1
  avgQueryMs: number;
  hotFraction: number;       // 0-1
  storageType: "NVMe" | "SSD" | "HDD";
  writeIntensity: "Low" | "Medium" | "High";
  bgCpuAllowance: number;
}

export interface PGResults {
  cpu: {
    peakActiveQueries: number;
    rawCoreEstimate: number;
    recommendedCores: number;
    qpsCapacity: number;
  };
  memory: {
    hotWorkingSetGB: number;
    ramNeededGB: number;
    recommendedRAM: number;
    minRAM: number;
  };
  conf: {
    maxConnections: number;
    sharedBuffersGB: number;
    effectiveCacheSizeGB: number;
    maintenanceWorkMemMB: number;
    workMemMB: number;
    walBuffersMB: number;
    maxWalSizeGB: number;
    checkpointCompletionTarget: number;
    randomPageCost: number;
    effectiveIOConcurrency: number;
    maxWorkerProcesses: number;
    maxParallelWorkers: number;
    maxParallelWorkersPerGather: number;
    autovacuumVacuumScaleFactor: number;
  };
}

export const PG_DEFAULTS: PGInputs = {
  datasetGB: 100,
  connections: 32,
  activeFraction: 0.2,
  avgQueryMs: 5,
  hotFraction: 0.6,
  storageType: "NVMe",
  writeIntensity: "Medium",
  bgCpuAllowance: 1.5,
};

export function calcPG(i: PGInputs): PGResults {
  const peakActiveQueries  = i.connections * i.activeFraction;
  const rawCoreEstimate    = peakActiveQueries + i.bgCpuAllowance;
  const recommendedCores   = snapUpCores(rawCoreEstimate);
  const qpsCapacity        = recommendedCores * (1000 / i.avgQueryMs);

  const hotWorkingSetGB = i.datasetGB * i.hotFraction;
  const ramNeededGB     = hotWorkingSetGB / 0.75;
  const recommendedRAM  = snapUpRAM(ramNeededGB);
  const minRAM          = snapUpRAM(hotWorkingSetGB);

  const maxConnections         = 100;
  const sharedBuffersGB        = Math.round(recommendedRAM * 0.25);
  const effectiveCacheSizeGB   = Math.round(recommendedRAM * 0.75);
  const maintenanceWorkMemMB   = Math.min(2048, Math.round(recommendedRAM * 1024 * 0.05));
  const workMemRaw             = (recommendedRAM * 1024 * 0.25) / (maxConnections * 4);
  const workMemMB              = floorPow2(workMemRaw);
  const maxWalSizeGB           = i.writeIntensity === "High" ? 16 : i.writeIntensity === "Medium" ? 8 : 4;
  const randomPageCost         = i.storageType === "HDD" ? 4.0 : 1.1;
  const effectiveIOConcurrency = i.storageType === "HDD" ? 2 : 200;
  const autovacuumScaleFactor  = i.writeIntensity === "High" ? 0.02 : i.writeIntensity === "Medium" ? 0.05 : 0.1;

  return {
    cpu: { peakActiveQueries, rawCoreEstimate, recommendedCores, qpsCapacity },
    memory: { hotWorkingSetGB, ramNeededGB, recommendedRAM, minRAM },
    conf: {
      maxConnections,
      sharedBuffersGB,
      effectiveCacheSizeGB,
      maintenanceWorkMemMB,
      workMemMB,
      walBuffersMB: 16,
      maxWalSizeGB,
      checkpointCompletionTarget: 0.9,
      randomPageCost,
      effectiveIOConcurrency,
      maxWorkerProcesses: recommendedCores,
      maxParallelWorkers: recommendedCores,
      maxParallelWorkersPerGather: Math.floor(recommendedCores / 2),
      autovacuumVacuumScaleFactor: autovacuumScaleFactor,
    },
  };
}

// ── Qdrant Vector DB ───────────────────────────────────────────────────────────

export interface QdrantInputs {
  numVectors: number;
  dimensions: number;
  quantMode: "None" | "Scalar int8" | "Binary" | "Product";
  productQuantBytesPerDim: number;
  origVecsPlacement: "In-RAM" | "On-disk";
  hnswGraphPlacement: "In-RAM" | "On-disk";
  hnswM: number;
  payloadPerVectorBytes: number;
  nonIndexedPayloadPlacement: "In-RAM" | "On-disk";
  indexedPayloadPerVectorBytes: number;
  replicationFactor: number;
  nodes: number;
  ramUtilTarget: number;    // 0-1
  metadataOverhead: number;
  diskOverhead: number;
  targetQPS: number;
  qpsPerCore: number;
  indexingThreads: number;
}

export interface QdrantResults {
  memory: {
    quantCopyRAM: number;
    hnswRAM: number;
    indexedPayloadRAM: number;
    nonIndexedPayloadRAM: number;
    residentSubtotal: number;
    ramWithOverhead: number;
    provisionedPerCopy: number;
    totalClusterRAM: number;
    perNodeRAM: number;
    recommendedPerNodeRAM: number;
  };
  disk: {
    fullPrecDisk: number;
    quantDisk: number;
    payloadDisk: number;
    hnswDisk: number;
    rawSubtotal: number;
    diskPerCopy: number;
    totalClusterDisk: number;
    perNodeDisk: number;
    recommendedPerNodeDisk: number;
  };
  cpu: {
    searchCoresCluster: number;
    perNodeSearchCores: number;
    rawVCPUPerNode: number;
    recommendedPerNodeVCPU: number;
    sustainedQPS: number;
  };
  cluster: {
    nodes: number;
    replicationFactor: number;
    perNodeRAM: number;
    perNodeVCPU: number;
    perNodeDisk: number;
    totalClusterRAM: number;
    totalClusterVCPU: number;
    totalClusterDisk: number;
  };
}

export const QDRANT_DEFAULTS: QdrantInputs = {
  numVectors: 10_000_000,
  dimensions: 768,
  quantMode: "Scalar int8",
  productQuantBytesPerDim: 0.25,
  origVecsPlacement: "On-disk",
  hnswGraphPlacement: "In-RAM",
  hnswM: 16,
  payloadPerVectorBytes: 512,
  nonIndexedPayloadPlacement: "On-disk",
  indexedPayloadPerVectorBytes: 64,
  replicationFactor: 2,
  nodes: 3,
  ramUtilTarget: 0.75,
  metadataOverhead: 1.5,
  diskOverhead: 2.0,
  targetQPS: 1000,
  qpsPerCore: 150,
  indexingThreads: 8,
};

export function calcQdrant(i: QdrantInputs): QdrantResults {
  const N = i.numVectors;
  const D = i.dimensions;

  const quantBytesPerDim =
    i.quantMode === "None"        ? 4 :
    i.quantMode === "Scalar int8" ? 1 :
    i.quantMode === "Binary"      ? 0.125 :
    i.productQuantBytesPerDim;

  // RAM components (GB)
  const quantCopyRAM         = i.quantMode !== "None" ? (N * D * quantBytesPerDim) / 1e9 : (i.origVecsPlacement === "In-RAM" ? (N * D * 4) / 1e9 : 0);
  const hnswRAM              = i.hnswGraphPlacement === "In-RAM" ? (N * 2 * i.hnswM * 4) / 1e9 : 0;
  const indexedPayloadRAM    = (N * i.indexedPayloadPerVectorBytes) / 1e9;
  const nonIndexedPayloadRAM = i.nonIndexedPayloadPlacement === "In-RAM" ? (N * i.payloadPerVectorBytes) / 1e9 : 0;
  const residentSubtotal     = quantCopyRAM + hnswRAM + indexedPayloadRAM + nonIndexedPayloadRAM;
  const ramWithOverhead      = residentSubtotal * i.metadataOverhead;
  const provisionedPerCopy   = ramWithOverhead / i.ramUtilTarget;
  const totalClusterRAM      = provisionedPerCopy * i.replicationFactor;
  const perNodeRAM           = totalClusterRAM / i.nodes;
  const recommendedPerNodeRAM = snapUpRAM(perNodeRAM);

  // Disk components (GB)
  const fullPrecDisk = (N * D * 4) / 1e9;
  const quantDisk    = i.quantMode !== "None" ? (N * D * quantBytesPerDim) / 1e9 : 0;
  const payloadDisk  = (N * (i.payloadPerVectorBytes + i.indexedPayloadPerVectorBytes)) / 1e9;
  const hnswDisk     = (N * 2 * i.hnswM * 4) / 1e9;
  const rawSubtotal  = fullPrecDisk + quantDisk + payloadDisk + hnswDisk;
  const diskPerCopy  = rawSubtotal * i.diskOverhead;
  const totalClusterDisk = diskPerCopy * i.replicationFactor;
  const perNodeDisk  = totalClusterDisk / i.nodes;
  const recommendedPerNodeDisk = snapUpDisk(perNodeDisk);

  // CPU
  const searchCoresCluster   = Math.ceil(i.targetQPS / i.qpsPerCore);
  const perNodeSearchCores   = Math.ceil(searchCoresCluster / i.nodes);
  const indexingAllowance    = Math.ceil(i.indexingThreads / 2);
  const rawVCPUPerNode       = perNodeSearchCores + indexingAllowance;
  const recommendedPerNodeVCPU = snapUpCores(rawVCPUPerNode);
  const usableSearchCores    = recommendedPerNodeVCPU - indexingAllowance;
  const sustainedQPS         = Math.max(0, usableSearchCores) * i.nodes * i.qpsPerCore;

  return {
    memory: { quantCopyRAM, hnswRAM, indexedPayloadRAM, nonIndexedPayloadRAM, residentSubtotal, ramWithOverhead, provisionedPerCopy, totalClusterRAM, perNodeRAM, recommendedPerNodeRAM },
    disk: { fullPrecDisk, quantDisk, payloadDisk, hnswDisk, rawSubtotal, diskPerCopy, totalClusterDisk, perNodeDisk, recommendedPerNodeDisk },
    cpu: { searchCoresCluster, perNodeSearchCores, rawVCPUPerNode, recommendedPerNodeVCPU, sustainedQPS },
    cluster: {
      nodes: i.nodes,
      replicationFactor: i.replicationFactor,
      perNodeRAM: recommendedPerNodeRAM,
      perNodeVCPU: recommendedPerNodeVCPU,
      perNodeDisk: recommendedPerNodeDisk,
      totalClusterRAM:  recommendedPerNodeRAM  * i.nodes,
      totalClusterVCPU: recommendedPerNodeVCPU * i.nodes,
      totalClusterDisk: recommendedPerNodeDisk * i.nodes,
    },
  };
}

// ── Neo4j Graph DB ─────────────────────────────────────────────────────────────

export interface Neo4jInputs {
  numNodes: number;
  numRelationships: number;
  avgPropsPerNode: number;
  avgPropsPerRel: number;
  avgBytesPerProp: number;
  nativeIndexFraction: number;   // 0-1
  vectorIndexGB: number;
  storeFormatOverhead: number;   // 1.0 = standard, 1.2-1.3 = high-density
  storeGrowthHeadroom: number;   // 0.2 = 20%
  pageCacheMargin: number;       // 0.1 = 10%
  peakConcurrentReads: number;
  readQPSPerCore: number;
  targetReadThroughput: number;
  peakConcurrentWriteTxns: number;
  avgWriteTxSizeEntities: number;
  writeIntensity: "Low" | "Medium" | "High";
  hasGDS: boolean;
  osOffHeapReserveGB: number;
  highAvailability: boolean;
  maxReadCoresPerNode: number;
}

export interface Neo4jResults {
  store: {
    nodeStoreGB: number;
    relStoreGB: number;
    propStoreGB: number;
    dataSubtotalGB: number;
    nativeIndexGB: number;
    rawStoreGB: number;
    formattedStoreGB: number;
    storeWithGrowthGB: number;
  };
  memory: {
    pageCacheGB: number;
    queryHeapGB: number;
    txHeapGB: number;
    rawHeapGB: number;
    recommendedHeapGB: number;
    perNodeRAMRawGB: number;
    recommendedPerNodeRAM: number;
  };
  disk: {
    txLogsGB: number;
    checkpointScratchGB: number;
    perNodeDiskRawGB: number;
    recommendedPerNodeDisk: number;
  };
  cpu: {
    totalReadCores: number;
    perNodeReadCores: number;
    writeAllowanceCores: number;
    rawVCPUPerNode: number;
    recommendedPerNodeVCPU: number;
    sustainedReadQPS: number;
  };
  cluster: {
    primaries: number;
    secondaries: number;
    totalMembers: number;
    perNodeRAM: number;
    perNodeVCPU: number;
    perNodeDisk: number;
    totalClusterRAM: number;
    totalClusterVCPU: number;
    totalClusterDisk: number;
  };
  conf: {
    heapInitialGB: number;
    heapMaxGB: number;
    pagecacheSizeGB: number;
    txMemoryTotalMaxGB: number;
    txLogRotation: string;
  };
}

export const NEO4J_DEFAULTS: Neo4jInputs = {
  numNodes: 30_000_000,
  numRelationships: 150_000_000,
  avgPropsPerNode: 8,
  avgPropsPerRel: 2,
  avgBytesPerProp: 33,
  nativeIndexFraction: 0.35,
  vectorIndexGB: 0,
  storeFormatOverhead: 1.0,
  storeGrowthHeadroom: 0.2,
  pageCacheMargin: 0.1,
  peakConcurrentReads: 24,
  readQPSPerCore: 250,
  targetReadThroughput: 3000,
  peakConcurrentWriteTxns: 4,
  avgWriteTxSizeEntities: 5000,
  writeIntensity: "Medium",
  hasGDS: false,
  osOffHeapReserveGB: 3,
  highAvailability: true,
  maxReadCoresPerNode: 16,
};

export function calcNeo4j(i: Neo4jInputs): Neo4jResults {
  // Store sizes
  const nodeStoreGB  = (i.numNodes * 15) / 1e9;
  const relStoreGB   = (i.numRelationships * 34) / 1e9;
  const propStoreGB  = ((i.numNodes * i.avgPropsPerNode + i.numRelationships * i.avgPropsPerRel) * i.avgBytesPerProp) / 1e9;
  const dataSubtotalGB   = nodeStoreGB + relStoreGB + propStoreGB;
  const nativeIndexGB    = dataSubtotalGB * i.nativeIndexFraction;
  const rawStoreGB       = dataSubtotalGB + nativeIndexGB;
  const formattedStoreGB = rawStoreGB * i.storeFormatOverhead;
  const storeWithGrowthGB = formattedStoreGB * (1 + i.storeGrowthHeadroom);

  // Memory
  const pageCacheGB      = storeWithGrowthGB * (1 + i.pageCacheMargin);
  const queryHeapGB      = Math.max(2, 0.2 * i.peakConcurrentReads);
  const txHeapGB         = (i.peakConcurrentWriteTxns * i.avgWriteTxSizeEntities * 2048) / 1e9;
  const rawHeapGB        = queryHeapGB + txHeapGB;
  const recommendedHeapGB = snapUp(rawHeapGB, [4, 8, 16, 31, 64]);
  const perNodeRAMRawGB  = pageCacheGB + recommendedHeapGB + i.vectorIndexGB + i.osOffHeapReserveGB;
  const recommendedPerNodeRAM = snapUpRAM(perNodeRAMRawGB);

  // Disk
  const txLogFraction = i.writeIntensity === "High" ? 0.4 : i.writeIntensity === "Medium" ? 0.25 : 0.1;
  const txLogsGB      = storeWithGrowthGB * txLogFraction;
  const checkpointScratchGB = storeWithGrowthGB * 0.5;
  const perNodeDiskRawGB    = storeWithGrowthGB + txLogsGB + checkpointScratchGB;
  const recommendedPerNodeDisk = snapUpDisk(perNodeDiskRawGB);

  // CPU
  const totalReadCores   = Math.ceil(i.targetReadThroughput / i.readQPSPerCore);
  const primaryMembers   = i.highAvailability ? 3 : 1;
  const readServingMembers = Math.max(primaryMembers, Math.ceil(totalReadCores / i.maxReadCoresPerNode));
  const fromThroughput   = Math.ceil(totalReadCores / readServingMembers);
  const fromConcurrency  = Math.ceil(i.peakConcurrentReads / readServingMembers);
  const perNodeReadCores = Math.max(fromThroughput, fromConcurrency);
  const writeAllowanceCores = 2;
  const rawVCPUPerNode   = perNodeReadCores + writeAllowanceCores;
  const recommendedPerNodeVCPU = snapUpCores(rawVCPUPerNode);
  const sustainedReadQPS = perNodeReadCores * readServingMembers * i.readQPSPerCore;

  const secondaries  = Math.max(0, readServingMembers - primaryMembers);
  const totalMembers = primaryMembers + secondaries;

  const txLogRotation = i.writeIntensity === "High" ? "2 days / 4 GB" : i.writeIntensity === "Medium" ? "2 days / 2 GB" : "7 days / 1 GB";

  return {
    store: { nodeStoreGB, relStoreGB, propStoreGB, dataSubtotalGB, nativeIndexGB, rawStoreGB, formattedStoreGB, storeWithGrowthGB },
    memory: { pageCacheGB, queryHeapGB, txHeapGB, rawHeapGB, recommendedHeapGB, perNodeRAMRawGB, recommendedPerNodeRAM },
    disk: { txLogsGB, checkpointScratchGB, perNodeDiskRawGB, recommendedPerNodeDisk },
    cpu: { totalReadCores, perNodeReadCores, writeAllowanceCores, rawVCPUPerNode, recommendedPerNodeVCPU, sustainedReadQPS },
    cluster: {
      primaries: primaryMembers,
      secondaries,
      totalMembers,
      perNodeRAM: recommendedPerNodeRAM,
      perNodeVCPU: recommendedPerNodeVCPU,
      perNodeDisk: recommendedPerNodeDisk,
      totalClusterRAM:  recommendedPerNodeRAM  * totalMembers,
      totalClusterVCPU: recommendedPerNodeVCPU * totalMembers,
      totalClusterDisk: recommendedPerNodeDisk * totalMembers,
    },
    conf: {
      heapInitialGB: recommendedHeapGB,
      heapMaxGB: recommendedHeapGB,
      pagecacheSizeGB: pageCacheGB,
      txMemoryTotalMaxGB: Math.round(recommendedHeapGB * 0.7 * 10) / 10,
      txLogRotation,
    },
  };
}

// ── Elasticsearch / Elastic Stack ─────────────────────────────────────────────

export type ElasticWorkload = "Logs" | "Search";

export interface ElasticInputs {
  // Workload
  workloadType: ElasticWorkload;
  dailyIngestGB: number;
  searchCorpusGB: number;        // only for Search workload
  avgDocSizeB: number;
  annualGrowthPct: number;       // 0.4 = 40%/yr
  horizonYears: number;
  indexExpansionRatio: number;   // indexed / raw, typically 1.0–1.3

  // ILM tiers
  hotRetentionDays: number;
  warmRetentionDays: number;     // 0 = no warm tier
  coldRetentionDays: number;     // 0 = no cold tier
  hotReplicas: number;
  warmReplicas: number;
  coldReplicas: number;
  forceMergeGain: number;        // compression gain on merge (warm/cold)

  // Storage targets
  diskUtilTarget: number;        // 0–1 (0.8 = 80%)
  mergeHeadroom: number;         // overhead multiplier (1.15)

  // Memory / heap
  jvmHeapFraction: number;       // fraction of node RAM (0.5)
  maxJvmHeapGB: number;          // hard ceiling (31)

  // Disk density (GB disk per GB RAM)
  hotDiskRamRatio: number;       // ~30
  warmDiskRamRatio: number;      // ~160
  coldDiskRamRatio: number;      // ~350

  // Shards
  targetShardSizeGB: number;     // 40 GB
  maxShardsPerGBHeap: number;    // 20
  fsCacheTargetFraction: number; // 0.03 for logs, 0.5 for search

  // Throughput inputs
  peakToAvgIngestRatio: number;  // 1.5
  ingestThroughputPerVcpu: number; // MB/s per core
  peakSearchQPS: number;
  searchQPSPerVcpu: number;

  // Node shape ceilings
  maxRamPerNodeGB: number;       // 64
  maxVcpuPerNode: number;        // 16
  maxDiskPerNodeGB: number;      // 6000

  // Cluster options
  dedicatedMasters: boolean;
  dedicatedCoordinating: boolean;
  snapshotRetentionDays: number;
}

export interface ElasticResults {
  dataFootprint: {
    dailyIngestAtHorizon: number;
    searchCorpusAtHorizon: number;
    dailyIndexedGB: number;
    hotPrimaryGB: number;
    hotWithReplicasGB: number;
    warmPrimaryGB: number;
    warmWithReplicasGB: number;
    coldPrimaryGB: number;
    coldWithReplicasGB: number;
    totalOnDiskGB: number;
    provisionedHotGB: number;
    provisionedWarmGB: number;
    provisionedColdGB: number;
    totalProvisionedGB: number;
    snapshotRepositoryGB: number;
  };
  cpu: {
    indexingCores: number;
    searchCores: number;
    mergeAllowanceCores: number;
    totalVcpuDemand: number;
  };
  hotTier: {
    jvmHeapPerNodeGB: number;
    freeRamPerNodeGB: number;
    diskPerHotNodeGB: number;
    primaryShardsPerIndex: number;
    hotTierShards: number;
    shardCapacityPerNode: number;
    hotNodesByDisk: number;
    hotNodesByCPU: number;
    hotNodesByShardCount: number;
    hotNodesByPageCache: number;
    recommendedHotNodes: number;
    achievedPageCacheCoverage: number;
    perHotNodeVcpu: number;
  };
  warmColdTier: {
    diskPerWarmNodeGB: number;
    warmTierShards: number;
    warmNodesByDisk: number;
    warmNodesByShardCount: number;
    recommendedWarmNodes: number;
    diskPerColdNodeGB: number;
    coldTierShards: number;
    coldNodesByDisk: number;
    coldNodesByShardCount: number;
    recommendedColdNodes: number;
  };
  cluster: {
    totalDataNodes: number;
    masterNodes: number;
    coordinatingNodes: number;
    totalNodes: number;
    totalDataTierRAM: number;
    totalDataTierVcpu: number;
    totalDataTierDisk: number;
    totalShards: number;
    shardsPerDataNode: number;
  };
  conf: {
    jvmXmxGB: number;
    primaryShardsPerIndex: number;
    replicas: number;
    refreshInterval: string;
    ilmRolloverSizeGB: number;
    ilmWarmPhaseAtDays: number;
    ilmColdPhaseAtDays: number;
    ilmDeleteAtDays: number;
  };
}

export const ELASTIC_DEFAULTS: ElasticInputs = {
  workloadType:             "Logs",
  dailyIngestGB:            500,
  searchCorpusGB:           0,
  avgDocSizeB:              800,
  annualGrowthPct:          0.4,
  horizonYears:             2,
  indexExpansionRatio:      1.1,
  hotRetentionDays:         7,
  warmRetentionDays:        23,
  coldRetentionDays:        60,
  hotReplicas:              1,
  warmReplicas:             1,
  coldReplicas:             0,
  forceMergeGain:           1.1,
  diskUtilTarget:           0.8,
  mergeHeadroom:            1.15,
  jvmHeapFraction:          0.5,
  maxJvmHeapGB:             31,
  hotDiskRamRatio:          30,
  warmDiskRamRatio:         160,
  coldDiskRamRatio:         350,
  targetShardSizeGB:        40,
  maxShardsPerGBHeap:       20,
  fsCacheTargetFraction:    0.03,
  peakToAvgIngestRatio:     1.5,
  ingestThroughputPerVcpu:  3,
  peakSearchQPS:            50,
  searchQPSPerVcpu:         10,
  maxRamPerNodeGB:          64,
  maxVcpuPerNode:           16,
  maxDiskPerNodeGB:         6000,
  dedicatedMasters:         true,
  dedicatedCoordinating:    false,
  snapshotRetentionDays:    90,
};

export function calcElastic(i: ElasticInputs): ElasticResults {
  const isSearch = i.workloadType === "Search";

  // Section 2 – Data footprint
  const dailyIngestAtHorizon   = i.dailyIngestGB  * Math.pow(1 + i.annualGrowthPct, i.horizonYears);
  const searchCorpusAtHorizon  = i.searchCorpusGB * Math.pow(1 + i.annualGrowthPct, i.horizonYears);
  const dailyIndexedGB         = dailyIngestAtHorizon * i.indexExpansionRatio;

  const hotPrimaryGB           = isSearch
    ? searchCorpusAtHorizon * i.indexExpansionRatio
    : dailyIndexedGB * i.hotRetentionDays;
  const hotWithReplicasGB      = hotPrimaryGB * (1 + i.hotReplicas);

  const warmPrimaryGB          = isSearch ? 0 : dailyIndexedGB * i.warmRetentionDays / i.forceMergeGain;
  const warmWithReplicasGB     = warmPrimaryGB * (1 + i.warmReplicas);

  const coldPrimaryGB          = isSearch ? 0 : dailyIndexedGB * i.coldRetentionDays / i.forceMergeGain;
  const coldWithReplicasGB     = coldPrimaryGB * (1 + i.coldReplicas);

  const totalOnDiskGB          = hotWithReplicasGB + warmWithReplicasGB + coldWithReplicasGB;
  const provisionedHotGB       = hotWithReplicasGB  * i.mergeHeadroom / i.diskUtilTarget;
  const provisionedWarmGB      = warmWithReplicasGB * i.mergeHeadroom / i.diskUtilTarget;
  const provisionedColdGB      = coldWithReplicasGB * i.mergeHeadroom / i.diskUtilTarget;
  const totalProvisionedGB     = provisionedHotGB + provisionedWarmGB + provisionedColdGB;
  const snapshotRepositoryGB   = isSearch ? hotPrimaryGB : dailyIndexedGB * i.snapshotRetentionDays;

  // Section 3 – CPU
  const avgIngestRateMBps      = dailyIngestAtHorizon * 1000 / 86400;
  const peakIngestRateMBps     = avgIngestRateMBps * i.peakToAvgIngestRatio;
  const indexingCores          = Math.ceil(peakIngestRateMBps * (1 + i.hotReplicas) / i.ingestThroughputPerVcpu);
  const searchCores            = Math.ceil(i.peakSearchQPS / i.searchQPSPerVcpu);
  const mergeAllowanceCores    = Math.ceil((indexingCores + searchCores) * 0.2);
  const totalVcpuDemand        = indexingCores + searchCores + mergeAllowanceCores;

  // Section 4 – Hot tier
  const jvmHeapPerNodeGB       = Math.min(i.maxJvmHeapGB, i.maxRamPerNodeGB * i.jvmHeapFraction);
  const freeRamPerNodeGB       = i.maxRamPerNodeGB - jvmHeapPerNodeGB;
  const diskPerHotNodeGB       = Math.min(i.maxDiskPerNodeGB, i.maxRamPerNodeGB * i.hotDiskRamRatio);
  const primaryShardsPerIndex  = isSearch
    ? Math.max(1, Math.ceil(hotPrimaryGB / i.targetShardSizeGB))
    : Math.max(1, Math.ceil(dailyIndexedGB / i.targetShardSizeGB));
  const hotTierShards          = isSearch
    ? primaryShardsPerIndex * (1 + i.hotReplicas)
    : primaryShardsPerIndex * i.hotRetentionDays * (1 + i.hotReplicas);
  const shardCapacityPerNode   = jvmHeapPerNodeGB * i.maxShardsPerGBHeap;
  const hotNodesByDisk         = Math.ceil(provisionedHotGB / diskPerHotNodeGB);
  const hotNodesByCPU          = Math.ceil(totalVcpuDemand / i.maxVcpuPerNode);
  const hotNodesByShardCount   = Math.ceil(hotTierShards / shardCapacityPerNode);
  const hotNodesByPageCache    = Math.ceil(hotWithReplicasGB * i.fsCacheTargetFraction / freeRamPerNodeGB);
  const minHotNodes            = i.hotReplicas >= 1 ? 2 : 1;
  const recommendedHotNodes    = Math.max(minHotNodes, hotNodesByDisk, hotNodesByCPU, hotNodesByShardCount, hotNodesByPageCache);
  const achievedPageCacheCoverage = recommendedHotNodes * freeRamPerNodeGB / hotWithReplicasGB;
  const perHotNodeVcpuRaw      = Math.ceil(totalVcpuDemand / recommendedHotNodes);
  const perHotNodeVcpu         = perHotNodeVcpuRaw <= 8 ? 8 : perHotNodeVcpuRaw <= 16 ? 16 : perHotNodeVcpuRaw <= 32 ? 32 : 64;

  // Section 5 – Warm & cold tiers
  const diskPerWarmNodeGB      = Math.min(i.maxDiskPerNodeGB, i.maxRamPerNodeGB * i.warmDiskRamRatio);
  const warmTierShards         = warmPrimaryGB === 0 ? 0 : primaryShardsPerIndex * i.warmRetentionDays * (1 + i.warmReplicas);
  const warmNodesByDisk        = warmWithReplicasGB === 0 ? 0 : Math.ceil(provisionedWarmGB / diskPerWarmNodeGB);
  const warmNodesByShardCount  = warmWithReplicasGB === 0 ? 0 : Math.ceil(warmTierShards / shardCapacityPerNode);
  const recommendedWarmNodes   = warmWithReplicasGB === 0 ? 0
    : Math.max(i.warmReplicas >= 1 ? 2 : 1, warmNodesByDisk, warmNodesByShardCount);

  const diskPerColdNodeGB      = Math.min(i.maxDiskPerNodeGB, i.maxRamPerNodeGB * i.coldDiskRamRatio);
  const coldTierShards         = coldPrimaryGB === 0 ? 0 : primaryShardsPerIndex * i.coldRetentionDays * (1 + i.coldReplicas);
  const coldNodesByDisk        = coldWithReplicasGB === 0 ? 0 : Math.ceil(provisionedColdGB / diskPerColdNodeGB);
  const coldNodesByShardCount  = coldWithReplicasGB === 0 ? 0 : Math.ceil(coldTierShards / shardCapacityPerNode);
  const recommendedColdNodes   = coldWithReplicasGB === 0 ? 0
    : Math.max(i.coldReplicas >= 1 ? 2 : 1, coldNodesByDisk, coldNodesByShardCount);

  // Section 6 – Cluster topology
  const totalDataNodes         = recommendedHotNodes + recommendedWarmNodes + recommendedColdNodes;
  const masterNodes            = i.dedicatedMasters ? 3 : 0;
  const coordinatingNodes      = i.dedicatedCoordinating ? Math.max(2, Math.ceil(totalDataNodes / 10)) : 0;
  const totalNodes             = totalDataNodes + masterNodes + coordinatingNodes;
  const totalDataTierRAM       = i.maxRamPerNodeGB * totalDataNodes;
  const totalDataTierVcpu      = perHotNodeVcpu * recommendedHotNodes + 8 * (recommendedWarmNodes + recommendedColdNodes);
  const totalShards            = hotTierShards + warmTierShards + coldTierShards;
  const shardsPerDataNode      = totalDataNodes > 0 ? totalShards / totalDataNodes : 0;

  return {
    dataFootprint: {
      dailyIngestAtHorizon, searchCorpusAtHorizon, dailyIndexedGB,
      hotPrimaryGB, hotWithReplicasGB, warmPrimaryGB, warmWithReplicasGB,
      coldPrimaryGB, coldWithReplicasGB, totalOnDiskGB,
      provisionedHotGB, provisionedWarmGB, provisionedColdGB,
      totalProvisionedGB, snapshotRepositoryGB,
    },
    cpu: { indexingCores, searchCores, mergeAllowanceCores, totalVcpuDemand },
    hotTier: {
      jvmHeapPerNodeGB, freeRamPerNodeGB, diskPerHotNodeGB,
      primaryShardsPerIndex, hotTierShards, shardCapacityPerNode,
      hotNodesByDisk, hotNodesByCPU, hotNodesByShardCount, hotNodesByPageCache,
      recommendedHotNodes, achievedPageCacheCoverage, perHotNodeVcpu,
    },
    warmColdTier: {
      diskPerWarmNodeGB, warmTierShards, warmNodesByDisk, warmNodesByShardCount, recommendedWarmNodes,
      diskPerColdNodeGB, coldTierShards, coldNodesByDisk, coldNodesByShardCount, recommendedColdNodes,
    },
    cluster: {
      totalDataNodes, masterNodes, coordinatingNodes, totalNodes,
      totalDataTierRAM, totalDataTierVcpu, totalDataTierDisk: totalProvisionedGB,
      totalShards, shardsPerDataNode,
    },
    conf: {
      jvmXmxGB:           jvmHeapPerNodeGB,
      primaryShardsPerIndex,
      replicas:           i.hotReplicas,
      refreshInterval:    isSearch ? "1s" : "30s",
      ilmRolloverSizeGB:  i.targetShardSizeGB,
      ilmWarmPhaseAtDays: i.hotRetentionDays,
      ilmColdPhaseAtDays: i.hotRetentionDays + i.warmRetentionDays,
      ilmDeleteAtDays:    i.hotRetentionDays + i.warmRetentionDays + i.coldRetentionDays,
    },
  };
}

// ── MongoDB WiredTiger ─────────────────────────────────────────────────────────

export interface MongoDBInputs {
  // Data model
  docCount: number;
  avgDocSizeB: number;
  annualGrowthPct: number;      // e.g. 0.5 = 50%/yr
  horizonYears: number;
  indexesPerCollection: number;
  avgIndexEntrySizeB: number;
  // Storage
  dataCompressionRatio: number; // e.g. 3
  indexCompressionRatio: number;
  workingSetFraction: number;   // fraction of logical data that is hot
  // Operations
  cacheHitRatio: number;        // 0–1
  peakConnections: number;
  readOpsPerSec: number;
  writeOpsPerSec: number;
  readOpsPerCore: number;
  writeOpsPerCore: number;
  aggregationHeavy: boolean;
  writeAmplification: number;   // WT journal + oplog amplification
  oplogRetentionHrs: number;
  // Node ceilings (for shard calculation)
  maxRamPerNodeGB: number;
  maxDiskPerNodeGB: number;
  maxVcpuPerNode: number;
  haRequired: boolean;
}

export interface MongoDBResults {
  dataFootprint: {
    docsAtHorizon: number;
    logicalDataGB: number;
    indexSizeUncompGB: number;
    storedDataGB: number;
    storedIndexGB: number;
    provisionedDiskGB: number;
  };
  memoryDemand: {
    hotWorkingSetGB: number;
    indexWorkingSetGB: number;
    aggAllowanceGB: number;
    requiredWTCacheGB: number;
    connectionMemGB: number;
    impliedRAMGB: number;
  };
  sharding: {
    shardsByRAM: number;
    shardsByDisk: number;
    shardsByCPU: number;
    recommendedShards: number;
  };
  perNode: {
    wtCacheGB: number;
    recommendedRAMGB: number;
    recommendedDiskGB: number;
    recommendedVcpu: number;
    readIOPS: number;
    writeIOPS: number;
    totalIOPS: number;
  };
  cluster: {
    membersPerShard: number;
    dataBearingNodes: number;
    configNodes: number;
    mongosRouters: number;
    totalNodes: number;
    totalRAMGB: number;
    totalDiskGB: number;
    totalVcpu: number;
  };
  conf: {
    cacheSizeGB: number;
    blockCompressor: string;
    oplogSizeMB: number;
    maxIncomingConnections: number;
  };
}

export const MONGODB_DEFAULTS: MongoDBInputs = {
  docCount:              500_000_000,
  avgDocSizeB:           1_200,
  annualGrowthPct:       0.5,
  horizonYears:          2,
  indexesPerCollection:  6,
  avgIndexEntrySizeB:    48,
  dataCompressionRatio:  3,
  indexCompressionRatio: 1.5,
  workingSetFraction:    0.2,
  cacheHitRatio:         0.95,
  peakConnections:       2_000,
  readOpsPerSec:         120_000,
  writeOpsPerSec:        20_000,
  readOpsPerCore:        4_000,
  writeOpsPerCore:       1_500,
  aggregationHeavy:      false,
  writeAmplification:    4,
  oplogRetentionHrs:     25,
  maxRamPerNodeGB:       256,
  maxDiskPerNodeGB:      2_000,
  maxVcpuPerNode:        64,
  haRequired:            true,
};

export function calcMongoDB(i: MongoDBInputs): MongoDBResults {
  // Section 2 – Data footprint at planning horizon
  const docsAtHorizon = i.docCount * Math.pow(1 + i.annualGrowthPct, i.horizonYears);
  const logicalDataGB = docsAtHorizon * i.avgDocSizeB / 1e9;
  const indexSizeUncompGB = docsAtHorizon * i.indexesPerCollection * i.avgIndexEntrySizeB / 1e9;
  const storedDataGB  = logicalDataGB     / i.dataCompressionRatio;
  const storedIndexGB = indexSizeUncompGB / i.indexCompressionRatio;
  const storedWithFragGB = (storedDataGB + storedIndexGB) * 1.25; // 25% fragmentation headroom
  const avgOplogEntrySizeB = i.avgDocSizeB * 0.5;
  const oplogVolumeGB = i.writeOpsPerSec * avgOplogEntrySizeB * i.oplogRetentionHrs * 3600 / 1e9;
  const rawDiskGB = storedWithFragGB + oplogVolumeGB + (storedDataGB + storedIndexGB) * 0.1;
  const provisionedDiskGB = rawDiskGB / 0.7; // 70 % utilisation target

  // Section 3 – Memory demand
  const hotWorkingSetGB  = logicalDataGB * i.workingSetFraction;
  const indexWorkingSetGB = indexSizeUncompGB; // indexes fully in WT cache
  const aggAllowanceGB   = i.aggregationHeavy ? Math.max(i.peakConnections * 1 / 1024, 2) : 0;
  const requiredWTCacheGB = hotWorkingSetGB + indexWorkingSetGB + aggAllowanceGB;
  const connectionMemGB  = i.peakConnections / 1024;  // ~1 MB each
  const impliedRAMGB = requiredWTCacheGB / 0.5 + 1 + connectionMemGB + 4; // OS reserve = 4 GB

  // Section 4 – CPU & sharding
  const readCores = i.readOpsPerSec / i.readOpsPerCore;
  const writeCores = i.writeOpsPerSec / i.writeOpsPerCore;
  const aggCores  = i.aggregationHeavy ? Math.max(readCores * 0.3, 4) : 0;
  const vcpuDemand = readCores + writeCores + aggCores;

  const shardsByRAM  = Math.max(1, Math.ceil(impliedRAMGB     / i.maxRamPerNodeGB));
  const shardsByDisk = Math.max(1, Math.ceil(provisionedDiskGB / i.maxDiskPerNodeGB));
  const shardsByCPU  = Math.max(1, Math.ceil(vcpuDemand       / i.maxVcpuPerNode));
  const recommendedShards = Math.max(shardsByRAM, shardsByDisk, shardsByCPU);

  // Section 5 – Per-node sizing
  const wtCacheGB      = requiredWTCacheGB / recommendedShards;
  const connMemPerNode = connectionMemGB   / recommendedShards;
  const rawRAM = wtCacheGB / 0.5 + 1 + connMemPerNode + 4;
  const recommendedRAMGB  = snapUpRAM(rawRAM);
  const rawDiskPerNode    = provisionedDiskGB / recommendedShards;
  const recommendedDiskGB = snapUpDisk(rawDiskPerNode);
  const rawVcpu           = vcpuDemand / recommendedShards;
  const recommendedVcpu   = snapUpCores(rawVcpu);

  const readIOPS  = i.readOpsPerSec  * (1 - i.cacheHitRatio) * 2 / recommendedShards;
  const writeIOPS = i.writeOpsPerSec * i.writeAmplification   / recommendedShards;
  const totalIOPS = Math.ceil(readIOPS + writeIOPS);

  // Section 6 – Cluster topology
  const membersPerShard    = i.haRequired ? 3 : 1;
  const dataBearingNodes   = recommendedShards * membersPerShard;
  const configNodes        = recommendedShards > 1 ? 3 : 0;
  const mongosRouters      = recommendedShards > 1 ? Math.max(2, recommendedShards) : 0;
  const totalNodes         = dataBearingNodes + configNodes + mongosRouters;

  // Config recommendations
  const cacheSizeGB = Math.round(wtCacheGB * 10) / 10;
  const blockCompressor = i.aggregationHeavy ? "zstd" : "snappy";
  const oplogSizeMB = Math.ceil(
    i.writeOpsPerSec * avgOplogEntrySizeB * i.oplogRetentionHrs * 3600 / 1e6 * 1.2,
  );
  const maxIncomingConnections = Math.ceil(i.peakConnections * 1.2 / recommendedShards);

  return {
    dataFootprint: { docsAtHorizon, logicalDataGB, indexSizeUncompGB, storedDataGB, storedIndexGB, provisionedDiskGB },
    memoryDemand:  { hotWorkingSetGB, indexWorkingSetGB, aggAllowanceGB, requiredWTCacheGB, connectionMemGB, impliedRAMGB },
    sharding:      { shardsByRAM, shardsByDisk, shardsByCPU, recommendedShards },
    perNode:       { wtCacheGB, recommendedRAMGB, recommendedDiskGB, recommendedVcpu, readIOPS, writeIOPS, totalIOPS },
    cluster: {
      membersPerShard, dataBearingNodes, configNodes, mongosRouters, totalNodes,
      totalRAMGB:  recommendedRAMGB  * dataBearingNodes,
      totalDiskGB: recommendedDiskGB * dataBearingNodes,
      totalVcpu:   recommendedVcpu   * dataBearingNodes,
    },
    conf: { cacheSizeGB, blockCompressor, oplogSizeMB, maxIncomingConnections },
  };
}

// ── Pydantic AI (Agent App Tier) ──────────────────────────────────────────────────
// Formulas ported 1:1 from pydantic_ai_sizing.xlsx (public/) — verified against its sample figures.

export interface PydanticAIInputs {
  peakRunsPerSec: number;
  stepsPerRun: number;
  avgLlmLatencyPerStepSec: number;
  toolCallsPerRun: number;
  avgToolLatencyPerCallSec: number;
  localCpuWorkPerStepMs: number;
  ramPerInFlightRunMB: number;
  retryOverheadFactor: number;
  maxConcurrentRunsPerWorker: number;
  workerProcessesPerNode: number;
  usableVcpuPerNode: number;
  usableRamPerNodeGB: number;
  cpuUtilizationTarget: number;
  concurrencySafetyHeadroom: number;
  durableExecutionBackend: "None" | "DBOS (Postgres)" | "Temporal (cluster)";
  checkpointsPerRun: number;
  avgCheckpointSizeKB: number;
}

export interface PydanticAIResults {
  concurrency: {
    avgRunWallTimeSec: number;
    activeCpuPerRunMs: number;
    ioWaitFraction: number;
    peakConcurrentInFlightRuns: number;
    provisionedConcurrency: number;
  };
  fleet: {
    workersByConcurrency: number;
    activeCpuSecondsPerSecFleet: number;
    coresByActiveCpu: number;
    requiredWorkers: number;
  };
  memory: {
    ramForInFlightRunsGB: number;
    workerRuntimeOverheadGB: number;
    totalAgentTierRamGB: number;
  };
  recommended: {
    nodesByWorkers: number;
    nodesByRam: number;
    nodesByVcpu: number;
    recommendedNodes: number;
    recommendedFleetVcpu: number;
    recommendedFleetRamGB: number;
  };
  modelDemand: {
    modelRequestsPerSecDemanded: number;
    peakConcurrentModelCalls: number;
  };
  durability: {
    enabled: boolean;
    checkpointWriteRate: number;
    checkpointWriteThroughputMBs: number;
    durabilityWriteIOPS: number;
  };
}

export const PYDANTIC_AI_DEFAULTS: PydanticAIInputs = {
  peakRunsPerSec: 50,
  stepsPerRun: 4,
  avgLlmLatencyPerStepSec: 3,
  toolCallsPerRun: 3,
  avgToolLatencyPerCallSec: 0.4,
  localCpuWorkPerStepMs: 15,
  ramPerInFlightRunMB: 8,
  retryOverheadFactor: 1.15,
  maxConcurrentRunsPerWorker: 250,
  workerProcessesPerNode: 8,
  usableVcpuPerNode: 64,
  usableRamPerNodeGB: 128,
  cpuUtilizationTarget: 0.7,
  concurrencySafetyHeadroom: 0.3,
  durableExecutionBackend: "DBOS (Postgres)",
  checkpointsPerRun: 8,
  avgCheckpointSizeKB: 12,
};

export function calcPydanticAI(i: PydanticAIInputs): PydanticAIResults {
  const avgRunWallTimeSec = (i.stepsPerRun * i.avgLlmLatencyPerStepSec + i.toolCallsPerRun * i.avgToolLatencyPerCallSec) * i.retryOverheadFactor;
  const activeCpuPerRunMs = i.stepsPerRun * i.localCpuWorkPerStepMs * i.retryOverheadFactor;
  const ioWaitFraction = 1 - (activeCpuPerRunMs / 1000) / avgRunWallTimeSec;
  const peakConcurrentInFlightRuns = i.peakRunsPerSec * avgRunWallTimeSec;
  const provisionedConcurrency = peakConcurrentInFlightRuns * (1 + i.concurrencySafetyHeadroom);

  const workersByConcurrency = Math.ceil(provisionedConcurrency / i.maxConcurrentRunsPerWorker);
  const activeCpuSecondsPerSecFleet = i.peakRunsPerSec * (activeCpuPerRunMs / 1000);
  const coresByActiveCpu = Math.ceil(activeCpuSecondsPerSecFleet / i.cpuUtilizationTarget);
  const requiredWorkers = Math.max(workersByConcurrency, coresByActiveCpu);

  const ramForInFlightRunsGB = provisionedConcurrency * i.ramPerInFlightRunMB / 1000;
  const workerRuntimeOverheadGB = requiredWorkers * 0.25;
  const totalAgentTierRamGB = ramForInFlightRunsGB + workerRuntimeOverheadGB;

  const nodesByWorkers = Math.ceil(requiredWorkers / i.workerProcessesPerNode);
  const nodesByRam = Math.ceil(totalAgentTierRamGB / i.usableRamPerNodeGB);
  const nodesByVcpu = Math.ceil(coresByActiveCpu / i.usableVcpuPerNode);
  const recommendedNodes = Math.max(nodesByWorkers, nodesByRam, nodesByVcpu, 2);
  const recommendedFleetVcpu = recommendedNodes * i.usableVcpuPerNode;
  const recommendedFleetRamGB = recommendedNodes * i.usableRamPerNodeGB;

  const modelRequestsPerSecDemanded = i.peakRunsPerSec * i.stepsPerRun * i.retryOverheadFactor;
  const peakConcurrentModelCalls = i.peakRunsPerSec * i.stepsPerRun * i.avgLlmLatencyPerStepSec * i.retryOverheadFactor;

  const durabilityEnabled = i.durableExecutionBackend !== "None";
  const checkpointWriteRate = durabilityEnabled ? i.peakRunsPerSec * i.checkpointsPerRun * i.retryOverheadFactor : 0;
  const checkpointWriteThroughputMBs = checkpointWriteRate * i.avgCheckpointSizeKB / 1000;
  const durabilityWriteIOPS = checkpointWriteRate * 1.5;

  return {
    concurrency: { avgRunWallTimeSec, activeCpuPerRunMs, ioWaitFraction, peakConcurrentInFlightRuns, provisionedConcurrency },
    fleet: { workersByConcurrency, activeCpuSecondsPerSecFleet, coresByActiveCpu, requiredWorkers },
    memory: { ramForInFlightRunsGB, workerRuntimeOverheadGB, totalAgentTierRamGB },
    recommended: { nodesByWorkers, nodesByRam, nodesByVcpu, recommendedNodes, recommendedFleetVcpu, recommendedFleetRamGB },
    modelDemand: { modelRequestsPerSecDemanded, peakConcurrentModelCalls },
    durability: { enabled: durabilityEnabled, checkpointWriteRate, checkpointWriteThroughputMBs, durabilityWriteIOPS },
  };
}

// ── Pydantic Logfire (Self-Hosted) ────────────────────────────────────────────────
// Formulas ported 1:1 from pydantic_logfire_sizing.xlsx (public/) — verified against its sample figures.

export interface LogfireInputs {
  peakSpansPerSec: number;
  peakLogsPerSec: number;
  peakMetricPointsPerSec: number;
  avgBytesPerSpan: number;
  avgBytesPerLog: number;
  avgBytesPerMetricPoint: number;
  peakToAvgRatio: number;
  compressionRatio: number;
  retentionDays: number;
  peakQueryQPS: number;
  haMinReplicas: number;
  localSsdScratchFloorGB: number;
  ingestPodThroughputPerPod: number;
  ingestPodVcpu: number;
  ingestPodRamGB: number;
  queryPodVcpu: number;
  queryPodRamGB: number;
  queryPodQPSPerPod: number;
  cachePods: number;
  cacheStoragePerPodGB: number;
  cacheWorkerPodVcpuEach: number;
  cacheWorkerPodRamEachGB: number;
  compactionMaintenanceWorkers: number;
  fixedSupportVcpu: number;
  fixedSupportRamGB: number;
  postgresVcpu: number;
  postgresRamGB: number;
  refNodeUsableVcpu: number;
  refNodeUsableRamGB: number;
}

export interface LogfireResults {
  objectStorage: {
    avgSpansPerSec: number;
    avgLogsPerSec: number;
    avgMetricPtsPerSec: number;
    uncompressedPerDayGB: number;
    compressedPerDayGB: number;
    retainedObjectStorageRawGB: number;
    objectStorageWithHeadroomGB: number;
    recommendedObjectStorageGB: number;
    recommendedObjectStorageTB: number;
  };
  ingestTier: {
    totalIngestEventsPerSecPeak: number;
    ingestPodsByLoad: number;
    recommendedIngestPods: number;
    ingestTierVcpu: number;
    ingestTierRamGB: number;
    ingestScratchPVCGB: number;
    cacheStorageTotalGB: number;
    compactionScratchGB: number;
    modeledLocalSSDGB: number;
    recommendedLocalSSDScratchGB: number;
  };
  queryWorkerTier: {
    queryPodsByLoad: number;
    recommendedQueryPods: number;
    queryTierVcpu: number;
    queryTierRamGB: number;
    cacheTierVcpu: number;
    cacheTierRamGB: number;
    workerTierVcpu: number;
    workerTierRamGB: number;
  };
  cluster: {
    totalApplicationVcpu: number;
    totalApplicationRamGB: number;
    nodesByVcpu: number;
    nodesByRam: number;
    recommendedWorkerNodes: number;
    totalProvisionedVcpu: number;
    totalProvisionedRamGB: number;
    objectStorageCapacityTB: number;
    localSSDScratchTotalGB: number;
    postgresVcpu: number;
    postgresRamGB: number;
  };
}

export const LOGFIRE_DEFAULTS: LogfireInputs = {
  peakSpansPerSec: 20000,
  peakLogsPerSec: 5000,
  peakMetricPointsPerSec: 2000,
  avgBytesPerSpan: 1200,
  avgBytesPerLog: 600,
  avgBytesPerMetricPoint: 120,
  peakToAvgRatio: 3,
  compressionRatio: 8,
  retentionDays: 30,
  peakQueryQPS: 30,
  haMinReplicas: 3,
  localSsdScratchFloorGB: 512,
  ingestPodThroughputPerPod: 3000,
  ingestPodVcpu: 2,
  ingestPodRamGB: 4,
  queryPodVcpu: 2,
  queryPodRamGB: 2,
  queryPodQPSPerPod: 8,
  cachePods: 2,
  cacheStoragePerPodGB: 256,
  cacheWorkerPodVcpuEach: 4,
  cacheWorkerPodRamEachGB: 8,
  compactionMaintenanceWorkers: 4,
  fixedSupportVcpu: 6,
  fixedSupportRamGB: 10,
  postgresVcpu: 4,
  postgresRamGB: 16,
  refNodeUsableVcpu: 64,
  refNodeUsableRamGB: 256,
};

function snapUpTo(n: number, step: number): number {
  return Math.ceil(n / step) * step;
}

export function calcLogfire(i: LogfireInputs): LogfireResults {
  const avgSpansPerSec = i.peakSpansPerSec / i.peakToAvgRatio;
  const avgLogsPerSec = i.peakLogsPerSec / i.peakToAvgRatio;
  const avgMetricPtsPerSec = i.peakMetricPointsPerSec / i.peakToAvgRatio;
  const uncompressedPerDayGB =
    (avgSpansPerSec * i.avgBytesPerSpan + avgLogsPerSec * i.avgBytesPerLog + avgMetricPtsPerSec * i.avgBytesPerMetricPoint)
    * 86400 / 1e9;
  const compressedPerDayGB = uncompressedPerDayGB / i.compressionRatio;
  const retainedObjectStorageRawGB = compressedPerDayGB * i.retentionDays;
  const objectStorageWithHeadroomGB = retainedObjectStorageRawGB * 1.3;
  const recommendedObjectStorageGB = snapUpTo(objectStorageWithHeadroomGB, 1000);
  const recommendedObjectStorageTB = recommendedObjectStorageGB / 1000;

  const totalIngestEventsPerSecPeak = i.peakSpansPerSec + i.peakLogsPerSec + i.peakMetricPointsPerSec;
  const ingestPodsByLoad = Math.ceil(totalIngestEventsPerSecPeak / i.ingestPodThroughputPerPod);
  const recommendedIngestPods = Math.max(ingestPodsByLoad, 2 * i.haMinReplicas);
  const ingestTierVcpu = recommendedIngestPods * i.ingestPodVcpu;
  const ingestTierRamGB = recommendedIngestPods * i.ingestPodRamGB;
  const ingestScratchPVCGB = recommendedIngestPods * 16;
  const cacheStorageTotalGB = i.cachePods * i.cacheStoragePerPodGB;
  const compactionScratchGB = i.compactionMaintenanceWorkers * 32;
  const modeledLocalSSDGB = ingestScratchPVCGB + cacheStorageTotalGB + compactionScratchGB;
  const recommendedLocalSSDScratchGB = snapUpTo(Math.max(modeledLocalSSDGB, i.localSsdScratchFloorGB), 128);

  const queryPodsByLoad = Math.ceil(i.peakQueryQPS / i.queryPodQPSPerPod);
  const recommendedQueryPods = Math.max(queryPodsByLoad, i.haMinReplicas);
  const queryTierVcpu = recommendedQueryPods * i.queryPodVcpu;
  const queryTierRamGB = recommendedQueryPods * i.queryPodRamGB;
  const cacheTierVcpu = i.cachePods * i.cacheWorkerPodVcpuEach;
  const cacheTierRamGB = i.cachePods * i.cacheWorkerPodRamEachGB;
  const workerTierVcpu = i.compactionMaintenanceWorkers * i.cacheWorkerPodVcpuEach;
  const workerTierRamGB = i.compactionMaintenanceWorkers * i.cacheWorkerPodRamEachGB;

  const totalApplicationVcpu = ingestTierVcpu + queryTierVcpu + cacheTierVcpu + workerTierVcpu + i.fixedSupportVcpu;
  const totalApplicationRamGB = ingestTierRamGB + queryTierRamGB + cacheTierRamGB + workerTierRamGB + i.fixedSupportRamGB;
  const nodesByVcpu = Math.ceil(totalApplicationVcpu / i.refNodeUsableVcpu);
  const nodesByRam = Math.ceil(totalApplicationRamGB / i.refNodeUsableRamGB);
  const recommendedWorkerNodes = Math.max(nodesByVcpu, nodesByRam, i.haMinReplicas);
  const totalProvisionedVcpu = recommendedWorkerNodes * i.refNodeUsableVcpu;
  const totalProvisionedRamGB = recommendedWorkerNodes * i.refNodeUsableRamGB;

  return {
    objectStorage: {
      avgSpansPerSec, avgLogsPerSec, avgMetricPtsPerSec, uncompressedPerDayGB, compressedPerDayGB,
      retainedObjectStorageRawGB, objectStorageWithHeadroomGB, recommendedObjectStorageGB, recommendedObjectStorageTB,
    },
    ingestTier: {
      totalIngestEventsPerSecPeak, ingestPodsByLoad, recommendedIngestPods, ingestTierVcpu, ingestTierRamGB,
      ingestScratchPVCGB, cacheStorageTotalGB, compactionScratchGB, modeledLocalSSDGB, recommendedLocalSSDScratchGB,
    },
    queryWorkerTier: {
      queryPodsByLoad, recommendedQueryPods, queryTierVcpu, queryTierRamGB,
      cacheTierVcpu, cacheTierRamGB, workerTierVcpu, workerTierRamGB,
    },
    cluster: {
      totalApplicationVcpu, totalApplicationRamGB, nodesByVcpu, nodesByRam, recommendedWorkerNodes,
      totalProvisionedVcpu, totalProvisionedRamGB, objectStorageCapacityTB: recommendedObjectStorageTB,
      localSSDScratchTotalGB: recommendedLocalSSDScratchGB, postgresVcpu: i.postgresVcpu, postgresRamGB: i.postgresRamGB,
    },
  };
}

// ── ClickHouse (Observability / Logs) ─────────────────────────────────────────────
// Formulas ported 1:1 from clickhouse_sizing.xlsx (public/) — verified against its sample figures.

export interface ClickHouseInputs {
  dailyRawIngestTodayGB: number;
  avgRawEventSizeBytes: number;
  annualDataGrowth: number;
  planningHorizonYears: number;
  compressionRatio: number;
  mergePartOverhead: number;
  hotRetentionDays: number;
  coldRetentionDays: number;
  replicationFactor: number;
  nvmeUtilizationTarget: number;
  peakToAvgIngestRatio: number;
  ingestMergeThroughputPerVcpuMBs: number;
  peakConcurrentQueries: number;
  avgDataScannedPerQueryGB: number;
  targetQueryLatencyP95Sec: number;
  scanThroughputPerVcpuGBs: number;
  workingMemPerQueryGB: number;
  coldCacheFractionLocal: number;
  ramReservedFraction: number;
  maxRamPerNodeGB: number;
  maxVcpuPerNode: number;
  maxNvmePerNodeGB: number;
  keeperEnsemble: boolean;
}

export interface ClickHouseResults {
  dataFootprint: {
    dailyRawIngestAtHorizonGB: number;
    rowsPerDayAtHorizon: number;
    dailyOnDiskCompressedGB: number;
    hotData1CopyGB: number;
    hotLocalStoredInclMergeGB: number;
    coldData1CopyGB: number;
    coldLocalCacheGB: number;
    localNvmePerCopyProvisionedGB: number;
    totalNvmeInclReplicasGB: number;
    objectStoreCapacityColdGB: number;
    totalUniqueDataManagedGB: number;
    storageSavedVsRaw: number;
  };
  ingestMerge: {
    avgIngestRateMBs: number;
    peakIngestRateMBs: number;
    peakInsertRateRowsPerSec: number;
    ingestMergeCores: number;
    backgroundMergeAllowanceCores: number;
  };
  queryCompute: {
    queryScanCores: number;
    queryWorkingRamGB: number;
    totalVcpuDemand: number;
    totalQueryRamDemandGB: number;
  };
  sharding: {
    usableQueryRamPerNodeGB: number;
    shardsByNvme: number;
    shardsByCpu: number;
    shardsByRam: number;
    recommendedShards: number;
    bindingConstraint: string;
  };
  cluster: {
    shards: number;
    replicasPerShard: number;
    serverNodes: number;
    keeperNodes: number;
    totalNodes: number;
    perNodeRamGB: number;
    perNodeVcpu: number;
    perNodeNvmeGB: number;
    totalClusterVcpu: number;
    totalClusterRamGB: number;
    totalNvmeProvisionedGB: number;
  };
  conf: {
    tableEngine: string;
    orderBy: string;
    partitionBy: string;
    indexGranularity: number;
    ttlMoveDays: number;
    ttlDeleteDays: number;
    storagePolicy: string;
    timestampCodec: string;
    defaultCodec: string;
    minInsertBatchRows: number;
    partsToThrowInsert: number;
    maxConcurrentQueries: number;
    backgroundPoolSize: number;
  };
}

export const CLICKHOUSE_DEFAULTS: ClickHouseInputs = {
  dailyRawIngestTodayGB: 2000,
  avgRawEventSizeBytes: 600,
  annualDataGrowth: 0.5,
  planningHorizonYears: 2,
  compressionRatio: 10,
  mergePartOverhead: 1.3,
  hotRetentionDays: 30,
  coldRetentionDays: 180,
  replicationFactor: 2,
  nvmeUtilizationTarget: 0.8,
  peakToAvgIngestRatio: 1.5,
  ingestMergeThroughputPerVcpuMBs: 20,
  peakConcurrentQueries: 20,
  avgDataScannedPerQueryGB: 3,
  targetQueryLatencyP95Sec: 3,
  scanThroughputPerVcpuGBs: 1.5,
  workingMemPerQueryGB: 4,
  coldCacheFractionLocal: 0.05,
  ramReservedFraction: 0.2,
  maxRamPerNodeGB: 256,
  maxVcpuPerNode: 64,
  maxNvmePerNodeGB: 24000,
  keeperEnsemble: true,
};

export function calcClickHouse(i: ClickHouseInputs): ClickHouseResults {
  const dailyRawIngestAtHorizonGB = i.dailyRawIngestTodayGB * Math.pow(1 + i.annualDataGrowth, i.planningHorizonYears);
  const rowsPerDayAtHorizon = dailyRawIngestAtHorizonGB * 1e9 / i.avgRawEventSizeBytes;
  const dailyOnDiskCompressedGB = dailyRawIngestAtHorizonGB / i.compressionRatio;
  const hotData1CopyGB = dailyOnDiskCompressedGB * i.hotRetentionDays;
  const hotLocalStoredInclMergeGB = hotData1CopyGB * i.mergePartOverhead;
  const coldData1CopyGB = dailyOnDiskCompressedGB * i.coldRetentionDays;
  const coldLocalCacheGB = coldData1CopyGB * i.coldCacheFractionLocal;
  const localNvmePerCopyProvisionedGB = (hotLocalStoredInclMergeGB + coldLocalCacheGB) / i.nvmeUtilizationTarget;
  const totalNvmeInclReplicasGB = localNvmePerCopyProvisionedGB * i.replicationFactor;
  const objectStoreCapacityColdGB = coldData1CopyGB;
  const totalUniqueDataManagedGB = hotData1CopyGB + coldData1CopyGB;
  const storageSavedVsRaw = 1 - 1 / i.compressionRatio;

  const avgIngestRateMBs = dailyRawIngestAtHorizonGB * 1000 / 86400;
  const peakIngestRateMBs = avgIngestRateMBs * i.peakToAvgIngestRatio;
  const peakInsertRateRowsPerSec = (rowsPerDayAtHorizon / 86400) * i.peakToAvgIngestRatio;
  const ingestMergeCores = Math.ceil(peakIngestRateMBs / i.ingestMergeThroughputPerVcpuMBs);
  const backgroundMergeAllowanceCores = Math.ceil(ingestMergeCores / 2);

  const queryScanCores = Math.ceil(
    (i.peakConcurrentQueries * i.avgDataScannedPerQueryGB) / (i.scanThroughputPerVcpuGBs * i.targetQueryLatencyP95Sec),
  );
  const queryWorkingRamGB = i.peakConcurrentQueries * i.workingMemPerQueryGB;
  const totalVcpuDemand = ingestMergeCores + backgroundMergeAllowanceCores + queryScanCores;
  const totalQueryRamDemandGB = queryWorkingRamGB;

  const usableQueryRamPerNodeGB = i.maxRamPerNodeGB * (1 - i.ramReservedFraction);
  const shardsByNvme = Math.ceil(localNvmePerCopyProvisionedGB / i.maxNvmePerNodeGB);
  const shardsByCpu = Math.ceil(totalVcpuDemand / i.maxVcpuPerNode);
  const shardsByRam = Math.ceil(totalQueryRamDemandGB / usableQueryRamPerNodeGB);
  const recommendedShards = Math.max(shardsByNvme, shardsByCpu, shardsByRam, 1);
  const bindingConstraint =
    recommendedShards === shardsByNvme ? "NVMe capacity"
    : recommendedShards === shardsByCpu ? "CPU (vCPU demand)"
    : "Query RAM";

  const shards = recommendedShards;
  const replicasPerShard = i.replicationFactor;
  const serverNodes = shards * replicasPerShard;
  const keeperNodes = i.keeperEnsemble ? 3 : 0;
  const totalNodes = serverNodes + keeperNodes;
  const totalClusterVcpu = serverNodes * i.maxVcpuPerNode;
  const totalClusterRamGB = serverNodes * i.maxRamPerNodeGB;
  const totalNvmeProvisionedGB = serverNodes * i.maxNvmePerNodeGB;

  return {
    dataFootprint: {
      dailyRawIngestAtHorizonGB, rowsPerDayAtHorizon, dailyOnDiskCompressedGB, hotData1CopyGB, hotLocalStoredInclMergeGB,
      coldData1CopyGB, coldLocalCacheGB, localNvmePerCopyProvisionedGB, totalNvmeInclReplicasGB,
      objectStoreCapacityColdGB, totalUniqueDataManagedGB, storageSavedVsRaw,
    },
    ingestMerge: { avgIngestRateMBs, peakIngestRateMBs, peakInsertRateRowsPerSec, ingestMergeCores, backgroundMergeAllowanceCores },
    queryCompute: { queryScanCores, queryWorkingRamGB, totalVcpuDemand, totalQueryRamDemandGB },
    sharding: { usableQueryRamPerNodeGB, shardsByNvme, shardsByCpu, shardsByRam, recommendedShards, bindingConstraint },
    cluster: {
      shards, replicasPerShard, serverNodes, keeperNodes, totalNodes,
      perNodeRamGB: i.maxRamPerNodeGB, perNodeVcpu: i.maxVcpuPerNode, perNodeNvmeGB: i.maxNvmePerNodeGB,
      totalClusterVcpu, totalClusterRamGB, totalNvmeProvisionedGB,
    },
    conf: {
      tableEngine: "ReplicatedMergeTree",
      orderBy: "(service, toStartOfHour(ts), level)",
      partitionBy: "toYYYYMMDD(timestamp)",
      indexGranularity: 8192,
      ttlMoveDays: i.hotRetentionDays,
      ttlDeleteDays: i.hotRetentionDays + i.coldRetentionDays,
      storagePolicy: "hot_nvme + cold_s3 (tiered)",
      timestampCodec: "CODEC(Delta, ZSTD(1))",
      defaultCodec: "ZSTD(1)",
      minInsertBatchRows: 100000,
      partsToThrowInsert: 3000,
      maxConcurrentQueries: 100,
      backgroundPoolSize: 32,
    },
  };
}

// ── Cross-tool normalizer (Agentic Stack sizing table) ──────────────────────────

export type AnyInputs =
  | PGInputs | QdrantInputs | Neo4jInputs | MongoDBInputs | ElasticInputs
  | PydanticAIInputs | LogfireInputs | ClickHouseInputs;

export interface ResourceSummary {
  cores: number;
  ramGB: number;
  /** GPU accelerators needed. 0 for every calculator today — populated once a GPU-serving tool is wired in. */
  gpuCount: number;
}

/** Collapses each tool's differently-shaped Results into one normalized resource row. */
export function summarizeResources(tool: SizingTool, inputs: AnyInputs): ResourceSummary {
  switch (tool) {
    case "postgres": {
      const r = calcPG(inputs as PGInputs);
      return { cores: r.cpu.recommendedCores, ramGB: r.memory.recommendedRAM, gpuCount: 0 };
    }
    case "qdrant": {
      const r = calcQdrant(inputs as QdrantInputs);
      return { cores: r.cluster.totalClusterVCPU, ramGB: r.cluster.totalClusterRAM, gpuCount: 0 };
    }
    case "neo4j": {
      const r = calcNeo4j(inputs as Neo4jInputs);
      return { cores: r.cluster.totalClusterVCPU, ramGB: r.cluster.totalClusterRAM, gpuCount: 0 };
    }
    case "mongodb": {
      const r = calcMongoDB(inputs as MongoDBInputs);
      return { cores: r.cluster.totalVcpu, ramGB: r.cluster.totalRAMGB, gpuCount: 0 };
    }
    case "elastic": {
      const r = calcElastic(inputs as ElasticInputs);
      return { cores: r.cluster.totalDataTierVcpu, ramGB: r.cluster.totalDataTierRAM, gpuCount: 0 };
    }
    case "pydantic-ai": {
      const r = calcPydanticAI(inputs as PydanticAIInputs);
      return { cores: r.recommended.recommendedFleetVcpu, ramGB: r.recommended.recommendedFleetRamGB, gpuCount: 0 };
    }
    case "logfire": {
      const r = calcLogfire(inputs as LogfireInputs);
      return { cores: r.cluster.totalProvisionedVcpu, ramGB: r.cluster.totalProvisionedRamGB, gpuCount: 0 };
    }
    case "clickhouse": {
      const r = calcClickHouse(inputs as ClickHouseInputs);
      return { cores: r.cluster.totalClusterVcpu, ramGB: r.cluster.totalClusterRamGB, gpuCount: 0 };
    }
  }
}
