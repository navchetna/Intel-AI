import { apiClient } from "@/lib/api/client";
import type { Item, ItemCreate } from "./types";

/**
 * Dashboard data-access layer (core).
 *
 * Wraps the shared transport (`lib/api/client`) with this module's endpoints.
 * Keep raw HTTP here; business rules live in `service.ts`.
 */
export const dashboardApi = {
  listItems: () => apiClient.get<Item[]>("/items"),
  getItem: (id: number) => apiClient.get<Item>(`/items/${id}`),
  createItem: (data: ItemCreate) => apiClient.post<Item>("/items", data),
  removeItem: (id: number) => apiClient.delete<void>(`/items/${id}`),
};
