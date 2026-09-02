/** API client for the Implementation Workflow extractor — reads a project's documents, notes,
 *  and discussion log and asks an LLM (via GROQ) to write up an implementation approach for one
 *  business process. */

import { settings } from "@/config/settings";

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return res.statusText;
  }
}

export async function extractImplementationWorkflow(
  projectId: number, businessProcessName: string, description: string
): Promise<{ content: string }> {
  const res = await fetch(
    `${settings.apiBaseUrl}${settings.apiPrefix}/projects/${projectId}/business-processes/extract-implementation-workflow`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_process_name: businessProcessName, description }),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
