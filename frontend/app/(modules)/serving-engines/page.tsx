import type { Metadata } from "next";
import { ServingEnginesView } from "@/modules/serving-engines/ServingEnginesView";

export const metadata: Metadata = { title: "Serving Engines — Intel-AI" };

export default function ServingEnginesPage() {
  return <ServingEnginesView />;
}
