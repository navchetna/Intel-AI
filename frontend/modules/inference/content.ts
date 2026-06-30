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
  /** Optional nested items rendered as a dropdown list. */
  children?: InferenceNavItem[];
}

/**
 * Inference section sub-navigation. Rendered below the global navbar on every
 * `/inference/*` route via `app/(modules)/inference/layout.tsx`.
 */
export const inferenceNav: InferenceNavItem[] = [
  { href: "/inference", label: "Overview" },
  { href: "/inference/benchmarks", label: "Benchmarks" },
  { href: "/inference/disaggregated-serving", label: "Disaggregated Serving" },
  {
    href: "/inference/optimizations",
    label: "Optimizations",
    children: [
      { href: "/inference/optimizations/speculative-decoding", label: "Speculative Decoding" },
      { href: "/inference/optimizations/p2p-routing", label: "P2P Routing" },
      { href: "/inference/optimizations/kv-cache-quantization", label: "KV Cache Quantization" },
      { href: "/inference/optimizations/quantization", label: "Quantization" },
    ],
  },
];
