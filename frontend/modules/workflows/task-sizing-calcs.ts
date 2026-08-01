// LLM task sizing for an agent within a business process, driven by call volume rather than an
// uploaded-benchmark SLA match: each task type (what kind of work the agent does) has a measured
// latency and a default silicon target. Given how often the business process happens (cases/day,
// compressed into `peakHoursPerDay`) and how many times this agent fires per case (calls/case),
// Little's Law (L = λ × W — concurrency = arrival rate × time-in-system) gives the concurrency
// this agent's task actually needs to sustain. A 20% buffer turns that into a configured
// concurrency, which — divided by how much concurrency one unit of the task type's silicon can
// serve (from the Models > Defaults tab) — gives the number of silicon units to deploy.

import type { TaskModelDefault } from "@/modules/models/data";
import type { BusinessProcess, ProcessParticipant, SiliconOption } from "@/modules/projects/types";

export const SILICON_OPTIONS: SiliconOption[] = ["32c*6737P", "64c*6767P", "B70x2", "CRIx1"];

/** Physical GPU/accelerator cards one unit of a given silicon represents — 0 for CPU-only silicon. */
export function cardsForSiliconUnits(silicon: string, units: number): number {
  if (silicon === "CRIx1") return units;
  if (silicon === "B70x2") return units * 2;
  return 0;
}

// Physical packaging: how many silicon units bundle into one dual-socket 6737P server.
// CRIx1 = 1 CRI card/unit, 4 cards share 2 host CPUs (a full 2-socket server on its own).
// B70x2 = 2 B70 cards/unit, 4 cards share 1 host CPU (so 2 units of host-CPU-groups fill a server).
// 32c*6767P / 64c*6767P units are themselves single sockets — 2 sockets make a server.
export function socketsForSiliconUnits(silicon: string, units: number): number {
  if (units <= 0) return 0;
  if (silicon === "CRIx1") {
    const cards = Math.ceil(units / 4) * 4;
    return (cards / 4) * 2;
  }
  if (silicon === "B70x2") {
    const cards = units * 2;
    const roundedCards = Math.ceil(cards / 4) * 4;
    return roundedCards / 4;
  }
  return units;
}

/** One deployable "system": for CRI/B70, the exact host+card group the packaging rule already
 *  describes (4 CRI cards + 2 sockets, or 4 B70 cards + 1 socket) — no further pairing. For
 *  CPU-only silicon (the sockets ARE the serving silicon), a system is 2 sockets. */
export function systemsForSiliconUnits(silicon: string, units: number): number {
  if (units <= 0) return 0;
  if (silicon === "CRIx1") {
    const cards = Math.ceil(units / 4) * 4;
    return cards / 4;
  }
  if (silicon === "B70x2") {
    const cards = units * 2;
    const roundedCards = Math.ceil(cards / 4) * 4;
    return roundedCards / 4;
  }
  return Math.ceil(units / 2);
}

export function isAcceleratorSilicon(silicon: string): boolean {
  return silicon === "CRIx1" || silicon === "B70x2";
}

/** Light-grey composition caption for a Systems-to-deploy value: what one deployable system is
 *  actually made of, for whichever silicon type(s) are present. */
export function systemsCompositionCaption(unitsBySilicon: Record<string, number>): string {
  const parts: string[] = [];
  if ("CRIx1" in unitsBySilicon) parts.push("32c*6737Px2 + CRIx4");
  if ("B70x2" in unitsBySilicon) parts.push("32c*6737Px1 + B70x4");
  for (const silicon of Object.keys(unitsBySilicon)) {
    if (!isAcceleratorSilicon(silicon)) parts.push(`${silicon}x2`);
  }
  return parts.join(" · ");
}

/** Light-grey caption for a Sockets value: which host CPU(s) these sockets are, for whichever
 *  accelerator silicon(s) are present. Empty when there's no accelerator (plain CPU sockets). */
export function socketsCaption(unitsBySilicon: Record<string, number>): string {
  const parts: string[] = [];
  if ("CRIx1" in unitsBySilicon) parts.push("HeadNode - 2x6737P");
  if ("B70x2" in unitsBySilicon) parts.push("HeadNode - 1x6737P");
  return parts.join(" · ");
}

