/** API client for app-wide settings (currently just the GROQ API key used by AI-Suggested-Flow). */

import { settings } from "@/config/settings";

const BASE = "/app-settings";

function apiUrl(): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}${BASE}`;
}

export interface AppSettings {
  groq_api_key_configured: boolean;
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

export async function fetchAppSettings(): Promise<AppSettings> {
  const res = await fetch(apiUrl(), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Pass `""` to clear the key, or omit to leave it unchanged. */
export async function updateAppSettings(patch: { groq_api_key?: string }): Promise<AppSettings> {
  const res = await fetch(apiUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
