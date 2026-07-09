import type { Metadata } from "next";
import { SiliconView } from "@/modules/silicon/SiliconView";

export const metadata: Metadata = { title: "Silicon — Intel-AI" };

export default function SiliconPage() {
  return <SiliconView />;
}
