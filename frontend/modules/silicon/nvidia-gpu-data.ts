import type { AcceleratorDetail } from "./accelerator-data";

// Compiled from NVIDIA's public datasheets and product pages (nvidia.com), Aug/Sep 2026.
// These are NVIDIA parts, not Intel — kept in a separate file/accent (NVIDIA green) so the
// Silicon page's GPU catalog clearly distinguishes vendor. Figures marked "with sparsity" are
// NVIDIA's headline marketing numbers (2:4 structured sparsity); the paired dense figure is
// what a model without sparsity-aware weights will actually see. Re-verify against nvidia.com
// before using any of these in a bid or business case.

const NVIDIA_ACCENT = "#76b900";
const NVIDIA_ACCENT_RGB = "118,185,0";

export const NVIDIA_H100: AcceleratorDetail = {
  id: "nvidia-h100",
  name: "NVIDIA H100 SXM5",
  codeName: "Hopper (GH100), TSMC 4N",
  tagline: "The incumbent datacenter GPU — Hopper Tensor Cores, HBM3, NVLink 4",
  accent: NVIDIA_ACCENT,
  accentRgb: NVIDIA_ACCENT_RGB,
  statusBadge: "Shipping — widely deployed since 2023",
  overview: [
    "NVIDIA's Hopper-generation flagship, and still the most widely deployed high-end training/inference GPU as of 2026. The SXM5 form factor (as opposed to the lower-power PCIe card) is the variant used in HGX/DGX 8-GPU servers and is what this app's Qwen sizing model defaults to (989 TFLOPS dense BF16, 3.35 TB/s HBM3 — both reproduced exactly below).",
    "A PCIe H100 SKU also exists (350 W, 80 GB HBM2e, ~2 TB/s, no NVLink) with meaningfully lower throughput than SXM5 — see this app's Comparisons tab, which already carries that variant separately. Don't conflate the two when sizing.",
  ],
  hwSpecs: [
    { label: "Architecture", value: "Hopper (GH100), TSMC 4N" },
    { label: "Form factor", value: "SXM5 module (HGX/DGX 8-GPU baseboard)" },
    { label: "Host interface", value: "SXM5 socket (not a PCIe card)" },
    { label: "NVLink", value: "4th generation, 900 GB/s per GPU" },
    { label: "Board power (TDP)", value: "Up to 700 W (configurable)" },
    { label: "Cooling", value: "Air or liquid, depending on HGX chassis" },
  ],
  memorySpecs: [
    { label: "Memory type", value: "HBM3" },
    { label: "Capacity", value: "80 GB" },
    { label: "Memory bandwidth", value: "3.35 TB/s (3,350 GB/s)" },
  ],
  tflops: [
    { dataType: "FP64 (CUDA)", value: "34 TFLOPS" },
    { dataType: "FP64 Tensor Core", value: "67 TFLOPS" },
    { dataType: "FP32 (CUDA)", value: "67 TFLOPS" },
    { dataType: "TF32 Tensor Core", value: "989 TFLOPS", note: "with sparsity — 495 TFLOPS dense" },
    { dataType: "BF16 / FP16 Tensor Core", value: "1,979 TFLOPS", note: "with sparsity — 990 TFLOPS dense (this app's sizing-model default)" },
    { dataType: "FP8 Tensor Core", value: "3,958 TFLOPS", note: "with sparsity — 1,979 TFLOPS dense" },
    { dataType: "INT8 Tensor Core", value: "3,958 TOPS", note: "with sparsity — 1,979 TOPS dense" },
  ],
  swStack: [
    { layer: "Driver / runtime", component: "NVIDIA driver + CUDA runtime", role: "Device management, memory, scheduling — the industry baseline" },
    { layer: "Programming model", component: "CUDA / CUDA-X", role: "The dominant GPU programming model; every major framework targets it first" },
    { layer: "Kernel libraries", component: "cuDNN, cuBLAS, CUTLASS", role: "GEMM, conv, attention primitives — heavily tuned per-architecture" },
    { layer: "Collectives", component: "NCCL", role: "Multi-GPU/multi-node all-reduce, all-gather — NVLink + InfiniBand aware" },
    { layer: "Compiler / DSL", component: "Triton, TensorRT-LLM", role: "Custom kernel authoring; TensorRT-LLM for optimized LLM serving" },
    { layer: "Framework", component: "PyTorch (native CUDA backend)", role: "First-class support, no fork or extension needed" },
    { layer: "LLM serving", component: "vLLM, TensorRT-LLM, Triton Inference Server", role: "Paged attention, continuous batching, tensor/pipeline parallel — most mature ecosystem of any accelerator" },
    { layer: "Orchestration", component: "Kubernetes + NVIDIA GPU Operator", role: "Scheduling, MIG partitioning, device plugin, DCGM telemetry" },
    { layer: "Agentic", component: "NIM microservices, LangChain, Hugging Face", role: "Unmodified-code agentic orchestration — same ecosystem as everyone builds against first" },
  ],
  caveats: [
    "SXM5 vs PCIe matters: this card is the SXM5 (HGX/DGX) variant. The PCIe H100 SKU already tracked in this app's Comparisons tab is a different, lower-throughput part (350 W, no NVLink) — don't mix the two when sizing a bid.",
    "\"With sparsity\" figures require the model's weights to actually be pruned to NVIDIA's 2:4 structured-sparsity pattern; an unmodified dense checkpoint gets the dense figure, not the marketing headline.",
    "Being superseded by Blackwell (B200/GB200/GB300) for new large-scale builds, but H100 fleets remain the largest installed base — relevant for capacity planning against existing customer infrastructure.",
  ],
  sourceNote: "Compiled from NVIDIA's public H100 datasheet and widely-published SXM5 specifications (Sep 2026). High-confidence, well-established figures — still verify against nvidia.com before quoting in a bid.",
};