interface TaskTypeSizing {
  /** Measured time to complete one call of this task type, in seconds. */
  latencySec: number;
  /** Silicon this task type is sized against by default. */
  silicon: SiliconOption;
}

/** The full task-type vocabulary (mirrors the Models > Defaults tab's task types), in display order. */
export const TASK_TYPES: string[] = [
  "OCR", "Classification", "Link/Cross-Reference", "Process", "Reason", "Generate",
  "Embedding", "Re-Ranking", "Guardrail", "PII",
];

/** Fallback task type -> (latency, default silicon), used only when the Models > Defaults tab
 *  has no row (or no latency/silicon set) for that task type. */
export const TASK_TYPE_LATENCY: Record<string, TaskTypeSizing> = {
  "OCR":                  { latencySec: 120, silicon: "64c*6767P" },
  "Classification":       { latencySec: 5,   silicon: "B70x2" },
  "Link/Cross-Reference": { latencySec: 10,  silicon: "B70x2" },
  "Process":              { latencySec: 20,  silicon: "B70x2" },
  "Reason":               { latencySec: 240, silicon: "CRIx1" },
  "Generate":             { latencySec: 120, silicon: "CRIx1" },
  "Re-Ranking":           { latencySec: 2,   silicon: "32c*6737P" },
  "Guardrail":            { latencySec: 2,   silicon: "32c*6737P" },
  "PII":                  { latencySec: 2,   silicon: "32c*6737P" },
  "Embedding":            { latencySec: 1,   silicon: "32c*6737P" },
};

/** An agent's free-form `role` (set on the Agents tab) is normalized to one of the task types
 *  above — the same normalization used to apply the Models > Defaults mapping to agents. */
const ROLE_TO_TASK_TYPE: Record<string, string> = {
  "ocr": "OCR",
  "classification": "Classification",
  "link": "Link/Cross-Reference",
  "link/cross-reference": "Link/Cross-Reference",
  "cross-reference": "Link/Cross-Reference",
  "process": "Process",
  "extract": "Process",
  "reason": "Reason",
  "generate": "Generate",
  "re-ranking": "Re-Ranking",
  "reranking": "Re-Ranking",
  "guardrail": "Guardrail",
  "pii": "PII",
  "embedding": "Embedding",
};

export function taskTypeForRole(role: string): string | null {
  return ROLE_TO_TASK_TYPE[role.trim().toLowerCase()] ?? null;
}

/** Turns the Models > Defaults tab's rows into a task_type -> row lookup. */
export function taskDefaultsByType(defaults: TaskModelDefault[] | null): Record<string, TaskModelDefault> {
  return Object.fromEntries((defaults ?? []).map(d => [d.task_type, d]));
}

/** Default 20% headroom applied on top of required concurrency to get configured concurrency. */
export const CONCURRENCY_BUFFER = 0.2;

export function applyBuffer(requiredConcurrency: number, bufferPct = CONCURRENCY_BUFFER): number {
  return Math.ceil(requiredConcurrency * (1 + bufferPct));
}

export interface ConcurrencyResult {
  callsPerDay: number;
  /** Peak calls/sec — the daily volume compressed into `peakHoursPerDay` hours, not spread over 24. */
  callsPerSec: number;
  taskType: string | null;
  /** Effective latency used for the concurrency calc: an override if given, else the Models > Defaults
   *  row for this task type, else the built-in fallback table. */
  latencySec: number | null;
  defaultSilicon: SiliconOption | null;
  /** How much concurrency one unit of `defaultSilicon` can serve, from the Models > Defaults tab. */
  unitConcurrency: number | null;
  /** Little's Law: ceil(callsPerSec × latencySec). Null if no latency (override or default) is known. */
  requiredConcurrency: number | null;
}

export interface CalcRequiredConcurrencyInput {
  casesPerDay: number;
  callsPerCase: number;
  role: string;
  /** How many of the 24 hours the daily volume is compressed into. Default 24 (even spread). */
  peakHoursPerDay?: number;
  /** Presales-architect override of the task type's latency. */
  latencyOverrideSec?: number;
  /** The Models > Defaults row for this agent's task type, if loaded — takes precedence over
   *  `TASK_TYPE_LATENCY`'s hardcoded fallback for latency and silicon. */
  taskDefault?: TaskModelDefault;
}

