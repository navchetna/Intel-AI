/** "Harness" sheet — one row per selected Agentic-Stack workload. For workloads with a detailed
 *  sizing sheet (Postgres, Qdrant, ...), CPU Cores/RAM are cross-sheet links to that sheet's
 *  Recommended Cores/RAM cells — edit an input there and this sheet's sockets/systems recompute.
 *  Workloads without a calculator show "Sizing not available yet", matching the app. */

import type ExcelJS from "exceljs";
import { allWorkloadIcons } from "@/modules/agentic-ai/layers";
import { SIZING_MAP } from "@/modules/agentic-ai/sizing-wiring";
import { WORKLOAD_CORES_PER_SOCKET, WORKLOAD_SOCKETS_PER_SYSTEM, socketsNeeded, systemsNeeded } from "@/modules/agentic-ai/sizing-calcs";
import { ceil, sheetRef } from "./formula-sheet";
import { styleTitle, styleSubtitle, styleHeader, styleCell, NUMFMT } from "./xlsx-style";

export interface WorkloadSheetRef {
  sheetName: string;
  coresCell: string;
  ramCell: string;
  cores: number;
  ramGB: number;
}

export function buildHarnessSheet(
  ws: ExcelJS.Worksheet,
  selectedWorkloads: string[],
  workloadSheets: Record<string, WorkloadSheetRef>,
): void {
  const widths = [22, 26, 12, 12, 10, 10, 8, 8];
  widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Harness";
  row += 1;
  ws.mergeCells(row, 1, row, 8);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    `CPU Cores and RAM link to each workload's own sizing sheet (its Recommended Cores / Recommended RAM cell). ` +
    `Sockets = CEILING(cores / ${WORKLOAD_CORES_PER_SOCKET}); Systems = CEILING(sockets / ${WORKLOAD_SOCKETS_PER_SYSTEM}) — one socket is a 32c*6730P, two sockets make a system.`;
  ws.getRow(row).height = 28;
  row += 2;

  const headerRow = row;
  ["Workload", "Layer", "CPU Cores", "RAM (GB)", "Systems", "Sockets (32c*6730P)", "B70", "CRI"].forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  const rows = allWorkloadIcons.filter(w => selectedWorkloads.includes(w.icon.alt));

  if (rows.length === 0) {
    ws.getCell(row, 1).value = "No workloads selected yet.";
    ws.views = [{ state: "frozen", ySplit: headerRow }];
    return;
  }

  for (const { icon, layer, subLayer } of rows) {
    const workloadCell = ws.getCell(row, 1);
    workloadCell.value = icon.alt;
    styleCell(workloadCell, "label");
    const layerCell = ws.getCell(row, 2);
    layerCell.value = subLayer ? `${layer.title} · ${subLayer.title}` : layer.title;
    styleCell(layerCell, "computed");

    const tool = SIZING_MAP[icon.alt];
    const sheetRefInfo = tool ? workloadSheets[icon.alt] : undefined;

    if (!sheetRefInfo) {
      ws.mergeCells(row, 3, row, 8);
      const cell = ws.getCell(row, 3);
      cell.value = "Sizing not available yet";
      styleCell(cell, "plain");
      row += 1;
      continue;
    }

    const coresCell = ws.getCell(row, 3);
    coresCell.value = { formula: sheetRef(sheetRefInfo.sheetName, sheetRefInfo.coresCell), result: sheetRefInfo.cores };
    styleCell(coresCell, "linked", NUMFMT.int);
    const coresAddr = `C${row}`;

    const ramCell = ws.getCell(row, 4);
    ramCell.value = { formula: sheetRef(sheetRefInfo.sheetName, sheetRefInfo.ramCell), result: sheetRefInfo.ramGB };
    styleCell(ramCell, "linked", NUMFMT.int);

    const sockets = socketsNeeded(sheetRefInfo.cores);
    const socketsCell = ws.getCell(row, 6);
    socketsCell.value = { formula: ceil(`${coresAddr}/${WORKLOAD_CORES_PER_SOCKET}`), result: sockets };
    styleCell(socketsCell, "computed", NUMFMT.int);
    const socketsAddr = `F${row}`;

    const systemsCell = ws.getCell(row, 5);
    systemsCell.value = { formula: ceil(`${socketsAddr}/${WORKLOAD_SOCKETS_PER_SYSTEM}`), result: systemsNeeded(sockets) };
    styleCell(systemsCell, "computed", NUMFMT.int);

    const b70Cell = ws.getCell(row, 7);
    b70Cell.value = "—";
    styleCell(b70Cell, "plain");
    const criCell = ws.getCell(row, 8);
    criCell.value = "—";
    styleCell(criCell, "plain");

    row += 1;
  }

  ws.views = [{ state: "frozen", ySplit: headerRow }];
}