export const NVIDIA_RTX_PRO_6000: AcceleratorDetail = {
  id: "nvidia-rtx-pro-6000",
  name: "NVIDIA RTX PRO 6000 Blackwell",
  codeName: "Blackwell (GB202), TSMC 4N — Workstation Edition",
  tagline: "96 GB GDDR7 workstation/inference card — Intel's closest direct comparison point",
  accent: NVIDIA_ACCENT,
  accentRgb: NVIDIA_ACCENT_RGB,
  statusBadge: "Shipping — launched 2025",
  overview: [
    "NVIDIA's Blackwell-generation professional/workstation card — the natural competitive benchmark for Intel's Arc Pro B60/B70 (this app already cross-references it there: B70 is quoted at ~85% of this card's batch-32 throughput on Llama 3.1 8B). Unlike the data-centre Blackwell parts (B200/GB200/GB300), this is a PCIe add-in card usable in a standard workstation or server chassis, with no NVLink.",
    "5th-generation Tensor Cores add native FP4 support at the workstation tier — 24,064 CUDA cores, 752 Tensor Cores, 188 RT Cores, 96 GB of GDDR7 on a 512-bit bus.",
  ],
  hwSpecs: [
    { label: "Architecture", value: "Blackwell (GB202), TSMC 4N" },
    { label: "CUDA cores", value: "24,064" },
    { label: "Tensor Cores (5th gen)", value: "752" },
    { label: "RT Cores (4th gen)", value: "188" },
    { label: "Form factor", value: "Dual-slot PCIe (Workstation Edition); single-slot Server Edition also available" },
    { label: "Host interface", value: "PCIe Gen5 x16" },
    { label: "Power connector", value: "1× 16-pin (12V-2×6)" },
    { label: "Board power (TDP)", value: "600 W" },
  ],
  memorySpecs: [
    { label: "Memory type", value: "GDDR7, ECC" },
    { label: "Capacity", value: "96 GB" },
    { label: "Bus width", value: "512-bit" },
    { label: "Memory bandwidth", value: "1.79 TB/s (1,792 GB/s)" },
  ],
  tflops: [
    { dataType: "FP64", value: "1.97 TFLOPS" },
    { dataType: "FP32", value: "126 TFLOPS" },
    { dataType: "FP16 / BF16 Tensor Core", value: "503.8 TFLOPS", note: "with sparsity — 251.9 TFLOPS dense" },
    { dataType: "FP8 Tensor Core", value: "1,007.6 TFLOPS", note: "with sparsity — 503.8 TFLOPS dense" },
    { dataType: "FP4 Tensor Core", value: "~4,000 TOPS", note: "with sparsity, NVIDIA's rounded headline figure — dense ≈2,000 TOPS" },
  ],
  swStack: [
    { layer: "Driver / runtime", component: "NVIDIA driver + CUDA runtime", role: "Same CUDA stack as the datacenter parts" },
    { layer: "Kernel libraries", component: "cuDNN, cuBLAS, CUTLASS", role: "GEMM, conv, attention primitives" },
    { layer: "Compiler / DSL", component: "Triton, TensorRT-LLM", role: "Custom kernels; optimized LLM serving path" },
    { layer: "Framework", component: "PyTorch (native CUDA backend)", role: "First-class support" },
    { layer: "LLM serving", component: "vLLM, TensorRT-LLM", role: "Paged attention, continuous batching — same ecosystem as H100/B200" },
    { layer: "Workstation", component: "NVIDIA RTX / Studio drivers", role: "Also a full graphics/creative-workflow GPU, unlike the datacenter-only Blackwell parts" },
  ],
  caveats: [
    "No NVLink — PCIe Gen5 x16 is the only interconnect, same constraint this app already flags for Intel's B60/B70 when comparing multi-card scaling.",
    "FP4 Tensor Core figure is NVIDIA's rounded \"~4,000 TOPS\" marketing headline; the precise dense/sparse split is derived from the FP8 figure's doubling pattern, not an NVIDIA-published exact number — treat as directionally correct.",
    "A Server Edition (single-slot, blower cooler, same silicon) exists for higher-density GPU nodes — same specs above apply.",
  ],
  sourceNote: "Compiled from NVIDIA's public RTX PRO 6000 Blackwell Workstation Edition datasheet and product pages (Sep 2026). Re-verify against nvidia.com before using in a bid or business case.",
};

