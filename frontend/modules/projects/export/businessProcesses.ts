/** "Business Processes" + "References" sheets: per-process description/cases-per-day/processing-
 *  window, each process's agent roster down to required concurrency (Little's Law, live formulas),
 *  and the source-extract markdown backing each business process. Row positions are returned so
 *  the Agent Task Sizing sheet can cross-reference this sheet's Cases/day, Processing window,
 *  Calls/Day and Peak Calls/Sec cells instead of recomputing them. */

import type ExcelJS from "exceljs";
import { withBase } from "@/lib/deployment";
import { taskTypeForRole, TASK_TYPE_LATENCY, calcRequiredConcurrency } from "@/modules/workflows/task-sizing-calcs";
import type { TaskModelDefault } from "@/modules/models/data";
import type { BusinessProcess } from "../types";
import { cellAddr } from "./formula-sheet";
import { styleTitle, styleHeader, styleSection, styleCell, NUMFMT } from "./xlsx-style";

export interface AgentRowRef {
  agentId: string;
  row: number;
}

export interface ProcessRowMap {
  processId: string;
  paramsRow: number;
  agentRows: AgentRowRef[];
}

function seedLatencySec(taskType: string | null, overrideSec: number | undefined, defaultsByTaskType: Record<string, TaskModelDefault>): number | "" {
  if (overrideSec != null) return overrideSec;
  const taskDefault = taskType ? defaultsByTaskType[taskType] : undefined;
  if (taskDefault?.latency_sec != null) return taskDefault.latency_sec;
  const fallback = taskType ? TASK_TYPE_LATENCY[taskType] : undefined;
  return fallback?.latencySec ?? "";
}

export function buildBusinessProcessesSheet(
  ws: ExcelJS.Worksheet,
  businessProcesses: BusinessProcess[],
  defaultsByTaskType: Record<string, TaskModelDefault>,
): ProcessRowMap[] {
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 12;
  ws.getColumn(7).width = 14;

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Business Processes";
  row += 2;

  const rowMaps: ProcessRowMap[] = [];

  for (const process of businessProcesses) {
    ws.mergeCells(row, 1, row, 7);
    styleSection(ws.getCell(row, 1));
    ws.getCell(row, 1).value = `Business Process: ${process.name || "(untitled)"}`;
    row += 1;

    ws.mergeCells(row, 2, row, 7);
    const descLabelCell = ws.getCell(row, 1);
    descLabelCell.value = "Description:";
    styleCell(descLabelCell, "label");
    const descCell = ws.getCell(row, 2);
    descCell.value = process.description || "";
    styleCell(descCell, "plain");
    ws.getRow(row).height = 34;
    row += 1;

    const paramsRow = row;
    const casesLabel = ws.getCell(row, 1);
    casesLabel.value = "Cases / day:";
    styleCell(casesLabel, "label");
    const casesValue = ws.getCell(row, 2);
    casesValue.value = process.casesPerDay || 0;
    styleCell(casesValue, "input", NUMFMT.int);
    const windowLabel = ws.getCell(row, 3);
    windowLabel.value = "Processing window (hrs):";
    styleCell(windowLabel, "label");
    const windowValue = ws.getCell(row, 4);
    windowValue.value = process.peakHoursPerDay || 24;
    styleCell(windowValue, "input", NUMFMT.dec2);
    row += 2;

    const headerRow = row;
    ["Agent / Role", "Task-Type", "Calls/Case", "Calls/Day", "Peak Calls/Sec", "Latency (s)", "Concurrency"].forEach((h, idx) => {
      const cell = ws.getCell(headerRow, idx + 1);
      cell.value = h;
      styleHeader(cell);
    });
    row += 1;

    const agentRows: AgentRowRef[] = [];
    const casesAddr = cellAddr(paramsRow, 1);
    const windowAddr = cellAddr(paramsRow, 3);

    if (process.agents.length === 0) {
      ws.mergeCells(row, 1, row, 7);
      const cell = ws.getCell(row, 1);
      cell.value = "No agents added yet.";
      styleCell(cell, "plain");
      row += 1;
    }

    for (const agent of process.agents) {
      const taskType = taskTypeForRole(agent.role ?? "");
      const latencySec = seedLatencySec(taskType, agent.taskSizing?.latencySec, defaultsByTaskType);
      const result = calcRequiredConcurrency({
        casesPerDay: process.casesPerDay || 0,
        callsPerCase: agent.callsPerCase ?? 0,
        role: agent.role ?? "",
        peakHoursPerDay: process.peakHoursPerDay || 24,
        latencyOverrideSec: agent.taskSizing?.latencySec,
        taskDefault: taskType ? defaultsByTaskType[taskType] : undefined,
      });

      const nameCell = ws.getCell(row, 1);
      nameCell.value = agent.name || "(unnamed)";
      styleCell(nameCell, "label");
      const roleCell = ws.getCell(row, 2);
      roleCell.value = agent.role || "";
      styleCell(roleCell, "computed");
      const callsCaseCell = ws.getCell(row, 3);
      callsCaseCell.value = agent.callsPerCase ?? 0;
      styleCell(callsCaseCell, "input", NUMFMT.dec2);

      const callsDayCell = ws.getCell(row, 4);
      callsDayCell.value = { formula: `C${row}*${casesAddr}`, result: result.callsPerDay };
      styleCell(callsDayCell, "computed", NUMFMT.int);

      const peakCallsCell = ws.getCell(row, 5);
      peakCallsCell.value = { formula: `ROUND(D${row}/(${windowAddr}*3600),2)`, result: result.callsPerSec };
      styleCell(peakCallsCell, "computed", NUMFMT.dec2);

      const latencyCell = ws.getCell(row, 6);
      latencyCell.value = latencySec;
      styleCell(latencyCell, "input", NUMFMT.dec2);

      const concurrencyCell = ws.getCell(row, 7);
      concurrencyCell.value = { formula: `IF(F${row}="","",ROUNDUP(E${row}*F${row},0))`, result: result.requiredConcurrency ?? 0 };
      styleCell(concurrencyCell, "computed", NUMFMT.int);

      agentRows.push({ agentId: agent.id, row });
      row += 1;
    }

    row += 2;
    rowMaps.push({ processId: process.id, paramsRow, agentRows });
  }

  if (businessProcesses.length === 0) {
    ws.getCell(row, 1).value = "No business processes described yet.";
    styleCell(ws.getCell(row, 1), "plain");
  }

  ws.views = [{ state: "frozen", ySplit: 2 }];
  return rowMaps;
}

