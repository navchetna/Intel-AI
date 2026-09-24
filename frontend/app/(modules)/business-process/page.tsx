import type { Metadata } from "next";
import { BusinessProcessView } from "@/modules/projects/BusinessProcessView";

export const metadata: Metadata = { title: "Business Process — Intel-AI" };

export default function BusinessProcessPage() {
  return <BusinessProcessView />;
}
