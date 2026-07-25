import type { Metadata } from "next";
import { ModelsPageView } from "@/modules/models/ModelsPageView";

export const metadata: Metadata = { title: "Model Catalog — Intel-AI" };

export default function ModelsPage() {
  return <ModelsPageView />;
}
