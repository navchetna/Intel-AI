import type { FeatureContent } from "@/components/FeatureLanding";

export const agenticStackContent: FeatureContent = {
  slug: "agentic-stack",
  title: "Agentic Stack",
  tagline: "agentic-stack",
  apiPrefix: "/agentic-stack",
  description:
    "A composable runtime for building, deploying, and orchestrating AI agents on Intel hardware — from single-step tools to multi-agent pipelines with memory, planning, and tool use.",
  highlights: [
    {
      title: "Agent Orchestration",
      body: "Chain LLM calls, tool invocations, and sub-agents into reliable multi-step workflows with built-in retry and tracing.",
    },
    {
      title: "Tool & Function Calling",
      body: "Register typed Python functions as agent tools. The stack handles schema generation, argument parsing, and result injection.",
    },
    {
      title: "Memory & Context",
      body: "Plug in short-term working memory or long-term vector stores so agents retain context across sessions.",
    },
    {
      title: "Intel-Optimised Inference",
      body: "Route agent LLM calls through OpenVINO or IPEX-optimised backends for maximum throughput on Intel silicon.",
    },
    {
      title: "Observability",
      body: "Structured trace logs capture every agent step, tool call, and token count for debugging and cost analysis.",
    },
    {
      title: "Composable Runtimes",
      body: "Mix synchronous, streaming, and event-driven execution modes within a single pipeline definition.",
    },
  ],
};
