"use client";

import { useMemo, useState } from "react";
import {
  calcCuration, CURATION_DEFAULTS, WORKLOAD_ORDER, WORKLOAD_META,
  type CurationInputs, type WorkloadId, type WorkloadInput, type WorkloadResult, type Modality,
} from "./curation-calcs";
import { fmt, fmtInt, SectionHeader, Field, Panel, StatRow, MetricCard, StatusChip } from "@/components/ui";

const MODALITY_COLOR: Record<Modality, string> = {
  text: "156,163,175", vision: "96,165,250", speech: "52,211,153", video: "248,113,113",
};
const MODALITY_LABEL: Record<Modality, string> = { text: "Text", vision: "Vision", speech: "Speech", video: "Video" };

// Stage display order + labels, matching the source architecture diagram left-to-right.
const STAGE_ORDER: { stage: string; workloads: WorkloadId[] }[] = [
  { stage: "Ingestion", workloads: ["ingestion"] },
  { stage: "Dedup", workloads: ["dedupCpu", "dedupGpu"] },
  { stage: "Quality filtering", workloads: ["qualityCpu", "qualityGpu"] },
  { stage: "Modality processing", workloads: ["modalityCpu", "modalityGpu"] },
  { stage: "Safety / PII", workloads: ["safetyCpu", "safetyGpu"] },
  { stage: "Packaging", workloads: ["packaging"] },
  { stage: "Orchestration / versioning", workloads: ["orchestration"] },
];

function ModalityCard({ label, dot, enabled, onToggle, gbReadout, children }: {
  label: string; dot: string; enabled: boolean; onToggle: (v: boolean) => void; gbReadout: string; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-4 transition-colors"
      style={{ borderColor: enabled ? `rgba(${dot},0.35)` : "rgba(255,255,255,0.08)", background: enabled ? `rgba(${dot},0.05)` : "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <span
          role="switch" aria-checked={enabled} tabIndex={0}
          onClick={() => onToggle(!enabled)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(!enabled); } }}
          className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: enabled ? `rgb(${dot})` : "rgba(255,255,255,0.15)" }}
        >
          <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform" style={{ transform: enabled ? "translateX(18px)" : "translateX(3px)" }} />
        </span>
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: `rgb(${dot})` }} />
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="ml-auto text-[11px] font-mono text-white/40">{gbReadout}</span>
      </div>
      {enabled && <div className="grid grid-cols-2 gap-2">{children}</div>}
    </div>
  );
}

