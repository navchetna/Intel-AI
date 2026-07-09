import type { Metadata } from "next";
import { FeatureLanding } from "@/components/FeatureLanding";
import { agenticAiContent } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Agentic AI — Intel-AI" };

export default function AgenticAiPage() {
  return <FeatureLanding content={agenticAiContent} />;
}
