import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "CPU-GPU Ratio — Agentic AI — Intel-AI" };

export default function CpuGpuRatioPage() {
  return (
    <SectionPlaceholder
      title="CPU-GPU Ratio"
      description="Explore optimal CPU-to-GPU allocation ratios for agentic workloads on Intel hardware."
    />
  );
}
