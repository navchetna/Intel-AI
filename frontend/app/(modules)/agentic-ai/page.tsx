import type { Metadata } from "next";
import { AgenticAiEntryView } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Agentic AI — Intel-AI" };

export default function AgenticAiPage() {
  return <AgenticAiEntryView />;
}
