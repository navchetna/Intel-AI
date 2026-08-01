"use client";

import { Fragment } from "react";
import { models as modelCatalog, type TaskModelDefault } from "@/modules/models/data";
import { resolveAgentSizing, SILICON_OPTIONS, CONCURRENCY_BUFFER } from "./task-sizing-calcs";
import type { BusinessProcess, ProcessParticipant, TaskSizingConfig, SiliconOption } from "@/modules/projects/types";

const inputStyle = {
  background: "var(--dm-input-bg, #0e1d38)",
  border: "1px solid var(--dm-input-border, rgba(255,255,255,0.12))",
  color: "var(--dm-input-color, rgba(255,255,255,0.85))",
  colorScheme: "dark",
} as React.CSSProperties;

const cellInput = "w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40";

function fmt(n: number, d = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

// ── group header row (business process) ──────────────────────────────────────────

function ProcessGroupHeader({ process, colSpan }: { process: BusinessProcess; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ background: "rgba(255,255,255,0.03)", borderTop: "2px solid rgba(129,140,248,0.35)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-4 py-2 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full" style={{ background: "#818cf8" }} />
          <span className="font-semibold text-sm text-white/80">{process.name || "Untitled business process"}</span>
          <span className="text-xs text-white/30 font-medium">
            {process.casesPerDay > 0 ? `${process.casesPerDay.toLocaleString()} cases/day · ` : ""}
            {process.agents.length} agent{process.agents.length === 1 ? "" : "s"}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ── one row per agent ─────────────────────────────────────────────────────────────

function AgentTaskRow({ agent, process, defaultsByTaskType, onChange }: {
  agent: ProcessParticipant;
  process: BusinessProcess;
  defaultsByTaskType: Record<string, TaskModelDefault>;
  onChange: (next: TaskSizingConfig) => void;
}) {
  const cfg = agent.taskSizing ?? { modelHfId: "" };
  const callsPerCase = agent.callsPerCase ?? 0;
  const result = resolveAgentSizing(process, agent, defaultsByTaskType);

  function set(patch: Partial<TaskSizingConfig>) {
    onChange({ ...cfg, ...patch });
  }

  return (
    <tr className="align-top" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Agent */}
      <td className="px-4 py-3 w-44">
        <div className="font-semibold text-white/90 text-sm leading-tight">{agent.name || "Unnamed agent"}</div>
        {agent.role && <div className="text-[11px] text-white/30 leading-tight mt-0.5">{agent.role}</div>}
        <div className="text-[10px] text-white/25 leading-tight mt-0.5">{fmt(callsPerCase, 2)} calls/case</div>
      </td>

      {/* Model */}
      <td className="px-3 py-3 w-48">
        <select value={cfg.modelHfId} onChange={e => set({ modelHfId: e.target.value })} className={cellInput} style={inputStyle}>
          <option value="">Select a model…</option>
          {modelCatalog.map(m => <option key={m.hfId} value={m.hfId}>{m.name}</option>)}
        </select>
      </td>

      {/* Required Concurrency (computed via Little's Law) */}
      <td className="px-3 py-3 w-52">
        {result.requiredConcurrency != null ? (
          <>
            <span className="font-mono text-sm font-semibold text-[#22d3ee]">{result.requiredConcurrency}</span>
            <div className="text-[10px] text-white/25 mt-0.5 leading-snug">
              {fmt(result.callsPerDay, 0)} calls/day ({fmt(result.callsPerSec, 2)}/sec) × {result.latencySec}s {result.taskType} latency
            </div>
          </>
        ) : (
          <span className="text-xs text-white/25">
            {agent.role ? `No task-latency configured for "${agent.role}"` : "Set the agent's role to a known task type"}
          </span>
        )}
      </td>

      {/* Configured Concurrency (editable override, defaults to required + 20% buffer) */}
      <td className="px-3 py-3 w-32">
        <input
          type="number" min={0} value={result.configuredConcurrency}
          onChange={e => set({ configuredConcurrency: Number(e.target.value) || 0 })}
          className={cellInput} style={inputStyle}
        />
        {result.requiredConcurrency != null && (
          <div className="text-[10px] text-white/25 mt-0.5">+{Math.round(CONCURRENCY_BUFFER * 100)}% buffer</div>
        )}
      </td>

      {/* Silicon */}
      <td className="px-3 py-3 w-36">
        <select
          value={result.silicon}
          onChange={e => set({ silicon: e.target.value as SiliconOption })}
          className={cellInput} style={inputStyle}
        >
          <option value="" disabled>Select silicon…</option>
          {SILICON_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>

      {/* Silicon Units Needed (configured concurrency ÷ unit concurrency from Models > Defaults) */}
      <td className="px-3 py-3 w-28">
        {result.siliconUnitsNeeded != null ? (
          <>
            <span className="font-mono text-sm font-semibold text-white/90">{result.siliconUnitsNeeded}</span>
            <div className="text-[10px] text-white/25 mt-0.5 leading-snug">{result.unitConcurrency}/unit</div>
          </>
        ) : (
          <span className="text-xs text-white/25">No unit concurrency in Defaults</span>
        )}
      </td>
    </tr>
  );
}

// ── page-level view ───────────────────────────────────────────────────────────────

const COLS = 6;

export function AgentTaskSizingView({ businessProcesses, defaultsByTaskType, onChange }: {
  businessProcesses: BusinessProcess[];
  defaultsByTaskType: Record<string, TaskModelDefault>;
  onChange: (next: BusinessProcess[]) => void;
}) {
  const processesWithAgents = businessProcesses.filter(p => p.agents.length > 0);

  function updateAgentSizing(processId: string, agentId: string, taskSizing: TaskSizingConfig) {
    onChange(businessProcesses.map(p => p.id !== processId ? p : {
      ...p,
      agents: p.agents.map(a => a.id !== agentId ? a : { ...a, taskSizing }),
    }));
  }

  if (businessProcesses.length === 0) {
    return (
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm">No business processes defined yet for this project.</p>
          <p className="text-white/30 text-xs mt-2">Add business processes and their agents on the Agents tab of the Agentic Stack page first.</p>
        </div>
      </section>
    );
  }

  if (processesWithAgents.length === 0) {
    return (
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm">No agents added to any business process yet.</p>
          <p className="text-white/30 text-xs mt-2">Add agents on the Agents tab of the Agentic Stack page, then come back here to map them to models.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <p className="mb-4 text-sm text-white/40">
        Required concurrency is derived from each business process&rsquo;s cases/day and each agent&rsquo;s calls/case
        (giving calls/sec) applied to that task type&rsquo;s latency via Little&rsquo;s Law (concurrency = calls/sec ×
        latency). Configured concurrency defaults to required concurrency plus a {Math.round(CONCURRENCY_BUFFER * 100)}%
        buffer, and — divided by how much concurrency one unit of the assigned silicon serves (Models &gt; Defaults) —
        gives the silicon units needed. Every value here can be overridden per agent.
      </p>
      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Agent</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Model</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Required Concurrency</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Configured Concurrency</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Silicon</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Silicon Units</th>
              </tr>
            </thead>
            <tbody>
              {processesWithAgents.map(process => (
                <Fragment key={process.id}>
                  <ProcessGroupHeader process={process} colSpan={COLS} />
                  {process.agents.map(agent => (
                    <AgentTaskRow
                      key={agent.id} agent={agent} process={process} defaultsByTaskType={defaultsByTaskType}
                      onChange={taskSizing => updateAgentSizing(process.id, agent.id, taskSizing)}
                    />
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/25 leading-relaxed">
        Task-type latency, default silicon, and unit concurrency come from the Models &gt; Defaults tab (falling back
        to built-in values if a task type isn&rsquo;t configured there) — a task type is resolved from each
        agent&rsquo;s role, set on the Agents tab.
      </p>
    </section>
  );
}
