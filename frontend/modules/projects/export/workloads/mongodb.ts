import type ExcelJS from "exceljs";
import { calcMongoDB, type MongoDBInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, round, max, iff, pow, snapUpFormula, CORE_TIERS, RAM_TIERS, DISK_TIERS } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

const G = 1000000000;
const M = 1000000;

export function buildMongoDBSheet(ws: ExcelJS.Worksheet, i: MongoDBInputs): WorkloadSheetResult {
  const r = calcMongoDB(i);
  const s = new FormulaSheet(ws);
  s.title("MongoDB — WiredTiger Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcMongoDB() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const docCount = s.input("Document count", i.docCount, { numFmt: NUMFMT.int });
  const avgDocSizeB = s.input("Avg document size (B)", i.avgDocSizeB, { numFmt: NUMFMT.int });
  const annualGrowthPct = s.input("Annual growth (0–1)", i.annualGrowthPct, { numFmt: NUMFMT.dec2 });
  const horizonYears = s.input("Planning horizon (years)", i.horizonYears, { numFmt: NUMFMT.int });
  const indexesPerCollection = s.input("Indexes/collection", i.indexesPerCollection, { numFmt: NUMFMT.int });
  const avgIndexEntrySizeB = s.input("Avg index entry size (B)", i.avgIndexEntrySizeB, { numFmt: NUMFMT.int });
  const dataCompressionRatio = s.input("Data compression ratio", i.dataCompressionRatio, { numFmt: NUMFMT.dec2 });
  const indexCompressionRatio = s.input("Index compression ratio", i.indexCompressionRatio, { numFmt: NUMFMT.dec2 });
  const workingSetFraction = s.input("Working set fraction (0–1)", i.workingSetFraction, { numFmt: NUMFMT.dec2 });
  const cacheHitRatio = s.input("Cache hit ratio (0–1)", i.cacheHitRatio, { numFmt: NUMFMT.dec2 });
  const peakConnections = s.input("Peak connections", i.peakConnections, { numFmt: NUMFMT.int });
  const readOpsPerSec = s.input("Read ops/sec", i.readOpsPerSec, { numFmt: NUMFMT.int });
  const writeOpsPerSec = s.input("Write ops/sec", i.writeOpsPerSec, { numFmt: NUMFMT.int });
  const readOpsPerCore = s.input("Read ops/core", i.readOpsPerCore, { numFmt: NUMFMT.int });
  const writeOpsPerCore = s.input("Write ops/core", i.writeOpsPerCore, { numFmt: NUMFMT.int });
  const aggregationHeavy = s.input("Aggregation heavy", i.aggregationHeavy, { validation: ["TRUE", "FALSE"] });
  const writeAmplification = s.input("Write amplification ×", i.writeAmplification, { numFmt: NUMFMT.dec2 });
  const oplogRetentionHrs = s.input("Oplog retention (hrs)", i.oplogRetentionHrs, { numFmt: NUMFMT.dec2 });
  const maxRamPerNodeGB = s.input("Max RAM/node (GB)", i.maxRamPerNodeGB, { numFmt: NUMFMT.int });
  const maxDiskPerNodeGB = s.input("Max disk/node (GB)", i.maxDiskPerNodeGB, { numFmt: NUMFMT.int });
  const maxVcpuPerNode = s.input("Max vCPU/node", i.maxVcpuPerNode, { numFmt: NUMFMT.int });
  const haRequired = s.input("HA required", i.haRequired, { validation: ["TRUE", "FALSE"] });
  s.blank();

  s.section("Data Footprint");
  const docsAtHorizon = s.computed("Docs at horizon", `${docCount}*${pow(`1+${annualGrowthPct}`, horizonYears)}`, r.dataFootprint.docsAtHorizon, { numFmt: NUMFMT.int });
  const logicalDataGB = s.computed("Logical data (GB)", `${docsAtHorizon}*${avgDocSizeB}/${G}`, r.dataFootprint.logicalDataGB);
  const indexSizeUncompGB = s.computed("Index size, uncompressed (GB)", `${docsAtHorizon}*${indexesPerCollection}*${avgIndexEntrySizeB}/${G}`, r.dataFootprint.indexSizeUncompGB);
  const storedDataGB = s.computed("Stored data (GB)", `${logicalDataGB}/${dataCompressionRatio}`, r.dataFootprint.storedDataGB);
  const storedIndexGB = s.computed("Stored index (GB)", `${indexSizeUncompGB}/${indexCompressionRatio}`, r.dataFootprint.storedIndexGB);
  const storedWithFragGB = s.computed("Stored with fragmentation (GB)", `(${storedDataGB}+${storedIndexGB})*1.25`, (r.dataFootprint.storedDataGB + r.dataFootprint.storedIndexGB) * 1.25);
  const avgOplogEntrySizeB = s.computed("Avg oplog entry size (B)", `${avgDocSizeB}*0.5`, i.avgDocSizeB * 0.5);
  const oplogVolumeGB = s.computed("Oplog volume (GB)", `${writeOpsPerSec}*${avgOplogEntrySizeB}*${oplogRetentionHrs}*3600/${G}`, i.writeOpsPerSec * (i.avgDocSizeB * 0.5) * i.oplogRetentionHrs * 3600 / 1e9);
  const rawDiskGB = s.computed("Raw disk (GB)", `${storedWithFragGB}+${oplogVolumeGB}+(${storedDataGB}+${storedIndexGB})*0.1`, r.dataFootprint.provisionedDiskGB * 0.7);
  const provisionedDiskGB = s.computed("Provisioned disk (GB)", `${rawDiskGB}/0.7`, r.dataFootprint.provisionedDiskGB);
  s.blank();

  s.section("Memory Demand");
  const hotWorkingSetGB = s.computed("Hot working set (GB)", `${logicalDataGB}*${workingSetFraction}`, r.memoryDemand.hotWorkingSetGB);
  const indexWorkingSetGB = s.computed("Index working set (GB)", `${indexSizeUncompGB}`, r.memoryDemand.indexWorkingSetGB);
  const aggAllowanceGB = s.computed("Aggregation allowance (GB)", iff(aggregationHeavy, max(`${peakConnections}*1/1024`, "2"), "0"), r.memoryDemand.aggAllowanceGB);
  const requiredWTCacheGB = s.computed("Required WT cache (GB)", `${hotWorkingSetGB}+${indexWorkingSetGB}+${aggAllowanceGB}`, r.memoryDemand.requiredWTCacheGB);
  const connectionMemGB = s.computed("Connection memory (GB)", `${peakConnections}/1024`, r.memoryDemand.connectionMemGB);
  const impliedRAMGB = s.computed("Implied RAM (GB)", `${requiredWTCacheGB}/0.5+1+${connectionMemGB}+4`, r.memoryDemand.impliedRAMGB);
  s.blank();

  s.section("CPU & Sharding");
  const readCoresVal = i.readOpsPerSec / i.readOpsPerCore;
  const writeCoresVal = i.writeOpsPerSec / i.writeOpsPerCore;
  const aggCoresVal = i.aggregationHeavy ? Math.max(readCoresVal * 0.3, 4) : 0;
  const vcpuDemandVal = readCoresVal + writeCoresVal + aggCoresVal;
  const readCores = s.computed("Read cores (raw)", `${readOpsPerSec}/${readOpsPerCore}`, readCoresVal);
  const writeCores = s.computed("Write cores (raw)", `${writeOpsPerSec}/${writeOpsPerCore}`, writeCoresVal);
  const aggCores = s.computed("Aggregation cores (raw)", iff(aggregationHeavy, max(`${readCores}*0.3`, "4"), "0"), aggCoresVal);
  const vcpuDemand = s.computed("vCPU demand (raw)", `${readCores}+${writeCores}+${aggCores}`, vcpuDemandVal);
  const shardsByRAM = s.computed("Shards by RAM", max("1", ceil(`${impliedRAMGB}/${maxRamPerNodeGB}`)), r.sharding.shardsByRAM, { numFmt: NUMFMT.int });
  const shardsByDisk = s.computed("Shards by disk", max("1", ceil(`${provisionedDiskGB}/${maxDiskPerNodeGB}`)), r.sharding.shardsByDisk, { numFmt: NUMFMT.int });
  const shardsByCPU = s.computed("Shards by CPU", max("1", ceil(`${vcpuDemand}/${maxVcpuPerNode}`)), r.sharding.shardsByCPU, { numFmt: NUMFMT.int });
  const recommendedShards = s.computed("Recommended shards", max(shardsByRAM, shardsByDisk, shardsByCPU), r.sharding.recommendedShards, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Per-Node Sizing");
  const wtCacheGB = s.computed("WT cache/node (GB)", `${requiredWTCacheGB}/${recommendedShards}`, r.perNode.wtCacheGB);
  const connMemPerNode = s.computed("Connection mem/node (GB)", `${connectionMemGB}/${recommendedShards}`, r.memoryDemand.connectionMemGB / r.sharding.recommendedShards);
  const rawRAM = s.computed("Raw RAM/node (GB)", `${wtCacheGB}/0.5+1+${connMemPerNode}+4`, r.perNode.wtCacheGB / 0.5 + 1 + r.memoryDemand.connectionMemGB / r.sharding.recommendedShards + 4);
  const recommendedRAMGB = s.computed("Recommended RAM/node (GB)", snapUpFormula(rawRAM, RAM_TIERS), r.perNode.recommendedRAMGB, { numFmt: NUMFMT.int });
  const rawDiskPerNode = s.computed("Raw disk/node (GB)", `${provisionedDiskGB}/${recommendedShards}`, r.dataFootprint.provisionedDiskGB / r.sharding.recommendedShards);
  const recommendedDiskGB = s.computed("Recommended disk/node (GB)", snapUpFormula(rawDiskPerNode, DISK_TIERS), r.perNode.recommendedDiskGB, { numFmt: NUMFMT.int });
  const rawVcpu = s.computed("Raw vCPU/node", `${vcpuDemand}/${recommendedShards}`, vcpuDemandVal / r.sharding.recommendedShards);
  const recommendedVcpu = s.computed("Recommended vCPU/node", snapUpFormula(rawVcpu, CORE_TIERS), r.perNode.recommendedVcpu, { numFmt: NUMFMT.int });
  const readIOPS = s.computed("Read IOPS/node", `${readOpsPerSec}*(1-${cacheHitRatio})*2/${recommendedShards}`, r.perNode.readIOPS, { numFmt: NUMFMT.int });
  const writeIOPS = s.computed("Write IOPS/node", `${writeOpsPerSec}*${writeAmplification}/${recommendedShards}`, r.perNode.writeIOPS, { numFmt: NUMFMT.int });
  s.computed("Total IOPS/node", ceil(`${readIOPS}+${writeIOPS}`), r.perNode.totalIOPS, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Cluster Topology");
  const membersPerShard = s.computed("Members/shard", iff(haRequired, "3", "1"), r.cluster.membersPerShard, { numFmt: NUMFMT.int });
  const dataBearingNodes = s.computed("Data-bearing nodes", `${recommendedShards}*${membersPerShard}`, r.cluster.dataBearingNodes, { numFmt: NUMFMT.int });
  s.computed("Config nodes", iff(`${recommendedShards}>1`, "3", "0"), r.cluster.configNodes, { numFmt: NUMFMT.int });
  s.computed("Mongos routers", iff(`${recommendedShards}>1`, max("2", recommendedShards), "0"), r.cluster.mongosRouters, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Cluster Totals");
  const totalVcpu = s.computed("Total vCPU", `${recommendedVcpu}*${dataBearingNodes}`, r.cluster.totalVcpu, { numFmt: NUMFMT.int });
  const totalRAMGB = s.computed("Total RAM (GB)", `${recommendedRAMGB}*${dataBearingNodes}`, r.cluster.totalRAMGB, { numFmt: NUMFMT.int });
  s.computed("Total disk (GB)", `${recommendedDiskGB}*${dataBearingNodes}`, r.cluster.totalDiskGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Recommended Config");
  s.computed("cacheSizeGB", `${round(`${wtCacheGB}*10`, 0)}/10`, r.conf.cacheSizeGB, { numFmt: NUMFMT.dec2 });
  s.computedText("blockCompressor", iff(aggregationHeavy, `"zstd"`, `"snappy"`), r.conf.blockCompressor);
  s.computed("oplogSizeMB", ceil(`${writeOpsPerSec}*${avgOplogEntrySizeB}*${oplogRetentionHrs}*3600/${M}*1.2`), r.conf.oplogSizeMB, { numFmt: NUMFMT.int });
  s.computed("maxIncomingConnections", ceil(`${peakConnections}*1.2/${recommendedShards}`), r.conf.maxIncomingConnections, { numFmt: NUMFMT.int });

  return { ws, coresCell: totalVcpu, ramCell: totalRAMGB };
}
