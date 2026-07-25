"use client";

import { useEffect, useMemo, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { exportProjectToExcel } from "./export";
import { buildAgenticStackSummary, buildModelSummary, type ModelSummaryRow } from "./summary";
import { fmt, fmtInt, SectionHeader, Panel, StatRow, MetricCard } from "@/components/ui";

export function ProjectSummaryView() {
  const { currentProject, data } = useProject();
  const [modelRows, setModelRows] = useState<ModelSummaryRow[] | null>(null);
  const [modelRowsError, setModelRowsError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState<string | null>(null);

  const agenticRows = useMemo(() => buildAgenticStackSummary(data), [data]);

  useEffect(() => {
    let cancelled = false;
    setModelRows(null);
    setModelRowsError(null);
    buildModelSummary(data)
      .then(rows => { if (!cancelled) setModelRows(rows); })
      .catch(e => { if (!cancelled) setModelRowsError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, [data]);

  const agenticTotals = useMemo(() => agenticRows.reduce(
    (acc, r) => ({
      cores: acc.cores + (r.cores ?? 0),
      ramGB: acc.ramGB + (r.ramGB ?? 0),
      gpuCount: acc.gpuCount + (r.gpuCount ?? 0),
    }),
    { cores: 0, ramGB: 0, gpuCount: 0 },
  ), [agenticRows]);

  const modelTotals = useMemo(() => (modelRows ?? []).reduce(
    (acc, r) => ({
      vramGB: acc.vramGB + (typeof r.totalVramGB === "number" ? r.totalVramGB : typeof r.vramGB === "number" ? r.vramGB : 0),
    }),
    { vramGB: 0 },
  ), [modelRows]);

  async function handleExport() {
    if (!currentProject) return;
    setExporting(true); setExportErr(null);
    try {
      await exportProjectToExcel(currentProject.name, data);
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  if (!currentProject) return null;

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-20">

        {/* ── header ── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#22c55e]/80">Project Summary</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">{currentProject.name}</h1>
            <p className="text-[13px] text-white/40">
              Last updated {new Date(currentProject.updated_at).toLocaleString()}
            </p>
          </div>
          <button
            type="button" onClick={handleExport} disabled={exporting}
            className="flex-shrink-0 rounded-lg bg-intel-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-intel-dark transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            {exporting ? "Exporting…" : "⬇ Export to Excel"}
          </button>
        </div>
        {exportErr && <p className="text-xs text-danger -mt-6 mb-6">{exportErr}</p>}

        {/* ── headline metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricCard label="Workloads" value={fmtInt(agenticRows.length)} unit="selected" accent="129,140,248" />
          <MetricCard label="Agentic Stack" value={fmt(agenticTotals.cores, 0)} unit="cores" accent="56,189,248" />
          <MetricCard label="Models" value={fmtInt(data.models.selectedModels.length)} unit="selected" accent="34,211,238" />
          <MetricCard label="Model VRAM" value={fmt(modelTotals.vramGB, 0)} unit="GB" accent="52,211,153" />
        </div>

        {/* ═══════════════ AGENTIC STACK ═══════════════ */}
        <SectionHeader index="1" title="Agentic Stack Sizing" subtitle={`${agenticRows.length} workload${agenticRows.length === 1 ? "" : "s"} selected`} />
        {agenticRows.length === 0 ? (
          <EmptyPanel text="No workloads selected yet. Configure this project's Agentic Stack, then come back here for the sizing summary." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Per-workload resources" accent="56,189,248">
              {agenticRows.map(row => (
                <StatRow
                  key={row.workloadId}
                  label={row.workload}
                  value={row.available ? `${fmt(row.cores ?? 0, 1)} cores` : "—"}
                  note={row.available
                    ? `${row.layer}${row.subLayer ? ` / ${row.subLayer}` : ""} · ${fmt(row.ramGB ?? 0, 1)} GB RAM${row.gpuCount ? ` · ${fmt(row.gpuCount, 1)} GPU` : ""}`
                    : "Sizing not available yet"}
                />
              ))}
            </Panel>
            <Panel title="Totals" accent="129,140,248">
              <StatRow label="Total CPU cores" value={fmt(agenticTotals.cores, 1)} unit="cores" />
              <StatRow label="Total RAM" value={fmt(agenticTotals.ramGB, 1)} unit="GB" />
              <StatRow label="Total GPUs" value={fmt(agenticTotals.gpuCount, 1)} unit="GPUs" />
            </Panel>
          </div>
        )}

        {/* ═══════════════ MODELS ═══════════════ */}
        <SectionHeader index="2" title="Model Serving Sizing" subtitle={`${data.models.selectedModels.length} model${data.models.selectedModels.length === 1 ? "" : "s"} selected`} />
        {data.models.selectedModels.length === 0 ? (
          <EmptyPanel text="No models selected yet. Select models in the Model Catalog and configure their SLA sizing, then come back here." />
        ) : modelRowsError ? (
          <EmptyPanel text={`Couldn't load model sizing: ${modelRowsError}`} isError />
        ) : modelRows === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Per-model sizing" accent="52,211,153">
              {modelRows.map(row => (
                <StatRow
                  key={row.hfId}
                  label={row.model}
                  value={typeof row.totalVramGB === "number" ? `${fmt(row.totalVramGB, 1)} GB` : "—"}
                  note={`${row.resourceConfigLabel || "no config"} · concurrency ${row.concurrency}${row.notes ? ` · ${row.notes}` : ""}`}
                />
              ))}
            </Panel>
            <Panel title="Totals" accent="34,211,238">
              <StatRow label="Total VRAM (weights + KV cache)" value={fmt(modelTotals.vramGB, 1)} unit="GB" />
              <StatRow label="Models configured" value={fmtInt(modelRows.length)} />
            </Panel>
          </div>
        )}

      </div>
    </main>
  );
}

function EmptyPanel({ text, isError = false }: { text: string; isError?: boolean }) {
  return (
    <div
      className="rounded-2xl border p-8 text-center text-[13px] leading-relaxed"
      style={{
        borderColor: isError ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.08)",
        background: isError ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.02)",
        color: isError ? "var(--dm-txt-secondary)" : "var(--dm-txt-muted)",
      }}
    >
      {text}
    </div>
  );
}
