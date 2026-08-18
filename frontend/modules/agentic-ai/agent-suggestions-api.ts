/** API client for on-demand AI-Suggested-Flow generation (GROQ call happens server-side). */

import { settings } from "@/config/settings";

const BASE = "/agent-suggestions";

function apiUrl(path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}${BASE}${path}`;
}

export interface SuggestedAgent {
  name: string;
  task_type: string;
  description: string;
}

export interface SuggestedHumanCheck {
  name: string;
  role: string;
  description: string;
}

export interface SuggestedFlowStep {
  step: number;
  actor: "agent" | "human";
  name: string;
  description: string;
}

export interface AgentSuggestions {
  agents: SuggestedAgent[];
  humans: SuggestedHumanCheck[];
  flow: SuggestedFlowStep[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return res.statusText;
  }
}

export async function generateAgentSuggestions(input: {
  business_process_name: string;
  description: string;
  reference_text: string;
}): Promise<AgentSuggestions> {
  const res = await fetch(apiUrl("/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
