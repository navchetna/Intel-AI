import type { Metadata } from "next";
import { AgenticHarnessPageView } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Harness — Intel-AI" };

export default function AgenticHarnessPage() {
  return <AgenticHarnessPageView />;
}