// ── References sheet ─────────────────────────────────────────────────────────────────────────

interface ReferenceFile {
  filename: string | undefined;
  content: string | null;
}

async function fetchReferenceFiles(count: number): Promise<ReferenceFile[]> {
  let filenames: string[] = [];
  try {
    const res = await fetch(withBase("/reference-docs"));
    if (res.ok) {
      const data: { files: string[] } = await res.json();
      filenames = data.files ?? [];
    }
  } catch {
    filenames = [];
  }

  const files: ReferenceFile[] = [];
  for (let i = 0; i < count; i++) {
    const filename = filenames[i];
    if (!filename) { files.push({ filename: undefined, content: null }); continue; }
    try {
      const res = await fetch(withBase(`/${filename}`));
      files.push({ filename, content: res.ok ? await res.text() : null });
    } catch {
      files.push({ filename, content: null });
    }
  }
  return files;
}

export async function buildReferencesSheet(ws: ExcelJS.Worksheet, businessProcesses: BusinessProcess[]): Promise<void> {
  ws.getColumn(1).width = 130;

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "References — source material cited for each business process";
  row += 2;

  const referenceFiles = await fetchReferenceFiles(businessProcesses.length);

  businessProcesses.forEach((process, i) => {
    const { filename, content } = referenceFiles[i] ?? { filename: undefined, content: null };

    styleSection(ws.getCell(row, 1));
    ws.getCell(row, 1).value = `Business Process: ${process.name || "(untitled)"}`;
    row += 1;

    const sourceCell = ws.getCell(row, 1);
    sourceCell.value = filename ? `Source: ${filename}` : "Source: (no reference document found for this business process)";
    sourceCell.font = { italic: true, color: { argb: "FF64748B" } };
    row += 2;

    if (content) {
      for (const line of content.split(/\r?\n/)) {
        const cell = ws.getCell(row, 1);
        cell.value = line;
        cell.alignment = { wrapText: true, vertical: "top" };
        row += 1;
      }
    } else if (filename) {
      ws.getCell(row, 1).value = "(Could not load this reference document.)";
      row += 1;
    }
    row += 2;
  });

  if (businessProcesses.length === 0) {
    ws.getCell(row, 1).value = "No business processes described yet.";
  }

  ws.views = [{ state: "frozen", ySplit: 2 }];
}
