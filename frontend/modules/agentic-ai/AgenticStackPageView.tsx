"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentTaskSizingView } from "@/modules/workflows/AgentTaskSizingView";
import { ModelServingView } from "@/modules/workflows/ModelServingView";
import { ModelDefaultsView } from "@/modules/models/ModelDefaultsView";
import { taskDefaultsByType } from "@/modules/workflows/task-sizing-calcs";
import { fetchModelDefaults } from "@/modules/models/model-defaults-api";
import type { TaskModelDefault } from "@/modules/models/data";
import { useProject } from "@/contexts/ProjectContext";

type Tab = "defaults" | "task-sizing" | "model-serving";

/** Task-model mapping, per-agent task sizing, and model-serving rollups — all scoped to the
 *  current Project (the roster itself lives on the Business Process page; nothing here
 *  duplicates it). */
export function AgenticStackPageView() {
  const { currentProject, data, updateAgents } = useProject();
  const [activeTab, setActiveTab]       = useState<Tab>("defaults");
  const [taskDefaults, setTaskDefaults] = useState<TaskModelDefault[] | null>(null);

  // Every project-scoped tab needs a saved project — fall back if the project is cleared
  // while one of those tabs is active. Task-Type-Model-Mapping isn't project-scoped, so it's fine either way.
  useEffect(() => {
    if (!currentProject && activeTab !== "defaults") setActiveTab("defaults");
  }, [currentProject, activeTab]);

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
          <h1 className="text-4xl font-black text-white tracking-tight">Agents - Tasks Mapping &amp; Model Sizing</h1>
        </div>

        {/* ── tab bar ── */}
        <div className="flex gap-1 mb-2 border-b border-white/[0.07]">
          {[
            { key: "defaults" as const, label: "Task-Type-Model-Mapping" },
            { key: "task-sizing" as const, label: "Tasks" },
            { key: "model-serving" as const, label: "Model-Serving" },
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
        {!currentProject && activeTab !== "defaults" && (
          <p className="text-[11px] text-white/25 mb-2">
            Select or create a project in the sidebar for this tab — it&rsquo;s scoped per project.
          </p>
        )}
      </div>

      {activeTab === "defaults" && <ModelDefaultsView />}
      {currentProject && activeTab === "task-sizing" && (
        <AgentTaskSizingView
          key={currentProject.id}
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
