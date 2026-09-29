import type { Metadata } from "next";
import { SystemsView } from "@/modules/silicon/SystemsView";

export const metadata: Metadata = { title: "Systems — Intel-AI" };

export default function SystemsPage() {
  return <SystemsView />;
}
