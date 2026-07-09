/**
 * Deployment path prefix.
 *
 * The app is reverse-proxied under `/intel-ai/` and the proxy STRIPS the prefix
 * before forwarding, so Next.js runs at the root and cannot use `basePath`.
 * Internal navigation therefore uses full-page links built with `withBase()` so
 * the browser keeps the `/intel-ai` prefix — a full load of `/intel-ai/<route>`
 * is stripped back to `/<route>` and served by Next. Keep this in sync with the
 * nginx `location` and `assetPrefix` in next.config.ts.
 */
export const BASE_PATH = "/intel-ai";

/** Prefix an app-internal path with the deployment base path. */
export function withBase(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${suffix}`;
}
