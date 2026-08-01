"use client";

import { useEffect, useMemo, useState } from "react";
import { AgenticProcessesView } from "./AgenticProcessesView";
import { AgentTaskSizingView } from "@/modules/workflows/AgentTaskSizingView";
import { ModelServingView } from "@/modules/workflows/ModelServingView";
import { taskDefaultsByType } from "@/modules/workflows/task-sizing-calcs";
import { fetchModelDefaults } from "@/modules/models/model-defaults-api";
import type { TaskModelDefault } from "@/modules/models/data";
import { useProject } from "@/contexts/ProjectContext";

type Tab = "agents" | "task-sizing" | "model-serving";

/** Business processes, agent roster, per-agent task sizing, and model-serving rollups — all scoped to the current Project. */
export function AgenticStackPageView() {
  const { currentProject, data, updateAgents } = useProject();
  const [activeTab, setActiveTab]       = useState<Tab>("agents");
  const [taskDefaults, setTaskDefaults] = useState<TaskModelDefault[] | null>(null);

  // Every tab here needs a saved project — fall back if the project is cleared while a project-only tab is active.
  useEffect(() => {
    if (!currentProject) setActiveTab("agents");
  }, [currentProject]);

  useEffect(() => {
    let cancelled = false;
    fetchModelDefaults()
      .then(rows => { if (!cancelled) setTaskDefaults(rows); })
      .catch(() => { if (!cancelled) setTaskDefaults([]); });
    return () => { cancelled = true; };
  }, []);

  const defaultsByTaskType = useMemo(() => taskDefaultsByType(taskDefaults), [taskDefaults]);

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10">
        {/* ── header ── */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight">Business Processes, Agents, Sizing</h1>
        </div>

        {/* ── tab bar ── */}
        {currentProject ? (
          <div className="flex gap-1 mb-2 border-b border-white/[0.07]">
            {[
              { key: "agents" as const, label: `Agents${data.agents.businessProcesses.length ? ` (${data.agents.businessProcesses.length})` : ""}` },
              { key: "task-sizing" as const, label: "Agent Task Sizing" },
              { key: "model-serving" as const, label: "Agent-Model-Serving" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
                style={{
                  color: activeTab === t.key ? "#22d3ee" : "var(--dm-txt-faint)",
                  borderColor: activeTab === t.key ? "#22d3ee" : "transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-white/25 mb-2">
            Select or create a project in the sidebar to describe the agents and business processes for it.
          </p>
        )}
      </div>

      {currentProject && activeTab === "agents" && (
        <AgenticProcessesView
          businessProcesses={data.agents.businessProcesses}
          onChange={businessProcesses => updateAgents({ businessProcesses })}
        />
      )}
      {currentProject && activeTab === "task-sizing" && (
        <AgentTaskSizingView
          businessProcesses={data.agents.businessProcesses}
          defaultsByTaskType={defaultsByTaskType}
          onChange={businessProcesses => updateAgents({ businessProcesses })}
        />
      )}
      {currentProject && activeTab === "model-serving" && (
        <ModelServingView
          businessProcesses={data.agents.businessProcesses}
          defaultsByTaskType={defaultsByTaskType}
        />
      )}
    </main>
  );
}
