import type { Metadata } from "next";
import { AgenticStackView } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Agentic Stack — Agentic AI — Intel-AI" };

export default function AgenticStackPage() {
  return <AgenticStackView />;
}
