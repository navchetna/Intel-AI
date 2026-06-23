/**
 * Application-level settings.
 *
 * Centralizes runtime configuration so feature modules never hardcode values.
 * Override via environment variables (NEXT_PUBLIC_*) at build/run time.
 */
export const settings = {
  appName: "Intel-AI",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  apiPrefix: "/api",
} as const;

export type Settings = typeof settings;
