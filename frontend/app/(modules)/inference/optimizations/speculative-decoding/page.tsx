import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "Speculative Decoding — Inference — Intel-AI" };

export default function SpeculativeDecodingPage() {
  return (
    <SectionPlaceholder
      title="Speculative Decoding"
      description="Use a lightweight draft model to propose tokens and verify them in parallel for faster decoding."
    />
  );
}
