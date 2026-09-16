"use client";

import { useMemo, useState } from "react";
import {
  ABBR, getSiliconPeak, getSiliconMemoryBandwidthGBs,
  type UsecaseInputs, type ModelArchitecture,
} from "./deep-analysis-data";
import { CompactPanel, CompactRow, compactInputStyle } from "./deep-analysis-ui";
import type { ComparisonChip } from "@/modules/silicon/comparison-data";

// ── Routing — CPU orchestration cost of the disaggregated prefill/decode request path ──────
// Ported 1:1 from public/cpu-orchestration-model.html — a stage-by-stage cost model of
// everything the CPU orchestrates around the GPU work: HTTP ingress, tokenization, prefix-block
// hashing, worker cost-scoring, admission, NIXL descriptor prep, the prefill→decode control hop,
// KV transfer, and detokenization — each stage costed as rate × coefficient, where the rate
// comes from the model architecture / use case and the coefficient is either a silicon roofline
// or a measured/estimated stack primitive. Self-contained (own local state, own presets), the
// same way KvOffloadView is — this is a distinct calculator, not driven by the page's shared
// arch/usecase/chip state, since its inputs (CPU coefficients, serving/prefix-cache knobs) don't
// correspond to fields that state exposes.

// ── colors — reuses the bright, saturated "distribution" palette established by Prefill's
// category colors elsewhere on this tab, so Routing's 4 resource categories (cpu/gpu/xfer/wait)
// read as part of the same visual language without colliding with the cyan click-highlight,
// green=interconnect, or orange=memory conventions used across the other sections. ────────────
const R_CPU = "#a78bfa";  // bright violet — CPU orchestration
const R_GPU = "#2dd4bf";  // bright teal — GPU execution
const R_XFER = "#f472b6"; // bright pink — KV transfer
const R_WAIT = "#facc15"; // bright amber — CPU spinning while blocked

type Resource = "cpu" | "gpu" | "xfer" | "wait";
const RESOURCE_COLOR: Record<Resource, string> = { cpu: R_CPU, gpu: R_GPU, xfer: R_XFER, wait: R_WAIT };
const RESOURCE_LABEL: Record<Resource, string> = { cpu: "cpu", gpu: "gpu", xfer: "xfer", wait: "spin" };

export interface RoutingInputs {
  // use case — request rate and prompt-bytes/token have no equivalent in the shared Use Case
  // panel, so they stay here; input/output tokens and concurrency read from that shared state
  // instead (see RoutingSection) rather than duplicating it.
  qps: number; bpt: number;
  // silicon — Prefill TFLOPS and VRAM bandwidth now come from the shared GPU Compute panel's
  // selected chip (see RoutingSection); measured decode step and KV transfer rate have no
  // shared equivalent (one's a calibration constant, the other's the NIXL/RDMA fabric between
  // disaggregated prefill/decode pools, not the TP interconnect), so they stay local.
  stepMeas: number; bwXfer: number; cores: number; util: number;
  // serving
  blk: number; chunk: number; hitP: number; hitD: number; nw: number; delta: boolean;
  // CPU coefficients
  cFe: number; cTok: number; cBlk: number; cScore: number; cAdmit: number; cHop: number; cXfer: number; cDesc: number; cDetok: number;
}

export const DEFAULT_ROUTING_INPUTS: RoutingInputs = {
  qps: 0.11, bpt: 4,
  stepMeas: 27.94, bwXfer: 27, cores: 32, util: 0.7,
  blk: 64, chunk: 2048, hitP: 0, hitD: 0, nw: 2, delta: true,
  cFe: 0.60, cTok: 0.55, cBlk: 4, cScore: 5, cAdmit: 0.20, cHop: 6.80, cXfer: 90, cDesc: 0.5, cDetok: 0.02,
};

