"use client";

import { useMemo } from "react";
import { models as modelCatalog, type TaskModelDefault } from "@/modules/models/data";
import {
  buildAgentModelServingRows, cardsForSiliconUnits, socketsForSiliconUnits,
  isAcceleratorSilicon, systemsCompositionCaption, socketsCaption, taskTypeForRole,
  type AgentModelServingRow,
} from "./task-sizing-calcs";
import type { BusinessProcess } from "@/modules/projects/types";

interface ServingRow extends AgentModelServingRow {
  modelName: string;
  sockets: number;
  b70Cards: number;
  criCards: number;
  hasAccelerator: boolean;
}

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function buildServingRows(businessProcesses: BusinessProcess[], defaultsByTaskType: Record<string, TaskModelDefault>) {
  const { rows: baseRows, grandUnits, grandSystems, gapTotal, unassignedAgents } =
    buildAgentModelServingRows(businessProcesses, defaultsByTaskType);

  const rows: ServingRow[] = baseRows.map(row => {
    const sockets = Object.entries(row.unitsBySilicon)
      .reduce((sum, [silicon, units]) => sum + socketsForSiliconUnits(silicon, units), 0);
    const b70Cards = cardsForSiliconUnits("B70x2", row.unitsBySilicon["B70x2"] ?? 0);
    const criCards = cardsForSiliconUnits("CRIx1", row.unitsBySilicon["CRIx1"] ?? 0);
    return {
      ...row,
      modelName: modelCatalog.find(m => m.hfId === row.modelHfId)?.name ?? row.modelHfId,
      sockets, b70Cards, criCards,
      hasAccelerator: Object.keys(row.unitsBySilicon).some(isAcceleratorSilicon),
    };
  });

  const cpuCount = rows.reduce((sum, r) => sum + r.sockets, 0);
  const criCount = rows.reduce((sum, r) => sum + r.criCards, 0);
  const b70Count = rows.reduce((sum, r) => sum + r.b70Cards, 0);

  return { rows, grandUnits, grandSystems, gapTotal, unassignedAgents, cpuCount, criCount, b70Count };
}

/** Aggregates each agent's silicon-units-needed (see task-sizing-calcs.ts) by model, across every
 *  business process in the project — the scale-out unit count to deploy per model. */
export function ModelServingView({ businessProcesses, defaultsByTaskType }: {
  businessProcesses: BusinessProcess[];
  defaultsByTaskType: Record<string, TaskModelDefault>;
}) {
  const { rows, grandSystems, gapTotal, unassignedAgents, cpuCount, criCount, b70Count } = useMemo(
    () => buildServingRows(businessProcesses, defaultsByTaskType),
    [businessProcesses, defaultsByTaskType],
  );

  // Distinct task types (from the fixed TASK_TYPES vocabulary) across every agent in the
  // project — same metric as the Business Process page's dashboard, for consistency.
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

  if (rows.length === 0) {
    return (
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm">No agents with a model assigned yet.</p>
          <p className="text-white/30 text-xs mt-2">Assign models to agents on the Tasks tab, then come back here for the deployment summary.</p>
        </div>
      </section>
    );
  }

  const tiles: { label: string; value: string; accent: string }[] = [
    { label: "Agents covered", value: fmtInt(rows.reduce((s, r) => s + r.agentCount, 0)), accent: "56,189,248" },
    { label: "Tasks to execute", value: fmtInt(taskTypeCount), accent: "34,211,153" },
    { label: "Models to serve", value: fmtInt(rows.length), accent: "129,140,248" },
    { label: "Total systems to deploy", value: fmtInt(grandSystems), accent: "52,211,153" },
    { label: "Sockets", value: fmtInt(cpuCount), accent: "94,234,212" },
    { label: "B70", value: fmtInt(b70Count), accent: "251,146,60" },
    { label: "CRI", value: fmtInt(criCount), accent: "248,113,113" },
  ];

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      {/* ── summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {tiles.map(t => (
          <div key={t.label} className="rounded-xl p-4" style={{ background: `rgba(${t.accent},0.08)`, border: `1px solid rgba(${t.accent},0.2)` }}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{t.label}</span>
            <div className="text-2xl font-extrabold mt-0.5" style={{ color: `rgb(${t.accent})` }}>{t.value}</div>
          </div>
        ))}
      </div>

      {(gapTotal > 0 || unassignedAgents > 0) && (
        <p className="mb-4 text-[11px] leading-relaxed" style={{ color: "#fbbf24" }}>
          {unassignedAgents > 0 && `${unassignedAgents} agent${unassignedAgents === 1 ? "" : "s"} have no model assigned yet (excluded from the totals below). `}
          {gapTotal > 0 && `${gapTotal} agent${gapTotal === 1 ? "" : "s"} are missing a unit-concurrency value in Agents > Task-Type-Model-Mapping for their task type, so their units aren't counted.`}
        </p>
      )}

      <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Model</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Agents</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Concurrency</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Silicon</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Units to deploy</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Systems to deploy</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Sockets</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">B70</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">CRI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.modelHfId} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white/90 text-sm leading-tight">{row.modelName}</div>
                    <div className="text-[11px] text-white/30 font-mono">{row.modelHfId}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-white/70">
                    {row.agentCount}{row.gapCount > 0 ? ` (${row.gapCount} not counted)` : ""}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-sm text-white/85">{fmtInt(row.totalConcurrency)}</span>
                  </td>
                  <td className="px-3 py-3 text-white/70 text-xs">
                    {Object.keys(row.unitsBySilicon).length > 0 ? Object.keys(row.unitsBySilicon).join(", ") : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-base font-bold" style={{ color: "#22d3ee" }}>{fmtInt(row.totalUnits)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-base font-bold" style={{ color: "#34d399" }}>{fmtInt(row.systemsToDeploy)}</span>
                    <div className="text-[10px] text-white/35 mt-0.5 leading-snug">
                      {systemsCompositionCaption(row.unitsBySilicon)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-sm text-white/85">{fmtInt(row.sockets)}</span>
                    {row.hasAccelerator && (
                      <div className="text-[10px] text-white/35 mt-0.5 leading-snug">
                        {socketsCaption(row.unitsBySilicon)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 font-mono text-sm text-white/85">{row.b70Cards > 0 ? fmtInt(row.b70Cards) : "—"}</td>
                  <td className="px-3 py-3 font-mono text-sm text-white/85">{row.criCards > 0 ? fmtInt(row.criCards) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
