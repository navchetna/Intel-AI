import type ExcelJS from "exceljs";
import { calcLogfire, type LogfireInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, ceilTo, max } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

const G = 1000000000;

export function buildLogfireSheet(ws: ExcelJS.Worksheet, i: LogfireInputs): WorkloadSheetResult {
  const r = calcLogfire(i);
  const s = new FormulaSheet(ws);
  s.title("Pydantic Logfire (Self-Hosted) — Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcLogfire() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const peakSpansPerSec = s.input("Peak spans/sec", i.peakSpansPerSec, { numFmt: NUMFMT.int });
  const peakLogsPerSec = s.input("Peak logs/sec", i.peakLogsPerSec, { numFmt: NUMFMT.int });
  const peakMetricPointsPerSec = s.input("Peak metric points/sec", i.peakMetricPointsPerSec, { numFmt: NUMFMT.int });
  const avgBytesPerSpan = s.input("Avg bytes/span", i.avgBytesPerSpan, { numFmt: NUMFMT.int });
  const avgBytesPerLog = s.input("Avg bytes/log", i.avgBytesPerLog, { numFmt: NUMFMT.int });
  const avgBytesPerMetricPoint = s.input("Avg bytes/metric point", i.avgBytesPerMetricPoint, { numFmt: NUMFMT.int });
  const peakToAvgRatio = s.input("Peak:avg ratio", i.peakToAvgRatio, { numFmt: NUMFMT.dec2 });
  const compressionRatio = s.input("Compression ratio", i.compressionRatio, { numFmt: NUMFMT.dec2 });
  const retentionDays = s.input("Retention (days)", i.retentionDays, { numFmt: NUMFMT.int });
  const peakQueryQPS = s.input("Peak query QPS", i.peakQueryQPS, { numFmt: NUMFMT.int });
  const haMinReplicas = s.input("HA min replicas", i.haMinReplicas, { numFmt: NUMFMT.int });
  const localSsdScratchFloorGB = s.input("Local SSD scratch floor (GB)", i.localSsdScratchFloorGB, { numFmt: NUMFMT.int });
  const ingestPodThroughputPerPod = s.input("Ingest pod throughput/pod", i.ingestPodThroughputPerPod, { numFmt: NUMFMT.int });
  const ingestPodVcpu = s.input("Ingest pod vCPU", i.ingestPodVcpu, { numFmt: NUMFMT.int });
  const ingestPodRamGB = s.input("Ingest pod RAM (GB)", i.ingestPodRamGB, { numFmt: NUMFMT.int });
  const queryPodVcpu = s.input("Query pod vCPU", i.queryPodVcpu, { numFmt: NUMFMT.int });
  const queryPodRamGB = s.input("Query pod RAM (GB)", i.queryPodRamGB, { numFmt: NUMFMT.int });
  const queryPodQPSPerPod = s.input("Query pod QPS/pod", i.queryPodQPSPerPod, { numFmt: NUMFMT.int });
  const cachePods = s.input("Cache pods", i.cachePods, { numFmt: NUMFMT.int });
  const cacheStoragePerPodGB = s.input("Cache storage/pod (GB)", i.cacheStoragePerPodGB, { numFmt: NUMFMT.int });
  const cacheWorkerPodVcpuEach = s.input("Cache worker pod vCPU each", i.cacheWorkerPodVcpuEach, { numFmt: NUMFMT.int });
  const cacheWorkerPodRamEachGB = s.input("Cache worker pod RAM each (GB)", i.cacheWorkerPodRamEachGB, { numFmt: NUMFMT.int });
  const compactionMaintenanceWorkers = s.input("Compaction/maintenance workers", i.compactionMaintenanceWorkers, { numFmt: NUMFMT.int });
  const fixedSupportVcpu = s.input("Fixed support vCPU", i.fixedSupportVcpu, { numFmt: NUMFMT.int });
  const fixedSupportRamGB = s.input("Fixed support RAM (GB)", i.fixedSupportRamGB, { numFmt: NUMFMT.int });
  s.input("Postgres vCPU", i.postgresVcpu, { numFmt: NUMFMT.int });
  s.input("Postgres RAM (GB)", i.postgresRamGB, { numFmt: NUMFMT.int });
  const refNodeUsableVcpu = s.input("Reference node usable vCPU", i.refNodeUsableVcpu, { numFmt: NUMFMT.int });
  const refNodeUsableRamGB = s.input("Reference node usable RAM (GB)", i.refNodeUsableRamGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Object Storage");
  const avgSpansPerSec = s.computed("Avg spans/sec", `${peakSpansPerSec}/${peakToAvgRatio}`, r.objectStorage.avgSpansPerSec);
  const avgLogsPerSec = s.computed("Avg logs/sec", `${peakLogsPerSec}/${peakToAvgRatio}`, r.objectStorage.avgLogsPerSec);
  const avgMetricPtsPerSec = s.computed("Avg metric points/sec", `${peakMetricPointsPerSec}/${peakToAvgRatio}`, r.objectStorage.avgMetricPtsPerSec);
  const uncompressedPerDayGB = s.computed(
    "Uncompressed/day (GB)",
    `(${avgSpansPerSec}*${avgBytesPerSpan}+${avgLogsPerSec}*${avgBytesPerLog}+${avgMetricPtsPerSec}*${avgBytesPerMetricPoint})*86400/${G}`,
    r.objectStorage.uncompressedPerDayGB,
  );
  const compressedPerDayGB = s.computed("Compressed/day (GB)", `${uncompressedPerDayGB}/${compressionRatio}`, r.objectStorage.compressedPerDayGB);
  const retainedObjectStorageRawGB = s.computed("Retained object storage, raw (GB)", `${compressedPerDayGB}*${retentionDays}`, r.objectStorage.retainedObjectStorageRawGB);
  const objectStorageWithHeadroomGB = s.computed("Object storage with headroom (GB)", `${retainedObjectStorageRawGB}*1.3`, r.objectStorage.objectStorageWithHeadroomGB);
  const recommendedObjectStorageGB = s.computed("Recommended object storage (GB)", ceilTo(objectStorageWithHeadroomGB, 1000), r.objectStorage.recommendedObjectStorageGB, { numFmt: NUMFMT.int });
  s.computed("Recommended object storage (TB)", `${recommendedObjectStorageGB}/1000`, r.objectStorage.recommendedObjectStorageTB, { numFmt: NUMFMT.dec2 });
  s.blank();

  s.section("Ingest Tier");
  const totalIngestEventsPerSecPeak = s.computed("Total ingest events/sec (peak)", `${peakSpansPerSec}+${peakLogsPerSec}+${peakMetricPointsPerSec}`, r.ingestTier.totalIngestEventsPerSecPeak, { numFmt: NUMFMT.int });
  const ingestPodsByLoad = s.computed("Ingest pods by load", ceil(`${totalIngestEventsPerSecPeak}/${ingestPodThroughputPerPod}`), r.ingestTier.ingestPodsByLoad, { numFmt: NUMFMT.int });
  const recommendedIngestPods = s.computed("Recommended ingest pods", max(ingestPodsByLoad, `2*${haMinReplicas}`), r.ingestTier.recommendedIngestPods, { numFmt: NUMFMT.int });
  const ingestTierVcpu = s.computed("Ingest tier vCPU", `${recommendedIngestPods}*${ingestPodVcpu}`, r.ingestTier.ingestTierVcpu, { numFmt: NUMFMT.int });
  const ingestTierRamGB = s.computed("Ingest tier RAM (GB)", `${recommendedIngestPods}*${ingestPodRamGB}`, r.ingestTier.ingestTierRamGB, { numFmt: NUMFMT.int });
  const ingestScratchPVCGB = s.computed("Ingest scratch PVC (GB)", `${recommendedIngestPods}*16`, r.ingestTier.ingestScratchPVCGB, { numFmt: NUMFMT.int });
  const cacheStorageTotalGB = s.computed("Cache storage total (GB)", `${cachePods}*${cacheStoragePerPodGB}`, r.ingestTier.cacheStorageTotalGB, { numFmt: NUMFMT.int });
  const compactionScratchGB = s.computed("Compaction scratch (GB)", `${compactionMaintenanceWorkers}*32`, r.ingestTier.compactionScratchGB, { numFmt: NUMFMT.int });
  const modeledLocalSSDGB = s.computed("Modeled local SSD (GB)", `${ingestScratchPVCGB}+${cacheStorageTotalGB}+${compactionScratchGB}`, r.ingestTier.modeledLocalSSDGB, { numFmt: NUMFMT.int });
  s.computed("Recommended local SSD scratch (GB)", ceilTo(max(modeledLocalSSDGB, localSsdScratchFloorGB), 128), r.ingestTier.recommendedLocalSSDScratchGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Query & Worker Tiers");
  const queryPodsByLoad = s.computed("Query pods by load", ceil(`${peakQueryQPS}/${queryPodQPSPerPod}`), r.queryWorkerTier.queryPodsByLoad, { numFmt: NUMFMT.int });
  const recommendedQueryPods = s.computed("Recommended query pods", max(queryPodsByLoad, haMinReplicas), r.queryWorkerTier.recommendedQueryPods, { numFmt: NUMFMT.int });
  const queryTierVcpu = s.computed("Query tier vCPU", `${recommendedQueryPods}*${queryPodVcpu}`, r.queryWorkerTier.queryTierVcpu, { numFmt: NUMFMT.int });
  const queryTierRamGB = s.computed("Query tier RAM (GB)", `${recommendedQueryPods}*${queryPodRamGB}`, r.queryWorkerTier.queryTierRamGB, { numFmt: NUMFMT.int });
  const cacheTierVcpu = s.computed("Cache tier vCPU", `${cachePods}*${cacheWorkerPodVcpuEach}`, r.queryWorkerTier.cacheTierVcpu, { numFmt: NUMFMT.int });
  const cacheTierRamGB = s.computed("Cache tier RAM (GB)", `${cachePods}*${cacheWorkerPodRamEachGB}`, r.queryWorkerTier.cacheTierRamGB, { numFmt: NUMFMT.int });
  const workerTierVcpu = s.computed("Worker tier vCPU", `${compactionMaintenanceWorkers}*${cacheWorkerPodVcpuEach}`, r.queryWorkerTier.workerTierVcpu, { numFmt: NUMFMT.int });
  const workerTierRamGB = s.computed("Worker tier RAM (GB)", `${compactionMaintenanceWorkers}*${cacheWorkerPodRamEachGB}`, r.queryWorkerTier.workerTierRamGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Cluster");
  const totalApplicationVcpu = s.computed("Total application vCPU", `${ingestTierVcpu}+${queryTierVcpu}+${cacheTierVcpu}+${workerTierVcpu}+${fixedSupportVcpu}`, r.cluster.totalApplicationVcpu, { numFmt: NUMFMT.int });
  const totalApplicationRamGB = s.computed("Total application RAM (GB)", `${ingestTierRamGB}+${queryTierRamGB}+${cacheTierRamGB}+${workerTierRamGB}+${fixedSupportRamGB}`, r.cluster.totalApplicationRamGB, { numFmt: NUMFMT.int });
  const nodesByVcpu = s.computed("Nodes by vCPU", ceil(`${totalApplicationVcpu}/${refNodeUsableVcpu}`), r.cluster.nodesByVcpu, { numFmt: NUMFMT.int });
  const nodesByRam = s.computed("Nodes by RAM", ceil(`${totalApplicationRamGB}/${refNodeUsableRamGB}`), r.cluster.nodesByRam, { numFmt: NUMFMT.int });
  const recommendedWorkerNodes = s.computed("Recommended worker nodes", max(nodesByVcpu, nodesByRam, haMinReplicas), r.cluster.recommendedWorkerNodes, { numFmt: NUMFMT.int });
  const totalProvisionedVcpu = s.computed("Total provisioned vCPU", `${recommendedWorkerNodes}*${refNodeUsableVcpu}`, r.cluster.totalProvisionedVcpu, { numFmt: NUMFMT.int });
  const totalProvisionedRamGB = s.computed("Total provisioned RAM (GB)", `${recommendedWorkerNodes}*${refNodeUsableRamGB}`, r.cluster.totalProvisionedRamGB, { numFmt: NUMFMT.int });

  return { ws, coresCell: totalProvisionedVcpu, ramCell: totalProvisionedRamGB };
}
