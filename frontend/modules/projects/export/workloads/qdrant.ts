import type ExcelJS from "exceljs";
import { calcQdrant, type QdrantInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, iff, eq, snapUpFormula, CORE_TIERS, RAM_TIERS, DISK_TIERS, max } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

const G = 1000000000; // 1e9, spelled out to avoid any locale/exponent-notation ambiguity in Excel

export function buildQdrantSheet(ws: ExcelJS.Worksheet, i: QdrantInputs): WorkloadSheetResult {
  const r = calcQdrant(i);
  const s = new FormulaSheet(ws);
  s.title("Qdrant — Vector DB Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcQdrant() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const numVectors = s.input("Number of vectors", i.numVectors, { numFmt: NUMFMT.int });
  const dimensions = s.input("Dimensions", i.dimensions, { numFmt: NUMFMT.int });
  const quantMode = s.input("Quantization mode", i.quantMode, { validation: ["None", "Scalar int8", "Binary", "Product"] });
  const productQuantBytesPerDim = s.input("Product quant bytes/dim", i.productQuantBytesPerDim, { numFmt: NUMFMT.dec2 });
  const origVecsPlacement = s.input("Original vectors placement", i.origVecsPlacement, { validation: ["In-RAM", "On-disk"] });
  const hnswGraphPlacement = s.input("HNSW graph placement", i.hnswGraphPlacement, { validation: ["In-RAM", "On-disk"] });
  const hnswM = s.input("HNSW M", i.hnswM, { numFmt: NUMFMT.int });
  const payloadPerVectorBytes = s.input("Payload bytes/vector", i.payloadPerVectorBytes, { numFmt: NUMFMT.int });
  const nonIndexedPayloadPlacement = s.input("Non-indexed payload placement", i.nonIndexedPayloadPlacement, { validation: ["In-RAM", "On-disk"] });
  const indexedPayloadPerVectorBytes = s.input("Indexed payload bytes/vector", i.indexedPayloadPerVectorBytes, { numFmt: NUMFMT.int });
  const replicationFactor = s.input("Replication factor", i.replicationFactor, { numFmt: NUMFMT.int });
  const nodes = s.input("Nodes", i.nodes, { numFmt: NUMFMT.int });
  const ramUtilTarget = s.input("RAM utilization target (0–1)", i.ramUtilTarget, { numFmt: NUMFMT.dec2 });
  const metadataOverhead = s.input("Metadata overhead ×", i.metadataOverhead, { numFmt: NUMFMT.dec2 });
  const diskOverhead = s.input("Disk overhead ×", i.diskOverhead, { numFmt: NUMFMT.dec2 });
  const targetQPS = s.input("Target QPS", i.targetQPS, { numFmt: NUMFMT.int });
  const qpsPerCore = s.input("QPS per core", i.qpsPerCore, { numFmt: NUMFMT.int });
  const indexingThreads = s.input("Indexing threads", i.indexingThreads, { numFmt: NUMFMT.int });
  s.blank();

  const quantBytesPerDim = s.computed(
    "Quant bytes/dim (resolved)",
    iff(eq(quantMode, "None"), "4", iff(eq(quantMode, "Scalar int8"), "1", iff(eq(quantMode, "Binary"), "0.125", productQuantBytesPerDim))),
    i.quantMode === "None" ? 4 : i.quantMode === "Scalar int8" ? 1 : i.quantMode === "Binary" ? 0.125 : i.productQuantBytesPerDim,
    { numFmt: NUMFMT.dec2 },
  );

  s.section("Memory (per copy, GB)");
  const quantCopyRAM = s.computed(
    "Quantized/original vector copy RAM",
    iff(`${quantMode}<>"None"`, `(${numVectors}*${dimensions}*${quantBytesPerDim})/${G}`, iff(eq(origVecsPlacement, "In-RAM"), `(${numVectors}*${dimensions}*4)/${G}`, "0")),
    r.memory.quantCopyRAM,
  );
  const hnswRAM = s.computed("HNSW graph RAM", iff(eq(hnswGraphPlacement, "In-RAM"), `(${numVectors}*2*${hnswM}*4)/${G}`, "0"), r.memory.hnswRAM);
  const indexedPayloadRAM = s.computed("Indexed payload RAM", `(${numVectors}*${indexedPayloadPerVectorBytes})/${G}`, r.memory.indexedPayloadRAM);
  const nonIndexedPayloadRAM = s.computed("Non-indexed payload RAM", iff(eq(nonIndexedPayloadPlacement, "In-RAM"), `(${numVectors}*${payloadPerVectorBytes})/${G}`, "0"), r.memory.nonIndexedPayloadRAM);
  const residentSubtotal = s.computed("Resident subtotal", `${quantCopyRAM}+${hnswRAM}+${indexedPayloadRAM}+${nonIndexedPayloadRAM}`, r.memory.residentSubtotal);
  const ramWithOverhead = s.computed("RAM with metadata overhead", `${residentSubtotal}*${metadataOverhead}`, r.memory.ramWithOverhead);
  const provisionedPerCopy = s.computed("Provisioned per copy", `${ramWithOverhead}/${ramUtilTarget}`, r.memory.provisionedPerCopy);
  s.computed("Total cluster RAM (pre node-snap)", `${provisionedPerCopy}*${replicationFactor}`, r.memory.totalClusterRAM);
  const perNodeRAM = s.computed("Per-node RAM (raw)", `(${provisionedPerCopy}*${replicationFactor})/${nodes}`, r.memory.perNodeRAM);
  const recommendedPerNodeRAM = s.computed("Recommended per-node RAM", snapUpFormula(perNodeRAM, RAM_TIERS), r.memory.recommendedPerNodeRAM, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Disk (per copy, GB)");
  const fullPrecDisk = s.computed("Full-precision disk", `(${numVectors}*${dimensions}*4)/${G}`, r.disk.fullPrecDisk);
  const quantDisk = s.computed("Quantized disk", iff(`${quantMode}<>"None"`, `(${numVectors}*${dimensions}*${quantBytesPerDim})/${G}`, "0"), r.disk.quantDisk);
  const payloadDisk = s.computed("Payload disk", `(${numVectors}*(${payloadPerVectorBytes}+${indexedPayloadPerVectorBytes}))/${G}`, r.disk.payloadDisk);
  const hnswDisk = s.computed("HNSW disk", `(${numVectors}*2*${hnswM}*4)/${G}`, r.disk.hnswDisk);
  const rawSubtotal = s.computed("Raw subtotal", `${fullPrecDisk}+${quantDisk}+${payloadDisk}+${hnswDisk}`, r.disk.rawSubtotal);
  const diskPerCopy = s.computed("Disk per copy", `${rawSubtotal}*${diskOverhead}`, r.disk.diskPerCopy);
  s.computed("Total cluster disk", `${diskPerCopy}*${replicationFactor}`, r.disk.totalClusterDisk);
  const perNodeDisk = s.computed("Per-node disk (raw)", `(${diskPerCopy}*${replicationFactor})/${nodes}`, r.disk.perNodeDisk);
  const recommendedPerNodeDisk = s.computed("Recommended per-node disk", snapUpFormula(perNodeDisk, DISK_TIERS), r.disk.recommendedPerNodeDisk, { numFmt: NUMFMT.int });
  s.blank();

  s.section("CPU");
  const searchCoresCluster = s.computed("Search cores (cluster)", ceil(`${targetQPS}/${qpsPerCore}`), r.cpu.searchCoresCluster, { numFmt: NUMFMT.int });
  const perNodeSearchCores = s.computed("Per-node search cores", ceil(`${searchCoresCluster}/${nodes}`), r.cpu.perNodeSearchCores, { numFmt: NUMFMT.int });
  const indexingAllowance = s.computed("Indexing allowance cores", ceil(`${indexingThreads}/2`), Math.ceil(i.indexingThreads / 2), { numFmt: NUMFMT.int });
  const rawVCPUPerNode = s.computed("Raw vCPU/node", `${perNodeSearchCores}+${indexingAllowance}`, r.cpu.rawVCPUPerNode, { numFmt: NUMFMT.int });
  const recommendedPerNodeVCPU = s.computed("Recommended per-node vCPU", snapUpFormula(rawVCPUPerNode, CORE_TIERS), r.cpu.recommendedPerNodeVCPU, { numFmt: NUMFMT.int });
  const usableSearchCores = s.computed("Usable search cores", max("0", `${recommendedPerNodeVCPU}-${indexingAllowance}`), Math.max(0, r.cpu.recommendedPerNodeVCPU - Math.ceil(i.indexingThreads / 2)), { numFmt: NUMFMT.int });
  s.computed("Sustained QPS", `${usableSearchCores}*${nodes}*${qpsPerCore}`, r.cpu.sustainedQPS, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Cluster");
  const totalClusterVCPU = s.computed("Total cluster vCPU", `${recommendedPerNodeVCPU}*${nodes}`, r.cluster.totalClusterVCPU, { numFmt: NUMFMT.int });
  const totalClusterRAM = s.computed("Total cluster RAM (GB)", `${recommendedPerNodeRAM}*${nodes}`, r.cluster.totalClusterRAM, { numFmt: NUMFMT.int });
  s.computed("Total cluster disk (GB)", `${recommendedPerNodeDisk}*${nodes}`, r.cluster.totalClusterDisk, { numFmt: NUMFMT.int });

  return { ws, coresCell: totalClusterVCPU, ramCell: totalClusterRAM };
}
