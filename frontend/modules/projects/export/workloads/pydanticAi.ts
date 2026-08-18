import type ExcelJS from "exceljs";
import { calcPydanticAI, type PydanticAIInputs } from "@/modules/agentic-ai/sizing-calcs";
import { FormulaSheet, ceil, max, iff } from "../formula-sheet";
import { NUMFMT } from "../xlsx-style";
import type { WorkloadSheetResult } from "./postgres";

export function buildPydanticAISheet(ws: ExcelJS.Worksheet, i: PydanticAIInputs): WorkloadSheetResult {
  const r = calcPydanticAI(i);
  const s = new FormulaSheet(ws);
  s.title("Pydantic AI — Agent App Tier Sizing");
  s.subtitle("Formulas ported 1:1 from the app's calcPydanticAI() — edit any amber input cell and the sheet recalculates.");

  s.section("Inputs");
  const peakRunsPerSec = s.input("Peak runs/sec", i.peakRunsPerSec, { numFmt: NUMFMT.dec2 });
  const stepsPerRun = s.input("Steps/run", i.stepsPerRun, { numFmt: NUMFMT.dec2 });
  const avgLlmLatencyPerStepSec = s.input("Avg LLM latency/step (s)", i.avgLlmLatencyPerStepSec, { numFmt: NUMFMT.dec2 });
  const toolCallsPerRun = s.input("Tool calls/run", i.toolCallsPerRun, { numFmt: NUMFMT.dec2 });
  const avgToolLatencyPerCallSec = s.input("Avg tool latency/call (s)", i.avgToolLatencyPerCallSec, { numFmt: NUMFMT.dec2 });
  const localCpuWorkPerStepMs = s.input("Local CPU work/step (ms)", i.localCpuWorkPerStepMs, { numFmt: NUMFMT.dec2 });
  const ramPerInFlightRunMB = s.input("RAM/in-flight run (MB)", i.ramPerInFlightRunMB, { numFmt: NUMFMT.dec2 });
  const retryOverheadFactor = s.input("Retry overhead ×", i.retryOverheadFactor, { numFmt: NUMFMT.dec2 });
  const maxConcurrentRunsPerWorker = s.input("Max concurrent runs/worker", i.maxConcurrentRunsPerWorker, { numFmt: NUMFMT.int });
  const workerProcessesPerNode = s.input("Worker processes/node", i.workerProcessesPerNode, { numFmt: NUMFMT.int });
  const usableVcpuPerNode = s.input("Usable vCPU/node", i.usableVcpuPerNode, { numFmt: NUMFMT.int });
  const usableRamPerNodeGB = s.input("Usable RAM/node (GB)", i.usableRamPerNodeGB, { numFmt: NUMFMT.int });
  const cpuUtilizationTarget = s.input("CPU utilization target (0–1)", i.cpuUtilizationTarget, { numFmt: NUMFMT.dec2 });
  const concurrencySafetyHeadroom = s.input("Concurrency safety headroom (0–1)", i.concurrencySafetyHeadroom, { numFmt: NUMFMT.dec2 });
  const durableExecutionBackend = s.input("Durable execution backend", i.durableExecutionBackend, {
    validation: ["None", "DBOS (Postgres)", "Temporal (cluster)"],
  });
  const checkpointsPerRun = s.input("Checkpoints/run", i.checkpointsPerRun, { numFmt: NUMFMT.dec2 });
  const avgCheckpointSizeKB = s.input("Avg checkpoint size (KB)", i.avgCheckpointSizeKB, { numFmt: NUMFMT.dec2 });
  s.blank();

  s.section("Concurrency");
  const avgRunWallTimeSec = s.computed("Avg run wall time (s)", `(${stepsPerRun}*${avgLlmLatencyPerStepSec}+${toolCallsPerRun}*${avgToolLatencyPerCallSec})*${retryOverheadFactor}`, r.concurrency.avgRunWallTimeSec);
  const activeCpuPerRunMs = s.computed("Active CPU/run (ms)", `${stepsPerRun}*${localCpuWorkPerStepMs}*${retryOverheadFactor}`, r.concurrency.activeCpuPerRunMs);
  s.computed("IO-wait fraction", `1-(${activeCpuPerRunMs}/1000)/${avgRunWallTimeSec}`, r.concurrency.ioWaitFraction, { numFmt: NUMFMT.pct });
  const peakConcurrentInFlightRuns = s.computed("Peak concurrent in-flight runs", `${peakRunsPerSec}*${avgRunWallTimeSec}`, r.concurrency.peakConcurrentInFlightRuns);
  const provisionedConcurrency = s.computed("Provisioned concurrency", `${peakConcurrentInFlightRuns}*(1+${concurrencySafetyHeadroom})`, r.concurrency.provisionedConcurrency);
  s.blank();

  s.section("Fleet");
  const workersByConcurrency = s.computed("Workers by concurrency", ceil(`${provisionedConcurrency}/${maxConcurrentRunsPerWorker}`), r.fleet.workersByConcurrency, { numFmt: NUMFMT.int });
  const activeCpuSecondsPerSecFleet = s.computed("Active CPU-seconds/sec (fleet)", `${peakRunsPerSec}*(${activeCpuPerRunMs}/1000)`, r.fleet.activeCpuSecondsPerSecFleet);
  const coresByActiveCpu = s.computed("Cores by active CPU", ceil(`${activeCpuSecondsPerSecFleet}/${cpuUtilizationTarget}`), r.fleet.coresByActiveCpu, { numFmt: NUMFMT.int });
  const requiredWorkers = s.computed("Required workers", max(workersByConcurrency, coresByActiveCpu), r.fleet.requiredWorkers, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Memory");
  const ramForInFlightRunsGB = s.computed("RAM for in-flight runs (GB)", `${provisionedConcurrency}*${ramPerInFlightRunMB}/1000`, r.memory.ramForInFlightRunsGB);
  const workerRuntimeOverheadGB = s.computed("Worker runtime overhead (GB)", `${requiredWorkers}*0.25`, r.memory.workerRuntimeOverheadGB);
  s.computed("Total agent-tier RAM (GB)", `${ramForInFlightRunsGB}+${workerRuntimeOverheadGB}`, r.memory.totalAgentTierRamGB);
  s.blank();

  s.section("Recommended");
  const nodesByWorkers = s.computed("Nodes by workers", ceil(`${requiredWorkers}/${workerProcessesPerNode}`), r.recommended.nodesByWorkers, { numFmt: NUMFMT.int });
  const nodesByRam = s.computed("Nodes by RAM", ceil(`(${ramForInFlightRunsGB}+${workerRuntimeOverheadGB})/${usableRamPerNodeGB}`), r.recommended.nodesByRam, { numFmt: NUMFMT.int });
  const nodesByVcpu = s.computed("Nodes by vCPU", ceil(`${coresByActiveCpu}/${usableVcpuPerNode}`), r.recommended.nodesByVcpu, { numFmt: NUMFMT.int });
  const recommendedNodes = s.computed("Recommended nodes", max(nodesByWorkers, nodesByRam, nodesByVcpu, "2"), r.recommended.recommendedNodes, { numFmt: NUMFMT.int });
  const recommendedFleetVcpu = s.computed("Recommended fleet vCPU", `${recommendedNodes}*${usableVcpuPerNode}`, r.recommended.recommendedFleetVcpu, { numFmt: NUMFMT.int });
  const recommendedFleetRamGB = s.computed("Recommended fleet RAM (GB)", `${recommendedNodes}*${usableRamPerNodeGB}`, r.recommended.recommendedFleetRamGB, { numFmt: NUMFMT.int });
  s.blank();

  s.section("Model Demand");
  s.computed("Model requests/sec demanded", `${peakRunsPerSec}*${stepsPerRun}*${retryOverheadFactor}`, r.modelDemand.modelRequestsPerSecDemanded);
  s.computed("Peak concurrent model calls", `${peakRunsPerSec}*${stepsPerRun}*${avgLlmLatencyPerStepSec}*${retryOverheadFactor}`, r.modelDemand.peakConcurrentModelCalls);
  s.blank();

  s.section("Durability");
  const durabilityEnabled = `${durableExecutionBackend}<>"None"`;
  const checkpointWriteRate = s.computed("Checkpoint write rate", iff(durabilityEnabled, `${peakRunsPerSec}*${checkpointsPerRun}*${retryOverheadFactor}`, "0"), r.durability.checkpointWriteRate);
  s.computed("Checkpoint write throughput (MB/s)", `${checkpointWriteRate}*${avgCheckpointSizeKB}/1000`, r.durability.checkpointWriteThroughputMBs);
  s.computed("Durability write IOPS", `${checkpointWriteRate}*1.5`, r.durability.durabilityWriteIOPS);

  return { ws, coresCell: recommendedFleetVcpu, ramCell: recommendedFleetRamGB };
}
