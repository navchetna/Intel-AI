"use client";

import React, { useState } from "react";
import { Xeon6SPDetailView } from "./Xeon6SPDetailView";
import { AcceleratorDetailView } from "./AcceleratorDetailView";
import { SAMBANOVA_SN40L } from "./sambanova-data";
import { CRESCENT_ISLAND } from "./crescent-island-data";
import { ARC_PRO_B60 } from "./arc-b60-data";
import { NVIDIA_H100, NVIDIA_RTX_PRO_6000, NVIDIA_GB200_NVL72, NVIDIA_GB300_NVL72 } from "./nvidia-gpu-data";
import { StorageView } from "./StorageView";
import { SiliconComparisonView } from "./SiliconComparisonView";

const DETAIL_PAGE_IDS = new Set([
  "xeon6-sp", "sambanova", "crescent-island", "arc-b60", "storage",
  "nvidia-h100", "nvidia-rtx-pro-6000", "nvidia-gb200-nvl72", "nvidia-gb300-nvl72",
]);

interface SpecRow { label: string; value: string }
interface Chip {
  id: string;
  name: string;
  codeName: string;
  category: "CPU" | "GPU" | "Accelerator";
  vendor: "Intel" | "NVIDIA" | "SambaNova";
  tagline: string;
  description: string;
  accent: string;
  glow: string;
  badge: { bg: string; text: string };
  icon: React.ReactNode;
  peakFigure: { value: string; unit: string; label: string };
  specs: SpecRow[];
  useCases: string[];
  highlights: string[];
  tier: "Production" | "High-Performance" | "Next-Gen" | "Partner";
}

const VENDOR_STYLES: Record<Chip["vendor"], { bg: string; text: string }> = {
  Intel:     { bg: "rgba(56,189,248,0.15)", text: "#7dd3fc" },
  NVIDIA:    { bg: "rgba(118,185,0,0.18)",  text: "#a3e635" },
  SambaNova: { bg: "rgba(251,146,60,0.15)", text: "#fdba74" },
};

