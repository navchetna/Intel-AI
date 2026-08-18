/** Exports the full Tasks catalog — every task, every spec field — to a formatted
 *  .xlsx workbook. All tasks map to a Pydantic AI task; there is no other runner. */

import ExcelJS from "exceljs";
import { CATEGORY_ORDER, CATEGORY_META, CONVENTIONS, type WorkflowDef } from "./data";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";

const thin: ExcelJS.Border = { style: "thin", color: { argb: BORDER_COLOR } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

function lightTint(hex: string, whiteMix = 0.82): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c * (1 - whiteMix) + 255 * whiteMix);
  const toHex = (c: number) => c.toString(16).padStart(2, "0").toUpperCase();
  return `FF${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

function styleHeaderRow(ws: ExcelJS.Worksheet, row: number, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = ALL_BORDERS;
  });
  ws.getRow(row).height = 20;
}

function addTitle(ws: ExcelJS.Worksheet, title: string, subtitle: string, span: number): number {
  let row = 1;
  const titleCell = ws.getCell(row, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
  row += 1;

  ws.mergeCells(row, 1, row, span);
  const subtitleCell = ws.getCell(row, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  row += 2;
  return row;
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

function sortByCategory(tasks: WorkflowDef[]): WorkflowDef[] {
  return [...tasks].sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
  });
}

function buildTaskSpecsSheet(ws: ExcelJS.Worksheet, tasks: WorkflowDef[]): void {
  const widths = [22, 26, 22, 14, 34, 34, 34, 34, 30, 26, 30];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(
    ws, "Task Specifications — Intel-AI Task Catalog",
    `${tasks.length} tasks · Pydantic AI task mapping · generated ${new Date().toLocaleString()} · Impl: Deterministic = never call a model · Model = single LLM call · Hybrid = deterministic first, model on fallback`,
    widths.length,
  );
  const headers = [
    "ID", "Name", "Category", "Impl", "Inputs", "Outputs",
    "Prompt / Instructions", "Business Logic & Validation", "Config Parameters", "Escalate When", "Typical Chain",
  ];
  styleHeaderRow(ws, headerRow, headers);

  const sorted = sortByCategory(tasks);

  let row = headerRow + 1;
  sorted.forEach((t, idx) => {
    const isAlt = idx % 2 === 1;
    const values: string[] = [
      t.id, t.name, t.category, t.impl, t.inputs, t.outputs,
      t.promptInstructions, t.businessLogic, t.configParameters, t.escalateWhen, t.typicalChain,
    ];
    values.forEach((v, colIdx) => {
      const cell = ws.getCell(row, colIdx + 1);
      cell.value = v;
      cell.border = ALL_BORDERS;
      cell.alignment = colIdx >= 4
        ? { wrapText: true, vertical: "top" }
        : { vertical: "top", horizontal: "left" };
      if (colIdx === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightTint(CATEGORY_META[t.category].accent) } };
        cell.font = { bold: true };
      } else if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
      }
    });
    row += 1;
  });

  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: headers.length } };
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow, topLeftCell: `C${headerRow + 1}` }];
}

function buildConventionsSheet(ws: ExcelJS.Worksheet): void {
  const widths = [22, 90];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(ws, "Cross-cutting conventions", "These apply to every task and are therefore not repeated in each row.", widths.length);
  styleHeaderRow(ws, headerRow, ["Convention", "Rule"]);

  let row = headerRow + 1;
  CONVENTIONS.forEach((c, idx) => {
    const isAlt = idx % 2 === 1;
    [c.convention, c.rule].forEach((v, colIdx) => {
      const cell = ws.getCell(row, colIdx + 1);
      cell.value = v;
      cell.border = ALL_BORDERS;
      cell.alignment = { wrapText: true, vertical: "top" };
      if (colIdx === 0) cell.font = { bold: true };
      if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
    });
    row += 1;
  });
}

export async function exportWorkflowsToExcel(tasks: WorkflowDef[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  buildTaskSpecsSheet(workbook.addWorksheet("Task Specs"), tasks);
  buildConventionsSheet(workbook.addWorksheet("Conventions"));

  await downloadWorkbook(workbook, "intel-ai-task-specs.xlsx");
}
