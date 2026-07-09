/** API access + auth-token storage for the inference benchmarks feature. */

import { settings } from "@/config/settings";
import type {
  BenchmarkFilters,
  BulkUploadResponse,
  ChartsResponse,
  LoginResponse,
  RecordsResponse,
} from "./types";

const BASE = "/inference-benchmarks";
const TOKEN_KEY = "ib_token";
const USER_KEY = "ib_user";

function apiUrl(path: string): string {
  return `${settings.apiBaseUrl}${settings.apiPrefix}${BASE}${path}`;
}

// --- Auth token storage (browser-only) ---------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function setAuth(token: string, username: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, username);
}

export function clearAuth(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
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

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function filterParams(filters: BenchmarkFilters): string {
  const params = new URLSearchParams();
  if (filters.model.trim()) params.set("model", filters.model.trim());
  if (filters.input_tokens) params.set("input_tokens", filters.input_tokens);
  if (filters.output_tokens) params.set("output_tokens", filters.output_tokens);
  if (filters.batch_size) params.set("batch_size", filters.batch_size);
  if (filters.platform) params.set("platform", filters.platform);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

// --- Public reads -------------------------------------------------------------

export async function fetchRecords(filters: BenchmarkFilters): Promise<RecordsResponse> {
  const res = await fetch(apiUrl(`/records${filterParams(filters)}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchCharts(filters: BenchmarkFilters): Promise<ChartsResponse> {
  const res = await fetch(apiUrl(`/charts${filterParams(filters)}`), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchPlatforms(): Promise<string[]> {
  const res = await fetch(apiUrl("/platforms"), { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// --- Auth + admin -------------------------------------------------------------

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createUser(username: string, password: string): Promise<void> {
  const res = await fetch(apiUrl("/auth/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function bulkUpload(rows: Record<string, unknown>[]): Promise<BulkUploadResponse> {
  const res = await fetch(apiUrl("/records/bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
