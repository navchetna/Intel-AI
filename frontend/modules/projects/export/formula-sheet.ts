/** A small helper for building one "calculator" worksheet as a sequence of labelled two-column
 *  (Label | Value) rows, mirroring a JS calculator function almost line-for-line: every `input()`/
 *  `computed()` call returns the Excel cell address it just wrote, which gets threaded into later
 *  formula strings exactly like the original function held a numeric variable — e.g.
 *
 *    const peakActiveQueries = i.connections * i.activeFraction;        // JS
 *    const peakActiveQueries = s.computed("Peak Active Queries",
 *      `${connections}*${activeFraction}`, connections_val * activeFraction_val);  // ported
 *
 *  Every formula cell also carries a cached `result` — the real value computed by calling the
 *  app's own calculator function — so the sheet displays correct numbers immediately on open even
 *  before Excel's first recalculation, and independently of whether the ported formula is exactly
 *  right. */

import type ExcelJS from "exceljs";
import { styleHeader, styleSection, styleCell, styleTitle, styleSubtitle, NUMFMT, type CellKind } from "./xlsx-style";

export function colLetter(index0: number): string {
  let n = index0 + 1;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function cellAddr(row: number, col0: number): string {
  return `${colLetter(col0)}${row}`;
}

/** Wraps a same-workbook cross-sheet reference, quoting the sheet name (safe even without spaces). */
export function sheetRef(sheetName: string, addr: string): string {
  return `'${sheetName}'!${addr}`;
}

// ── Excel-formula equivalents of the JS helpers used across the sizing calculators ──────────────

/** Math.ceil(expr) → ROUNDUP(expr,0) (equivalent to CEILING(expr,1) for the non-negative values
 *  every calculator here produces). */
export function ceil(expr: string): string {
  return `ROUNDUP(${expr},0)`;
}

/** Rounds `expr` up to the next multiple of `step` — Excel's CEILING(number,significance) does
 *  this directly (JS: Math.ceil(expr/step)*step). */
export function ceilTo(expr: string, step: number | string): string {
  return `CEILING(${expr},${step})`;
}

export function round(expr: string, digits = 0): string {
  return `ROUND(${expr},${digits})`;
}

export function max(...exprs: string[]): string {
  return `MAX(${exprs.join(",")})`;
}

export function min(...exprs: string[]): string {
  return `MIN(${exprs.join(",")})`;
}

/** Ternary → IF. `thenExpr`/`elseExpr` are formula fragments, not full formulas. */
export function iff(cond: string, thenExpr: string, elseExpr: string): string {
  return `IF(${cond},${thenExpr},${elseExpr})`;
}

/** String-equality branch on a cell holding one of a fixed set of option strings. */
export function eq(cellRef: string, literal: string): string {
  return `${cellRef}="${literal}"`;
}

/** JS `Math.pow(base, expr)` → Excel `base^expr`. */
export function pow(base: string, exponent: string): string {
  return `(${base})^(${exponent})`;
}

/** Nested-IF port of the app's `snapUp(n, tiers)` — "smallest tier >= n", built from the inside
 *  out so the last tier is the terminal else-branch. */
export function snapUpFormula(cellRef: string, tiers: number[]): string {
  let expr = String(tiers[tiers.length - 1]);
  for (let i = tiers.length - 2; i >= 0; i--) {
    expr = `IF(${cellRef}<=${tiers[i]},${tiers[i]},${expr})`;
  }
  return expr;
}

/** Port of the app's `floorPow2(n)` — largest power of 2 <= n. */
export function floorPow2Formula(cellRef: string): string {
  return `2^INT(LOG(MAX(${cellRef},1),2))`;
}

export const CORE_TIERS = [4, 8, 16, 32, 64, 128];
export const RAM_TIERS = [16, 32, 64, 128, 256, 512, 1024];
export const DISK_TIERS = [100, 200, 500, 1000, 2000, 4000, 8000];

// ── Sheet builder ────────────────────────────────────────────────────────────────────────────

export class FormulaSheet {
  ws: ExcelJS.Worksheet;
  row: number;
  labelCol = 1;
  valueCol = 2;

  constructor(ws: ExcelJS.Worksheet, startRow = 1) {
    this.ws = ws;
    this.row = startRow;
    ws.getColumn(this.labelCol).width = 42;
    ws.getColumn(this.valueCol).width = 20;
  }

  title(text: string) {
    const cell = this.ws.getCell(this.row, this.labelCol);
    cell.value = text;
    styleTitle(cell);
    this.row += 1;
  }

  subtitle(text: string) {
    this.ws.mergeCells(this.row, this.labelCol, this.row, this.valueCol);
    const cell = this.ws.getCell(this.row, this.labelCol);
    cell.value = text;
    styleSubtitle(cell);
    this.ws.getRow(this.row).height = 28;
    this.row += 2;
  }

  section(text: string) {
    this.ws.mergeCells(this.row, this.labelCol, this.row, this.valueCol);
    const cell = this.ws.getCell(this.row, this.labelCol);
    cell.value = text;
    styleSection(cell);
    this.row += 1;
  }

  blank() {
    this.row += 1;
  }

  /** Editable input row — `value` is a literal (number/string/boolean), not a formula. */
  input(label: string, value: number | string | boolean, opts?: { numFmt?: string; validation?: string[] }): string {
    const labelCell = this.ws.getCell(this.row, this.labelCol);
    labelCell.value = label;
    styleCell(labelCell, "label");
    const valueCell = this.ws.getCell(this.row, this.valueCol);
    valueCell.value = value;
    styleCell(valueCell, "input" as CellKind, opts?.numFmt);
    if (opts?.validation) {
      valueCell.dataValidation = { type: "list", allowBlank: false, formulae: [`"${opts.validation.join(",")}"`] };
    }
    const addr = cellAddr(this.row, this.valueCol - 1);
    this.row += 1;
    return addr;
  }

  /** Computed formula row. `result` is the real value from calling the app's own calculator —
   *  the cell's cached display value until Excel recalculates. */
  computed(label: string, formula: string, result: number, opts?: { numFmt?: string }): string {
    const labelCell = this.ws.getCell(this.row, this.labelCol);
    labelCell.value = label;
    styleCell(labelCell, "label");
    const valueCell = this.ws.getCell(this.row, this.valueCol);
    valueCell.value = { formula, result };
    styleCell(valueCell, "computed", opts?.numFmt ?? NUMFMT.dec2);
    const addr = cellAddr(this.row, this.valueCol - 1);
    this.row += 1;
    return addr;
  }

  /** A computed row whose value is descriptive text (e.g. a recommended config string), not a number. */
  computedText(label: string, formula: string, result: string): string {
    const labelCell = this.ws.getCell(this.row, this.labelCol);
    labelCell.value = label;
    styleCell(labelCell, "label");
    const valueCell = this.ws.getCell(this.row, this.valueCol);
    valueCell.value = { formula, result };
    styleCell(valueCell, "computed");
    const addr = cellAddr(this.row, this.valueCol - 1);
    this.row += 1;
    return addr;
  }

  /** A fixed (non-formula) text/config row — e.g. a literal recommended-setting string. */
  note(label: string, text: string): string {
    const labelCell = this.ws.getCell(this.row, this.labelCol);
    labelCell.value = label;
    styleCell(labelCell, "label");
    const valueCell = this.ws.getCell(this.row, this.valueCol);
    valueCell.value = text;
    styleCell(valueCell, "computed");
    const addr = cellAddr(this.row, this.valueCol - 1);
    this.row += 1;
    return addr;
  }
}

export { styleHeader, styleSection };
