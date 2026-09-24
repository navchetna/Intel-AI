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
 * hardware                 : Rack-scale routes
 * enterprise-transformation: Enterprise Transformation — business process, agents and harness routes
 * catalog                  : Catalog — tasks and models routes
 * ai-training               : AI-Training — data curation and training routes (hideable; toggled from Navbar settings)
 * manufacturing             : IP blocks, packaging and fabrication tooling (hideable)
 * tools                     : Standalone tooling and external apps (hideable)
 * inferencing               : Silicon + Model Inferencing Calculator — the routes shown when
 *                              AppModeContext's mode is "inferencing" instead of "planning".
 *                              Every other cluster above is shown only in "planning" mode; see
 *                              the Navbar's cluster filtering.
 */
export type NavCluster = "hardware" | "enterprise-transformation" | "catalog" | "ai-training" | "manufacturing" | "tools" | "inferencing";

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
  /** Overrides the navbar link target; defaults to `/${slug}` when omitted. */
  href?: string;
  /**
   * When true, the route is served by a separate container (proxied via
   * next.config rewrites), so the navbar uses a full-page anchor instead of
   * client-side routing.
   */
  external?: boolean;
}

export const CLUSTER_LABELS: Record<NavCluster, string> = {
  "hardware":                   "Infrastructure",
  "enterprise-transformation":  "Enterprise Transformation",
  "catalog":                    "Catalog",
  "ai-training":                "AI-Training",
  "manufacturing":              "Manufacturing",
  "tools":                      "Tools",
  "inferencing":                "Model Inferencing",
};

export const CLUSTER_ORDER: NavCluster[] = [
  "enterprise-transformation",
  "catalog",
  "hardware",
  "manufacturing",
  "ai-training",
  "tools",
];

/** Shown only in AppModeContext's "inferencing" mode, in place of every cluster above. */
export const INFERENCING_CLUSTER_ORDER: NavCluster[] = ["inferencing"];

export const navRoutes: NavRoute[] = [
  // ── Cluster 1: Hardware ────────────────────────────────────────────────────
  { slug: "silicon",             label: "Silicon", module: "silicon",             apiPrefix: "/silicon",             cluster: "hardware" },
  { slug: "silicon-ingredients", label: "System",  module: "silicon-ingredients", apiPrefix: "/silicon-ingredients", cluster: "hardware" },
  { slug: "rack",                label: "Rack",    module: "rack",                apiPrefix: "/rack",                cluster: "hardware" },

  // ── Cluster 1b: Model Inferencing (shown only in "inferencing" app mode) ────
  // Silicon also appears above under Infrastructure — it's the one route present in both modes.
  { slug: "silicon",                       label: "Silicon",                      module: "silicon", apiPrefix: "/silicon", cluster: "inferencing" },
  { slug: "model-inferencing-calculator",  label: "Model Inferencing Calculator", module: "models",  apiPrefix: "/models",  cluster: "inferencing" },

  // ── Cluster 2: Enterprise Transformation ────────────────────────────────────
  { slug: "business-process", label: "Business Process", module: "projects",   apiPrefix: "/projects",   cluster: "enterprise-transformation" },
  { slug: "agentic-ai",       label: "Agents",           module: "agentic-ai", apiPrefix: "/agentic-ai", cluster: "enterprise-transformation" },
  { slug: "auxiliary-models", label: "Auxiliary Models", module: "models",     apiPrefix: "/models",     cluster: "enterprise-transformation" },
  { slug: "harness",          label: "Harness",          module: "agentic-ai", apiPrefix: "/agentic-ai", cluster: "enterprise-transformation", href: "/agentic-ai/harness" },

  // ── Cluster 2b: Catalog ──────────────────────────────────────────────────────
  { slug: "workflows", label: "Tasks",  module: "workflows", apiPrefix: "/workflows", cluster: "catalog" },
  { slug: "models",    label: "Models", module: "models",    apiPrefix: "/models",    cluster: "catalog" },

  // ── Cluster 2c: AI-Training ────────────────────────────────────────────────
  { slug: "data-pipes", label: "Data Curation", module: "data-pipes", apiPrefix: "/data-pipes", cluster: "ai-training" },
  { slug: "training",   label: "Training",      module: "training",   apiPrefix: "/training",   cluster: "ai-training" },

  // ── Cluster 3: Manufacturing ───────────────────────────────────────────────
  { slug: "mfg-tools", label: "Tools",     module: "mfg-tools", apiPrefix: "/mfg-tools", cluster: "manufacturing" },
  { slug: "ip-blocks",  label: "IP Blocks", module: "ip-blocks", apiPrefix: "/ip-blocks", cluster: "manufacturing" },
  { slug: "packaging",  label: "Packaging", module: "packaging", apiPrefix: "/packaging", cluster: "manufacturing" },
  { slug: "mos",        label: "MOS",       module: "mos",       apiPrefix: "/mos",       cluster: "manufacturing" },

  // ── Cluster 4: Tools ──────────────────────────────────────────────────────
  // llm-bench is intentionally omitted from the nav; route and module still exist at /llm-bench
  { slug: "intel-bluelens", label: "BlueLens", module: "intel-bluelens", apiPrefix: "/intel-bluelens", external: true, cluster: "tools" },
];
