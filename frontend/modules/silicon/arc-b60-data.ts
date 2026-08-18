import type { AcceleratorDetail } from "./accelerator-data";

export const ARC_PRO_B60: AcceleratorDetail = {
  id: "arc-b60",
  name: "Intel® Arc™ Pro B60",
  codeName: "Xe2 \"Battlemage\" (BMG-G21)",
  tagline: "Cost-effective AI inference with 24 GB VRAM",
  accent: "#a78bfa",
  accentRgb: "167,139,250",
  statusBadge: "Production · Shipping",

  overview: [
    "The Arc Pro B60 is the full-die Battlemage professional part: 20 Xe2-HPG cores, 160 XMX matrix engines, 24 GB GDDR6 on a 192-bit bus, and PCIe 5.0 x8 electrical host link. Intel positions it explicitly as an inference product — the data sheet headline is memory capacity and multi-GPU Linux serving, not FP32 throughput.",
    "Four properties determine where it fits in an agentic or GenAI serving estate: Capacity per dollar, not FLOPS per dollar (24 GB at $599–$800 street price); arithmetic intensity is high relative to bandwidth (215.6 FLOP/byte FP16 — decode is memory-bound); there is no scale-up fabric (every inter-GPU byte crosses PCIe 5.0 x8); and the software stack (Intel's llm-scaler containers) is the gating item, not the silicon.",
    "Natural deployments: single-card 8B–14B serving at FP16 or INT4; two-to-four-card 32B–70B serving at INT4/FP8; and eight-card Project Battlematrix workstations reaching 192 GB aggregate for high-concurrency batch inference where total throughput matters more than per-request latency.",
  ],

  hwSpecs: [
    { label: "Architecture", value: "Xe2-HPG \"Battlemage\"" },
    { label: "GPU die", value: "BMG-G21 (full die, all 20 Xe-cores)" },
    { label: "Process node", value: "TSMC N5 (5 nm EUV)" },
    { label: "Transistor count", value: "19.6 billion" },
    { label: "Die area", value: "272 mm²" },
    { label: "Xe-cores", value: "20 × Xe2-HPG" },
    { label: "XMX AI engines", value: "160 (8 per Xe core)" },
    { label: "Ray tracing units", value: "20" },
    { label: "Vector engines (XVE)", value: "160 (8 per core)" },
    { label: "L1 / SLM per core", value: "256 KB" },
    { label: "Shared L2 cache", value: "up to 18 MB" },
    { label: "GPU clock", value: "2,400 MHz (derived)" },
    { label: "Total board power (TBP)", value: "120–200 W" },
    { label: "Host interface", value: "PCIe Gen 5.0 x16 connector, x8 electrical" },
    { label: "PCIe bandwidth", value: "31.5 GB/s per direction, 63 GB/s aggregate" },
  ],

  memorySpecs: [
    { label: "Dedicated memory", value: "24 GB GDDR6" },
    { label: "Memory interface", value: "192-bit" },
    { label: "Peak bandwidth", value: "456 GB/s" },
    { label: "Data rate", value: "19 Gbps per pin" },
    { label: "Memory type", value: "GDDR6 (not GDDR6X, not HBM)" },
    { label: "ECC support", value: "Listed as Battlematrix platform feature (unverified)" },
    { label: "Usable capacity budget", value: "~22 GB (after driver/runtime overhead)" },
    { label: "Ratio to PCIe bandwidth", value: "14.5:1 (local GDDR6 / PCIe 5.0 x8)" },
  ],

  tflops: [
    { dataType: "INT8 (dense, XMX)", value: "197 TOPS", note: "[Intel published]" },
    { dataType: "FP16 (XMX)", value: "98.3 TFLOPS", note: "[Derived: 20 × 2,048 × 2.4 GHz]" },
    { dataType: "BF16 (XMX)", value: "~98.3 TFLOPS", note: "[Derived, assumed equal to FP16]" },
    { dataType: "FP32 (XVE)", value: "12.28 TFLOPS", note: "[Intel published]" },
    { dataType: "INT4 (XMX)", value: "Supported", note: "rate not published" },
    { dataType: "INT2 (XMX)", value: "Supported", note: "rate not published" },
    { dataType: "FP8", value: "No native XMX datatype", note: "weight-storage format only" },
  ],

  tflopsCaveat: "FP8 and MXFP4 on this part are weight-storage formats, not compute formats. They halve or quarter weight footprint and therefore the bytes moved per decode step — which is the binding constraint — but the GEMM still executes at FP16 XMX rates after upconversion. Expect the memory-capacity and memory-bandwidth benefit, do not model a compute speedup.",

  swStack: [
    { layer: "Kernel", component: "Intel xe DRM driver (upstream Linux)", role: "SR-IOV for Battlemage upstreamed in Linux 6.17" },
    { layer: "Firmware", component: "GPU firmware via igsc; OPROM", role: "SR-IOV exposure is firmware-gated" },
    { layer: "User-mode runtime", component: "Intel Compute Runtime (NEO), Level Zero", role: "" },
    { layer: "Programming model", component: "oneAPI / SYCL (DPC++), OpenCL 3.0", role: "OpenCL and oneAPI listed on data sheet" },
    { layer: "Libraries", component: "oneDNN, oneCCL, oneMKL", role: "oneCCL provides P2P/USM collectives" },
    { layer: "Framework", component: "PyTorch XPU backend", role: "PyTorch 2.9 → 2.10 across 2026 container releases" },
    { layer: "Inference toolkit", component: "OpenVINO", role: "Listed on the data sheet" },
    { layer: "Serving", component: "intel/llm-scaler-vllm (vLLM fork)", role: "The supported LLM serving path" },
    { layer: "Quantization", component: "INT4, FP8 online; MXFP4 for gpt-oss", role: "" },
    { layer: "Parallelism", component: "Tensor, pipeline, and data parallelism", role: "" },
    { layer: "FP8 KV cache", component: "Enabled (June 2026 release)", role: "" },
    { layer: "Graphics APIs", component: "DirectX 12 Ultimate, Vulkan 1.3, OpenGL 4.6", role: "" },
  ],

  caveats: [
    "Sizing from the 197 TOPS headline: It is a dense-INT8 peak; decode is bandwidth-bound at <1% XMX utilization. Size on KV capacity and 456 GB/s bandwidth.",
    "Modeling FP8/MXFP4 as a compute speedup: FP8 is not a native XMX datatype. Model it as a footprint and bandwidth reduction only.",
    "Tensor-parallel across cards when model fits on one: All-reduce on a 14.5:1 slower link, every layer. Replicate per card, load-balance in front.",
    "32 B INT4 on a single card in production: 18 GB weights leaves ~4 GB KV — no concurrency headroom. Use two cards, or 14 B on one.",
    "FP16 KV cache on a 24 GB part: Halves the concurrency ceiling for no accuracy benefit at serving scale. Enable FP8 KV (June 2026 container or later).",
    "Passive cards in an unvalidated chassis: 200 W with no onboard fan is an airflow dependency. Validate chassis thermals against the partner spec.",
    "Assuming SR-IOV works out of the box: Firmware-gated; needs kernel ≥ 6.17 and Feb-2026-or-later firmware. Check igsc firmware level, then lspci.",
  ],

  sourceNote: "Compiled from Intel Arc Pro B60 GPU Data Sheet v1.0, Intel Xe2 architecture disclosures, board partner specifications (ASRock, Sparkle, MAXSUN), and the intel/llm-scaler GitHub repository. Figures tagged [Derived] are computed from [Intel published] inputs with the formula shown inline. Board-partner specifications vary — confirm against the specific SKU before procurement.",
};
