/** "Agent Task Sizing" sheet — every agent across every business process, with the full chain from
 *  calls/case through to silicon units, exposing every override point (latency, buffer %,
 *  configured concurrency, silicon) the app itself allows. Calls/Case, Calls/Day and Peak Calls/Sec
 *  are cross-sheet links to Business Processes; Latency/Silicon/Unit-Concurrency are cross-sheet
 *  VLOOKUPs into Model-Defaults by task type — so editing either upstream sheet recomputes this one. */

import type ExcelJS from "exceljs";
import { taskTypeForRole, resolveAgentSizing, SILICON_OPTIONS, CONCURRENCY_BUFFER } from "@/modules/workflows/task-sizing-calcs";
import type { TaskModelDefault } from "@/modules/models/data";
import { models as modelCatalog } from "@/modules/models/data";
import type { BusinessProcess } from "../types";
import { cellAddr, sheetRef } from "./formula-sheet";
import { styleTitle, styleSubtitle, styleHeader, styleSection, styleCell, NUMFMT } from "./xlsx-style";
import { SHEET } from "./sheetNames";
import type { ProcessRowMap } from "./businessProcesses";
import type { ModelDefaultsLayout } from "./modelDefaults";

export interface AgentTaskSizingRowRef {
  processId: string;
  agentId: string;
  row: number;
  /** Column letters for cells other sheets need to reference. */
  modelCol: string;
  configuredConcurrencyCol: string;
  effectiveSiliconCol: string;
  unitConcurrencyCol: string;
  siliconUnitsCol: string;
}

const COLS = {
  businessProcess: 1, agent: 2, taskType: 3, model: 4, callsPerCase: 5, callsPerDay: 6, peakCallsSec: 7,
  latencyOverride: 8, effectiveLatency: 9, requiredConcurrency: 10, bufferPct: 11, configuredConcurrencyOverride: 12,
  configuredConcurrency: 13, siliconOverride: 14, effectiveSilicon: 15, unitConcurrency: 16, siliconUnits: 17,
} as const;

