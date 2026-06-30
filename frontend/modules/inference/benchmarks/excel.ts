/** Excel template generation and upload parsing via the `xlsx` library. */

import * as XLSX from "xlsx";
import { EXCEL_COLUMNS } from "./types";

/** Trigger a download of an empty .xlsx template whose header row matches the DB. */
export function downloadTemplate(): void {
  const worksheet = XLSX.utils.aoa_to_sheet([[...EXCEL_COLUMNS]]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "inference_benchmarks");
  XLSX.writeFile(workbook, "inference_benchmarks_template.xlsx");
}

export interface ParsedSheet {
  rows: Record<string, unknown>[];
  headerErrors: string[];
}

/** Parse an uploaded workbook into rows keyed by header, validating columns. */
export async function parseWorkbook(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], headerErrors: ["The uploaded file has no sheets."] };
  }
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const headerErrors: string[] = [];
  if (rows.length === 0) {
    headerErrors.push("The sheet has no data rows.");
  } else {
    const present = new Set(Object.keys(rows[0]));
    const missing = EXCEL_COLUMNS.filter((c) => !present.has(c));
    if (missing.length > 0) {
      headerErrors.push(`Missing required columns: ${missing.join(", ")}`);
    }
  }
  return { rows, headerErrors };
}
