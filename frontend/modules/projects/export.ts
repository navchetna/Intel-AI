/** Exports a Project's full sizing session (Agentic Stack + Models) to one .xlsx workbook. */

import * as XLSX from "xlsx";
import { buildAgenticStackSummary, buildModelSummary } from "./summary";
import type { ProjectData } from "./types";

function agenticRowsForExcel(data: ProjectData): Record<string, string | number>[] {
  return buildAgenticStackSummary(data).map(row => ({
    Workload: row.workloadId,
    Layer: row.layer,
    "Sub-layer": row.subLayer,
    "CPU Cores": row.cores ?? "",
    "RAM (GB)": row.ramGB ?? "",
    GPU: row.gpuCount ?? "",
    Notes: row.available ? "" : "Sizing not available yet",
  }));
}

function modelRowsForExcel(rows: Awaited<ReturnType<typeof buildModelSummary>>): Record<string, string | number>[] {
  return rows.map(row => ({
    Model: row.model,
    "HF ID": row.hfId,
    "SLA TTFT (ms)": row.ttftMs,
    "SLA Tok/s/user": row.tokensPerSec,
    "Resource Config": row.resourceConfigLabel,
    Concurrency: row.concurrency,
    "KV Cache (GB)": row.kvCacheGB,
    "VRAM to load (GB)": row.vramGB,
    "Total VRAM (GB)": row.totalVramGB,
    Notes: row.notes,
  }));
}

/** Builds one workbook (Agentic Stack + Models sheets) for everything configured in the project and downloads it. */
export async function exportProjectToExcel(projectName: string, data: ProjectData): Promise<void> {
  const agenticRows = agenticRowsForExcel(data);
  const modelRows = modelRowsForExcel(await buildModelSummary(data));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(agenticRows.length ? agenticRows : [{ Workload: "No workloads selected" }]),
    "Agentic Stack",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(modelRows.length ? modelRows : [{ Model: "No models selected" }]),
    "Models",
  );

  const safeName = projectName.replace(/[^a-z0-9-_]+/gi, "_") || "project";
  XLSX.writeFile(workbook, `${safeName}-sizing.xlsx`);
}
