/** Exports the Systems page — per-system spec/components/power-budget detail, and a cross-OEM
 *  compare sheet — to a formatted .xlsx workbook. */

import ExcelJS from "exceljs";
import { type OemSystem, type SystemGpuId, SYSTEM_GPU_OPTIONS, scenariosForGpu } from "./oem-systems-data";

const HEADER_FILL = "FF1E3A5F";
const HEADER_FONT = "FFFFFFFF";
const BORDER_COLOR = "FFB8C4D0";
const ALT_ROW_FILL = "FFF3F6FA";

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

function writeRow(ws: ExcelJS.Worksheet, row: number, values: (string | number)[], isAlt: boolean, boldCols: number[] = []) {
  values.forEach((v, i) => {
    const cell = ws.getCell(row, i + 1);
    cell.value = v;
    cell.border = ALL_BORDERS;
    cell.alignment = { vertical: "top", wrapText: true };
    if (boldCols.includes(i)) cell.font = { bold: true };
    if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_ROW_FILL } };
  });
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

function gpuLabel(gpuId: SystemGpuId): string {
  return SYSTEM_GPU_OPTIONS.find(g => g.id === gpuId)?.label ?? gpuId;
}

function safeSheetName(name: string): string {
  // Excel sheet names: no \/?*[]: and max 31 chars.
  return name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
}

/** Truncates `base` to a valid, workbook-unique Excel sheet name, registering it in `usedNames`.
 *  Reserves room for the disambiguating " (2)" / " (3)" / … suffix up front — appending a suffix
 *  to an already-31-char name and re-truncating (the previous approach) silently drops the
 *  suffix back off the end, so a base longer than 31 chars (e.g. "Dell PowerEdge XE9780 - NVIDIA
 *  HGX B300" vs. "...B200", both from the one chassis that carries two GPUs) collided on an
 *  identical truncated prefix and looped forever without ever producing a unique name, hanging
 *  the export. */
function uniqueSheetName(usedNames: Set<string>, base: string): string {
  const cleaned = base.replace(/[\\/?*[\]:]/g, "-");
  let name = cleaned.slice(0, 31);
  let suffix = 2;
  while (usedNames.has(name)) {
    const tag = ` (${suffix++})`;
    name = cleaned.slice(0, 31 - tag.length) + tag;
  }
  usedNames.add(name);
  return name;
}

function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

// ── Per-system sheets ─────────────────────────────────────────────────────────

