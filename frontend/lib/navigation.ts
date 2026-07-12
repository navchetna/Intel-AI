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
/**
 * Cluster groups the route belongs to — drives the visual separators in the Navbar.
 * hardware       : Rack-scale and silicon routes
 * ai-stack       : Agent, workflow and model routes
 * manufacturing  : IP blocks, packaging and fabrication tooling
 * tools          : Standalone tooling and external apps
 */
export type NavCluster = "hardware" | "ai-stack" | "manufacturing" | "tools";

export interface NavRoute {
  /** URL segment, e.g. "silicon". Matches the route folder name. */
  slug: string;
  /** Label shown in the navbar. */
  label: string;
  /** Frontend feature module folder under `frontend/modules/`. */
  module: string;
  /** Backend API prefix this feature talks to (mounted in api/router.py). */
  apiPrefix: string;
  /** Visual cluster this route belongs to. */
  cluster: NavCluster;
  /**
   * When true, the route is served by a separate container (proxied via
   * next.config rewrites), so the navbar uses a full-page anchor instead of
   * client-side routing.
   */
  external?: boolean;
}

export const CLUSTER_LABELS: Record<NavCluster, string> = {
  "hardware":      "Silicon",
  "ai-stack":      "AI Stack",
  "manufacturing": "Manufacturing",
  "tools":         "Tools",
};

export const CLUSTER_ORDER: NavCluster[] = [
  "manufacturing",
  "hardware",
  "ai-stack",
  "tools",
];

export const navRoutes: NavRoute[] = [
  // ── Cluster 1: Hardware / Silicon ─────────────────────────────────────────
  { slug: "rack",                label: "Rack",        module: "rack",                apiPrefix: "/rack",                cluster: "hardware" },
  { slug: "silicon",             label: "Products",    module: "silicon",             apiPrefix: "/silicon",             cluster: "hardware" },
  { slug: "silicon-ingredients", label: "Ingredients", module: "silicon-ingredients", apiPrefix: "/silicon-ingredients", cluster: "hardware" },

  // ── Cluster 2: AI Stack ────────────────────────────────────────────────────
  { slug: "agentic-ai",      label: "Agents",          module: "agentic-ai",      apiPrefix: "/agentic-ai",      cluster: "ai-stack" },
  { slug: "workflows",       label: "Workflows",       module: "workflows",       apiPrefix: "/workflows",       cluster: "ai-stack" },
  { slug: "serving-engines", label: "Serving Engines", module: "serving-engines", apiPrefix: "/serving-engines", cluster: "ai-stack" },
  { slug: "models",          label: "Models",          module: "models",          apiPrefix: "/models",          cluster: "ai-stack" },

  // ── Cluster 3: Manufacturing ───────────────────────────────────────────────
  { slug: "mfg-tools", label: "Tools",     module: "mfg-tools", apiPrefix: "/mfg-tools", cluster: "manufacturing" },
  { slug: "ip-blocks",  label: "IP Blocks", module: "ip-blocks", apiPrefix: "/ip-blocks", cluster: "manufacturing" },
  { slug: "packaging",  label: "Packaging", module: "packaging", apiPrefix: "/packaging", cluster: "manufacturing" },
  { slug: "mos",        label: "MOS",       module: "mos",       apiPrefix: "/mos",       cluster: "manufacturing" },

  // ── Cluster 4: Tools ──────────────────────────────────────────────────────
  // llm-bench is intentionally omitted from the nav; route and module still exist at /llm-bench
  { slug: "intel-bluelens", label: "BlueLens", module: "intel-bluelens", apiPrefix: "/intel-bluelens", external: true, cluster: "tools" },
];
