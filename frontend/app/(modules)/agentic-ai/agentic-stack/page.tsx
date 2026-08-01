import type { Metadata } from "next";
import { AgenticStackPageView } from "@/modules/agentic-ai";

export const metadata: Metadata = { title: "Business Processes, Agents, Sizing — Intel-AI" };

export default function AgenticStackPage() {
  return <AgenticStackPageView />;
}
