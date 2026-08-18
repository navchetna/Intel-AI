/** Exports the full Model Catalog — every model, every field — to one formatted .xlsx sheet. */

import ExcelJS from "exceljs";
import { CATEGORY_ORDER, CATEGORY_COLORS, type Model } from "./data";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";

const thin: ExcelJS.Border = { style: "thin", color: { argb: BORDER_COLOR } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

const yesNo = (v: boolean): string => (v ? "Yes" : "No");
const join = (v: string[]): string => v.join(", ");

/** Blends a brand hex color toward white for a light, readable header/cell tint. */
function lightTint(hex: string, whiteMix = 0.82): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c * (1 - whiteMix) + 255 * whiteMix);
  const toHex = (c: number) => c.toString(16).padStart(2, "0").toUpperCase();
  return `FF${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

interface ColumnSpec {
  header: string;
  width: number;
  wrap?: boolean;
  get: (m: Model) => string | number;
}

const COLUMNS: ColumnSpec[] = [
  { header: "Name", width: 26, get: m => m.name },
  { header: "HF ID", width: 30, get: m => m.hfId },
  { header: "Category", width: 20, get: m => m.category },
  { header: "Year", width: 8, get: m => m.year },
  { header: "Year Label", width: 14, get: m => m.yearLabel },
  { header: "Params", width: 14, get: m => m.params },
  { header: "Tasks", width: 40, wrap: true, get: m => join(m.tasks) },
  { header: "Model Size", width: 16, get: m => m.modelSize },
  { header: "VRAM", width: 16, get: m => m.vram },
  { header: "Quantization", width: 30, wrap: true, get: m => join(m.quantization) },
  { header: "Multilingual", width: 30, wrap: true, get: m => m.multilingual },
  { header: "CPU Support", width: 11, get: m => yesNo(m.cpuSupport) },
  { header: "Commercial", width: 11, get: m => yesNo(m.commercial) },
  { header: "Origin", width: 24, get: m => m.origin },
  { header: "Maintained", width: 11, get: m => yesNo(m.maintained) },
  { header: "Serving", width: 30, wrap: true, get: m => join(m.serving) },
  { header: "Benchmark", width: 40, wrap: true, get: m => m.benchmark },
  { header: "Key Benchmarks", width: 40, wrap: true, get: m => m.keyBenchmarks },
  { header: "Recommended Use", width: 40, wrap: true, get: m => m.recommendedUse },
  { header: "Known Limitations", width: 40, wrap: true, get: m => m.knownLimitations },
  { header: "HF Adoption", width: 30, wrap: true, get: m => m.hfAdoption },
  { header: "Cloud/Edge", width: 20, wrap: true, get: m => m.cloudEdge },
  { header: "Finetuning", width: 11, get: m => yesNo(m.finetuning) },
  { header: "Docker Support", width: 12, get: m => yesNo(m.dockerSupport) },
  { header: "Architecture", width: 40, wrap: true, get: m => m.architecture },
  { header: "Max Tokens", width: 12, get: m => m.maxTokens },
  { header: "Params (B)", width: 11, get: m => m.paramsB ?? "" },
  { header: "Num Layers", width: 11, get: m => m.numLayers ?? "" },
  { header: "Num KV Heads", width: 12, get: m => m.numKvHeads ?? "" },
  { header: "Head Dim", width: 10, get: m => m.headDim ?? "" },
];

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

export async function exportModelCatalogToExcel(models: Model[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Model Catalog");
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

  let row = 1;
  const titleCell = ws.getCell(row, 1);
  titleCell.value = "Model Catalog — Intel-AI";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
  row += 1;

  ws.mergeCells(row, 1, row, COLUMNS.length);
  const subtitleCell = ws.getCell(row, 1);
  subtitleCell.value = `${models.length} models · generated ${new Date().toLocaleString()}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  row += 2;

  const headerRow = row;
  COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = ALL_BORDERS;
  });
  ws.getRow(headerRow).height = 20;
  row += 1;

  const sorted = [...models].sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
  });

  sorted.forEach((model, rowIdx) => {
    const isAlt = rowIdx % 2 === 1;
    COLUMNS.forEach((c, colIdx) => {
      const cell = ws.getCell(row, colIdx + 1);
      cell.value = c.get(model);
      cell.border = ALL_BORDERS;
      cell.alignment = c.wrap
        ? { wrapText: true, vertical: "top" }
        : { vertical: "top", horizontal: colIdx === 3 ? "center" : "left" };
      if (c.header === "Category") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightTint(CATEGORY_COLORS[model.category].accent) } };
        cell.font = { bold: true };
      } else if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
      }
    });
    row += 1;
  });

  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: COLUMNS.length } };
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow, topLeftCell: `C${headerRow + 1}` }];

  await downloadWorkbook(workbook, "intel-ai-model-catalog.xlsx");
}
