import type { Metadata } from "next";
import { RackView } from "@/modules/rack";

export const metadata: Metadata = { title: "Rack View — Intel-AI" };

export default function RackPage() {
  return <RackView />;
}
