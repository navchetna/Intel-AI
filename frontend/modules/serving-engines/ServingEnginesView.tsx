import React from "react";

// ── types ────────────────────────────────────────────────────────────────────

interface Stat { label: string; value: string }
interface Engine {
  id: string;
  name: string;
  version: string;
  tagline: string;
  description: string;
  accent: string;
  glow: string;
  textAccent: string;
  icon: React.ReactNode;
  headline: { metric: string; label: string };
  stats: Stat[];
  innovations: { title: string; body: string }[];
  quantization: string[];
  backends: string[];
  usedFor: string;
  github: { stars: string; url: string };
}

// ── data ─────────────────────────────────────────────────────────────────────

const ENGINES: Engine[] = [
  {
    id: "vllm",
    name: "vLLM",
    version: "v0.6+",
    tagline: "The throughput standard",
    description:
      "Pioneered PagedAttention — a virtual memory system for KV caches that eliminated wasted GPU memory and made continuous batching practical. Today the de-facto OpenAI-compatible inference server for production deployments.",
    accent: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    textAccent: "text-emerald-400",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
        <rect width="40" height="40" rx="8" fill="#10b981" fillOpacity="0.15" />
        <path d="M8 12l12 16 12-16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="12" r="2.5" fill="#10b981" />
        <circle cx="20" cy="28" r="2.5" fill="#10b981" />
        <circle cx="32" cy="12" r="2.5" fill="#10b981" />
      </svg>
    ),
    headline: { metric: "24×", label: "throughput vs naïve serving" },
    stats: [
      { label: "Supported models", value: "200 +" },
      { label: "Quantization formats", value: "8" },
      { label: "GitHub stars", value: "40 k+" },
      { label: "Max context", value: "1 M tokens" },
    ],
    innovations: [
      { title: "PagedAttention", body: "Maps KV cache to non-contiguous GPU pages — near-zero waste, enables far larger batch sizes." },
      { title: "Continuous batching", body: "Evicts finished sequences immediately; new requests slot in mid-flight. No padding tax." },
      { title: "Speculative decoding", body: "Draft + verify with a small model to boost decode speed on long outputs by 2–4×." },
      { title: "Disaggregated prefill", body: "Split prefill and decode across different nodes to independently scale each phase." },
    ],
    quantization: ["FP8", "INT4", "INT8", "AWQ", "GPTQ", "GGUF", "BitsAndBytes", "SqueezeLLM"],
    backends: ["NVIDIA", "AMD ROCm", "Intel Gaudi", "Intel CPU (IPEX)", "AWS Inferentia"],
    usedFor: "High-throughput production API endpoints, RAG pipelines, multi-tenant LLM services",
    github: { stars: "40k+", url: "https://github.com/vllm-project/vllm" },
  },
  {
    id: "sglang",
    name: "SGLang",
    version: "v0.4+",
    tagline: "Fastest TTFT in class",
    description:
      "Structured Generation Language runtime built around RadixAttention — an automatic KV-cache sharing mechanism across requests with common prefixes. Excels at agent loops, multi-turn chat, and anything with shared system prompts.",
    accent: "#818cf8",
    glow: "rgba(129,140,248,0.15)",
    textAccent: "text-indigo-400",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
        <rect width="40" height="40" rx="8" fill="#818cf8" fillOpacity="0.15" />
        <circle cx="20" cy="20" r="10" stroke="#818cf8" strokeWidth="2" />
        <path d="M14 20h12M20 14v12" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3" fill="#818cf8" />
      </svg>
    ),
    headline: { metric: "3×", label: "lower TTFT vs vLLM on cached prefixes" },
    stats: [
      { label: "Prefix cache hit", value: "up to 100%" },
      { label: "JSON grammar modes", value: "native" },
      { label: "GitHub stars", value: "12 k+" },
      { label: "Decode throughput", value: "SOTA 2025" },
    ],
    innovations: [
      { title: "RadixAttention", body: "Automatic KV-cache reuse via a radix tree — identical prefixes across requests are computed once." },
      { title: "Zero-overhead scheduler", body: "Batch formation happens in C++ alongside the CUDA kernel — no Python GIL stalls." },
      { title: "Constrained decoding", body: "Native JSON schema, regex, and grammar modes with zero external library overhead." },
      { title: "Expert parallelism (MoE)", body: "Purpose-built all-to-all routing for MoE models; outperforms tensor-parallel on sparse architectures." },
    ],
    quantization: ["FP8", "INT4", "AWQ", "GPTQ", "INT8"],
    backends: ["NVIDIA", "AMD ROCm", "Intel Gaudi", "CPU (experimental)"],
    usedFor: "Agent loops, multi-turn chat with shared system prompts, structured output generation, MoE models",
    github: { stars: "12k+", url: "https://github.com/sgl-project/sglang" },
  },
  {
    id: "dynamo",
    name: "NVIDIA Dynamo",
    version: "v0.2+",
    tagline: "Datacenter-scale disaggregation",
    description:
      "NVIDIA's open-source inference framework purpose-built for distributed multi-node LLM serving. Introduces a Smart Router and Planner that dynamically split prefill and decode across a heterogeneous fleet — sitting above vLLM or TRT-LLM as the orchestration layer.",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    textAccent: "text-amber-400",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-9 h-9">
        <rect width="40" height="40" rx="8" fill="#f59e0b" fillOpacity="0.15" />
        <path d="M10 30V20l10-10 10 10v10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="15" y="22" width="10" height="8" rx="1" stroke="#f59e0b" strokeWidth="2" />
        <path d="M20 22v8" stroke="#f59e0b" strokeWidth="2" />
      </svg>
    ),
    headline: { metric: "∞", label: "horizontal scaling across GPU nodes" },
    stats: [
      { label: "Architecture", value: "Disaggregated" },
      { label: "Smart Router", value: "built-in" },
      { label: "KV cache offload", value: "CPU/NVMe" },
      { label: "Backend", value: "vLLM / TRT-LLM" },
    ],
    innovations: [
      { title: "Smart Router", body: "Routes requests to prefill or decode workers based on real-time load, queue depth, and KV cache locality." },
      { title: "KV Cache offloading", body: "Spills KV cache to CPU DRAM or NVMe, reducing GPU memory pressure and enabling larger context windows." },
      { title: "Planner", body: "Auto-tunes the prefill:decode worker ratio for a given SLO target and traffic pattern." },
      { title: "Multi-backend", body: "Orchestrates vLLM and TensorRT-LLM workers in the same pool for hardware-heterogeneous deployments." },
    ],
    quantization: ["FP8", "INT4", "FP16", "BF16"],
    backends: ["NVIDIA H100/H200", "NVIDIA A100", "Multi-node GPU clusters"],
    usedFor: "Hyperscale LLM API services, datacenter inference clusters, SLO-driven production serving",
    github: { stars: "4k+", url: "https://github.com/ai-dynamo/dynamo" },
  },
];

// ── sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: Stat & { accent: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-white/[0.05] px-3 py-2.5 text-center">
      <span className="text-lg font-bold leading-tight" style={{ color: accent }}>{value}</span>
      <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider leading-none">{label}</span>
    </div>
  );
}

function BackendBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/60">
      {label}
    </span>
  );
}

function QuantBadge({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
    >
      {label}
    </span>
  );
}

function EngineCard({ engine }: { engine: Engine }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07]"
      style={{
        background: "var(--dm-card-bg-alt)",
        boxShadow: `0 0 0 1px var(--dm-card-ring), var(--dm-card-depth), 0 0 80px ${engine.glow}`,
        borderColor: "var(--dm-card-border)",
      }}
    >
      {/* Accent gradient top bar */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${engine.accent}, transparent)` }} />

      {/* Subtle corner glow */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-64 w-64"
        style={{ background: `radial-gradient(ellipse at 0% 0%, ${engine.glow}, transparent 70%)` }}
      />

      <div className="relative flex flex-col flex-1 p-7 gap-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {engine.icon}
            <div>
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold text-white">{engine.name}</h2>
                <span className="text-xs font-mono text-white/30">{engine.version}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: engine.accent }}>
                {engine.tagline}
              </p>
            </div>
          </div>
          {/* Headline metric */}
          <div className="flex-shrink-0 text-right">
            <div className="text-3xl font-black leading-none" style={{ color: engine.accent }}>{engine.headline.metric}</div>
            <div className="text-[10px] text-white/40 mt-1 max-w-[100px] leading-tight">{engine.headline.label}</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-white/60 leading-relaxed">{engine.description}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {engine.stats.map(s => <StatPill key={s.label} {...s} accent={engine.accent} />)}
        </div>

        {/* Innovations */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-3">Key Innovations</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {engine.innovations.map(inn => (
              <div key={inn.title} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: engine.accent }} />
                  <span className="text-sm font-semibold text-white/90">{inn.title}</span>
                </div>
                <p className="text-xs text-white/45 leading-relaxed pl-3.5">{inn.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quantization */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Quantization Support</p>
          <div className="flex flex-wrap gap-1.5">
            {engine.quantization.map(q => <QuantBadge key={q} label={q} accent={engine.accent} />)}
          </div>
        </div>

        {/* Backends */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-2">Hardware Backends</p>
          <div className="flex flex-wrap gap-1.5">
            {engine.backends.map(b => <BackendBadge key={b} label={b} />)}
          </div>
        </div>

        {/* Use case + GitHub */}
        <div className="mt-auto pt-4 border-t border-white/[0.06] flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1">Best For</p>
            <p className="text-xs text-white/55 leading-relaxed">{engine.usedFor}</p>
          </div>
          <a
            href={engine.github.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            ⭐ {engine.github.stars}
          </a>
        </div>
      </div>
    </div>
  );
}

// ── main view ─────────────────────────────────────────────────────────────────

export function ServingEnginesView() {
  return (
    <main
      style={{
        background: "var(--dm-page-bg)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-8">
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c7fd] animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#00c7fd]/80">Inference Infrastructure</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Serving Engines</h1>
          <p className="mt-2 text-base text-white/45 max-w-2xl">
            The inference runtimes powering production LLM deployments — from single-GPU endpoints to multi-node disaggregated clusters.
          </p>
        </div>

        {/* Comparison strip */}
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-white/[0.07] mb-10">
          {[
            { label: "vLLM",   trait: "Throughput leader",    accent: "#10b981" },
            { label: "SGLang", trait: "Lowest TTFT + structured gen", accent: "#818cf8" },
            { label: "Dynamo", trait: "Multi-node scale-out", accent: "#f59e0b" },
          ].map(({ label, trait, accent }) => (
            <div key={label} className="bg-white/[0.03] px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
              <div>
                <span className="text-sm font-bold text-white/90">{label}</span>
                <span className="text-xs text-white/35 ml-2">{trait}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Engine cards */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {ENGINES.map(e => <EngineCard key={e.id} engine={e} />)}
        </div>
      </div>
    </main>
  );
}
