import type ExcelJS from "exceljs";
import { calcClickHouse, type ClickHouseInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, max, iff, pow } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

const G = 1000000000;

export function buildClickHouseSheet(ws: ExcelJS.Worksheet, i: ClickHouseInputs): WorkloadSheetResult {
  const r = calcClickHouse(i);
  const s = new FormulaSheet(ws);
  s.title("ClickHouse — Observability/Logs Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcClickHouse() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const dailyRawIngestTodayGB = s.input("Daily raw ingest today (GB)", i.dailyRawIngestTodayGB, { numFmt: NUMFMT.int });
  const avgRawEventSizeBytes = s.input("Avg raw event size (B)", i.avgRawEventSizeBytes, { numFmt: NUMFMT.int });
  const annualDataGrowth = s.input("Annual data growth (0–1)", i.annualDataGrowth, { numFmt: NUMFMT.dec2 });
  const planningHorizonYears = s.input("Planning horizon (years)", i.planningHorizonYears, { numFmt: NUMFMT.int });
  const compressionRatio = s.input("Compression ratio", i.compressionRatio, { numFmt: NUMFMT.dec2 });
  const mergePartOverhead = s.input("Merge part overhead ×", i.mergePartOverhead, { numFmt: NUMFMT.dec2 });
  const hotRetentionDays = s.input("Hot retention (days)", i.hotRetentionDays, { numFmt: NUMFMT.int });
  const coldRetentionDays = s.input("Cold retention (days)", i.coldRetentionDays, { numFmt: NUMFMT.int });
  const replicationFactor = s.input("Replication factor", i.replicationFactor, { numFmt: NUMFMT.int });
  const nvmeUtilizationTarget = s.input("NVMe utilization target (0–1)", i.nvmeUtilizationTarget, { numFmt: NUMFMT.dec2 });
  const peakToAvgIngestRatio = s.input("Peak:avg ingest ratio", i.peakToAvgIngestRatio, { numFmt: NUMFMT.dec2 });
  const ingestMergeThroughputPerVcpuMBs = s.input("Ingest/merge throughput per vCPU (MB/s)", i.ingestMergeThroughputPerVcpuMBs, { numFmt: NUMFMT.dec2 });
  const peakConcurrentQueries = s.input("Peak concurrent queries", i.peakConcurrentQueries, { numFmt: NUMFMT.int });
  const avgDataScannedPerQueryGB = s.input("Avg data scanned/query (GB)", i.avgDataScannedPerQueryGB, { numFmt: NUMFMT.dec2 });
  const targetQueryLatencyP95Sec = s.input("Target query latency P95 (s)", i.targetQueryLatencyP95Sec, { numFmt: NUMFMT.dec2 });
  const scanThroughputPerVcpuGBs = s.input("Scan throughput per vCPU (GB/s)", i.scanThroughputPerVcpuGBs, { numFmt: NUMFMT.dec2 });
  const workingMemPerQueryGB = s.input("Working mem/query (GB)", i.workingMemPerQueryGB, { numFmt: NUMFMT.dec2 });
  const coldCacheFractionLocal = s.input("Cold cache fraction, local (0–1)", i.coldCacheFractionLocal, { numFmt: NUMFMT.dec2 });
  const ramReservedFraction = s.input("RAM reserved fraction (0–1)", i.ramReservedFraction, { numFmt: NUMFMT.dec2 });
  const maxRamPerNodeGB = s.input("Max RAM/node (GB)", i.maxRamPerNodeGB, { numFmt: NUMFMT.int });
  const maxVcpuPerNode = s.input("Max vCPU/node", i.maxVcpuPerNode, { numFmt: NUMFMT.int });
  const maxNvmePerNodeGB = s.input("Max NVMe/node (GB)", i.maxNvmePerNodeGB, { numFmt: NUMFMT.int });
  const keeperEnsemble = s.input("Keeper ensemble", i.keeperEnsemble, { validation: ["TRUE", "FALSE"] });
  s.blank();

  s.section("Data Footprint");
  const dailyRawIngestAtHorizonGB = s.computed("Daily raw ingest at horizon (GB)", `${dailyRawIngestTodayGB}*${pow(`1+${annualDataGrowth}`, planningHorizonYears)}`, r.dataFootprint.dailyRawIngestAtHorizonGB);
  s.computed("Rows/day at horizon", `${dailyRawIngestAtHorizonGB}*${G}/${avgRawEventSizeBytes}`, r.dataFootprint.rowsPerDayAtHorizon, { numFmt: NUMFMT.int });
  const dailyOnDiskCompressedGB = s.computed("Daily on-disk compressed (GB)", `${dailyRawIngestAtHorizonGB}/${compressionRatio}`, r.dataFootprint.dailyOnDiskCompressedGB);
  const hotData1CopyGB = s.computed("Hot data, 1 copy (GB)", `${dailyOnDiskCompressedGB}*${hotRetentionDays}`, r.dataFootprint.hotData1CopyGB);
  s.computed("Hot local stored incl. merge (GB)", `${hotData1CopyGB}*${mergePartOverhead}`, r.dataFootprint.hotLocalStoredInclMergeGB);
  const hotLocalStoredInclMergeGB2 = `${hotData1CopyGB}*${mergePartOverhead}`;
  const coldData1CopyGB = s.computed("Cold data, 1 copy (GB)", `${dailyOnDiskCompressedGB}*${coldRetentionDays}`, r.dataFootprint.coldData1CopyGB);
  const coldLocalCacheGB = s.computed("Cold local cache (GB)", `${coldData1CopyGB}*${coldCacheFractionLocal}`, r.dataFootprint.coldLocalCacheGB);
  const localNvmePerCopyProvisionedGB = s.computed(
    "Local NVMe per copy, provisioned (GB)",
    `(${hotLocalStoredInclMergeGB2}+${coldLocalCacheGB})/${nvmeUtilizationTarget}`,
    r.dataFootprint.localNvmePerCopyProvisionedGB,
  );
  s.computed("Total NVMe incl. replicas (GB)", `${localNvmePerCopyProvisionedGB}*${replicationFactor}`, r.dataFootprint.totalNvmeInclReplicasGB);
  s.computed("Object store capacity, cold (GB)", coldData1CopyGB, r.dataFootprint.objectStoreCapacityColdGB);
  s.computed("Total unique data managed (GB)", `${hotData1CopyGB}+${coldData1CopyGB}`, r.dataFootprint.totalUniqueDataManagedGB);
  s.computed("Storage saved vs. raw", `1-1/${compressionRatio}`, r.dataFootprint.storageSavedVsRaw, { numFmt: NUMFMT.pct });
  s.blank();

  s.section("Ingest & Merge");
  const avgIngestRateMBs = s.computed("Avg ingest rate (MB/s)", `${dailyRawIngestAtHorizonGB}*1000/86400`, r.ingestMerge.avgIngestRateMBs);
  const peakIngestRateMBs = s.computed("Peak ingest rate (MB/s)", `${avgIngestRateMBs}*${peakToAvgIngestRatio}`, r.ingestMerge.peakIngestRateMBs);
  s.computed("Peak insert rate (rows/sec)", `((${dailyRawIngestAtHorizonGB}*${G}/${avgRawEventSizeBytes})/86400)*${peakToAvgIngestRatio}`, r.ingestMerge.peakInsertRateRowsPerSec, { numFmt: NUMFMT.int });
  const ingestMergeCores = s.computed("Ingest/merge cores", ceil(`${peakIngestRateMBs}/${ingestMergeThroughputPerVcpuMBs}`), r.ingestMerge.ingestMergeCores, { numFmt: NUMFMT.int });
  const backgroundMergeAllowanceCores = s.computed("Background merge allowance cores", ceil(`${ingestMergeCores}/2`), r.ingestMerge.backgroundMergeAllowanceCores, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Query Compute");
  const queryScanCores = s.computed(
    "Query scan cores",
    ceil(`(${peakConcurrentQueries}*${avgDataScannedPerQueryGB})/(${scanThroughputPerVcpuGBs}*${targetQueryLatencyP95Sec})`),
    r.queryCompute.queryScanCores,
    { numFmt: NUMFMT.int },
  );
  const queryWorkingRamGB = s.computed("Query working RAM (GB)", `${peakConcurrentQueries}*${workingMemPerQueryGB}`, r.queryCompute.queryWorkingRamGB);
  const totalVcpuDemand = s.computed("Total vCPU demand", `${ingestMergeCores}+${backgroundMergeAllowanceCores}+${queryScanCores}`, r.queryCompute.totalVcpuDemand, { numFmt: NUMFMT.int });
  s.computed("Total query RAM demand (GB)", queryWorkingRamGB, r.queryCompute.totalQueryRamDemandGB);
  s.blank();

  s.section("Sharding");
  const usableQueryRamPerNodeGB = s.computed("Usable query RAM/node (GB)", `${maxRamPerNodeGB}*(1-${ramReservedFraction})`, r.sharding.usableQueryRamPerNodeGB);
  const shardsByNvme = s.computed("Shards by NVMe", ceil(`${localNvmePerCopyProvisionedGB}/${maxNvmePerNodeGB}`), r.sharding.shardsByNvme, { numFmt: NUMFMT.int });
  const shardsByCpu = s.computed("Shards by CPU", ceil(`${totalVcpuDemand}/${maxVcpuPerNode}`), r.sharding.shardsByCpu, { numFmt: NUMFMT.int });
  const shardsByRam = s.computed("Shards by RAM", ceil(`${queryWorkingRamGB}/${usableQueryRamPerNodeGB}`), r.sharding.shardsByRam, { numFmt: NUMFMT.int });
  const recommendedShards = s.computed("Recommended shards", max(shardsByNvme, shardsByCpu, shardsByRam, "1"), r.sharding.recommendedShards, { numFmt: NUMFMT.int });
  s.computedText(
    "Binding constraint",
    iff(`${recommendedShards}=${shardsByNvme}`, `"NVMe capacity"`, iff(`${recommendedShards}=${shardsByCpu}`, `"CPU (vCPU demand)"`, `"Query RAM"`)),
    r.sharding.bindingConstraint,
  );
  s.blank();

  s.section("Cluster");
  const serverNodes = s.computed("Server nodes", `${recommendedShards}*${replicationFactor}`, r.cluster.serverNodes, { numFmt: NUMFMT.int });
  const keeperNodes = s.computed("Keeper nodes", iff(keeperEnsemble, "3", "0"), r.cluster.keeperNodes, { numFmt: NUMFMT.int });
  s.computed("Total nodes", `${serverNodes}+${keeperNodes}`, r.cluster.totalNodes, { numFmt: NUMFMT.int });
  const totalClusterVcpu = s.computed("Total cluster vCPU", `${serverNodes}*${maxVcpuPerNode}`, r.cluster.totalClusterVcpu, { numFmt: NUMFMT.int });
  const totalClusterRamGB = s.computed("Total cluster RAM (GB)", `${serverNodes}*${maxRamPerNodeGB}`, r.cluster.totalClusterRamGB, { numFmt: NUMFMT.int });
  s.computed("Total NVMe provisioned (GB)", `${serverNodes}*${maxNvmePerNodeGB}`, r.cluster.totalNvmeProvisionedGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Recommended Config");
  s.note("Table engine", r.conf.tableEngine);
  s.note("ORDER BY", r.conf.orderBy);
  s.note("PARTITION BY", r.conf.partitionBy);
  s.note("Index granularity", String(r.conf.indexGranularity));
  s.computed("TTL move (days)", hotRetentionDays, r.conf.ttlMoveDays, { numFmt: NUMFMT.int });
  s.computed("TTL delete (days)", `${hotRetentionDays}+${coldRetentionDays}`, r.conf.ttlDeleteDays, { numFmt: NUMFMT.int });
  s.note("Storage policy", r.conf.storagePolicy);
  s.note("Timestamp codec", r.conf.timestampCodec);
  s.note("Default codec", r.conf.defaultCodec);
  s.note("Min insert batch rows", String(r.conf.minInsertBatchRows));
  s.note("Parts to throw insert", String(r.conf.partsToThrowInsert));
  s.note("Max concurrent queries", String(r.conf.maxConcurrentQueries));
  s.note("Background pool size", String(r.conf.backgroundPoolSize));

  return { ws, coresCell: totalClusterVcpu, ramCell: totalClusterRamGB };
}
