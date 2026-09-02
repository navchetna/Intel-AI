/** API client for a project's notes. */

import { settings } from "@/config/settings";
import type { ProjectNote } from "./types";

function apiUrl(projectId: number, path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}/projects/${projectId}/notes${path}`;
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

export async function fetchNotes(projectId: number): Promise<ProjectNote[]> {
  const res = await fetch(apiUrl(projectId, ""), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createNote(projectId: number, title: string, body: string): Promise<ProjectNote> {
  const res = await fetch(apiUrl(projectId, ""), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateNote(
  projectId: number, noteId: number, patch: { title?: string; body?: string }
): Promise<ProjectNote> {
  const res = await fetch(apiUrl(projectId, `/${noteId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteNote(projectId: number, noteId: number): Promise<void> {
  const res = await fetch(apiUrl(projectId, `/${noteId}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
