"use client";

import { useMemo, useState } from "react";
import {
  calcFinetuning, FINETUNING_DEFAULTS,
  type FinetuningInputs,
  type FTMethod, type FTModality, type FTObjective, type FTDomainPreset,
  type FTComputePrecision, type FTHardwareGpu, type FTOptimizer, type FTGradCheckpointing,
} from "./finetuning-calcs";
import { fmt, fmtInt, fmtFlops, fmtPct, AxisCard, SectionHeader, Field, SelField, Panel, StatRow, MetricCard, StatusChip } from "./shared";

export function FinetuningView() {
  const [inputs, setInputs] = useState<FinetuningInputs>(FINETUNING_DEFAULTS);
  const r = useMemo(() => calcFinetuning(inputs), [inputs]);
  const set = (patch: Partial<FinetuningInputs>) => setInputs(prev => ({ ...prev, ...patch }));

  const isFullFT = inputs.method === "Full-FT";
  const isQLoRA = inputs.method === "QLoRA";
  const isPrefixTuning = inputs.method === "Prefix-tuning";
  const isRankBasedMethod = !isFullFT && !isPrefixTuning;
  const isDPO = inputs.objective === "DPO";

  return (
    <div>
      {/* ── intro ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <p className="text-[14px] text-white/45 max-w-2xl leading-relaxed">
          Fine-tuning memory is dominated by the method, not the model: Full-FT costs roughly 18 bytes per parameter,
          while LoRA/QLoRA costs 2–0.55 bytes for a frozen base plus a tiny trainable adapter — nearly a 30×
          swing. Set the six configuration axes first; the headline question this page answers is: does it fit,
          and on how many GPUs.
        </p>
        <button
          type="button" onClick={() => setInputs(FINETUNING_DEFAULTS)}
          className="flex-shrink-0 rounded-lg border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/60 hover:text-white hover:border-white/30 transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* ── feasibility banner ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 mb-2">
        <span className="text-[12px] font-semibold text-white/50 mr-1">Current plan:</span>
        <StatusChip ok={r.memory.fitsOn1Gpu} textOk="Fits on 1 GPU" textBad={`Needs ${fmtInt(r.memory.minGpusForMemory)} GPUs`} />
        <span className="text-[12px] text-white/40 ml-auto">
          Verdict: <span className="font-bold text-white/75">{r.summary.verdict}</span>
        </span>
      </div>

      {/* ═══════════════ 0 · CONFIGURATION ═══════════════ */}
      <SectionHeader index="0" title="Configuration" subtitle="set these first — they drive every formula below" />
      <p className="text-[12px] text-white/35 -mt-2 mb-5 max-w-3xl leading-relaxed">
        Method drives memory (Full-FT is roughly 30× LoRA/QLoRA), modality adds encoders and changes token units,
        and domain preset shifts data shape rather than the compute model.
      </p>
      <div className="grid grid-cols-1 gap-4">
        <AxisCard
          label="Method" accent="129,140,248" columns={3}
          question="How are the trainable parameters chosen — this is the single biggest lever on memory."
          value={inputs.method}
          onChange={v => set({ method: v as FTMethod })}
          options={[
            { value: "Full-FT", title: "Full-FT", description: "Every parameter is trainable — base weights, gradients, and full optimizer state all live in memory (≈18 B/param for AdamW). Best quality ceiling; the natural choice for continued pretraining or a large domain shift, but needs the most GPUs and typically FSDP/ZeRO sharding." },
            { value: "LoRA", title: "LoRA", description: "Freezes the base model in bf16 and trains small low-rank adapter matrices injected into attention/MLP projections. Base weights cost 2 B/param but are frozen — only the tiny adapters carry trainable state." },
            { value: "QLoRA", title: "QLoRA", description: "Same adapter idea as LoRA, but the frozen base is quantized to 4-bit (NF4) — roughly 0.55 B/param including double-quantization overhead. About 4× less memory than LoRA — what lets a 70B model fit on a single 80–96 GB GPU, at a small throughput cost from dequantization." },
            { value: "DoRA", title: "DoRA", description: "Weight-Decomposed LoRA: splits weights into magnitude and direction, then applies LoRA-style adaptation to the direction component. Same memory profile as LoRA here — the difference is in training dynamics, not sizing." },
            { value: "Prefix-tuning", title: "Prefix-tuning", description: "Prepends a small number of trainable ‘virtual token’ vectors at every layer instead of adapting weight matrices. Trainable count scales with virtual-tokens × layers × hidden size — often even smaller than LoRA adapters." },
          ]}
        />
        <AxisCard
          label="Modality" accent="56,189,248" columns={3}
          question="What kind of data is the model being fine-tuned to handle?"
          value={inputs.modality}
          onChange={v => set({ modality: v as FTModality })}
          options={[
            { value: "Text", title: "Text", description: "Tokens are plain text end to end. No frozen encoder, no extra activation pressure — the simplest and cheapest case." },
            { value: "Vision-VLM", title: "Vision-VLM", description: "Adds a frozen vision encoder (e.g. a ViT) ahead of the language model; images become visual tokens counted alongside text. Usually only the language model (plus a small projector) is trained — the encoder stays frozen." },
            { value: "Speech-gen-TTS", title: "Speech-gen-TTS", description: "Text-to-speech: output is audio codec tokens rather than text — roughly 600 codec tokens per second of audio × codebook count, which pushes hard on activation memory and context length." },
            { value: "Transcription-ASR", title: "Transcription-ASR", description: "Speech-to-text. Adds a frozen (or fine-tuned) audio encoder such as Whisper's; effective sequence length is mel-spectrogram frames plus output text tokens, not pure text tokens." },
            { value: "Audio-understanding", title: "Audio-understanding", description: "General audio-in tasks (classification, captioning, QA) with a frozen audio encoder ahead of the language model — the same encoder-memory mechanics as ASR and Vision-VLM." },
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AxisCard
            label="Objective" accent="244,114,182"
            question="What training objective, and does it need a frozen reference model?"
            value={inputs.objective}
            onChange={v => set({ objective: v as FTObjective })}
            options={[
              { value: "Instruction-SFT", title: "Instruction-SFT", description: "Standard supervised fine-tuning on prompt→response pairs. The default objective, and the cheapest — no reference model, no extra token multiplier." },
              { value: "Continued-pretrain", title: "Continued-pretrain", description: "More tokens, same supervised-learning mechanics as SFT — typically used ahead of instruction tuning when the domain shift from the base model's pretraining data is large (Legal, BFSI)." },
              { value: "DPO", title: "DPO", description: "Direct Preference Optimization trains on (chosen, rejected) pairs and needs a frozen reference model for the KL term — a second full copy of the base weights resident in memory, plus double the tokens processed per example." },
              { value: "ORPO", title: "ORPO", description: "Odds-Ratio Preference Optimization reaches the same preference-tuning goal as DPO without a reference model — still doubles token cost from processing pairs, but skips the extra frozen-model memory tax. Better when memory is tight." },
            ]}
          />
          <AxisCard
            label="Domain preset" accent="251,191,36" columns={3}
            question="What kind of data and evaluation does this fine-tune target?"
            value={inputs.domainPreset}
            onChange={v => set({ domainPreset: v as FTDomainPreset })}
            options={[
              { value: "General", title: "General", description: "Standard instruction data — no particular shift in context length, dataset shape, or evaluation needs." },
              { value: "BFSI", title: "BFSI", description: "Banking/financial/insurance: structured/tabular data mixed with PII and compliance-sensitive content. Needs numeric-accuracy evaluation, moderate context, and guardrails." },
              { value: "Legal", title: "Legal", description: "Long documents (8k–32k+ context), citation- and hallucination-sensitive. Often warrants continued-pretraining before instruction SFT to absorb domain vocabulary and structure." },
              { value: "Telco", title: "Telco", description: "Jargon-heavy configs, logs, and troubleshooting content at medium context length. RAG often complements fine-tuning here rather than replacing it." },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AxisCard
            label="Compute precision" accent="52,211,153"
            question="What numeric format runs the trainable math?"
            value={inputs.computePrecision}
            onChange={v => set({ computePrecision: v as FTComputePrecision })}
            options={[
              { value: "BF16", title: "BF16", description: "The safe default for the trainable math. Full dynamic range, mature tooling." },
              { value: "FP8", title: "FP8", description: "Roughly doubles peak tensor-core throughput for the trainable math. Only affects throughput, not the memory model." },
            ]}
          />
          <AxisCard
            label="Hardware / GPU" accent="248,113,113" columns={3}
            question="What GPU are you fine-tuning on? This sets HBM per GPU."
            value={inputs.hardwareGpu}
            onChange={v => set({ hardwareGpu: v as FTHardwareGpu })}
            options={[
              { value: "B300 (288GB)", title: "B300 (288GB)", description: "Blackwell Ultra — the most HBM headroom of this set, useful for larger base models or longer context without sharding." },
              { value: "H200 (141GB)", title: "H200 (141GB)", description: "Hopper refresh with expanded HBM3e — a strong middle ground for mid-size base models with QLoRA or LoRA." },
              { value: "H100 (80GB)", title: "H100 (80GB)", description: "The most common training GPU in the field today. Comfortable for QLoRA up to the 30–40B range; larger models or Full-FT need multiple GPUs." },
              { value: "A100 (40GB)", title: "A100 (40GB)", description: "Previous-generation, tighter HBM — QLoRA is usually necessary for anything beyond small-to-mid models on a single card." },
              { value: "L40S (48GB)", title: "L40S (48GB)", description: "Inference/training-capable workstation-class GPU. Solid for QLoRA fine-tuning of small-to-mid models on limited budgets." },
            ]}
          />
        </div>
      </div>

      {/* ═══════════════ 1 · BASE MODEL & ARCHITECTURE ═══════════════ */}
      <SectionHeader index="1" title="Base Model & Architecture" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="Base model params" value={inputs.baseModelParamsB} unit="B" min={0} step={1}
          note="Total parameters of the model being fine-tuned."
          onChange={v => set({ baseModelParamsB: v })} />
        <Field label="Layers" value={inputs.layers} unit="layers" min={1} step={1}
          note="Transformer blocks — drives adapter parameter count and activation memory."
          onChange={v => set({ layers: v })} />
        <Field label="Hidden size" value={inputs.hiddenSize} unit="dim" min={1} step={128}
          note="Model width."
          onChange={v => set({ hiddenSize: v })} />
        <Field label="Encoder params (vision/audio)" value={inputs.encoderParamsB} unit="B" min={0} step={0.1}
          note="Frozen vision/audio encoder for multi-modal FT. A ViT is roughly 0.3–6B; a Whisper encoder roughly 0.6B."
          activeWhen={r.flags.hasEncoder} activeHint={r.flags.hasEncoder ? "Active — Modality has a frozen encoder" : "Ignored — Modality = Text (no encoder)"}
          onChange={v => set({ encoderParamsB: v })} />
        <SelField label="Optimizer" value={inputs.optimizer} options={["AdamW", "Muon"] as FTOptimizer[]}
          note="AdamW = 18 B/trainable-param, Muon = 14. 8-bit Adam ≈ 10 — adjust the effective bytes if you use it."
          onChange={v => set({ optimizer: v })} />
      </div>

      {/* ═══════════════ 2 · METHOD (PEFT) PARAMETERS ═══════════════ */}
      <SectionHeader index="2" title="Method (PEFT) Parameters" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="LoRA rank (r)" value={inputs.loraRank} unit="rank" min={1} step={1}
          note="Adapter rank. Higher = more capacity + more trainable params."
          activeWhen={isRankBasedMethod} activeHint={isRankBasedMethod ? "Active — Method uses rank-based adapters" : "Ignored — Method = Full-FT or Prefix-tuning"}
          onChange={v => set({ loraRank: v })} />
        <Field label="LoRA target modules" value={inputs.loraTargetModules} unit="modules" min={1} step={1}
          note="Projections adapted per layer — q,k,v,o,gate,up,down = 7 (all-linear); attention-only = 4."
          activeWhen={isRankBasedMethod} activeHint={isRankBasedMethod ? "Active — Method uses rank-based adapters" : "Ignored — Method = Full-FT or Prefix-tuning"}
          onChange={v => set({ loraTargetModules: v })} />
        <Field label="Prefix virtual tokens" value={inputs.prefixVirtualTokens} unit="tokens" min={1} step={1}
          note="Prefix/prompt-tuning only — virtual tokens prepended per layer."
          activeWhen={isPrefixTuning} activeHint={isPrefixTuning ? "Active — Method = Prefix-tuning" : "Ignored — Method ≠ Prefix-tuning"}
          onChange={v => set({ prefixVirtualTokens: v })} />
        <Field label="Base quant bits (QLoRA)" value={inputs.baseQuantBits} unit="bits" min={1} step={1}
          note="4 = NF4 (~0.55 B/param with double-quant). QLoRA only."
          activeWhen={isQLoRA} activeHint={isQLoRA ? "Active — Method = QLoRA" : "Ignored — Method ≠ QLoRA"}
          onChange={v => set({ baseQuantBits: v })} />
      </div>

      {/* ═══════════════ 3 · DATASET & SCHEDULE ═══════════════ */}
      <SectionHeader index="3" title="Dataset & Schedule" />
      <div className="flex items-start gap-2 mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40 flex-shrink-0 mt-0.5">Domain guidance</span>
        <span className="text-[12.5px] text-white/65 leading-snug">{r.summary.domainGuidance}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="Dataset size" value={inputs.datasetSizeSamples} unit="samples" min={1} step={1000}
          note="Native units: text examples, images, audio clips, or documents depending on modality."
          onChange={v => set({ datasetSizeSamples: v })} />
        <Field label="Tokens per sample" value={inputs.tokensPerSample} unit="tokens" min={1} step={64}
          note="Effective sequence length per sample. Vision: add ~576 tokens/image. ASR: mel frames+text. TTS: text+~600 codec tokens/s."
          onChange={v => set({ tokensPerSample: v })} />
        <Field label="Epochs" value={inputs.epochs} unit="epochs" min={1} step={1}
          note="Passes over the dataset. SFT is typically 1–3 — PEFT overfits fast if over-trained."
          onChange={v => set({ epochs: v })} />
        <Field label="Sequence length" value={inputs.sequenceLength} unit="tokens" min={1} step={128}
          note="Max context, drives activation memory. Legal/long-document work often pushes this to 8k–32k+."
          onChange={v => set({ sequenceLength: v })} />
        <Field label="Micro-batch (seqs/GPU)" value={inputs.microBatchSeqsPerGpu} unit="seqs" min={1} step={1}
          note="Per-GPU micro-batch. Raise if memory allows; use gradient accumulation for a larger effective batch."
          onChange={v => set({ microBatchSeqsPerGpu: v })} />
        <SelField label="Gradient checkpointing" value={inputs.gradientCheckpointing} options={["On", "Off"] as FTGradCheckpointing[]}
          note="On recomputes activations in the backward pass — ~4× less activation memory for ~+30% compute. Standard for fine-tuning."
          onChange={v => set({ gradientCheckpointing: v })} />
      </div>

      {/* ═══════════════ 4 · HARDWARE ═══════════════ */}
      <SectionHeader index="4" title="Hardware" />
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] text-white/40">HBM per GPU (derived from GPU type):</span>
        <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
          {r.hardware.hbmPerGpuGB} GB
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="GPUs available" value={inputs.gpusAvailable} unit="GPUs" min={1} step={1}
          note="How many GPUs you have for this job. Fine-tuning is often just 1–8."
          onChange={v => set({ gpusAvailable: v })} />
        <Field label="Peak — BF16" value={inputs.peakBf16PFPerGpu} unit="PF/GPU" min={0} step={0.1}
          note="⚠ Placeholder is B300 dense BF16 — adjust for other GPU types."
          onChange={v => set({ peakBf16PFPerGpu: v })} />
        <Field label="Peak — FP8" value={inputs.peakFp8PFPerGpu} unit="PF/GPU" min={0} step={0.1}
          note="⚠ Placeholder is B300 dense FP8 — adjust for other GPU types."
          onChange={v => set({ peakFp8PFPerGpu: v })} />
        <Field label="Achieved MFU" value={inputs.achievedMfu} unit="0–1" min={0} max={1} step={0.01}
          note="Fine-tuning MFU — small batches / short runs often run lower than pretraining."
          onChange={v => set({ achievedMfu: v })} />
        <Field label="GPU TDP" value={inputs.gpuTdpW} unit="W" min={1} step={50}
          note="Used for the power estimate."
          onChange={v => set({ gpuTdpW: v })} />
      </div>

      {/* ═══════════════ RESULTS ═══════════════ */}
      <SectionHeader index="5–10" title="Results" subtitle="everything below is derived from the configuration and inputs above" />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <MetricCard label="Total memory (1 GPU)" value={fmt(r.memory.totalMemorySingleGpuGB, 2)} unit="GB" accent="251,191,36" />
        <MetricCard label="Min GPUs for memory" value={fmtInt(r.memory.minGpusForMemory)} unit="GPUs" accent="251,191,36" />
        <MetricCard label="Training time" value={fmt(r.compute.trainingTimeHours, 2)} unit="hrs" accent="56,189,248" />
        <MetricCard label="GPU-hours" value={fmt(r.compute.gpuHours, 2)} unit="GPU-hrs" accent="56,189,248" />
        <MetricCard label="Adapter checkpoint" value={fmt(r.storage.adapterCheckpointSizeGB, 3)} unit="GB" accent="52,211,153" />
        <MetricCard label="Power draw" value={fmt(r.power.powerDrawKW, 2)} unit="kW" accent="248,113,113" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="5 · Method & Modality Flags" accent="129,140,248">
          <StatRow label="Full fine-tune?" value={r.flags.isFullFT ? "Yes" : "No"} />
          <StatRow label="QLoRA (quantized base)?" value={r.flags.isQLoRA ? "Yes" : "No"} />
          <StatRow label="Reference model needed?" value={r.flags.referenceModelNeeded ? "Yes" : "No"} note="DPO carries a frozen reference; ORPO does not." />
          <StatRow label="Has encoder?" value={r.flags.hasEncoder ? "Yes" : "No"} note="Vision/ASR/audio add a (usually frozen) encoder." />
          <StatRow label="Base frozen bytes / param" value={fmt(r.flags.baseFrozenBytesPerParam, 2)} unit="B" note="Full-FT: base folded into trainable (0). QLoRA: bits/8 + double-quant const. Else bf16 = 2." />
          <StatRow label="FLOP factor" value={fmt(r.flags.flopFactor, 2)} unit="×" note="Full=6·N·D. PEFT≈4 (no base weight-grad). QLoRA +dequant. ×1.3 if grad-checkpointing." />
          <StatRow label="Token multiplier" value={r.flags.tokenMultiplier} unit="×" note="Preference objectives (DPO/ORPO) process chosen+rejected." />
        </Panel>

        <Panel title="6 · Trainable Parameters" accent="244,114,182">
          <StatRow label="Adapter params" value={fmtInt(r.params.adapterParams)} unit="params" note="Full-FT = all. LoRA/DoRA = layers·modules·2·r·hidden. Prefix = vtok·layers·hidden·2." />
          <StatRow label="Trainable fraction" value={fmtPct(r.params.trainableFraction)} note="Share of params updated. LoRA/QLoRA usually 0.1–2%." />
          <StatRow label="Total tokens" value={fmtInt(r.params.totalTokens)} unit="tokens" note="Samples × tokens/sample × epochs × objective multiplier." />
        </Panel>

        <Panel title="7 · Memory (per GPU)" accent="251,191,36">
          <StatRow label="Optimizer bytes / trainable param" value={r.memory.optimizerBytesPerTrainableParam} unit="B" note="On TRAINABLE params only (weight+grad+optimizer). PEFT ⇒ tiny." />
          <StatRow label="Base weights memory" value={fmt(r.memory.baseWeightsMemoryGB, 2)} unit="GB" note="Frozen base (bf16=2, QLoRA≈0.55). Full-FT counts base in trainable instead." />
          <StatRow label="Trainable state memory" value={fmt(r.memory.trainableStateMemoryGB, 3)} unit="GB" note="Weights+grads+optimizer on trainable params. Full-FT = 18·N; PEFT = 18·adapters." />
          <StatRow label="Encoder memory" value={fmt(r.memory.encoderMemoryGB, 3)} unit="GB" note="Frozen encoder weights (bf16)." />
          <StatRow label="Reference model memory" value={fmt(r.memory.referenceModelMemoryGB, 3)} unit="GB" note="DPO frozen reference (bf16)." />
          <StatRow label="Activation memory" value={fmt(r.memory.activationMemoryGB, 3)} unit="GB" note="Per GPU for its micro-batch. Grad-checkpointing cuts this ~4×." />
          <StatRow label="Total memory (single GPU)" value={fmt(r.memory.totalMemorySingleGpuGB, 3)} unit="GB" note="Everything on ONE GPU — the key FT feasibility number." />
          <StatRow label="Fits on 1 GPU?" value={r.memory.fitsOn1Gpu ? "YES" : "no — shard or reduce"} note="≤90% of HBM." />
          <StatRow label="Min GPUs for memory" value={fmtInt(r.memory.minGpusForMemory)} unit="GPUs" note="Shard base+state across GPUs (FSDP); activations stay per-GPU." />
          <StatRow label="Memory / GPU (at GPUs available)" value={fmt(r.memory.memoryPerGpuAtAvailableGB, 3)} unit="GB" note="Sharded state across your GPUs + per-GPU activations." />
        </Panel>

        <Panel title="8 · Compute & Time" accent="56,189,248">
          <StatRow label="Total FLOPs" value={fmtFlops(r.compute.totalFlops)} unit="FLOP" note="FLOP-factor·N·tokens (+ frozen-encoder forward)." />
          <StatRow label="Effective peak / GPU" value={fmt(r.compute.effectivePeakPerGpuPF, 2)} unit="PF" note="By precision." />
          <StatRow label="Throughput / GPU" value={fmt(r.compute.throughputPerGpuPF, 3)} unit="PF" note="Peak × MFU." />
          <StatRow label="Effective GPUs" value={fmtInt(r.compute.effectiveGpus)} unit="GPUs" note="Larger of available and memory-minimum." />
          <StatRow label="Training time" value={fmt(r.compute.trainingTimeHours, 3)} unit="hrs" note="Total FLOPs / (GPUs × throughput)." />
          <StatRow label="GPU-hours" value={fmt(r.compute.gpuHours, 3)} unit="GPU-hrs" note="Cost." />
        </Panel>

        <Panel title="9 · Output Artifacts & Storage" accent="52,211,153">
          <StatRow label="Adapter / checkpoint size" value={fmt(r.storage.adapterCheckpointSizeGB, 3)} unit="GB" note="Full-FT = full model. PEFT = just adapters (portable, often <1 GB)." />
          <StatRow label="Merged model size (if merged)" value={fmt(r.storage.mergedModelSizeGB, 2)} unit="GB" note="LoRA can be merged back into base for deployment (bf16)." />
          <StatRow label="Dataset (tokenized)" value={fmt(r.storage.tokenizedDatasetGB, 3)} unit="GB" note="One epoch of tokenized data (~2 B/token). Multi-modal raw media much larger." />
        </Panel>

        <Panel title="10 · Power" accent="248,113,113">
          <StatRow label="Power draw" value={fmt(r.power.powerDrawKW, 2)} unit="kW" note="GPU-only during the run." />
          <StatRow label="Energy" value={fmt(r.power.energyKWh, 3)} unit="kWh" note="Power × time. FT is cheap vs pretraining." />
        </Panel>
      </div>

      {/* ═══════════════ 11 · SUMMARY & RECOMMENDATIONS ═══════════════ */}
      <SectionHeader index="11" title="Summary & Recommendations" />
      <div className="rounded-2xl border p-6 mb-4" style={{ borderColor: "rgba(129,140,248,0.25)", background: "rgba(129,140,248,0.06)" }}>
        <div className="flex flex-wrap gap-3 mb-5">
          <StatusChip ok={r.memory.fitsOn1Gpu} textOk={r.summary.verdict} textBad={r.summary.verdict} />
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
            Memory saving vs Full-FT: {fmtPct(r.summary.memorySavingVsFullFT)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[12.5px] leading-relaxed text-white/65">
          <div>
            <div className="font-bold text-white/85 mb-1">Method</div>
            <p>{isQLoRA ? "QLoRA selected — 4-bit base + bf16 adapters gives roughly 4× less memory than LoRA, which is what enables large models on few GPUs. Expect a small MFU/throughput cost from the dequantization step." : isFullFT ? "Full-FT selected — best quality ceiling and the right call for continued-pretraining or a large domain shift, but it needs 18 B/param of state; shard with FSDP/ZeRO if it doesn't fit on one GPU." : "Adapter-based method selected — the frozen base stays in bf16 (2 B/param) while only a small adapter is trainable. Switch to QLoRA if memory is still tight."}</p>
          </div>
          <div>
            <div className="font-bold text-white/85 mb-1">LoRA rank</div>
            <p>{isRankBasedMethod ? `Current rank is ${inputs.loraRank} across ${inputs.loraTargetModules} target modules. Start at r=16–32 and prefer targeting more modules (all-linear) before raising rank further on hard domains.` : "Not applicable to the current method."}</p>
          </div>
          {inputs.modality === "Vision-VLM" && (
            <div>
              <div className="font-bold text-white/85 mb-1">Vision-VLM</div>
              <p>Freeze the vision encoder and LoRA the language model (plus the projector) — retrain the encoder only if domain images are far out-of-distribution from its pretraining data.</p>
            </div>
          )}
          {inputs.modality === "Transcription-ASR" && (
            <div>
              <div className="font-bold text-white/85 mb-1">Transcription-ASR</div>
              <p>For small Whisper-class models, full fine-tuning of the encoder is often affordable; for larger ones, LoRA the encoder and decoder both. Track data in audio-hours, not tokens.</p>
            </div>
          )}
          {inputs.modality === "Speech-gen-TTS" && (
            <div>
              <div className="font-bold text-white/85 mb-1">Speech-gen-TTS</div>
              <p>Audio codec tokens (~600/s × codebooks) blow up effective sequence length fast — watch activation memory and context length closely; gradient checkpointing matters more here than for text.</p>
            </div>
          )}
          <div>
            <div className="font-bold text-white/85 mb-1">Domain ({inputs.domainPreset})</div>
            <p>{r.summary.domainGuidance}. Same compute model as General — domain mainly changes data curation, context length, compliance/PII handling, and evaluation, not the sizing math above.</p>
          </div>
          <div>
            <div className="font-bold text-white/85 mb-1">Objective</div>
            <p>{isDPO ? "DPO selected — needs a frozen reference model (2×N frozen weights). If memory is tight, ORPO reaches the same preference-tuning goal without that footprint." : inputs.objective === "ORPO" ? "ORPO selected — reference-free preference tuning, avoiding DPO's extra frozen-model memory tax while still doubling tokens processed per example." : "Standard SFT-style objective — no reference model, no token-count penalty."}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════ 12 · VERIFY / SCOPE NOTES ═══════════════ */}
      <SectionHeader index="12" title="Verify Before External Use" subtitle="scope notes and assumptions to check before quoting this externally" />
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 space-y-2.5">
        {[
          "Peak FLOPS are B300 dense placeholders. Change peaks + HBM for other GPU types — H200/H100/A100/L40S set HBM automatically, but adjust the peak-FLOPs fields manually.",
          "Activation and FLOP figures are planning estimates. Real memory depends on the trainer (HF PEFT, Axolotl, Unsloth), attention implementation (FlashAttention cuts activation memory), and sequence packing.",
          "Method sets the memory regime: Full-FT ≈ 18 B/param; LoRA = 2 B/param frozen base + tiny adapters; QLoRA ≈ 0.55 B/param base + tiny adapters — that's the ~30× swing.",
          "PEFT saves compute too (FLOP factor ≈4 vs 6): no weight-gradient matmul on the frozen base, only activation gradients to reach the adapters.",
          "Modality changes token UNITS and encoder presence: images → visual tokens, audio → mel frames (ASR) or codec tokens (TTS). Enter the effective tokens/sample accordingly.",
          "Domain presets (BFSI/Legal/Telco) shift data shape (context length, dataset size, eval, compliance) — not the compute model.",
          "8-bit Adam / paged optimizers reduce optimizer bytes (~10 vs 18) — set the optimizer-bytes assumption accordingly if you use them.",
          "Out of scope: RL post-training (see the RL Post-Training tab), pretraining (see the LLM Pretraining tab), and diffusion fine-tuning (a separate sheet — different objective, VAE latents, timestep sampling).",
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
