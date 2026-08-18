/** "Agent-Model-Serving" sheet — per-model rollup (agents covered, total concurrency, silicon
 *  units/sockets/systems by silicon type) aggregated live via SUMIFS/COUNTIFS over the Agent Task
 *  Sizing sheet, so it always reflects whatever's on that sheet without re-deriving anything. */

import type ExcelJS from "exceljs";
import {
  buildAgentModelServingRows, socketsForSiliconUnits, systemsForSiliconUnits, cardsForSiliconUnits,
  SILICON_OPTIONS,
} from "@/modules/workflows/task-sizing-calcs";
import { models as modelCatalog } from "@/modules/models/data";
import type { TaskModelDefault } from "@/modules/models/data";
import type { BusinessProcess } from "../types";
import { sheetRef, ceilTo, ceil, colLetter } from "./formula-sheet";
import { styleTitle, styleSubtitle, styleHeader, styleCell, NUMFMT } from "./xlsx-style";
import { SHEET } from "./sheetNames";
import type { AgentTaskSizingRowRef } from "./agentTaskSizing";

/** One 3-column (Units/Sockets/Systems) block per SILICON_OPTIONS entry, in that exact order —
 *  keeps the header labels and the write loop below from ever drifting apart. */
const SILICON_BLOCK_LABEL: Record<string, string> = {
  "32c*6737P": "32c*6737P", "64c*6767P": "64c*6767P", "B70x2": "B70x2", "CRIx1": "CRIx1",
};

