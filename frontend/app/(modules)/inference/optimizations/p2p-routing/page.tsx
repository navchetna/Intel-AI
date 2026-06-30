import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "P2P Routing — Inference — Intel-AI" };

export default function P2PRoutingPage() {
  return (
    <SectionPlaceholder
      title="P2P Routing"
      description="Route requests peer-to-peer across serving nodes to balance load and reduce latency."
    />
  );
}
