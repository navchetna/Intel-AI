/** Public surface of the dashboard module. Routes import from here only. */
export * from "./types";
export { dashboardApi } from "./api";
export { loadDashboard, type DashboardData } from "./service";
export { ItemList } from "./components/ItemList";
