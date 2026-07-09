"use client";

import { TABLE_COLUMNS, type BenchmarkRecord } from "./types";

interface DataTableProps {
  rows: BenchmarkRecord[];
  total: number;
}

function format(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return String(value);
}

/** Tabular view of captured benchmark data (top 25 rows). */
export function DataTable({ rows, total }: DataTableProps) {
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-intel-dark">Captured data</h2>
        <span className="text-xs text-gray-500">
          Showing {rows.length} of {total} rows (top 25)
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-intel-haze/40">
              {TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-3 py-2 font-semibold text-intel-dark"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-3 py-8 text-center text-sm text-gray-400"
                >
                  No records match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  {TABLE_COLUMNS.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2 text-gray-700">
                      {format(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
