"use client";

import { useCallback } from "react";
import { useRegisterExport } from "@/contexts/ExportContext";
import { COMPARISON_CHIPS, DTYPE_ORDER, type ComparisonChip, type DataType } from "./comparison-data";
import { exportSiliconComparisonToExcel } from "./comparison-export";

const CATEGORY_ORDER: ComparisonChip["category"][] = ["CPU", "GPU", "Accelerator"];

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold" style={{ color: "var(--dm-txt-primary)" }}>{title}</h2>
      <p className="text-xs mt-0.5" style={{ color: "var(--dm-txt-faint)" }}>{subtitle}</p>
    </div>
  );
}

function ChipHeaderCell({ chip }: { chip: ComparisonChip }) {
  return (
    <th className="px-3 py-2.5 text-left align-bottom" style={{ minWidth: 148 }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: chip.accent }}>{chip.category}</div>
      <div className="text-xs font-bold mt-0.5" style={{ color: "var(--dm-txt-primary)" }}>{chip.name}</div>
    </th>
  );
}

function FlopsTable({ chips }: { chips: ComparisonChip[] }) {
  const rows = DTYPE_ORDER.filter(dt => chips.some(c => c.flops[dt]));
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)", minWidth: 100 }}>
                Data type
              </th>
              {chips.map(c => <ChipHeaderCell key={c.id} chip={c} />)}
            </tr>
          </thead>
          <tbody>
            {rows.map((dt, i) => (
              <tr key={dt} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                <td className="px-3 py-2.5 font-mono text-xs font-bold" style={{ color: "var(--dm-txt-secondary)" }}>{dt}</td>
                {chips.map(c => {
                  const cell = c.flops[dt as DataType];
                  return (
                    <td key={c.id} className="px-3 py-2.5 align-top">
                      {cell ? (
                        <>
                          <div className="font-mono text-xs font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{cell.value}</div>
                          {cell.note && <div className="text-[10px] mt-0.5 leading-snug" style={{ color: "var(--dm-txt-faint)" }}>{cell.note}</div>}
                        </>
                      ) : (
                        <span style={{ color: "var(--dm-txt-faintest)" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemoryTable({ chips }: { chips: ComparisonChip[] }) {
  const fields: { key: keyof ComparisonChip["memory"]; label: string }[] = [
    { key: "type", label: "Memory type" },
    { key: "bandwidth", label: "Bandwidth" },
    { key: "capacity", label: "Capacity" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)", minWidth: 100 }}>
                Memory
              </th>
              {chips.map(c => <ChipHeaderCell key={c.id} chip={c} />)}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.key} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--dm-txt-secondary)" }}>{f.label}</td>
                {chips.map(c => (
                  <td key={c.id} className="px-3 py-2.5 text-xs leading-snug" style={{ color: "var(--dm-txt-body)" }}>
                    {c.memory[f.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PcieTable({ chips }: { chips: ComparisonChip[] }) {
  const gpuChips = chips.filter(c => c.category !== "CPU");
  const fields: { key: "lanes" | "gen"; label: string }[] = [
    { key: "lanes", label: "PCIe lanes needed" },
    { key: "gen", label: "PCIe generation needed" },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)", minWidth: 160 }}>
                Host interface
              </th>
              {gpuChips.map(c => <ChipHeaderCell key={c.id} chip={c} />)}
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.key} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--dm-txt-secondary)" }}>{f.label}</td>
                {gpuChips.map(c => (
                  <td key={c.id} className="px-3 py-2.5 align-top">
                    {c.pcie ? (
                      <>
                        <div className="font-mono text-xs font-semibold" style={{ color: "var(--dm-txt-primary)" }}>
                          {f.key === "lanes" ? `x${c.pcie.lanes}` : `Gen ${c.pcie.gen}`}
                        </div>
                        {f.key === "lanes" && c.pcie.note && (
                          <div className="text-[10px] mt-0.5 leading-snug" style={{ color: "var(--dm-txt-faint)" }}>{c.pcie.note}</div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "var(--dm-txt-faintest)" }}>N/A — no PCIe host link</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SiliconComparisonView() {
  const chips = CATEGORY_ORDER.flatMap(cat => COMPARISON_CHIPS.filter(c => c.category === cat));

  const exportHandler = useCallback(() => exportSiliconComparisonToExcel(), []);
  useRegisterExport(exportHandler, "Export Silicon Comparison");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionTitle
          title="Compute throughput"
          subtitle="TFLOPS/TOPS per data type — cells are populated only where the vendor publishes or this app's own sourced data covers that data type. Blank = not supported, or not yet disclosed (never a guess)."
        />
        <FlopsTable chips={chips} />
      </div>

      <div>
        <SectionTitle title="Memory" subtitle="Type, peak bandwidth, and capacity." />
        <MemoryTable chips={chips} />
      </div>

      <div>
        <SectionTitle title="PCIe host interface" subtitle="Lanes and generation needed to run each card at its rated bandwidth — GPUs and accelerators only." />
        <PcieTable chips={chips} />
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>Sources</p>
        <ul className="space-y-1.5">
          {COMPARISON_CHIPS.map(c => (
            <li key={c.id} className="text-[11px] leading-relaxed" style={{ color: "var(--dm-txt-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--dm-txt-secondary)" }}>{c.name}:</span> {c.sourceNote}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
