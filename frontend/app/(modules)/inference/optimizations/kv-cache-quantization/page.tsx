import type { Metadata } from "next";
import { SectionPlaceholder } from "@/modules/inference";

export const metadata: Metadata = { title: "KV Cache Quantization — Inference — Intel-AI" };

export default function KvCacheQuantizationPage() {
  return (
    <SectionPlaceholder
      title="KV Cache Quantization"
      description="Compress the attention KV cache to lower-precision formats to fit longer contexts and larger batches."
    />
  );
}
