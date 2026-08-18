import type ExcelJS from "exceljs";
import { calcElastic, type ElasticInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, max, min, iff, eq, pow, snapUpFormula } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

/** `expr === 0 ? 0 : elseExpr` guard, used throughout the warm/cold tiers to skip sizing when
 *  that tier isn't in use. */
function zeroGuard(zeroTestExpr: string, elseExpr: string): string {
  return iff(`${zeroTestExpr}=0`, "0", elseExpr);
}

export function buildElasticSheet(ws: ExcelJS.Worksheet, i: ElasticInputs): WorkloadSheetResult {
  const r = calcElastic(i);
  const s = new FormulaSheet(ws);
  s.title("Elasticsearch — Logs/Search Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcElastic() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs — Workload");
  const workloadType = s.input("Workload type", i.workloadType, { validation: ["Logs", "Search"] });
  const isSearch = `${eq(workloadType, "Search")}`;
  const dailyIngestGB = s.input("Daily ingest (GB)", i.dailyIngestGB, { numFmt: NUMFMT.int });
  const searchCorpusGB = s.input("Search corpus (GB, Search only)", i.searchCorpusGB, { numFmt: NUMFMT.int });
  s.input("Avg doc size (B)", i.avgDocSizeB, { numFmt: NUMFMT.int });
  const annualGrowthPct = s.input("Annual growth (0–1)", i.annualGrowthPct, { numFmt: NUMFMT.dec2 });
  const horizonYears = s.input("Planning horizon (years)", i.horizonYears, { numFmt: NUMFMT.int });
  const indexExpansionRatio = s.input("Index expansion ratio", i.indexExpansionRatio, { numFmt: NUMFMT.dec2 });
  s.blank();

  s.section("Inputs — ILM Tiers");
  const hotRetentionDays = s.input("Hot retention (days)", i.hotRetentionDays, { numFmt: NUMFMT.int });
  const warmRetentionDays = s.input("Warm retention (days)", i.warmRetentionDays, { numFmt: NUMFMT.int });
  const coldRetentionDays = s.input("Cold retention (days)", i.coldRetentionDays, { numFmt: NUMFMT.int });
  const hotReplicas = s.input("Hot replicas", i.hotReplicas, { numFmt: NUMFMT.int });
  const warmReplicas = s.input("Warm replicas", i.warmReplicas, { numFmt: NUMFMT.int });
  const coldReplicas = s.input("Cold replicas", i.coldReplicas, { numFmt: NUMFMT.int });
  const forceMergeGain = s.input("Force-merge gain ×", i.forceMergeGain, { numFmt: NUMFMT.dec2 });
  s.blank();

  s.section("Inputs — Storage & Memory Targets");
  const diskUtilTarget = s.input("Disk utilization target (0–1)", i.diskUtilTarget, { numFmt: NUMFMT.dec2 });
  const mergeHeadroom = s.input("Merge headroom ×", i.mergeHeadroom, { numFmt: NUMFMT.dec2 });
  const jvmHeapFraction = s.input("JVM heap fraction (0–1)", i.jvmHeapFraction, { numFmt: NUMFMT.dec2 });
  const maxJvmHeapGB = s.input("Max JVM heap (GB)", i.maxJvmHeapGB, { numFmt: NUMFMT.int });
  const hotDiskRamRatio = s.input("Hot disk:RAM ratio", i.hotDiskRamRatio, { numFmt: NUMFMT.int });
  const warmDiskRamRatio = s.input("Warm disk:RAM ratio", i.warmDiskRamRatio, { numFmt: NUMFMT.int });
  const coldDiskRamRatio = s.input("Cold disk:RAM ratio", i.coldDiskRamRatio, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Inputs — Shards & Throughput");
  const targetShardSizeGB = s.input("Target shard size (GB)", i.targetShardSizeGB, { numFmt: NUMFMT.int });
  const maxShardsPerGBHeap = s.input("Max shards/GB heap", i.maxShardsPerGBHeap, { numFmt: NUMFMT.int });
  const fsCacheTargetFraction = s.input("FS cache target fraction", i.fsCacheTargetFraction, { numFmt: NUMFMT.dec2 });
  const peakToAvgIngestRatio = s.input("Peak:avg ingest ratio", i.peakToAvgIngestRatio, { numFmt: NUMFMT.dec2 });
  const ingestThroughputPerVcpu = s.input("Ingest throughput/vCPU (MB/s)", i.ingestThroughputPerVcpu, { numFmt: NUMFMT.dec2 });
  const peakSearchQPS = s.input("Peak search QPS", i.peakSearchQPS, { numFmt: NUMFMT.int });
  const searchQPSPerVcpu = s.input("Search QPS/vCPU", i.searchQPSPerVcpu, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Inputs — Node Shape & Cluster Options");
  const maxRamPerNodeGB = s.input("Max RAM/node (GB)", i.maxRamPerNodeGB, { numFmt: NUMFMT.int });
  const maxVcpuPerNode = s.input("Max vCPU/node", i.maxVcpuPerNode, { numFmt: NUMFMT.int });
  const maxDiskPerNodeGB = s.input("Max disk/node (GB)", i.maxDiskPerNodeGB, { numFmt: NUMFMT.int });
  const dedicatedMasters = s.input("Dedicated masters", i.dedicatedMasters, { validation: ["TRUE", "FALSE"] });
  const dedicatedCoordinating = s.input("Dedicated coordinating", i.dedicatedCoordinating, { validation: ["TRUE", "FALSE"] });
  const snapshotRetentionDays = s.input("Snapshot retention (days)", i.snapshotRetentionDays, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Data Footprint");
  const dailyIngestAtHorizon = s.computed("Daily ingest at horizon (GB)", `${dailyIngestGB}*${pow(`1+${annualGrowthPct}`, horizonYears)}`, r.dataFootprint.dailyIngestAtHorizon);
  s.computed("Search corpus at horizon (GB)", `${searchCorpusGB}*${pow(`1+${annualGrowthPct}`, horizonYears)}`, r.dataFootprint.searchCorpusAtHorizon);
  const dailyIndexedGB = s.computed("Daily indexed (GB)", `${dailyIngestAtHorizon}*${indexExpansionRatio}`, r.dataFootprint.dailyIndexedGB);

  const searchCorpusAtHorizonCell = `${searchCorpusGB}*${pow(`1+${annualGrowthPct}`, horizonYears)}`;
  const hotPrimaryGB = s.computed(
    "Hot primary (GB)",
    iff(isSearch, `(${searchCorpusAtHorizonCell})*${indexExpansionRatio}`, `${dailyIndexedGB}*${hotRetentionDays}`),
    r.dataFootprint.hotPrimaryGB,
  );
  const hotWithReplicasGB = s.computed("Hot with replicas (GB)", `${hotPrimaryGB}*(1+${hotReplicas})`, r.dataFootprint.hotWithReplicasGB);

  const warmPrimaryGB = s.computed("Warm primary (GB)", iff(isSearch, "0", `${dailyIndexedGB}*${warmRetentionDays}/${forceMergeGain}`), r.dataFootprint.warmPrimaryGB);
  const warmWithReplicasGB = s.computed("Warm with replicas (GB)", `${warmPrimaryGB}*(1+${warmReplicas})`, r.dataFootprint.warmWithReplicasGB);

  const coldPrimaryGB = s.computed("Cold primary (GB)", iff(isSearch, "0", `${dailyIndexedGB}*${coldRetentionDays}/${forceMergeGain}`), r.dataFootprint.coldPrimaryGB);
  const coldWithReplicasGB = s.computed("Cold with replicas (GB)", `${coldPrimaryGB}*(1+${coldReplicas})`, r.dataFootprint.coldWithReplicasGB);

  s.computed("Total on-disk (GB)", `${hotWithReplicasGB}+${warmWithReplicasGB}+${coldWithReplicasGB}`, r.dataFootprint.totalOnDiskGB);
  const provisionedHotGB = s.computed("Provisioned hot (GB)", `${hotWithReplicasGB}*${mergeHeadroom}/${diskUtilTarget}`, r.dataFootprint.provisionedHotGB);
  const provisionedWarmGB = s.computed("Provisioned warm (GB)", `${warmWithReplicasGB}*${mergeHeadroom}/${diskUtilTarget}`, r.dataFootprint.provisionedWarmGB);
  const provisionedColdGB = s.computed("Provisioned cold (GB)", `${coldWithReplicasGB}*${mergeHeadroom}/${diskUtilTarget}`, r.dataFootprint.provisionedColdGB);
  s.computed("Total provisioned (GB)", `${provisionedHotGB}+${provisionedWarmGB}+${provisionedColdGB}`, r.dataFootprint.totalProvisionedGB);
  s.computed("Snapshot repository (GB)", iff(isSearch, hotPrimaryGB, `${dailyIndexedGB}*${snapshotRetentionDays}`), r.dataFootprint.snapshotRepositoryGB);
  s.blank();

  s.section("CPU");
  const avgIngestRateMBps = s.computed("Avg ingest rate (MB/s)", `${dailyIngestAtHorizon}*1000/86400`, r.dataFootprint.dailyIngestAtHorizon * 1000 / 86400);
  const peakIngestRateMBps = s.computed("Peak ingest rate (MB/s)", `${avgIngestRateMBps}*${peakToAvgIngestRatio}`, (r.dataFootprint.dailyIngestAtHorizon * 1000 / 86400) * i.peakToAvgIngestRatio);
  const indexingCores = s.computed("Indexing cores", ceil(`${peakIngestRateMBps}*(1+${hotReplicas})/${ingestThroughputPerVcpu}`), r.cpu.indexingCores, { numFmt: NUMFMT.int });
  const searchCores = s.computed("Search cores", ceil(`${peakSearchQPS}/${searchQPSPerVcpu}`), r.cpu.searchCores, { numFmt: NUMFMT.int });
  const mergeAllowanceCores = s.computed("Merge allowance cores", ceil(`(${indexingCores}+${searchCores})*0.2`), r.cpu.mergeAllowanceCores, { numFmt: NUMFMT.int });
  const totalVcpuDemand = s.computed("Total vCPU demand", `${indexingCores}+${searchCores}+${mergeAllowanceCores}`, r.cpu.totalVcpuDemand, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Hot Tier");
  const jvmHeapPerNodeGB = s.computed("JVM heap/node (GB)", min(maxJvmHeapGB, `${maxRamPerNodeGB}*${jvmHeapFraction}`), r.hotTier.jvmHeapPerNodeGB);
  const freeRamPerNodeGB = s.computed("Free RAM/node (GB)", `${maxRamPerNodeGB}-${jvmHeapPerNodeGB}`, r.hotTier.freeRamPerNodeGB);
  const diskPerHotNodeGB = s.computed("Disk/hot node (GB)", min(maxDiskPerNodeGB, `${maxRamPerNodeGB}*${hotDiskRamRatio}`), r.hotTier.diskPerHotNodeGB);
  const primaryShardsPerIndex = s.computed(
    "Primary shards/index",
    iff(isSearch, max("1", ceil(`${hotPrimaryGB}/${targetShardSizeGB}`)), max("1", ceil(`${dailyIndexedGB}/${targetShardSizeGB}`))),
    r.hotTier.primaryShardsPerIndex,
    { numFmt: NUMFMT.int },
  );
  const hotTierShards = s.computed(
    "Hot tier shards",
    iff(isSearch, `${primaryShardsPerIndex}*(1+${hotReplicas})`, `${primaryShardsPerIndex}*${hotRetentionDays}*(1+${hotReplicas})`),
    r.hotTier.hotTierShards,
    { numFmt: NUMFMT.int },
  );
  const shardCapacityPerNode = s.computed("Shard capacity/node", `${jvmHeapPerNodeGB}*${maxShardsPerGBHeap}`, r.hotTier.shardCapacityPerNode);
  const hotNodesByDisk = s.computed("Hot nodes by disk", ceil(`${provisionedHotGB}/${diskPerHotNodeGB}`), r.hotTier.hotNodesByDisk, { numFmt: NUMFMT.int });
  const hotNodesByCPU = s.computed("Hot nodes by CPU", ceil(`${totalVcpuDemand}/${maxVcpuPerNode}`), r.hotTier.hotNodesByCPU, { numFmt: NUMFMT.int });
  const hotNodesByShardCount = s.computed("Hot nodes by shard count", ceil(`${hotTierShards}/${shardCapacityPerNode}`), r.hotTier.hotNodesByShardCount, { numFmt: NUMFMT.int });
  const hotNodesByPageCache = s.computed("Hot nodes by page cache", ceil(`${hotWithReplicasGB}*${fsCacheTargetFraction}/${freeRamPerNodeGB}`), r.hotTier.hotNodesByPageCache, { numFmt: NUMFMT.int });
  const minHotNodes = s.computed("Minimum hot nodes", iff(`${hotReplicas}>=1`, "2", "1"), i.hotReplicas >= 1 ? 2 : 1, { numFmt: NUMFMT.int });
  const recommendedHotNodes = s.computed(
    "Recommended hot nodes",
    max(minHotNodes, hotNodesByDisk, hotNodesByCPU, hotNodesByShardCount, hotNodesByPageCache),
    r.hotTier.recommendedHotNodes,
    { numFmt: NUMFMT.int },
  );
  s.computed("Achieved page-cache coverage", `${recommendedHotNodes}*${freeRamPerNodeGB}/${hotWithReplicasGB}`, r.hotTier.achievedPageCacheCoverage, { numFmt: NUMFMT.pct });
  const perHotNodeVcpuRaw = s.computed("Per hot-node vCPU (raw)", ceil(`${totalVcpuDemand}/${recommendedHotNodes}`), Math.ceil(r.cpu.totalVcpuDemand / r.hotTier.recommendedHotNodes), { numFmt: NUMFMT.int });
  const perHotNodeVcpu = s.computed("Per hot-node vCPU", snapUpFormula(perHotNodeVcpuRaw, [8, 16, 32, 64]), r.hotTier.perHotNodeVcpu, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Warm & Cold Tiers");
  const diskPerWarmNodeGB = s.computed("Disk/warm node (GB)", min(maxDiskPerNodeGB, `${maxRamPerNodeGB}*${warmDiskRamRatio}`), r.warmColdTier.diskPerWarmNodeGB);
  const warmTierShards = s.computed("Warm tier shards", zeroGuard(warmPrimaryGB, `${primaryShardsPerIndex}*${warmRetentionDays}*(1+${warmReplicas})`), r.warmColdTier.warmTierShards, { numFmt: NUMFMT.int });
  const warmNodesByDisk = s.computed("Warm nodes by disk", zeroGuard(warmWithReplicasGB, ceil(`${provisionedWarmGB}/${diskPerWarmNodeGB}`)), r.warmColdTier.warmNodesByDisk, { numFmt: NUMFMT.int });
  const warmNodesByShardCount = s.computed("Warm nodes by shard count", zeroGuard(warmWithReplicasGB, ceil(`${warmTierShards}/${shardCapacityPerNode}`)), r.warmColdTier.warmNodesByShardCount, { numFmt: NUMFMT.int });
  const recommendedWarmNodes = s.computed(
    "Recommended warm nodes",
    zeroGuard(warmWithReplicasGB, max(iff(`${warmReplicas}>=1`, "2", "1"), warmNodesByDisk, warmNodesByShardCount)),
    r.warmColdTier.recommendedWarmNodes,
    { numFmt: NUMFMT.int },
  );

  const diskPerColdNodeGB = s.computed("Disk/cold node (GB)", min(maxDiskPerNodeGB, `${maxRamPerNodeGB}*${coldDiskRamRatio}`), r.warmColdTier.diskPerColdNodeGB);
  const coldTierShards = s.computed("Cold tier shards", zeroGuard(coldPrimaryGB, `${primaryShardsPerIndex}*${coldRetentionDays}*(1+${coldReplicas})`), r.warmColdTier.coldTierShards, { numFmt: NUMFMT.int });
  const coldNodesByDisk = s.computed("Cold nodes by disk", zeroGuard(coldWithReplicasGB, ceil(`${provisionedColdGB}/${diskPerColdNodeGB}`)), r.warmColdTier.coldNodesByDisk, { numFmt: NUMFMT.int });
  const coldNodesByShardCount = s.computed("Cold nodes by shard count", zeroGuard(coldWithReplicasGB, ceil(`${coldTierShards}/${shardCapacityPerNode}`)), r.warmColdTier.coldNodesByShardCount, { numFmt: NUMFMT.int });
  const recommendedColdNodes = s.computed(
    "Recommended cold nodes",
    zeroGuard(coldWithReplicasGB, max(iff(`${coldReplicas}>=1`, "2", "1"), coldNodesByDisk, coldNodesByShardCount)),
    r.warmColdTier.recommendedColdNodes,
    { numFmt: NUMFMT.int },
  );
  s.blank();

  s.section("Cluster Topology");
  const totalDataNodes = s.computed("Total data nodes", `${recommendedHotNodes}+${recommendedWarmNodes}+${recommendedColdNodes}`, r.cluster.totalDataNodes, { numFmt: NUMFMT.int });
  const masterNodes = s.computed("Master nodes", iff(dedicatedMasters, "3", "0"), r.cluster.masterNodes, { numFmt: NUMFMT.int });
  const coordinatingNodes = s.computed("Coordinating nodes", iff(dedicatedCoordinating, max("2", ceil(`${totalDataNodes}/10`)), "0"), r.cluster.coordinatingNodes, { numFmt: NUMFMT.int });
  s.computed("Total nodes", `${totalDataNodes}+${masterNodes}+${coordinatingNodes}`, r.cluster.totalNodes, { numFmt: NUMFMT.int });
  const totalDataTierRAM = s.computed("Total data-tier RAM (GB)", `${maxRamPerNodeGB}*${totalDataNodes}`, r.cluster.totalDataTierRAM, { numFmt: NUMFMT.int });
  const totalDataTierVcpu = s.computed(
    "Total data-tier vCPU",
    `${perHotNodeVcpu}*${recommendedHotNodes}+8*(${recommendedWarmNodes}+${recommendedColdNodes})`,
    r.cluster.totalDataTierVcpu,
    { numFmt: NUMFMT.int },
  );
  const totalShards = s.computed("Total shards", `${hotTierShards}+${warmTierShards}+${coldTierShards}`, r.cluster.totalShards, { numFmt: NUMFMT.int });
  s.computed("Shards/data node", iff(`${totalDataNodes}>0`, `${totalShards}/${totalDataNodes}`, "0"), r.cluster.shardsPerDataNode, { numFmt: NUMFMT.dec2 });

  return { ws, coresCell: totalDataTierVcpu, ramCell: totalDataTierRAM };
}
