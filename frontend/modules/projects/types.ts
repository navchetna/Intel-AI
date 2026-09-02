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

/** One agent proposed by the AI-Suggested-Flow generator for a business process. */
export interface SuggestedAgent {
  name: string;
  task_type: string;
  description: string;
}

/** One human checkpoint proposed by the AI-Suggested-Flow generator. */
export interface SuggestedHumanCheck {
  name: string;
  role: string;
  description: string;
}

/** One step in the AI-suggested end-to-end flow — `name` matches an entry in `agents` or `humans`. */
export interface SuggestedFlowStep {
  step: number;
  actor: "agent" | "human";
  name: string;
  description: string;
}

/** One generation of the AI-Suggested-Flow — either the initial proposal (`prompt` undefined) or a
 *  regeneration nudged by a specific piece of customer-consultation feedback (`prompt` set). Kept so
 *  it survives reloads instead of being re-generated (an LLM call) on every visit. */
export interface AiSuggestedFlow {
  id: string;
  prompt?: string;
  agents: SuggestedAgent[];
  humans: SuggestedHumanCheck[];
  flow: SuggestedFlowStep[];
  generatedAt: string;
}

/** The persisted result of the last Implementation Workflow extraction for a business process —
 *  Markdown content generated from the project's documents, notes, and discussion log. */
export interface ImplementationWorkflow {
  content: string;
  generatedAt: string;
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
  /** On-demand LLM-generated suggestion for this process's agent/human flow — undefined until the
   *  user clicks "Generate" on the AI-Suggested-Flow tab. */
  aiSuggestedFlow?: AiSuggestedFlow;
  /** Prior generations, most recent first — pushed here right before `aiSuggestedFlow` is
   *  overwritten by a regeneration, so a nudge that didn't land can be reverted or deleted. */
  aiSuggestedFlowHistory?: AiSuggestedFlow[];
  /** On-demand LLM-extracted implementation write-up — undefined until the user clicks "Extract"
   *  on the Implementation Workflow tab. */
  implementationWorkflow?: ImplementationWorkflow;
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

/** A free-text note attached to a project (see modules/projects/notes-api.ts). */
export interface ProjectNote {
  id: number;
  project_id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

/** One message in a project's flat discussion log — no threading, no auth (see
 *  modules/projects/discussions-api.ts). */
export interface ProjectDiscussionMessage {
  id: number;
  project_id: number;
  author: string;
  message: string;
  created_at: string;
}
