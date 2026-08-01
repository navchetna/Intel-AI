import type { AnyInputs } from "@/modules/agentic-ai/sizing-calcs";

export interface ModelSizingConfig {
  ttftMs: number;
  tokensPerSec: number;
  configKey: string;
  quant: string;
}

/** Fixed silicon options an agent's task can be sized onto — see task-sizing-calcs.ts for
 *  which one each task type defaults to. */
export type SiliconOption = "32c*6737P" | "64c*6767P" | "B70x2" | "CRIx1";

/** How an agent's task maps onto an LLM and the silicon it runs on — the basis for sizing the
 *  LLM layer on the Tasks page. Required concurrency itself is *not* stored here — it's derived
 *  live from the business process's `casesPerDay`/`peakHoursPerDay`, the agent's `callsPerCase`,
 *  and the task-type latency table (see task-sizing-calcs.ts), so it never goes stale when those
 *  inputs change. `latencySec`, `configuredConcurrency`, and `silicon` are Presales-architect
 *  overrides of computed defaults; left unset they just display the computed value. */
export interface TaskSizingConfig {
  modelHfId: string;
  latencySec?: number;
  configuredConcurrency?: number;
  silicon?: SiliconOption;
}

/** A single agent or human co-worker participating in a business process. Free-form — not tied to the Stack tab's tool/workload catalog.
 *  `taskSizing` and `callsPerCase` only apply to agents. `callsPerCase` is a manually-entered sizing input today (how many
 *  times this agent is invoked per case handled) — a placeholder for a future LLM-estimated value that a Presales
 *  architect can still override, so for now the manual entry *is* the override slot. */
export interface ProcessParticipant {
  id: string;
  name: string;
  role: string;
  callsPerCase?: number;
  taskSizing?: TaskSizingConfig;
}

/** A business process being modernized with agents, plus who (agents + humans) works it and how they collaborate.
 *  `casesPerDay` is the expected daily case volume for this process. `peakHoursPerDay` is how many
 *  of those 24 hours the daily volume is assumed to land in (default 24 — even spread; reducing it
 *  concentrates the same daily volume into a shorter peak window, raising peak calls/sec). Together
 *  with each agent's `callsPerCase`, these are the basis for sizing the LLM layer underneath (see
 *  the Tasks page's Agent Task Sizing tab). */
export interface BusinessProcess {
  id: string;
  name: string;
  description: string;
  casesPerDay: number;
  peakHoursPerDay: number;
  agents: ProcessParticipant[];
  humans: ProcessParticipant[];
  collaboration: string;
}

/** One row of the project's key sizing parameters table (e.g. peak concurrent users, annual ingestion). */
export interface KeySizingParameter {
  id: string;
  parameter: string;
  value: string;
  implication: string;
}

/** Editable project overview: free-text description plus the key sizing parameters that drive the
 *  stack/sizing decisions further down the page. */
export interface ProjectOverview {
  description: string;
  keyParameters: KeySizingParameter[];
}

/** The full payload persisted per project — mirrors every sizing/description surface's working state. */
export interface ProjectData {
  overview: ProjectOverview;
  agenticStack: {
    selectedWorkloads: string[];
    sizingInputs: Record<string, AnyInputs>;
  };
  models: {
    selectedModels: string[];
    modelSizing: Record<string, ModelSizingConfig>;
  };
  agents: {
    businessProcesses: BusinessProcess[];
  };
}

export const EMPTY_PROJECT_DATA: ProjectData = {
  overview: { description: "", keyParameters: [] },
  agenticStack: { selectedWorkloads: [], sizingInputs: {} },
  models: { selectedModels: [], modelSizing: {} },
  agents: { businessProcesses: [] },
};

export interface ProjectSummary {
  id: number;
  name: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  data: ProjectData;
  created_at: string;
  updated_at: string;
}

/** A document attached to a project. The file itself lives on the backend's local disk;
 *  this is the DB-persisted reference to it (see modules/projects/documents-api.ts). */
export interface ProjectDocument {
  id: number;
  project_id: number;
  title: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}
