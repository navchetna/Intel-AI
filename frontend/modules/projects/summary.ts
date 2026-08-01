/** Computes the sizing summary for a Project's Agentic Stack + Models selections. Shared by the on-screen Project Summary view and the Excel export, so both always agree. */

import { fetchRecords } from "@/modules/inference/benchmarks/api";
import { allWorkloadIcons } from "@/modules/agentic-ai/layers";
import { SIZING_MAP, defaultInputsFor } from "@/modules/agentic-ai/sizing-wiring";
import { summarizeResources, socketsNeeded, systemsNeeded } from "@/modules/agentic-ai/sizing-calcs";
import { models as modelCatalog, type TaskModelDefault } from "@/modules/models/data";
import { calcKvCacheGB, calcVramGB, findSlaMatch, groupResourceConfigs } from "@/modules/models/sizing-calcs";
import {
  buildAgentModelServingRows, cardsForSiliconUnits, computeRequestVolumeRow,
  isAcceleratorSilicon, socketsForSiliconUnits, systemsForSiliconUnits,
  type AgentModelServingRow,
} from "@/modules/workflows/task-sizing-calcs";
import type { ModelSizingConfig, ProjectData } from "./types";

// Core-silicon TDP and per-system power basis — shared by the GPU/CPU Summary table and Rack View.
export const SILICON_TDP_W: Record<string, number> = {
  "CRIx1": 350, "B70x2": 230, "64c*6767P": 350, "32c*6737P": 270, "32c*6530P": 225,
};
export const SYSTEM_POWER_KW: Record<string, number> = {
  "CRIx1": 2.4, "B70x2": 1.6, "64c*6767P": 1.2, "32c*6737P": 1, "32c*6530P": 0.9,
};

export function siliconWithTdp(silicon: string): string {
  const w = SILICON_TDP_W[silicon];
  return w != null ? `${silicon} (${w}W)` : silicon;
}

