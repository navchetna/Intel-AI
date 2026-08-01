/** API client for a project's document attachments. Files live on the backend's
 *  local disk; these calls only ever exchange metadata + file bytes, never a path. */

import { settings } from "@/config/settings";
import type { ProjectDocument } from "./types";

function apiUrl(projectId: number, path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}/projects/${projectId}/documents${path}`;
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

export async function fetchDocuments(projectId: number): Promise<ProjectDocument[]> {
  const res = await fetch(apiUrl(projectId, ""), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function uploadDocument(projectId: number, title: string, file: File): Promise<ProjectDocument> {
  const form = new FormData();
  form.append("title", title);
  form.append("file", file);
  const res = await fetch(apiUrl(projectId, ""), { method: "POST", body: form });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteDocument(projectId: number, documentId: number): Promise<void> {
  const res = await fetch(apiUrl(projectId, `/${documentId}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}

/** URL that streams the file back inline — safe to use directly as an <iframe src> or link href. */
export function documentFileUrl(projectId: number, documentId: number): string {
  return apiUrl(projectId, `/${documentId}/file`);
}
