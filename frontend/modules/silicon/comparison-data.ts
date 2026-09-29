// Cross-silicon spec comparison — Xeon 6 SKUs, GPUs, and accelerators side by side.
//
// TFLOPS/TOPS cells are included ONLY for data types a part actually publishes/supports —
// nothing here is extrapolated from a different data type or scaled from another SKU.
// Where a vendor has not disclosed a figure, the cell is left blank rather than filled with
// a derived estimate.
//
// Sources:
//  - Xeon 6737P/6767P/6972P: this app's own Xeon 6 SKU workbook (xeon6-workload-data.ts) —
//    peak theoretical figures Intel publishes the constants for; not measured.
//  - Arc Pro B60 / B70 / Crescent Island: this app's own accelerator/chip data
//    (arc-b60-data.ts, crescent-island-data.ts, and the B70 entry in SiliconView.tsx).
//  - SambaNova SN40L: this app's own sambanova-data.ts.
//  - NVIDIA L4, RTX PRO 4500, RTX PRO 6000, H100 (PCIe), H200 NVL, GB200 NVL72, GB300 NVL72
//    (kept in exactly this order): this app's own nvidia-gpu-data.ts, compiled from NVIDIA's
//    public datasheets/product pages. H100 figures are high-confidence (well-established,
//    widely published). RTX PRO 6000/4500 and H200 NVL figures are compiled from public
//    product-page specs; RTX PRO 6000 here is the Server Edition specifically. GB200/GB300
//    per-GPU figures are derived from NVIDIA's published rack (NVL72) totals — GB300's FP4
//    dense/sparse split specifically has inconsistent third-party reporting, flagged in that
//    row's source note. This is a curated subset — nvidia-gpu-data.ts also has detail pages
//    for the H100 SXM5 and RTX PRO 6000 Workstation Edition variants, which don't appear in
//    this comparison table. Re-check all of these against nvidia.com before use in a bid or
//    business case.
//  - Virtualization & licensing (the `virtualization` field, NVIDIA GPUs only): MIG/vGPU
//    slicing floors and per-GPU NVIDIA AI Enterprise licensing, from NVIDIA AI Enterprise 8.2's
//    vGPU references (per-architecture) and this app's own nvidia-gpu-data.ts detail pages,
//    which carry the full per-GPU breakdown and citations. Deliberately GPU-only — how an
//    orchestrator combines multiple GPUs/nodes is a separate concern, not covered here.

export type DataType = "FP64" | "FP32" | "TF32" | "FP16" | "BF16" | "FP8" | "INT8" | "FP4/INT4";

export const DTYPE_ORDER: DataType[] = ["FP64", "FP32", "TF32", "FP16", "BF16", "FP8", "INT8", "FP4/INT4"];

export interface FlopsCell {
  value: string;
  note?: string;
}

export interface SpecRow { label: string; value: string }

export interface ComparisonChip {
  id: string;
  name: string;
  category: "CPU" | "GPU" | "Accelerator";
  accent: string;
  flops: Partial<Record<DataType, FlopsCell>>;
  memory: { type: string; bandwidth: string; capacity: string };
  pcie: { lanes: string; gen: string; note?: string } | null; // null = not applicable (CPU host, or no PCIe fabric)
  /** GPU-to-GPU scale-up fabric (NVLink, etc). null = no such fabric — PCIe (or nothing) only. */
  interconnect: { type: string; bandwidth?: string; note?: string } | null;
  /** Best-fit Xeon 6 host CPU pairing. Omitted (not null) where this app has no sourced
   *  host-pairing data for the part — left blank rather than guessed. */
  hostRecommendation?: { cpu: string; note?: string };
  /** What the GPU itself brings to virtualization/multi-tenancy — MIG/vGPU slicing floors and
   *  ceilings, which sharing technologies it supports, and per-GPU licensing. NVIDIA-only for
   *  now (mirrors each part's own detail page in nvidia-gpu-data.ts) — how an orchestrator
   *  combines multiple GPUs/nodes is a separate concern, not covered here. */
  virtualization?: SpecRow[];
  sourceNote: string;
}