export const NVIDIA_GB200_NVL72: AcceleratorDetail = {
  id: "nvidia-gb200-nvl72",
  name: "NVIDIA GB200 NVL72",
  codeName: "Grace Blackwell Superchip — Blackwell (B200) + Grace CPU",
  tagline: "Rack-scale superchip: 2 Blackwell GPUs + 1 Grace CPU, NVLink-fused into a 72-GPU rack",
  accent: NVIDIA_ACCENT,
  accentRgb: NVIDIA_ACCENT_RGB,
  statusBadge: "Shipping — general availability since 2025",
  overview: [
    "Unlike every other card on this page, the GB200 is not a single discrete GPU — it's a Superchip: one Grace CPU (72 Arm Neoverse V2 cores) coherently fused via NVLink-C2C to two Blackwell B200 GPUs on one module. 18 of these Superchips (36 Grace CPUs + 72 B200 GPUs) are NVLink-switched together into one GB200 NVL72 rack, which NVIDIA sells and benchmarks as a single unit — the specs below give both the per-GPU/per-Superchip figures and the full-rack aggregate.",
    "This is the current-generation Blackwell platform aimed at the largest training and inference workloads; GB300 NVL72 (also on this page) is the follow-on Blackwell Ultra refresh with more HBM3e capacity and higher FP4 throughput on the same rack architecture.",
  ],
  hwSpecs: [
    { label: "Configuration", value: "36 Grace CPUs + 72 Blackwell B200 GPUs per NVL72 rack" },
    { label: "Grace CPU", value: "72 Arm Neoverse V2 cores per CPU (2,592 cores/rack)" },
    { label: "GPU-CPU link", value: "NVLink-C2C — coherent, chip-to-chip" },
    { label: "NVLink (GPU domain)", value: "5th gen, 1.8 TB/s per GPU · 3.6 TB/s per Superchip · 130 TB/s aggregate per rack" },
    { label: "Cooling", value: "Fully liquid-cooled" },
    { label: "Rack power", value: "~120 kW (approximate — verify against NVIDIA's current datasheet)" },
    { label: "Networking", value: "ConnectX-7 / BlueField-3, ~400 Gb/s per GPU (typical config)" },
  ],
  memorySpecs: [
    { label: "GPU memory type", value: "HBM3e" },
    { label: "GPU memory — per GPU", value: "186 GB @ 8 TB/s" },
    { label: "GPU memory — per Superchip (2 GPUs)", value: "372 GB @ 16 TB/s combined" },
    { label: "GPU memory — full rack (72 GPUs)", value: "13.4 TB @ up to 576 TB/s aggregate" },
    { label: "CPU memory (Grace, LPDDR5X)", value: "Up to 480 GB per Superchip · 17 TB @ 14 TB/s across the rack" },
  ],
  tflops: [
    { dataType: "FP64 / FP64 Tensor Core — per GPU", value: "40 TFLOPS", note: "80 TFLOPS per Superchip (2 GPUs) · 2,880 TFLOPS per rack" },
    { dataType: "FP16 / BF16 Tensor Core — per GPU", value: "5 PFLOPS", note: "with sparsity — 360 PFLOPS aggregate per rack" },
    { dataType: "FP8 / FP6 Tensor Core — per GPU", value: "10 PFLOPS", note: "with sparsity — 720 PFLOPS aggregate per rack" },
    { dataType: "FP4 (NVFP4) Tensor Core — per GPU", value: "20 PFLOPS", note: "with sparsity — 1,440 PFLOPS aggregate per rack (NVIDIA's headline NVL72 figure)" },
  ],
  swStack: [
    { layer: "Driver / runtime", component: "NVIDIA driver + CUDA runtime", role: "Same CUDA stack as H100/RTX PRO 6000 — no new programming model" },
    { layer: "CPU", component: "Grace (Arm Neoverse V2)", role: "Coherent host CPU — not x86; check OS/toolchain Arm support for your stack" },
    { layer: "Kernel libraries", component: "cuDNN, cuBLAS, CUTLASS", role: "GEMM, conv, attention primitives, Blackwell-tuned" },
    { layer: "Collectives", component: "NCCL", role: "NVLink-switch aware — the whole NVL72 domain acts as one large all-to-all fabric" },
    { layer: "LLM serving", component: "TensorRT-LLM, vLLM, Dynamo", role: "Disaggregated prefill/decode across the rack; NVIDIA Dynamo targets this platform specifically" },
    { layer: "Orchestration", component: "NVIDIA Mission Control, Kubernetes + GPU Operator", role: "Rack-scale job scheduling and health management" },
  ],
  caveats: [
    "Sold and racked as a unit — per-GPU/per-Superchip figures above are derived (rack ÷ 72 or ÷ 36) for sizing comparability against single-GPU parts; NVIDIA's own marketing leads with the full-rack numbers.",
    "Grace is Arm (Neoverse V2), not x86 — confirm OS, driver, and any CPU-side software dependencies support Arm before counting on this platform for a bid.",
    "Rack power and per-GPU networking bandwidth are commonly-cited approximate figures, not confirmed against a specific NVIDIA datasheet revision — re-verify before a bid.",
    "GB300 NVL72 (Blackwell Ultra) is the direct successor on the same rack architecture — see that entry for the generational delta.",
  ],
  sourceNote: "Compiled from NVIDIA's public GB200 NVL72 product page and datasheet (Sep 2026). Per-GPU/per-Superchip figures are derived from NVIDIA's published rack totals. Re-verify against nvidia.com before using in a bid or business case.",
};

