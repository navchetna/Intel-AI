import type { Metadata } from "next";
import { OptimizationsView } from "@/modules/inference";

export const metadata: Metadata = { title: "Optimizations — Inference — Intel-AI" };

export default function OptimizationsPage() {
  return <OptimizationsView />;
}
