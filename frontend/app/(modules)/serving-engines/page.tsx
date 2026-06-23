import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { servingEnginesContent } from "@/modules/serving-engines";

export const metadata: Metadata = { title: "Serving Engines — Intel-AI" };

export default function ServingEnginesPage() {
  return <FeatureLanding content={servingEnginesContent} />;
}
