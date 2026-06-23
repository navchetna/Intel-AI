import type { FeatureContent } from "@/components/FeatureLanding";

export const llmBenchContent: FeatureContent = {
  slug: "llm-bench",
  title: "LLM Benchmarking",
  tagline: "llm-bench",
  apiPrefix: "/llm-bench",
  description:
    "Reproducible throughput, latency, and TTFT benchmarks for large language models across Intel silicon and serving stacks.",
  highlights: [
    {
      title: "Throughput & latency",
      body: "Measure tokens/sec, time-to-first-token, and end-to-end latency under configurable concurrency.",
    },
    {
      title: "Reproducible runs",
      body: "Pin datasets, prompts, and model revisions so results stay comparable across PRs.",
    },
    {
      title: "Exportable results",
      body: "Emit CSV/JSON artifacts ready for dashboards and regression tracking.",
    },
  ],
};
