/** API client for a project's discussion log — a flat, unthreaded message list. */

import { settings } from "@/config/settings";
import type { ProjectDiscussionMessage } from "./types";

function apiUrl(projectId: number, path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}/projects/${projectId}/discussions${path}`;
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

export async function fetchDiscussionMessages(projectId: number): Promise<ProjectDiscussionMessage[]> {
  const res = await fetch(apiUrl(projectId, ""), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function postDiscussionMessage(
  projectId: number, author: string, message: string
): Promise<ProjectDiscussionMessage> {
  const res = await fetch(apiUrl(projectId, ""), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author, message }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteDiscussionMessage(projectId: number, messageId: number): Promise<void> {
  const res = await fetch(apiUrl(projectId, `/${messageId}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
