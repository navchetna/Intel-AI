"use client";

import React, { useState } from "react";
import { Xeon6SPDetailView } from "./Xeon6SPDetailView";

interface SpecRow { label: string; value: string }
interface Chip {
  id: string;
  name: string;
  codeName: string;
  category: "CPU" | "Accelerator" | "Partner";
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
    name: "Intel® Gaudi® 3 B70",
    codeName: "Rialto Bridge",
    category: "Accelerator",
    tagline: "Open AI training & serving accelerator",
    description:
      "Purpose-built AI accelerator with 128 Tensor Processing Cores and 96 GB HBM2e. Open software stack (SynapseAI + vLLM backend) delivers leading perf-per-dollar for LLM training and inference.",
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
    peakFigure: { value: "1835", unit: "TFLOPS", label: "peak BF16 compute" },
    specs: [
      { label: "Tensor cores", value: "128 (MME + TPC)" },
      { label: "HBM2e memory", value: "96 GB" },
      { label: "Memory bandwidth", value: "3.7 TB/s" },
      { label: "BF16 peak", value: "1835 TFLOPS" },
      { label: "Interconnect", value: "24 × 100 Gb/s RDMA" },
      { label: "Form factor", value: "OAM / PCIe" },
      { label: "TDP", value: "600 W (OAM)" },
      { label: "SW stack", value: "SynapseAI / vLLM" },
    ],
    useCases: ["LLM training", "Large-scale inference", "LoRA / QLoRA fine-tuning", "Multi-node distributed", "Vision-language models"],
    highlights: [
      "24-port 100G RDMA removes NVLink vendor lock-in for scale-out",
      "vLLM 0.6+ supports Gaudi 3 as a first-class backend",
      "SynapseAI is open-source; PyTorch Eager + torch.compile both supported",
      "~40% better perf-per-dollar vs H100 on LLM inference (MLPerf 4.0)",
    ],
    tier: "Production",
  },
  {
    id: "crescent-island",
    name: "Crescent Island",
    codeName: "Intel Next-Gen AI Accelerator",
    category: "Accelerator",
    tagline: "The next horizon of Intel AI silicon",
    description:
      "Intel’s next-generation AI accelerator — chiplet-disaggregated architecture with tightly integrated HBM3e, a re-architected FP8 dataflow engine, and UCIe die-to-die fabric for transformer workloads at datacenter scale.",
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
    peakFigure: { value: "~4×", unit: "uplift", label: "vs Gaudi 3 (projected)" },
    specs: [
      { label: "Architecture", value: "Chiplet disaggregated" },
      { label: "Memory", value: "HBM3e (on-die)" },
      { label: "Interconnect", value: "UCIe + enhanced RDMA" },
      { label: "Precisions", value: "FP8 / BF16 / INT4" },
      { label: "Process node", value: "Intel 18A (target)" },
      { label: "SW stack", value: "SynapseAI next-gen" },
      { label: "Status", value: "Pre-production" },
      { label: "Segment", value: "Hyperscale AI clusters" },
    ],
    useCases: ["Frontier model training", "Dense MoE serving", "Multi-modal AI", "Agentic workloads", "Sovereign AI infra"],
    highlights: [
      "Chiplet tiling allows compute and memory tiles to scale independently",
      "Native FP8 dataflow engine for maximum throughput on modern LLMs",
      "UCIe die-to-die fabric pushes bandwidth beyond what HBM alone can deliver",
      "Intel 18A node targets industry-leading performance per watt",
    ],
    tier: "Next-Gen",
  },
  {
    id: "sambanova",
    name: "SambaNova SN40L",
    codeName: "Reconfigurable Dataflow Unit",
    category: "Partner",
    tagline: "Spatial dataflow for trillion-param models",
    description:
      "SambaNova’s Reconfigurable Dataflow Architecture (RDA) maps neural graphs directly onto a spatial array of processing elements — eliminating the von Neumann memory wall that limits GPU accelerators on extreme-scale LLMs.",
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
    peakFigure: { value: "1.5T", unit: "params", label: "MoE models served natively" },
    specs: [
      { label: "Architecture", value: "Reconfigurable Dataflow" },
      { label: "On-chip SRAM", value: "520 MB per chip" },
      { label: "DDR5 capacity", value: "1.5 TB per node" },
      { label: "Largest model", value: "1.5T-param MoE" },
      { label: "TTFT", value: "Industry-leading long-ctx" },
      { label: "API surface", value: "OpenAI-compatible" },
      { label: "Deployment", value: "SambaNova Cloud" },
      { label: "Quantisation req.", value: "None (full-precision)" },
    ],
    useCases: ["Trillion-param MoE", "Ultra-long context", "Low-latency enterprise API", "Full-precision inference", "Research at scale"],
    highlights: [
      "Dataflow execution streams weights through on-chip SRAM — no DRAM bottleneck",
      "Serves 1.5T-param MoE with zero quantisation loss",
      "Sub-ms TTFT on context lengths where GPUs stall on HBM bandwidth",
      "OpenAI-compatible API — zero application-level changes to adopt",
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

export function SiliconView() {
  const [drillDown, setDrillDown] = useState<string | null>(null);

  if (drillDown === "xeon6-sp") {
    return <Xeon6SPDetailView onBack={() => setDrillDown(null)} />;
  }

  return (
    <main style={{ background: "var(--dm-page-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#a78bfa]/80">Hardware Platform</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Silicon</h1>
          <p className="mt-2 text-base text-white/45 max-w-2xl">
            The compute substrate powering Intel-AI — from CPU inference engines to purpose-built AI accelerators and partner silicon.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {Object.entries(TIER_STYLES).map(([tier, style]) => (
            <div key={tier} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: style.bg, color: style.text }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: style.text }} />
              {tier}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {CHIPS.slice(0, 3).map(c => (
            <ChipCard key={c.id} chip={c}
              onClick={c.id === "xeon6-sp" ? () => setDrillDown("xeon6-sp") : undefined} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CHIPS.slice(3).map(c => <ChipCard key={c.id} chip={c} />)}
        </div>
      </div>
    </main>
  );
}