/**
 * casesPerDay × callsPerCase → calls/day → peak calls/sec (2dp, calls/day compressed into
 * `peakHoursPerDay` hours instead of spread over a full 24) → required concurrency via Little's Law.
 */
export function calcRequiredConcurrency(input: CalcRequiredConcurrencyInput): ConcurrencyResult {
  const { casesPerDay, callsPerCase, role, peakHoursPerDay = 24, latencyOverrideSec, taskDefault } = input;

  const callsPerDay = casesPerDay * callsPerCase;
  const peakSeconds = Math.max(peakHoursPerDay, 0) * 3600;
  const callsPerSec = peakSeconds > 0 ? Math.round((callsPerDay / peakSeconds) * 100) / 100 : 0;

  const taskType = taskTypeForRole(role);
  const fallback = taskType ? TASK_TYPE_LATENCY[taskType] : undefined;

  const latencySec = latencyOverrideSec ?? taskDefault?.latency_sec ?? fallback?.latencySec ?? null;
  const defaultSilicon = (taskDefault?.silicon as SiliconOption | undefined) ?? fallback?.silicon ?? null;
  const unitConcurrency = taskDefault?.default_concurrency ?? null;

  if (latencySec == null) {
    return { callsPerDay, callsPerSec, taskType, latencySec: null, defaultSilicon, unitConcurrency, requiredConcurrency: null };
  }

  return {
    callsPerDay, callsPerSec, taskType, latencySec, defaultSilicon, unitConcurrency,
    requiredConcurrency: Math.ceil(callsPerSec * latencySec),
  };
}

/** Everything `AgentTaskSizingView` and `ModelServingView` need for one agent, in one place, so
 *  both stay in sync: required/configured concurrency, effective silicon, and how many units of
 *  that silicon are needed to serve the (buffered) configured concurrency. */
export interface AgentSizingResult extends ConcurrencyResult {
  modelHfId: string;
  configuredConcurrency: number;
  silicon: SiliconOption | string;
  siliconUnitsNeeded: number | null;
}

export function resolveAgentSizing(
  process: BusinessProcess,
  agent: ProcessParticipant,
  defaultsByTaskType: Record<string, TaskModelDefault>,
): AgentSizingResult {
  const cfg = agent.taskSizing ?? { modelHfId: "" };
  const taskType = taskTypeForRole(agent.role ?? "");
  const taskDefault = taskType ? defaultsByTaskType[taskType] : undefined;

  const result = calcRequiredConcurrency({
    casesPerDay: process.casesPerDay || 0,
    callsPerCase: agent.callsPerCase ?? 0,
    role: agent.role ?? "",
    peakHoursPerDay: process.peakHoursPerDay || 24,
    latencyOverrideSec: cfg.latencySec,
    taskDefault,
  });

  const configuredConcurrency = cfg.configuredConcurrency
    ?? (result.requiredConcurrency != null ? applyBuffer(result.requiredConcurrency) : 0);
  const silicon = cfg.silicon ?? result.defaultSilicon ?? "";
  const siliconUnitsNeeded = result.unitConcurrency && result.unitConcurrency > 0
    ? Math.ceil(configuredConcurrency / result.unitConcurrency)
    : null;

  return { ...result, modelHfId: cfg.modelHfId, configuredConcurrency, silicon, siliconUnitsNeeded };
}

/** Per-model rollup of silicon units needed, aggregated across every agent in every business
 *  process that uses that model — the scale-out unit/system count to deploy per model. Shared by
 *  the Agent-Model-Serving tab and the Project Summary's Model Serving Sizing / GPU-CPU Summary. */
export interface AgentModelServingRow {
  modelHfId: string;
  unitsBySilicon: Record<string, number>;
  totalUnits: number;
  systemsToDeploy: number;
  agentCount: number;
  /** Sum of every agent's configured concurrency for this model. */
  totalConcurrency: number;
  /** Agents whose silicon units couldn't be computed (missing unit concurrency in Models > Defaults). */
  gapCount: number;
}

export interface AgentModelServingSummary {
  rows: AgentModelServingRow[];
  grandUnits: number;
  grandSystems: number;
  gapTotal: number;
  /** Agents with no model assigned yet — excluded from all rows/totals above. */
  unassignedAgents: number;
}

