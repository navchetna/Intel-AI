import type { Metadata } from "next";
import { ModelsView } from "@/modules/models/ModelsView";

export const metadata: Metadata = { title: "Model Catalog — Intel-AI" };

export default function ModelsPage() {
  return <ModelsView />;
}
