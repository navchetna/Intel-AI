/**
 * Central navigation registry.
 *
 * Single source of truth for the top-level feature routes. The navbar and the
 * home page both render from this list, and `docs/routes.md` documents how each
 * entry maps to a frontend module and (planned) backend API prefix.
 *
 * To add a route: append an entry here, create `modules/<module>/`, and add a
 * thin route at `app/(modules)/<slug>/page.tsx`.
 */
export interface NavRoute {
  /** URL segment, e.g. "/llm-bench". Matches the route folder name. */
  slug: string;
  /** Label shown in the navbar. */
  label: string;
  /** Frontend feature module folder under `frontend/modules/`. */
  module: string;
  /** Backend API prefix this feature talks to (mounted in api/router.py). */
  apiPrefix: string;
  /**
   * When true, the route is served by a separate container (proxied via
   * next.config rewrites), so the navbar uses a full-page anchor instead of
   * client-side routing.
   */
  external?: boolean;
}

export const navRoutes: NavRoute[] = [
  { slug: "llm-bench", label: "LLM Bench", module: "llm-bench", apiPrefix: "/llm-bench" },
  {
    slug: "serving-engines",
    label: "Serving Engines",
    module: "serving-engines",
    apiPrefix: "/serving-engines",
  },
  { slug: "silicon", label: "Silicon", module: "silicon", apiPrefix: "/silicon" },
  {
    slug: "intel-bluelens",
    label: "Intel BlueLens",
    module: "intel-bluelens",
    apiPrefix: "/intel-bluelens",
    external: true,
  },
];
