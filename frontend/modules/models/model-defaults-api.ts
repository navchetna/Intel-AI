/** API client for the global task-type default-model mapping (app-wide, not project-scoped). */

import { settings } from "@/config/settings";
import type { TaskModelDefault } from "./data";

const BASE = "/model-defaults";

function apiUrl(path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}${BASE}${path}`;
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

export async function fetchModelDefaults(): Promise<TaskModelDefault[]> {
  const res = await fetch(apiUrl(""), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createModelDefault(taskType: string, modelName: string): Promise<TaskModelDefault> {
  const res = await fetch(apiUrl(""), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_type: taskType, model_name: modelName }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateModelDefault(
  id: number,
  patch: {
    task_type?: string; model_name?: string; latency_sec?: number; silicon?: string; default_concurrency?: number;
    requests_per_day?: number; processing_window_hrs?: number;
  },
): Promise<TaskModelDefault> {
  const res = await fetch(apiUrl(`/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteModelDefault(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
