"use client";

import React, { useState } from "react";
import { Xeon6SPDetailView } from "./Xeon6SPDetailView";
import { AcceleratorDetailView } from "./AcceleratorDetailView";
import { SAMBANOVA_SN40L } from "./sambanova-data";
import { CRESCENT_ISLAND } from "./crescent-island-data";
import { ARC_PRO_B60 } from "./arc-b60-data";
import { StorageView } from "./StorageView";

const DETAIL_PAGE_IDS = new Set(["xeon6-sp", "sambanova", "crescent-island", "arc-b60", "storage"]);

interface SpecRow { label: string; value: string }
interface Chip {
  id: string;
  name: string;
  codeName: string;
  category: "CPU" | "GPU" | "Accelerator";
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

const CHIPS: Chip[] = [
  {
    id: "xeon6-sp",
    name: "Intel® Xeon® 6 SP",
    codeName: "Granite Rapids — Scalable Performance",
    category: "CPU",
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
    tagline: "Memory capacity per dollar and per watt, built for agentic AI",
    description:
      "Pre-launch Xe3P inference GPU that trades peak FLOPS for memory capacity — 160 GB reference / 480 GB partner-ceiling LPDDR5X in a 350 W air-cooled PCIe card. Intel has disclosed no throughput figures at this stage; every TFLOPS number below is a derived estimate, not a spec.",
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
      { label: "Memory bandwidth", value: "684 GB/s – 1.54 TB/s (disputed)" },
      { label: "Board power", value: "350 W, air-cooled" },
      { label: "Host interface", value: "PCIe Gen5 x16 (assumed)" },
      { label: "BF16 (derived, CI-B)", value: "~393 TFLOPS" },
      { label: "Status", value: "Sampling H2 2026 · Volume 2027" },
    ],
    useCases: ["Sparse MoE serving", "Long-context agentic sessions", "High-concurrency batch inference", "Many co-resident small models", "Embedding / reranker serving"],
    highlights: [
      "160–480 GB LPDDR5X trades ~3–5× bandwidth for 1.7–3.3× capacity vs. HBM — a capacity-bound, not bandwidth-bound, bet",
      "Intel confirms zero throughput specs pre-launch — every TFLOPS figure in circulation (including here) is derived, not published",
      "Dec 2025 Battlematrix testing: only MXFP4 models loaded successfully; INT4/FP8/AWQ failed — treat software maturity as the primary adoption risk",
      "No proprietary scale-up fabric — PCIe P2P makes host lane count (Xeon 6 6767P+) a first-order sizing constraint",
    ],
    tier: "Next-Gen",
  },
  {
    id: "sambanova",
    name: "SambaNova SN40L",
    codeName: "Reconfigurable Dataflow Unit — Cerulean",
    category: "Accelerator",
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
            <div className="flex items-center gap-2 mt-0.5">
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
    description: "Discrete GPUs for batch inference, AI workstations and next-gen datacenter serving — from shipping Arc Pro cards to pre-production Crescent Island.",
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

export function SiliconView() {
  const [drillDown, setDrillDown] = useState<string | null>(null);
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
          <>
            {COMPUTE_GROUPS.map(g => (
              <ComputeAccordion key={g.category} group={g}
                chips={CHIPS.filter(c => c.category === g.category)}
                expanded={expanded.has(g.category)}
                onToggle={() => toggleGroup(g.category)}
                onChipClick={setDrillDown} />
            ))}
          </>
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
