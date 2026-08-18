/** Builds and downloads the project's full sizing workbook: Business Processes, References,
 *  Model-Defaults, Agent Task Sizing, Agent-Model-Serving, Embedding-ReRanking-Security, Harness,
 *  one sheet per selected workload with a sizing calculator, and a consolidating Summary. Every
 *  computed cell carries both a live Excel formula and a cached value from the app's own
 *  calculators, so the workbook is correct on open and recalculates as inputs change. */

import ExcelJS from "exceljs";
import type { TaskModelDefault } from "@/modules/models/data";
import { SIZING_MAP, defaultInputsFor } from "@/modules/agentic-ai/sizing-wiring";
import { summarizeResources } from "@/modules/agentic-ai/sizing-calcs";
import { taskDefaultsByType } from "@/modules/workflows/task-sizing-calcs";
import type { ProjectData } from "../types";
import type { HarnessSizingSummary, GpuCpuSummary } from "../summary";
import { SHEET } from "./sheetNames";
import { buildBusinessProcessesSheet, buildReferencesSheet } from "./businessProcesses";
import { buildModelDefaultsSheet } from "./modelDefaults";
import { buildAgentTaskSizingSheet } from "./agentTaskSizing";
import { buildAgentModelServingSheet } from "./agentModelServing";
import { buildEmbeddingRerankingSecuritySheet } from "./modelsSizing";
import { buildHarnessSheet, type WorkloadSheetRef } from "./harness";
import { buildWorkloadSheet } from "./workloads";
import { buildSummarySheet } from "./summaryPage";

/** Excel sheet names: max 31 chars, and can't contain : \ / ? * [ ] */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, "-").slice(0, 31);
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportProjectToExcel(
  projectName: string,
  data: ProjectData,
  taskDefaults: TaskModelDefault[],
  requestVolumeDefaults: TaskModelDefault[],
  harnessSizingSummary: HarnessSizingSummary,
  gpuCpuSummary: GpuCpuSummary,
  totalTdpKw: number,
): Promise<void> {
  const defaultsByTaskType = taskDefaultsByType(taskDefaults);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  const wsBusinessProcesses = workbook.addWorksheet(SHEET.businessProcesses);
  const processRowMaps = buildBusinessProcessesSheet(wsBusinessProcesses, data.agents.businessProcesses, defaultsByTaskType);

  const wsReferences = workbook.addWorksheet(SHEET.references);
  await buildReferencesSheet(wsReferences, data.agents.businessProcesses);

  const wsModelDefaults = workbook.addWorksheet(SHEET.modelDefaults);
  const modelDefaultsLayout = buildModelDefaultsSheet(wsModelDefaults, taskDefaults);

  const wsAgentTaskSizing = workbook.addWorksheet(SHEET.agentTaskSizing);
  const taskSizingRows = buildAgentTaskSizingSheet(
    wsAgentTaskSizing, data.agents.businessProcesses, defaultsByTaskType, processRowMaps, modelDefaultsLayout,
  );

  const wsAgentModelServing = workbook.addWorksheet(SHEET.agentModelServing);
  buildAgentModelServingSheet(wsAgentModelServing, data.agents.businessProcesses, defaultsByTaskType, taskSizingRows);

  const wsEmbedding = workbook.addWorksheet(SHEET.embeddingRerankingSecurity);
  buildEmbeddingRerankingSecuritySheet(wsEmbedding, requestVolumeDefaults, modelDefaultsLayout);

  const workloadSheets: Record<string, WorkloadSheetRef> = {};
  for (const workloadId of data.agenticStack.selectedWorkloads) {
    const tool = SIZING_MAP[workloadId];
    if (!tool) continue;
    const inputs = data.agenticStack.sizingInputs[workloadId] ?? defaultInputsFor(tool);
    const sheetName = sanitizeSheetName(workloadId);
    const ws = workbook.addWorksheet(sheetName);
    const result = buildWorkloadSheet(ws, tool, inputs);
    if (!result) {
      workbook.removeWorksheet(ws.id);
      continue;
    }
    const { coresCell, ramCell } = result;
    const { cores, ramGB } = summarizeResources(tool, inputs);
    workloadSheets[workloadId] = { sheetName, coresCell, ramCell, cores, ramGB };
  }

  const wsHarness = workbook.addWorksheet(SHEET.harness);
  buildHarnessSheet(wsHarness, data.agenticStack.selectedWorkloads, workloadSheets);

  const wsSummary = workbook.addWorksheet(SHEET.summary);
  buildSummarySheet(wsSummary, harnessSizingSummary, gpuCpuSummary, totalTdpKw);

  const safeName = projectName.replace(/[^a-z0-9-_]+/gi, "_") || "project";
  await downloadWorkbook(workbook, `${safeName}-sizing.xlsx`);
}
