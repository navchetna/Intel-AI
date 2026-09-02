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
//  - NVIDIA H100 (PCIe and SXM5), RTX PRO 6000 Blackwell, GB200 NVL72, GB300 NVL72: this
//    app's own nvidia-gpu-data.ts, compiled from NVIDIA's public datasheets/product pages.
//    H100 figures are high-confidence (well-established, widely published). RTX PRO 6000
//    figures are compiled from public launch specs. GB200/GB300 per-GPU figures are derived
//    from NVIDIA's published rack (NVL72) totals — GB300's FP4 dense/sparse split specifically
//    has inconsistent third-party reporting, flagged in that row's source note. Re-check all
//    of these against nvidia.com before use in a bid or business case.

export type DataType = "FP64" | "FP32" | "TF32" | "FP16" | "BF16" | "FP8" | "INT8" | "FP4/INT4";

export const DTYPE_ORDER: DataType[] = ["FP64", "FP32", "TF32", "FP16", "BF16", "FP8", "INT8", "FP4/INT4"];

export interface FlopsCell {
  value: string;
  note?: string;
}

export interface ComparisonChip {
  id: string;
  name: string;
  category: "CPU" | "GPU" | "Accelerator";
  accent: string;
  flops: Partial<Record<DataType, FlopsCell>>;
  memory: { type: string; bandwidth: string; capacity: string };
  pcie: { lanes: string; gen: string; note?: string } | null; // null = not applicable (CPU host, or no PCIe fabric)
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
    sourceNote: "Intel Crescent Island Xe3P Technical Reference v1.0 — TDP, GPU IP, datatype throughput (FP64/FP32/BF16/FP8/MXFP4), and memory (type, capacity, bandwidth) are Intel-published.",
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
    sourceNote: "NVIDIA H100 PCIe datasheet (public) — high-confidence, widely published figures.",
  },
  {
    id: "h100-sxm5",
    name: "NVIDIA H100 (SXM5)",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP64: { value: "34 TFLOPS", note: "CUDA cores — 67 TFLOPS on Tensor Core" },
      FP32: { value: "67 TFLOPS" },
      TF32: { value: "989 TFLOPS", note: "Tensor Core, with sparsity (~495 dense)" },
      FP16: { value: "1,979 TFLOPS", note: "Tensor Core, with sparsity (990 dense — this app's Qwen sizing-model default)" },
      BF16: { value: "1,979 TFLOPS", note: "Tensor Core, with sparsity (990 dense — this app's Qwen sizing-model default)" },
      FP8: { value: "3,958 TFLOPS", note: "Tensor Core, with sparsity (1,979 dense)" },
      INT8: { value: "3,958 TOPS", note: "Tensor Core, with sparsity (1,979 dense)" },
    },
    memory: { type: "HBM3", bandwidth: "3.35 TB/s (3,350 GB/s)", capacity: "80 GB" },
    pcie: null,
    sourceNote: "NVIDIA H100 SXM5 datasheet (public) — HGX/DGX 8-GPU form factor, not the PCIe SKU above; NVLink (900 GB/s), not PCIe, is the multi-GPU fabric. High-confidence, widely published figures.",
  },
  {
    id: "rtx-pro-6000",
    name: "NVIDIA RTX PRO 6000 (Blackwell)",
    category: "GPU",
    accent: "#76b900",
    flops: {
      FP64: { value: "1.97 TFLOPS" },
      FP32: { value: "126 TFLOPS" },
      FP16: { value: "503.8 TFLOPS", note: "Tensor Core, with sparsity (251.9 dense)" },
      BF16: { value: "503.8 TFLOPS", note: "Tensor Core, with sparsity (251.9 dense)" },
      FP8: { value: "1,007.6 TFLOPS", note: "Tensor Core, with sparsity (503.8 dense)" },
      "FP4/INT4": { value: "~4,000 TOPS", note: "FP4 Tensor Core, with sparsity — NVIDIA's rounded headline figure" },
    },
    memory: { type: "GDDR7, ECC, 512-bit", bandwidth: "1.79 TB/s (1,792 GB/s)", capacity: "96 GB" },
    pcie: { lanes: "16", gen: "5.0" },
    sourceNote: "Compiled from NVIDIA's public RTX PRO 6000 Blackwell (Workstation Edition) datasheet and product pages — re-verify against nvidia.com before using in a bid or business case.",
  },
  {
    id: "gb200-nvl72",
    name: "NVIDIA GB200 NVL72 (per GPU)",
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
    sourceNote: "NVIDIA GB200 NVL72 public product page/datasheet — sold and benchmarked as a 36-CPU/72-GPU rack, NVLink-fused (not PCIe); per-GPU figures above are derived by dividing NVIDIA's published rack totals. Re-verify against nvidia.com before using in a bid.",
  },
  {
    id: "gb300-nvl72",
    name: "NVIDIA GB300 NVL72 (per GPU)",
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
    sourceNote: "SambaNova RDU Platform Reference v1.0 (this app's sambanova-data.ts). FP8 is not a native SN40L datapath — arrives with SN50.",
  },
];
