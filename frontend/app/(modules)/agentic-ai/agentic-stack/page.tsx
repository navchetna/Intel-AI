import type { Metadata } from "next";
import { AgenticStackPageView } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Agentic Stack — Agentic AI — Intel-AI" };

export default function AgenticStackPage() {
  return <AgenticStackPageView />;
}
