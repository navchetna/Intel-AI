import type { FeatureContent } from "@/components/FeatureLanding";

export const siliconContent: FeatureContent = {
  slug: "silicon",
  title: "Silicon",
  tagline: "silicon",
  apiPrefix: "/silicon",
  description:
    "Profile and target Intel accelerators — Xeon, Gaudi, and GPU — with hardware-aware tuning for every model.",
  highlights: [
    {
      title: "Device discovery",
      body: "Enumerate available accelerators and their memory/compute envelopes.",
    },
    {
      title: "Hardware-aware tuning",
      body: "Map models to the right precision and parallelism per device.",
    },
    {
      title: "Utilization insights",
      body: "Track compute, memory bandwidth, and power draw during runs.",
    },
  ],
};
