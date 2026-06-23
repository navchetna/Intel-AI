import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { siliconContent } from "@/modules/silicon";

export const metadata: Metadata = { title: "Silicon — Intel-AI" };

export default function SiliconPage() {
  return <FeatureLanding content={siliconContent} />;
}
