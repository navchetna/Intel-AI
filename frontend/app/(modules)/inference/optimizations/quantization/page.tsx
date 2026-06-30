import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "Quantization — Inference — Intel-AI" };

export default function QuantizationPage() {
  return (
    <SectionPlaceholder
      title="Quantization"
      description="Reduce model weight and activation precision to shrink memory footprint and speed up inference."
    />
  );
}