export const NVIDIA_GB300_NVL72: AcceleratorDetail = {
  id: "nvidia-gb300-nvl72",
  name: "NVIDIA GB300 NVL72",
  codeName: "Grace Blackwell Ultra Superchip — Blackwell Ultra (B300) + Grace CPU",
  tagline: "Blackwell Ultra refresh of GB200 NVL72 — 50% more HBM3e per GPU, faster networking",
  accent: NVIDIA_ACCENT,
  accentRgb: NVIDIA_ACCENT_RGB,
  statusBadge: "Shipping — rolling out through 2026",
  overview: [
    "The Blackwell Ultra refresh of GB200 NVL72, on the same rack architecture: 36 Grace CPUs + 72 Blackwell Ultra (B300) GPUs, NVLink-switched into one NVL72 domain. The generational upgrade is capacity- and inference-focused — 288 GB HBM3e per GPU (up from 186 GB on GB200, a ~55% increase) at the same 8 TB/s per-GPU bandwidth, plus faster per-GPU networking via ConnectX-8 SuperNICs.",
    "Third-party reporting on GB300's headline FP4 PFLOPS figure is inconsistent — some sources quote the same 1,440 PFLOPS/rack \"with sparsity\" headline as GB200, others cite 1,440 sparse / 1,080 dense (vs. GB200's 1,440 sparse / 720 dense), which is where the commonly-cited \"1.5× more FP4 compute\" generational claim comes from. Both figures are given below — confirm which convention your source is using before comparing across generations.",
  ],
  hwSpecs: [
    { label: "Configuration", value: "36 Grace CPUs + 72 Blackwell Ultra (B300) GPUs per NVL72 rack" },
    { label: "Grace CPU", value: "72 Arm Neoverse V2 cores per CPU @ 3.1 GHz base (2,592 cores/rack)" },
    { label: "GPU-CPU link", value: "NVLink-C2C — coherent, chip-to-chip" },
    { label: "NVLink (GPU domain)", value: "5th gen, 1.8 TB/s per GPU · 130 TB/s aggregate per rack" },
    { label: "Cooling", value: "Fully liquid-cooled" },
    { label: "Rack power", value: "~120 kW" },
    { label: "Networking", value: "ConnectX-8 SuperNIC, ~800 Gb/s per GPU — 2× GB200's ConnectX-7 per-GPU bandwidth" },
  ],
  memorySpecs: [
    { label: "GPU memory type", value: "HBM3e" },
    { label: "GPU memory — per GPU", value: "288 GB @ 8 TB/s (vs. 186 GB on GB200 — same bandwidth, more capacity)" },
    { label: "GPU memory — full rack (72 GPUs)", value: "20.7 TB @ up to 576 TB/s aggregate" },
    { label: "CPU memory (Grace, LPDDR5X)", value: "17 TB @ 14 TB/s across the rack (unchanged from GB200 — same Grace CPU)" },
  ],
  tflops: [
    { dataType: "FP16 / BF16 Tensor Core — per GPU", value: "5 PFLOPS", note: "with sparsity — 360 PFLOPS aggregate per rack (same as GB200)" },
    { dataType: "FP8 / FP6 Tensor Core — per GPU", value: "10 PFLOPS", note: "with sparsity — 720 PFLOPS aggregate per rack (same as GB200)" },
    { dataType: "FP4 (NVFP4) Tensor Core — per GPU", value: "20 PFLOPS", note: "with sparsity (1,440 PFLOPS/rack) — 15 PFLOPS dense per GPU (1,080 PFLOPS/rack); the dense figure is 1.5× GB200's 720 PFLOPS/rack dense" },
  ],
  swStack: [
    { layer: "Driver / runtime", component: "NVIDIA driver + CUDA runtime", role: "Same CUDA stack as GB200/H100/RTX PRO 6000" },
    { layer: "CPU", component: "Grace (Arm Neoverse V2)", role: "Coherent host CPU — not x86, unchanged from GB200" },
    { layer: "Kernel libraries", component: "cuDNN, cuBLAS, CUTLASS", role: "GEMM, conv, attention primitives, Blackwell Ultra-tuned" },
    { layer: "Collectives", component: "NCCL", role: "NVLink-switch aware across the NVL72 domain" },
    { layer: "LLM serving", component: "TensorRT-LLM, vLLM, Dynamo", role: "Disaggregated prefill/decode — larger per-GPU KV-cache headroom than GB200 from the extra HBM3e" },
    { layer: "Orchestration", component: "NVIDIA Mission Control, Kubernetes + GPU Operator", role: "Rack-scale job scheduling and health management" },
  ],
  caveats: [
    "FP4 PFLOPS headline figures conflict across third-party sources for this generation specifically — see the overview note. Confirm the source convention (dense vs. sparse) before quoting a comparison against GB200 in a bid.",
    "Sold and racked as a unit — per-GPU figures above are derived from NVIDIA's published rack totals, same caveat as GB200.",
    "Grace is Arm (Neoverse V2), not x86 — same OS/toolchain consideration as GB200.",
    "FP64 throughput is not confidently sourced for this generation — Blackwell Ultra's stated focus is FP4/inference capacity, not FP64/HPC uplift, so treat it as roughly GB200-class until confirmed rather than assuming an improvement.",
  ],
  sourceNote: "Compiled from NVIDIA's public GB300 NVL72 product materials and third-party technical reporting (Sep 2026) — the FP4 dense/sparse split and rack power are less consistently reported for this generation than GB200's. Re-verify against nvidia.com before using in a bid or business case.",
};
