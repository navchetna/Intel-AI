/** "Summary" sheet — consolidates Harness, Agent-Model-Serving and Embedding-ReRanking-Security
 *  into one overall-sizing view. Every total is a live SUM over the source sheet's relevant column,
 *  so it stays correct no matter how many rows those sheets end up with. */

import type ExcelJS from "exceljs";
import { SYSTEM_POWER_KW, type GpuCpuSummary, type HarnessSizingSummary } from "../summary";
import { styleTitle, styleSubtitle, styleHeader, styleSection, styleCell, NUMFMT } from "./xlsx-style";
import { SHEET } from "./sheetNames";

const HARNESS_KW_PER_SYSTEM = SYSTEM_POWER_KW["32c*6530P"];

export function buildSummarySheet(
  ws: ExcelJS.Worksheet,
  harness: HarnessSizingSummary,
  gpuCpu: GpuCpuSummary,
  totalTdpKw: number,
): void {
  ws.getColumn(1).width = 30;
  [2, 3, 4, 5].forEach(c => { ws.getColumn(c).width = 16; });

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Summary";
  row += 1;
  ws.mergeCells(row, 1, row, 5);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    "Consolidates the Harness, Agent-Model-Serving, and Embedding-ReRanking-Security sheets — every figure here " +
    "is a live SUM over that sheet's column, so it stays correct as those sheets change.";
  ws.getRow(row).height = 28;
  row += 2;

  const H = `'${SHEET.harness}'`;
  const AMS = `'${SHEET.agentModelServing}'`;
  const ERR = `'${SHEET.embeddingRerankingSecurity}'`;

  const agentModelRows = gpuCpu.bySilicon.filter(r => r.source === "Agent Model");
  const rrRows = gpuCpu.bySilicon.filter(r => r.source === "Embedding/Re-Ranking/Security");
  const sumBy = (rows: typeof agentModelRows, field: "systems" | "sockets" | "b70Cards" | "criCards") =>
    rows.reduce((s, r) => s + r[field], 0);

  styleSection(ws.getCell(row, 1));
  ws.mergeCells(row, 1, row, 5);
  ws.getCell(row, 1).value = "Totals";
  row += 1;

  const totalSystemsCell = ws.getCell(row, 1);
  totalSystemsCell.value = "Total Systems";
  styleCell(totalSystemsCell, "label");
  const totalSystemsValueCell = ws.getCell(row, 2);
  totalSystemsValueCell.value = {
    formula: `SUM(${H}!E:E)+SUM(${AMS}!R:R)+SUM(${ERR}!K:K)`,
    result: gpuCpu.totalSystems,
  };
  styleCell(totalSystemsValueCell, "computed", NUMFMT.int);
  row += 1;

  const totalSocketsCell = ws.getCell(row, 1);
  totalSocketsCell.value = "Total Sockets";
  styleCell(totalSocketsCell, "label");
  const totalSocketsValueCell = ws.getCell(row, 2);
  totalSocketsValueCell.value = { formula: `SUM(${H}!F:F)+SUM(${AMS}!Q:Q)+SUM(${ERR}!L:L)`, result: gpuCpu.totalSockets };
  styleCell(totalSocketsValueCell, "computed", NUMFMT.int);
  row += 1;

  const totalB70Cell = ws.getCell(row, 1);
  totalB70Cell.value = "Total B70";
  styleCell(totalB70Cell, "label");
  const totalB70ValueCell = ws.getCell(row, 2);
  totalB70ValueCell.value = { formula: `SUM(${AMS}!S:S)+SUM(${ERR}!M:M)`, result: gpuCpu.totalB70 };
  styleCell(totalB70ValueCell, "computed", NUMFMT.int);
  row += 1;

  const totalCRICell = ws.getCell(row, 1);
  totalCRICell.value = "Total CRI";
  styleCell(totalCRICell, "label");
  const totalCRIValueCell = ws.getCell(row, 2);
  totalCRIValueCell.value = { formula: `SUM(${AMS}!T:T)+SUM(${ERR}!N:N)`, result: gpuCpu.totalCRI };
  styleCell(totalCRIValueCell, "computed", NUMFMT.int);
  row += 1;

  const totalTdpCell = ws.getCell(row, 1);
  totalTdpCell.value = "Total TDP (kW)";
  styleCell(totalTdpCell, "label");
  const totalTdpValueCell = ws.getCell(row, 2);
  totalTdpValueCell.value = {
    formula: `SUM(${H}!E:E)*${HARNESS_KW_PER_SYSTEM}+SUM(${AMS}!F:F)*1+SUM(${AMS}!I:I)*1.2+SUM(${AMS}!L:L)*1.6+SUM(${AMS}!O:O)*2.4+SUM(${ERR}!O:O)`,
    result: totalTdpKw,
  };
  styleCell(totalTdpValueCell, "computed", NUMFMT.dec2);
  row += 2;

  styleSection(ws.getCell(row, 1));
  ws.mergeCells(row, 1, row, 5);
  ws.getCell(row, 1).value = "By Source";
  row += 1;

  const headerRow = row;
  ["Source", "Systems", "Sockets", "B70", "CRI"].forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  const harnessRowNum = row;
  const harnessLabelCell = ws.getCell(row, 1);
  harnessLabelCell.value = "Harness";
  styleCell(harnessLabelCell, "label");
  const hSysCell = ws.getCell(row, 2);
  hSysCell.value = { formula: `SUM(${H}!E:E)`, result: harness.systems };
  styleCell(hSysCell, "computed", NUMFMT.int);
  const hSockCell = ws.getCell(row, 3);
  hSockCell.value = { formula: `SUM(${H}!F:F)`, result: harness.sockets };
  styleCell(hSockCell, "computed", NUMFMT.int);
  const hB70Cell = ws.getCell(row, 4);
  hB70Cell.value = "—";
  styleCell(hB70Cell, "plain");
  const hCriCell = ws.getCell(row, 5);
  hCriCell.value = "—";
  styleCell(hCriCell, "plain");
  row += 1;

  const amsRowNum = row;
  const amsLabelCell = ws.getCell(row, 1);
  amsLabelCell.value = "Agent-Model-Serving";
  styleCell(amsLabelCell, "label");
  const amsSysCell = ws.getCell(row, 2);
  amsSysCell.value = { formula: `SUM(${AMS}!R:R)`, result: sumBy(agentModelRows, "systems") };
  styleCell(amsSysCell, "computed", NUMFMT.int);
  const amsSockCell = ws.getCell(row, 3);
  amsSockCell.value = { formula: `SUM(${AMS}!Q:Q)`, result: sumBy(agentModelRows, "sockets") };
  styleCell(amsSockCell, "computed", NUMFMT.int);
  const amsB70Cell = ws.getCell(row, 4);
  amsB70Cell.value = { formula: `SUM(${AMS}!S:S)`, result: sumBy(agentModelRows, "b70Cards") };
  styleCell(amsB70Cell, "computed", NUMFMT.int);
  const amsCriCell = ws.getCell(row, 5);
  amsCriCell.value = { formula: `SUM(${AMS}!T:T)`, result: sumBy(agentModelRows, "criCards") };
  styleCell(amsCriCell, "computed", NUMFMT.int);
  row += 1;

  const errRowNum = row;
  const errLabelCell = ws.getCell(row, 1);
  errLabelCell.value = "Embedding-ReRanking-Security";
  styleCell(errLabelCell, "label");
  const errSysCell = ws.getCell(row, 2);
  errSysCell.value = { formula: `SUM(${ERR}!K:K)`, result: sumBy(rrRows, "systems") };
  styleCell(errSysCell, "computed", NUMFMT.int);
  const errSockCell = ws.getCell(row, 3);
  errSockCell.value = { formula: `SUM(${ERR}!L:L)`, result: sumBy(rrRows, "sockets") };
  styleCell(errSockCell, "computed", NUMFMT.int);
  const errB70Cell = ws.getCell(row, 4);
  errB70Cell.value = { formula: `SUM(${ERR}!M:M)`, result: sumBy(rrRows, "b70Cards") };
  styleCell(errB70Cell, "computed", NUMFMT.int);
  const errCriCell = ws.getCell(row, 5);
  errCriCell.value = { formula: `SUM(${ERR}!N:N)`, result: sumBy(rrRows, "criCards") };
  styleCell(errCriCell, "computed", NUMFMT.int);
  row += 1;

  const totalLabelCell = ws.getCell(row, 1);
  totalLabelCell.value = "TOTAL";
  styleCell(totalLabelCell, "label");
  totalLabelCell.font = { bold: true };
  const totalSysCell = ws.getCell(row, 2);
  totalSysCell.value = { formula: `B${harnessRowNum}+B${amsRowNum}+B${errRowNum}`, result: gpuCpu.totalSystems };
  styleCell(totalSysCell, "computed", NUMFMT.int);
  totalSysCell.font = { bold: true };
  const totalSockCell = ws.getCell(row, 3);
  totalSockCell.value = { formula: `C${harnessRowNum}+C${amsRowNum}+C${errRowNum}`, result: gpuCpu.totalSockets };
  styleCell(totalSockCell, "computed", NUMFMT.int);
  totalSockCell.font = { bold: true };
  const totalB70RowCell = ws.getCell(row, 4);
  totalB70RowCell.value = { formula: `D${amsRowNum}+D${errRowNum}`, result: gpuCpu.totalB70 };
  styleCell(totalB70RowCell, "computed", NUMFMT.int);
  totalB70RowCell.font = { bold: true };
  const totalCriRowCell = ws.getCell(row, 5);
  totalCriRowCell.value = { formula: `E${amsRowNum}+E${errRowNum}`, result: gpuCpu.totalCRI };
  styleCell(totalCriRowCell, "computed", NUMFMT.int);
  totalCriRowCell.font = { bold: true };

  ws.views = [{ state: "frozen", ySplit: headerRow }];
}
