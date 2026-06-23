import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { intelBluelensContent } from "@/modules/intel-bluelens";

export const metadata: Metadata = { title: "Intel BlueLens — Intel-AI" };

export default function IntelBluelensPage() {
  return <FeatureLanding content={intelBluelensContent} />;
}
