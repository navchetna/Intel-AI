/** Exports every number behind Model → Deep Analysis → Analysis to a formatted .xlsx workbook —
 *  one tidy (long-format, pivot-table-ready) sheet per stage, covering the current configuration
 *  plus every saved what-if combination, across the full concurrency sweep. Same ExcelJS
 *  conventions as modules/silicon/comparison-export.ts. */

import ExcelJS from "exceljs";
import { COMPARISON_CHIPS, type ComparisonChip } from "@/modules/silicon/comparison-data";
import {
  INTERCONNECTS, calcAnalysisSweep,
  getSiliconPeak, getSiliconMemoryBandwidthGBs, getSiliconMemoryCapacityGB,
  type ModelArchitecture, type UsecaseInputs, type TpConfig, type DeltaNetPrefillConfig, type KvCacheConfig,
} from "./deep-analysis-data";
import { computeRoutingModel, buildRoutingComputeInputs, type RoutingInputs, type RoutingComputeInputs } from "./RoutingView";

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

function setFormula(cell: ExcelJS.Cell, formula: string, result: number) {
  cell.value = { formula, result } as ExcelJS.CellFormulaValue;
}

/** Formula strings below write short placeholders like `Peff_` for intermediates computed
 *  earlier in the same sheet, instead of hand-tracking cell addresses inline — this resolves
 *  every `name_` token (an identifier immediately followed by `_`) against `refs[name]`, once
 *  that intermediate's own cell has been written and its address recorded in `refs`. */
function substituteRefs(formula: string, refs: Record<string, string>): string {
  return formula.replace(/([A-Za-z][A-Za-z0-9]*)_(?![A-Za-z0-9_])/g, (match, key: string) => refs[key] ?? match);
}

/** Writes one labeled (label | value) input block and records each field's cell address in
 *  `refs`, keyed by the same field name computeRoutingModel's formulas use — so every derived
 *  cell and stage-Time formula written afterwards can reference these by name instead of a
 *  hand-tracked row number. */