function WorkloadRow({ id, input, result, onChange }: {
  id: WorkloadId; input: WorkloadInput; result: WorkloadResult; onChange: (patch: Partial<WorkloadInput>) => void;
}) {
  const meta = WORKLOAD_META[id];
  const hwColor = meta.hardware === "cpu" ? "56,189,248" : "167,139,250";
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: meta.compliance ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.08)",
        background: meta.compliance ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)",
        opacity: input.enabled ? 1 : 0.6,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <input
            type="checkbox" checked={input.enabled}
            onChange={e => onChange({ enabled: e.target.checked })}
            aria-label={`Enable ${meta.label}`}
            className="w-4 h-4 mt-1 cursor-pointer accent-[#818cf8] flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-white">{meta.label}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                style={{ background: `rgba(${hwColor},0.15)`, color: `rgb(${hwColor})` }}
              >
                {meta.hardware === "cpu" ? "Xeon 6 (CPU)" : "GPU"}
              </span>
              {meta.compliance && (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-warning/15 text-warning flex-shrink-0">
                  ⚠ Compliance gate
                </span>
              )}
              <span className="flex items-center gap-1 flex-shrink-0">
                {meta.modalities.map(m => (
                  <span key={m} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${MODALITY_COLOR[m]})` }} title={MODALITY_LABEL[m]} />
                ))}
              </span>
            </div>
            <p className="text-[12px] text-white/50 leading-snug mb-1">{meta.description}</p>
            <p className="text-[11px] text-white/30 italic">{meta.tools.join(" · ")}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-white/30 uppercase tracking-wide text-right whitespace-nowrap">Throughput</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" min={0} step={0.5} value={input.throughputGBPerHour}
                onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange({ throughputGBPerHour: v }); }}
                className="w-20 rounded-lg px-2 py-1.5 text-sm text-right text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors"
              />
              <span className="text-[11px] text-white/30 whitespace-nowrap">GB/hr/{meta.hardware === "cpu" ? "core" : "GPU"}</span>
            </div>
          </label>
          <div className="text-right min-w-[80px]">
            <div className="text-[10px] text-white/30 uppercase tracking-wide">Time</div>
            <div className="font-mono text-sm font-bold text-white">
              {input.enabled ? fmt(result.timeHours, 1) : "—"}<span className="text-white/40 text-xs font-sans"> hr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DataCurationView() {
  const [inputs, setInputs] = useState<CurationInputs>(CURATION_DEFAULTS);
  const r = useMemo(() => calcCuration(inputs), [inputs]);

  const setCorpus = (patch: Partial<CurationInputs["corpus"]>) =>
    setInputs(prev => ({ ...prev, corpus: { ...prev.corpus, ...patch } }));
  const set = (patch: Partial<CurationInputs>) => setInputs(prev => ({ ...prev, ...patch }));
  const setWorkload = (id: WorkloadId, patch: Partial<WorkloadInput>) =>
    setInputs(prev => ({ ...prev, workloads: { ...prev.workloads, [id]: { ...prev.workloads[id], ...patch } } }));

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-20">

        {/* ── header ── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#2dd4bf]/80">Data Curation Sizing</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-3">Multimodal Data Curation Pipeline</h1>
            <p className="text-[14px] text-white/45 max-w-2xl leading-relaxed">
              Modeled on the ingestion → dedup → quality filtering → modality processing → safety/PII → packaging
              pipeline, plus orchestration and storage. Every workload below is independently configurable — enable
              only the tools you actually run, and tune throughput to your own profiling. There is no source
              spreadsheet behind this one: every default is a planning-grade order-of-magnitude estimate, not a
              verified figure.
            </p>
          </div>
          <button
            type="button" onClick={() => setInputs(CURATION_DEFAULTS)}
            className="flex-shrink-0 rounded-lg border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/60 hover:text-white hover:border-white/30 transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        {/* ── summary banner ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 mb-2">
          <span className="text-[12px] font-semibold text-white/50 mr-1">Current plan:</span>
          <StatusChip ok={r.totals.wallClockHours < 24 * 14} textOk="Under 2 weeks" textBad="Over 2 weeks — add capacity" />
          <span className="text-[12px] text-white/40">
            Binding stage: <span className="font-bold text-white/75">{r.totals.bindingWorkload ? WORKLOAD_META[r.totals.bindingWorkload].label : "—"}</span>
          </span>
          <span className="text-[12px] text-white/40 ml-auto">
            Total wall-clock: <span className="font-bold text-white/75">{fmt(r.totals.wallClockHours, 1)} hr</span> ({fmt(r.totals.wallClockHours / 24, 1)} days)
          </span>
        </div>

        {/* ═══════════════ 0 · CORPUS COMPOSITION ═══════════════ */}
        <SectionHeader index="0" title="Corpus Composition" subtitle="what's actually in the raw dataset — drives every downstream workload" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ModalityCard label="Text" dot={MODALITY_COLOR.text} enabled={inputs.corpus.textEnabled} onToggle={v => setCorpus({ textEnabled: v })} gbReadout={`${fmt(r.raw.textGB, 0)} GB`}>
            <Field label="Documents" value={inputs.corpus.textDocsM} unit="M" min={0} step={10} onChange={v => setCorpus({ textDocsM: v })} />
            <Field label="Avg doc size" value={inputs.corpus.textAvgKB} unit="KB" min={0} step={1} onChange={v => setCorpus({ textAvgKB: v })} />
          </ModalityCard>
          <ModalityCard label="Vision" dot={MODALITY_COLOR.vision} enabled={inputs.corpus.visionEnabled} onToggle={v => setCorpus({ visionEnabled: v })} gbReadout={`${fmt(r.raw.visionGB, 0)} GB`}>
            <Field label="Images" value={inputs.corpus.visionImagesM} unit="M" min={0} step={1} onChange={v => setCorpus({ visionImagesM: v })} />
            <Field label="Avg image size" value={inputs.corpus.visionAvgMB} unit="MB" min={0} step={0.05} onChange={v => setCorpus({ visionAvgMB: v })} />
          </ModalityCard>
          <ModalityCard label="Speech" dot={MODALITY_COLOR.speech} enabled={inputs.corpus.speechEnabled} onToggle={v => setCorpus({ speechEnabled: v })} gbReadout={`${fmt(r.raw.speechGB, 0)} GB`}>
            <Field label="Audio hours" value={inputs.corpus.speechHours} unit="hrs" min={0} step={100} onChange={v => setCorpus({ speechHours: v })} />
            <Field label="Avg bitrate" value={inputs.corpus.speechKbps} unit="kbps" min={0} step={8} onChange={v => setCorpus({ speechKbps: v })} />
          </ModalityCard>
          <ModalityCard label="Video" dot={MODALITY_COLOR.video} enabled={inputs.corpus.videoEnabled} onToggle={v => setCorpus({ videoEnabled: v })} gbReadout={`${fmt(r.raw.videoGB, 0)} GB`}>
            <Field label="Video hours" value={inputs.corpus.videoHours} unit="hrs" min={0} step={50} onChange={v => setCorpus({ videoHours: v })} />
            <Field label="Avg bitrate" value={inputs.corpus.videoMbps} unit="Mbps" min={0} step={0.5} onChange={v => setCorpus({ videoMbps: v })} />
          </ModalityCard>
        </div>
        <div className="mt-3 text-right text-[12px] text-white/40">
          Raw corpus total: <span className="font-mono font-bold text-white/80">{fmt(r.raw.totalGB, 0)} GB</span> ({fmt(r.raw.totalGB / 1000, 2)} TB)
        </div>

        {/* ═══════════════ 1 · CLUSTER RESOURCES & CASCADE ═══════════════ */}
        <SectionHeader index="1" title="Cluster Resources & Filtering Cascade" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Field label="Xeon 6 cores available" value={inputs.cpuCoresAvailable} unit="cores" min={1} step={16}
            note="Total CPU pool for every CPU-tagged workload below."
            onChange={v => set({ cpuCoresAvailable: v })} />
          <Field label="GPUs available" value={inputs.gpusAvailable} unit="GPUs" min={0} step={1}
            note="Total GPU pool for every GPU-tagged workload below."
            onChange={v => set({ gpusAvailable: v })} />
          <Field label="Cores / Xeon 6 socket" value={inputs.coresPerXeon6Socket} unit="cores" min={1} step={8}
            note="Used to convert the core pool into socket/power counts."
            onChange={v => set({ coresPerXeon6Socket: v })} />
          <Field label="Xeon 6 socket TDP" value={inputs.xeon6SocketTdpW} unit="W" min={1} step={25}
            note="Per-socket thermal design power, for the power estimate."
            onChange={v => set({ xeon6SocketTdpW: v })} />
          <Field label="GPU TDP" value={inputs.gpuTdpW} unit="W" min={1} step={50}
            note="Per-GPU thermal design power."
            onChange={v => set({ gpuTdpW: v })} />
          <Field label="Facility power overhead" value={inputs.facilityPowerOverhead} unit="×" min={1} step={0.05}
            note="Multiplier over device-only power for cooling, host, fabric, PSU loss."
            onChange={v => set({ facilityPowerOverhead: v })} />
          <Field label="Dedup survivor fraction" value={inputs.dedupSurvivorFraction} unit="0–1" min={0} max={1} step={0.01}
            note="Fraction of the raw corpus that survives Dedup (isn't a duplicate)."
            onChange={v => set({ dedupSurvivorFraction: v })} />
          <Field label="Quality survivor fraction" value={inputs.qualitySurvivorFraction} unit="0–1" min={0} max={1} step={0.01}
            note="Fraction of the post-Dedup corpus that passes Quality filtering."
            onChange={v => set({ qualitySurvivorFraction: v })} />
          <Field label="Safety survivor fraction" value={inputs.safetySurvivorFraction} unit="0–1" min={0} max={1} step={0.01}
            note="Fraction of the post-Quality corpus that passes Safety/PII (fully rejected items only — redaction doesn't remove items)."
            onChange={v => set({ safetySurvivorFraction: v })} />
        </div>

        {/* ═══════════════ 2 · PIPELINE WORKLOADS ═══════════════ */}
        <SectionHeader index="2" title="Pipeline Workloads" subtitle="one card per tool group from the architecture diagram — toggle and tune each independently" />
        <div className="space-y-6">
          {STAGE_ORDER.map(({ stage, workloads }) => (
            <div key={stage}>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/35 mb-2.5">{stage}</h3>
              <div className="space-y-2.5">
                {workloads.map(id => (
                  <WorkloadRow
                    key={id} id={id} input={inputs.workloads[id]} result={r.workloads[id]}
                    onChange={patch => setWorkload(id, patch)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════ RESULTS ═══════════════ */}
        <SectionHeader index="3" title="Results" subtitle="aggregated across every enabled workload above" />

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <MetricCard label="Wall-clock" value={fmt(r.totals.wallClockHours / 24, 1)} unit="days" accent="56,189,248" />
          <MetricCard label="CPU core-hours" value={fmt(r.totals.cpuCoreHours / 1000, 1)} unit="k core-hrs" accent="56,189,248" />
          <MetricCard label="GPU-hours" value={fmt(r.totals.gpuHours, 0)} unit="GPU-hrs" accent="167,139,250" />
          <MetricCard label="Facility power" value={fmt(r.power.totalPowerKW, 1)} unit="kW" accent="248,113,113" />
          <MetricCard label="Packaged output" value={fmt(r.storage.packagedGB / 1000, 2)} unit="TB" accent="52,211,153" />
          <MetricCard label="Steady-state storage" value={fmt(r.storage.steadyStateGB / 1000, 2)} unit="TB" accent="52,211,153" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="Per-workload time & resource-hours" accent="56,189,248">
            {WORKLOAD_ORDER.map(id => {
              const meta = WORKLOAD_META[id];
              const w = r.workloads[id];
              if (!inputs.workloads[id].enabled) return null;
              return (
                <StatRow
                  key={id}
                  label={`${meta.stage} — ${meta.label}`}
                  value={fmt(w.timeHours, 1)}
                  unit="hr"
                  note={`${fmt(w.resourceHours, 0)} ${meta.hardware === "cpu" ? "core-hrs" : "GPU-hrs"} · ${fmt(w.volumeGB, 0)} GB processed`}
                />
              );
            })}
          </Panel>

          <Panel title="Storage cascade" accent="52,211,153">
            <StatRow label="Raw corpus" value={fmt(r.storage.rawGB / 1000, 2)} unit="TB" note="Everything ingested." />
            <StatRow label="Post-Dedup" value={fmt(r.storage.postDedupGB / 1000, 2)} unit="TB" note="After duplicate removal." />
            <StatRow label="Post-Quality filtering" value={fmt(r.storage.postQualityGB / 1000, 2)} unit="TB" note="After low-quality removal." />
            <StatRow label="Packaged (final)" value={fmt(r.storage.packagedGB / 1000, 2)} unit="TB" note="After Safety/PII — what you actually train on." />
            <StatRow label="Peak transient" value={fmt(r.storage.peakTransientGB / 1000, 2)} unit="TB" note="Worst case: every intermediate stage output retained simultaneously." />
            <StatRow label="Steady-state" value={fmt(r.storage.steadyStateGB / 1000, 2)} unit="TB" note="Realistic long-term footprint: raw (provenance) + packaged (training-ready) only." />
          </Panel>

          <Panel title="Power & facility" accent="248,113,113">
            <StatRow label="CPU power" value={fmt(r.power.cpuPowerKW, 2)} unit="kW" note="Xeon 6 socket count × TDP × facility overhead." />
            <StatRow label="GPU power" value={fmt(r.power.gpuPowerKW, 2)} unit="kW" note="GPU count × TDP × facility overhead." />
            <StatRow label="Total facility power" value={fmt(r.power.totalPowerKW, 2)} unit="kW" note="Provisioned power for both pools — not utilization-weighted." />
          </Panel>

          <Panel title="Binding stage" accent="129,140,248">
            <StatRow
              label={r.totals.bindingWorkload ? `${WORKLOAD_META[r.totals.bindingWorkload].stage} — ${WORKLOAD_META[r.totals.bindingWorkload].label}` : "—"}
              value={fmt(r.totals.bindingHours, 1)}
              unit="hr"
              note="The single longest-running enabled workload — the first place to add capacity if you need to go faster."
            />
            <StatRow label="Total CPU core-hours" value={fmtInt(r.totals.cpuCoreHours)} unit="core-hrs" />
            <StatRow label="Total GPU-hours" value={fmtInt(r.totals.gpuHours)} unit="GPU-hrs" />
          </Panel>
        </div>

        {/* ═══════════════ NOTES ═══════════════ */}
        <SectionHeader index="4" title="Scope Notes" />
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 space-y-2.5">
          <p className="text-[12px] leading-relaxed text-amber-100/70 flex gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠</span>
            <span>CSAM hash-matching in Safety/PII (the perceptual hash-match step in the CPU workload) is a <strong>legal compliance gate</strong>, not an optional quality filter — it can be tuned for throughput but should never be disabled for any pipeline ingesting public or user-submitted content.</span>
          </p>
          <p className="text-[12px] leading-relaxed text-amber-100/70 flex gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠</span>
            <span>Open-source tooling coverage for speech and video is thinner than for text and vision — most real pipelines chain several single-purpose libraries here (as modeled above) rather than using one mature end-to-end framework. Expect more integration effort for those two modalities.</span>
          </p>
          <p className="text-[12px] leading-relaxed text-amber-100/70 flex gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠</span>
            <span>Every throughput default on this page is a planning-grade, order-of-magnitude estimate — there is no source spreadsheet behind this tool the way there is for the LLM Pretraining, RL Post-Training, and Fine-Tuning sizing tabs. Calibrate every number against your own profiling before committing hardware.</span>
          </p>
          <p className="text-[12px] leading-relaxed text-amber-100/70 flex gap-2">
            <span className="text-amber-400 flex-shrink-0">⚠</span>
            <span>The pipeline is modeled as strictly sequential (each stage waits on the previous stage&rsquo;s output), matching the diagram&rsquo;s left-to-right layout. In practice, independent stages can sometimes overlap — treat the wall-clock total above as an upper bound, not a guarantee.</span>
          </p>
        </div>

      </div>
    </main>
  );
}