const CHIPS: Chip[] = [
  {
    id: "xeon6-sp",
    name: "Intel® Xeon® 6 SP",
    codeName: "Granite Rapids — Scalable Performance",
    category: "CPU",
    vendor: "Intel",
    tagline: "Mainstream AI inference at rack scale",
    description:
      "The 2-socket workhorse of the Xeon 6 family. Up to 64 P-cores per socket with AMX delivering native INT8/BF16 GEMM — covers the vast majority of SLM inference and embedding workloads without any discrete accelerator.",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.12)",
    badge: { bg: "rgba(56,189,248,0.15)", text: "#7dd3fc" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#38bdf8" fillOpacity="0.12" />
        <rect x="11" y="11" width="22" height="22" rx="3" stroke="#38bdf8" strokeWidth="2" />
        <rect x="16" y="16" width="12" height="12" rx="2" fill="#38bdf8" fillOpacity="0.2" />
        <path d="M8 17h3M8 22h3M8 27h3M33 17h3M33 22h3M33 27h3M17 8v3M22 8v3M27 8v3M17 33v3M22 33v3M27 33v3" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "64", unit: "cores", label: "per socket, 1–2 socket" },
    specs: [
      { label: "Architecture", value: "P-core (Lion Cove)" },
      { label: "Process node", value: "Intel 3" },
      { label: "Max cores / socket", value: "64" },
      { label: "Socket config", value: "1S / 2S" },
      { label: "Memory", value: "DDR5-6400, 12 channels" },
      { label: "AMX BF16", value: "~7 TFLOPS / socket" },
      { label: "PCIe", value: "Gen 5.0 (80 lanes)" },
      { label: "TDP range", value: "205 – 330 W" },
    ],
    useCases: ["SLM inference", "Embedding generation", "RAG retrieval", "Edge AI servers", "OpenVINO workloads"],
    highlights: [
      "Best perf-per-watt in the Xeon 6 lineup — ideal for always-on inference services",
      "AMX engine handles INT8 & BF16 GEMM without a discrete GPU",
      "Fits existing 1U/2U rack — no new server platform required",
      "VNNI-INT16 accelerates quantised vision and audio models",
    ],
    tier: "Production",
  },
  {
    id: "xeon6-ap",
    name: "Intel® Xeon® 6 AP",
    codeName: "Granite Rapids — Advanced Performance",
    category: "CPU",
    vendor: "Intel",
    tagline: "Maximum-core AI compute on x86",
    description:
      "The flagship P-core Xeon 6 variant — up to 128 cores per socket with a full 96-lane PCIe 5.0 fabric and CXL 2.0 for KV-cache offload. Targets dense inference clusters and AI-first datacenter nodes where raw throughput per rack unit matters.",
    accent: "#0ea5e9",
    glow: "rgba(14,165,233,0.13)",
    badge: { bg: "rgba(14,165,233,0.15)", text: "#38bdf8" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#0ea5e9" fillOpacity="0.12" />
        <rect x="9" y="9" width="26" height="26" rx="3" stroke="#0ea5e9" strokeWidth="2" />
        <rect x="14" y="14" width="16" height="16" rx="2" fill="#0ea5e9" fillOpacity="0.2" />
        <rect x="18" y="18" width="8" height="8" rx="1" fill="#0ea5e9" fillOpacity="0.35" />
        <path d="M6 16h3M6 22h3M6 28h3M35 16h3M35 22h3M35 28h3M16 6v3M22 6v3M28 6v3M16 35v3M22 35v3M28 35v3" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "128", unit: "cores", label: "per socket (2S = 256 cores)" },
    specs: [
      { label: "Architecture", value: "P-core (Lion Cove)" },
      { label: "Process node", value: "Intel 3" },
      { label: "Max cores / socket", value: "128" },
      { label: "Socket config", value: "1S / 2S" },
      { label: "Memory", value: "DDR5-6400, 12 channels" },
      { label: "AMX BF16", value: "~14 TFLOPS / socket" },
      { label: "PCIe", value: "Gen 5.0 (96 lanes)" },
      { label: "TDP range", value: "330 – 500 W" },
    ],
    useCases: ["Dense LLM inference", "Multi-model serving", "AI-first datacenter nodes", "High-throughput RAG", "CXL KV-cache offload"],
    highlights: [
      "2× the AMX throughput of Xeon6-SP — handles concurrent 30B+ model serving on-CPU",
      "96-lane PCIe 5.0 supports 4 Gaudi 3 accelerators at full bandwidth",
      "CXL 2.0 memory pooling expands addressable KV-cache beyond DRAM limits",
      "Paired with Intel IPEX: drop-in BF16/INT8 graph optimisation for PyTorch",
    ],
    tier: "High-Performance",
  },
  {
    id: "xeon6plus",
    name: "Intel® Xeon® 6+",
    codeName: "Granite Rapids HBM",
    category: "CPU",
    vendor: "Intel",
    tagline: "Bandwidth-optimised AI compute",
    description:
      "Xeon 6 with on-package HBM3 eliminates the DRAM bottleneck for memory-bandwidth-bound inference — large embedding tables, long-context attention, and sparse MoE models all benefit directly.",
    accent: "#22d3ee",
    glow: "rgba(34,211,238,0.12)",
    badge: { bg: "rgba(34,211,238,0.15)", text: "#67e8f9" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#22d3ee" fillOpacity="0.12" />
        <rect x="10" y="12" width="24" height="20" rx="3" stroke="#22d3ee" strokeWidth="2" />
        <rect x="14" y="16" width="16" height="12" rx="2" fill="#22d3ee" fillOpacity="0.2" />
        <path d="M14 8h4v4h-4zM26 8h4v4h-4z" fill="#22d3ee" fillOpacity="0.5" />
        <path d="M16 8v4M28 8v4M14 32v4M30 32v4" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "1.2", unit: "TB/s", label: "HBM3 memory bandwidth" },
    specs: [
      { label: "Architecture", value: "P-core + HBM3 on-pkg" },
      { label: "HBM capacity", value: "up to 128 GB" },
      { label: "HBM bandwidth", value: "~1.2 TB/s" },
      { label: "DDR5 channels", value: "12 (fallback)" },
      { label: "AMX BF16", value: "~14 TFLOPS / socket" },
      { label: "PCIe", value: "Gen 5.0" },
      { label: "Best fit", value: "Bandwidth-bound inference" },
      { label: "TDP range", value: "350 – 500 W" },
    ],
    useCases: ["Large LLM inference", "Long-context attention", "Recommendation engines", "Sparse MoE models", "High-BW embeddings"],
    highlights: [
      "10× DRAM bandwidth via HBM3 — solves the memory-wall for >70B models on CPU",
      "Fits existing Xeon socket — no new server design required",
      "HBM exposed as a standard NUMA node; transparent to OS and runtimes",
      "Works with Intel IPEX for automatic BF16/INT8 graph optimisation",
    ],
    tier: "High-Performance",
  },
  {
    id: "b70",
    name: "Intel® Arc™ Pro B70",
    codeName: "Xe2 \"Battlemage\" (BMG-G31)",
    category: "GPU",
    vendor: "Intel",
    tagline: "VRAM-dense workstation & batch-inference GPU",
    description:
      "Xe2 \"Battlemage\" workstation GPU with 32 GB ECC GDDR6 — the play is VRAM capacity per dollar, not peak compute. Four cards pool 128 GB for roughly $3,800 list, and vLLM (via Intel's LLM-Scaler) serves Llama, Qwen, DeepSeek and Mistral at competitive batch-32 throughput.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.14)",
    badge: { bg: "rgba(167,139,250,0.15)", text: "#c4b5fd" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#a78bfa" fillOpacity="0.12" />
        <circle cx="22" cy="22" r="12" stroke="#a78bfa" strokeWidth="2" />
        <circle cx="22" cy="22" r="6" fill="#a78bfa" fillOpacity="0.25" />
        <path d="M22 10v4M22 30v4M10 22h4M30 22h4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
        <path d="M14.1 14.1l2.8 2.8M27.1 27.1l2.8 2.8M14.1 29.9l2.8-2.8M27.1 16.9l2.8-2.8" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "367", unit: "TOPS", label: "INT8 peak (XMX, published)" },
    specs: [
      { label: "Architecture", value: "Xe2-HPG \"Battlemage\", TSMC N5" },
      { label: "XMX matrix engines", value: "256 (8 per Xe core)" },
      { label: "Memory", value: "32 GB GDDR6, ECC, 256-bit" },
      { label: "Memory bandwidth", value: "608 GB/s" },
      { label: "INT8 peak (XMX)", value: "367 TOPS" },
      { label: "BF16 / FP16 peak (XMX)", value: "~183.5 TFLOPS (derived)" },
      { label: "Host interface", value: "PCIe 5.0 x16" },
      { label: "Board power", value: "230 W ref. (160–290 W range)" },
    ],
    useCases: ["Batch LLM inference (vLLM)", "Multi-user agentic serving", "VRAM-dense capacity scaling", "AI workstation + graphics", "OpenVINO / IPEX inference"],
    highlights: [
      "4 cards = 128 GB pooled ECC VRAM for ~$3,800 list — capacity-per-dollar, not raw compute, is the case",
      "Intel LLM-Scaler (vLLM fork) serves Llama, Qwen, DeepSeek & Mistral; BF16 and FP8/FP4 are not yet servable (FP16/INT8 only today)",
      "No NVLink-class fabric — every card needs a full PCIe 5.0 x16 link, so lane count is a first-order host-SKU filter",
      "Competitive at batch 32 (~85% of RTX PRO 6000 on Llama 3.1 8B); unremarkable at batch 1 — built for concurrency, not single-user latency",
    ],
    tier: "Production",
  },
  {
    id: "arc-b60",
    name: "Intel® Arc™ Pro B60",
    codeName: "Xe2 \"Battlemage\" — BMG-G21",
    category: "GPU",
    vendor: "Intel",
    tagline: "Cost-effective AI inference with 24 GB VRAM",
    description:
      "The Arc Pro B60 is the full-die Battlemage professional part: 20 Xe2-HPG cores, 160 XMX matrix engines, 24 GB GDDR6 on a 192-bit bus, and PCIe 5.0 x8 electrical host link. Intel positions it explicitly as an inference product — capacity per dollar, not FLOPS per dollar.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.14)",
    badge: { bg: "rgba(167,139,250,0.15)", text: "#c4b5fd" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#a78bfa" fillOpacity="0.12" />
        <circle cx="22" cy="22" r="12" stroke="#a78bfa" strokeWidth="2" />
        <circle cx="22" cy="22" r="6" fill="#a78bfa" fillOpacity="0.25" />
        <path d="M22 10v4M22 30v4M10 22h4M30 22h4" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
        <path d="M14.1 14.1l2.8 2.8M27.1 27.1l2.8 2.8M14.1 29.9l2.8-2.8M27.1 16.9l2.8-2.8" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "197", unit: "TOPS", label: "INT8 peak (XMX, dense)" },
    specs: [
      { label: "Architecture", value: "Xe2-HPG \"Battlemage\", TSMC N5" },
      { label: "XMX matrix engines", value: "160 (8 per Xe core)" },
      { label: "Memory", value: "24 GB GDDR6, 192-bit" },
      { label: "Memory bandwidth", value: "456 GB/s" },
      { label: "INT8 peak (XMX)", value: "197 TOPS" },
      { label: "FP16 peak (XMX)", value: "98.3 TFLOPS (derived)" },
      { label: "FP32 peak (XVE)", value: "12.28 TFLOPS" },
      { label: "Host interface", value: "PCIe 5.0 x8 electrical" },
      { label: "Board power", value: "120–200 W" },
    ],
    useCases: ["Single-card 8B–14B serving", "Multi-card 32B–70B INT4/FP8", "Project Battlematrix (8-card, 192 GB)", "High-concurrency batch inference", "AI workstation"],
    highlights: [
      "Capacity per dollar: 24 GB at $599–$800 street price — one-quarter the bandwidth of HBM at a fraction of the cost",
      "Memory-bound decode: 215.6 FLOP/byte FP16 machine balance means batching is not an optimization, it is the design",
      "No scale-up fabric: PCIe 5.0 x8 only (31.5 GB/s per direction) — prefer replication over tensor parallelism",
      "llm-scaler-vllm serving path supports Llama, Qwen, DeepSeek, Mistral with FP16/INT4/FP8 quantization",
    ],
    tier: "Production",
  },
  {
    id: "crescent-island",
    name: "Intel Crescent Island",
    codeName: "Xe3P — data-centre inference GPU",
    category: "GPU",
    vendor: "Intel",
    tagline: "Memory capacity per dollar and per watt, built for agentic AI",
    description:
      "Pre-launch Xe3P inference GPU that trades peak FLOPS for memory capacity — 160 GB reference / 480 GB partner-ceiling LPDDR5X in a 350 W air-cooled PCIe card. Intel has since published throughput specs: 655.5 TFLOPS BF16, 1,311 TFLOPS FP8, 2,622 TFLOPS MXFP4.",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.14)",
    badge: { bg: "rgba(244,114,182,0.15)", text: "#f9a8d4" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#f472b6" fillOpacity="0.12" />
        <path d="M22 8l4 7h8l-6.5 5 2.5 8L22 24l-8 4 2.5-8L10 15h8z" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" fill="#f472b6" fillOpacity="0.15" />
        <circle cx="22" cy="22" r="3" fill="#f472b6" />
      </svg>
    ),
    peakFigure: { value: "480", unit: "GB", label: "LPDDR5X partner ceiling (160 GB ref.)" },
    specs: [
      { label: "Architecture", value: "Xe3P (\"Celestial\" lineage)" },
      { label: "Memory type", value: "LPDDR5X — no HBM, no GDDR" },
      { label: "Memory capacity", value: "160 GB ref. / 480 GB ceiling" },
      { label: "Memory bandwidth", value: "1.5 TB/s" },
      { label: "Board power (TDP)", value: "350 W, air-cooled" },
      { label: "Host interface", value: "PCIe Gen5 x16 (assumed)" },
      { label: "BF16 / FP8 / MXFP4", value: "655.5 / 1,311 / 2,622 TFLOPS" },
      { label: "Status", value: "Sampling H2 2026 · Volume 2027" },
    ],
    useCases: ["Sparse MoE serving", "Long-context agentic sessions", "High-concurrency batch inference", "Many co-resident small models", "Embedding / reranker serving"],
    highlights: [
      "160–480 GB LPDDR5X trades ~3–5× bandwidth for 1.7–3.3× capacity vs. HBM — a capacity-bound, not bandwidth-bound, bet",
      "Intel-published throughput specs: 10.2 TFLOPS FP64, 20.5 TFLOPS FP32, 655.5 TFLOPS BF16, 1,311 TFLOPS FP8, 2,622 TFLOPS MXFP4",
      "Dec 2025 Battlematrix testing: only MXFP4 models loaded successfully; INT4/FP8/AWQ failed — treat software maturity as the primary adoption risk",
      "No proprietary scale-up fabric — PCIe P2P makes host lane count (Xeon 6 6767P+) a first-order sizing constraint",
    ],
    tier: "Next-Gen",
  },
  {
    id: "nvidia-h100",
    name: "NVIDIA H100 SXM5",
    codeName: "Hopper (GH100), TSMC 4N",
    category: "GPU",
    vendor: "NVIDIA",
    tagline: "The incumbent datacenter GPU — largest installed base of any part on this page",
    description:
      "Still the most widely deployed high-end AI GPU as of 2026. The SXM5 module (HGX/DGX 8-GPU servers) is what this app's own Qwen sizing model defaults to — 989/990 TFLOPS dense BF16 and 3.35 TB/s HBM3 are reproduced exactly from that model.",
    accent: "#76b900",
    glow: "rgba(118,185,0,0.14)",
    badge: { bg: "rgba(118,185,0,0.15)", text: "#a3e635" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#76b900" fillOpacity="0.12" />
        <circle cx="22" cy="22" r="12" stroke="#76b900" strokeWidth="2" />
        <circle cx="22" cy="22" r="6" fill="#76b900" fillOpacity="0.25" />
        <path d="M22 10v4M22 30v4M10 22h4M30 22h4" stroke="#76b900" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "990", unit: "TFLOPS", label: "BF16 dense (SXM5) — this app's sizing default" },
    specs: [
      { label: "Architecture", value: "Hopper (GH100), TSMC 4N" },
      { label: "Form factor", value: "SXM5 (HGX/DGX 8-GPU)" },
      { label: "Memory", value: "80 GB HBM3" },
      { label: "Memory bandwidth", value: "3.35 TB/s" },
      { label: "BF16 Tensor (dense/sparse)", value: "990 / 1,979 TFLOPS" },
      { label: "FP8 Tensor (dense/sparse)", value: "1,979 / 3,958 TFLOPS" },
      { label: "NVLink", value: "900 GB/s (4th gen)" },
      { label: "Board power", value: "Up to 700 W" },
    ],
    useCases: ["Large-scale LLM training", "High-throughput inference serving", "Multi-node distributed training", "Mixed training + inference clusters", "Existing HGX/DGX fleets"],
    highlights: [
      "Still the largest installed base of any high-end AI GPU — most customer environments already have H100 capacity to size against",
      "SXM5's 700 W / 900 GB/s NVLink profile is materially higher-throughput than the PCIe H100 SKU already in this app's Comparisons tab — don't conflate the two",
      "989/990 TFLOPS dense BF16 and 3.35 TB/s HBM3 are this app's own Qwen sizing-model defaults",
      "Most mature software ecosystem of any accelerator on this page — CUDA, vLLM, TensorRT-LLM all target it first",
    ],
    tier: "Production",
  },
  {
    id: "nvidia-rtx-pro-6000",
    name: "NVIDIA RTX PRO 6000 Blackwell",
    codeName: "Blackwell (GB202) — Workstation Edition",
    category: "GPU",
    vendor: "NVIDIA",
    tagline: "96 GB GDDR7 workstation/inference card — the direct benchmark for Intel's B60/B70",
    description:
      "NVIDIA's Blackwell-generation professional card, and the card this app's own B70 entry already benchmarks itself against (~85% of its batch-32 throughput on Llama 3.1 8B). PCIe only, no NVLink — 96 GB GDDR7, 5th-gen Tensor Cores with native FP4.",
    accent: "#76b900",
    glow: "rgba(118,185,0,0.14)",
    badge: { bg: "rgba(118,185,0,0.15)", text: "#a3e635" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#76b900" fillOpacity="0.12" />
        <circle cx="22" cy="22" r="12" stroke="#76b900" strokeWidth="2" />
        <circle cx="22" cy="22" r="6" fill="#76b900" fillOpacity="0.25" />
        <path d="M14.1 14.1l2.8 2.8M27.1 27.1l2.8 2.8M14.1 29.9l2.8-2.8M27.1 16.9l2.8-2.8" stroke="#76b900" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "96", unit: "GB", label: "GDDR7 — largest workstation-card VRAM here" },
    specs: [
      { label: "Architecture", value: "Blackwell (GB202), TSMC 4N" },
      { label: "CUDA / Tensor / RT cores", value: "24,064 / 752 / 188" },
      { label: "Memory", value: "96 GB GDDR7 ECC, 512-bit" },
      { label: "Memory bandwidth", value: "1.79 TB/s" },
      { label: "FP8 Tensor (dense/sparse)", value: "503.8 / 1,007.6 TFLOPS" },
      { label: "FP4 Tensor (sparse)", value: "~4,000 TOPS" },
      { label: "Host interface", value: "PCIe Gen5 x16 (no NVLink)" },
      { label: "Board power", value: "600 W" },
    ],
    useCases: ["Single/multi-GPU inference serving", "AI workstation + graphics", "Fine-tuning mid-size models", "Batch inference at high concurrency", "Direct Intel B60/B70 comparison point"],
    highlights: [
      "96 GB GDDR7 is the largest VRAM of any single workstation-class card here — direct capacity comparison to Intel's B60 (24 GB) and B70 (32 GB)",
      "This app's own B70 card already benchmarks against it: ~85% of this card's batch-32 Llama 3.1 8B throughput",
      "5th-gen Tensor Cores add native FP4 — the same low-precision format Crescent Island targets, at a much higher absolute TOPS ceiling",
      "No NVLink — PCIe Gen5 x16 only, the same single-card scaling constraint this app already flags for Intel's Arc Pro line",
    ],
    tier: "Production",
  },
  {
    id: "nvidia-gb200-nvl72",
    name: "NVIDIA GB200 NVL72",
    codeName: "Grace Blackwell Superchip (Grace CPU + 2× B200 GPU)",
    category: "GPU",
    vendor: "NVIDIA",
    tagline: "Rack-scale superchip — 72 Blackwell GPUs NVLink-fused into one domain",
    description:
      "Not a single GPU — a Superchip (1 Grace CPU + 2 Blackwell B200 GPUs) NVLink-fused with 17 others into a 72-GPU, 36-CPU rack sold and benchmarked as one unit. 13.4 TB of HBM3e at up to 576 TB/s aggregate in one coherent NVLink domain.",
    accent: "#76b900",
    glow: "rgba(118,185,0,0.14)",
    badge: { bg: "rgba(118,185,0,0.15)", text: "#a3e635" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#76b900" fillOpacity="0.12" />
        <rect x="10" y="9" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.55" />
        <rect x="10" y="19.5" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.4" />
        <rect x="10" y="30" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.25" />
      </svg>
    ),
    peakFigure: { value: "20", unit: "PFLOPS", label: "FP4 per GPU, with sparsity" },
    specs: [
      { label: "Configuration", value: "36 Grace CPU + 72 B200 GPU / rack" },
      { label: "Grace CPU", value: "72 Arm Neoverse V2 cores each" },
      { label: "GPU memory (per GPU)", value: "186 GB HBM3e @ 8 TB/s" },
      { label: "GPU memory (rack total)", value: "13.4 TB @ 576 TB/s" },
      { label: "FP4 Tensor (per GPU, sparse)", value: "20 PFLOPS" },
      { label: "FP4 Tensor (rack, sparse)", value: "1,440 PFLOPS" },
      { label: "NVLink", value: "1.8 TB/s/GPU · 130 TB/s/rack" },
      { label: "Rack power", value: "~120 kW, liquid-cooled" },
    ],
    useCases: ["Frontier-scale LLM training", "Trillion-parameter MoE training", "Disaggregated prefill/decode inference", "Largest single-domain NVLink clusters", "Multi-rack AI factories"],
    highlights: [
      "Not a single GPU — a Superchip (Grace CPU + 2 B200 GPUs) NVLink-fused into a 72-GPU, 36-CPU rack sold and benchmarked as one unit",
      "13.4 TB of HBM3e at up to 576 TB/s aggregate bandwidth in one NVLink domain — far beyond what any PCIe-connected multi-GPU config (Intel's B60/B70/Crescent Island included) can pool coherently",
      "Grace CPU is Arm (Neoverse V2), not x86 — a real toolchain/OS consideration when comparing total cost against x86-hosted GPU nodes",
      "GB300 NVL72 (also on this page) is the direct Blackwell Ultra successor on the same rack architecture",
    ],
    tier: "High-Performance",
  },
  {
    id: "nvidia-gb300-nvl72",
    name: "NVIDIA GB300 NVL72",
    codeName: "Grace Blackwell Ultra Superchip (Grace CPU + 2× B300 GPU)",
    category: "GPU",
    vendor: "NVIDIA",
    tagline: "Blackwell Ultra refresh — 50% more HBM3e per GPU, 2× per-GPU networking",
    description:
      "The Blackwell Ultra refresh of GB200 NVL72 on the same rack architecture: 288 GB HBM3e per GPU (up from 186 GB), same 8 TB/s per-GPU bandwidth, and ConnectX-8 SuperNICs doubling per-GPU networking to ~800 Gb/s.",
    accent: "#76b900",
    glow: "rgba(118,185,0,0.14)",
    badge: { bg: "rgba(118,185,0,0.15)", text: "#a3e635" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#76b900" fillOpacity="0.12" />
        <rect x="10" y="9" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.55" />
        <rect x="10" y="19.5" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.4" />
        <rect x="10" y="30" width="24" height="5" rx="1.5" fill="#76b900" fillOpacity="0.25" />
        <circle cx="34" cy="11.5" r="3" fill="#76b900" />
      </svg>
    ),
    peakFigure: { value: "288", unit: "GB", label: "HBM3e per GPU (vs. 186 GB on GB200)" },
    specs: [
      { label: "Configuration", value: "36 Grace CPU + 72 B300 GPU / rack" },
      { label: "Grace CPU", value: "72 Arm Neoverse V2 cores each" },
      { label: "GPU memory (per GPU)", value: "288 GB HBM3e @ 8 TB/s" },
      { label: "GPU memory (rack total)", value: "20.7 TB @ 576 TB/s" },
      { label: "FP4 Tensor (per GPU, sparse/dense)", value: "20 / 15 PFLOPS" },
      { label: "FP4 Tensor (rack, sparse/dense)", value: "1,440 / 1,080 PFLOPS" },
      { label: "Networking", value: "ConnectX-8, ~800 Gb/s/GPU" },
      { label: "Rack power", value: "~120 kW, liquid-cooled" },
    ],
    useCases: ["Reasoning-model / long-context inference", "Trillion-parameter MoE serving", "KV-cache-heavy agentic workloads", "Next-gen frontier training", "Multi-rack AI factories"],
    highlights: [
      "Same NVL72 rack architecture as GB200, with 288 GB HBM3e per GPU (vs. 186 GB) — the generational upgrade is capacity and networking, not a clean compute doubling",
      "ConnectX-8 SuperNICs double per-GPU networking to ~800 Gb/s vs. GB200's ConnectX-7 — matters for disaggregated prefill/decode across racks",
      "Third-party reporting on this generation's headline FP4 PFLOPS figure is inconsistent — verify the dense-vs-sparse convention before quoting a GB200-vs-GB300 comparison",
      "Same Arm-based Grace CPU consideration as GB200 applies here",
    ],
    tier: "Next-Gen",
  },
  {
    id: "sambanova",
    name: "SambaNova SN40L",
    codeName: "Reconfigurable Dataflow Unit — Cerulean",
    category: "Accelerator",
    vendor: "SambaNova",
    tagline: "Dataflow-native alternative to GPUs for agentic inference",
    description:
      "SambaNova's RDU maps dataflow graphs directly onto an array of Pattern Compute/Memory Units — no SIMT kernel dispatch. Current-gen SN40L (5nm, 102B transistors) pairs 64 GiB HBM3 with up to 1.5 TiB DDR per chip, natively serving Composition-of-Experts models up to 1.3T aggregate params.",
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.12)",
    badge: { bg: "rgba(251,146,60,0.15)", text: "#fdba74" },
    icon: (
      <svg viewBox="0 0 44 44" fill="none" className="w-10 h-10">
        <rect width="44" height="44" rx="10" fill="#fb923c" fillOpacity="0.12" />
        <circle cx="12" cy="22" r="3.5" fill="#fb923c" fillOpacity="0.5" />
        <circle cx="22" cy="12" r="3.5" fill="#fb923c" fillOpacity="0.5" />
        <circle cx="32" cy="22" r="3.5" fill="#fb923c" fillOpacity="0.5" />
        <circle cx="22" cy="32" r="3.5" fill="#fb923c" fillOpacity="0.5" />
        <circle cx="22" cy="22" r="5" fill="#fb923c" fillOpacity="0.35" />
        <path d="M15.5 22h3M25.5 22h3M22 15.5v3M22 25.5v3" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    peakFigure: { value: "640", unit: "TFLOPS", label: "BF16 native, per socket" },
    specs: [
      { label: "Architecture", value: "Reconfigurable Dataflow Unit" },
      { label: "Process", value: "5nm TSMC, CoWoS-S dual die" },
      { label: "On-chip SRAM", value: "520 MiB" },
      { label: "HBM", value: "64 GiB HBM3" },
      { label: "DDR (attached)", value: "up to 1.5 TiB, pluggable" },
      { label: "BF16 peak", value: "638–640 TFLOPS / socket" },
      { label: "Rack aggregate", value: "10.2 PFLOPS BF16 (16-socket)" },
      { label: "API surface", value: "OpenAI-compatible (SambaCloud)" },
    ],
    useCases: ["Composition-of-Experts (CoE) serving", "Trillion-param MoE", "Ultra-long context / KV residency", "OpenAI-compatible hosted inference", "Xeon 6 heterogeneous prefill/decode"],
    highlights: [
      "Three-tier memory (SRAM → HBM3 → DDR) keeps weights chip-resident — no PCIe round-trip to host DRAM during inference",
      "Samba-1: 56 component models, 1.3T aggregate params, on just 8 RDU sockets via Composition of Experts",
      "2026 Intel partnership: Xeon 6 as host/action CPU + RDU for decode, H200 GPUs for prefill — SoftBank is the first deployment",
      "SN50 successor (H2 2026) is estimated at ~2.5× BF16 / native FP8 — press-derived, not yet an official spec",
    ],
    tier: "Partner",
  },
];

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  "Production":         { bg: "rgba(16,185,129,0.15)",  text: "#34d399" },
  "High-Performance":   { bg: "rgba(34,211,238,0.15)",  text: "#67e8f9" },
  "Next-Gen":           { bg: "rgba(244,114,182,0.15)", text: "#f9a8d4" },
  "Partner":            { bg: "rgba(251,146,60,0.15)",  text: "#fdba74" },
};

