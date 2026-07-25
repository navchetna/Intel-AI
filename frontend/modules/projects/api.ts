/** API client for the projects module. */

import { settings } from "@/config/settings";
import type { Project, ProjectData, ProjectSummary } from "./types";

const BASE = "/projects";

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

export async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch(apiUrl(""), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchProject(id: number): Promise<Project> {
  const res = await fetch(apiUrl(`/${id}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createProject(name: string, data: ProjectData): Promise<Project> {
  const res = await fetch(apiUrl(""), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateProjectData(id: number, data: ProjectData): Promise<Project> {
  const res = await fetch(apiUrl(`/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteProject(id: number): Promise<void> {
  const res = await fetch(apiUrl(`/${id}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
