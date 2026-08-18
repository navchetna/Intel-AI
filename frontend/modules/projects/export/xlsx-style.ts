/** Shared ExcelJS styling — one consistent look across every sheet in the export: bold filled
 *  headers, thin borders on every table cell, wrapped text, and a colour convention that tells
 *  editable inputs apart from computed formulas at a glance (amber = edit me, everything else is
 *  derived). */

import type ExcelJS from "exceljs";

export const COLORS = {
  headerFill: "FF1E3A5F",
  headerFont: "FFFFFFFF",
  sectionFill: "FFDCE6F1",
  sectionFont: "FF1E3A5F",
  inputFill: "FFFFF3CD",
  computedFill: "FFF3F8FF",
  linkedFill: "FFE8F5E9",
  border: "FFB8C4D0",
  titleFont: "FF1E3A5F",
} as const;

const thin: ExcelJS.Border = { style: "thin", color: { argb: COLORS.border } };
export const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

export function styleTitle(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 16, color: { argb: COLORS.titleFont } };
}

export function styleSubtitle(cell: ExcelJS.Cell) {
  cell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  cell.alignment = { wrapText: true, vertical: "top" };
}

/** Bold filled table header cell (column headers). */
export function styleHeader(cell: ExcelJS.Cell) {
  cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 10 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerFill } };
  cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  cell.border = ALL_BORDERS;
}

/** Bold section/group divider row (e.g. a business process name, a tool name). */
export function styleSection(cell: ExcelJS.Cell) {
  cell.font = { bold: true, size: 11, color: { argb: COLORS.sectionFont } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionFill } };
  cell.border = ALL_BORDERS;
}

export type CellKind = "input" | "computed" | "linked" | "label" | "plain";

/** Applies the fill/border/number-format convention for one data cell kind. `label` cells (row
 *  captions) get a border but no fill; `plain` cells get neither (free text like descriptions). */
export function styleCell(cell: ExcelJS.Cell, kind: CellKind, numFmt?: string) {
  if (kind === "input") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.inputFill } };
    cell.border = ALL_BORDERS;
  } else if (kind === "computed") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.computedFill } };
    cell.border = ALL_BORDERS;
    cell.font = { color: { argb: "FF0F172A" } };
  } else if (kind === "linked") {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.linkedFill } };
    cell.border = ALL_BORDERS;
    cell.font = { italic: true, color: { argb: "FF14532D" } };
  } else if (kind === "label") {
    cell.border = ALL_BORDERS;
    cell.font = { bold: true };
  } else {
    cell.alignment = { wrapText: true, vertical: "top" };
  }
  if (numFmt) cell.numFmt = numFmt;
  if (kind !== "plain" && !cell.alignment) cell.alignment = { vertical: "middle", wrapText: true };
}

export const NUMFMT = {
  int: "#,##0",
  dec2: "#,##0.00",
  pct: "0.0%",
  money: "$#,##0",
};

/** Freezes the header row(s) and sets a sensible default row height for wrapped text. */
export function finalizeSheet(ws: ExcelJS.Worksheet, headerRow: number) {
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

/** Legend block explaining the colour convention — dropped near the top of every sheet with
 *  editable inputs. */
export function addLegend(ws: ExcelJS.Worksheet, row: number): number {
  const inputCell = ws.getCell(row, 1);
  inputCell.value = "  Editable input";
  styleCell(inputCell, "input");
  const computedCell = ws.getCell(row, 2);
  computedCell.value = "  Computed formula";
  styleCell(computedCell, "computed");
  const linkedCell = ws.getCell(row, 3);
  linkedCell.value = "  Linked from another sheet";
  styleCell(linkedCell, "linked");
  return row + 2;
}
