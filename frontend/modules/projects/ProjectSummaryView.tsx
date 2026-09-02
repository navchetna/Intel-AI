"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";
import { useRegisterExport } from "@/contexts/ExportContext";
import { exportProjectToExcel } from "./export";
import {
  buildAgenticStackSummary, buildAgentModelServingSummary, buildGpuCpuSummary,
  buildHarnessSizingSummary, siliconWithTdp, systemPowerCaption, SYSTEM_POWER_KW,
} from "./summary";
import { fmt, fmtInt, SectionHeader, MetricCard } from "@/components/ui";
import { ProjectSummaryEditor } from "./ProjectSummaryEditor";
import { ProjectDocumentsPanel } from "./ProjectDocumentsPanel";
import { ProjectRackView } from "./ProjectRackView";
import { fetchModelDefaults } from "@/modules/models/model-defaults-api";
import { taskDefaultsByType } from "@/modules/workflows/task-sizing-calcs";
import { models as modelCatalog, type Model, type TaskModelDefault } from "@/modules/models/data";
import { RequestVolumeSizingView } from "@/modules/models/RequestVolumeSizingView";
import { ModelServingView } from "@/modules/workflows/ModelServingView";
import { AgenticProcessesView } from "@/modules/agentic-ai/AgenticProcessesView";
import { AgenticSizingView } from "@/modules/agentic-ai/AgenticSizingView";
import { SizingSheet } from "@/modules/agentic-ai/SizingSheet";
import { SIZING_MAP, defaultInputsFor } from "@/modules/agentic-ai/sizing-wiring";

function EditableTitle({ name, onRename }: { name: string; onRename: (name: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(name); }, [name, editing]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  async function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setDraft(name); setError(null); return; }
    setSaving(true); setError(null);
    try {
      await onRename(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div>
        <input
          ref={inputRef}
          value={draft}
          disabled={saving}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setEditing(false); setDraft(name); setError(null); }
          }}
          onBlur={commit}
          className="text-4xl font-black tracking-tight mb-2 bg-transparent border-b-2 focus:outline-none w-full max-w-2xl"
          style={{ color: "var(--dm-txt-primary)", borderColor: "#0071c5" }}
        />
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <h1
      className="group text-4xl font-black text-white tracking-tight mb-2 cursor-text inline-flex items-center gap-2"
      onClick={() => setEditing(true)}
      title="Click to rename"
    >
      {name}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0">
        <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    </h1>
  );
}

