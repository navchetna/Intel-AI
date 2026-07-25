"use client";

import { useMemo, useState } from "react";
import {
  calcTraining, TRAINING_DEFAULTS,
  type TrainingInputs,
  type ParameterActivation, type SequenceMixer, type Modality,
  type ComputePrecision, type Optimizer, type HardwarePlatform,
} from "./training-calcs";
import { fmt, fmtInt, fmtFlops, fmtPct, AxisCard, SectionHeader, Field, Panel, StatRow, MetricCard, StatusChip } from "./shared";

// ── Main view ─────────────────────────────────────────────────────────────────────

export function TrainingSizingView() {
  const [inputs, setInputs] = useState<TrainingInputs>(TRAINING_DEFAULTS);
  const r = useMemo(() => calcTraining(inputs), [inputs]);
  const set = (patch: Partial<TrainingInputs>) => setInputs(prev => ({ ...prev, ...patch }));

  const isMoE = inputs.parameterActivation === "MoE";
  const isHybridSSM = inputs.sequenceMixer === "Hybrid-SSM";
  const isMultiModal = inputs.modality === "Multi-modal";
  const isMuon = inputs.optimizer === "Muon";

  return (
    <div>
      {/* ── intro ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <p className="text-[14px] text-white/45 max-w-2xl leading-relaxed">
          Every choice below compounds into GPU count, HBM headroom, network topology, and power draw — this is
          the infrastructure you are about to buy or reserve. Set the six configuration axes first; they change
          which formulas apply everywhere else on this page. Then tune the model, hardware, and parallelism
          inputs and watch the feasibility checks in the results below.
        </p>
        <button
          type="button" onClick={() => setInputs(TRAINING_DEFAULTS)}
          className="flex-shrink-0 rounded-lg border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/60 hover:text-white hover:border-white/30 transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* ── feasibility banner ── */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 mb-2">
          <span className="text-[12px] font-semibold text-white/50 mr-1">Current plan:</span>
          <StatusChip ok={r.memory.fitsInHbm} textOk="Fits in HBM" textBad="OVER HBM budget" />
          <StatusChip ok={r.parallelism.tpWithinDomain} textOk="TP within NVLink domain" textBad="TP crosses IB" />
          <StatusChip ok={r.parallelism.gpuCountConsistent} textOk="GPU count consistent" textBad="GPU count mismatch" />
          <span className="text-[12px] text-white/40 ml-auto">
            Binding constraint: <span className="font-bold text-white/75">{r.summary.bindingConstraint}</span>
          </span>
        </div>

        {/* ═══════════════ 0 · CONFIGURATION ═══════════════ */}
        <SectionHeader index="0" title="Configuration" subtitle="set these first — they drive every formula below" />
        <p className="text-[12px] text-white/35 -mt-2 mb-5 max-w-3xl leading-relaxed">
          These six axes compose independently — a model can be MoE + Hybrid-SSM + Multi-modal all at once. Pick the
          combination that matches the model you actually intend to train.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AxisCard
            label="Parameter activation" accent="129,140,248"
            question="How many of the model's parameters fire on every token?"
            value={inputs.parameterActivation}
            onChange={v => set({ parameterActivation: v as ParameterActivation })}
            options={[
              { value: "Dense", title: "Dense", description: "Every parameter is active on every token. Compute scales as a straight line with parameter count (6·N·D FLOPs) — simple, predictable, and the best-understood path to a given quality bar." },
              { value: "MoE", title: "Mixture-of-Experts", description: "Only a top-k subset of experts fires per token, so you get far more total capacity for the same FLOPs. But every GPU's memory must still hold all experts' weights and optimizer state, and routing tokens between experts adds an all-to-all communication step." },
            ]}
          />
          <AxisCard
            label="Sequence mixer" accent="52,211,153"
            question="How do tokens mix information across the sequence?"
            value={inputs.sequenceMixer}
            onChange={v => set({ sequenceMixer: v as SequenceMixer })}
            options={[
              { value: "Attention", title: "Attention", description: "Every token attends to every other token, so cost grows quadratically with sequence length. This is the mature, battle-tested default with well-understood scaling recipes and tuned kernels." },
              { value: "Hybrid-SSM", title: "Hybrid-SSM", description: "Most layers use linear-in-sequence-length state-space (selective-scan) mixers instead of full attention, shrinking the quadratic term — valuable at long context. Needs custom kernels that typically run at lower MFU, and recipes are less battle-tested; don't assume dense hyperparameters transfer." },
            ]}
          />
          <AxisCard
            label="Modality" accent="56,189,248"
            question="Is every training token text, or does the model also ingest images/video/audio?"
            value={inputs.modality}
            onChange={v => set({ modality: v as Modality })}
            options={[
              { value: "Text", title: "Text", description: "All training tokens are text. No encoder FLOPs, no extra activation pressure, and the tokenized-dataset-to-raw-corpus ratio stays small." },
              { value: "Multi-modal", title: "Multi-modal", description: "Adds a vision/audio encoder — small in parameter count but expensive in activation memory — plus visual tokens. Raises FLOPs and, more importantly, puts real pressure on the data pipeline and storage: raw image/video corpora are far larger than tokenized text." },
            ]}
          />
          <AxisCard
            label="Compute precision" accent="251,191,36"
            question="What numeric format runs the tensor-core matmuls?"
            value={inputs.computePrecision}
            onChange={v => set({ computePrecision: v as ComputePrecision })}
            options={[
              { value: "BF16", title: "BF16", description: "The safe default across the full forward/backward pass. Full dynamic range, mature tooling, no numerical-stability surprises." },
              { value: "FP8", title: "FP8", description: "8-bit tensor-core path that roughly doubles peak throughput per GPU. Only affects the compute path — optimizer state stays mixed-precision regardless — and is usually adopted only after training has stabilized in BF16." },
            ]}
          />
          <AxisCard
            label="Optimizer" accent="244,114,182"
            question="Which optimizer updates the weights?"
            value={inputs.optimizer}
            onChange={v => set({ optimizer: v as Optimizer })}
            options={[
              { value: "AdamW", title: "AdamW", description: "The default, extensively battle-tested optimizer — 18 bytes/param of state (param copy, fp32 master, momentum, variance). Learning-rate recipes are well understood at every scale that's been tried." },
              { value: "Muon", title: "Muon", description: "Needs less state per parameter (14 vs 18 bytes) and, per current planning assumptions, can reach a target loss in fewer tokens — modeled here as a token-efficiency credit (1.3–1.6× typical; do not assert 2× externally). Needs QK-Clip at scale, and its learning rate does not transfer 1:1 from AdamW — plan a small bake-off." },
            ]}
          />
          <AxisCard
            label="Hardware platform" accent="248,113,113"
            question="What NVLink domain size are you deploying on?"
            value={inputs.hardwarePlatform}
            onChange={v => set({ hardwarePlatform: v as HardwarePlatform })}
            options={[
              { value: "DGX B300", title: "DGX B300", description: "An 8-GPU NVLink domain per chassis. Tensor parallelism must stay inside that boundary — and if MoE expert-parallelism goes wider than 8, its all-to-all traffic spills onto InfiniBand instead of NVLink. This is the single biggest DGX-B300 MoE risk." },
              { value: "GB300 NVL72", title: "GB300 NVL72", description: "A 72-GPU NVLink domain spanning a full rack. Tensor and expert parallelism can scale up to 72-way while staying on NVLink — matters most for MoE models with many experts, or workloads that want wider tensor-parallelism than 8." },
            ]}
          />
        </div>

        {/* ═══════════════ 1 · MODEL & TRAINING INPUTS ═══════════════ */}
        <SectionHeader index="1" title="Model & Training Inputs" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Field label="Total parameters" value={inputs.totalParamsB} unit="B" min={0} step={1}
            note="All weights stored and optimized. For MoE this is every expert — the memory driver."
            onChange={v => set({ totalParamsB: v })} />
          <Field label="Activated parameters (MoE)" value={inputs.activatedParamsB} unit="B" min={0} step={1}
            note="Parameters in the forward pass per token."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ activatedParamsB: v })} />
          <Field label="Encoder parameters (multi-modal)" value={inputs.encoderParamsB} unit="B" min={0} step={0.1}
            note="Vision/audio encoder params — small in count, large in activations."
            activeWhen={isMultiModal} activeHint={isMultiModal ? "Active — Modality = Multi-modal" : "Ignored while Modality = Text"}
            onChange={v => set({ encoderParamsB: v })} />
          <Field label="Training tokens" value={inputs.trainingTokensT} unit="T" min={0} step={0.1}
            note="Total LLM tokens, text + visual. Chinchilla-optimal is ~2.4T for a 120B dense model."
            onChange={v => set({ trainingTokensT: v })} />
          <Field label="Visual-token fraction" value={inputs.visualTokenFraction} unit="0–1" min={0} max={1} step={0.01}
            note="Share of tokens that are visual — drives encoder load."
            activeWhen={isMultiModal} activeHint={isMultiModal ? "Active — Modality = Multi-modal" : "Ignored while Modality = Text"}
            onChange={v => set({ visualTokenFraction: v })} />
          <Field label="Sequence length" value={inputs.sequenceLength} unit="tokens" min={1} step={512}
            note="Context window. Drives the O(seq²) attention term and activation footprint."
            onChange={v => set({ sequenceLength: v })} />
          <Field label="Global batch size" value={inputs.globalBatchSizeMTok} unit="M tok" min={0.1} step={0.5}
            note="Tokens per optimizer step. Larger batches are easier to overlap with comms."
            onChange={v => set({ globalBatchSizeMTok: v })} />
          <Field label="Total layers" value={inputs.totalLayers} unit="layers" min={1} step={1}
            note="Transformer blocks in the model."
            onChange={v => set({ totalLayers: v })} />
          <Field label="Attention layers" value={inputs.attentionLayers} unit="layers" min={0} step={1}
            note="Layers using softmax attention. Equals total layers for pure Attention; a small subset for Hybrid-SSM."
            onChange={v => set({ attentionLayers: v })} />
          <Field label="MoE layers" value={inputs.moeLayers} unit="layers" min={0} step={1}
            note="Layers with expert routing — drives all-to-all volume."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ moeLayers: v })} />
          <Field label="Hidden size" value={inputs.hiddenSize} unit="dim" min={1} step={128}
            note="Model width."
            onChange={v => set({ hiddenSize: v })} />
          <Field label="Micro-batch (seqs/GPU)" value={inputs.microBatchSeqsPerGpu} unit="seqs" min={1} step={1}
            note="Keep small; use many micro-batches to hide the pipeline bubble."
            onChange={v => set({ microBatchSeqsPerGpu: v })} />
          <Field label="Recompute overhead" value={inputs.recomputeOverhead} unit="×" min={1} step={0.01}
            note="Activation-checkpoint FLOP tax: 1.0 none / 1.2 selective / 1.33 full."
            onChange={v => set({ recomputeOverhead: v })} />
          <Field label="Activation mult / layer" value={inputs.activationMultPerLayer} unit="×" min={0} step={1}
            note="⚠ Planning coefficient: act bytes ≈ mbs·seq·hidden·2·mult. Calibrate to a real profile."
            onChange={v => set({ activationMultPerLayer: v })} />
          <Field label="Multi-modal activation factor" value={inputs.multiModalActivationFactor} unit="×" min={1} step={0.1}
            note="Extra activation pressure from encoders/high-res inputs — ~1 for text, ~2–3 for multi-modal."
            activeWhen={isMultiModal} activeHint={isMultiModal ? "Active — Modality = Multi-modal" : "Ignored while Modality = Text"}
            onChange={v => set({ multiModalActivationFactor: v })} />
          <Field label="Muon token-efficiency factor" value={inputs.muonTokenEfficiencyFactor} unit="×" min={1} step={0.05}
            note="⚠ Planning assumption. 1.3–1.6 when overtraining; ≈2 only at compute-optimal. 1.0 disables the credit."
            activeWhen={isMuon} activeHint={isMuon ? "Active — Optimizer = Muon" : "Ignored while Optimizer = AdamW"}
            onChange={v => set({ muonTokenEfficiencyFactor: v })} />
        </div>

        {/* ═══════════════ 2 · MoE / HYBRID-SSM PARAMETERS ═══════════════ */}
        <SectionHeader index="2" title="MoE & Hybrid-SSM Parameters" subtitle="each field applies only when its own axis is selected" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Field label="Number of experts" value={inputs.numExperts} unit="experts" min={1} step={1}
            note="Total routed experts per MoE layer."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ numExperts: v })} />
          <Field label="Top-k (experts/token)" value={inputs.topK} unit="experts" min={1} step={1}
            note="Experts each token is routed to."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ topK: v })} />
          <Field label="Capacity factor" value={inputs.capacityFactor} unit="×" min={1} step={0.05}
            note="Buffer for load imbalance. Above 1 wastes compute on padding and drives all-to-all volume."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ capacityFactor: v })} />
          <Field label="MoE efficiency derate" value={inputs.moeEfficiencyDerate} unit="×" min={0} max={1} step={0.01}
            note="Effective-MFU haircut for capacity padding, imbalance, and router overhead."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ moeEfficiencyDerate: v })} />
          <Field label="SSM kernel derate" value={inputs.ssmKernelDerate} unit="×" min={0} max={1} step={0.01}
            note="Effective-MFU haircut for selective-scan kernels, which are less mature than tuned attention kernels."
            activeWhen={isHybridSSM} activeHint={isHybridSSM ? "Active — Sequence mixer = Hybrid-SSM" : "Ignored while Sequence mixer = Attention"}
            onChange={v => set({ ssmKernelDerate: v })} />
        </div>

        {/* ═══════════════ 3 · HARDWARE PLATFORM ═══════════════ */}
        <SectionHeader index="3" title="Hardware Platform" />
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[12px] text-white/40">NVLink domain size (derived from platform):</span>
          <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
            {r.hardware.nvlinkDomainSize} GPUs
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Field label="Physical GPUs / node" value={inputs.physicalGpusPerNode} unit="GPUs" min={1} step={1}
            note="DGX B300 chassis = 8× Blackwell Ultra + 2× Intel Xeon 6776P host."
            onChange={v => set({ physicalGpusPerNode: v })} />
          <Field label="HBM per GPU" value={inputs.hbmPerGpuGB} unit="GB" min={1} step={1}
            note="Blackwell Ultra HBM3e, 8 TB/s. Node total = 2.3 TB."
            onChange={v => set({ hbmPerGpuGB: v })} />
          <Field label="GPU TDP" value={inputs.gpuTdpW} unit="W" min={1} step={50}
            note="~1.4 kW. Liquid / rear-door heat-exchanger cooling required."
            onChange={v => set({ gpuTdpW: v })} />
          <Field label="Dense peak — BF16" value={inputs.densePeakBf16PFPerGpu} unit="PF/GPU" min={0} step={0.1}
            note="⚠ Verify vs the HGX/DGX B300 datasheet."
            onChange={v => set({ densePeakBf16PFPerGpu: v })} />
          <Field label="Dense peak — FP8" value={inputs.densePeakFp8PFPerGpu} unit="PF/GPU" min={0} step={0.1}
            note="⚠ Verify. ~5 PF dense (NVL72 360 PF FP8 ÷ 72) — not the marketing '70 PF/node' sparse figure."
            onChange={v => set({ densePeakFp8PFPerGpu: v })} />
          <Field label="Achieved MFU (base)" value={inputs.achievedMfuBase} unit="0–1" min={0} max={1} step={0.01}
            note="Before architecture derates. DGX B300 derates further vs NVL72 since PP+DP share NICs."
            onChange={v => set({ achievedMfuBase: v })} />
          <Field label="Scale-out BW / GPU" value={inputs.scaleOutBwPerGpuGBs} unit="GB/s" min={1} step={10}
            note="ConnectX-8 800 Gb/s. Carries PP + DP + any MoE all-to-all that crosses nodes."
            onChange={v => set({ scaleOutBwPerGpuGBs: v })} />
          <Field label="NVLink BW / GPU" value={inputs.nvlinkBwPerGpuGBs} unit="GB/s" min={1} step={10}
            note="NVLink5 per-GPU (~1.8 TB/s bidirectional). Used for all-to-all when EP stays in the NVLink domain."
            onChange={v => set({ nvlinkBwPerGpuGBs: v })} />
          <Field label="Facility power overhead" value={inputs.facilityPowerOverhead} unit="×" min={1} step={0.05}
            note="Multiplier over GPU-only power for cooling, host, fabric, storage, PSU loss."
            onChange={v => set({ facilityPowerOverhead: v })} />
        </div>

        {/* ═══════════════ 4 · PARALLELISM PLAN ═══════════════ */}
        <SectionHeader index="4" title="Parallelism Plan" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
          <Field label="Total GPUs" value={inputs.totalGpus} unit="GPUs" min={1} step={8}
            note="Cluster committed to the run."
            onChange={v => set({ totalGpus: v })} />
          <Field label="Tensor parallel (TP)" value={inputs.tp} unit="way" min={1} step={1}
            note="Intra-node only. Must be ≤ NVLink domain."
            onChange={v => set({ tp: v })} />
          <Field label="Pipeline parallel (PP)" value={inputs.pp} unit="way" min={1} step={1}
            note="Across nodes. Needs ≥ PP×4 micro-batches; interleaved 1F1B."
            onChange={v => set({ pp: v })} />
          <Field label="Context parallel (CP)" value={inputs.cp} unit="way" min={1} step={1}
            note="Raise for long sequences (ring attention)."
            onChange={v => set({ cp: v })} />
          <Field label="Expert parallel (EP)" value={inputs.ep} unit="way" min={1} step={1}
            note="MoE only. Spreads experts; introduces all-to-all. Keep ≤ NVLink domain if you can."
            activeWhen={isMoE} activeHint={isMoE ? "Active — Parameter activation = MoE" : "Ignored while Parameter activation = Dense"}
            onChange={v => set({ ep: v })} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatRow label="Data parallel (DP)" value={fmt(r.parallelism.dp, 1)} note="Derived. ZeRO-1 optimizer sharded across this." />
          <StatRow label="Nodes" value={fmt(r.parallelism.nodes, 1)} note="Total GPUs / GPUs per node." />
          <StatRow label="GPUs / replica" value={fmtInt(r.parallelism.gpusPerReplica)} note="One full model copy." />
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <StatusChip ok={r.parallelism.tpWithinDomain} textOk="TP within NVLink domain — OK" textBad="TP crosses IB — VIOLATION" />
          <StatusChip
            ok={r.parallelism.epWithinDomain !== "CROSSES IB — MoE penalty"}
            textOk={`EP within NVLink domain — ${r.parallelism.epWithinDomain}`}
            textBad="EP crosses IB — MoE penalty"
          />
          <StatusChip ok={r.parallelism.gpuCountConsistent} textOk="GPU count consistent — OK" textBad="GPU count does not divide evenly — CHECK" />
        </div>

        {/* ═══════════════ RESULTS ═══════════════ */}
        <SectionHeader index="5–9" title="Results" subtitle="everything below is derived from the configuration and inputs above" />

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          <MetricCard label="Training time" value={fmt(r.compute.trainingTimeOptimizerAdjDays, 1)} unit="days" accent="56,189,248" />
          <MetricCard label="Compute cost" value={fmt(r.compute.computeCostGpuHours / 1000, 0)} unit="k GPU-hrs" accent="56,189,248" />
          <MetricCard label="Cluster throughput" value={fmt(r.compute.clusterThroughputPF, 0)} unit="PF" accent="56,189,248" />
          <MetricCard label="HBM used / GPU" value={fmt(r.memory.totalHbmUsedPerGpuGB, 1)} unit="GB" accent="251,191,36" />
          <MetricCard label="Facility power" value={fmt(r.power.facilityPowerMW, 2)} unit="MW" accent="248,113,113" />
          <MetricCard label="Checkpoint size" value={fmt(r.storage.checkpointSizeTB, 2)} unit="TB" accent="52,211,153" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel title="5 · Compute Sizing" accent="56,189,248">
            <StatRow label="Active params (effective)" value={fmt(r.compute.activeParamsEffectiveB, 1)} unit="B" note="MoE ⇒ activated; else total. Drives the 6·N·D term." />
            <StatRow label="Attention-layer fraction" value={fmtPct(r.compute.attentionLayerFraction)} note="Share of layers doing softmax attention." />
            <StatRow label="Attention (seq²) correction" value={fmt(r.compute.attnSeqCorrection, 4)} unit="×" note="seq/(6·hidden)·attn-fraction. Dominant at long context; small for Hybrid-SSM." />
            <StatRow label="Effective MFU" value={fmtPct(r.compute.effectiveMfu)} note="Base MFU × MoE derate (if MoE) × SSM derate (if Hybrid)." />
            <StatRow label="Effective peak / GPU" value={fmt(r.compute.effectivePeakPerGpuPF, 2)} unit="PF" note="By precision toggle." />
            <StatRow label="Effective throughput / GPU" value={fmt(r.compute.effectiveThroughputPerGpuPF, 3)} unit="PF" note="Peak × effective MFU." />
            <StatRow label="Cluster throughput" value={fmt(r.compute.clusterThroughputPF, 1)} unit="PF" note="Aggregate sustained FLOP/s." />
            <StatRow label="LLM FLOPs" value={fmtFlops(r.compute.llmFlops)} unit="FLOP" note="6·N_active·D·(1+attn correction)." />
            <StatRow label="Encoder FLOPs" value={fmtFlops(r.compute.encoderFlops)} unit="FLOP" note="6·N_enc·(visual tokens). Zero for text." />
            <StatRow label="Total training FLOPs" value={fmtFlops(r.compute.totalTrainingFlops)} unit="FLOP" note="(LLM + encoder) × recompute." />
            <StatRow label="Training time (raw)" value={fmt(r.compute.trainingTimeRawDays, 2)} unit="days" note="Wall-clock before optimizer token-efficiency credit." />
            <StatRow label="Optimizer token-eff factor" value={fmt(r.compute.optimizerTokenEffFactor, 2)} unit="×" note="Muon reaches target loss in fewer tokens." />
            <StatRow label="Training time (optimizer-adj)" value={fmt(r.compute.trainingTimeOptimizerAdjDays, 2)} unit="days" note="Planning wall-clock if using Muon." />
            <StatRow label="Compute cost" value={fmtInt(r.compute.computeCostGpuHours)} unit="GPU-hrs" note="Raw GPU-hours (billing basis)." />
            <StatRow label="Step time" value={fmt(r.compute.stepTimeSec, 2)} unit="s" note="Seconds per optimizer step. Must exceed exposed comms." />
          </Panel>

          <Panel title="6 · Memory Sizing (per GPU)" accent="251,191,36">
            <StatRow label="Optimizer-state bytes / param" value={r.memory.optimizerStateBytesPerParamFull} unit="B" note="AdamW 2+4+4+4+4=18. Muon 2+4+4+4=14." />
            <StatRow label="Model-shard degree" value={fmtInt(r.memory.modelShardDegree)} unit="way" note="Weights+grads spread across TP×PP×EP." />
            <StatRow label="Weights+grads / GPU" value={fmt(r.memory.weightsGradsPerGpuGB, 2)} unit="GB" note="6 B/param (bf16 w + fp32 grad) over model-shard degree." />
            <StatRow label="Optimizer state / GPU" value={fmt(r.memory.optimizerStatePerGpuGB, 3)} unit="GB" note="Master+moments. ZeRO-1: each param's state lives once, spread across the cluster." />
            <StatRow label="Static state / GPU" value={fmt(r.memory.staticStatePerGpuGB, 2)} unit="GB" note="Weights+grads+optimizer per GPU." />
            <StatRow label="Activations / GPU" value={fmt(r.memory.activationsPerGpuGB, 2)} unit="GB" note="Peak activations; × multi-modal factor when applicable." />
            <StatRow label="Total HBM used / GPU" value={fmt(r.memory.totalHbmUsedPerGpuGB, 2)} unit="GB" note="Static + activations. Leave room for context/comms buffers." />
            <StatRow label="HBM headroom / GPU" value={fmt(r.memory.hbmHeadroomPerGpuGB, 2)} unit="GB" note="Negative ⇒ raise TP/PP/EP/DP or add nodes." />
            <StatRow label="Fits in HBM?" value={r.memory.fitsInHbm ? "OK" : "OVER"} note="Target ≤92% of HBM per GPU." />
            <StatRow label="Full model state (checkpoint)" value={fmtInt(r.memory.fullModelStateCheckpointGB)} unit="GB" note="Total static state = checkpoint size. MoE stores ALL experts." />
          </Panel>

          <Panel title="7 · Interconnect / Comms" accent="167,139,250">
            <StatRow label="Grad all-reduce / GPU / step" value={fmt(r.comms.gradAllReducePerGpuGB, 2)} unit="GB" note="Reduce-scatter+all-gather of bf16 grads on each GPU's shard across DP." />
            <StatRow label="Grad comms time / step" value={fmt(r.comms.gradCommsTimeSec, 3)} unit="s" note="If un-overlapped." />
            <StatRow label="MoE all-to-all / GPU / step" value={fmt(r.comms.moeAllToAllPerGpuGB, 3)} unit="GB" note="⚠ Order-of-magnitude: dispatch+combine of token activations. Dense = 0." />
            <StatRow label="All-to-all time / step" value={fmt(r.comms.allToAllTimeSec, 3)} unit="s" note="Over NVLink if EP≤domain (fast); over scale-out IB otherwise." />
            <StatRow label="Total exposed comms / step" value={fmt(r.comms.totalExposedCommsSec, 3)} unit="s" note="DP grads + MoE all-to-all, un-overlapped." />
            <StatRow label="Comms / compute ratio" value={fmtPct(r.comms.commsComputeRatio)} note="Fraction of step in comms. Overlap or MFU drops." />
            <StatRow label="Overlap verdict" value={r.comms.overlapVerdict} note="Guide only. Rail-optimized IB assumed." />
            <StatRow label="Min micro-batches (PP bubble)" value={fmtInt(r.comms.minMicroBatches)} note="Hold pipeline bubble <~5%." />
          </Panel>

          <Panel title="8 · Storage & Checkpoint" accent="52,211,153">
            <StatRow label="Checkpoint size" value={fmt(r.storage.checkpointSizeTB, 3)} unit="TB" note="Weights+optimizer. Muon smaller (14 vs 18 B/param)." />
            <StatRow label="Checkpoint interval" value={inputs.checkpointIntervalMin} unit="min" note="How often full state is persisted." />
            <StatRow label="Write window target" value={inputs.writeWindowTargetSec} unit="s" note="Max stall to flush (async/distributed)." />
            <StatRow label="Required checkpoint BW" value={fmt(r.storage.requiredCheckpointBWGBs, 1)} unit="GB/s" note="Sustained. Stage node-local NVMe, async-flush; avoid all-reduce collisions." />
            <StatRow label="Tokenized dataset" value={fmt(r.storage.tokenizedDatasetTB, 1)} unit="TB" note="≈2 bytes/token." />
            <StatRow label="Raw corpus multiplier" value={inputs.rawCorpusMultiplier} unit="×" note="Raw shards / tokenized. Higher for multi-modal (image/video bytes)." />
            <StatRow label="Raw corpus size" value={fmt(r.storage.rawCorpusSizeTB, 1)} unit="TB" note="Ingest/staging capacity. Multi-modal pipelines are IO-bound." />
          </Panel>

          <Panel title="9 · Power & Facility" accent="248,113,113">
            <StatRow label="GPU-only power" value={fmt(r.power.gpuOnlyPowerMW, 3)} unit="MW" note="Total GPUs × TDP." />
            <StatRow label="Facility power" value={fmt(r.power.facilityPowerMW, 3)} unit="MW" note="Incl. cooling/host/fabric/storage/PSU." />
            <StatRow label="Power / node" value={fmt(r.power.powerPerNodeKW, 2)} unit="kW" note="Per chassis, facility-level." />
            <StatRow label="Cooling" value="Liquid / RDHx required" note="1.4 kW/GPU exceeds air cooling." />
          </Panel>

          <Panel title="Storage inputs" accent="52,211,153">
            <div className="grid grid-cols-1 gap-3">
              <Field label="Checkpoint interval" value={inputs.checkpointIntervalMin} unit="min" min={1} step={5}
                note="How often full state is persisted."
                onChange={v => set({ checkpointIntervalMin: v })} />
              <Field label="Write window target" value={inputs.writeWindowTargetSec} unit="s" min={1} step={5}
                note="Max stall to flush checkpoint state (async/distributed)."
                onChange={v => set({ writeWindowTargetSec: v })} />
              <Field label="Raw corpus multiplier" value={inputs.rawCorpusMultiplier} unit="×" min={1} step={0.5}
                note="Raw shards / tokenized. Higher for multi-modal (image/video bytes)."
                onChange={v => set({ rawCorpusMultiplier: v })} />
            </div>
          </Panel>
        </div>

        {/* ═══════════════ 10 · SUMMARY & RECOMMENDED CONFIG ═══════════════ */}
        <SectionHeader index="10" title="Summary & Recommended Config" />
        <div className="rounded-2xl border p-6 mb-4" style={{ borderColor: "rgba(129,140,248,0.25)", background: "rgba(129,140,248,0.06)" }}>
          <div className="flex flex-wrap gap-3 mb-5">
            <StatusChip ok={r.summary.fitsCheck} textOk="Config valid" textBad="Fix flagged rows above" />
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
              Binding constraint: {r.summary.bindingConstraint}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[12.5px] leading-relaxed text-white/65">
            <div>
              <div className="font-bold text-white/85 mb-1">Parallelism</div>
              <p>TP intra-node (NVLink); PP across nodes with interleaved VPP. {isMoE ? "For MoE, keep EP ≤ the NVLink domain size or all-to-all crosses IB." : "Not applicable — Parameter activation is Dense."}</p>
            </div>
            <div>
              <div className="font-bold text-white/85 mb-1">Micro-batches & global batch</div>
              <p>Hold at least {r.comms.minMicroBatches} micro-batches in flight to keep the pipeline bubble under ~5%. Aim for a global batch long enough to overlap DP all-reduce{isMoE ? " and MoE all-to-all." : "."}</p>
            </div>
            <div>
              <div className="font-bold text-white/85 mb-1">Precision</div>
              <p>{inputs.computePrecision === "FP8" ? "Running FP8 — confirm loss has stabilized in BF16 first; TE FP8 is typically adopted after that point." : "BF16 selected — the safe default. Consider FP8 once loss has settled, for roughly 2× peak throughput."}</p>
            </div>
            <div>
              <div className="font-bold text-white/85 mb-1">Optimizer</div>
              <p>{isMuon ? "Muon selected — apply it to 2D weights, AdamW to embeddings/norms/bias. If attention uses MLA, QK-Norm is unavailable so use QK-Clip for stability." : "AdamW selected — the well-understood fallback. Distributed/ZeRO-1 optimizer state sharding applies as configured above."}</p>
            </div>
            {isMoE && (
              <div>
                <div className="font-bold text-white/85 mb-1">MoE</div>
                <p>Keep expert-parallelism on NVLink where possible; current capacity factor is {inputs.capacityFactor}×. Prefer GB300 NVL72 if EP must exceed 8. Watch for expert-load imbalance — consider aux-loss-free routing.</p>
              </div>
            )}
            {isHybridSSM && (
              <div>
                <div className="font-bold text-white/85 mb-1">Hybrid-SSM</div>
                <p>Custom scan kernels are less battle-tested than tuned attention kernels — expect lower achieved MFU than the base figure suggests. Do not assume dense hyperparameters transfer without validation.</p>
              </div>
            )}
            {isMultiModal && (
              <div>
                <div className="font-bold text-white/85 mb-1">Multi-modal</div>
                <p>Use aspect-ratio bucketing and scale the data pipeline ahead of compute — encoder activations and image/video decode make the host CPUs and storage the bottleneck here, not FLOPs.</p>
              </div>
            )}
            <div>
              <div className="font-bold text-white/85 mb-1">Checkpoint</div>
              <p>Use async/distributed checkpointing staged to node-local NVMe. {isMuon ? "Muon's state is roughly 22% smaller than AdamW's, easing the write-bandwidth requirement above." : "AdamW's larger state (18 B/param) sets the write-bandwidth requirement above."}</p>
            </div>
          </div>
        </div>

        {/* ═══════════════ 11 · VERIFY BEFORE EXTERNAL USE ═══════════════ */}
        <SectionHeader index="11" title="Verify Before External Use" subtitle="scope notes and assumptions to check before quoting this externally" />
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 space-y-2.5">
          {[
            "B300 dense peaks (BF16 2.5 / FP8 5 PF) are datasheet-derived — confirm against the HGX/DGX B300 datasheet. “DGX B300 = 70 PF training” is an FP8 sparse figure, not a dense planning number.",
            "Muon speedup is a planning assumption (1.3–1.6× overtraining; ≈2× only compute-optimal). Do not assert 2× externally. Learning rate does not transfer 1:1 from AdamW — run a 1–3B bake-off.",
            "MoE all-to-all and activation figures are order-of-magnitude — calibrate against a real profile before committing parallelism.",
            "Memory uses mixed-precision state regardless of the compute-precision toggle; FP8 changes throughput, not the state footprint modeled here.",
            "MoE stores/optimizes ALL experts (memory scales with total params) while computing on activated params only — the two decouple. EP exceeding the NVLink domain is the key DGX-B300 MoE penalty.",
            "This sheet covers pretraining/SFT only. RL / post-training (rollout + train, two-cluster) and diffusion/generative regimes need separate sizing models — their compute is not 6·N·D.",
          ].map((t, i) => (
            <p key={i} className="text-[12px] leading-relaxed text-amber-100/70 flex gap-2">
              <span className="text-amber-400 flex-shrink-0">⚠</span>
              <span>{t}</span>
            </p>
          ))}
        </div>
    </div>
  );
}
