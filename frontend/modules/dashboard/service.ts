import { dashboardApi } from "./api";
import type { Item } from "./types";

/**
 * Dashboard business logic.
 *
 * Orchestrates the data layer and shapes it for the UI. Components and routes
 * call this, never `api.ts` or `fetch` directly.
 */
export interface DashboardData {
  items: Item[];
  error: string | null;
}

export async function loadDashboard(): Promise<DashboardData> {
  try {
    const items = await dashboardApi.listItems();
    return { items, error: null };
  } catch (e) {
    return {
      items: [],
      error: e instanceof Error ? e.message : "Failed to load items",
    };
  }
}
