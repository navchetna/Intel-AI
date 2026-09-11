/** Exports every number behind Model → Deep Analysis → Analysis to a formatted .xlsx workbook —
 *  one tidy (long-format, pivot-table-ready) sheet per stage, covering the current configuration
 *  plus every saved what-if combination, across the full concurrency sweep. Same ExcelJS
 *  conventions as modules/silicon/comparison-export.ts. */

import ExcelJS from "exceljs";
import { COMPARISON_CHIPS } from "@/modules/silicon/comparison-data";
import {
  INTERCONNECTS, calcAnalysisSweep,
  getSiliconPeak, getSiliconMemoryBandwidthGBs, getSiliconMemoryCapacityGB,
  type ModelArchitecture, type UsecaseInputs, type TpConfig, type DeltaNetPrefillConfig, type KvCacheConfig,
} from "./deep-analysis-data";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";
const thin: ExcelJS.Border = { style: "thin", color: { argb: BORDER_COLOR } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

export interface ExportScenario {
  name: string;
  siliconId: string;
  tpDegree: number;
  interconnectId: string;
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

function writeTidyTable(ws: ExcelJS.Worksheet, headerRow: number, headers: string[], rows: (string | number)[][], widths: number[]) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = ALL_BORDERS;
  });
  ws.getRow(headerRow).height = 18;

  rows.forEach((values, i) => {
    const r = headerRow + 1 + i;
    values.forEach((v, c) => {
      const cell = ws.getCell(r, c + 1);
      cell.value = v;
      cell.border = ALL_BORDERS;
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
    });
  });

  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: headers.length } };
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

function resolveScenario(s: ExportScenario) {
  const chip = COMPARISON_CHIPS.find(c => c.id === s.siliconId);
  const link = INTERCONNECTS.find(i => i.id === s.interconnectId);
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBW = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  const vram = chip ? getSiliconMemoryCapacityGB(chip) : null;
  return { chip, link, peak, memBW, vram };
}

