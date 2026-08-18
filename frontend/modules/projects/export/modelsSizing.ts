/** "Embedding-ReRanking-Security" sheet — the Models > Sizing tab's request-volume based sizing,
 *  one row per Model-Defaults entry whose model is selected for deployment sizing. Model, Latency,
 *  Requests/day, Processing window, Silicon and Unit Concurrency are direct cell links into
 *  Model-Defaults (same task-type row); Requests/sec through CRI Cards are live formulas mirroring
 *  computeRequestVolumeRow(). */

import type ExcelJS from "exceljs";
import { computeRequestVolumeRow } from "@/modules/workflows/task-sizing-calcs";
import type { TaskModelDefault } from "@/modules/models/data";
import { SYSTEM_POWER_KW } from "../summary";
import { cellAddr, sheetRef, ceil, iff, eq } from "./formula-sheet";
import { styleTitle, styleSubtitle, styleHeader, styleCell, NUMFMT } from "./xlsx-style";
import { SHEET } from "./sheetNames";
import type { ModelDefaultsLayout } from "./modelDefaults";

/** Nested-IF port of a Silicon-cell -> SYSTEM_POWER_KW lookup, for the System Power (kW) column. */
function systemPowerFormula(siliconAddr: string): string {
  const entries = Object.entries(SYSTEM_POWER_KW);
  return entries.reduceRight((elseExpr, [silicon, kw]) => iff(eq(siliconAddr, silicon), String(kw), elseExpr), "0");
}

