import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "Disaggregated Serving — Inference — Intel-AI" };

export default function DisaggregatedServingPage() {
  return (
    <SectionPlaceholder
      title="Disaggregated Serving"
      description="Separate prefill and decode across resources for better utilization and scaling."
    />
  );
}
