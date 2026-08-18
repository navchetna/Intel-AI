"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  OFFLOAD_MODELS, OFFLOAD_ACCELERATORS, OFFLOAD_MEDIA,
  KV_BYTES_PER_ELEMENT_OPTIONS, DEFAULT_CONTEXT_LENGTHS, DEFAULT_MFU, DEFAULT_CAUSAL_FACTOR,
  WRITE_TO_GPU_BW_GBPS, WRITE_TO_GPU_NOTE,
  type Provenance,
} from "./kv-offload-data";
import { deriveParams, buildContextRow, buildIncrementalRow, type OffloadLevers } from "./kv-offload-calcs";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  return n >= 1024 ? `${(n / 1024).toFixed(n % 1024 === 0 ? 0 : 1)}K` : String(n);
}

function fmtMs(n: number): string {
  return n < 10 ? n.toFixed(2) : n < 1000 ? n.toFixed(1) : n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function selectStyle(isDark: boolean): React.CSSProperties {
  return isDark
    ? { background: "#0e1d38", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.85)", colorScheme: "dark" }
    : { background: "#e2e8f0", border: "1px solid rgba(15,23,42,0.15)", color: "#1e293b", colorScheme: "light" };
}

const inputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

function LeverField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-white/25 max-w-[13rem] leading-snug">{hint}</p>}
    </div>
  );
}

function ProvBadge({ prov }: { prov: Provenance }) {
  const isG = prov === "G";
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold flex-shrink-0"
      title={isG ? "Verified from model card / HF config, or well-established" : "Estimate or inferred — verify before external use"}
      style={{
        background: isG ? "rgba(52,211,153,0.15)" : "rgba(251,191,36,0.15)",
        color: isG ? "#34d399" : "#fbbf24",
      }}
    >
      {prov}
    </span>
  );
}