export function buildEmbeddingRerankingSecuritySheet(
  ws: ExcelJS.Worksheet,
  requestVolumeDefaults: TaskModelDefault[],
  modelDefaultsLayout: ModelDefaultsLayout,
): void {
  const widths = [18, 24, 12, 14, 16, 14, 13, 14, 13, 13, 11, 11, 9, 9, 15];
  widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Embedding, Re-Ranking, Security";
  row += 1;
  ws.mergeCells(row, 1, row, 15);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    "Model, Latency, Requests/day, Processing window, Silicon and Unit Concurrency link directly to this task " +
    "type's row on Model-Defaults. Requests/sec, Concurrency, Silicon Units, Systems, Sockets, B70 and CRI are " +
    "live formulas — the same math as computeRequestVolumeRow() in the app.";
  ws.getRow(row).height = 30;
  row += 2;

  const headerRow = row;
  const headers = [
    "Task-Type", "Model", "Latency (s)", "Requests/day", "Processing window (hrs)", "Requests/sec",
    "Concurrency", "Silicon", "Unit Concurrency", "Silicon Units", "Systems", "Sockets", "B70", "CRI",
    "System Power (kW)",
  ];
  headers.forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  if (requestVolumeDefaults.length === 0) {
    ws.getCell(row, 1).value = "No models selected for deployment sizing yet.";
    ws.views = [{ state: "frozen", ySplit: headerRow }];
    return;
  }

  for (const def of requestVolumeDefaults) {
    const computed = computeRequestVolumeRow(def);
    const mdRow = modelDefaultsLayout.rowByTaskType[def.task_type];

    const taskTypeCell = ws.getCell(row, 1);
    taskTypeCell.value = def.task_type;
    styleCell(taskTypeCell, "label");

    const modelCell = ws.getCell(row, 2);
    const latencyCell = ws.getCell(row, 3);
    const requestsCell = ws.getCell(row, 4);
    const windowCell = ws.getCell(row, 5);
    const siliconCell = ws.getCell(row, 8);
    const unitConcurrencyCell = ws.getCell(row, 9);

    if (mdRow) {
      modelCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 1)), result: def.model_name };
      latencyCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 2)), result: def.latency_sec ?? "" };
      requestsCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 5)), result: def.requests_per_day ?? "" };
      windowCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 6)), result: def.processing_window_hrs ?? "" };
      siliconCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 3)), result: def.silicon ?? "" };
      unitConcurrencyCell.value = { formula: sheetRef(SHEET.modelDefaults, cellAddr(mdRow, 4)), result: def.default_concurrency ?? "" };
    } else {
      modelCell.value = def.model_name;
      latencyCell.value = def.latency_sec ?? "";
      requestsCell.value = def.requests_per_day ?? "";
      windowCell.value = def.processing_window_hrs ?? "";
      siliconCell.value = def.silicon ?? "";
      unitConcurrencyCell.value = def.default_concurrency ?? "";
    }
    styleCell(modelCell, "linked");
    styleCell(latencyCell, "linked", NUMFMT.dec2);
    styleCell(requestsCell, "linked", NUMFMT.int);
    styleCell(windowCell, "linked", NUMFMT.dec2);
    styleCell(siliconCell, "linked");
    styleCell(unitConcurrencyCell, "linked", NUMFMT.int);

    const latencyAddr = cellAddr(row, 2);
    const requestsAddr = cellAddr(row, 3);
    const windowAddr = cellAddr(row, 4);
    const siliconAddr = cellAddr(row, 7);
    const unitConcurrencyAddr = cellAddr(row, 8);

    const requestsPerSecCell = ws.getCell(row, 6);
    requestsPerSecCell.value = {
      formula: `IF(AND(${requestsAddr}<>"",${windowAddr}<>"",${windowAddr}>0),${requestsAddr}/(${windowAddr}*3600),"")`,
      result: computed.requestsPerSec ?? "",
    };
    styleCell(requestsPerSecCell, "computed", NUMFMT.dec2);
    const requestsPerSecAddr = cellAddr(row, 5);

    const concurrencyCell = ws.getCell(row, 7);
    concurrencyCell.value = {
      formula: `IF(AND(${requestsPerSecAddr}<>"",${latencyAddr}<>""),ROUNDUP(${requestsPerSecAddr}*${latencyAddr},0),"")`,
      result: computed.concurrency ?? "",
    };
    styleCell(concurrencyCell, "computed", NUMFMT.int);
    const concurrencyAddr = cellAddr(row, 6);

    const siliconUnitsCell = ws.getCell(row, 10);
    siliconUnitsCell.value = {
      formula: `IF(AND(${concurrencyAddr}<>"",${unitConcurrencyAddr}>0),ROUNDUP(${concurrencyAddr}/${unitConcurrencyAddr},0),"")`,
      result: computed.siliconUnits ?? "",
    };
    styleCell(siliconUnitsCell, "computed", NUMFMT.int);
    const siliconUnitsAddr = cellAddr(row, 9);

    const systemsCell = ws.getCell(row, 11);
    const socketsCell = ws.getCell(row, 12);
    systemsCell.value = {
      formula: iff(
        `${siliconUnitsAddr}=""`,
        `""`,
        iff(eq(siliconAddr, "CRIx1"), ceil(`${siliconUnitsAddr}/4`), iff(eq(siliconAddr, "B70x2"), ceil(`${siliconUnitsAddr}*2/4`), ceil(`${siliconUnitsAddr}/2`))),
      ),
      result: computed.systems ?? "",
    };
    styleCell(systemsCell, "computed", NUMFMT.int);
    socketsCell.value = {
      formula: iff(
        `${siliconUnitsAddr}=""`,
        `""`,
        iff(eq(siliconAddr, "CRIx1"), `${ceil(`${siliconUnitsAddr}/4`)}*2`, iff(eq(siliconAddr, "B70x2"), ceil(`${siliconUnitsAddr}*2/4`), siliconUnitsAddr)),
      ),
      result: computed.sockets ?? "",
    };
    styleCell(socketsCell, "computed", NUMFMT.int);

    const b70Cell = ws.getCell(row, 13);
    b70Cell.value = { formula: iff(eq(siliconAddr, "B70x2"), `${siliconUnitsAddr}*2`, "0"), result: computed.b70Cards };
    styleCell(b70Cell, "computed", NUMFMT.int);
    const criCell = ws.getCell(row, 14);
    criCell.value = { formula: iff(eq(siliconAddr, "CRIx1"), siliconUnitsAddr, "0"), result: computed.criCards };
    styleCell(criCell, "computed", NUMFMT.int);

    const systemsAddr = cellAddr(row, 10);
    const powerCell = ws.getCell(row, 15);
    powerCell.value = {
      formula: iff(`${systemsAddr}=""`, "0", `${systemsAddr}*(${systemPowerFormula(siliconAddr)})`),
      result: (computed.systems ?? 0) * (computed.row.silicon ? SYSTEM_POWER_KW[computed.row.silicon] ?? 0 : 0),
    };
    styleCell(powerCell, "computed", NUMFMT.dec2);

    row += 1;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow }];
}
