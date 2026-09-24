import type { Metadata } from "next";
import { ModelInferencingCalculatorView } from "@/modules/models/ModelInferencingCalculatorView";

export const metadata: Metadata = { title: "Model Inferencing Calculator — Intel-AI" };

export default function ModelInferencingCalculatorPage() {
  return <ModelInferencingCalculatorView />;
}
