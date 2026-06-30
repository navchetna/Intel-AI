import type { FeatureContent } from "@/components/FeatureLanding";

export const inferenceContent: FeatureContent = {
  slug: "inference",
  title: "Inference",
  tagline: "inference",
  apiPrefix: "/inference",
  description:
    "Benchmark, scale, and optimize model inference on Intel silicon — from disaggregated serving to advanced runtime optimizations.",
  highlights: [
    {
      title: "Benchmarks",
      body: "Throughput, latency, and cost comparisons across engines and configurations.",
    },
    {
      title: "Disaggregated serving",
      body: "Separate prefill and decode across resources for better utilization.",
    },
    {
      title: "Optimizations",
      body: "Speculative decoding, P2P routing, KV cache quantization, and more.",
    },
  ],
};

/** A single entry in the Inference sub-navigation bar. */
export interface InferenceNavItem {
  /** App-internal path, e.g. "/inference/benchmarks". */
  href: string;
  /** Label shown in the sub-navbar. */
  label: string;
}

/**
 * Inference section sub-navigation. Rendered below the global navbar on every
 * `/inference/*` route via `app/(modules)/inference/layout.tsx`.
 */
export const inferenceNav: InferenceNavItem[] = [
  { href: "/inference", label: "Overview" },
  { href: "/inference/benchmarks", label: "Benchmarks" },
  { href: "/inference/disaggregated-serving", label: "Disaggregated Serving" },
  { href: "/inference/optimizations", label: "Optimizations" },
];

/** A selectable optimization technique shown on the Optimizations page. */
export interface OptimizationSection {
  id: string;
  label: string;
  summary: string;
  description: string;
}

/**
 * Optimization techniques rendered as a tabular, one-at-a-time selector on
 * `/inference/optimizations`.
 */
export const optimizationSections: OptimizationSection[] = [
  {
    id: "speculative-decoding",
    label: "Speculative Decoding",
    summary: "Draft-and-verify for faster token generation.",
    description:
      "A lightweight draft model proposes several tokens ahead, which the target model verifies in a single parallel pass. Accepted tokens are emitted immediately, reducing the number of expensive target-model steps and improving end-to-end decoding latency without changing output quality.",
  },
  {
    id: "p2p-routing",
    label: "P2P Routing",
    summary: "Balance requests peer-to-peer across serving nodes.",
    description:
      "Requests are routed peer-to-peer across serving replicas based on live load, KV-cache residency, and locality. This avoids a central bottleneck, keeps hot prefixes on the node that already holds their cache, and lowers tail latency under bursty traffic.",
  },
  {
    id: "kv-cache-quantization",
    label: "KV Cache Quantization",
    summary: "Compress the attention KV cache to fit more context.",
    description:
      "The attention key/value cache is stored in a lower-precision format (e.g. FP8 or INT8) instead of FP16. This shrinks memory footprint per token, enabling longer contexts and larger batch sizes on the same hardware with negligible accuracy impact.",
  },
  {
    id: "quantization",
    label: "Quantization",
    summary: "Lower weight/activation precision for speed and memory.",
    description:
      "Model weights and optionally activations are converted to lower-precision formats (INT8, INT4, FP8). This reduces memory bandwidth and footprint and speeds up inference on Intel silicon, with calibration or quantization-aware techniques used to preserve accuracy.",
  },
];