// ── formatting — ported verbatim from the source tool's ms()/by() helpers ──────────────────
function fmtMs(x: number): string {
  if (!isFinite(x)) return "—";
  if (x >= 1000) return `${(x / 1000).toFixed(2)} s`;
  if (x >= 10) return `${x.toFixed(1)} ms`;
  if (x >= 1) return `${x.toFixed(2)} ms`;
  if (x >= 0.001) return `${(x * 1000).toFixed(0)} µs`;
  return "<1 µs";
}
function fmtBytes(b: number): string {
  if (b >= 1e12) return `${(b / 1099511627776).toFixed(2)} TiB`;
  if (b >= 1073741824) return `${(b / 1073741824).toFixed(2)} GiB`;
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MiB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KiB`;
  return `${b.toFixed(0)} B`;
}

export type RoutingRowKey =
  | "httpIngress" | "tokenise" | "blockHash" | "costScore" | "admitPrefill"
  | "prefillForward" | "prefillStepOverhead" | "nixlDescriptor" | "controlHop" | "admitDecode"
  | "kvTransfer" | "schedulerSpin" | "decodeForward" | "decodeStepOverhead" | "detokenise";

interface RoutingStage {
  key: RoutingRowKey; name: string; node: "FE" | "P" | "P→D" | "D"; unit: string; form: string;
  t: number; cs: number; res: Resource;
}

/** What each stage's formula actually reads — mirrors DECODE_ROW_HIGHLIGHTS/KV_CACHE_ROW_HIGHLIGHTS
 *  in deep-analysis-data.ts: clicking a Stage-model row lights up the matching Architecture/Use
 *  Case/GPU Compute fields in the shared rail, plus the matching Serving/Host-CPU/CPU-coefficients
 *  field in Routing's own panels. */
export interface RoutingRowHighlights {
  archAbbrevs?: string[];
  usecaseFields?: (keyof UsecaseInputs)[];
  siliconPeak?: boolean;
  siliconBandwidth?: boolean;
  routingFields?: (keyof RoutingInputs)[];
}

export const ROUTING_ROW_HIGHLIGHTS: Record<RoutingRowKey, RoutingRowHighlights> = {
  httpIngress: { routingFields: ["cFe"] },
  tokenise: { routingFields: ["cTok"], usecaseFields: ["inputTokens"] },
  blockHash: { routingFields: ["cBlk", "blk"], usecaseFields: ["inputTokens"] },
  costScore: { routingFields: ["cScore", "nw"] },
  admitPrefill: { routingFields: ["cAdmit"] },
  prefillForward: { archAbbrevs: [ABBR.N, ABBR.n_fa, ABBR.d_model], usecaseFields: ["inputTokens", "gemmMfu"], routingFields: ["hitP"], siliconPeak: true },
  prefillStepOverhead: { routingFields: ["stepMeas", "chunk", "hitP"], usecaseFields: ["inputTokens"], siliconBandwidth: true },
  nixlDescriptor: { archAbbrevs: [ABBR.n_layers], routingFields: ["cDesc", "blk"], usecaseFields: ["inputTokens"] },
  controlHop: { routingFields: ["cHop"] },
  admitDecode: { routingFields: ["cAdmit"] },
  kvTransfer: { archAbbrevs: [ABBR.n_fa, ABBR.n_kv, ABBR.d_head], usecaseFields: ["inputTokens", "kvDtypeBytes"], routingFields: ["cXfer", "bwXfer", "blk", "hitD", "delta"] },
  schedulerSpin: { archAbbrevs: [ABBR.n_fa, ABBR.n_kv, ABBR.d_head], usecaseFields: ["inputTokens", "kvDtypeBytes"], routingFields: ["cXfer", "bwXfer", "blk", "hitD", "delta"] },
  decodeForward: { archAbbrevs: [ABBR.N, ABBR.n_fa, ABBR.n_kv, ABBR.d_head], usecaseFields: ["outputTokens", "concurrency", "weightDtypeBytes", "kvDtypeBytes"], siliconBandwidth: true },
  decodeStepOverhead: { routingFields: ["stepMeas"], usecaseFields: ["outputTokens"], siliconBandwidth: true },
  detokenise: { routingFields: ["cDetok"], usecaseFields: ["outputTokens"] },
};

interface RoutingModel {
  kvTok: number; wBytes: number; nBlk: number; bytesMove: number; bytesTotal: number;
  roofFull: number; cStep: number;
  /** Intermediates not otherwise exposed above — kept on the result so callers building a live
   *  formula chain (the Excel export) can cache the exact same numbers Excel's formulas will
   *  land on, without re-deriving them by hand and risking a mismatch. */
  Peff: number; nStepsP: number; roof: number; kvRead: number; blkMove: number; flops: number;
  stages: RoutingStage[];
  ttft: number; t2nd: number; total: number; tCpu: number; tGpu: number; tXfer: number;
  tPfGpu: number;
}

/** isl/osl/batch come from the page's shared Use Case state, the model-architecture fields
 *  (pAct/wB/lTot/lKv/dModel/kvH/hD/kvB) from the page's shared selected model + dtype settings,
 *  and tflops/bwMem from the shared GPU Compute chip — none of these live in RoutingInputs, to
 *  avoid a second editable copy of any of them (see RoutingSection). */
export type RoutingComputeInputs = RoutingInputs & {
  isl: number; osl: number; batch: number;
  pAct: number; wB: number; lTot: number; lKv: number; dModel: number; kvH: number; hD: number; kvB: number;
  tflops: number; bwMem: number;
};

/** Fills in the isl/osl/batch/architecture/silicon fields RoutingInputs deliberately omits (see
 *  the type's own doc comment) from the page's shared arch/usecase/chip state — shared by
 *  RoutingSection and the Excel export so both read the model exactly the same way. */
export function buildRoutingComputeInputs(
  inputs: RoutingInputs, arch: ModelArchitecture, usecase: UsecaseInputs, chip: ComparisonChip | undefined,
): RoutingComputeInputs {
  const lKv = arch.fullAttnLayers + (arch.secondary?.kind === "windowed" ? arch.secondaryLayers : 0);
  const peak = chip ? getSiliconPeak(chip) : null;
  const memBandwidthGBs = chip ? getSiliconMemoryBandwidthGBs(chip) : null;
  return {
    ...inputs, isl: usecase.inputTokens, osl: usecase.outputTokens, batch: usecase.concurrency,
    pAct: arch.activeParamsB ?? arch.totalParamsB, wB: usecase.weightDtypeBytes,
    lTot: arch.totalLayers, lKv, dModel: arch.hiddenDim,
    kvH: arch.fullAttn.kvHeads, hD: arch.fullAttn.headDim, kvB: usecase.kvDtypeBytes,
    tflops: (peak?.teraflops ?? 0) * usecase.gemmMfu, bwMem: memBandwidthGBs ?? 0,
  };
}

/** Pure port of the source tool's `model()` — every stage is cost = rate × coefficient, where
 *  the rate comes from architecture/use-case and the coefficient is a silicon roofline or a
 *  stack primitive (measured or estimated, tagged per-field in the CPU-coefficients rail). */
export function computeRoutingModel(p: RoutingComputeInputs): RoutingModel {
  const kvTok = p.lKv * 2 * p.kvH * p.hD * p.kvB; // bytes/token
  const wBytes = p.pAct * 1e9 * p.wB;
  const nBlk = Math.ceil(p.isl / Math.max(1, p.blk));
  const blkMove = p.delta ? Math.ceil(nBlk * (1 - p.hitD)) : nBlk;
  const bytesMove = blkMove * p.blk * kvTok;
  const bytesTotal = nBlk * p.blk * kvTok;
  const Peff = p.isl * (1 - p.hitP);
  const nStepsP = Peff > 0 ? Math.ceil(Peff / Math.max(1, p.chunk)) : 0;

  const roof = p.bwMem > 0 ? (wBytes / (p.bwMem * 1e9)) * 1000 : 0; // ms, weights only, BS1
  const kvRead = (p.batch * p.isl * kvTok) / (p.bwMem * 1e9) * 1000;
  const roofFull = roof + kvRead;
  const cStep = Math.max(0, p.stepMeas - roofFull); // implied CPU per engine step

  const stages: RoutingStage[] = [];
  const add = (key: RoutingRowKey, name: string, node: RoutingStage["node"], unit: string, form: string, t: number, cs: number, res: Resource) =>
    stages.push({ key, name, node, unit, form, t, cs, res });

  const tTok = (p.cTok * p.isl) / 1000;
  const tBlk = (p.cBlk * nBlk) / 1000;
  const tScore = (p.cScore * p.nw) / 1000;
  add("httpIngress", "HTTP ingress + template", "FE", "request", "c_fe", p.cFe, p.cFe / 1000, "cpu");
  add("tokenise", "Tokenisation", "FE", "prompt tokens", "c_tok · ISL/1000", tTok, tTok / 1000, "cpu");
  add("blockHash", "Block hashing + prefix lookup", "FE", `⌈ISL/B⌉ blocks`, `c_blk · ${nBlk}`, tBlk, tBlk / 1000, "cpu");
  add("costScore", "Cost scoring + worker select", "FE", "workers", `c_score · ${p.nw}`, tScore, tScore / 1000, "cpu");
  add("admitPrefill", "Admission (prefill)", "P", "request", "c_admit", p.cAdmit, p.cAdmit / 1000, "cpu");

  const flops = 2 * p.pAct * 1e9 * Peff + 2 * p.lKv * Peff * p.isl * p.dModel;
  const tPfGpu = p.tflops > 0 ? (flops / (p.tflops * 1e12)) * 1000 : 0;
  const tPfCpu = nStepsP * cStep;
  add("prefillForward", "Prefill forward", "P", "FLOPs", "(2·N·T + 2·L_kv·T·ISL·d)/TFLOPS", tPfGpu, 0, "gpu");
  add("prefillStepOverhead", "Prefill step overhead", "P", "engine steps", `c_step · ${nStepsP}`, tPfCpu, tPfCpu / 1000, "cpu");

  const tDesc = (p.cDesc * nBlk * p.lTot) / 1000;
  add("nixlDescriptor", "NIXL descriptor prep", "P", "blocks × layers", `c_desc · ${nBlk * p.lTot}`, tDesc, tDesc / 1000, "cpu");
  add("controlHop", "Control hop (NATS + discovery)", "P→D", "request", "c_hop", p.cHop, p.cHop / 1000, "cpu");
  add("admitDecode", "Admission (decode)", "D", "request", "c_admit", p.cAdmit, p.cAdmit / 1000, "cpu");

  const tXfer = bytesMove > 0 ? p.cXfer + (bytesMove / 1e6 / p.bwXfer) * 1000 : 0;
  add("kvTransfer", "KV transfer", "D", "bytes moved", "c_xfer + bytes/BW_xfer", tXfer, 0, "xfer");
  add("schedulerSpin", "Scheduler spin during transfer", "D", "transfer duration", "1 core × T_xfer", 0, tXfer / 1000, "wait");

  const tDecGpu = p.osl * roofFull;
  const tDecCpu = p.osl * cStep;
  add("decodeForward", "Decode forward", "D", "output tokens", "OSL · (W + KV_batch)/BW_mem", tDecGpu, 0, "gpu");
  add("decodeStepOverhead", "Decode step overhead", "D", "engine steps", "c_step · OSL", tDecCpu, tDecCpu / 1000, "cpu");
  const tDet = p.osl * p.cDetok;
  add("detokenise", "Detokenise + SSE", "FE", "output tokens", "c_detok · OSL", tDet, tDet / 1000, "cpu");

  // critical path: everything is serial in this flow except detok, which overlaps decode
  const ttft = p.cFe + tTok + tBlk + tScore + p.cAdmit + tPfGpu + tPfCpu + tDesc;
  const t2nd = ttft + p.cHop + p.cAdmit + tXfer;
  const total = t2nd + tDecGpu + tDecCpu;
  const tCpu = p.cFe + tTok + tBlk + tScore + 2 * p.cAdmit + tPfCpu + tDesc + p.cHop + tDecCpu;
  const tGpu = tPfGpu + tDecGpu;

  return {
    kvTok, wBytes, nBlk, bytesMove, bytesTotal, roofFull, cStep,
    Peff, nStepsP, roof, kvRead, blkMove, flops,
    stages, ttft, t2nd, total, tCpu, tGpu, tXfer, tPfGpu,
  };
}

// ── presentational helpers — styled to this app's --dm-* theme tokens ──────────────────────

function CompactNumField({ value, onChange, step = 1 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number" value={value} step={step}
      onChange={e => onChange(Number(e.target.value))}
      className="rounded px-1.5 py-0.5 text-xs font-mono text-right focus:outline-none"
      style={compactInputStyle}
    />
  );
}

// ── Routing's remaining input panels — Serving, Host-CPU, CPU coefficients — live in the
// page's shared right rail (under Architecture and under Interconnect respectively, on the
// Routing tab only) rather than in RoutingSection's own column, since `inputs` is lifted up to
// the page so these panels and RoutingSection itself read/write the same state. Built from the
// same CompactPanel/CompactRow primitives as Architecture/Use Case/GPU Compute/Interconnect, so
// every rail panel on this tab reads as one family — including the same click-to-highlight glow
// (`highlighted`, driven by a clicked Stage-model row) rather than a differently-styled block. ──

export function RoutingServingPanel({ inputs, onChange, highlighted }: {
  inputs: RoutingInputs; onChange: (next: RoutingInputs) => void; highlighted?: Set<keyof RoutingInputs> | null;
}) {
  function set<K extends keyof RoutingInputs>(key: K, value: RoutingInputs[K]) {
    onChange({ ...inputs, [key]: value });
  }
  const lit = (f: keyof RoutingInputs) => !!highlighted?.has(f);
  return (
    <CompactPanel title="Serving" subtitle="Prefix caching, chunking, and worker fan-out knobs the Routing model reads.">
      <CompactRow label="KV block size, tokens" index={0} lit={lit("blk")}>
        <CompactNumField value={inputs.blk} step={16} onChange={v => set("blk", v)} />
      </CompactRow>
      <CompactRow label="Chunked-prefill chunk" index={1} lit={lit("chunk")}>
        <CompactNumField value={inputs.chunk} step={256} onChange={v => set("chunk", v)} />
      </CompactRow>
      <CompactRow label="Prefix hit, prefill worker" index={2} lit={lit("hitP")}>
        <CompactNumField value={inputs.hitP} step={0.05} onChange={v => set("hitP", Math.min(0.99, Math.max(0, v)))} />
      </CompactRow>
      <CompactRow label="Prefix hit, decode worker" index={3} lit={lit("hitD")}>
        <CompactNumField value={inputs.hitD} step={0.05} onChange={v => set("hitD", Math.min(0.99, Math.max(0, v)))} />
      </CompactRow>
      <CompactRow label="Workers scored per request" index={4} lit={lit("nw")}>
        <CompactNumField value={inputs.nw} onChange={v => set("nw", v)} />
      </CompactRow>
      <CompactRow label="Request rate, req/s" index={5} lit={lit("qps")}>
        <CompactNumField value={inputs.qps} step={0.01} onChange={v => set("qps", v)} />
      </CompactRow>
      <CompactRow label="Prompt bytes/token" index={6} lit={lit("bpt")}>
        <CompactNumField value={inputs.bpt} step={0.5} onChange={v => set("bpt", v)} />
      </CompactRow>
      <CompactRow label="KV transfer rate, MB/s" index={7} lit={lit("bwXfer")}>
        <CompactNumField value={inputs.bwXfer} onChange={v => set("bwXfer", v)} />
      </CompactRow>
      <CompactRow label="Delta transfer" hint="Move only blocks the decode worker lacks" index={8} lit={lit("delta")}>
        <input type="checkbox" checked={inputs.delta} onChange={e => set("delta", e.target.checked)} style={{ accentColor: "#22d3ee" }} />
      </CompactRow>
    </CompactPanel>
  );
}

export function RoutingHostCpuPanel({ inputs, onChange, highlighted }: {
  inputs: RoutingInputs; onChange: (next: RoutingInputs) => void; highlighted?: Set<keyof RoutingInputs> | null;
}) {
  function set<K extends keyof RoutingInputs>(key: K, value: RoutingInputs[K]) {
    onChange({ ...inputs, [key]: value });
  }
  const lit = (f: keyof RoutingInputs) => !!highlighted?.has(f);
  return (
    <CompactPanel title="Host-CPU" subtitle="Node sizing — how many cores absorb the CPU-orchestration cost above.">
      <CompactRow label="Cores per node" index={0} lit={lit("cores")}>
        <CompactNumField value={inputs.cores} onChange={v => set("cores", v)} />
      </CompactRow>
      <CompactRow label="Target core utilisation" index={1} lit={lit("util")}>
        <CompactNumField value={inputs.util} step={0.05} onChange={v => set("util", Math.min(1, Math.max(0.1, v)))} />
      </CompactRow>
    </CompactPanel>
  );
}

export function RoutingCpuCoefficientsPanel({ inputs, onChange, highlighted }: {
  inputs: RoutingInputs; onChange: (next: RoutingInputs) => void; highlighted?: Set<keyof RoutingInputs> | null;
}) {
  function set<K extends keyof RoutingInputs>(key: K, value: RoutingInputs[K]) {
    onChange({ ...inputs, [key]: value });
  }
  const lit = (f: keyof RoutingInputs) => !!highlighted?.has(f);
  return (
    <CompactPanel title="CPU coefficients" subtitle="Stack primitives — measured from the instrumented run, or an estimate pending a microbenchmark.">
      <CompactRow label="Measured decode step, ms" hint="meas" index={0} lit={lit("stepMeas")}>
        <CompactNumField value={inputs.stepMeas} step={0.01} onChange={v => set("stepMeas", v)} />
      </CompactRow>
      <CompactRow label="Frontend fixed, ms" hint="meas" index={1} lit={lit("cFe")}>
        <CompactNumField value={inputs.cFe} step={0.05} onChange={v => set("cFe", v)} />
      </CompactRow>
      <CompactRow label="Tokenise, ms/1K tokens" hint="meas" index={2} lit={lit("cTok")}>
        <CompactNumField value={inputs.cTok} step={0.05} onChange={v => set("cTok", v)} />
      </CompactRow>
      <CompactRow label="Hash + lookup, µs/block" hint="est" index={3} lit={lit("cBlk")}>
        <CompactNumField value={inputs.cBlk} step={0.5} onChange={v => set("cBlk", v)} />
      </CompactRow>
      <CompactRow label="Score per worker, µs" hint="est" index={4} lit={lit("cScore")}>
        <CompactNumField value={inputs.cScore} onChange={v => set("cScore", v)} />
      </CompactRow>
      <CompactRow label="Admission, ms/request" hint="meas" index={5} lit={lit("cAdmit")}>
        <CompactNumField value={inputs.cAdmit} step={0.01} onChange={v => set("cAdmit", v)} />
      </CompactRow>
      <CompactRow label="Control hop, ms/request" hint="meas" index={6} lit={lit("cHop")}>
        <CompactNumField value={inputs.cHop} step={0.1} onChange={v => set("cHop", v)} />
      </CompactRow>
      <CompactRow label="Transfer setup, ms" hint="meas" index={7} lit={lit("cXfer")}>
        <CompactNumField value={inputs.cXfer} step={5} onChange={v => set("cXfer", v)} />
      </CompactRow>
      <CompactRow label="NIXL descriptor, µs/block·layer" hint="est" index={8} lit={lit("cDesc")}>
        <CompactNumField value={inputs.cDesc} step={0.1} onChange={v => set("cDesc", v)} />
      </CompactRow>
      <CompactRow label="Detokenise + SSE, ms/token" hint="est" index={9} lit={lit("cDetok")}>
        <CompactNumField value={inputs.cDetok} step={0.005} onChange={v => set("cDetok", v)} />
      </CompactRow>
    </CompactPanel>
  );
}

function Readout({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div className="px-3 py-2 border-r last:border-r-0" style={{ borderColor: "var(--dm-border-a)" }}>
      <p className="text-xl font-mono font-bold leading-tight" style={{ color: color ?? "var(--dm-txt-primary)" }}>{value}</p>
      <p className="text-[10.5px] mt-0.5" style={{ color: "var(--dm-txt-muted)" }}>{label}</p>
      {sub && <p className="text-[10px]" style={{ color: "var(--dm-txt-faintest)" }}>{sub}</p>}
    </div>
  );
}

const NODE_LABEL: Record<RoutingStage["node"], string> = { FE: "Frontend", P: "Prefill", "P→D": "Hop", D: "Decode" };

export function RoutingSection({ arch, usecase, chip, inputs, onChangeInputs, highlightedRow, onSelectRow }: {
  arch: ModelArchitecture; usecase: UsecaseInputs;
  chip: ComparisonChip | undefined;
  /** Lifted up to the page — see the note above RoutingServingPanel/RoutingHostCpuPanel/
   *  RoutingCpuCoefficientsPanel, which render the rest of these inputs in the shared rail. */
  inputs: RoutingInputs; onChangeInputs: (next: RoutingInputs) => void;
  /** Also lifted up — a clicked Stage-model row highlights fields in the shared Architecture/
   *  Use Case/GPU Compute panels as well as Routing's own Serving/Host-CPU/CPU-coefficients
   *  panels, all of which live outside this component (see DeepAnalysisView). */
  highlightedRow: RoutingRowKey | null; onSelectRow: (key: RoutingRowKey | null) => void;
}) {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  function toggleResource(res: Resource) {
    setSelectedResource(prev => (prev === res ? null : res));
  }
  function toggleRow(key: RoutingRowKey) {
    onSelectRow(highlightedRow === key ? null : key);
  }

  const m = useMemo(
    () => computeRoutingModel(buildRoutingComputeInputs(inputs, arch, usecase, chip)),
    [inputs, arch, usecase, chip],
  );
  const tot = m.total || 1;

  const waterfallStages = m.stages.filter(s => s.t > 0 && s.name !== "Detokenise + SSE");
  const visibleStages = selectedResource ? m.stages.filter(s => s.res === selectedResource) : m.stages;

  const perNode: Record<"FE" | "P" | "D", number> = { FE: 0, P: 0, D: 0 };
  m.stages.forEach(s => { const k = s.node === "P→D" ? "P" : s.node; perNode[k] += s.cs; });
  const dominant: Record<"FE" | "P" | "D", string> = { FE: "detokenise + SSE", P: "step overhead + descriptors", D: "spin during transfer" };

  const pin = inputs.qps * ((m.tPfGpu + m.tXfer) / 1000) * m.bytesTotal;
  const fab = inputs.qps * m.bytesMove;
  const dkv = usecase.concurrency * (usecase.inputTokens + usecase.outputTokens) * m.kvTok;

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--dm-txt-primary)" }}>What the CPU orchestrates, stage by stage</h2>
        <p className="mt-0.5 text-xs leading-relaxed max-w-3xl" style={{ color: "var(--dm-txt-muted)" }}>
          Every stage in the disaggregated request path, with its scaling unit and cost derived from the inputs rather than fitted.
          Stages are tagged by the resource they consume and by whether they sit on the critical path.
        </p>
      </div>

      <div className="p-5">
        {/* readouts */}
        <div className="rounded-xl border overflow-hidden mb-3 flex flex-wrap" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
          <Readout value={fmtMs(m.ttft)} label="TTFT" sub="first token comes from prefill" />
          <Readout value={fmtMs(m.t2nd)} label="time to 2nd token" sub="what the user actually waits" color={R_XFER} />
          <Readout value={fmtMs(m.total)} label="total request" />
          <Readout value={`${(m.tCpu / tot * 100).toFixed(1)}%`} label="CPU orchestration" sub={fmtMs(m.tCpu)} color={R_CPU} />
          <Readout value={`${(m.tGpu / tot * 100).toFixed(1)}%`} label="GPU execution" sub={fmtMs(m.tGpu)} color={R_GPU} />
          <Readout value={`${(m.tXfer / tot * 100).toFixed(1)}%`} label="KV transfer" sub={fmtMs(m.tXfer)} color={R_XFER} />
        </div>

        <div className="flex flex-col gap-5">
          {/* Serving / Host-CPU / CPU coefficients now render in the shared rail on the right
              (under Architecture and under Interconnect) — see RoutingServingPanel and friends,
              rendered from DeepAnalysisView when section === "routing". */}
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-xs font-bold" style={{ color: "var(--dm-txt-primary)" }}>Critical path</h3>
                {selectedResource && (
                  <button
                    type="button" onClick={() => setSelectedResource(null)}
                    className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                    style={{ color: RESOURCE_COLOR[selectedResource], border: `1px solid ${RESOURCE_COLOR[selectedResource]}` }}
                  >
                    Filtered: {RESOURCE_LABEL[selectedResource]} — click to clear
                  </button>
                )}
              </div>
              <p className="text-[10.5px] mb-2.5" style={{ color: "var(--dm-txt-faintest)" }}>
                Widths are proportional to wall-clock. Click a segment or a legend entry to filter the stage table below to that resource.
                Stages costing under a millisecond will not be visible here — read them off the table below.
              </p>
              <div className="h-7 flex overflow-hidden rounded-md mb-2.5" style={{ background: "var(--dm-surface-b)" }}>
                {waterfallStages.map((s, i) => (
                  <div
                    key={i} onClick={() => toggleResource(s.res)}
                    title={`${s.name} — ${fmtMs(s.t)} (click to filter)`}
                    style={{
                      width: `${(s.t / tot * 100).toFixed(3)}%`, minWidth: 2, background: RESOURCE_COLOR[s.res],
                      opacity: selectedResource && selectedResource !== s.res ? 0.25 : 1,
                      cursor: "pointer", transition: "opacity 150ms",
                    }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-[11px]" style={{ color: "var(--dm-txt-muted)" }}>
                {(["cpu", "gpu", "xfer", "wait"] as Resource[]).map(res => {
                  const active = selectedResource === res;
                  const dimmed = !!selectedResource && !active;
                  const legendText: Record<Resource, string> = { cpu: "CPU orchestration", gpu: "GPU execution", xfer: "KV transfer", wait: "CPU spinning while blocked" };
                  return (
                    <button
                      key={res} type="button" onClick={() => toggleResource(res)}
                      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 -mx-1.5 transition-all"
                      style={{ opacity: dimmed ? 0.4 : 1, background: active ? `${RESOURCE_COLOR[res]}1f` : "transparent", color: active ? RESOURCE_COLOR[res] : "var(--dm-txt-muted)", fontWeight: active ? 700 : 400 }}
                    >
                      <i style={{ width: 10, height: 10, display: "inline-block", background: RESOURCE_COLOR[res] }} />
                      {legendText[res]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border p-4 overflow-x-auto" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-xs font-bold" style={{ color: "var(--dm-txt-primary)" }}>Stage model</h3>
                {selectedResource && (
                  <button
                    type="button" onClick={() => setSelectedResource(null)}
                    className="text-[10px] font-semibold rounded px-1.5 py-0.5"
                    style={{ color: RESOURCE_COLOR[selectedResource], border: `1px solid ${RESOURCE_COLOR[selectedResource]}` }}
                  >
                    Filtered: {RESOURCE_LABEL[selectedResource]} — click to clear
                  </button>
                )}
              </div>
              <p className="text-[10.5px] mb-2.5" style={{ color: "var(--dm-txt-faintest)" }}>
                Each row derives from the inputs. <span style={{ color: "#34d399" }}>meas</span> coefficients come from the instrumented run; <span style={{ color: "var(--dm-txt-faintest)" }}>est</span> ones are placeholders that still need a primitive microbenchmark.
              </p>
              <table className="w-full text-[11px] border-collapse table-fixed">
                <colgroup>
                  <col style={{ width: "26%" }} /><col style={{ width: "8%" }} /><col style={{ width: "16%" }} />
                  <col style={{ width: "24%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
                    {["Stage", "Node", "Scales with", "Derivation", "Time", "Core-s"].map((h, i) => (
                      <th key={h} className={`px-2 py-1.5 font-semibold ${i >= 4 ? "text-right" : "text-left"}`} style={{ color: "var(--dm-txt-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let curNode: string | null = null;
                    const rows: React.ReactNode[] = [];
                    visibleStages.forEach((s, i) => {
                      if (s.node !== curNode) {
                        curNode = s.node;
                        rows.push(
                          <tr key={`grp-${i}`} style={{ background: "var(--dm-table-head)" }}>
                            <td colSpan={6} className="px-2 py-1 text-[10px] font-bold tracking-wide" style={{ color: "var(--dm-txt-muted)" }}>{NODE_LABEL[s.node]}</td>
                          </tr>,
                        );
                      }
                      const crit = tot > 0 && s.t / tot > 0.05;
                      const active = highlightedRow === s.key;
                      rows.push(
                        <tr
                          key={i} onClick={() => toggleRow(s.key)}
                          className="cursor-pointer transition-colors duration-150"
                          style={{ borderBottom: "1px solid var(--dm-border-a)", background: active ? "rgba(34,211,238,0.14)" : undefined }}
                        >
                          <td className="px-2 py-1.5 text-[10px] leading-snug" style={{ color: active ? "#22d3ee" : "var(--dm-txt-body)" }}>
                            {s.name}{" "}
                            <span className="text-[8.5px] font-bold px-1 rounded-sm whitespace-nowrap" style={{ color: RESOURCE_COLOR[s.res], border: `1px solid ${RESOURCE_COLOR[s.res]}` }}>{RESOURCE_LABEL[s.res]}</span>
                          </td>
                          <td className="px-2 py-1.5 text-[10px]" style={{ color: "var(--dm-txt-muted)" }}>{s.node}</td>
                          <td className="px-2 py-1.5 text-[10px]" style={{ color: "var(--dm-txt-muted)" }}>{s.unit}</td>
                          <td className="px-2 py-1.5 font-mono text-[9.5px]" style={{ color: "var(--dm-txt-faint)" }}>{s.form}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[10.5px]" style={{ color: active ? "#22d3ee" : crit ? "var(--dm-txt-primary)" : "var(--dm-txt-body)", fontWeight: crit || active ? 700 : 400 }}>{s.t > 0 ? fmtMs(s.t) : "—"}</td>
                          <td className="px-2 py-1.5 text-right font-mono text-[10.5px]" style={{ color: active ? "#22d3ee" : "var(--dm-txt-body)" }}>{s.cs > 0 ? `${(s.cs * 1000).toFixed(2)} ms` : "—"}</td>
                        </tr>,
                      );
                    });
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>Derived values</h3>
              <p className="text-[10.5px] mb-2.5" style={{ color: "var(--dm-txt-faintest)" }}>Computed from the shared Architecture and GPU Compute panels on the right — not entered directly.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[11px]">
                <div className="flex justify-between gap-2"><span style={{ color: "var(--dm-txt-faint)" }}>KV per token</span><span className="font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{fmtBytes(m.kvTok)}/tok</span></div>
                <div className="flex justify-between gap-2"><span style={{ color: "var(--dm-txt-faint)" }}>Weight bytes resident</span><span className="font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{fmtBytes(m.wBytes)}</span></div>
                <div className="flex justify-between gap-2"><span style={{ color: "var(--dm-txt-faint)" }}>Decode roofline</span><span className="font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{m.roofFull.toFixed(2)} ms</span></div>
                <div className="flex justify-between gap-2"><span style={{ color: "var(--dm-txt-faint)" }}>Implied CPU/step (residual)</span><span className="font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{m.cStep.toFixed(2)} ms</span></div>
              </div>
            </div>

            <div className="rounded-xl border p-4 overflow-x-auto" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>Core-seconds and node sizing</h3>
              <p className="text-[10.5px] mb-2.5" style={{ color: "var(--dm-txt-faintest)" }}>Core-seconds per request multiplied by request rate, divided by target utilisation.</p>
              <table className="w-full text-[11.5px] border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
                    {["Node", "Core-s / request", "Core-s / s at rate", "Cores needed", "% of node", "Dominant term"].map((h, i) => (
                      <th key={h} className={`px-2 py-1.5 font-semibold ${i > 0 && i < 5 ? "text-right" : "text-left"}`} style={{ color: "var(--dm-txt-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["FE", "P", "D"] as const).map(k => {
                    const cs = perNode[k];
                    const rate = cs * inputs.qps;
                    const need = inputs.util > 0 ? rate / inputs.util : 0;
                    const pct = inputs.cores > 0 ? (need / inputs.cores) * 100 : 0;
                    return (
                      <tr key={k} style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
                        <td className="px-2 py-1.5" style={{ color: "var(--dm-txt-body)" }}>{NODE_LABEL[k]}</td>
                        <td className="px-2 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{(cs * 1000).toFixed(2)} ms</td>
                        <td className="px-2 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{rate.toFixed(3)}</td>
                        <td className="px-2 py-1.5 text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{need.toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold" style={{ color: pct > 70 ? R_XFER : "var(--dm-txt-primary)" }}>{pct.toFixed(1)}%</td>
                        <td className="px-2 py-1.5" style={{ color: "var(--dm-txt-faint)" }}>{dominant[k]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border p-4 overflow-x-auto" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
              <h3 className="text-xs font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>Capacity gates the orchestration imposes</h3>
              <p className="text-[10.5px] mb-2.5" style={{ color: "var(--dm-txt-faintest)" }}>These are consequences of the CPU-orchestrated flow, not CPU costs themselves.</p>
              <table className="w-full text-[11.5px] border-collapse">
                <tbody>
                  {[
                    { n: "Prefill KV pinned", w: "blocks are held from end of prefill until the transfer completes", v: fmtBytes(pin) },
                    { n: "Fabric load", w: "every cold request moves its whole KV across the host path", v: `${(fab / 1e6).toFixed(1)} MB/s` },
                    { n: "Decode KV resident", w: "full context plus generation, per concurrent sequence", v: fmtBytes(dkv) },
                    { n: "Transfer share of request", w: "the fraction of wall-clock spent moving KV rather than computing", v: `${(m.tXfer / tot * 100).toFixed(1)}%` },
                    { n: "Stall between token 1 and 2", w: "TTFT reports the prefill worker's token, not a usable stream", v: fmtMs(m.t2nd - m.ttft) },
                  ].map(g => (
                    <tr key={g.n} style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
                      <td className="px-2 py-1.5" style={{ color: "var(--dm-txt-body)" }}>{g.n}</td>
                      <td className="px-2 py-1.5" style={{ color: "var(--dm-txt-faint)" }}>{g.w}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{g.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
              <b style={{ color: "var(--dm-txt-faint)" }}>Model form.</b> Every stage is cost = rate × coefficient, where the rate comes from architecture and use case and the
              coefficient is either a silicon roofline or a stack primitive. Prefill GPU is 2·N<sub>active</sub>·T<sub>eff</sub> + 2·L<sub>kv</sub>·T<sub>eff</sub>·ISL·d<sub>model</sub> over
              effective TFLOPS. Decode GPU is the memory roofline from datasheet bandwidth; the gap between that roofline and the measured step time is the implied per-step CPU
              overhead, which is a residual against a datasheet number rather than a fitted parameter, and it is reused for prefill steps. KV bytes derive from KV-contributing
              layers only, so hybrid architectures get their reduction automatically. The decode worker&rsquo;s spin during transfer is charged as full core occupancy because the
              engine loop is measured to run with an empty batch throughout. <b style={{ color: "var(--dm-txt-faint)" }}>Not yet modelled:</b> eviction and KVBM tier movement,
              which needs a run that actually pressures the cache; KV-event indexing, which is switched off; and multi-tenant contention between UCX progress threads and the
              engine loop under CPU affinity pinning.
            </p>
        </div>
      </div>
    </div>
  );
}
