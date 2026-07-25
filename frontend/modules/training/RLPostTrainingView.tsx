"use client";

import { useMemo, useState } from "react";
import {
  calcRLTraining, RL_TRAINING_DEFAULTS,
  type RLTrainingInputs,
  type RlAlgorithm, type Deployment, type RewardSource, type TaskType,
  type ComputePrecision, type HardwarePlatform, type RlOptimizer,
} from "./rl-posttraining-calcs";
import { fmt, fmtInt, fmtFlops, fmtPct, AxisCard, SectionHeader, Field, SelField, Panel, StatRow, MetricCard, StatusChip } from "./shared";

export function RLPostTrainingView() {
  const [inputs, setInputs] = useState<RLTrainingInputs>(RL_TRAINING_DEFAULTS);
  const r = useMemo(() => calcRLTraining(inputs), [inputs]);
  const set = (patch: Partial<RLTrainingInputs>) => setInputs(prev => ({ ...prev, ...patch }));

  const isGroupSampled = inputs.rlAlgorithm === "GRPO" || inputs.rlAlgorithm === "RLOO";
  const isAgentic = inputs.taskType === "Agentic";
  const isRFT = inputs.rlAlgorithm === "RFT";
  const isColocated = inputs.deployment === "Colocated";

  return (
    <div>
      {/* ── intro ── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <p className="text-[14px] text-white/45 max-w-2xl leading-relaxed">
          RL / post-training runs two workloads at once — a generation (rollout) cluster and a training cluster —
          and its infrastructure needs are governed by the balance between them, not by compute alone. Set the six
          configuration axes first; they decide how many models are resident, whether a rollout pool exists at all,
          and how the two clusters synchronize.
        </p>
        <button
          type="button" onClick={() => setInputs(RL_TRAINING_DEFAULTS)}
          className="flex-shrink-0 rounded-lg border border-white/15 px-3.5 py-2 text-[12px] font-semibold text-white/60 hover:text-white hover:border-white/30 transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {/* ── feasibility banner ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 mb-2">
        <span className="text-[12px] font-semibold text-white/50 mr-1">Current plan:</span>
        <StatusChip ok={r.memory.fitsTrainingHbm} textOk="Fits training HBM" textBad="OVER training HBM budget" />
        <StatusChip ok={inputs.rolloutTp <= r.hardware.nvlinkDomainSize} textOk="Rollout TP within NVLink domain" textBad="Rollout TP crosses IB" />
        <StatusChip ok={r.summary.configValid} textOk="Config valid" textBad="Fix flagged rows" />
        <span className="text-[12px] text-white/40 ml-auto">
          Binding cluster: <span className="font-bold text-white/75">{r.summary.bindingCluster}</span>
        </span>
      </div>

      {/* ═══════════════ 0 · CONFIGURATION ═══════════════ */}
      <SectionHeader index="0" title="Configuration" subtitle="set these first — they drive every formula below" />
      <p className="text-[12px] text-white/35 -mt-2 mb-5 max-w-3xl leading-relaxed">
        The RL algorithm choice alone changes which models are resident (2–4 of policy/reference/reward/critic) and
        whether a rollout cluster exists at all — DPO trains offline on preference pairs with no generation step.
      </p>
      <div className="grid grid-cols-1 gap-4">
        <AxisCard
          label="RL algorithm" accent="129,140,248" columns={3}
          question="Which post-training algorithm — this decides which models are resident and whether a rollout cluster exists."
          value={inputs.rlAlgorithm}
          onChange={v => set({ rlAlgorithm: v as RlAlgorithm })}
          options={[
            { value: "PPO", title: "PPO", description: "Classical actor-critic RL: a trained value model (critic) sits alongside the policy, reference, and (usually) reward model — four resident models, the most memory-hungry option. The critic can stabilize training on sparse or noisy rewards." },
            { value: "GRPO", title: "GRPO", description: "Group Relative Policy Optimization: samples a group of completions per prompt and uses the group's own reward statistics as the baseline, eliminating the critic. Policy + reference + optional reward model — a third fewer resident models than PPO." },
            { value: "RLOO", title: "RLOO", description: "REINFORCE Leave-One-Out: another critic-free, group-sampling method — each sample's baseline is the average of the others in its group. Same three-model resident footprint and sizing math as GRPO." },
            { value: "DPO", title: "DPO", description: "Direct Preference Optimization trains on offline preference pairs — no rollout/generation cluster, no reward model, no online sampling at all. Cheapest to run, but needs a pre-collected preference dataset rather than live generation." },
            { value: "RFT", title: "RFT", description: "Rejection Fine-Tuning: generate completions, keep only the ones a filter accepts, then run ordinary SFT on the survivors. No KL reference model needed — but most generations are typically discarded, so the accept rate drives effective compute." },
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AxisCard
            label="Deployment" accent="52,211,153"
            question="Do generation and training share one GPU pool, or run as two separate pools?"
            value={inputs.deployment}
            onChange={v => set({ deployment: v as Deployment })}
            options={[
              { value: "Colocated", title: "Colocated", description: "One GPU pool time-slices between generating rollouts and training on them. Weight sync is essentially free (same pool, NVLink), but the two phases run sequentially — GPUs sit idle during whichever phase they aren't doing." },
              { value: "Disaggregated", title: "Disaggregated", description: "Separate rollout and training pools run in parallel, pipelined — training consumes the previous step's experience while rollout generates the next. Needs weight sync over the network, but avoids serializing generation and training." },
            ]}
          />
          <AxisCard
            label="Reward source" accent="56,189,248" columns={3}
            question="How are generations scored?"
            value={inputs.rewardSource}
            onChange={v => set({ rewardSource: v as RewardSource })}
            options={[
              { value: "Rule-based", title: "Rule-based", description: "A deterministic verifier (unit tests, an answer-checker) scores completions for free — no resident reward model, no extra forward pass. Only works where correctness is programmatically checkable." },
              { value: "Model-based", title: "Model-based", description: "A trained reward model scores completions, adding a resident model plus a forward pass over every sample. Needed wherever correctness can't be verified by a rule." },
              { value: "Hybrid", title: "Hybrid", description: "Rule-based checks for what's verifiable, a reward model for what isn't. Still carries the reward model's memory and compute cost whenever it's invoked." },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AxisCard
            label="Task type" accent="244,114,182"
            question="Single generation per prompt, or multi-turn with tool calls?"
            value={inputs.taskType}
            onChange={v => set({ taskType: v as TaskType })}
            options={[
              { value: "Single-turn", title: "Single-turn", description: "One prompt → one generation. Rollout wall-clock is governed purely by decode throughput." },
              { value: "Agentic", title: "Agentic", description: "Trajectories span multiple sequential turns with tool calls between them — context keeps growing every turn, and each tool round-trip adds real wall-clock time GPUs spend idle waiting on. Often the dominant cost, not FLOPs." },
            ]}
          />
          <AxisCard
            label="Compute precision" accent="251,191,36"
            question="What numeric format runs the training-cluster matmuls?"
            value={inputs.computePrecision}
            onChange={v => set({ computePrecision: v as ComputePrecision })}
            options={[
              { value: "BF16", title: "BF16", description: "The safe default for both clusters. Full dynamic range, mature tooling." },
              { value: "FP8", title: "FP8", description: "Roughly doubles peak tensor-core throughput on the training side. Only affects the compute path." },
            ]}
          />
          <AxisCard
            label="Hardware platform" accent="248,113,113"
            question="What NVLink domain size are you deploying on?"
            value={inputs.hardwarePlatform}
            onChange={v => set({ hardwarePlatform: v as HardwarePlatform })}
            options={[
              { value: "DGX B300", title: "DGX B300", description: "An 8-GPU NVLink domain per chassis. Sets the ceiling on rollout tensor-parallelism, and on how large a weight-sync payload can stay on NVLink when colocated." },
              { value: "GB300 NVL72", title: "GB300 NVL72", description: "A 72-GPU NVLink domain — allows wider rollout tensor-parallelism, or a larger colocated pool, while weight sync stays on the fast fabric." },
            ]}
          />
        </div>
      </div>

      {/* ═══════════════ 1 · MODELS IN PLAY ═══════════════ */}
      <SectionHeader index="1" title="Models in Play" subtitle="all resident on the training cluster at once" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="Policy (actor) params" value={inputs.policyParamsB} unit="B" min={0} step={1}
          note="The model being trained — full weights + gradients + optimizer state."
          onChange={v => set({ policyParamsB: v })} />
        <Field label="Reference params" value={inputs.referenceParamsB} unit="B" min={0} step={1}
          note="Frozen KL anchor (weights only). Usually equals the policy size."
          activeWhen={r.flags.referenceActive} activeHint={r.flags.referenceActive ? "Active — used by every algorithm except RFT" : "Ignored — RFT has no KL reference"}
          onChange={v => set({ referenceParamsB: v })} />
        <Field label="Reward-model params" value={inputs.rewardModelParamsB} unit="B" min={0} step={1}
          note="Model-based reward only (weights + forward pass)."
          activeWhen={r.flags.rewardModelActive} activeHint={r.flags.rewardModelActive ? "Active — Reward source ≠ Rule-based" : "Ignored — Reward source = Rule-based, or algorithm = DPO"}
          onChange={v => set({ rewardModelParamsB: v })} />
        <Field label="Critic (value) params" value={inputs.criticParamsB} unit="B" min={0} step={1}
          note="PPO only — trained like the policy, with its own optimizer state."
          activeWhen={r.flags.criticActive} activeHint={r.flags.criticActive ? "Active — RL algorithm = PPO" : "Ignored — only PPO carries a trained critic"}
          onChange={v => set({ criticParamsB: v })} />
        <SelField label="Optimizer" value={inputs.optimizer} options={["AdamW", "Muon"] as RlOptimizer[]}
          note="AdamW = 18 B/param, Muon = 14 B/param. RL runs are usually AdamW."
          onChange={v => set({ optimizer: v })} />
        <Field label="Model layers" value={inputs.modelLayers} unit="layers" min={1} step={1}
          note="Used for KV-cache sizing on the rollout cluster."
          onChange={v => set({ modelLayers: v })} />
        <Field label="Hidden size" value={inputs.hiddenSize} unit="dim" min={1} step={128}
          note="Model width."
          onChange={v => set({ hiddenSize: v })} />
        <Field label="GQA ratio" value={inputs.gqaRatio} unit="×" min={1} step={1}
          note="Query heads per KV head. Higher ratio means a smaller KV cache."
          onChange={v => set({ gqaRatio: v })} />
      </div>

      {/* ═══════════════ 2 · RL ALGORITHM PARAMETERS ═══════════════ */}
      <SectionHeader index="2" title="RL Algorithm Parameters" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="Prompts per step" value={inputs.promptsPerStep} unit="prompts" min={1} step={64}
          note="Distinct prompts sampled per RL iteration."
          onChange={v => set({ promptsPerStep: v })} />
        <Field label="Group size (GRPO/RLOO)" value={inputs.groupSize} unit="samples" min={1} step={1}
          note="Generations per prompt. PPO/DPO effectively use 1."
          activeWhen={isGroupSampled} activeHint={isGroupSampled ? "Active — RL algorithm = GRPO/RLOO" : "Ignored while RL algorithm ≠ GRPO/RLOO"}
          onChange={v => set({ groupSize: v })} />
        <Field label="Prompt length" value={inputs.promptLength} unit="tokens" min={1} step={128}
          note="Average prompt/context length (prefill)."
          onChange={v => set({ promptLength: v })} />
        <Field label="Generation length / turn" value={inputs.generationLengthPerTurn} unit="tokens" min={1} step={256}
          note="Average new tokens generated per turn. Reasoning traces run long."
          onChange={v => set({ generationLengthPerTurn: v })} />
        <Field label="Turns (agentic)" value={inputs.turnsAgentic} unit="turns" min={1} step={1}
          note="Sequential tool-use turns per trajectory. Single-turn tasks use 1."
          activeWhen={isAgentic} activeHint={isAgentic ? "Active — Task type = Agentic" : "Ignored while Task type = Single-turn (treated as 1)"}
          onChange={v => set({ turnsAgentic: v })} />
        <Field label="Tool latency / turn" value={inputs.toolLatencyPerTurnSec} unit="s" min={0} step={0.5}
          note="Agentic only — external tool/environment round-trip added to rollout wall-clock."
          activeWhen={isAgentic} activeHint={isAgentic ? "Active — Task type = Agentic" : "Ignored while Task type = Single-turn"}
          onChange={v => set({ toolLatencyPerTurnSec: v })} />
        <Field label="PPO / update epochs" value={inputs.ppoUpdateEpochs} unit="epochs" min={1} step={1}
          note="Gradient passes over each batch of collected experience."
          onChange={v => set({ ppoUpdateEpochs: v })} />
        <Field label="RFT accept rate" value={inputs.rftAcceptRate} unit="0–1" min={0} max={1} step={0.05}
          note="Fraction of generations that pass the filter. RFT only."
          activeWhen={isRFT} activeHint={isRFT ? "Active — RL algorithm = RFT" : "Ignored while RL algorithm ≠ RFT"}
          onChange={v => set({ rftAcceptRate: v })} />
        <Field label="Steps to convergence" value={inputs.stepsToConvergence} unit="steps" min={1} step={50}
          note="RL iterations for the full run — used for the total wall-clock and GPU-hours estimate."
          onChange={v => set({ stepsToConvergence: v })} />
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
        <Field label="GPUs / node" value={inputs.physicalGpusPerNode} unit="GPUs" min={1} step={1}
          note="DGX B300 = 8× Blackwell Ultra + 2× Xeon 6776P."
          onChange={v => set({ physicalGpusPerNode: v })} />
        <Field label="HBM per GPU" value={inputs.hbmPerGpuGB} unit="GB" min={1} step={1}
          note="HBM3e."
          onChange={v => set({ hbmPerGpuGB: v })} />
        <Field label="GPU TDP" value={inputs.gpuTdpW} unit="W" min={1} step={50}
          note="~1.4 kW."
          onChange={v => set({ gpuTdpW: v })} />
        <Field label="Dense peak — BF16" value={inputs.densePeakBf16PFPerGpu} unit="PF/GPU" min={0} step={0.1}
          note="⚠ Verify vs datasheet."
          onChange={v => set({ densePeakBf16PFPerGpu: v })} />
        <Field label="Dense peak — FP8" value={inputs.densePeakFp8PFPerGpu} unit="PF/GPU" min={0} step={0.1}
          note="⚠ Verify."
          onChange={v => set({ densePeakFp8PFPerGpu: v })} />
        <Field label="Training MFU" value={inputs.trainingMfu} unit="0–1" min={0} max={1} step={0.01}
          note="RL training MFU runs lower than pretraining — small/variable batches, pipeline bubbles."
          onChange={v => set({ trainingMfu: v })} />
        <Field label="Decode throughput / rollout GPU" value={inputs.decodeThroughputPerRolloutGpu} unit="tok/s" min={1} step={100}
          note="⚠ Highly workload-dependent — the single most sensitive input here. Calibrate on your actual serving engine, don't trust the placeholder."
          onChange={v => set({ decodeThroughputPerRolloutGpu: v })} />
        <Field label="Scale-out BW / GPU" value={inputs.scaleOutBwPerGpuGBs} unit="GB/s" min={1} step={10}
          note="ConnectX-8. Carries the weight-sync path when disaggregated."
          onChange={v => set({ scaleOutBwPerGpuGBs: v })} />
        <Field label="NVLink BW / GPU" value={inputs.nvlinkBwPerGpuGBs} unit="GB/s" min={1} step={10}
          note="Carries the weight-sync path when colocated."
          onChange={v => set({ nvlinkBwPerGpuGBs: v })} />
        <Field label="Facility power overhead" value={inputs.facilityPowerOverhead} unit="×" min={1} step={0.05}
          note="Cooling/host/fabric/PSU multiplier."
          onChange={v => set({ facilityPowerOverhead: v })} />
      </div>

      {/* ═══════════════ 5/6/7/10 · CLUSTER SIZING INPUTS ═══════════════ */}
      <SectionHeader index="5–7, 10" title="Cluster Sizing & Sync" subtitle="size the two pools and their coupling" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Field label="Rollout GPUs" value={inputs.rolloutGpus} unit="GPUs" min={0} step={8}
          note="Size this pool to hit your target generation time."
          activeWhen={r.flags.generationActive} activeHint={r.flags.generationActive ? "Active — generation cluster exists" : "Ignored — DPO trains offline, no rollout pool"}
          onChange={v => set({ rolloutGpus: v })} />
        <Field label="Rollout tensor-parallel" value={inputs.rolloutTp} unit="way" min={1} step={1}
          note="TP for the policy as served on the rollout side. Must be ≤ NVLink domain."
          activeWhen={r.flags.generationActive} activeHint={r.flags.generationActive ? "Active — generation cluster exists" : "Ignored — DPO trains offline, no rollout pool"}
          onChange={v => set({ rolloutTp: v })} />
        <Field label="Training GPUs" value={inputs.trainingGpus} unit="GPUs" min={1} step={8}
          note="Size this pool to consume experience at the rate the rollout pool generates it."
          onChange={v => set({ trainingGpus: v })} />
        <Field label="Sync every N steps" value={inputs.syncEveryNSteps} unit="steps" min={1} step={1}
          note="On-policy RL syncs every step; more off-policy setups sync less often."
          onChange={v => set({ syncEveryNSteps: v })} />
        <Field label="Checkpoint interval" value={inputs.checkpointIntervalSteps} unit="steps" min={1} step={10}
          note="How often to persist the policy. RL steps are cheap to redo, so this is usually less frequent than pretraining checkpointing."
          onChange={v => set({ checkpointIntervalSteps: v })} />
      </div>

      {/* ═══════════════ RESULTS ═══════════════ */}
      <SectionHeader index="4–12" title="Results" subtitle="everything below is derived from the configuration and inputs above" />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <MetricCard label="RL step time" value={fmt(r.balance.rlStepTimeSec, 1)} unit="s" accent="167,139,250" />
        <MetricCard label="Total wall-clock" value={fmt(r.balance.totalWallClockHours, 1)} unit="hrs" accent="167,139,250" />
        <MetricCard label="GPU-hours" value={fmt(r.balance.gpuHours / 1000, 1)} unit="k GPU-hrs" accent="167,139,250" />
        <MetricCard label="Total GPUs" value={fmtInt(r.balance.totalGpus)} unit="GPUs" accent="56,189,248" />
        <MetricCard label="Facility power" value={fmt(r.power.totalFacilityPowerMW, 2)} unit="MW" accent="248,113,113" />
        <MetricCard label="Policy checkpoint" value={fmt(r.storage.policyCheckpointSizeTB, 3)} unit="TB" accent="52,211,153" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="4 · Algorithm Flags" accent="129,140,248">
          <StatRow label="Generation active?" value={r.flags.generationActive ? "Yes" : "No"} note="DPO trains on offline pairs — no rollout cluster." />
          <StatRow label="Reference active?" value={r.flags.referenceActive ? "Yes" : "No"} note="RFT is SFT on filtered samples — no KL reference." />
          <StatRow label="Critic active?" value={r.flags.criticActive ? "Yes" : "No"} note="Only PPO carries a trained value model." />
          <StatRow label="Reward model active?" value={r.flags.rewardModelActive ? "Yes" : "No"} note="Model-based/Hybrid reward with online generation." />
          <StatRow label="Effective group size" value={r.flags.effectiveGroupSize} unit="×" note="Group sampling for GRPO/RLOO; 1 otherwise." />
        </Panel>

        <Panel title="5 · Rollout / Generation Cluster" accent="56,189,248">
          <StatRow label="Generated (decode) tokens / step" value={fmtInt(r.rollout.generatedDecodeTokensPerStep)} unit="tokens" note="Prompts × group × turns × gen-length." />
          <StatRow label="Decode time / step" value={fmt(r.rollout.decodeTimePerStepSec, 2)} unit="s" note="Generated tokens / (rollout GPUs × decode throughput)." />
          <StatRow label="Tool-latency time / step" value={fmt(r.rollout.toolLatencyTimePerStepSec, 2)} unit="s" note="Sequential turns × tool latency." />
          <StatRow label="Rollout time / step" value={fmt(r.rollout.rolloutTimePerStepSec, 2)} unit="s" note="Decode + tool latency." />
          <StatRow label="KV bytes / token" value={fmtInt(r.rollout.kvBytesPerToken)} unit="B" note="2(K,V) × layers × (hidden/GQA) × 2 bytes." />
          <StatRow label="Max context / trajectory" value={fmtInt(r.rollout.maxContextPerTrajectory)} unit="tokens" note="Prompt + all generated tokens." />
          <StatRow label="KV per sequence" value={fmt(r.rollout.kvPerSequenceGB, 3)} unit="GB" note="Peak KV cache for one in-flight trajectory." />
          <StatRow label="Rollout weight mem / GPU" value={fmt(r.rollout.rolloutWeightMemPerGpuGB, 2)} unit="GB" note="bf16 policy weights sharded across rollout TP." />
          <StatRow label="KV budget / GPU" value={fmt(r.rollout.kvBudgetPerGpuGB, 2)} unit="GB" note="HBM left for KV after weights (90% usable)." />
          <StatRow label="Max concurrent trajectories / GPU" value={fmt(r.rollout.maxConcurrentTrajectoriesPerGpu, 1)} unit="seqs" note="Batch depth the rollout pool can hold. Low ⇒ decode underutilized." />
        </Panel>

        <Panel title="6 · Training Cluster" accent="251,191,36">
          <StatRow label="Trained tokens / step" value={fmtInt(r.training.trainedTokensPerStep)} unit="tokens" note="Tokens the policy updates on (DPO = chosen+rejected; RFT = filtered)." />
          <StatRow label="Policy update FLOPs / step" value={fmtFlops(r.training.policyUpdateFlopsPerStep)} unit="FLOP" note="6·N·tokens·epochs." />
          <StatRow label="Reference forward FLOPs" value={fmtFlops(r.training.referenceForwardFlops)} unit="FLOP" note="Forward-only KL logprobs." />
          <StatRow label="Reward forward FLOPs" value={fmtFlops(r.training.rewardForwardFlops)} unit="FLOP" note="Model-based reward scoring (forward)." />
          <StatRow label="Critic FLOPs" value={fmtFlops(r.training.criticFlops)} unit="FLOP" note="PPO value-model train." />
          <StatRow label="Total train FLOPs / step" value={fmtFlops(r.training.totalTrainFlopsPerStep)} unit="FLOP" note="Sum of all forward/backward work per step." />
          <StatRow label="Effective peak / GPU" value={fmt(r.training.effectivePeakPerGpuPF, 2)} unit="PF" note="By precision." />
          <StatRow label="Train throughput / GPU" value={fmt(r.training.trainThroughputPerGpuPF, 3)} unit="PF" note="Peak × training MFU." />
          <StatRow label="Train time / step" value={fmt(r.training.trainTimePerStepSec, 2)} unit="s" note="Total train FLOPs / (train GPUs × throughput)." />
        </Panel>

        <Panel title="7 · Cross-Cluster Weight Sync" accent="244,114,182">
          <StatRow label="Policy weight payload" value={fmt(r.sync.policyWeightPayloadGB, 1)} unit="GB" note="bf16 policy weights broadcast trainer → rollout." />
          <StatRow label="Sync bandwidth" value={fmtInt(r.sync.syncBandwidthGBs)} unit="GB/s" note="NVLink if colocated, scale-out if disaggregated." />
          <StatRow label="Weight-sync time / step" value={fmt(r.sync.weightSyncTimePerStepSec, 3)} unit="s" note="Amortized per step. Colocated ≈ free." />
        </Panel>

        <Panel title="8 · Training-Cluster Memory (per GPU)" accent="167,139,250">
          <StatRow label="Optimizer bytes / param" value={r.memory.optimizerBytesPerParam} unit="B" note="AdamW 18 / Muon 14." />
          <StatRow label="Policy state / GPU" value={fmt(r.memory.policyStatePerGpuGB, 2)} unit="GB" note="Full training state, ZeRO/FSDP-sharded across the training pool." />
          <StatRow label="Reference / GPU" value={fmt(r.memory.referencePerGpuGB, 3)} unit="GB" note="Frozen bf16 weights." />
          <StatRow label="Reward model / GPU" value={fmt(r.memory.rewardModelPerGpuGB, 3)} unit="GB" note="Model-based reward weights (if resident)." />
          <StatRow label="Critic / GPU" value={fmt(r.memory.criticPerGpuGB, 3)} unit="GB" note="PPO value-model training state." />
          <StatRow label="Total resident / GPU" value={fmt(r.memory.totalResidentPerGpuGB, 2)} unit="GB" note="All models on the training cluster at once — RL's memory tax." />
          <StatRow label="Fits training HBM?" value={r.memory.fitsTrainingHbm ? "OK" : "OVER — add shard degree"} note="≤85% to leave room for activations/KV during logprob passes." />
        </Panel>

        <Panel title="9 · Throughput Balance" accent="52,211,153">
          <StatRow label="RL step time" value={fmt(r.balance.rlStepTimeSec, 2)} unit="s" note="Colocated = generate then train (sequential). Disaggregated = pipelined ⇒ max of the two." />
          <StatRow label="Generation fraction of active time" value={fmtPct(r.balance.generationFractionOfActiveTime)} note="RL is famously generation-dominated (often 60–80%+)." />
          <StatRow label="Rollout : train time ratio" value={fmt(r.balance.rolloutTrainTimeRatio, 3)} unit="×" note="Disaggregated: aim ≈1 so neither pool starves." />
          <StatRow label="Balance verdict" value={r.balance.balanceVerdict} note="How to rebalance the two pools." />
          <StatRow label="Total GPUs" value={fmtInt(r.balance.totalGpus)} note="Colocated = shared pool. Disaggregated = sum of pools." />
          <StatRow label="Total wall-clock" value={fmt(r.balance.totalWallClockHours, 2)} unit="hrs" note="Step time × steps to convergence." />
          <StatRow label="GPU-hours" value={fmtInt(r.balance.gpuHours)} unit="GPU-hrs" note="Total cost." />
        </Panel>

        <Panel title="10 · Storage & Checkpoint" accent="52,211,153">
          <StatRow label="Policy checkpoint size" value={fmt(r.storage.policyCheckpointSizeTB, 3)} unit="TB" note="Policy training state. RL steps are cheap to redo — save less often than pretraining." />
          <StatRow label="Experience buffer / step" value={fmt(r.storage.experienceBufferPerStepGB, 3)} unit="GB" note="Tokens + logprobs/advantages (~4 B/token). Held between generate and train." />
          <StatRow label="Checkpoint interval" value={inputs.checkpointIntervalSteps} unit="steps" note="How often to persist the policy." />
        </Panel>

        <Panel title="11 · Power & Facility" accent="248,113,113">
          <StatRow label="Rollout power" value={fmt(r.power.rolloutPowerMW, 3)} unit="MW" note="Generation pool, facility-level." />
          <StatRow label="Training power" value={fmt(r.power.trainingPowerMW, 3)} unit="MW" note="Training pool, facility-level." />
          <StatRow label="Total facility power" value={fmt(r.power.totalFacilityPowerMW, 3)} unit="MW" note="Colocated shares the pool." />
        </Panel>
      </div>

      {/* ═══════════════ 12 · SUMMARY & RECOMMENDED CONFIG ═══════════════ */}
      <SectionHeader index="12" title="Summary & Recommended Config" />
      <div className="rounded-2xl border p-6 mb-4" style={{ borderColor: "rgba(129,140,248,0.25)", background: "rgba(129,140,248,0.06)" }}>
        <div className="flex flex-wrap gap-3 mb-5">
          <StatusChip ok={r.summary.configValid} textOk="Config valid" textBad="Fix flagged rows above" />
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>
            Binding cluster: {r.summary.bindingCluster}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[12.5px] leading-relaxed text-white/65">
          <div>
            <div className="font-bold text-white/85 mb-1">Deployment</div>
            <p>{isColocated ? "Colocated selected — simpler operationally, but generation and training serialize on the same pool. Consider disaggregating for large runs so the two phases pipeline instead of stalling each other." : "Disaggregated selected — separate rollout/train pools pipeline generation with the previous step's training. Overlap weight sync with the next batch's generation to keep it off the critical path."}</p>
          </div>
          <div>
            <div className="font-bold text-white/85 mb-1">Rollout engine</div>
            <p>Decode is memory-bandwidth-bound — maximize concurrent trajectories against the KV budget above (currently {fmt(r.rollout.maxConcurrentTrajectoriesPerGpu, 0)} seqs/GPU). Low batch depth means wasted GPUs on the rollout side.</p>
          </div>
          <div>
            <div className="font-bold text-white/85 mb-1">Balance</div>
            <p>{r.balance.balanceVerdict === "offline — no rollout pool" ? "DPO trains offline — there is no rollout pool to balance against the training cluster." : `Rollout:train time ratio is ${fmt(r.balance.rolloutTrainTimeRatio, 2)}×. ${r.balance.balanceVerdict === "balanced" ? "Pools are roughly balanced — neither should be starving the other." : r.balance.balanceVerdict}.`} RL is generation-dominated by default — expect the rollout pool to be the larger one; tune pool sizes toward a ratio near 1.
            </p>
          </div>
          <div>
            <div className="font-bold text-white/85 mb-1">Algorithm</div>
            <p>{isGroupSampled ? "GRPO/RLOO selected — the critic is dropped entirely, halving the training-side model count versus PPO." : inputs.rlAlgorithm === "PPO" ? "PPO selected — the critic is trained alongside the policy, the most memory- and compute-hungry configuration here." : inputs.rlAlgorithm === "DPO" ? "DPO selected — no rollout, no reward model, no reference-forward cost beyond the offline pairs." : "RFT selected — no KL reference; watch the accept rate, since discarded generations are pure waste."}{inputs.rewardSource === "Rule-based" ? " Rule-based rewards remove the reward-model pass entirely — a real saving for math/code tasks." : ""}</p>
          </div>
          {r.flags.generationActive && (
            <div>
              <div className="font-bold text-white/85 mb-1">Weight sync</div>
              <p>{isColocated ? "Colocated ⇒ NVLink sync is effectively free at the current payload." : "Disaggregated ⇒ sync crosses scale-out fabric; overlap it with generation of the next batch so it doesn't sit on the critical path."} Current payload is {fmt(r.sync.policyWeightPayloadGB, 1)} GB every {inputs.syncEveryNSteps} step(s).</p>
            </div>
          )}
          {isAgentic && (
            <div>
              <div className="font-bold text-white/85 mb-1">Agentic</div>
              <p>Budget for tool latency and long context — multi-turn KV grows every turn, and tool round-trips can dominate wall-clock and idle GPUs. Batch across many trajectories to keep the rollout pool busy while individual tool calls are in flight.</p>
            </div>
          )}
          <div>
            <div className="font-bold text-white/85 mb-1">Memory</div>
            <p>All resident models are RL&rsquo;s memory tax: policy(+optimizer) + reference + reward + critic co-resident on the training cluster. Shard or offload the frozen models (reference/reward) to CPU or other GPUs if tight.</p>
          </div>
        </div>
      </div>

      {/* ═══════════════ 13 · VERIFY BEFORE EXTERNAL USE ═══════════════ */}
      <SectionHeader index="13" title="Verify Before External Use" subtitle="scope notes and assumptions to check before quoting this externally" />
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5 space-y-2.5">
        {[
          "Decode throughput (tok/s per rollout GPU) is the single most sensitive input and is highly engine/model/batch-dependent — measure it on your stack; do not quote the placeholder.",
          "FLOP and time figures are order-of-magnitude planning estimates. RL throughput is gated by long-tail trajectory lengths, load imbalance, and pipeline bubbles not captured here.",
          "RL is generation-dominated: the rollout pool is usually the larger cost. Size it first, then match the training pool to consume at that rate.",
          "Model count is algorithm-driven: PPO = policy+critic+reference+reward (4); GRPO/RLOO = policy+reference+reward (3, no critic); DPO = policy+reference (2, offline, no rollout); RFT = policy only (generate→filter→SFT).",
          "Rule-based rewards (verifiable math/code) remove the reward model entirely — no resident weights, no scoring forward pass.",
          "Colocated vs disaggregated changes GPU accounting: colocated time-slices one pool (weight sync free); disaggregated runs two pools and pipelines them (sync over network).",
          "Agentic RL adds sequential tool-call latency and monotonically growing KV per turn — often the real wall-clock bottleneck, not FLOPs.",
          "Out of scope: pretraining/SFT compute (see the LLM Pretraining tab) and diffusion/generative RLHF. A dedicated fine-tuning (SFT/LoRA/QLoRA) sheet is a separate deliverable.",
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
