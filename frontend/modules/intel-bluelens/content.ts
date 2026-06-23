import type { FeatureContent } from "@/components/FeatureLanding";

export const intelBluelensContent: FeatureContent = {
  slug: "intel-bluelens",
  title: "Intel BlueLens",
  tagline: "intel-bluelens",
  apiPrefix: "/intel-bluelens",
  description:
    "Observability and tracing for AI pipelines — see requests, spans, and bottlenecks end to end.",
  highlights: [
    {
      title: "Distributed tracing",
      body: "Follow a request across frontend, backend, and inference engines.",
    },
    {
      title: "Live timelines",
      body: "Visualize spans and latencies to spot regressions fast.",
    },
    {
      title: "Drill-down panels",
      body: "Inspect payloads, errors, and resource usage per span.",
    },
  ],
};