export const COMPARISON_CHIPS: ComparisonChip[] = [
  // ── Xeon 6 CPUs ──────────────────────────────────────────────────────────────
  {
    id: "xeon-6737p",
    name: "Xeon® 6737P",
    category: "CPU",
    accent: "#38bdf8",
    flops: {
      FP64: { value: "2.97 TFLOPS" },
      FP32: { value: "5.94 TFLOPS" },
      BF16: { value: "95.03 TFLOPS", note: "AMX" },
      INT8: { value: "190.05 TOPS", note: "AMX" },
    },
    memory: {
      type: "DDR5-6400 RDIMM / DDR5-8000 MRDIMM, 8 channels",
      bandwidth: "409.6 GB/s (RDIMM) · 512 GB/s (MRDIMM)",
      capacity: "Platform-dependent — up to 8 DIMMs/socket",
    },
    pcie: null,
    interconnect: null,
    sourceNote: "Xeon 6 SKU workbook (this app) — 32c / 270 W TDP / 2.9 GHz base, Xeon 6700-series (8-ch) platform.",
  },
  {
    id: "xeon-6767p",
    name: "Xeon® 6767P",
    category: "CPU",
    accent: "#38bdf8",
    flops: {
      FP64: { value: "5.32 TFLOPS" },
      FP32: { value: "10.65 TFLOPS" },
      BF16: { value: "170.39 TFLOPS", note: "AMX" },
      INT8: { value: "340.79 TOPS", note: "AMX" },
    },
    memory: {
      type: "DDR5-6400 RDIMM / DDR5-8000 MRDIMM, 8 channels",
      bandwidth: "409.6 GB/s (RDIMM) · 512 GB/s (MRDIMM)",
      capacity: "Platform-dependent — up to 8 DIMMs/socket",
    },
    pcie: null,
    interconnect: null,
    sourceNote: "Xeon 6 SKU workbook (this app) — 64c / 350 W TDP / 2.6 GHz base, Xeon 6700-series (8-ch) platform.",
  },
  {
    id: "xeon-6972p",
    name: "Xeon® 6972P",
    category: "CPU",
    accent: "#38bdf8",
    flops: {
      FP64: { value: "7.37 TFLOPS" },
      FP32: { value: "14.75 TFLOPS" },
      BF16: { value: "235.93 TFLOPS", note: "AMX" },
      INT8: { value: "471.86 TOPS", note: "AMX" },
    },
    memory: {
      type: "DDR5-6400 RDIMM / DDR5-8800 MRDIMM, 12 channels",
      bandwidth: "614.4 GB/s (RDIMM) · 844.8 GB/s (MRDIMM)",
      capacity: "Platform-dependent — up to 12 DIMMs/socket",
    },
    pcie: null,
    interconnect: null,
    sourceNote: "Xeon 6 SKU workbook (this app) — 96c / 500 W TDP / 2.4 GHz base, Xeon 6900-series (12-ch) platform.",
  },

  // ── GPUs ─────────────────────────────────────────────────────────────────────
  {
    id: "arc-b60",
    name: "Arc™ Pro B60",
    category: "GPU",
    accent: "#a78bfa",
    flops: {
      FP32: { value: "12.28 TFLOPS", note: "XVE — Intel published" },
      FP16: { value: "98.3 TFLOPS", note: "XMX — derived from published per-core rate" },
      BF16: { value: "~98.3 TFLOPS", note: "XMX — derived, assumed equal to FP16" },
      INT8: { value: "197 TOPS", note: "XMX — Intel published" },
    },
    memory: { type: "GDDR6, 192-bit", bandwidth: "456 GB/s", capacity: "24 GB" },
    pcie: { lanes: "8", gen: "5.0", note: "x16 physical connector, x8 electrical" },
    interconnect: null,
    sourceNote: "Intel Arc Pro B60 GPU Data Sheet v1.0 (this app's arc-b60-data.ts).",
  },
  {
    id: "b70",
    name: "Arc™ Pro B70",
    category: "GPU",
    accent: "#a78bfa",
    flops: {
      FP16: { value: "~183.5 TFLOPS", note: "XMX — derived" },
      BF16: { value: "~183.5 TFLOPS", note: "XMX — derived" },
      INT8: { value: "367 TOPS", note: "XMX — Intel published" },
    },
    memory: { type: "GDDR6, ECC, 256-bit", bandwidth: "608 GB/s", capacity: "32 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    interconnect: null,
    sourceNote: "Intel Arc Pro B70 published specs (this app's SiliconView chip catalog).",
  },
  {
    id: "crescent-island",
    name: "Crescent Island",
    category: "GPU",
    accent: "#f472b6",
    flops: {
      FP64: { value: "10.2 TFLOPS", note: "Intel published" },
      FP32: { value: "20.5 TFLOPS", note: "Intel published" },
      BF16: { value: "655.5 TFLOPS", note: "Intel published" },
      FP8: { value: "1,311 TFLOPS", note: "Intel published" },
      "FP4/INT4": { value: "2,622 TFLOPS", note: "MXFP4 — Intel published" },
    },
    memory: {
      type: "LPDDR5X",
      bandwidth: "1.5 TB/s",
      capacity: "160 GB reference · 480 GB partner ceiling",
    },
    pcie: { lanes: "16", gen: "5.0", note: "assumed — not yet confirmed by Intel" },
    interconnect: null,
    sourceNote: "Intel Crescent Island Xe3P Technical Reference v1.0 — TDP, GPU IP, datatype throughput (FP64/FP32/BF16/FP8/MXFP4), and memory (type, capacity, bandwidth) are Intel-published.",
  },
  {
    id: "l4",
    name: "NVIDIA L4",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP32: { value: "30.3 TFLOPS", note: "dense" },
      TF32: { value: "120 TFLOPS", note: "Tensor Core, with sparsity (60 dense)" },
      FP16: { value: "242 TFLOPS", note: "Tensor Core, with sparsity (121 dense)" },
      BF16: { value: "242 TFLOPS", note: "Tensor Core, with sparsity (121 dense)" },
      FP8: { value: "485 TFLOPS", note: "Tensor Core, with sparsity (242.5 dense)" },
      INT8: { value: "485 TOPS", note: "Tensor Core, with sparsity (242.5 dense)" },
    },
    memory: { type: "GDDR6, 192-bit", bandwidth: "300 GB/s", capacity: "24 GB" },
    pcie: { lanes: "16", gen: "4.0" },
    interconnect: null,
    hostRecommendation: { cpu: "Xeon 6776P (LGA-4710) or Xeon 6962P (LGA-7529, 6900P chassis)", note: "8-GPU node needs ≥384 GB host memory (2× GPU memory)" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Supported" },
      { label: "MIG (hardware partitions)", value: "Not supported" },
      { label: "MIG-backed vGPU", value: "Not applicable (no MIG)" },
      { label: "Time-sliced vGPU (compute)", value: "4 GB min, up to 6/GPU" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Supported" },
      { label: "Smallest isolated unit", value: "4 GB (6/GPU, 48/8-GPU node)" },
      { label: "NVIDIA AI Enterprise", value: "Required for vGPU — licensed separately" },
    ],
    sourceNote: "Compiled from NVIDIA's public L4 Tensor Core GPU product page/datasheet — Ada Lovelace has no FP4; NVIDIA publishes Tensor figures with sparsity, dense is half. Re-verify against nvidia.com before using in a bid.",
  },
  {
    id: "rtx-pro-4500",
    name: "NVIDIA RTX PRO 4500 (Blackwell)",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP32: { value: "51 TFLOPS", note: "dense, non-Tensor" },
      TF32: { value: "203 TFLOPS", note: "Tensor Core, with sparsity (101.5 dense)" },
      FP16: { value: "406 TFLOPS", note: "Tensor Core, with sparsity (203 dense)" },
      BF16: { value: "406 TFLOPS", note: "Tensor Core, with sparsity (203 dense)" },
      FP8: { value: "811 TFLOPS", note: "Tensor Core, with sparsity (405.5 dense)" },
      "FP4/INT4": { value: "1,600 TFLOPS", note: "Tensor Core, with sparsity (800 dense) — published as 1.6 PFLOPS" },
    },
    memory: { type: "GDDR7, 256-bit", bandwidth: "800 GB/s", capacity: "32 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    interconnect: null,
    hostRecommendation: { cpu: "Xeon 6776P (LGA-4710) or Xeon 6962P (LGA-7529, 6900P chassis)", note: "8-GPU node needs ≥512 GB host memory (2× GPU memory)" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Supported" },
      { label: "MIG (hardware partitions)", value: "1g.16gb, up to 2/GPU" },
      { label: "MIG-backed vGPU", value: "8 GB min, up to 4/GPU" },
      { label: "Time-sliced vGPU (compute)", value: "8 GB min, up to 4/GPU" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Supported — profiles to 2 GB, not for compute" },
      { label: "Smallest isolated unit", value: "8 GB (4/GPU, 32/8-GPU node)" },
      { label: "NVIDIA AI Enterprise", value: "Required for vGPU — discounted bundling via Lenovo" },
    ],
    sourceNote: "Compiled from NVIDIA's public RTX PRO 4500 Blackwell Server Edition product page — sparse-vs-dense convention isn't stated inline; treated as sparse per the datasheet footnote. Re-verify against nvidia.com before using in a bid.",
  },
  {
    id: "rtx-pro-6000-server",
    name: "NVIDIA RTX PRO 6000",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP32: { value: "120 TFLOPS" },
      TF32: { value: "234 TFLOPS", note: "published as-is — inconsistent with the 2:1 ladder BF16 implies; convention unclear" },
      FP16: { value: "1,000 TFLOPS", note: "Tensor Core, with sparsity (500 dense)" },
      BF16: { value: "1,000 TFLOPS", note: "Tensor Core, with sparsity (500 dense)" },
      FP8: { value: "2,000 TFLOPS", note: "Tensor Core, with sparsity (1,000 dense)" },
      "FP4/INT4": { value: "4,000 TFLOPS", note: "Tensor Core, with sparsity (2,000 dense)" },
    },
    memory: { type: "GDDR7, ECC, 512-bit", bandwidth: "1.6 TB/s (1,597 GB/s)", capacity: "96 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    interconnect: null,
    hostRecommendation: { cpu: "Xeon 6776P (LGA-4710) or Xeon 6962P (LGA-7529, 6900P chassis)", note: "8-GPU node needs ≥1,536 GB host memory (2× GPU memory)" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Supported" },
      { label: "MIG (hardware partitions)", value: "1g.24gb, up to 4/GPU" },
      { label: "MIG-backed vGPU", value: "8 GB min, up to 12/GPU" },
      { label: "Time-sliced vGPU (compute)", value: "8 GB min, up to 12/GPU" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Supported" },
      { label: "Smallest isolated unit", value: "8 GB (12/GPU, 96/8-GPU node)" },
      { label: "NVIDIA AI Enterprise", value: "Not bundled — licensed separately (discounted via Lenovo)" },
    ],
    sourceNote: "Compiled from NVIDIA's public RTX PRO 6000 Blackwell Server Edition product page — re-verify against nvidia.com before using in a bid or business case.",
  },
  {
    id: "h100",
    name: "NVIDIA H100 (PCIe)",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP64: { value: "51 TFLOPS", note: "Tensor Core (26 TFLOPS on standard FP64 CUDA cores)" },
      FP32: { value: "51 TFLOPS" },
      TF32: { value: "756 TFLOPS", note: "Tensor Core, with sparsity (378 dense)" },
      FP16: { value: "1,513 TFLOPS", note: "Tensor Core, with sparsity (756 dense)" },
      BF16: { value: "1,513 TFLOPS", note: "Tensor Core, with sparsity (756 dense)" },
      FP8: { value: "3,026 TFLOPS", note: "Tensor Core, with sparsity (1,513 dense)" },
      INT8: { value: "3,026 TOPS", note: "Tensor Core, with sparsity (1,513 dense)" },
    },
    memory: { type: "HBM2e", bandwidth: "~2 TB/s (2,039 GB/s)", capacity: "80 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    interconnect: null,
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Supported" },
      { label: "MIG (hardware partitions)", value: "1g.10gb, up to 7/GPU" },
      { label: "MIG-backed vGPU", value: "10 GB min, up to 7/GPU" },
      { label: "Time-sliced vGPU (compute)", value: "4 GB min, up to 20/GPU" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Not supported" },
      { label: "Smallest isolated unit", value: "4 GB (20/GPU, 160/8-GPU node)" },
      { label: "NVIDIA AI Enterprise", value: "Required for vGPU — licensed separately" },
    ],
    sourceNote: "NVIDIA H100 PCIe datasheet (public) — high-confidence, widely published figures.",
  },
  {
    id: "h200-nvl",
    name: "NVIDIA H200 NVL",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP64: { value: "30 TFLOPS", note: "CUDA cores dense — 60 TFLOPS on FP64 Tensor Core" },
      FP32: { value: "60 TFLOPS" },
      TF32: { value: "835 TFLOPS", note: "Tensor Core, with sparsity (417.5 dense) — derived as half of BF16 sparse" },
      FP16: { value: "1,671 TFLOPS", note: "Tensor Core, with sparsity (835.5 dense)" },
      BF16: { value: "1,671 TFLOPS", note: "Tensor Core, with sparsity (835.5 dense)" },
      FP8: { value: "3,341 TFLOPS", note: "Tensor Core, with sparsity (1,670.5 dense) — NVIDIA SC24 datasheet; Lenovo LP1944 lists 1,570 dense, ~6% below half" },
      INT8: { value: "3,341 TOPS", note: "Tensor Core, with sparsity (1,670.5 dense)" },
    },
    memory: { type: "HBM3e", bandwidth: "4.8 TB/s", capacity: "141 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    interconnect: { type: "NVLink bridge (2- or 4-way)", bandwidth: "900 GB/s", note: "8-GPU node = two 4-way NVLink islands; inter-island traffic rides PCIe" },
    hostRecommendation: { cpu: "Xeon 6776P (LGA-4710) or Xeon 6962P (LGA-7529, 6900P chassis)", note: "8-GPU node needs ≥2,256 GB host memory (2× GPU memory)" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Supported" },
      { label: "MIG (hardware partitions)", value: "1g.18gb, up to 7/GPU" },
      { label: "MIG-backed vGPU", value: "18 GB min, up to 7/GPU" },
      { label: "Time-sliced vGPU (compute)", value: "4 GB min, up to 32/GPU" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Not supported" },
      { label: "Smallest isolated unit", value: "4 GB (32/GPU, 256/8-GPU node)" },
      { label: "NVIDIA AI Enterprise", value: "Bundled — 5-yr subscription included with the GPU" },
    ],
    sourceNote: "Compiled from NVIDIA's public H200 NVL datasheet (Aug 2024) and NVIDIA's H200 product page — figures are specifically the NVL column, not H200 SXM (several aggregators mix the two up). Re-verify against nvidia.com before using in a bid.",
  },
  {
    id: "gb200-nvl72",
    name: "NVIDIA GB200 NVL72",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP64: { value: "40 TFLOPS", note: "Tensor Core, per GPU — 2,880 TFLOPS aggregate across the 72-GPU rack" },
      FP16: { value: "5,000 TFLOPS", note: "= 5 PFLOPS, with sparsity, per GPU — 360 PFLOPS aggregate per rack" },
      BF16: { value: "5,000 TFLOPS", note: "= 5 PFLOPS, with sparsity, per GPU — 360 PFLOPS aggregate per rack" },
      FP8: { value: "10,000 TFLOPS", note: "= 10 PFLOPS, with sparsity, per GPU — 720 PFLOPS aggregate per rack" },
      "FP4/INT4": { value: "20,000 TFLOPS", note: "= 20 PFLOPS (NVFP4), with sparsity, per GPU — 1,440 PFLOPS aggregate per rack" },
    },
    memory: { type: "HBM3e", bandwidth: "8 TB/s per GPU (576 TB/s aggregate, 72-GPU rack)", capacity: "186 GB per GPU (13.4 TB aggregate rack)" },
    pcie: null,
    interconnect: { type: "NVLink (5th gen)", bandwidth: "1.8 TB/s per GPU · 130 TB/s aggregate per rack", note: "NVLink-C2C to Grace CPU, not PCIe" },
    hostRecommendation: { cpu: "N/A", note: "Grace (Arm Neoverse V2) is the coherent on-module host — no Xeon socket to pair" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Not supported — bare metal only" },
      { label: "MIG (hardware partitions)", value: "~1g.23gb, up to 7/GPU; disables NVLink P2P while active" },
      { label: "MIG-backed vGPU", value: "Not supported (bare metal only)" },
      { label: "Time-sliced vGPU (compute)", value: "Not supported" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Not supported" },
      { label: "Smallest isolated unit", value: "23 GB (7/GPU)" },
      { label: "NVIDIA AI Enterprise", value: "Per physical GPU — same metric as every other part here" },
    ],
    sourceNote: "NVIDIA GB200 NVL72 public product page/datasheet — sold and benchmarked as a 36-CPU/72-GPU rack, NVLink-fused (not PCIe); per-GPU figures above are derived by dividing NVIDIA's published rack totals. Re-verify against nvidia.com before using in a bid.",
  },
  {
    id: "gb300-nvl72",
    name: "NVIDIA GB300 NVL72",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP16: { value: "5,000 TFLOPS", note: "= 5 PFLOPS, with sparsity, per GPU — 360 PFLOPS aggregate per rack (same as GB200)" },
      BF16: { value: "5,000 TFLOPS", note: "= 5 PFLOPS, with sparsity, per GPU — 360 PFLOPS aggregate per rack (same as GB200)" },
      FP8: { value: "10,000 TFLOPS", note: "= 10 PFLOPS, with sparsity, per GPU — 720 PFLOPS aggregate per rack (same as GB200)" },
      "FP4/INT4": { value: "20,000 TFLOPS", note: "= 20 PFLOPS (NVFP4) with sparsity / 15 PFLOPS dense, per GPU — 1,440/1,080 PFLOPS aggregate per rack. Third-party reporting on this figure is inconsistent for GB300 specifically — verify before use." },
    },
    memory: { type: "HBM3e", bandwidth: "8 TB/s per GPU (576 TB/s aggregate, 72-GPU rack)", capacity: "288 GB per GPU (20.7 TB aggregate rack) — up from 186 GB on GB200" },
    pcie: null,
    interconnect: { type: "NVLink (5th gen)", bandwidth: "1.8 TB/s per GPU · 130 TB/s aggregate per rack", note: "unchanged from GB200; NVLink-C2C to Grace CPU, not PCIe" },
    hostRecommendation: { cpu: "N/A", note: "Grace (Arm Neoverse V2) is the coherent on-module host — no Xeon socket to pair" },
    virtualization: [
      { label: "PCIe passthrough (whole GPU → VM)", value: "Not supported — bare metal only" },
      { label: "MIG (hardware partitions)", value: "~1g.34gb, up to 7/GPU; disables NVLink P2P while active" },
      { label: "MIG-backed vGPU", value: "Not supported (bare metal only)" },
      { label: "Time-sliced vGPU (compute)", value: "Not supported" },
      { label: "Graphics vGPU (vPC/vWS)", value: "Not supported" },
      { label: "Smallest isolated unit", value: "34 GB (7/GPU)" },
      { label: "NVIDIA AI Enterprise", value: "Per physical GPU — same metric as every other part here" },
    ],
    sourceNote: "Compiled from NVIDIA's public GB300 NVL72 product materials and third-party technical reporting — less consistently reported than GB200's figures, especially the FP4 dense/sparse split. Re-verify against nvidia.com before using in a bid.",
  },

  // ── Accelerators ─────────────────────────────────────────────────────────────
  {
    id: "sn40l",
    name: "SambaNova SN40L",
    category: "Accelerator",
    accent: "#fb923c",
    flops: {
      FP32: { value: "638–640 TFLOPS", note: "Native PCU SIMD datapath, per socket" },
      BF16: { value: "638–640 TFLOPS", note: "Native PCU SIMD datapath, per socket" },
      INT8: { value: "Supported", note: "SIMD ALU — no published absolute rate" },
    },
    memory: {
      type: "HBM3 (tier 1) + up to 1.5 TiB pluggable DDR (tier 2)",
      bandwidth: "~2 TB/s HBM3 (third-party estimate, not vendor-confirmed)",
      capacity: "64 GiB HBM3 + up to 1.5 TiB DDR, per socket",
    },
    pcie: null,
    interconnect: null,
    sourceNote: "SambaNova RDU Platform Reference v1.0 (this app's sambanova-data.ts). FP8 is not a native SN40L datapath — arrives with SN50.",
  },
];