function buildSpecSheet(ws: ExcelJS.Worksheet, system: OemSystem) {
  const widths = [20, 26, 60];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(ws, `${system.oem} ${system.model} — System Spec`, system.positioning, widths.length);
  styleHeaderRow(ws, headerRow, ["Section", "Parameter", "Value"]);

  let row = headerRow + 1;
  let alt = false;
  for (const section of system.specSections) {
    for (const r of section.rows) {
      writeRow(ws, row, [section.section, r.label, r.value], alt, [0, 1]);
      row += 1;
      alt = !alt;
    }
  }
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

function buildComponentsSheet(ws: ExcelJS.Worksheet, system: OemSystem) {
  const widths = [16, 34, 18, 10, 34];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(ws, `${system.oem} ${system.model} — Components`, "Part/feature codes as published. Confirm in OEM configurator.", widths.length);
  styleHeaderRow(ws, headerRow, ["Subsystem", "Component", "Part/feature code", "Max qty", "Spec / note"]);

  let row = headerRow + 1;
  system.components.forEach((c, i) => {
    writeRow(ws, row, [c.subsystem, c.component, c.partCode ?? "—", c.maxQty ?? "—", [c.spec, c.note].filter(Boolean).join(" — ") || "—"], i % 2 === 1, [0]);
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

function buildPowerBudgetSheet(ws: ExcelJS.Worksheet, system: OemSystem, gpuId: SystemGpuId) {
  const scenarios = scenariosForGpu(system, gpuId);
  const widths = [30, ...scenarios.map(() => 34)];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(
    ws, `${system.oem} ${system.model} — Node Power Budget (${gpuLabel(gpuId)})`,
    `Planning ceiling at nameplate power, not a measured draw. Generated ${new Date().toLocaleString()}.`,
    widths.length,
  );
  if (scenarios.length === 0) {
    styleHeaderRow(ws, headerRow, ["No published power scenario for this GPU on this system"]);
    return;
  }
  styleHeaderRow(ws, headerRow, ["Node power budget", ...scenarios.map(s => s.name)]);

  const rows: { label: string; render: (s: PowerScenarioLike) => string }[] = [
    { label: "GPUs installed", render: s => `${s.gpus} × ${s.gpuW} W` },
    { label: "CPUs", render: s => `${s.cpuCount} × ${s.cpuTdpW} W TDP` },
    { label: "PSU", render: s => s.psuRatingW ? `${s.psuInstalled} × ${fmtNum(s.psuRatingW)} W (${s.psuRedundant} redundant)` : "Not published" },
    { label: "Component subtotal (W)", render: s => fmtNum(s.componentSubtotalW) },
    { label: "Fans / VR / conversion (W)", render: s => fmtNum(s.fansVrW) },
    { label: "Est. max DC load (W)", render: s => fmtNum(s.estMaxDcLoadW) },
    { label: "GPU share of DC load (%)", render: s => fmtNum(s.gpuShareOfDcPct) },
    { label: "Est. max AC input (W)", render: s => fmtNum(s.estMaxAcInputW) },
    { label: "PSU output, redundant mode (W)", render: s => s.psuRedundantOutputW != null ? fmtNum(s.psuRedundantOutputW) : "n/a" },
    { label: "Headroom, redundant (W)", render: s => s.headroomW != null ? fmtNum(s.headroomW) : "n/a" },
    { label: "PSU utilization, redundant (%)", render: s => s.psuUtilizationPct != null ? fmtNum(s.psuUtilizationPct) : "n/a" },
    { label: "Redundancy check", render: s => s.redundancyStatus },
    { label: "Heat load (BTU/hr)", render: s => fmtNum(s.heatLoadBtuHr) },
    { label: "AC power per GPU (kW)", render: s => s.acPerGpuKw.toFixed(2) },
    { label: "Nodes/rack (power limited)", render: s => `${s.nodesPerRackPower}` },
    { label: "Nodes/rack (space limited)", render: s => `${s.nodesPerRackSpace}` },
    { label: "Nodes per rack", render: s => `${s.nodesPerRack}` },
    { label: "GPUs per rack", render: s => `${s.gpusPerRack}` },
    { label: "Rack AC load at that fit (kW)", render: s => s.rackAcLoadKw.toFixed(1) },
  ];

  let row = headerRow + 1;
  rows.forEach((r, i) => {
    writeRow(ws, row, [r.label, ...scenarios.map(s => r.render(s))], i % 2 === 1, [0]);
    row += 1;
  });
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow }];
}

function buildOpenQuestionsSheet(ws: ExcelJS.Worksheet, system: OemSystem) {
  const widths = [40, 40, 34];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(ws, `${system.oem} ${system.model} — Open Questions`, "Items to confirm before a bid.", widths.length);
  styleHeaderRow(ws, headerRow, ["Item", "Why it matters", "Resolve by"]);

  let row = headerRow + 1;
  system.openQuestions.forEach((q, i) => {
    writeRow(ws, row, [q.item, q.why, q.resolveBy], i % 2 === 1);
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

function buildSourcesSheet(ws: ExcelJS.Worksheet, system: OemSystem) {
  const widths = [16, 40, 60];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(ws, `${system.oem} ${system.model} — Sources`, system.sourceNote, widths.length);
  styleHeaderRow(ws, headerRow, ["ID", "Source", "URL"]);

  let row = headerRow + 1;
  system.sources.forEach((s, i) => {
    writeRow(ws, row, [s.id, s.label, s.url ?? "—"], i % 2 === 1, [0]);
    row += 1;
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

// ── Compare sheet (cross-OEM, high-level) ────────────────────────────────────

function buildCompareSheet(ws: ExcelJS.Worksheet, systems: OemSystem[], gpuId: SystemGpuId) {
  const widths = [26, ...systems.map(() => 30)];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  const headerRow = addTitle(
    ws, `OEM Systems Compare — ${gpuLabel(gpuId)}`,
    `Best-fit config is each system's densest published scenario for this GPU. Generated ${new Date().toLocaleString()}.`,
    widths.length,
  );
  styleHeaderRow(ws, headerRow, ["System", ...systems.map(s => `${s.oem} ${s.model}`)]);

  function bestScenario(s: OemSystem) {
    const scenarios = scenariosForGpu(s, gpuId);
    return scenarios[scenarios.length - 1] ?? scenarios[0] ?? null;
  }

  const rows: { label: string; render: (s: OemSystem) => string }[] = [
    { label: "OEM", render: s => s.oem },
    { label: "Form factor", render: s => s.formFactor },
    { label: "CPU socket", render: s => s.cpuSocket },
    { label: "Best-fit config", render: s => { const b = bestScenario(s); return b ? `${b.gpus} × ${b.gpuW} W GPU` : "—"; } },
    { label: "Max DC load (best config, W)", render: s => { const b = bestScenario(s); return b ? fmtNum(b.estMaxDcLoadW) : "—"; } },
    { label: "Redundant PSU output (W)", render: s => { const b = bestScenario(s); return b?.psuRedundantOutputW != null ? fmtNum(b.psuRedundantOutputW) : "n/a"; } },
    { label: "Redundancy status", render: s => bestScenario(s)?.redundancyStatus ?? "—" },
    { label: "GPUs per rack (best config)", render: s => `${bestScenario(s)?.gpusPerRack ?? "—"}` },
    { label: "Rack AC load at that fit (kW)", render: s => { const b = bestScenario(s); return b ? b.rackAcLoadKw.toFixed(1) : "—"; } },
  ];

  let row = headerRow + 1;
  rows.forEach((r, i) => {
    writeRow(ws, row, [r.label, ...systems.map(r.render)], i % 2 === 1, [0]);
    row += 1;
  });
  ws.views = [{ state: "frozen", xSplit: 1, ySplit: headerRow }];
}

// Shared shape both the live PowerScenario and any future variant need for the row renderers above.
interface PowerScenarioLike {
  gpus: number; gpuW: number; cpuCount: number; cpuTdpW: number;
  psuRatingW: number; psuInstalled: number; psuRedundant: number;
  componentSubtotalW: number; fansVrW: number; estMaxDcLoadW: number; gpuShareOfDcPct: number;
  estMaxAcInputW: number; psuRedundantOutputW: number | null; headroomW: number | null; psuUtilizationPct: number | null;
  redundancyStatus: string; heatLoadBtuHr: number; acPerGpuKw: number;
  nodesPerRackPower: number; nodesPerRackSpace: number; nodesPerRack: number; gpusPerRack: number; rackAcLoadKw: number;
}

// ── Public entry points ───────────────────────────────────────────────────────

export async function exportOemSystemDetailToExcel(system: OemSystem, gpuId: SystemGpuId): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  buildSpecSheet(workbook.addWorksheet("Spec"), system);
  if (system.components.length > 0) buildComponentsSheet(workbook.addWorksheet("Components"), system);
  buildPowerBudgetSheet(workbook.addWorksheet(safeSheetName("Power Budget")), system, gpuId);
  if (system.openQuestions.length > 0) buildOpenQuestionsSheet(workbook.addWorksheet("Open Questions"), system);
  buildSourcesSheet(workbook.addWorksheet("Sources"), system);

  await downloadWorkbook(workbook, `${system.oem}-${system.model}-${gpuId}.xlsx`.replace(/\s+/g, "-"));
}

export async function exportOemSystemsToExcel(systems: OemSystem[], gpuId: SystemGpuId): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  buildCompareSheet(workbook.addWorksheet("Compare"), systems, gpuId);
  const usedNames = new Set<string>(["Compare"]);
  for (const s of systems) {
    const name = uniqueSheetName(usedNames, `${s.oem} ${s.model}`);
    buildPowerBudgetSheet(workbook.addWorksheet(name), s, gpuId);
  }

  await downloadWorkbook(workbook, `oem-systems-${gpuId}.xlsx`);
}

/** Multi-GPU variant — one Compare sheet per selected GPU (categorized, same shape as the
 *  Systems page's Compare tab when several GPU pills are active), plus one power-budget sheet
 *  per system×GPU pair that actually has a published scenario for that combination. */
export async function exportOemSystemsMultiGpuToExcel(byGpu: { gpuId: SystemGpuId; systems: OemSystem[] }[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intel-AI";
  workbook.created = new Date();

  const usedNames = new Set<string>();

  for (const { gpuId, systems } of byGpu) {
    buildCompareSheet(workbook.addWorksheet(uniqueSheetName(usedNames, `Compare - ${gpuLabel(gpuId)}`)), systems, gpuId);
  }
  for (const { gpuId, systems } of byGpu) {
    for (const s of systems) {
      buildPowerBudgetSheet(workbook.addWorksheet(uniqueSheetName(usedNames, `${s.oem} ${s.model} - ${gpuLabel(gpuId)}`)), s, gpuId);
    }
  }

  const gpuSlugs = byGpu.map(g => g.gpuId).join("_");
  await downloadWorkbook(workbook, `oem-systems-${gpuSlugs}.xlsx`);
}