export function systemPowerCaption(silicon: string): string | null {
  const kw = SYSTEM_POWER_KW[silicon];
  return kw != null ? `${kw}kW/system` : null;
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface AgenticStackSummaryRow {
  workloadId: string;
  workload: string;
  layer: string;
  subLayer: string;
  cores: number | null;
  ramGB: number | null;
  gpuCount: number | null;
  available: boolean;
}

export function buildAgenticStackSummary(data: ProjectData): AgenticStackSummaryRow[] {
  return data.agenticStack.selectedWorkloads.map(id => {
    const loc = allWorkloadIcons.find(w => w.icon.alt === id);
    const tool = SIZING_MAP[id];
    const summary = tool
      ? summarizeResources(tool, data.agenticStack.sizingInputs[id] ?? defaultInputsFor(tool))
      : null;
    return {
      workloadId: id,
      workload: loc?.icon.alt ?? id,
      layer: loc?.layer.title ?? "",
      subLayer: loc?.subLayer?.title ?? "",
      cores: summary ? round(summary.cores) : null,
      ramGB: summary ? round(summary.ramGB) : null,
      gpuCount: summary && summary.gpuCount > 0 ? round(summary.gpuCount) : null,
      available: summary !== null,
    };
  });
}

export interface HarnessSizingSummary {
  workloads: number;
  cores: number;
  sockets: number;
  systems: number;
}

/** Per-workload cores → sockets → systems, summed across every selected Harness workload (each
 *  workload is its own deployment, so sockets/systems are rounded per-row then summed — not
 *  re-rounded on the grand total). B70/CRI aren't tracked for generic infra workloads. */
export function buildHarnessSizingSummary(agenticRows: AgenticStackSummaryRow[]): HarnessSizingSummary {
  let cores = 0, sockets = 0, systems = 0;
  for (const r of agenticRows) {
    const c = r.cores ?? 0;
    cores += c;
    const s = socketsNeeded(c);
    sockets += s;
    systems += systemsNeeded(s);
  }
  return { workloads: agenticRows.length, cores: round(cores), sockets, systems };
}

const DEFAULT_MODEL_CONFIG = (quant: string): ModelSizingConfig => (
  { ttftMs: 500, tokensPerSec: 20, configKey: "", quant }
);

export interface ModelSummaryRow {
  hfId: string;
  model: string;
  ttftMs: number;
  tokensPerSec: number;
  resourceConfigLabel: string;
  concurrency: number | string;
  kvCacheGB: number | string;
  vramGB: number | string;
  totalVramGB: number | string;
  notes: string;
}

export async function buildModelSummary(data: ProjectData): Promise<ModelSummaryRow[]> {
  const rows = await Promise.all(data.models.selectedModels.map(async (hfId): Promise<ModelSummaryRow | null> => {
    const model = modelCatalog.find(m => m.hfId === hfId);
    if (!model) return null;
    const config = data.models.modelSizing[hfId] ?? DEFAULT_MODEL_CONFIG(model.quantization[0] ?? "BF16");

    let concurrency: number | string = "—";
    let kvCacheGB: number | string = "—";
    let vramGB: number | string = "—";
    let totalVramGB: number | string = "—";
    let resourceConfigLabel = "";
    let notes = "";

    try {
      const res = await fetchRecords({
        model: model.hfId, input_tokens: "", output_tokens: "", batch_size: "", platform: "", serving_engine: "",
      });
      const configs = groupResourceConfigs(res.rows);
      const activeConfig = configs.find(c => `${c.platform} ${c.tp} ${c.num_deployments}` === config.configKey) ?? configs[0];
      resourceConfigLabel = activeConfig
        ? `${activeConfig.platform} (tp=${activeConfig.tp ?? "—"} × ${activeConfig.num_deployments ?? "—"})`
        : "";
      const match = activeConfig ? findSlaMatch(activeConfig.records, config.ttftMs, config.tokensPerSec) : null;
      if (match) concurrency = match.concurrency ?? "—";
      else notes = configs.length > 0 ? "No config meets SLA" : "No benchmark data uploaded";

      const hasSpec = model.paramsB != null && model.numLayers != null && model.numKvHeads != null && model.headDim != null;
      if (hasSpec) {
        const vram = calcVramGB(model.paramsB!, config.quant);
        vramGB = round(vram);
        if (match) {
          const kv = calcKvCacheGB(
            model.numLayers!, model.numKvHeads!, model.headDim!,
            match.concurrency ?? 0, (match.input_tokens ?? 0) + (match.output_tokens ?? 0),
          );
          kvCacheGB = round(kv);
          totalVramGB = round(vram + kv);
        }
      } else {
        notes = notes ? `${notes}; spec unavailable` : "Spec unavailable";
      }
    } catch (e) {
      notes = e instanceof Error ? e.message : "Failed to fetch benchmark data";
    }

    return {
      hfId: model.hfId, model: model.name,
      ttftMs: config.ttftMs, tokensPerSec: config.tokensPerSec,
      resourceConfigLabel, concurrency, kvCacheGB, vramGB, totalVramGB, notes,
    };
  }));
  return rows.filter((r): r is ModelSummaryRow => r !== null);
}

/** Per-model agent-serving rollup (silicon units + systems-to-deploy), same source as the Agents
 *  page's Agent-Model-Serving tab — folded into the Project Summary's Model Serving Sizing section. */
export function buildAgentModelServingSummary(data: ProjectData, defaultsByTaskType: Record<string, TaskModelDefault>) {
  return buildAgentModelServingRows(data.agents.businessProcesses, defaultsByTaskType);
}

// Physical meaning of one silicon unit, for the GPU/CPU summary's core counts (CPU-kind rows only).
const SILICON_CORES_PER_SOCKET: Record<string, number> = { "32c*6737P": 32, "64c*6767P": 64 };

export type GpuCpuSource = "Agent Model" | "Embedding/Re-Ranking/Security";

export interface GpuCpuSiliconRow {
  silicon: string;
  kind: "gpu" | "cpu";
  /** Which of the two silicon-driven sizing sources this row came from. */
  source: GpuCpuSource;
  units: number;
  /** Host CPU sockets — head-node sockets for GPU/accelerator silicon, direct-compute sockets for CPU silicon. */
  sockets: number;
  b70Cards: number;
  criCards: number;
  cores: number | null;
  systems: number;
}

export interface GpuCpuSummary {
  bySilicon: GpuCpuSiliconRow[];
  /** Grand totals across all three sizing sources: Harness, Agent Model Serving, and
   *  Embedding/Re-Ranking/Security. */
  totalSystems: number;
  totalSockets: number;
  totalB70: number;
  totalCRI: number;
}

function siliconRowsFor(unitsBySilicon: Record<string, number>, source: GpuCpuSource): GpuCpuSiliconRow[] {
  return Object.entries(unitsBySilicon)
    .map(([silicon, units]) => {
      const coresPerSocket = SILICON_CORES_PER_SOCKET[silicon];
      return {
        silicon,
        kind: (isAcceleratorSilicon(silicon) ? "gpu" : "cpu") as "gpu" | "cpu",
        source,
        units,
        sockets: socketsForSiliconUnits(silicon, units),
        b70Cards: silicon === "B70x2" ? cardsForSiliconUnits(silicon, units) : 0,
        criCards: silicon === "CRIx1" ? cardsForSiliconUnits(silicon, units) : 0,
        cores: coresPerSocket ? units * coresPerSocket : null,
        systems: systemsForSiliconUnits(silicon, units),
      };
    })
    .sort((a, b) => b.units - a.units);
}

/** Combines the Harness infrastructure totals with the agent-model-serving AND request-volume
 *  (Embedding/Re-Ranking/Security) silicon totals — sockets + GPU/accelerator cards, and the
 *  systems those pack into — into one hardware view spanning all three sizing paths. Each source
 *  keeps its own silicon breakdown (sorted by units within the source) rather than merging same-
 *  silicon rows across sources, so "what this system is for" stays unambiguous per row. */
export function buildGpuCpuSummary(
  harness: HarnessSizingSummary,
  agentModelRows: AgentModelServingRow[],
  requestVolumeDefaults: TaskModelDefault[],
): GpuCpuSummary {
  const requestVolumeRows = requestVolumeDefaults.map(computeRequestVolumeRow);

  const agentModelUnitsBySilicon: Record<string, number> = {};
  for (const row of agentModelRows) {
    for (const [silicon, units] of Object.entries(row.unitsBySilicon)) {
      agentModelUnitsBySilicon[silicon] = (agentModelUnitsBySilicon[silicon] ?? 0) + units;
    }
  }
  const requestVolumeUnitsBySilicon: Record<string, number> = {};
  for (const row of requestVolumeRows) {
    for (const [silicon, units] of Object.entries(row.unitsBySilicon)) {
      requestVolumeUnitsBySilicon[silicon] = (requestVolumeUnitsBySilicon[silicon] ?? 0) + units;
    }
  }

  const bySilicon: GpuCpuSiliconRow[] = [
    ...siliconRowsFor(agentModelUnitsBySilicon, "Agent Model"),
    ...siliconRowsFor(requestVolumeUnitsBySilicon, "Embedding/Re-Ranking/Security"),
  ];

  // Each model/task-type row is its own deployment, so systems are summed per-row (already rounded
  // there) rather than re-derived from the combined bySilicon totals above.
  const agentSystems = agentModelRows.reduce((s, r) => s + r.systemsToDeploy, 0)
    + requestVolumeRows.reduce((s, r) => s + (r.systems ?? 0), 0);
  // Sockets include GPU/accelerator head-nodes as well as direct-compute CPU sockets.
  const agentSockets = bySilicon.reduce((s, r) => s + r.sockets, 0);

  const totalB70 = bySilicon.reduce((s, r) => s + r.b70Cards, 0);
  const totalCRI = bySilicon.reduce((s, r) => s + r.criCards, 0);

  return {
    bySilicon,
    totalSystems: harness.systems + agentSystems,
    totalSockets: harness.sockets + agentSockets,
    totalB70, totalCRI,
  };
}
