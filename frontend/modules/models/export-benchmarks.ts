/** Exports benchmark data to Excel with color-coded metrics and model details. */

import ExcelJS from "exceljs";
import type { JoinedRow } from "./ModelBenchmarksView";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";

// Metric column colors matching the UI
const METRIC_COLORS = {
  ttft: "FFFBBF24",      // amber
  tpot: "FFA78BFA",      // violet
  outTok: "FF34D399",    // emerald
  tokUser: "FF38BDF8",   // cyan
  reqRate: "FFF87171",   // red
};

const thin: ExcelJS.Border = { style: "thin", color: { argb: BORDER_COLOR } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

function lightTint(argbColor: string, whiteMix = 0.85): string {
  const r = parseInt(argbColor.slice(2, 4), 16);
  const g = parseInt(argbColor.slice(4, 6), 16);
  const b = parseInt(argbColor.slice(6, 8), 16);
  const mix = (c: number) => Math.round(c * (1 - whiteMix) + 255 * whiteMix);
  const toHex = (c: number) => c.toString(16).padStart(2, "0").toUpperCase();
  return `FF${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

interface ColumnSpec {
  header: string;
  width: number;
  metricColor?: string;
  get: (row: JoinedRow) => string | number;
  format?: (val: number | null) => string | number;
}

const COLUMNS: ColumnSpec[] = [
  { header: "Model Name", width: 28, get: r => r.model.name },
  { header: "Model HF ID", width: 32, get: r => r.model.hfId },
  { header: "Category", width: 16, get: r => r.model.category },
  { header: "Platform", width: 22, get: r => r.record.platform },
  { header: "Serving Engine", width: 16, get: r => r.record.serving_engine ?? "" },
  { header: "Dataset", width: 16, get: r => r.record.dataset ?? "" },
  { header: "Timestamp", width: 20, get: r => r.record.timestamp },
  { header: "Input Tokens", width: 12, get: r => r.record.input_tokens ?? "" },
  { header: "Output Tokens", width: 12, get: r => r.record.output_tokens ?? "" },
  { header: "Concurrency", width: 12, get: r => r.record.concurrency ?? "" },
  { header: "TP", width: 8, get: r => r.record.tp ?? "" },
  { header: "Num Deployments", width: 14, get: r => r.record.num_deployments ?? "" },
  { header: "Request Rate", width: 12, get: r => r.record.request_rate ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },

  // Performance metrics - color coded
  { header: "Mean TTFT (ms)", width: 14, metricColor: METRIC_COLORS.ttft, get: r => r.record.mean_ttft_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "Median TTFT (ms)", width: 15, metricColor: METRIC_COLORS.ttft, get: r => r.record.median_ttft_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "P90 TTFT (ms)", width: 14, metricColor: METRIC_COLORS.ttft, get: r => r.record.p90_ttft_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },

  { header: "Mean TPOT (ms)", width: 14, metricColor: METRIC_COLORS.tpot, get: r => r.record.mean_tpot_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "Median TPOT (ms)", width: 15, metricColor: METRIC_COLORS.tpot, get: r => r.record.median_tpot_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "P90 TPOT (ms)", width: 14, metricColor: METRIC_COLORS.tpot, get: r => r.record.p90_tpot_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },

  { header: "Mean ITL (ms)", width: 14, get: r => r.record.mean_itl_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "Median ITL (ms)", width: 14, get: r => r.record.median_itl_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "P90 ITL (ms)", width: 14, get: r => r.record.p90_itl_ms ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },

  { header: "Request Throughput (req/s)", width: 20, metricColor: METRIC_COLORS.reqRate, get: r => r.record.request_throughput ?? "", format: v => v !== null ? Number(v).toFixed(3) : "" },
  { header: "Output Token Throughput (tok/s)", width: 24, metricColor: METRIC_COLORS.outTok, get: r => r.record.output_token_throughput ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
  { header: "Interactivity (tok/s/user)", width: 20, metricColor: METRIC_COLORS.tokUser, get: r => r.record.interactivity_tokens_per_sec_per_user ?? "", format: v => v !== null ? Number(v).toFixed(2) : "" },
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

export async function exportBenchmarksToExcel(rows: JoinedRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("Benchmark Results");
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

  let row = 1;
  const titleCell = ws.getCell(row, 1);
  titleCell.value = "Model Benchmark Results — Intel-AI";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1E3A5F" } };
  row += 1;

  ws.mergeCells(row, 1, row, COLUMNS.length);
  const subtitleCell = ws.getCell(row, 1);
  subtitleCell.value = `${rows.length} benchmark records · generated ${new Date().toLocaleString()}`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  row += 2;

  // Header row
  const headerRow = row;
  COLUMNS.forEach((c, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };

    // Use metric color if specified, otherwise default header color
    const fillColor = c.metricColor ? lightTint(c.metricColor, 0.7) : HEADER_FILL;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = ALL_BORDERS;
  });
  ws.getRow(headerRow).height = 20;
  row += 1;

  // Data rows
  rows.forEach((joinedRow, rowIdx) => {
    const isAlt = rowIdx % 2 === 1;
    COLUMNS.forEach((c, colIdx) => {
      const cell = ws.getCell(row, colIdx + 1);
      const rawValue = c.get(joinedRow);

      // Apply formatting if available
      let displayValue: string | number = rawValue;
      if (c.format && typeof rawValue === "number") {
        displayValue = c.format(rawValue);
      } else if (c.format && rawValue === "") {
        displayValue = c.format(null);
      }

      cell.value = displayValue;
      cell.border = ALL_BORDERS;
      cell.alignment = { vertical: "top", horizontal: "left" };

      // Apply metric color tint to data cells if metric column
      if (c.metricColor) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightTint(c.metricColor, 0.92) } };
        cell.font = { bold: true };
      } else if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
      }
    });
    row += 1;
  });

  // Add autofilter and freeze panes
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: COLUMNS.length } };
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: headerRow, topLeftCell: `C${headerRow + 1}` }];

  await downloadWorkbook(workbook, `intel-ai-benchmarks-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
