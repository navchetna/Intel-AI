import type { Metadata } from "next";
import { AgenticStackView } from "@/modules/agentic-stack/AgenticStackView";

export const metadata: Metadata = { title: "Agentic Stack — Intel-AI" };

export default function AgenticStackPage() {
  return <AgenticStackView />;
}