export function ProjectSummaryView() {
  const { currentProject, data, renameProject, updateAgenticStack, updateAgents } = useProject();
  const router = useRouter();
  const [taskDefaults, setTaskDefaults] = useState<TaskModelDefault[] | null>(null);
  const [openSizingId, setOpenSizingId] = useState<string | null>(null);

  const agenticRows = useMemo(() => buildAgenticStackSummary(data), [data]);
  const { selectedWorkloads: selectedWorkloadIds, sizingInputs } = data.agenticStack;
  const selectedWorkloads = useMemo(() => new Set(selectedWorkloadIds), [selectedWorkloadIds]);

  function removeWorkload(id: string) {
    updateAgenticStack({ selectedWorkloads: selectedWorkloadIds.filter(w => w !== id) });
  }
  function openSizingFor(id: string) {
    if (!SIZING_MAP[id]) return;
    setOpenSizingId(id);
  }
  const openTool = openSizingId ? SIZING_MAP[openSizingId] : undefined;

  useEffect(() => {
    let cancelled = false;
    fetchModelDefaults()
      .then(rows => { if (!cancelled) setTaskDefaults(rows); })
      .catch(() => { if (!cancelled) setTaskDefaults([]); });
    return () => { cancelled = true; };
  }, []);

  const defaultsByTaskType = useMemo(() => taskDefaultsByType(taskDefaults), [taskDefaults]);
  const agentModelSummary = useMemo(
    () => buildAgentModelServingSummary(data, defaultsByTaskType),
    [data, defaultsByTaskType],
  );
  const harnessSizingSummary = useMemo(() => buildHarnessSizingSummary(agenticRows), [agenticRows]);

  const selectedCatalogModels: Model[] = useMemo(
    () => modelCatalog.filter(m => data.models.selectedModels.includes(m.hfId)),
    [data.models.selectedModels],
  );
  const requestVolumeDefaults = useMemo(() => {
    const names = new Set(selectedCatalogModels.map(m => m.name));
    return (taskDefaults ?? []).filter(r => names.has(r.model_name));
  }, [taskDefaults, selectedCatalogModels]);

  const gpuCpuSummary = useMemo(
    () => buildGpuCpuSummary(harnessSizingSummary, agentModelSummary.rows, requestVolumeDefaults),
    [harnessSizingSummary, agentModelSummary.rows, requestVolumeDefaults],
  );

  // Overall solution TDP: for each system type (per the GPU/CPU Summary table), power/system × systems.
  const totalTdpKw = useMemo(() => {
    const bySiliconKw = gpuCpuSummary.bySilicon.reduce(
      (sum, row) => sum + (SYSTEM_POWER_KW[row.silicon] ?? 0) * row.systems, 0,
    );
    const harnessKw = (SYSTEM_POWER_KW["32c*6530P"] ?? 0) * harnessSizingSummary.systems;
    return bySiliconKw + harnessKw;
  }, [gpuCpuSummary.bySilicon, harnessSizingSummary.systems]);

  const exportHandler = useCallback(async () => {
    if (!currentProject) return;
    await exportProjectToExcel(
      currentProject.name, data, taskDefaults ?? [], requestVolumeDefaults,
      harnessSizingSummary, gpuCpuSummary, totalTdpKw,
    );
  }, [currentProject, data, taskDefaults, requestVolumeDefaults, harnessSizingSummary, gpuCpuSummary, totalTdpKw]);
  useRegisterExport(currentProject ? exportHandler : null, "Export Project Sizing");

  if (!currentProject) return null;

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-20">

        {/* ── header ── */}
        <div className="mb-8">
          <EditableTitle name={currentProject.name} onRename={renameProject} />
          <p className="text-[13px] text-white/40">
            Last updated {new Date(currentProject.updated_at).toLocaleString()}
          </p>
        </div>

        <ProjectDocumentsPanel />
        <ProjectSummaryEditor />

        {/* ═══════════════ BUSINESS PROCESSES ═══════════════ */}
        <SectionHeader index="1" title="Business Processes" subtitle={`${data.agents.businessProcesses.length} process${data.agents.businessProcesses.length === 1 ? "" : "es"} — from Agents &gt; Agents`} />
        <AgenticProcessesView
          businessProcesses={data.agents.businessProcesses}
          onChange={businessProcesses => updateAgents({ businessProcesses })}
        />

        {/* ═══════════════ MODELS ═══════════════ */}
        <SectionHeader index="2" title="Model Serving Sizing" subtitle={`${data.models.selectedModels.length} model${data.models.selectedModels.length === 1 ? "" : "s"} selected`} />

        {/* — Agent Model Serving (from the Agents page's Agent-Model-Serving tab) — */}
        <p className="mx-auto max-w-screen-2xl px-6 mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
          Agent Model Serving
          <span className="ml-2 font-normal normal-case tracking-normal text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>
            — silicon units driven by each agent&rsquo;s call volume (Agents &gt; Agent-Model-Serving)
          </span>
        </p>
        <ModelServingView businessProcesses={data.agents.businessProcesses} defaultsByTaskType={defaultsByTaskType} />

        {/* — Embedding, Re-Ranking, Security (from the Models page's Sizing tab) — */}
        <p className="mx-auto max-w-screen-2xl px-6 mb-3 text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
          Embedding, Re-Ranking, Security
        </p>
        <RequestVolumeSizingView
          selectedModels={selectedCatalogModels}
          onBackToCatalog={() => router.push("/models")}
          showBlurb={false}
        />

        {/* ═══════════════ AGENT HARNESS SIZING ═══════════════ */}
        <SectionHeader index="3" title="Agent Harness Sizing" subtitle={`${agenticRows.length} workload${agenticRows.length === 1 ? "" : "s"} selected`} />
        <div className="mx-auto max-w-screen-2xl px-6 mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <MetricCard label="Workloads" value={fmtInt(harnessSizingSummary.workloads)} unit="" accent="129,140,248" />
            <MetricCard label="CPU Cores" value={fmt(harnessSizingSummary.cores, 0)} unit="" accent="56,189,248" />
            <MetricCard label="Systems" value={fmtInt(harnessSizingSummary.systems)} unit="" accent="52,211,153" />
            <MetricCard label="Sockets" value={fmtInt(harnessSizingSummary.sockets)} unit="" accent="94,234,212" />
            <MetricCard label="B70" value="—" unit="" accent="251,146,60" />
            <MetricCard label="CRI" value="—" unit="" accent="248,113,113" />
          </div>
        </div>
        <AgenticSizingView
          selectedWorkloads={selectedWorkloads}
          sizingInputs={sizingInputs}
          onRemove={removeWorkload}
          onOpenSizing={openSizingFor}
          onBackToStack={() => router.push("/agentic-ai/harness")}
          showRemove={false}
        />

        {/* ═══════════════ GPU / CPU SUMMARY ═══════════════ */}
        <SectionHeader index="4" title="GPU / CPU Summary" subtitle="Harness Sizing + Agent Model Serving + Embedding/Re-Ranking/Security, combined" />
        <div className="mx-auto max-w-screen-2xl px-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Total TDP" value={fmt(totalTdpKw, 1)} unit="kW" accent="129,140,248" />
            <MetricCard label="Total systems" value={fmtInt(gpuCpuSummary.totalSystems)} unit="" accent="52,211,153" />
            <MetricCard label="Total sockets" value={fmtInt(gpuCpuSummary.totalSockets)} unit="" accent="94,234,212" />
            <MetricCard label="B70" value={fmtInt(gpuCpuSummary.totalB70)} unit="" accent="251,146,60" />
            <MetricCard label="CRI" value={fmtInt(gpuCpuSummary.totalCRI)} unit="" accent="248,113,113" />
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "var(--dm-table-head)" }}>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>For</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Silicon</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Systems</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Sockets</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>B70</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>CRI</th>
                  </tr>
                </thead>
                <tbody>
                  {gpuCpuSummary.bySilicon.map(row => (
                    <tr key={`${row.source}-${row.silicon}`} style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                      <td className="px-3 py-2 text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{row.source}</td>
                      <td className="px-3 py-2 text-sm font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{siliconWithTdp(row.silicon)}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-sm font-semibold" style={{ color: "#34d399" }}>{fmtInt(row.systems)}</span>
                        <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{systemPowerCaption(row.silicon)}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{fmtInt(row.sockets)}</td>
                      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{row.b70Cards > 0 ? fmtInt(row.b70Cards) : "—"}</td>
                      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{row.criCards > 0 ? fmtInt(row.criCards) : "—"}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                    <td className="px-3 py-2 text-sm" style={{ color: "var(--dm-txt-secondary)" }}>Harness</td>
                    <td className="px-3 py-2 text-sm font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{siliconWithTdp("32c*6530P")}</td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-sm font-semibold" style={{ color: "#34d399" }}>{fmtInt(harnessSizingSummary.systems)}</span>
                      <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{systemPowerCaption("32c*6530P")}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{fmtInt(harnessSizingSummary.sockets)}</td>
                    <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-faint)" }}>—</td>
                    <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-faint)" }}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ═══════════════ RACK VIEW ═══════════════ */}
        <SectionHeader index="5" title="Rack View" subtitle="CRI, B70, Xeon-AI, and Harness systems, packed into their own racks" />
        <ProjectRackView bySilicon={gpuCpuSummary.bySilicon} harnessSystems={harnessSizingSummary.systems} />
      </div>

      {openSizingId && openTool && (
        <SizingSheet
          tool={openTool}
          workloadId={openSizingId}
          inputs={sizingInputs[openSizingId] ?? defaultInputsFor(openTool)}
          onInputsChange={next => updateAgenticStack({ sizingInputs: { ...sizingInputs, [openSizingId]: next } })}
          onClose={() => setOpenSizingId(null)}
        />
      )}
    </main>
  );
}
