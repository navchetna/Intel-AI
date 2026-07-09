import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { inferenceContent } from "@/modules/inference";

export const metadata: Metadata = { title: "Inference — Intel-AI" };

export default function InferencePage() {
  return <FeatureLanding content={inferenceContent} />;
}
