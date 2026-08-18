/** "Model-Defaults" sheet — the editable source-of-truth for task-type -> default model/latency/
 *  silicon/concurrency/request-volume, backfilled with the app's built-in fallback constants for
 *  any of the ten canonical task types missing a live row. Every canonical task type is guaranteed
 *  a row here so the Agent Task Sizing and Embedding/Re-Ranking/Security sheets can VLOOKUP by
 *  task type without ever missing a match. */

import type ExcelJS from "exceljs";
import { TASK_TYPES, TASK_TYPE_LATENCY, SILICON_OPTIONS } from "@/modules/workflows/task-sizing-calcs";
import type { TaskModelDefault } from "@/modules/models/data";
import { styleTitle, styleSubtitle, styleHeader, styleCell, NUMFMT } from "./xlsx-style";

export interface ModelDefaultsLayout {
  /** First and last data row (inclusive) — the VLOOKUP range for other sheets. */
  firstDataRow: number;
  lastDataRow: number;
  rangeRef: string;
  rowByTaskType: Record<string, number>;
}

export function buildModelDefaultsSheet(ws: ExcelJS.Worksheet, taskDefaults: TaskModelDefault[]): ModelDefaultsLayout {
  ws.getColumn(1).width = 24;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 14;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 16;
  ws.getColumn(7).width = 20;

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Model-Defaults";
  row += 1;
  ws.mergeCells(row, 1, row, 7);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    "Edit these — Task-Type, Latency, Silicon, and Concurrency here drive the Agent Task Sizing and " +
    "Embedding/Re-Ranking/Security sheets via lookups, so a change here propagates everywhere it's used.";
  ws.getRow(row).height = 30;
  row += 2;

  const headerRow = row;
  ["Task Type", "Default Model", "Latency (s)", "Silicon", "Concurrency", "Requests/day", "Processing window (hrs)"].forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  const byTaskType = new Map(taskDefaults.map(d => [d.task_type, d]));
  const orderedTaskTypes = [...TASK_TYPES, ...taskDefaults.map(d => d.task_type).filter(t => !TASK_TYPES.includes(t))];

  const firstDataRow = row;
  const rowByTaskType: Record<string, number> = {};

  for (const taskType of orderedTaskTypes) {
    const live = byTaskType.get(taskType);
    const fallback = TASK_TYPE_LATENCY[taskType];

    const taskTypeCell = ws.getCell(row, 1);
    taskTypeCell.value = taskType;
    styleCell(taskTypeCell, "input");

    const modelCell = ws.getCell(row, 2);
    modelCell.value = live?.model_name ?? "";
    styleCell(modelCell, "input");

    const latencyCell = ws.getCell(row, 3);
    latencyCell.value = live?.latency_sec ?? fallback?.latencySec ?? "";
    styleCell(latencyCell, "input", NUMFMT.dec2);

    const siliconCell = ws.getCell(row, 4);
    siliconCell.value = live?.silicon ?? fallback?.silicon ?? "";
    styleCell(siliconCell, "input");
    siliconCell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${SILICON_OPTIONS.join(",")}"`] };

    const concurrencyCell = ws.getCell(row, 5);
    concurrencyCell.value = live?.default_concurrency ?? "";
    styleCell(concurrencyCell, "input", NUMFMT.int);

    const requestsCell = ws.getCell(row, 6);
    requestsCell.value = live?.requests_per_day ?? "";
    styleCell(requestsCell, "input", NUMFMT.int);

    const windowCell = ws.getCell(row, 7);
    windowCell.value = live?.processing_window_hrs ?? "";
    styleCell(windowCell, "input", NUMFMT.dec2);

    rowByTaskType[taskType] = row;
    row += 1;
  }

  const lastDataRow = row - 1;
  ws.views = [{ state: "frozen", ySplit: headerRow }];

  return {
    firstDataRow,
    lastDataRow,
    rangeRef: `$A$${firstDataRow}:$G$${lastDataRow}`,
    rowByTaskType,
  };
}
