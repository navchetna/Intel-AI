import { apiClient } from "@/lib/api/client";

/**
 * Shared / system endpoint registry.
 *
 * Only cross-cutting endpoints that don't belong to any single feature live
 * here (e.g. health). Feature-specific data access belongs in that feature's
 * module, e.g. `frontend/modules/<name>/api.ts`.
 */

export interface HealthResponse {
  status: string;
  service: string;
}

export interface VisitCount {
  count: number;
}

export const endpoints = {
  health: {
    get: () => apiClient.get<HealthResponse>("/health"),
  },
  visits: {
    get: () => apiClient.get<VisitCount>("/visits"),
    record: () => apiClient.post<VisitCount>("/visits", {}),
  },
};