function writeRoutingInputBlock(
  ws: ExcelJS.Worksheet, startRow: number, col: number, title: string,
  fields: { key: string; label: string; value: number | boolean }[],
  refs: Record<string, string>,
): number {
  let row = startRow;
  const header = ws.getCell(row, col);
  header.value = title;
  header.font = { bold: true, color: { argb: HEADER_FONT }, size: 10.5 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  ws.mergeCells(row, col, row, col + 1);
  row += 1;
  fields.forEach((f, i) => {
    const labelCell = ws.getCell(row, col);
    labelCell.value = f.label;
    labelCell.border = ALL_BORDERS;
    if (i % 2 === 1) labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
    const valueCell = ws.getCell(row, col + 1);
    valueCell.value = f.value;
    valueCell.font = { bold: true };
    valueCell.border = ALL_BORDERS;
    if (i % 2 === 1) valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
    refs[f.key] = valueCell.address;
    row += 1;
  });
  return row + 1;
}

function resolveScenario(s: ExportScenario) {
  const chip = COMPARISON_CHIPS.find(c => c.id === s.siliconId);
  const link = INTERCONNECTS.find(i => i.id === s.interconnectId);
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBW = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  const vram = chip ? getSiliconMemoryCapacityGB(chip) : null;
  return { chip, link, peak, memBW, vram };
}

/** Builds the Routing sheet as a genuine live spreadsheet: every Model Architecture / Use Case /
 *  Serving / GPU Compute / Host-CPU / CPU-coefficients value sits in its own cell, every derived
 *  intermediate (KV bytes/token, nBlk, Peff, roofline, implied CPU/step, FLOPs, ...) and every
 *  stage's Time and Core-s cell is an Excel formula referencing those cells (not a pasted
 *  number) — so editing an input in the workbook recomputes the whole sheet, the same as editing
 *  it in the app. `model`/`computeInputs` (the JS-computed values) are only used as each
 *  formula's cached `result`, so the sheet displays correct numbers before Excel's first
 *  recalculation; the formula itself is what stays live. */
function buildRoutingSheet(
  workbook: ExcelJS.Workbook, arch: ModelArchitecture, chip: ComparisonChip | undefined,
  computeInputs: RoutingComputeInputs, model: ReturnType<typeof computeRoutingModel>,
) {
  const ws = workbook.addWorksheet("Routing");
  const refs: Record<string, string> = {};
  let row = addTitle(
    ws, "Routing — CPU orchestration (live model)",
    `${arch.name} · ${chip?.name ?? "no compute selected"} · generated ${new Date().toLocaleString()}. `
    + `Every Time/Core-s cell below is a formula — change an input and the sheet recomputes.`, 6,
  );

  // ── inputs, two columns of stacked blocks so the sheet doesn't run too long ──────────────
  const leftStart = row;
  let leftRow = writeRoutingInputBlock(ws, leftStart, 1, "Model Architecture", [
    { key: "pAct", label: "Active parameters, B", value: computeInputs.pAct },
    { key: "wB", label: "Weight bytes/param", value: computeInputs.wB },
    { key: "lTot", label: "Layers, total", value: computeInputs.lTot },
    { key: "lKv", label: "Layers contributing KV", value: computeInputs.lKv },
    { key: "dModel", label: "d_model", value: computeInputs.dModel },
    { key: "kvH", label: "KV heads", value: computeInputs.kvH },
    { key: "hD", label: "Head dim", value: computeInputs.hD },
    { key: "kvB", label: "KV bytes/element", value: computeInputs.kvB },
  ], refs);
  leftRow = writeRoutingInputBlock(ws, leftRow, 1, "Use Case", [
    { key: "isl", label: "Input tokens (ISL)", value: computeInputs.isl },
    { key: "osl", label: "Output tokens (OSL)", value: computeInputs.osl },
    { key: "qps", label: "Request rate, req/s", value: computeInputs.qps },
    { key: "batch", label: "Decode batch (concurrency)", value: computeInputs.batch },
    { key: "bpt", label: "Prompt bytes/token", value: computeInputs.bpt },
  ], refs);
  leftRow = writeRoutingInputBlock(ws, leftRow, 1, "Serving", [
    { key: "blk", label: "KV block size, tokens", value: computeInputs.blk },
    { key: "chunk", label: "Chunked-prefill chunk", value: computeInputs.chunk },
    { key: "hitP", label: "Prefix hit, prefill worker", value: computeInputs.hitP },
    { key: "hitD", label: "Prefix hit, decode worker", value: computeInputs.hitD },
    { key: "nw", label: "Workers scored per request", value: computeInputs.nw },
    { key: "bwXfer", label: "KV transfer rate, MB/s", value: computeInputs.bwXfer },
    { key: "delta", label: "Delta transfer", value: computeInputs.delta },
  ], refs);

  const rightStart = row;
  let rightRow = writeRoutingInputBlock(ws, rightStart, 4, "GPU Compute", [
    { key: "tflops", label: "Prefill TFLOPS, effective", value: computeInputs.tflops },
    { key: "bwMem", label: "VRAM bandwidth, GB/s", value: computeInputs.bwMem },
  ], refs);
  rightRow = writeRoutingInputBlock(ws, rightRow, 4, "Host-CPU", [
    { key: "cores", label: "Cores per node", value: computeInputs.cores },
    { key: "util", label: "Target core utilisation", value: computeInputs.util },
  ], refs);
  rightRow = writeRoutingInputBlock(ws, rightRow, 4, "CPU Coefficients", [
    { key: "stepMeas", label: "Measured decode step, ms", value: computeInputs.stepMeas },
    { key: "cFe", label: "Frontend fixed, ms", value: computeInputs.cFe },
    { key: "cTok", label: "Tokenise, ms/1K tokens", value: computeInputs.cTok },
    { key: "cBlk", label: "Hash + lookup, µs/block", value: computeInputs.cBlk },
    { key: "cScore", label: "Score per worker, µs", value: computeInputs.cScore },
    { key: "cAdmit", label: "Admission, ms/request", value: computeInputs.cAdmit },
    { key: "cHop", label: "Control hop, ms/request", value: computeInputs.cHop },
    { key: "cXfer", label: "Transfer setup, ms", value: computeInputs.cXfer },
    { key: "cDesc", label: "NIXL descriptor, µs/block·layer", value: computeInputs.cDesc },
    { key: "cDetok", label: "Detokenise + SSE, ms/token", value: computeInputs.cDetok },
  ], refs);

  ws.getColumn(1).width = 26; ws.getColumn(2).width = 14; ws.getColumn(3).width = 3;
  ws.getColumn(4).width = 26; ws.getColumn(5).width = 14;

  row = Math.max(leftRow, rightRow) + 1;

  // ── derived intermediates — each a formula over the input cells above ────────────────────
  const derivedHeader = ws.getCell(row, 1);
  derivedHeader.value = "Derived intermediates";
  derivedHeader.font = { bold: true, color: { argb: HEADER_FONT }, size: 10.5 };
  derivedHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  ws.mergeCells(row, 1, row, 5);
  row += 1;

  const R = refs; // shorthand
  const derived: { key: string; label: string; formula: string; result: number }[] = [
    { key: "kvTok", label: "KV bytes/token", formula: `${R.lKv}*2*${R.kvH}*${R.hD}*${R.kvB}`, result: model.kvTok },
    { key: "wBytes", label: "Weight bytes resident", formula: `${R.pAct}*1E9*${R.wB}`, result: model.wBytes },
    { key: "nBlk", label: "⌈ISL/block⌉ (nBlk)", formula: `CEILING(${R.isl}/MAX(1,${R.blk}),1)`, result: model.nBlk },
    { key: "Peff", label: "Effective prefill tokens (Peff)", formula: `${R.isl}*(1-${R.hitP})`, result: model.Peff },
    { key: "nStepsP", label: "Prefill engine steps (nStepsP)", formula: `IF(Peff_>0,CEILING(Peff_/MAX(1,${R.chunk}),1),0)`, result: model.nStepsP },
    { key: "roof", label: "Weight-read roofline, ms", formula: `IF(${R.bwMem}>0,wBytes_/(${R.bwMem}*1E9)*1000,0)`, result: model.roof },
    { key: "kvRead", label: "KV-read roofline, ms", formula: `IF(${R.bwMem}>0,${R.batch}*${R.isl}*kvTok_/(${R.bwMem}*1E9)*1000,0)`, result: model.kvRead },
    { key: "roofFull", label: "Decode roofline (memory-bound), ms", formula: `roof_+kvRead_`, result: model.roofFull },
    { key: "cStep", label: "Implied CPU/step (residual), ms", formula: `MAX(0,${R.stepMeas}-roofFull_)`, result: model.cStep },
    { key: "blkMove", label: "Blocks actually moved", formula: `IF(${R.delta},CEILING(nBlk_*(1-${R.hitD}),1),nBlk_)`, result: model.blkMove },
    { key: "bytesMove", label: "Bytes moved (KV transfer)", formula: `blkMove_*${R.blk}*kvTok_`, result: model.bytesMove },
    { key: "bytesTotal", label: "Bytes total (full KV)", formula: `nBlk_*${R.blk}*kvTok_`, result: model.bytesTotal },
    { key: "flops", label: "Prefill FLOPs", formula: `2*${R.pAct}*1E9*Peff_+2*${R.lKv}*Peff_*${R.isl}*${R.dModel}`, result: model.flops },
    { key: "tPfGpu", label: "Prefill forward, ms", formula: `IF(${R.tflops}>0,flops_/(${R.tflops}*1E12)*1000,0)`, result: model.tPfGpu },
    { key: "tPfCpu", label: "Prefill step overhead, ms", formula: `nStepsP_*cStep_`, result: model.stages.find(s => s.key === "prefillStepOverhead")!.t },
    { key: "tDesc", label: "NIXL descriptor prep, ms", formula: `${R.cDesc}*nBlk_*${R.lTot}/1000`, result: model.stages.find(s => s.key === "nixlDescriptor")!.t },
    { key: "tXfer", label: "KV transfer, ms", formula: `IF(bytesMove_>0,${R.cXfer}+(bytesMove_/1E6/${R.bwXfer})*1000,0)`, result: model.tXfer },
    { key: "tDecGpu", label: "Decode forward, ms", formula: `${R.osl}*roofFull_`, result: model.stages.find(s => s.key === "decodeForward")!.t },
    { key: "tDecCpu", label: "Decode step overhead, ms", formula: `${R.osl}*cStep_`, result: model.stages.find(s => s.key === "decodeStepOverhead")!.t },
    { key: "tDet", label: "Detokenise + SSE, ms", formula: `${R.osl}*${R.cDetok}`, result: model.stages.find(s => s.key === "detokenise")!.t },
  ];

  derived.forEach((d, i) => {
    ws.getCell(row, 1).value = d.label;
    ws.getCell(row, 1).border = ALL_BORDERS;
    const c = ws.getCell(row, 2);
    setFormula(c, substituteRefs(d.formula, refs), d.result);
    c.border = ALL_BORDERS;
    if (i % 2 === 1) { ws.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; }
    refs[d.key] = c.address;
    row += 1;
  });
  row += 1;

  // ── stage table — Time and Core-s are formulas over the input/derived cells above ────────
  const stageHeaderRow = row;
  const stageHeaders = ["Node", "Stage", "Scales with", "Derivation", "Time (ms)", "Core-s (ms)"];
  stageHeaders.forEach((h, i) => {
    const c = ws.getCell(stageHeaderRow, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.border = ALL_BORDERS;
  });
  row += 1;

  type StageFormula = { key: string; timeFormula: string; csKind: "sameAsTime" | "zero" | { refKey: string } };
  const stageFormulas: StageFormula[] = [
    { key: "httpIngress", timeFormula: R.cFe, csKind: "sameAsTime" },
    { key: "tokenise", timeFormula: `${R.cTok}*${R.isl}/1000`, csKind: "sameAsTime" },
    { key: "blockHash", timeFormula: `${R.cBlk}*${R.nBlk}/1000`, csKind: "sameAsTime" },
    { key: "costScore", timeFormula: `${R.cScore}*${R.nw}/1000`, csKind: "sameAsTime" },
    { key: "admitPrefill", timeFormula: R.cAdmit, csKind: "sameAsTime" },
    { key: "prefillForward", timeFormula: R.tPfGpu, csKind: "zero" },
    { key: "prefillStepOverhead", timeFormula: R.tPfCpu, csKind: "sameAsTime" },
    { key: "nixlDescriptor", timeFormula: R.tDesc, csKind: "sameAsTime" },
    { key: "controlHop", timeFormula: R.cHop, csKind: "sameAsTime" },
    { key: "admitDecode", timeFormula: R.cAdmit, csKind: "sameAsTime" },
    { key: "kvTransfer", timeFormula: R.tXfer, csKind: "zero" },
    { key: "schedulerSpin", timeFormula: "0", csKind: { refKey: "kvTransfer" } },
    { key: "decodeForward", timeFormula: R.tDecGpu, csKind: "zero" },
    { key: "decodeStepOverhead", timeFormula: R.tDecCpu, csKind: "sameAsTime" },
    { key: "detokenise", timeFormula: R.tDet, csKind: "sameAsTime" },
  ];
  const timeAddr: Record<string, string> = {};
  const csAddr: Record<string, string> = {};
  let curNode: string | null = null;
  stageFormulas.forEach((sf, i) => {
    const stage = model.stages.find(s => s.key === sf.key)!;
    if (stage.node !== curNode) {
      curNode = stage.node;
      const groupCell = ws.getCell(row, 1);
      groupCell.value = stage.node;
      ws.mergeCells(row, 1, row, 6);
      groupCell.font = { bold: true, size: 9.5 };
      groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE9EEF4" } };
      row += 1;
    }
    ws.getCell(row, 1).value = stage.node;
    ws.getCell(row, 2).value = stage.name;
    ws.getCell(row, 3).value = stage.unit;
    ws.getCell(row, 4).value = stage.form;
    const timeCell = ws.getCell(row, 5);
    setFormula(timeCell, sf.timeFormula, stage.t);
    timeAddr[sf.key] = timeCell.address;
    const csCell = ws.getCell(row, 6);
    const csFormula = sf.csKind === "sameAsTime" ? `${timeCell.address}/1000` : sf.csKind === "zero" ? "0" : `${timeAddr[sf.csKind.refKey]}/1000`;
    setFormula(csCell, csFormula, stage.cs);
    csAddr[sf.key] = csCell.address;
    [1, 2, 3, 4, 5, 6].forEach(c => { ws.getCell(row, c).border = ALL_BORDERS; if (i % 2 === 1) ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; });
    row += 1;
  });
  ws.getColumn(2).width = 30; ws.getColumn(3).width = 16; ws.getColumn(4).width = 30; ws.getColumn(5).width = 12; ws.getColumn(6).width = 12;
  row += 1;

  // ── readouts — formulas summing the stage Time cells above ───────────────────────────────
  const readoutHeader = ws.getCell(row, 1);
  readoutHeader.value = "Readouts";
  readoutHeader.font = { bold: true, color: { argb: HEADER_FONT }, size: 10.5 };
  readoutHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  ws.mergeCells(row, 1, row, 2);
  row += 1;

  const ttftFormula = ["httpIngress", "tokenise", "blockHash", "costScore", "admitPrefill", "prefillForward", "prefillStepOverhead", "nixlDescriptor"].map(k => timeAddr[k]).join("+");
  const readouts: { key: string; label: string; formula: string; result: number }[] = [
    { key: "ttft", label: "TTFT (ms)", formula: ttftFormula, result: model.ttft },
    { key: "t2nd", label: "Time to 2nd token (ms)", formula: `ttft_+${timeAddr.controlHop}+${timeAddr.admitDecode}+${timeAddr.kvTransfer}`, result: model.t2nd },
    { key: "total", label: "Total request (ms)", formula: `t2nd_+${timeAddr.decodeForward}+${timeAddr.decodeStepOverhead}`, result: model.total },
    { key: "tCpu", label: "CPU orchestration (ms)", formula: [
      "httpIngress", "tokenise", "blockHash", "costScore", "admitPrefill", "prefillStepOverhead", "nixlDescriptor", "controlHop", "admitDecode", "decodeStepOverhead",
    ].map(k => timeAddr[k]).join("+"), result: model.tCpu },
    { key: "tGpu", label: "GPU execution (ms)", formula: `${timeAddr.prefillForward}+${timeAddr.decodeForward}`, result: model.tGpu },
    { key: "tXferTotal", label: "KV transfer (ms)", formula: timeAddr.kvTransfer, result: model.tXfer },
  ];
  readouts.forEach((r, i) => {
    ws.getCell(row, 1).value = r.label;
    ws.getCell(row, 1).font = { bold: true };
    ws.getCell(row, 1).border = ALL_BORDERS;
    const c = ws.getCell(row, 2);
    setFormula(c, substituteRefs(r.formula, refs), r.result);
    c.border = ALL_BORDERS;
    if (i % 2 === 1) { ws.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; }
    refs[r.key] = c.address;
    row += 1;
  });
  row += 1;

  // ── core-seconds / node sizing — grouped sums of the Core-s cells above ───────────────────
  const nodeGroups: { node: "FE" | "P" | "D"; keys: string[]; dominant: string }[] = [
    { node: "FE", keys: ["httpIngress", "tokenise", "blockHash", "costScore", "detokenise"], dominant: "detokenise + SSE" },
    { node: "P", keys: ["admitPrefill", "prefillStepOverhead", "nixlDescriptor", "controlHop"], dominant: "step overhead + descriptors" },
    { node: "D", keys: ["admitDecode", "schedulerSpin", "decodeStepOverhead"], dominant: "spin during transfer" },
  ];
  const coreHeader = ws.getCell(row, 1);
  coreHeader.value = "Core-seconds and node sizing";
  coreHeader.font = { bold: true, color: { argb: HEADER_FONT }, size: 10.5 };
  coreHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  ws.mergeCells(row, 1, row, 6);
  row += 1;
  ["Node", "Core-s / request (ms)", "Core-s / s at rate", "Cores needed", "% of node", "Dominant term"].forEach((h, i) => {
    const c = ws.getCell(row, i + 1);
    c.value = h; c.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    c.border = ALL_BORDERS;
  });
  row += 1;
  nodeGroups.forEach((g, i) => {
    const csSum = g.keys.map(k => csAddr[k]).join("+");
    const perNode = g.keys.reduce((s, k) => s + model.stages.find(st => st.key === k)!.cs, 0);
    ws.getCell(row, 1).value = g.node === "FE" ? "Frontend" : g.node === "P" ? "Prefill" : "Decode";
    const csCell = ws.getCell(row, 2);
    setFormula(csCell, `(${csSum})*1000`, perNode * 1000);
    const rateCell = ws.getCell(row, 3);
    setFormula(rateCell, `${csCell.address}/1000*${R.qps}`, perNode * computeInputs.qps);
    const needCell = ws.getCell(row, 4);
    setFormula(needCell, `IF(${R.util}>0,${rateCell.address}/${R.util},0)`, computeInputs.util > 0 ? (perNode * computeInputs.qps) / computeInputs.util : 0);
    const pctCell = ws.getCell(row, 5);
    setFormula(pctCell, `IF(${R.cores}>0,${needCell.address}/${R.cores}*100,0)`, computeInputs.cores > 0 ? ((perNode * computeInputs.qps) / Math.max(1e-9, computeInputs.util)) / computeInputs.cores * 100 : 0);
    ws.getCell(row, 6).value = g.dominant;
    [1, 2, 3, 4, 5, 6].forEach(c => { ws.getCell(row, c).border = ALL_BORDERS; if (i % 2 === 1) ws.getCell(row, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; });
    row += 1;
  });
  row += 1;

  // ── capacity gates ─────────────────────────────────────────────────────────────────────
  const gatesHeader = ws.getCell(row, 1);
  gatesHeader.value = "Capacity gates the orchestration imposes";
  gatesHeader.font = { bold: true, color: { argb: HEADER_FONT }, size: 10.5 };
  gatesHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  ws.mergeCells(row, 1, row, 3);
  row += 1;

  const pin = computeInputs.qps * ((model.tPfGpu + model.tXfer) / 1000) * model.bytesTotal;
  const fab = computeInputs.qps * model.bytesMove;
  const dkv = computeInputs.batch * (computeInputs.isl + computeInputs.osl) * model.kvTok;
  const gates: { label: string; formula: string; result: number }[] = [
    { label: "Prefill KV pinned (bytes)", formula: `${R.qps}*((${refs.tPfGpu}+${refs.tXfer})/1000)*${refs.bytesTotal}`, result: pin },
    { label: "Fabric load (bytes/s)", formula: `${R.qps}*${refs.bytesMove}`, result: fab },
    { label: "Decode KV resident (bytes)", formula: `${R.batch}*(${R.isl}+${R.osl})*${refs.kvTok}`, result: dkv },
    { label: "Transfer share of request (%)", formula: `${timeAddr.kvTransfer}/${refs.total}*100`, result: (model.tXfer / (model.total || 1)) * 100 },
    { label: "Stall between token 1 and 2 (ms)", formula: `${refs.t2nd}-${refs.ttft}`, result: model.t2nd - model.ttft },
  ];
  gates.forEach((g, i) => {
    ws.getCell(row, 1).value = g.label;
    ws.getCell(row, 1).border = ALL_BORDERS;
    const c = ws.getCell(row, 2);
    setFormula(c, g.formula, g.result);
    c.border = ALL_BORDERS;
    if (i % 2 === 1) { ws.getCell(row, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } }; }
    row += 1;
  });

  ws.views = [{ state: "frozen", ySplit: 3 }];
}

export async function exportDeepAnalysisToExcel(
  arch: ModelArchitecture, usecase: UsecaseInputs, deltaCfg: DeltaNetPrefillConfig, kv: KvCacheConfig,
  baseTp: TpConfig, scenarios: ExportScenario[],
  routingInputs: RoutingInputs, chip: ComparisonChip | undefined,
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

  const kvSheet = workbook.addWorksheet("KV Pool");
  const kvHeaderRow = addTitle(kvSheet, "KV Pool — raw values", "One row per (scenario, concurrency). 0 / \"No\" below the capacity line — no eviction is needed there.", 7);
  writeTidyTable(
    kvSheet, kvHeaderRow,
    ["Scenario", "Concurrency", "Over capacity?", "Recompute (ms)", "Fastest read-back (ms)", "Fastest medium", "Total realistic (ms)"],
    kvRows, [16, 12, 14, 16, 18, 14, 18],
  );

  // ── Routing: a genuinely live sheet — see buildRoutingSheet's own doc comment. A single
  // operating point (current Use Case + current GPU Compute chip + current Routing inputs), not
  // scenario-swept like the sheets above, since Routing's own inputs (Serving/Host-CPU/CPU
  // coefficients) aren't part of a saved what-if combo. ──────────────────────────────────────
  const routingComputeInputs = buildRoutingComputeInputs(routingInputs, arch, usecase, chip);
  const routingModel = computeRoutingModel(routingComputeInputs);
  buildRoutingSheet(workbook, arch, chip, routingComputeInputs, routingModel);

  await downloadWorkbook(workbook, `deep-analysis-${arch.id}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