export function buildAgentModelServingSheet(
  ws: ExcelJS.Worksheet,
  businessProcesses: BusinessProcess[],
  defaultsByTaskType: Record<string, TaskModelDefault>,
  taskSizingRows: AgentTaskSizingRowRef[],
): void {
  const widths = [26, 10, 14, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 10, 10];
  widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Agent-Model-Serving";
  row += 1;
  ws.mergeCells(row, 1, row, 20);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    "Aggregated live from the Agent Task Sizing sheet (SUMIFS/COUNTIFS by Model) — one row per model actually " +
    "assigned to an agent there. Units/Sockets/Systems are broken out per silicon type since a model's agents can " +
    "use different task types (and therefore different default silicon).";
  ws.getRow(row).height = 30;
  row += 2;

  const headerRow = row;
  const headers = [
    "Model", "Agents", "Total Concurrency",
    ...SILICON_OPTIONS.flatMap(sil => [`Units — ${SILICON_BLOCK_LABEL[sil]}`, `Sockets — ${SILICON_BLOCK_LABEL[sil]}`, `Systems — ${SILICON_BLOCK_LABEL[sil]}`]),
    "Total Units", "Total Sockets", "Total Systems", "B70 Cards", "CRI Cards",
  ];
  headers.forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  const { rows: aggRows } = buildAgentModelServingRows(businessProcesses, defaultsByTaskType);

  if (taskSizingRows.length === 0 || aggRows.length === 0) {
    ws.getCell(row, 1).value = "No agents with a model assigned yet.";
    ws.views = [{ state: "frozen", ySplit: headerRow }];
    return;
  }

  const firstRow = Math.min(...taskSizingRows.map(r => r.row));
  const lastRow = Math.max(...taskSizingRows.map(r => r.row));
  const modelRange = sheetRef(SHEET.agentTaskSizing, `$D$${firstRow}:$D$${lastRow}`);
  const concurrencyRange = sheetRef(SHEET.agentTaskSizing, `$M$${firstRow}:$M$${lastRow}`);
  const siliconRange = sheetRef(SHEET.agentTaskSizing, `$O$${firstRow}:$O$${lastRow}`);
  const unitsRange = sheetRef(SHEET.agentTaskSizing, `$Q$${firstRow}:$Q$${lastRow}`);

  const CRI_INDEX = SILICON_OPTIONS.indexOf("CRIx1");
  const B70_INDEX = SILICON_OPTIONS.indexOf("B70x2");

  for (const agg of aggRows) {
    const modelName = modelCatalog.find(m => m.hfId === agg.modelHfId)?.name ?? agg.modelHfId;
    const modelCell = ws.getCell(row, 1);
    modelCell.value = modelName;
    styleCell(modelCell, "label");

    const agentsCell = ws.getCell(row, 2);
    agentsCell.value = { formula: `COUNTIFS(${modelRange},$A${row})`, result: agg.agentCount };
    styleCell(agentsCell, "computed", NUMFMT.int);

    const concurrencyCell = ws.getCell(row, 3);
    concurrencyCell.value = { formula: `SUMIFS(${concurrencyRange},${modelRange},$A${row})`, result: agg.totalConcurrency };
    styleCell(concurrencyCell, "computed", NUMFMT.int);

    const unitsAddrs: string[] = [];
    const socketsAddrs: string[] = [];
    const systemsAddrs: string[] = [];

    SILICON_OPTIONS.forEach((silicon, idx) => {
      const col = 4 + idx * 3;
      const units = agg.unitsBySilicon[silicon] ?? 0;
      const unitsCell = ws.getCell(row, col);
      unitsCell.value = { formula: `SUMIFS(${unitsRange},${modelRange},$A${row},${siliconRange},"${silicon}")`, result: units };
      styleCell(unitsCell, "computed", NUMFMT.int);
      const unitsAddr = `${colLetter(col - 1)}${row}`;
      unitsAddrs.push(unitsAddr);

      const socketsCell = ws.getCell(row, col + 1);
      const systemsCell = ws.getCell(row, col + 2);
      if (silicon === "CRIx1") {
        socketsCell.value = { formula: `IF(${unitsAddr}=0,0,${ceilTo(`${unitsAddr}/4`, 1)}*4/2)`, result: socketsForSiliconUnits(silicon, units) };
        systemsCell.value = { formula: `IF(${unitsAddr}=0,0,${ceilTo(`${unitsAddr}/4`, 1)})`, result: systemsForSiliconUnits(silicon, units) };
      } else if (silicon === "B70x2") {
        const formula = `IF(${unitsAddr}=0,0,${ceilTo(`${unitsAddr}*2/4`, 1)})`;
        socketsCell.value = { formula, result: socketsForSiliconUnits(silicon, units) };
        systemsCell.value = { formula, result: systemsForSiliconUnits(silicon, units) };
      } else {
        socketsCell.value = { formula: unitsAddr, result: socketsForSiliconUnits(silicon, units) };
        systemsCell.value = { formula: ceil(`${unitsAddr}/2`), result: systemsForSiliconUnits(silicon, units) };
      }
      styleCell(socketsCell, "computed", NUMFMT.int);
      styleCell(systemsCell, "computed", NUMFMT.int);
      socketsAddrs.push(`${colLetter(col)}${row}`);
      systemsAddrs.push(`${colLetter(col + 1)}${row}`);
    });

    const totalUnitsCol = 4 + SILICON_OPTIONS.length * 3;
    const totalUnitsCell = ws.getCell(row, totalUnitsCol);
    totalUnitsCell.value = { formula: unitsAddrs.join("+"), result: agg.totalUnits };
    styleCell(totalUnitsCell, "computed", NUMFMT.int);

    const totalSockets = SILICON_OPTIONS.reduce((sum, sil) => sum + socketsForSiliconUnits(sil, agg.unitsBySilicon[sil] ?? 0), 0);
    const totalSocketsCell = ws.getCell(row, totalUnitsCol + 1);
    totalSocketsCell.value = { formula: socketsAddrs.join("+"), result: totalSockets };
    styleCell(totalSocketsCell, "computed", NUMFMT.int);

    const totalSystemsCell = ws.getCell(row, totalUnitsCol + 2);
    totalSystemsCell.value = { formula: systemsAddrs.join("+"), result: agg.systemsToDeploy };
    styleCell(totalSystemsCell, "computed", NUMFMT.int);

    const b70CardsCell = ws.getCell(row, totalUnitsCol + 3);
    b70CardsCell.value = { formula: `${unitsAddrs[B70_INDEX]}*2`, result: cardsForSiliconUnits("B70x2", agg.unitsBySilicon["B70x2"] ?? 0) };
    styleCell(b70CardsCell, "computed", NUMFMT.int);

    const criCardsCell = ws.getCell(row, totalUnitsCol + 4);
    criCardsCell.value = { formula: unitsAddrs[CRI_INDEX], result: cardsForSiliconUnits("CRIx1", agg.unitsBySilicon["CRIx1"] ?? 0) };
    styleCell(criCardsCell, "computed", NUMFMT.int);

    row += 1;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow }];
}
