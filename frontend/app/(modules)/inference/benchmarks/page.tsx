import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "Benchmarks — Inference — Intel-AI" };

export default function BenchmarksPage() {
  return (
    <SectionPlaceholder
      title="Benchmarks"
      description="Throughput, latency, and cost comparisons across engines and configurations."
    />
  );
}