export function buildAgentTaskSizingSheet(
  ws: ExcelJS.Worksheet,
  businessProcesses: BusinessProcess[],
  defaultsByTaskType: Record<string, TaskModelDefault>,
  processRowMaps: ProcessRowMap[],
  modelDefaultsLayout: ModelDefaultsLayout,
): AgentTaskSizingRowRef[] {
  const widths = [20, 18, 16, 22, 11, 11, 13, 12, 12, 13, 9, 14, 13, 13, 13, 12, 12];
  widths.forEach((w, idx) => { ws.getColumn(idx + 1).width = w; });

  let row = 1;
  styleTitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value = "Agent Task Sizing";
  row += 1;
  ws.mergeCells(row, 1, row, 17);
  styleSubtitle(ws.getCell(row, 1));
  ws.getCell(row, 1).value =
    "Calls/Case, Calls/Day and Peak Calls/Sec link to the Business Processes sheet. Latency, Silicon and Unit " +
    "Concurrency link to Model-Defaults by Task-Type. Required Concurrency = Peak Calls/Sec x Latency (Little's " +
    "Law); Configured Concurrency = Required Concurrency x (1 + Buffer %); Silicon Units = Configured Concurrency " +
    "/ Unit Concurrency. Override columns (amber) take precedence over the linked/computed value when filled in.";
  ws.getRow(row).height = 44;
  row += 2;

  const headerRow = row;
  const headers = [
    "Business Process", "Agent", "Task-Type", "Model", "Calls/Case", "Calls/Day", "Peak Calls/Sec",
    "Latency Override (s)", "Effective Latency (s)", "Required Concurrency", "Buffer %",
    "Configured Concurrency Override", "Configured Concurrency", "Silicon Override", "Effective Silicon",
    "Unit Concurrency", "Silicon Units",
  ];
  headers.forEach((h, idx) => {
    const cell = ws.getCell(headerRow, idx + 1);
    cell.value = h;
    styleHeader(cell);
  });
  row += 1;

  const modelDefaultsRange = sheetRef(SHEET.modelDefaults, modelDefaultsLayout.rangeRef);
  const rowRefs: AgentTaskSizingRowRef[] = [];

  for (const process of businessProcesses) {
    if (process.agents.length === 0) continue;
    const procMap = processRowMaps.find(m => m.processId === process.id);

    ws.mergeCells(row, 1, row, 17);
    styleSection(ws.getCell(row, 1));
    ws.getCell(row, 1).value = `${process.name || "(untitled)"} — ${process.agents.length} agent${process.agents.length === 1 ? "" : "s"}`;
    row += 1;

    for (const agent of process.agents) {
      const taskType = taskTypeForRole(agent.role ?? "") ?? "";
      const result = resolveAgentSizing(process, agent, defaultsByTaskType);
      const agentRowRef = procMap?.agentRows.find(a => a.agentId === agent.id);
      const bpRow = agentRowRef?.row;

      const bpCell = ws.getCell(row, COLS.businessProcess);
      bpCell.value = process.name || "(untitled)";
      styleCell(bpCell, "label");

      const agentCell = ws.getCell(row, COLS.agent);
      agentCell.value = agent.name || "(unnamed)";
      styleCell(agentCell, "label");

      const taskTypeCell = ws.getCell(row, COLS.taskType);
      taskTypeCell.value = taskType;
      styleCell(taskTypeCell, "computed");

      const modelName = modelCatalog.find(m => m.hfId === (agent.taskSizing?.modelHfId ?? ""))?.name ?? "";
      const modelCell = ws.getCell(row, COLS.model);
      modelCell.value = modelName;
      styleCell(modelCell, "input");
      modelCell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${modelCatalog.map(m => m.name).join(",")}"`] };

      const callsCaseCell = ws.getCell(row, COLS.callsPerCase);
      const callsDayCell = ws.getCell(row, COLS.callsPerDay);
      const peakCallsCell = ws.getCell(row, COLS.peakCallsSec);
      if (bpRow) {
        callsCaseCell.value = { formula: sheetRef(SHEET.businessProcesses, cellAddr(bpRow, 2)), result: agent.callsPerCase ?? 0 };
        callsDayCell.value = { formula: sheetRef(SHEET.businessProcesses, cellAddr(bpRow, 3)), result: result.callsPerDay };
        peakCallsCell.value = { formula: sheetRef(SHEET.businessProcesses, cellAddr(bpRow, 4)), result: result.callsPerSec };
      } else {
        callsCaseCell.value = agent.callsPerCase ?? 0;
        callsDayCell.value = result.callsPerDay;
        peakCallsCell.value = result.callsPerSec;
      }
      styleCell(callsCaseCell, "linked", NUMFMT.dec2);
      styleCell(callsDayCell, "linked", NUMFMT.int);
      styleCell(peakCallsCell, "linked", NUMFMT.dec2);

      const latencyOverrideCell = ws.getCell(row, COLS.latencyOverride);
      latencyOverrideCell.value = agent.taskSizing?.latencySec ?? "";
      styleCell(latencyOverrideCell, "input", NUMFMT.dec2);
      const latencyOverrideAddr = cellAddr(row, COLS.latencyOverride - 1);

      const taskTypeAddr = cellAddr(row, COLS.taskType - 1);
      const effLatencyCell = ws.getCell(row, COLS.effectiveLatency);
      effLatencyCell.value = {
        formula: `IF(${latencyOverrideAddr}<>"",${latencyOverrideAddr},IFERROR(VLOOKUP(${taskTypeAddr},${modelDefaultsRange},3,FALSE),""))`,
        result: result.latencySec ?? "",
      };
      styleCell(effLatencyCell, "linked", NUMFMT.dec2);
      const effLatencyAddr = cellAddr(row, COLS.effectiveLatency - 1);

      const peakCallsAddr = cellAddr(row, COLS.peakCallsSec - 1);
      const requiredConcurrencyCell = ws.getCell(row, COLS.requiredConcurrency);
      requiredConcurrencyCell.value = {
        formula: `IF(${effLatencyAddr}="","",ROUNDUP(${peakCallsAddr}*${effLatencyAddr},0))`,
        result: result.requiredConcurrency ?? "",
      };
      styleCell(requiredConcurrencyCell, "computed", NUMFMT.int);
      const requiredConcurrencyAddr = cellAddr(row, COLS.requiredConcurrency - 1);

      const bufferCell = ws.getCell(row, COLS.bufferPct);
      bufferCell.value = CONCURRENCY_BUFFER;
      styleCell(bufferCell, "input", NUMFMT.pct);
      const bufferAddr = cellAddr(row, COLS.bufferPct - 1);

      const confOverrideCell = ws.getCell(row, COLS.configuredConcurrencyOverride);
      confOverrideCell.value = agent.taskSizing?.configuredConcurrency ?? "";
      styleCell(confOverrideCell, "input", NUMFMT.int);
      const confOverrideAddr = cellAddr(row, COLS.configuredConcurrencyOverride - 1);

      const confCell = ws.getCell(row, COLS.configuredConcurrency);
      confCell.value = {
        formula: `IF(${confOverrideAddr}<>"",${confOverrideAddr},IF(${requiredConcurrencyAddr}="","",ROUNDUP(${requiredConcurrencyAddr}*(1+${bufferAddr}),0)))`,
        result: result.configuredConcurrency,
      };
      styleCell(confCell, "computed", NUMFMT.int);
      const confAddr = cellAddr(row, COLS.configuredConcurrency - 1);

      const siliconOverrideCell = ws.getCell(row, COLS.siliconOverride);
      siliconOverrideCell.value = agent.taskSizing?.silicon ?? "";
      styleCell(siliconOverrideCell, "input");
      siliconOverrideCell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${SILICON_OPTIONS.join(",")}"`] };
      const siliconOverrideAddr = cellAddr(row, COLS.siliconOverride - 1);

      const effSiliconCell = ws.getCell(row, COLS.effectiveSilicon);
      effSiliconCell.value = {
        formula: `IF(${siliconOverrideAddr}<>"",${siliconOverrideAddr},IFERROR(VLOOKUP(${taskTypeAddr},${modelDefaultsRange},4,FALSE),""))`,
        result: result.silicon || "",
      };
      styleCell(effSiliconCell, "linked");

      const unitConcurrencyCell = ws.getCell(row, COLS.unitConcurrency);
      unitConcurrencyCell.value = {
        formula: `IFERROR(VLOOKUP(${taskTypeAddr},${modelDefaultsRange},5,FALSE),"")`,
        result: result.unitConcurrency ?? "",
      };
      styleCell(unitConcurrencyCell, "linked", NUMFMT.int);
      const unitConcurrencyAddr = cellAddr(row, COLS.unitConcurrency - 1);

      const siliconUnitsCell = ws.getCell(row, COLS.siliconUnits);
      siliconUnitsCell.value = {
        formula: `IF(${unitConcurrencyAddr}>0,ROUNDUP(${confAddr}/${unitConcurrencyAddr},0),"")`,
        result: result.siliconUnitsNeeded ?? "",
      };
      styleCell(siliconUnitsCell, "computed", NUMFMT.int);

      rowRefs.push({
        processId: process.id, agentId: agent.id, row,
        modelCol: cellAddr(row, COLS.model - 1),
        configuredConcurrencyCol: confAddr,
        effectiveSiliconCol: cellAddr(row, COLS.effectiveSilicon - 1),
        unitConcurrencyCol: unitConcurrencyAddr,
        siliconUnitsCol: cellAddr(row, COLS.siliconUnits - 1),
      });
      row += 1;
    }
  }

  if (rowRefs.length === 0) {
    ws.getCell(row, 1).value = "No agents added to any business process yet.";
  }

  ws.views = [{ state: "frozen", ySplit: headerRow }];
  return rowRefs;
}
