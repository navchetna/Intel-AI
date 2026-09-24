import type { Metadata } from "next";
import { AuxiliaryModelsView } from "@/modules/models/AuxiliaryModelsView";

export const metadata: Metadata = { title: "Auxiliary Models — Intel-AI" };

export default function AuxiliaryModelsPage() {
  return <AuxiliaryModelsView />;
}
