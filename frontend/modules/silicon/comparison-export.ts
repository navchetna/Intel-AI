/** Exports the Silicon page's Comparisons tab — compute throughput, memory, PCIe, and sources —
 *  to a formatted .xlsx workbook, one sheet per table shown on screen. */

import ExcelJS from "exceljs";
import { COMPARISON_CHIPS, DTYPE_ORDER, type ComparisonChip, type DataType } from "./comparison-data";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";
const CATEGORY_ORDER: ComparisonChip["category"][] = ["CPU", "GPU", "Accelerator"];

const thin: ExcelJS.Border = { style: "thin", color: { argb: BORDER_COLOR } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

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
  subtitleCell.alignment = { wrapText: true, vertical: "top" };
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

function writeDataRow(ws: ExcelJS.Worksheet, row: number, label: string, values: string[], isAlt: boolean) {
  const labelCell = ws.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = { bold: true };
  labelCell.border = ALL_BORDERS;
  labelCell.alignment = { vertical: "top", wrapText: true };
  if (isAlt) labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };

  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 2);
    cell.value = v;
    cell.border = ALL_BORDERS;
    cell.alignment = { vertical: "top", wrapText: true };
    if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
  });
}

function buildFlopsSheet(ws: ExcelJS.Worksheet, chips: ComparisonChip[]): void {
  const rows = DTYPE_ORDER.filter(dt => chips.some(c => c.flops[dt]));
  const widths = [16, ...chips.map(() => 30)];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(
    ws, "Silicon Comparison — Compute Throughput",
    `TFLOPS/TOPS per data type, generated ${new Date().toLocaleString()}. Blank = not supported, or not yet disclosed by the vendor — never a guess.`,
    widths.length,
  );
  styleHeaderRow(ws, headerRow, ["Data type", ...chips.map(c => `${c.name} (${c.category})`)]);

  let row = headerRow + 1;
  rows.forEach((dt, idx) => {
    const values = chips.map(c => {
      const cell = c.flops[dt as DataType];
      if (!cell) return "—";
      return cell.note ? `${cell.value} — ${cell.note}` : cell.value;
    });
    writeDataRow(ws, row, dt, values, idx % 2 === 1);
    row += 1;
  });

  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: widths.length } };
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow }];
}

function buildMemorySheet(ws: ExcelJS.Worksheet, chips: ComparisonChip[]): void {
  const widths = [16, ...chips.map(() => 30)];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(ws, "Silicon Comparison — Memory", `Type, peak bandwidth, and capacity. Generated ${new Date().toLocaleString()}.`, widths.length);
  styleHeaderRow(ws, headerRow, ["Memory", ...chips.map(c => `${c.name} (${c.category})`)]);

  const fields: { key: keyof ComparisonChip["memory"]; label: string }[] = [
    { key: "type", label: "Memory type" },
    { key: "bandwidth", label: "Bandwidth" },
    { key: "capacity", label: "Capacity" },
  ];
  let row = headerRow + 1;
  fields.forEach((f, idx) => {
    writeDataRow(ws, row, f.label, chips.map(c => c.memory[f.key]), idx % 2 === 1);
    row += 1;
  });

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow }];
}

function buildPcieSheet(ws: ExcelJS.Worksheet, chips: ComparisonChip[]): void {
  const gpuChips = chips.filter(c => c.category !== "CPU");
  const widths = [22, ...gpuChips.map(() => 30)];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(
    ws, "Silicon Comparison — PCIe Host Interface",
    `Lanes and generation needed to run each card at its rated bandwidth — GPUs and accelerators only. Generated ${new Date().toLocaleString()}.`,
    widths.length,
  );
  styleHeaderRow(ws, headerRow, ["Host interface", ...gpuChips.map(c => `${c.name} (${c.category})`)]);

  const fields: { key: "lanes" | "gen"; label: string }[] = [
    { key: "lanes", label: "PCIe lanes needed" },
    { key: "gen", label: "PCIe generation needed" },
  ];
  let row = headerRow + 1;
  fields.forEach((f, idx) => {
    const values = gpuChips.map(c => {
      if (!c.pcie) return "N/A — no PCIe host link";
      const base = f.key === "lanes" ? `x${c.pcie.lanes}` : `Gen ${c.pcie.gen}`;
      return f.key === "lanes" && c.pcie.note ? `${base} — ${c.pcie.note}` : base;
    });
    writeDataRow(ws, row, f.label, values, idx % 2 === 1);
    row += 1;
  });

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow }];
}

function buildSourcesSheet(ws: ExcelJS.Worksheet, chips: ComparisonChip[]): void {
  const widths = [16, 32, 90];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  const headerRow = addTitle(ws, "Silicon Comparison — Sources", `Where each row's figures come from. Generated ${new Date().toLocaleString()}.`, widths.length);
  styleHeaderRow(ws, headerRow, ["Category", "Part", "Source"]);

  let row = headerRow + 1;
  chips.forEach((c, idx) => {
    const isAlt = idx % 2 === 1;
    [c.category, c.name, c.sourceNote].forEach((v, colIdx) => {
      const cell = ws.getCell(row, colIdx + 1);
      cell.value = v;
      cell.border = ALL_BORDERS;
      cell.alignment = { wrapText: true, vertical: "top" };
      if (colIdx < 2) cell.font = { bold: colIdx === 1 };
      if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
    });
    row += 1;
  });

  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

export async function exportSiliconComparisonToExcel(): Promise<void> {
  const chips = CATEGORY_ORDER.flatMap(cat => COMPARISON_CHIPS.filter(c => c.category === cat));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  buildFlopsSheet(workbook.addWorksheet("Compute Throughput"), chips);
  buildMemorySheet(workbook.addWorksheet("Memory"), chips);
  buildPcieSheet(workbook.addWorksheet("PCIe"), chips);
  buildSourcesSheet(workbook.addWorksheet("Sources"), chips);

  await downloadWorkbook(workbook, "intel-ai-silicon-comparison.xlsx");
}
