import type { FeatureContent } from "@/components/FeatureLanding";

export const servingEnginesContent: FeatureContent = {
  slug: "serving-engines",
  title: "Serving Engines",
  tagline: "serving-engines",
  apiPrefix: "/serving-engines",
  description:
    "Compare and configure inference servers — vLLM, TGI, and friends — with consistent, versioned deployment recipes.",
  highlights: [
    {
      title: "Engine matrix",
      body: "Side-by-side capabilities, quantization support, and batching strategies.",
    },
    {
      title: "One-click recipes",
      body: "Versioned launch configs for each engine and model family.",
    },
    {
      title: "Health & metrics",
      body: "Liveness, queue depth, and KV-cache utilization at a glance.",
    },
  ],
};
