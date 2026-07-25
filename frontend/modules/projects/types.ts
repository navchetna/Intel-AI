import type { AnyInputs } from "@/modules/agentic-ai/sizing-calcs";

export interface ModelSizingConfig {
  ttftMs: number;
  tokensPerSec: number;
  configKey: string;
  quant: string;
}

/** The full payload persisted per project — mirrors both sizing surfaces' working state. */
export interface ProjectData {
  agenticStack: {
    selectedWorkloads: string[];
    sizingInputs: Record<string, AnyInputs>;
  };
  models: {
    selectedModels: string[];
    modelSizing: Record<string, ModelSizingConfig>;
  };
}

export const EMPTY_PROJECT_DATA: ProjectData = {
  agenticStack: { selectedWorkloads: [], sizingInputs: {} },
  models: { selectedModels: [], modelSizing: {} },
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
