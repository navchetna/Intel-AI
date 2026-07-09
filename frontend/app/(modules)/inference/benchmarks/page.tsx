import type { Metadata } from "next";
import { BenchmarksView } from "@/modules/inference/benchmarks";

export const metadata: Metadata = { title: "Benchmarks — Inference — Intel-AI" };

export default function BenchmarksPage() {
  return <BenchmarksView />;
}
