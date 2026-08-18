import type ExcelJS from "exceljs";
import { calcPG, type PGInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, round, min, iff, eq, floorPow2Formula, snapUpFormula, CORE_TIERS, RAM_TIERS } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";

export interface WorkloadSheetResult {
  ws: ExcelJS.Worksheet;
  /** Cell addresses of this tool's recommended-cores / recommended-RAM outputs, for the Harness
   *  sheet to link to (mirrors `summarizeResources()`'s {cores, ramGB}). */
  coresCell: string;
  ramCell: string;
}

export function buildPostgresSheet(ws: ExcelJS.Worksheet, i: PGInputs): WorkloadSheetResult {
  const r = calcPG(i);
  const s = new FormulaSheet(ws);
  s.title("PostgreSQL — OLTP Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcPG() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const datasetGB = s.input("Dataset size (GB)", i.datasetGB, { numFmt: NUMFMT.int });
  const connections = s.input("Connections", i.connections, { numFmt: NUMFMT.int });
  const activeFraction = s.input("Active fraction (0–1)", i.activeFraction, { numFmt: NUMFMT.dec2 });
  const avgQueryMs = s.input("Avg query (ms)", i.avgQueryMs, { numFmt: NUMFMT.dec2 });
  const hotFraction = s.input("Hot fraction (0–1)", i.hotFraction, { numFmt: NUMFMT.dec2 });
  const storageType = s.input("Storage type", i.storageType, { validation: ["NVMe", "SSD", "HDD"] });
  const writeIntensity = s.input("Write intensity", i.writeIntensity, { validation: ["Low", "Medium", "High"] });
  const bgCpuAllowance = s.input("Background CPU allowance", i.bgCpuAllowance, { numFmt: NUMFMT.dec2 });
  s.blank();

  s.section("CPU");
  const peakActiveQueries = s.computed("Peak active queries", `${connections}*${activeFraction}`, r.cpu.peakActiveQueries);
  const rawCoreEstimate = s.computed("Raw core estimate", `${peakActiveQueries}+${bgCpuAllowance}`, r.cpu.rawCoreEstimate);
  const recommendedCores = s.computed("Recommended cores", snapUpFormula(rawCoreEstimate, CORE_TIERS), r.cpu.recommendedCores, { numFmt: NUMFMT.int });
  s.computed("QPS capacity", `${recommendedCores}*(1000/${avgQueryMs})`, r.cpu.qpsCapacity, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Memory");
  const hotWorkingSetGB = s.computed("Hot working set (GB)", `${datasetGB}*${hotFraction}`, r.memory.hotWorkingSetGB);
  const ramNeededGB = s.computed("RAM needed (GB)", `${hotWorkingSetGB}/0.75`, r.memory.ramNeededGB);
  const recommendedRAM = s.computed("Recommended RAM (GB)", snapUpFormula(ramNeededGB, RAM_TIERS), r.memory.recommendedRAM, { numFmt: NUMFMT.int });
  s.computed("Minimum RAM (GB)", snapUpFormula(hotWorkingSetGB, RAM_TIERS), r.memory.minRAM, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Recommended postgresql.conf");
  const maxConnections = s.computed("max_connections", "100", r.conf.maxConnections, { numFmt: NUMFMT.int });
  s.computed("shared_buffers (GB)", round(`${recommendedRAM}*0.25`), r.conf.sharedBuffersGB, { numFmt: NUMFMT.int });
  s.computed("effective_cache_size (GB)", round(`${recommendedRAM}*0.75`), r.conf.effectiveCacheSizeGB, { numFmt: NUMFMT.int });
  s.computed("maintenance_work_mem (MB)", min("2048", round(`${recommendedRAM}*1024*0.05`)), r.conf.maintenanceWorkMemMB, { numFmt: NUMFMT.int });
  const workMemRaw = s.computed("work_mem raw (MB)", `(${recommendedRAM}*1024*0.25)/(${maxConnections}*4)`, (r.memory.recommendedRAM * 1024 * 0.25) / (r.conf.maxConnections * 4), { numFmt: NUMFMT.dec2 });
  s.computed("work_mem (MB)", floorPow2Formula(workMemRaw), r.conf.workMemMB, { numFmt: NUMFMT.int });
  s.computed("wal_buffers (MB)", "16", 16, { numFmt: NUMFMT.int });
  s.computed("max_wal_size (GB)", iff(eq(writeIntensity, "High"), "16", iff(eq(writeIntensity, "Medium"), "8", "4")), r.conf.maxWalSizeGB, { numFmt: NUMFMT.int });
  s.computed("checkpoint_completion_target", "0.9", 0.9);
  s.computed("random_page_cost", iff(eq(storageType, "HDD"), "4.0", "1.1"), r.conf.randomPageCost);
  s.computed("effective_io_concurrency", iff(eq(storageType, "HDD"), "2", "200"), r.conf.effectiveIOConcurrency, { numFmt: NUMFMT.int });
  s.computed("max_worker_processes", `${recommendedCores}`, r.conf.maxWorkerProcesses, { numFmt: NUMFMT.int });
  s.computed("max_parallel_workers", `${recommendedCores}`, r.conf.maxParallelWorkers, { numFmt: NUMFMT.int });
  s.computed("max_parallel_workers_per_gather", `INT(${recommendedCores}/2)`, r.conf.maxParallelWorkersPerGather, { numFmt: NUMFMT.int });
  s.computed(
    "autovacuum_vacuum_scale_factor",
    iff(eq(writeIntensity, "High"), "0.02", iff(eq(writeIntensity, "Medium"), "0.05", "0.1")),
    r.conf.autovacuumVacuumScaleFactor,
  );

  return { ws, coresCell: recommendedCores, ramCell: recommendedRAM };
}
