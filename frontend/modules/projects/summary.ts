/** Computes the sizing summary for a Project's Agentic Stack + Models selections. Shared by the on-screen Project Summary view and the Excel export, so both always agree. */

import { fetchRecords } from "@/modules/inference/benchmarks/api";
import { allWorkloadIcons } from "@/modules/agentic-ai/layers";
import { SIZING_MAP, defaultInputsFor } from "@/modules/agentic-ai/sizing-wiring";
import { summarizeResources } from "@/modules/agentic-ai/sizing-calcs";
import { models as modelCatalog } from "@/modules/models/data";
import { calcKvCacheGB, calcVramGB, findSlaMatch, groupResourceConfigs } from "@/modules/models/sizing-calcs";
import type { ModelSizingConfig, ProjectData } from "./types";

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
