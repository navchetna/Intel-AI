"use client";

import { useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { fmtInt, MetricCard, SectionHeader } from "@/components/ui";
import { AgenticLandingView } from "@/modules/agentic-ai/AgenticLandingView";
import { AgenticProcessesView } from "@/modules/agentic-ai/AgenticProcessesView";
import { taskTypeForRole } from "@/modules/workflows/task-sizing-calcs";
import { ProjectSummaryEditor } from "./ProjectSummaryEditor";
import { ProjectDocumentsPanel } from "./ProjectDocumentsPanel";

/** Enterprise Transformation > Business Process — the current project's business processes,
 *  summary, and documents/notes/discussions, with a high-level dashboard on top. Mirrors the
 *  sections that used to live on the Projects page, reordered: Business Process, Summary, then
 *  Documents/Notes/Discussions. */
export function BusinessProcessView() {
  const { currentProject, data, updateAgents } = useProject();
  const { businessProcesses } = data.agents;

  const agentCount = useMemo(
    () => businessProcesses.reduce((sum, p) => sum + p.agents.length, 0),
    [businessProcesses],
  );

  // "Tasks" = distinct task types (from the fixed TASK_TYPES vocabulary) that any agent's
  // role across the project's business processes maps onto — see taskTypeForRole.
  const taskTypeCount = useMemo(() => {
    const types = new Set<string>();
    for (const process of businessProcesses) {
      for (const agent of process.agents) {
        const type = taskTypeForRole(agent.role ?? "");
        if (type) types.add(type);
      }
    }
    return types.size;
  }, [businessProcesses]);

  const modelCount = data.models.selectedModels.length;

  if (!currentProject) return <AgenticLandingView />;

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-20">

        {/* ── header ── */}
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: "var(--dm-txt-primary)" }}>
            Business Process - {currentProject.name}
          </h1>
        </div>

        {/* ═══════════════ DASHBOARD ═══════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          <MetricCard label="Processes" value={fmtInt(businessProcesses.length)} unit="" accent="129,140,248" />
          <MetricCard label="Agents" value={fmtInt(agentCount)} unit="" accent="56,189,248" />
          <MetricCard label="Tasks" value={fmtInt(taskTypeCount)} unit="" accent="52,211,153" />
          <MetricCard label="Models" value={fmtInt(modelCount)} unit="" accent="251,146,60" />
        </div>

        {/* ═══════════════ AGENTIC BUSINESS PROCESS ═══════════════ */}
        <SectionHeader
          index="1"
          title="Agentic Business Process"
          subtitle={`${businessProcesses.length} process${businessProcesses.length === 1 ? "" : "es"}`}
        />
        <AgenticProcessesView
          key={currentProject.id}
          businessProcesses={businessProcesses}
          onChange={next => updateAgents({ businessProcesses: next })}
        />

        {/* ═══════════════ SUMMARY ═══════════════ */}
        <ProjectSummaryEditor />

        {/* ═══════════════ DOCUMENTS / NOTES / DISCUSSIONS ═══════════════ */}
        <ProjectDocumentsPanel />
      </div>
    </main>
  );
}
