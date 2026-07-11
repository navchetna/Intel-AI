/**
 * Deployment path prefix — the single configurable URL prefix for the app.
 *
 * Next.js's `basePath` (see next.config.ts) already prefixes every route,
 * `next/link`, `next/router`, `next/image` and static asset with this value.
 * Plain `<a href>` full-page anchors are the ONLY thing Next does not rewrite,
 * so those must be built with `withBase()` to carry the prefix. Keep this in
 * sync with `NEXT_PUBLIC_BASE_PATH` used by next.config.ts.
 *
 * Set NEXT_PUBLIC_BASE_PATH="" for local development (served at the root).
 */
const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/intel-ai").trim().replace(/\/+$/, "");
export const BASE_PATH =
  !rawBasePath || rawBasePath === "/"
    ? ""
    : rawBasePath.startsWith("/")
      ? rawBasePath
      : `/${rawBasePath}`;

/** Prefix an app-internal path with the deployment base path. */
export function withBase(path: string): string {
  if (!BASE_PATH) return path.startsWith("/") ? path : `/${path}`;
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${suffix}`;
}