export async function exportDeepAnalysisToExcel(
  arch: ModelArchitecture, usecase: UsecaseInputs, deltaCfg: DeltaNetPrefillConfig, kv: KvCacheConfig,
  baseTp: TpConfig, scenarios: ExportScenario[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI Deep Analysis";
  workbook.created = new Date();

  // ── Overview: model/use-case constants + one row per scenario's full spec ──────────────
  const overview = workbook.addWorksheet("Overview");
  let row = addTitle(overview, "Deep Analysis — Export", `${arch.name} · generated ${new Date().toLocaleString()}`, 8);

  overview.getCell(row, 1).value = "Model";
  overview.getCell(row, 2).value = arch.name;
  overview.getCell(row + 1, 1).value = "Source";
  overview.getCell(row + 1, 2).value = arch.sourceUrl;
  overview.getCell(row + 2, 1).value = "Total params (B)";
  overview.getCell(row + 2, 2).value = arch.totalParamsB;
  overview.getCell(row + 3, 1).value = "Active params (B)";
  overview.getCell(row + 3, 2).value = arch.activeParamsB ?? arch.totalParamsB;
  overview.getCell(row + 4, 1).value = "Concurrency (baseline)";
  overview.getCell(row + 4, 2).value = usecase.concurrency;
  overview.getCell(row + 5, 1).value = "Input tokens";
  overview.getCell(row + 5, 2).value = usecase.inputTokens;
  overview.getCell(row + 6, 1).value = "Output tokens";
  overview.getCell(row + 6, 2).value = usecase.outputTokens;
  overview.getCell(row + 7, 1).value = "Decode context length";
  overview.getCell(row + 7, 2).value = usecase.decodeContextLen;
  overview.getCell(row + 8, 1).value = "Weight dtype bytes";
  overview.getCell(row + 8, 2).value = usecase.weightDtypeBytes;
  overview.getCell(row + 9, 1).value = "KV dtype bytes";
  overview.getCell(row + 9, 2).value = usecase.kvDtypeBytes;
  overview.getCell(row + 10, 1).value = "Achieved compute MFU";
  overview.getCell(row + 10, 2).value = usecase.gemmMfu;
  overview.getCell(row + 11, 1).value = "Comm efficiency";
  overview.getCell(row + 11, 2).value = usecase.commEfficiency;
  for (let i = 0; i <= 11; i++) overview.getCell(row + i, 1).font = { bold: true };
  row += 13;

  const scenarioHeaders = [
    "Scenario", "Silicon", "TP degree", "Interconnect", "Interconnect BW (GB/s)",
    "Memory type", "Memory BW", "Memory capacity", "Peak TFLOPS (datatype)",
  ];
  const scenarioRows = scenarios.map(s => {
    const { chip, link, peak } = resolveScenario(s);
    return [
      s.name, chip?.name ?? s.siliconId, s.tpDegree, link?.name ?? s.interconnectId, link?.linkBwGBs ?? "—",
      chip?.memory.type ?? "—", chip?.memory.bandwidth ?? "—", chip?.memory.capacity ?? "—",
      peak ? `${peak.raw} (${peak.dataType})` : "—",
    ];
  });
  writeTidyTable(overview, row, scenarioHeaders, scenarioRows, [14, 20, 10, 22, 16, 20, 18, 16, 24]);

  // ── One tidy sheet per stage — Scenario × Concurrency rows ─────────────────────────────
  const prefillRows: (string | number)[][] = [];
  const decodeRows: (string | number)[][] = [];
  const kvRows: (string | number)[][] = [];

  for (const s of scenarios) {
    const { peak, memBW, link, vram } = resolveScenario(s);
    const tp: TpConfig = { tpDegree: s.tpDegree, interconnectId: s.interconnectId, collectiveOpsPerLayer: baseTp.collectiveOpsPerLayer, activationDtypeBytes: baseTp.activationDtypeBytes };
    const sweep = calcAnalysisSweep(arch, usecase, tp, deltaCfg, kv, peak?.teraflops ?? null, memBW, link?.linkBwGBs ?? null, vram);

    for (const p of sweep) {
      prefillRows.push([
        s.name, p.concurrency,
        p.prefill.computeSub?.ffnMs ?? 0, p.prefill.computeSub?.attentionMs ?? 0, p.prefill.computeSub?.deltaNetMs ?? 0,
        p.prefill.computeMs, p.prefill.memoryMs, p.prefill.interconnectMs, p.prefill.totalMs,
      ]);
      decodeRows.push([s.name, p.concurrency, p.decode.memoryMs, p.decode.computeMs, p.decode.interconnectMs, p.decode.totalMs]);
      kvRows.push([
        s.name, p.concurrency, p.kvCache.overCapacity ? "Yes" : "No",
        p.kvCache.recomputeMs ?? "", p.kvCache.fastestReadBackMs ?? "", p.kvCache.fastestMedium ?? "", p.kvCache.totalMs,
      ]);
    }
  }

  const prefillSheet = workbook.addWorksheet("Prefill");
  const prefillHeaderRow = addTitle(prefillSheet, "Prefill — raw values", "One row per (scenario, concurrency). All times in ms.", 9);
  writeTidyTable(
    prefillSheet, prefillHeaderRow,
    ["Scenario", "Concurrency", "FFN (ms)", "Attention (ms)", "DeltaNet (ms)", "Compute total (ms)", "Memory (ms)", "Interconnect (ms)", "Total (ms)"],
    prefillRows, [16, 12, 12, 12, 12, 16, 12, 14, 12],
  );

  const decodeSheet = workbook.addWorksheet("Decode");
  const decodeHeaderRow = addTitle(decodeSheet, "Decode — raw values", "One row per (scenario, concurrency). Totals are the full decode phase (per-token time × output tokens), all in ms.", 6);
  writeTidyTable(
    decodeSheet, decodeHeaderRow,
    ["Scenario", "Concurrency", "Memory (ms)", "Compute (ms)", "Interconnect (ms)", "Total decode-phase (ms)"],
    decodeRows, [16, 12, 14, 14, 14, 20],
  );

  const kvSheet = workbook.addWorksheet("KV-Offload");
  const kvHeaderRow = addTitle(kvSheet, "KV-Offload — raw values", "One row per (scenario, concurrency). 0 / \"No\" below the capacity line — no eviction is needed there.", 7);
  writeTidyTable(
    kvSheet, kvHeaderRow,
    ["Scenario", "Concurrency", "Over capacity?", "Recompute (ms)", "Fastest read-back (ms)", "Fastest medium", "Total realistic (ms)"],
    kvRows, [16, 12, 14, 16, 18, 14, 18],
  );

  await downloadWorkbook(workbook, `deep-analysis-${arch.id}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