function SpecTable({ specs }: { specs: SpecRow[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06]">
      {specs.map((s, i) => (
        <div key={s.label} className={`flex items-start justify-between gap-3 px-3.5 py-2 text-xs ${i % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.04]"}`}>
          <span className="text-white/35 shrink-0 w-36">{s.label}</span>
          <span className="text-white/80 text-right font-mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

function ChipCard({ chip, onClick }: { chip: Chip; onClick?: () => void }) {
  const tierStyle = TIER_STYLES[chip.tier];
  const clickable = !!onClick;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] ${clickable ? "cursor-pointer group" : ""}`}
      style={{
        background: "var(--dm-card-bg)",
        boxShadow: `0 0 0 1px var(--dm-card-ring), var(--dm-card-depth), 0 0 60px ${chip.glow}`,
        borderColor: "var(--dm-card-border)",
      }}
      onClick={onClick}
    >
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${chip.accent} 0%, ${chip.accent}44 60%, transparent 100%)` }} />
      <div className="pointer-events-none absolute right-0 top-0 h-48 w-48"
        style={{ background: `radial-gradient(ellipse at 100% 0%, ${chip.glow}, transparent 70%)` }} />

      <div className="relative flex flex-col flex-1 p-6 gap-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {chip.icon}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-white leading-tight">{chip.name}</h2>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: tierStyle.bg, color: tierStyle.text }}>
                {chip.tier}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: VENDOR_STYLES[chip.vendor].bg, color: VENDOR_STYLES[chip.vendor].text }}>
                {chip.vendor}
              </span>
              <span className="text-xs font-mono text-white/30">{chip.codeName}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: chip.badge.bg, color: chip.badge.text }}>
                {chip.category}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black leading-none" style={{ color: chip.accent }}>{chip.peakFigure.value}</div>
            <div className="text-[11px] font-bold leading-none mt-0.5" style={{ color: chip.accent }}>{chip.peakFigure.unit}</div>
            <div className="text-[9px] text-white/30 mt-0.5 max-w-[80px] leading-tight">{chip.peakFigure.label}</div>
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest -mt-2" style={{ color: chip.accent }}>{chip.tagline}</p>
        <p className="text-sm text-white/55 leading-relaxed -mt-2">{chip.description}</p>

        <SpecTable specs={chip.specs} />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Key Advantages</p>
          <ul className="space-y-1.5">
            {chip.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                <div className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: chip.accent }} />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto pt-3 border-t border-white/[0.05]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 mb-2">Ideal For</p>
          <div className="flex flex-wrap gap-1.5">
            {chip.useCases.map(u => (
              <span key={u} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/55">{u}</span>
            ))}
          </div>
        </div>

        {clickable && (
          <div className="mt-4 flex items-center justify-end gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: chip.accent }}>
            <span className="opacity-70 group-hover:opacity-100">View SKUs &amp; benchmarks</span>
            <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

type SiliconCategory = "Compute" | "Memory" | "Networking" | "Storage" | "Cables" | "PDU";

const SILICON_CATEGORIES: SiliconCategory[] = ["Compute", "Memory", "Networking", "Storage", "Cables", "PDU"];

function ComingSoon({ category }: { category: SiliconCategory }) {
  return (
    <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-24"
      style={{ borderColor: "var(--dm-border-b)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--dm-txt-secondary)" }}>{category} catalog coming soon</p>
      <p className="mt-1 text-xs" style={{ color: "var(--dm-txt-faint)" }}>This tab is reserved for {category.toLowerCase()} SKUs and specs.</p>
    </div>
  );
}

interface ComputeGroup {
  category: Chip["category"];
  label: string;
  description: string;
  accent: string;
  accentRgb: string;
}

const COMPUTE_GROUPS: ComputeGroup[] = [
  {
    category: "CPU",
    label: "CPU",
    description: "General-purpose Xeon 6 processors — the default compute for SLM inference, embeddings, RAG and mixed workloads that don't need a discrete accelerator.",
    accent: "#38bdf8",
    accentRgb: "56,189,248",
  },
  {
    category: "GPU",
    label: "GPU",
    description: "Discrete GPUs for batch inference, AI workstations and next-gen datacenter serving — Intel's Arc Pro line and pre-production Crescent Island alongside NVIDIA's H100, RTX PRO 6000, and rack-scale GB200/GB300 NVL72, badged by vendor below.",
    accent: "#a78bfa",
    accentRgb: "167,139,250",
  },
  {
    category: "Accelerator",
    label: "Accelerators",
    description: "Purpose-built and partner AI accelerator silicon for large-scale, high-throughput training and inference beyond what CPUs and GPUs alone deliver.",
    accent: "#fb923c",
    accentRgb: "251,146,60",
  },
];

function ComputeAccordion({ group, chips, expanded, onToggle, onChipClick }: {
  group: ComputeGroup; chips: Chip[]; expanded: boolean; onToggle: () => void; onChipClick: (id: string) => void;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-4 rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors"
        style={{ background: expanded ? `rgba(${group.accentRgb},0.06)` : "transparent" }}
      >
        <div
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: group.accent, transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M6 3l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold" style={{ color: "var(--dm-txt-primary)" }}>{group.label}</h2>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: `rgba(${group.accentRgb},0.15)`, color: group.accent }}>
              {chips.length}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed max-w-3xl" style={{ color: "var(--dm-txt-faint)" }}>{group.description}</p>
        </div>
        <div className="flex-shrink-0 flex flex-wrap justify-end gap-1.5 max-w-[280px]">
          {chips.map(c => (
            <span key={c.id} className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ background: `rgba(${group.accentRgb},0.10)`, color: group.accent }}>
              {c.name.replace(/Intel[®™]*\s*/g, "").replace(/[®™]/g, "")}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {chips.map(c => (
              <ChipCard key={c.id} chip={c}
                onClick={DETAIL_PAGE_IDS.has(c.id) ? () => onChipClick(c.id) : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type SiliconSection = "specifications" | "comparisons";

const SILICON_SECTIONS: { id: SiliconSection; label: string; description: string }[] = [
  { id: "specifications", label: "Specifications", description: "Full catalog — CPU, GPU, and accelerator SKUs by category" },
  { id: "comparisons", label: "Comparisons", description: "Side-by-side TFLOPS, memory, and PCIe across selected silicon" },
];

export function SiliconView() {
  const [drillDown, setDrillDown] = useState<string | null>(null);
  const [section, setSection] = useState<SiliconSection>("specifications");
  const [activeTab, setActiveTab] = useState<SiliconCategory>("Compute");
  const [expanded, setExpanded] = useState<Set<Chip["category"]>>(new Set());

  function toggleGroup(category: Chip["category"]) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  if (drillDown === "xeon6-sp") {
    return <Xeon6SPDetailView onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "sambanova") {
    return <AcceleratorDetailView detail={SAMBANOVA_SN40L} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "crescent-island") {
    return <AcceleratorDetailView detail={CRESCENT_ISLAND} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "arc-b60") {
    return <AcceleratorDetailView detail={ARC_PRO_B60} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "nvidia-h100") {
    return <AcceleratorDetailView detail={NVIDIA_H100} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "nvidia-rtx-pro-6000") {
    return <AcceleratorDetailView detail={NVIDIA_RTX_PRO_6000} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "nvidia-gb200-nvl72") {
    return <AcceleratorDetailView detail={NVIDIA_GB200_NVL72} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "nvidia-gb300-nvl72") {
    return <AcceleratorDetailView detail={NVIDIA_GB300_NVL72} onBack={() => setDrillDown(null)} />;
  }
  if (drillDown === "storage") {
    return <StorageView onBack={() => setDrillDown(null)} />;
  }

  return (
    <main style={{ background: "var(--dm-page-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-12">
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight">Silicon</h1>
        </div>

        <div className="flex gap-1 mb-8 border-b border-white/[0.07]">
          {SILICON_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={{
                color: activeTab === cat ? "#38bdf8" : "var(--dm-txt-faint)",
                borderColor: activeTab === cat ? "#38bdf8" : "transparent",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {activeTab === "Compute" ? (
          <div className="flex gap-6 items-start">
            {/* ── vertical sub-tabs — scoped to Compute; a subset of that tab, not a page-level section ── */}
            <div className="flex-shrink-0 w-48 flex flex-col gap-1">
              {SILICON_SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className="text-left px-4 py-3 rounded-xl transition-colors border-l-2"
                  style={{
                    background: section === s.id ? "rgba(56,189,248,0.08)" : "transparent",
                    borderColor: section === s.id ? "#38bdf8" : "transparent",
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: section === s.id ? "#38bdf8" : "var(--dm-txt-body)" }}>
                    {s.label}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--dm-txt-faint)" }}>
                    {s.description}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              {section === "comparisons" ? (
                <SiliconComparisonView />
              ) : (
                <>
                  {COMPUTE_GROUPS.map(g => (
                    <ComputeAccordion key={g.category} group={g}
                      chips={CHIPS.filter(c => c.category === g.category)}
                      expanded={expanded.has(g.category)}
                      onToggle={() => toggleGroup(g.category)}
                      onChipClick={setDrillDown} />
                  ))}
                </>
              )}
            </div>
          </div>
        ) : activeTab === "Storage" ? (
          <div
            className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] cursor-pointer group"
            style={{
              background: "var(--dm-card-bg)",
              boxShadow: "0 0 0 1px var(--dm-card-ring), var(--dm-card-depth), 0 0 60px rgba(251,191,36,0.12)",
              borderColor: "var(--dm-card-border)",
            }}
            onClick={() => setDrillDown("storage")}
          >
            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #fbbf24 0%, #fbbf2444 60%, transparent 100%)" }} />
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48"
              style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(251,191,36,0.12), transparent 70%)" }} />

            <div className="relative flex flex-col flex-1 p-8 gap-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg viewBox="0 0 44 44" fill="none" className="w-12 h-12">
                    <rect width="44" height="44" rx="10" fill="#fbbf24" fillOpacity="0.12" />
                    <rect x="10" y="14" width="24" height="4" rx="1" fill="#fbbf24" fillOpacity="0.4" />
                    <rect x="10" y="20" width="24" height="4" rx="1" fill="#fbbf24" fillOpacity="0.6" />
                    <rect x="10" y="26" width="24" height="4" rx="1" fill="#fbbf24" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-white leading-tight">Storage Technologies</h2>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">
                    Intel instruction sets, accelerators, CXL memory expansion, IPU packet processing, and software projects for agentic AI storage —
                    mapped to storage classes with commercial and open-source vendor adoption.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="p-3 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div className="text-xs font-bold mb-1" style={{ color: "#fbbf24" }}>Instruction Sets</div>
                  <div className="text-xs text-white/40">AVX-512, AES-NI, SHA, CLMUL</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div className="text-xs font-bold mb-1" style={{ color: "#fbbf24" }}>Accelerators</div>
                  <div className="text-xs text-white/40">QAT, IAA, DSA, DLB</div>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div className="text-xs font-bold mb-1" style={{ color: "#fbbf24" }}>Software</div>
                  <div className="text-xs text-white/40">isa-l, SPDK, DPDK, QATzip</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: "#fbbf24" }}>
                <span className="opacity-70 group-hover:opacity-100">View storage catalog</span>
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <ComingSoon category={activeTab} />
        )}
      </div>
    </main>
  );
}
