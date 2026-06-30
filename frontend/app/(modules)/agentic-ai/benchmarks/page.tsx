import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Benchmarks — Agentic AI — Intel-AI" };

export default function BenchmarksPage() {
  return (
    <SectionPlaceholder
      title="Benchmarks"
      description="Agent task success rates, latency, and cost across models and orchestration strategies."
    />
  );
}
