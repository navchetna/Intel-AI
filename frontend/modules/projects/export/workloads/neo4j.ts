import type ExcelJS from "exceljs";
import { calcNeo4j, type Neo4jInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, iff, eq, max, snapUpFormula, CORE_TIERS, RAM_TIERS, DISK_TIERS } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

const G = 1000000000;
const HEAP_TIERS = [4, 8, 16, 31, 64];

export function buildNeo4jSheet(ws: ExcelJS.Worksheet, i: Neo4jInputs): WorkloadSheetResult {
  const r = calcNeo4j(i);
  const s = new FormulaSheet(ws);
  s.title("Neo4j — Graph DB Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcNeo4j() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const numNodes = s.input("Number of nodes", i.numNodes, { numFmt: NUMFMT.int });
  const numRelationships = s.input("Number of relationships", i.numRelationships, { numFmt: NUMFMT.int });
  const avgPropsPerNode = s.input("Avg properties/node", i.avgPropsPerNode, { numFmt: NUMFMT.dec2 });
  const avgPropsPerRel = s.input("Avg properties/relationship", i.avgPropsPerRel, { numFmt: NUMFMT.dec2 });
  const avgBytesPerProp = s.input("Avg bytes/property", i.avgBytesPerProp, { numFmt: NUMFMT.dec2 });
  const nativeIndexFraction = s.input("Native index fraction (0–1)", i.nativeIndexFraction, { numFmt: NUMFMT.dec2 });
  const vectorIndexGB = s.input("Vector index (GB)", i.vectorIndexGB, { numFmt: NUMFMT.dec2 });
  const storeFormatOverhead = s.input("Store format overhead ×", i.storeFormatOverhead, { numFmt: NUMFMT.dec2 });
  const storeGrowthHeadroom = s.input("Store growth headroom (0–1)", i.storeGrowthHeadroom, { numFmt: NUMFMT.dec2 });
  const pageCacheMargin = s.input("Page cache margin (0–1)", i.pageCacheMargin, { numFmt: NUMFMT.dec2 });
  const peakConcurrentReads = s.input("Peak concurrent reads", i.peakConcurrentReads, { numFmt: NUMFMT.int });
  const readQPSPerCore = s.input("Read QPS/core", i.readQPSPerCore, { numFmt: NUMFMT.int });
  const targetReadThroughput = s.input("Target read throughput (QPS)", i.targetReadThroughput, { numFmt: NUMFMT.int });
  const peakConcurrentWriteTxns = s.input("Peak concurrent write txns", i.peakConcurrentWriteTxns, { numFmt: NUMFMT.int });
  const avgWriteTxSizeEntities = s.input("Avg write tx size (entities)", i.avgWriteTxSizeEntities, { numFmt: NUMFMT.int });
  const writeIntensity = s.input("Write intensity", i.writeIntensity, { validation: ["Low", "Medium", "High"] });
  s.input("Has GDS", i.hasGDS, { validation: ["TRUE", "FALSE"] });
  const osOffHeapReserveGB = s.input("OS off-heap reserve (GB)", i.osOffHeapReserveGB, { numFmt: NUMFMT.dec2 });
  const highAvailability = s.input("High availability", i.highAvailability, { validation: ["TRUE", "FALSE"] });
  const maxReadCoresPerNode = s.input("Max read cores/node", i.maxReadCoresPerNode, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Store");
  const nodeStoreGB = s.computed("Node store (GB)", `(${numNodes}*15)/${G}`, r.store.nodeStoreGB);
  const relStoreGB = s.computed("Relationship store (GB)", `(${numRelationships}*34)/${G}`, r.store.relStoreGB);
  const propStoreGB = s.computed("Property store (GB)", `((${numNodes}*${avgPropsPerNode}+${numRelationships}*${avgPropsPerRel})*${avgBytesPerProp})/${G}`, r.store.propStoreGB);
  const dataSubtotalGB = s.computed("Data subtotal (GB)", `${nodeStoreGB}+${relStoreGB}+${propStoreGB}`, r.store.dataSubtotalGB);
  const nativeIndexGB = s.computed("Native index (GB)", `${dataSubtotalGB}*${nativeIndexFraction}`, r.store.nativeIndexGB);
  const rawStoreGB = s.computed("Raw store (GB)", `${dataSubtotalGB}+${nativeIndexGB}`, r.store.rawStoreGB);
  const formattedStoreGB = s.computed("Formatted store (GB)", `${rawStoreGB}*${storeFormatOverhead}`, r.store.formattedStoreGB);
  const storeWithGrowthGB = s.computed("Store with growth headroom (GB)", `${formattedStoreGB}*(1+${storeGrowthHeadroom})`, r.store.storeWithGrowthGB);
  s.blank();

  s.section("Memory");
  const pageCacheGB = s.computed("Page cache (GB)", `${storeWithGrowthGB}*(1+${pageCacheMargin})`, r.memory.pageCacheGB);
  const queryHeapGB = s.computed("Query heap (GB)", max("2", `0.2*${peakConcurrentReads}`), r.memory.queryHeapGB);
  const txHeapGB = s.computed("Transaction heap (GB)", `(${peakConcurrentWriteTxns}*${avgWriteTxSizeEntities}*2048)/${G}`, r.memory.txHeapGB);
  const rawHeapGB = s.computed("Raw heap (GB)", `${queryHeapGB}+${txHeapGB}`, r.memory.rawHeapGB);
  const recommendedHeapGB = s.computed("Recommended heap (GB)", snapUpFormula(rawHeapGB, HEAP_TIERS), r.memory.recommendedHeapGB, { numFmt: NUMFMT.int });
  const perNodeRAMRawGB = s.computed("Per-node RAM raw (GB)", `${pageCacheGB}+${recommendedHeapGB}+${vectorIndexGB}+${osOffHeapReserveGB}`, r.memory.perNodeRAMRawGB);
  const recommendedPerNodeRAM = s.computed("Recommended per-node RAM (GB)", snapUpFormula(perNodeRAMRawGB, RAM_TIERS), r.memory.recommendedPerNodeRAM, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Disk");
  const txLogFraction = s.computed(
    "Tx-log fraction",
    iff(eq(writeIntensity, "High"), "0.4", iff(eq(writeIntensity, "Medium"), "0.25", "0.1")),
    i.writeIntensity === "High" ? 0.4 : i.writeIntensity === "Medium" ? 0.25 : 0.1,
  );
  const txLogsGB = s.computed("Tx logs (GB)", `${storeWithGrowthGB}*${txLogFraction}`, r.disk.txLogsGB);
  const checkpointScratchGB = s.computed("Checkpoint scratch (GB)", `${storeWithGrowthGB}*0.5`, r.disk.checkpointScratchGB);
  const perNodeDiskRawGB = s.computed("Per-node disk raw (GB)", `${storeWithGrowthGB}+${txLogsGB}+${checkpointScratchGB}`, r.disk.perNodeDiskRawGB);
  const recommendedPerNodeDisk = s.computed("Recommended per-node disk (GB)", snapUpFormula(perNodeDiskRawGB, DISK_TIERS), r.disk.recommendedPerNodeDisk, { numFmt: NUMFMT.int });
  s.blank();

  s.section("CPU & Cluster Topology");
  const totalReadCores = s.computed("Total read cores", ceil(`${targetReadThroughput}/${readQPSPerCore}`), r.cpu.totalReadCores, { numFmt: NUMFMT.int });
  const primaryMembers = s.computed("Primary members", iff(highAvailability, "3", "1"), r.cluster.primaries, { numFmt: NUMFMT.int });
  const readServingMembersVal = Math.max(r.cluster.primaries, Math.ceil(r.cpu.totalReadCores / i.maxReadCoresPerNode));
  const readServingMembers = s.computed("Read-serving members", max(primaryMembers, ceil(`${totalReadCores}/${maxReadCoresPerNode}`)), readServingMembersVal, { numFmt: NUMFMT.int });
  const fromThroughput = s.computed("Cores from throughput", ceil(`${totalReadCores}/${readServingMembers}`), Math.ceil(r.cpu.totalReadCores / readServingMembersVal), { numFmt: NUMFMT.int });
  const fromConcurrency = s.computed("Cores from concurrency", ceil(`${peakConcurrentReads}/${readServingMembers}`), Math.ceil(i.peakConcurrentReads / readServingMembersVal), { numFmt: NUMFMT.int });
  const perNodeReadCores = s.computed("Per-node read cores", max(fromThroughput, fromConcurrency), r.cpu.perNodeReadCores, { numFmt: NUMFMT.int });
  const writeAllowanceCores = s.computed("Write allowance cores", "2", 2, { numFmt: NUMFMT.int });
  const rawVCPUPerNode = s.computed("Raw vCPU/node", `${perNodeReadCores}+${writeAllowanceCores}`, r.cpu.rawVCPUPerNode, { numFmt: NUMFMT.int });
  const recommendedPerNodeVCPU = s.computed("Recommended per-node vCPU", snapUpFormula(rawVCPUPerNode, CORE_TIERS), r.cpu.recommendedPerNodeVCPU, { numFmt: NUMFMT.int });
  s.computed("Sustained read QPS", `${perNodeReadCores}*${readServingMembers}*${readQPSPerCore}`, r.cpu.sustainedReadQPS, { numFmt: NUMFMT.int });
  const secondaries = s.computed("Secondaries", max("0", `${readServingMembers}-${primaryMembers}`), r.cluster.secondaries, { numFmt: NUMFMT.int });
  const totalMembers = s.computed("Total members", `${primaryMembers}+${secondaries}`, r.cluster.totalMembers, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Cluster");
  const totalClusterVCPU = s.computed("Total cluster vCPU", `${recommendedPerNodeVCPU}*${totalMembers}`, r.cluster.totalClusterVCPU, { numFmt: NUMFMT.int });
  const totalClusterRAM = s.computed("Total cluster RAM (GB)", `${recommendedPerNodeRAM}*${totalMembers}`, r.cluster.totalClusterRAM, { numFmt: NUMFMT.int });
  s.computed("Total cluster disk (GB)", `${recommendedPerNodeDisk}*${totalMembers}`, r.cluster.totalClusterDisk, { numFmt: NUMFMT.int });

  return { ws, coresCell: totalClusterVCPU, ramCell: totalClusterRAM };
}
