import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { llmBenchContent } from "@/modules/llm-bench";

export const metadata: Metadata = { title: "LLM Benchmarking — Intel-AI" };

export default function LlmBenchPage() {
  return <FeatureLanding content={llmBenchContent} />;
}