export function buildAgentModelServingRows(
  businessProcesses: BusinessProcess[],
  defaultsByTaskType: Record<string, TaskModelDefault>,
): AgentModelServingSummary {
  const byModel = new Map<string, AgentModelServingRow>();
  let unassignedAgents = 0;

  for (const process of businessProcesses) {
    for (const agent of process.agents) {
      const result = resolveAgentSizing(process, agent, defaultsByTaskType);
      if (!result.modelHfId) { unassignedAgents++; continue; }

      const row: AgentModelServingRow = byModel.get(result.modelHfId) ?? {
        modelHfId: result.modelHfId, unitsBySilicon: {}, totalUnits: 0, systemsToDeploy: 0,
        agentCount: 0, totalConcurrency: 0, gapCount: 0,
      };

      row.agentCount += 1;
      row.totalConcurrency += result.configuredConcurrency;
      if (result.siliconUnitsNeeded != null && result.silicon) {
        row.totalUnits += result.siliconUnitsNeeded;
        row.unitsBySilicon[result.silicon] = (row.unitsBySilicon[result.silicon] ?? 0) + result.siliconUnitsNeeded;
      } else {
        row.gapCount += 1;
      }

      byModel.set(result.modelHfId, row);
    }
  }

  for (const row of byModel.values()) {
    row.systemsToDeploy = Object.entries(row.unitsBySilicon)
      .reduce((sum, [silicon, units]) => sum + systemsForSiliconUnits(silicon, units), 0);
  }

  const rows = Array.from(byModel.values()).sort((a, b) => b.systemsToDeploy - a.systemsToDeploy);
  const grandUnits = rows.reduce((sum, r) => sum + r.totalUnits, 0);
  const grandSystems = rows.reduce((sum, r) => sum + r.systemsToDeploy, 0);
  const gapTotal = rows.reduce((sum, r) => sum + r.gapCount, 0);
  return { rows, grandUnits, grandSystems, gapTotal, unassignedAgents };
}

/** Request-volume sizing for one Models > Defaults row (used by the Model Catalog's Sizing tab and
 *  the Project Summary's "Embedding, Re-Ranking, Security" section): Little's Law from
 *  requests/day + processing-window gives concurrency, then the same silicon-unit/packaging math
 *  as `resolveAgentSizing` gives silicon units, systems, sockets, and card counts. */
export interface ComputedRequestVolumeRow {
  row: TaskModelDefault;
  requestsPerSec: number | null;
  concurrency: number | null;
  siliconUnits: number | null;
  sockets: number | null;
  systems: number | null;
  b70Cards: number;
  criCards: number;
  hasAccelerator: boolean;
  unitsBySilicon: Record<string, number>;
}

export function computeRequestVolumeRow(row: TaskModelDefault): ComputedRequestVolumeRow {
  const requestsPerSec = row.requests_per_day != null && row.processing_window_hrs != null && row.processing_window_hrs > 0
    ? row.requests_per_day / (row.processing_window_hrs * 3600)
    : null;
  const concurrency = requestsPerSec != null && row.latency_sec != null
    ? Math.ceil(requestsPerSec * row.latency_sec)
    : null;
  const siliconUnits = concurrency != null && row.default_concurrency
    ? Math.ceil(concurrency / row.default_concurrency)
    : null;

  const silicon = row.silicon;
  const hasUnits = siliconUnits != null && !!silicon;
  const sockets = hasUnits ? socketsForSiliconUnits(silicon!, siliconUnits!) : null;
  const systems = hasUnits ? systemsForSiliconUnits(silicon!, siliconUnits!) : null;
  const b70Cards = hasUnits && silicon === "B70x2" ? cardsForSiliconUnits(silicon, siliconUnits!) : 0;
  const criCards = hasUnits && silicon === "CRIx1" ? cardsForSiliconUnits(silicon, siliconUnits!) : 0;
  const unitsBySilicon = hasUnits ? { [silicon!]: siliconUnits! } : {};

  return {
    row, requestsPerSec, concurrency, siliconUnits, sockets, systems, b70Cards, criCards,
    hasAccelerator: !!silicon && isAcceleratorSilicon(silicon),
    unitsBySilicon,
  };
}