function VerdictBadge({ offloadWins, factor }: { offloadWins: boolean; factor: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{
        background: offloadWins ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
        color: offloadWins ? "#34d399" : "#f87171",
      }}
    >
      {offloadWins ? "OFFLOAD" : "RECOMPUTE"} wins ({factor.toFixed(1)}x)
    </span>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/[0.07] overflow-hidden mb-6"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold text-white/90">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-white/40 leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── reference accordion ──────────────────────────────────────────────────────

function ReferencePanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden mb-6" style={{ background: "var(--dm-table-bg)" }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-sm font-bold text-white/90">Reference data & method</span>
        <span className="text-xs text-white/30">{open ? "Hide ▲" : "Show ▼"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-5" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
          <div className="pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Model architecture</h3>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--dm-border-a)" }}>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ background: "var(--dm-table-head)" }}>
                    {["Model", "Active B", "Layers", "Dense", "Window", "Win size", "Q heads", "KV heads", "Head dim", "", "Note"].map(h => (
                      <th key={h} className="px-2.5 py-2 text-left font-semibold text-white/40 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OFFLOAD_MODELS.map(m => (
                    <tr key={m.name} style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                      <td className="px-2.5 py-1.5 font-semibold text-white/70 whitespace-nowrap">{m.name}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.activeParamsB}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.layers}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.denseLayers}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.windowLayers}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.windowLayers > 0 ? m.windowSize : "—"}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.qHeads}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.kvHeads}</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.headDim}</td>
                      <td className="px-2.5 py-1.5"><ProvBadge prov={m.prov} /></td>
                      <td className="px-2.5 py-1.5 text-white/35 max-w-xs">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Read-bandwidth media</h3>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--dm-border-a)" }}>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: "var(--dm-table-head)" }}>
                      {["Medium", "GB/s", "", "Note"].map(h => (
                        <th key={h} className="px-2.5 py-2 text-left font-semibold text-white/40 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OFFLOAD_MEDIA.map(m => (
                      <tr key={m.key} style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                        <td className="px-2.5 py-1.5 font-semibold text-white/70">{m.name}</td>
                        <td className="px-2.5 py-1.5 text-white/50 font-mono">{m.readBwGBps}</td>
                        <td className="px-2.5 py-1.5"><ProvBadge prov={m.prov} /></td>
                        <td className="px-2.5 py-1.5 text-white/35">{m.note}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                      <td className="px-2.5 py-1.5 font-semibold text-white/70">Write → GPU (PCIe Gen5 x16)</td>
                      <td className="px-2.5 py-1.5 text-white/50 font-mono">{WRITE_TO_GPU_BW_GBPS}</td>
                      <td className="px-2.5 py-1.5"><ProvBadge prov="G" /></td>
                      <td className="px-2.5 py-1.5 text-white/35">{WRITE_TO_GPU_NOTE}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Accelerator peak BF16 TFLOPS</h3>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--dm-border-a)" }}>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: "var(--dm-table-head)" }}>
                      {["Accelerator", "TFLOPS", "", "Note"].map(h => (
                        <th key={h} className="px-2.5 py-2 text-left font-semibold text-white/40 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {OFFLOAD_ACCELERATORS.map(a => (
                      <tr key={a.name} style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                        <td className="px-2.5 py-1.5 font-semibold text-white/70">{a.name}</td>
                        <td className="px-2.5 py-1.5 text-white/50 font-mono">{a.peakBf16TFLOPS}</td>
                        <td className="px-2.5 py-1.5"><ProvBadge prov={a.prov} /></td>
                        <td className="px-2.5 py-1.5 text-white/35">{a.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Method</h3>
            <ul className="text-xs text-white/45 leading-relaxed space-y-1.5 list-disc pl-4">
              <li>Prefill FLOPs = 2×P_active×T (projections + MLP/experts, linear in tokens) + 4×causal×d_q×[dense_L×T² + window_L×T×min(T,window)] (attention, quadratic). Windowed layers attend ≤ window keys, so their attention is ~linear, not T².</li>
              <li>Recompute time = Prefill FLOPs / (peak BF16 TFLOPS × achieved MFU) — the compute-bound floor; real prefill also carries memory-BW and kernel-launch overheads, so treat this as optimistic.</li>
              <li>KV size (single sequence) = 2×KV_heads×head_dim×bytes × [dense_L×T + window_L×min(T,window)]. Windowed layers store only the window.</li>
              <li>Load time = KV bytes / medium read BW + KV bytes / PCIe write BW (serial sum shown here; a pipelined DMA overlaps them, so the true floor is max(read, write)).</li>
              <li>Concurrency cancels — it scales KV load and recompute equally, so the crossover is per-sequence and concurrency-independent.</li>
              <li>Not modelled: CUDA/HPU graphs, NCCL buffers, activation peak, speculative-decode drafts, prefix-cache reuse (add ~1–4 GiB). MoE weight VRAM tracks total params (all experts resident), independent of this KV analysis.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── main view ──────────────────────────────────────────────────────────────────

export function KvOffloadView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [modelName, setModelName] = useState(OFFLOAD_MODELS.find(m => m.name === "GPT-OSS-120B")?.name ?? OFFLOAD_MODELS[0].name);
  const [acceleratorName, setAcceleratorName] = useState(OFFLOAD_ACCELERATORS.find(a => a.name.includes("Crescent"))?.name ?? OFFLOAD_ACCELERATORS[0].name);
  const [kvBytesPerElement, setKvBytesPerElement] = useState<number>(2);
  const [mfu, setMfu] = useState(DEFAULT_MFU);
  const [causalFactor, setCausalFactor] = useState(DEFAULT_CAUSAL_FACTOR);
  const [contexts, setContexts] = useState<number[]>(DEFAULT_CONTEXT_LENGTHS);
  const [customContext, setCustomContext] = useState("");

  const model = OFFLOAD_MODELS.find(m => m.name === modelName) ?? OFFLOAD_MODELS[0];
  const accelerator = OFFLOAD_ACCELERATORS.find(a => a.name === acceleratorName) ?? OFFLOAD_ACCELERATORS[0];

  const levers: OffloadLevers = { model, peakAccelTFLOPS: accelerator.peakBf16TFLOPS, kvBytesPerElement, mfu, causalFactor };
  const derived = useMemo(() => deriveParams(levers), [model, accelerator, kvBytesPerElement, mfu]);

  const sortedContexts = useMemo(() => [...contexts].sort((a, b) => a - b), [contexts]);
  const rows = useMemo(
    () => sortedContexts.map(T => buildContextRow(levers, derived, T, OFFLOAD_MEDIA)),
    [sortedContexts, derived, causalFactor, model, accelerator, kvBytesPerElement, mfu],
  );

  const baseline = sortedContexts[0];
  const incrementalRows = useMemo(
    () => sortedContexts.filter(T => T !== baseline).map(T => buildIncrementalRow(levers, derived, baseline, T, OFFLOAD_MEDIA)),
    [sortedContexts, derived, causalFactor, model, accelerator, kvBytesPerElement, mfu],
  );

  function addContext() {
    const n = Math.round(Number(customContext));
    if (!n || n <= 0 || contexts.includes(n)) return;
    setContexts(prev => [...prev, n]);
    setCustomContext("");
  }

  function removeContext(T: number) {
    if (contexts.length <= 1) return;
    setContexts(prev => prev.filter(c => c !== T));
  }

  function resetLevers() {
    setKvBytesPerElement(2);
    setMfu(DEFAULT_MFU);
    setCausalFactor(DEFAULT_CAUSAL_FACTOR);
    setContexts(DEFAULT_CONTEXT_LENGTHS);
    setCustomContext("");
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-12">
      <p className="mb-4 text-sm text-white/40 max-w-3xl leading-relaxed">
        For a cached prefix, is it faster to <strong className="text-white/60">load</strong> the KV cache from off-GPU
        media, or <strong className="text-white/60">recompute</strong> it via prefill? Pick a model and accelerator,
        tune the levers, and compare across context lengths — single sequence (concurrency scales both sides equally,
        so it cancels out of the crossover).
      </p>

      {/* ── levers ── */}
      <div
        className="rounded-2xl border border-white/[0.07] p-5 mb-6"
        style={{ background: "var(--dm-filterbar-bg)", boxShadow: "0 0 0 1px var(--dm-border-a)" }}
      >
        <div className="flex flex-wrap gap-4 items-end">
          <LeverField label="Model">
            <select value={modelName} onChange={e => setModelName(e.target.value)} className="min-w-[220px] py-2 px-3 text-sm rounded-lg" style={selectStyle(isDark)}>
              {OFFLOAD_MODELS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </LeverField>

          <LeverField label="Accelerator (drives verdict)">
            <select value={acceleratorName} onChange={e => setAcceleratorName(e.target.value)} className="min-w-[220px] py-2 px-3 text-sm rounded-lg" style={selectStyle(isDark)}>
              {OFFLOAD_ACCELERATORS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
            </select>
          </LeverField>

          <LeverField label="KV bytes / element">
            <select value={kvBytesPerElement} onChange={e => setKvBytesPerElement(Number(e.target.value))} className="min-w-[190px] py-2 px-3 text-sm rounded-lg" style={selectStyle(isDark)}>
              {KV_BYTES_PER_ELEMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </LeverField>

          <LeverField label="Achieved efficiency (MFU)" hint="Fraction of peak actually sustained">
            <input
              type="number" min={0.05} max={1} step={0.05} value={mfu}
              onChange={e => setMfu(Math.min(1, Math.max(0.05, Number(e.target.value) || DEFAULT_MFU)))}
              className="w-24 py-2 px-3 text-sm rounded-lg focus:outline-none" style={inputStyle}
            />
          </LeverField>

          <LeverField label="Causal factor" hint="0.5 = causal mask halves QK^T/AV work">
            <input
              type="number" min={0.1} max={1} step={0.1} value={causalFactor}
              onChange={e => setCausalFactor(Math.min(1, Math.max(0.1, Number(e.target.value) || DEFAULT_CAUSAL_FACTOR)))}
              className="w-24 py-2 px-3 text-sm rounded-lg focus:outline-none" style={inputStyle}
            />
          </LeverField>

          <LeverField label="Add context (tokens)">
            <div className="flex gap-2">
              <input
                type="number" min={1} value={customContext} placeholder="e.g. 65536"
                onChange={e => setCustomContext(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addContext(); }}
                className="w-32 py-2 px-3 text-sm rounded-lg focus:outline-none" style={inputStyle}
              />
              <button
                onClick={addContext}
                className="px-3 py-2 text-sm rounded-lg font-semibold transition-colors"
                style={{ background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.4)", color: "#22d3ee" }}
              >
                +
              </button>
            </div>
          </LeverField>

          <button
            onClick={resetLevers}
            className="py-2 px-4 text-sm rounded-lg text-white/40 hover:text-white/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── derived model params (auto) ── */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { label: "Active params", value: `${model.activeParamsB}B` },
          { label: "Layers", value: `${model.layers} (${model.denseLayers} dense${model.windowLayers ? ` / ${model.windowLayers} window@${model.windowSize}` : ""})` },
          { label: "Q / KV heads", value: `${model.qHeads} / ${model.kvHeads}` },
          { label: "Head dim", value: model.headDim },
          { label: "Q width (d_q)", value: derived.qWidth },
          { label: "KV bytes/tok/layer", value: derived.kvBytesPerTokLayer.toLocaleString() },
          { label: "Accel peak / achieved TFLOPS", value: `${accelerator.peakBf16TFLOPS} / ${derived.achievedTFLOPS.toFixed(0)}` },
        ].map(chip => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px]"
            style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}
          >
            <span className="uppercase tracking-wide font-semibold text-white/35">{chip.label}</span>
            <span className="font-mono text-white/70">{chip.value}</span>
          </span>
        ))}
      </div>

      {/* ── absolute + verdict table ── */}
      <SectionCard
        title="Load vs recompute, per context length"
        subtitle="Total load time (read + write to GPU, serial) for each medium, against recompute time on the selected accelerator. The fastest medium is highlighted; the verdict shows the winning side's multiple."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Context</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">KV size</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Prefill TFLOP</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Recompute (ms)</th>
                {OFFLOAD_MEDIA.map(m => (
                  <th key={m.key} className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider" title={m.name}>
                    {m.key.toUpperCase()} load (ms)
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Verdict</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.contextTokens} className="transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3 font-mono text-white/80 font-semibold">{fmtTokens(row.contextTokens)}</td>
                  <td className="px-4 py-3 text-center font-mono text-white/50">{row.kvGiB.toFixed(2)} GiB</td>
                  <td className="px-4 py-3 text-center font-mono text-white/50">{row.prefillTFLOP.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center font-mono text-white/70 font-semibold">{fmtMs(row.recomputeMs)}</td>
                  {row.mediaLoadMs.map(m => (
                    <td
                      key={m.key}
                      className="px-4 py-3 text-center font-mono"
                      style={m.key === row.fastestMedia.key ? { color: "#34d399", fontWeight: 700 } : { color: "rgba(255,255,255,0.5)" }}
                    >
                      {fmtMs(m.totalMs)}
                    </td>
                  ))}
                  <td className="px-4 py-3"><VerdictBadge offloadWins={row.offloadWins} factor={row.speedupFactor} /></td>
                  <td className="px-2 py-3 text-center">
                    {contexts.length > 1 && contexts.includes(row.contextTokens) && !DEFAULT_CONTEXT_LENGTHS.includes(row.contextTokens) && (
                      <button
                        onClick={() => removeContext(row.contextTokens)}
                        aria-label={`Remove ${fmtTokens(row.contextTokens)} context`}
                        className="text-white/20 hover:text-white/50 transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* ── incremental table ── */}
      <SectionCard
        title={`Incremental vs ${fmtTokens(baseline)} baseline`}
        subtitle="Extra KV to load vs. extra prefill to recompute, isolating the marginal cost of extending context — useful when the baseline prefix is already resident and only the tail is new."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Delta</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Extra KV</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Extra prefill TFLOP</th>
                <th className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider">Extra recompute (ms)</th>
                {OFFLOAD_MEDIA.map(m => (
                  <th key={m.key} className="px-4 py-3 text-center font-semibold text-white/50 text-xs uppercase tracking-wider" title={m.name}>
                    +{m.key.toUpperCase()} (ms)
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Incremental verdict</th>
              </tr>
            </thead>
            <tbody>
              {incrementalRows.map(row => {
                const fastest = Math.min(...row.extraMediaLoadMs.map(m => m.extraMs));
                return (
                  <tr key={row.toTokens} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-4 py-3 font-mono text-white/80 font-semibold">{fmtTokens(row.fromTokens)} → {fmtTokens(row.toTokens)}</td>
                    <td className="px-4 py-3 text-center font-mono text-white/50">{row.extraKvGiB.toFixed(2)} GiB</td>
                    <td className="px-4 py-3 text-center font-mono text-white/50">{row.extraPrefillTFLOP.toFixed(1)}</td>
                    <td className="px-4 py-3 text-center font-mono text-white/70 font-semibold">{fmtMs(row.extraRecomputeMs)}</td>
                    {row.extraMediaLoadMs.map(m => (
                      <td
                        key={m.key}
                        className="px-4 py-3 text-center font-mono"
                        style={m.extraMs === fastest ? { color: "#34d399", fontWeight: 700 } : { color: "rgba(255,255,255,0.5)" }}
                      >
                        {fmtMs(m.extraMs)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
                        style={{
                          background: row.offloadDeltaWins ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
                          color: row.offloadDeltaWins ? "#34d399" : "#f87171",
                        }}
                      >
                        {row.offloadDeltaWins ? "OFFLOAD delta wins" : "RECOMPUTE delta wins"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <ReferencePanel />
    </div>
  );
}
