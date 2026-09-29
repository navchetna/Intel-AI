// OEM system options that carry NVIDIA RTX PRO 6000 / RTX PRO 4500 / L4 / H200 NVL / HGX B200 /
// HGX B300 — compiled from each OEM's own {OEM}_{GPU}.xlsx system reference (Sep 2026). These are the physical chassis a
// customer actually buys; nvidia-gpu-data.ts covers the GPU silicon itself.
//
// Several chassis carry more than one of these GPUs (e.g. Dell XE7740 spans four, Dell XE9780
// carries both HGX B200 and B300) — each one's own OEM workbook documents its own power
// scenarios for that specific GPU, so PowerScenario carries its own `gpuId` rather than
// assuming one GPU per system.
//
// Power-scenario figures (loads, headroom, rack fit) are reproduced exactly as authored in each
// source workbook's live model — not recomputed here — so they stay traceable to that workbook's
// own formulas and [U] planning-assumption inputs (per-DIMM/drive/NIC/fan power). Treat every
// number here as a planning ceiling at nameplate power, not a measured draw; re-run each OEM's
// own power calculator (Dell EIPT, HPE Power Advisor, Lenovo Capacity Planner, Supermicro/MSI
// sales tools) before a facility commitment.

import type { SourceRef } from "./accelerator-data";

export type SystemGpuId = "rtx-pro-6000" | "rtx-pro-4500" | "l4" | "h200-nvl" | "b200" | "b300";

export const SYSTEM_GPU_OPTIONS: { id: SystemGpuId; label: string }[] = [
  { id: "l4",           label: "NVIDIA L4" },
  { id: "rtx-pro-4500", label: "NVIDIA RTX PRO 4500" },
  { id: "rtx-pro-6000", label: "NVIDIA RTX PRO 6000" },
  { id: "h200-nvl",     label: "NVIDIA H200 NVL" },
  { id: "b200",         label: "NVIDIA HGX B200" },
  { id: "b300",         label: "NVIDIA HGX B300" },
];

export interface SpecRow { label: string; value: string; tag?: string }
export interface SpecSection { section: string; rows: SpecRow[] }
export interface ComponentRow { subsystem: string; component: string; partCode?: string; maxQty?: string; spec?: string; note?: string }

export interface PowerScenario {
  gpuId: SystemGpuId;
  name: string;
  gpus: number;
  gpuW: number;
  cpuCount: number;
  cpuTdpW: number;
  psuRatingW: number; // 0 = unpublished
  psuInstalled: number;
  psuRedundant: number;
  gpuLoadW: number;
  cpuLoadW: number;
  memoryLoadW: number;
  storageLoadW: number;
  networkLoadW: number;
  baseboardW: number;
  componentSubtotalW: number;
  fansVrW: number;
  estMaxDcLoadW: number;
  gpuShareOfDcPct: number;
  estMaxAcInputW: number;
  psuRedundantOutputW: number | null; // null = n/a (unpublished PSU data)
  headroomW: number | null;
  psuUtilizationPct: number | null;
  redundancyStatus: string;
  heatLoadBtuHr: number;
  acPerGpuKw: number;
  nodesPerRackPower: number;
  nodesPerRackSpace: number;
  nodesPerRack: number;
  gpusPerRack: number;
  rackAcLoadKw: number;
}

export interface OpenQuestion { item: string; why: string; resolveBy: string }

export interface OemSystem {
  id: string;
  oem: "Cisco" | "Dell" | "HPE" | "Lenovo" | "MSI" | "Supermicro";
  model: string;
  gpuIds: SystemGpuId[];
  tagline: string;
  positioning: string;
  formFactor: string;
  rackUnits: number;
  cpuSocket: string;
  cpuCompatibilityNote: string;
  specSections: SpecSection[];
  components: ComponentRow[];
  powerRules: string[];
  powerScenarios: PowerScenario[];
  openQuestions: OpenQuestion[];
  sources: SourceRef[];
  sourceNote: string;
}

const LGA4710_NOTE = "LGA-4710 (Xeon 6700-series). Compatible with 6700P/6700E SKUs (e.g. 6747P, 6732P, 6767P, 6776P*) — the 6900-series (6960P, 6962P*) is LGA-7529 and will not fit this socket.";
const LGA7529_NOTE = "LGA-7529 / Socket BR (Xeon 6900-series P-cores). Compatible with 6960P/6962P* — the 6700-series (6747P, 6732P, 6767P, 6776P*) is LGA-4710 and will not fit this socket. The only system in this set on the 6900P platform.";

export const OEM_SYSTEMS: OemSystem[] = [
  // ── Cisco ────────────────────────────────────────────────────────────────────
  {
    id: "cisco-ucs-c880a-m8",
    oem: "Cisco",
    model: "UCS C880A M8",
    gpuIds: ["b300"],
    tagline: "Cisco's only Xeon-hosted HGX — 10RU, 8× B300, fixed B301-B304 bundles",
    positioning: "Cisco's only Xeon-hosted HGX platform: 10RU, 8× B300 with per-GPU ConnectX-8, sold as fixed bundles (B301-B304) with Intersight management. The B303 bundle pairs 2× Xeon 6776P — the SKU workbook's row 82 'Best' host CPU.",
    formFactor: "10RU rack server, air-cooled",
    rackUnits: 10,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE + " Cisco's OEM-qualified host CPU for this chassis is the Xeon 6776P (bundle B303).",
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Cisco UCS C880A M8 Rack Server (UCSC-C880A-M8)" },
        { label: "Bundles", value: "UCSC-880A-M8-B301 / -B302 / -B303 / -B304 with auto-included components" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two 6th Gen Intel Xeon (Granite Rapids); B303 bundle: 2× Xeon 6776P" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "Up to 32 DDR5-6400 DIMMs; up to 4 TB (32× 128 GB)" },
      ] },
      { section: "GPU", rows: [
        { label: "Complex", value: "8× NVIDIA HGX B300 NVL8 (air-cooled 8-GPU board UCSAI-NVHGX-B300A); 2.3 TB HBM total" },
      ] },
      { section: "Network", rows: [
        { label: "E-W", value: "8× integrated NVIDIA ConnectX-8 (one per GPU)" },
        { label: "N-S", value: "4× PCIe Gen5 x16 FHHL; B303 includes 2× ConnectX-7 2×200G (crypto)" },
        { label: "LAN", value: "1× OCP 3.0 TFF Gen5 x8 NIC (CPU1) with 2× 10GbE RJ-45 (Intel X710-T2L)" },
      ] },
      { section: "Storage", rows: [
        { label: "Data cache", value: "Up to 8× PCIe Gen5 x4 E1.S NVMe" },
        { label: "Boot", value: "Up to 2× 960 GB M.2 SATA with Cisco boot-optimised M.2 RAID controller" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "12× 54 V 3200 W (UCSAI-PSU-3200W)" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "20× hot-swappable, N+1" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "Host BMC via DC-SCM with RJ45; IPMI 2.0, KVM, watchdog" },
      ] },
      { section: "Physical", rows: [
        { label: "Weight", value: "130 kg (catalog)" },
      ] },
      { section: "Software", rows: [
        { label: "Options", value: "NVIDIA AI Enterprise software and Cisco optics PIDs orderable" },
      ] },
    ],
    components: [
      { subsystem: "Base", component: "C880A M8 8×B300, 2× 6776P, 8× CX-8, 2× CX-7, 4 TB", partCode: "UCSC-880A-M8-B303", maxQty: "1", spec: "Bundle" },
      { subsystem: "GPU", component: "UCS C880A M8 GPU SLED B300", partCode: "UCSAI-880A-B3-SLD", maxQty: "1" },
      { subsystem: "GPU", component: "NVIDIA HGX B300 Air-cooled 8-GPU Board", partCode: "UCSAI-NVHGX-B300A", maxQty: "1" },
      { subsystem: "CPU", component: "UCS C880A M8 CPU SLED", partCode: "UCSAI-880A-CC-SLD", maxQty: "1" },
      { subsystem: "CPU", component: "Intel GNR 6776P", partCode: "UCSAI-CPU-I6776P", maxQty: "2", spec: "64C 350 W", note: "Workbook row 82" },
      { subsystem: "CPU", component: "Intel GNR heatsink", partCode: "UCSAI-880A-HS", maxQty: "2" },
      { subsystem: "Memory", component: "128GB DDR5-6400 RDIMM 2Rx4 (32Gb)", partCode: "UCSAI-MR128G2RG5", maxQty: "32" },
      { subsystem: "Network", component: "NVIDIA ConnectX-7 2×200G (crypto)", partCode: "UCSAI-P-N7CS200GF", maxQty: "2" },
      { subsystem: "Network", component: "OCP Intel X710-T2L", partCode: "UCSAI-O-ID10GC", maxQty: "1" },
      { subsystem: "Network", component: "Dual CX-7 bracket", partCode: "UCSAI-2CX7200-BKT", maxQty: "1" },
      { subsystem: "Storage", component: "3.84TB E1.S Micron Gen5 NVMe", partCode: "UCSAI-NVES3T8M1V", maxQty: "2", spec: "up to 8" },
      { subsystem: "Boot", component: "960GB M.2 SATA Micron", partCode: "UCSAI-M2-960G", maxQty: "2" },
      { subsystem: "Boot", component: "M.2 RAID controller + carrier", partCode: "UCSAI-M2-HWRAID / UCSAI-M2-CARRIER", maxQty: "1" },
      { subsystem: "Power", component: "UCSAI M8 PSU 3200W 54V", partCode: "UCSAI-PSU-3200W", maxQty: "12" },
      { subsystem: "Management", component: "C880A M8 DC-SCM", partCode: "UCSAI-880A-DCSCM", maxQty: "1" },
    ],
    powerRules: [
      "12× 54 V 3200 W PSUs; redundancy scheme not in retrieved excerpt",
      "20 fans N+1 hot-swap",
    ],
    powerScenarios: [
      {
        gpuId: "b300",
        name: "B303 bundle · 12× 3200 W 54 V (6+6 assumed)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 12, psuRedundant: 6,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 50, networkLoadW: 75, baseboardW: 1000,
        componentSubtotalW: 10945, fansVrW: 1094.5, estMaxDcLoadW: 12039.5, gpuShareOfDcPct: 73.09,
        estMaxAcInputW: 12673.16, psuRedundantOutputW: 19200, headroomW: 7160.5, psuUtilizationPct: 62.71,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 43240.81, acPerGpuKw: 1.584,
        nodesPerRackPower: 2, nodesPerRackSpace: 3, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.35,
      },
      {
        gpuId: "b300",
        name: "B303 bundle · 12× 3200 W (10+2 assumed)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 12, psuRedundant: 2,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 50, networkLoadW: 75, baseboardW: 1000,
        componentSubtotalW: 10945, fansVrW: 1094.5, estMaxDcLoadW: 12039.5, gpuShareOfDcPct: 73.09,
        estMaxAcInputW: 12673.16, psuRedundantOutputW: 32000, headroomW: 19960.5, psuUtilizationPct: 37.62,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 43240.81, acPerGpuKw: 1.584,
        nodesPerRackPower: 2, nodesPerRackSpace: 3, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.35,
      },
    ],
    openQuestions: [
      { item: "Height 10RU (Cisco) vs 8U (NetBox catalog)", why: "Rack density", resolveBy: "Cisco spec sheet dimensions table" },
      { item: "PSU redundancy and the 'System Power Consumption' row (truncated in the retrieved excerpt)", why: "Cisco publishes a system power figure — replace the estimate with it", resolveBy: "Cisco C880A M8 spec sheet Table 1" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "OEM power calculators (Cisco has no public equivalent — use Intersight / Cisco sales engineering)" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "C1", label: "Cisco - UCS C880A M8 Rack Server Spec Sheet", url: "https://www.cisco.com/c/dam/en/us/products/collateral/servers-unified-computing/ucs-c-series-rack-servers/ucs-c880a-m8-rack-server-spec-sheet.pdf" },
      { id: "C2", label: "Cisco - UCS C880A M8 Data Sheet", url: "https://www.cisco.com/c/en/us/products/collateral/servers-unified-computing/ucs-c-series-rack-servers/ucs-c880a-m8-rack-server-ds.html" },
      { id: "C3", label: "NetBox Labs NDX - UCSC-C880A-M8 catalog entry (8U, 130 kg)", url: "https://netboxlabs.com/ndx/cisco/cisco-ucsc-c880a-m8/" },
    ],
    sourceNote: "Compiled from Cisco's public C880A M8 spec sheet and data sheet, with the weight/height cross-check from NetBox Labs' catalog (Sep 2026). Re-verify against cisco.com before using in a bid.",
  },

  // ── Dell ─────────────────────────────────────────────────────────────────────
  {
    id: "dell-xe7740",
    oem: "Dell",
    model: "PowerEdge XE7740",
    gpuIds: ["rtx-pro-6000", "rtx-pro-4500", "l4", "h200-nvl"],
    tagline: "8× 600 W double-wide in 4U, 8 front-serviceable backend NIC slots",
    positioning: "Dell's Xeon-hosted RTX PRO Server: 8× 600 W double-wide in 4U with 8 front-serviceable backend NIC slots. Watch the 3200 W PSU derate to 2900 W at 200-220 VAC.",
    formFactor: "4U, air-cooled",
    rackUnits: 4,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Dell PowerEdge XE7740" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two Intel Xeon 6 series, up to 144 cores per processor (spec sheet) — up to 86 cores per the support page (sources disagree)" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "32 DDR5 RDIMM, max 8 TB (spec sheet) — 3 TB per reseller listings (sources disagree)" },
      ] },
      { section: "GPU", rows: [
        { label: "Slots", value: "8× PCIe Gen5 x16 DW-FHFL up to 600 W, or 16× PCIe Gen5 x16 SW-FHFL up to 75 W" },
        { label: "Supported NVIDIA GPUs", value: "RTX PRO 6000 BSE 600 W (DW, 96 GB) · H200 NVL 600 W (DW, 141 GB) · H100 NVL 400 W · L40S 350 W · L4 72 W (SW) · RTX PRO 4500 165 W (SW, 32 GB); also Intel Gaudi 3 600 W" },
        { label: "NVLink", value: "NVIDIA NVLink bridge section documented in the Technical Guide" },
      ] },
      { section: "Expansion", rows: [
        { label: "Network slots", value: "Up to 8 PCIe Gen5 x16 SW-FHHL, each up to 150 W (front-serviceable backend NICs); 1× OCP 3.0 (x8)" },
      ] },
      { section: "Storage", rows: [
        { label: "Drives", value: "8× 2.5\" NVMe/SAS/SATA (122.88 TB) per spec sheet — 8× E3.S Gen5 per reseller listings" },
        { label: "Boot", value: "BOSS-N1: HW RAID1, 2× M.2 NVMe" },
      ] },
      { section: "Power", rows: [
        { label: "PSU options", value: "3200 W Titanium 200-240 VAC/240 VDC (3200 W at 220.1-240 VAC; 2900 W at 200-220 VAC) · 3200 W Titanium 277 VAC/336 VDC · 2400 W Titanium 200-240 VAC/240 VDC" },
        { label: "PSU count", value: "8 redundant AC or DC PSUs" },
        { label: "PSU-GPU configuration matrix", value: "Published in the Technical Guide ch.10 — not retrieved for this reference" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "4 sets HPR in mid tray + 12 HPR on the front" },
      ] },
      { section: "Physical", rows: [
        { label: "Dimensions", value: "174.3 mm H × 482 mm W × 899.56 mm D with bezel (886.73 mm without)" },
        { label: "Max weight", value: "71.35 kg" },
      ] },
      { section: "Management", rows: [
        { label: "BMC / tools", value: "iDRAC10, OME, OME Power Manager, RACADM, Redfish" },
      ] },
      { section: "Security", rows: [
        { label: "Features", value: "TPM 2.0, signed firmware, Silicon RoT, System Lockdown, SCV, chassis intrusion" },
      ] },
      { section: "Ports", rows: [
        { label: "Front / rear", value: "Front: USB-C iDRAC Direct, optional USB-A and mDP · Rear: iDRAC RJ45, 2× USB 3.1, VGA" },
      ] },
      { section: "OS", rows: [
        { label: "Supported", value: "Ubuntu Server LTS, RHEL, SLES, VMware ESXi" },
      ] },
    ],
    components: [
      { subsystem: "Processor", component: "Intel Xeon 6 (P-core or E-core)", partCode: "CTO", maxQty: "2", spec: "Up to 144C (E) / 86C (P)" },
      { subsystem: "Memory", component: "DDR5 RDIMM", partCode: "CTO", maxQty: "32" },
      { subsystem: "Power", component: "3200 W Titanium 200-240 VAC / 240 VDC", partCode: "CTO", maxQty: "8", spec: "2900 W at 200-220 VAC" },
      { subsystem: "Power", component: "3200 W Titanium 277 VAC / 336 VDC", partCode: "CTO", maxQty: "8" },
      { subsystem: "Power", component: "2400 W Titanium 200-240 VAC / 240 VDC", partCode: "CTO", maxQty: "8" },
      { subsystem: "Boot", component: "BOSS-N1", partCode: "CTO", maxQty: "1", spec: "2× M.2 NVMe HW RAID1" },
      { subsystem: "Network", component: "OCP NIC 3.0", partCode: "CTO", maxQty: "1", spec: "x8 lanes" },
      { subsystem: "Network", component: "Backend PCIe NIC slots", partCode: "CTO", maxQty: "8", spec: "Gen5 x16 FHHL ≤150 W" },
    ],
    powerRules: [
      "3200 W 200-240 VAC PSU delivers 3200 W only at 220.1-240 VAC; derates to 2900 W at 200-220 VAC.",
      "Alternative PSUs: 3200 W 277 VAC/336 VDC; 2400 W 200-240 VAC.",
      "Up to 8 redundant AC or DC PSUs.",
      "Double-wide GPU slots ≤600 W each (8); single-wide ≤75 W each (16); backend NIC slots ≤150 W each (8).",
      "PSU-to-GPU configuration matrix exists in the Technical Guide ch.10 — not retrieved; required quantities per GPU population unknown here.",
      "RTX PRO 4500 on this chassis: Dell names this GPU for XE7740, but the chassis rates single-wide slots at 75 W vs. the card's 165 W TDP. The 8-card double-wide-slot scenario avoids this conflict; the 16-card single-wide scenario is unconfirmed and needs Dell confirmation of an actual 165 W-capable SW slot.",
      "L4 fits cleanly in this chassis' 75 W single-wide slots (L4's TDP is 72 W) — 16× L4 is the densest L4 build in this OEM set, with no power-vs-slot conflict.",
      "H200 NVL on this chassis: the 600 W double-wide cards match the 8× 600 W DW slots exactly, so the 8-GPU scenarios are slot-native; NVLink bridge options are in the Technical Guide (not retrieved).",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "4× RTX PRO 6000 · 4× 3200 W (2+2)",
        gpus: 4, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 4, psuRedundant: 2,
        gpuLoadW: 2400, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 3576, fansVrW: 286.08, estMaxDcLoadW: 3862.08, gpuShareOfDcPct: 62.14,
        estMaxAcInputW: 4065.35, psuRedundantOutputW: 6400, headroomW: 2537.92, psuUtilizationPct: 60.35,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 13870.97, acPerGpuKw: 1.016,
        nodesPerRackPower: 7, nodesPerRackSpace: 9, nodesPerRack: 7, gpusPerRack: 28, rackAcLoadKw: 28.46,
      },
      {
        gpuId: "rtx-pro-6000",
        name: "8× RTX PRO 6000 · 8× 3200 W (4+4) @220-240 VAC",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6411, fansVrW: 512.88, estMaxDcLoadW: 6923.88, gpuShareOfDcPct: 69.33,
        estMaxAcInputW: 7288.29, psuRedundantOutputW: 12800, headroomW: 5876.12, psuUtilizationPct: 54.09,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24867.66, acPerGpuKw: 0.911,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.15,
      },
      {
        gpuId: "rtx-pro-6000",
        name: "8× RTX PRO 6000 · 8× 3200 W derated to 2900 W @200-220 VAC (4+4)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2900, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6411, fansVrW: 512.88, estMaxDcLoadW: 6923.88, gpuShareOfDcPct: 69.33,
        estMaxAcInputW: 7288.29, psuRedundantOutputW: 11600, headroomW: 4676.12, psuUtilizationPct: 59.69,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24867.66, acPerGpuKw: 0.911,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.15,
      },
      {
        gpuId: "rtx-pro-4500",
        name: "8× RTX PRO 4500 in DW slots · 4× 2400 W (2+2)",
        gpus: 8, gpuW: 165, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2400, psuInstalled: 4, psuRedundant: 2,
        gpuLoadW: 1320, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 2496, fansVrW: 199.68, estMaxDcLoadW: 2695.68, gpuShareOfDcPct: 48.97,
        estMaxAcInputW: 2837.56, psuRedundantOutputW: 4800, headroomW: 2104.32, psuUtilizationPct: 56.16,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 9681.75, acPerGpuKw: 0.355,
        nodesPerRackPower: 10, nodesPerRackSpace: 9, nodesPerRack: 9, gpusPerRack: 72, rackAcLoadKw: 25.54,
      },
      {
        gpuId: "rtx-pro-4500",
        name: "16× RTX PRO 4500 (unconfirmed) · 8× 3200 W (4+4)",
        gpus: 16, gpuW: 165, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 2640, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 4226, fansVrW: 338.08, estMaxDcLoadW: 4564.08, gpuShareOfDcPct: 57.84,
        estMaxAcInputW: 4804.29, psuRedundantOutputW: 12800, headroomW: 8235.92, psuUtilizationPct: 35.66,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 16392.25, acPerGpuKw: 0.300,
        nodesPerRackPower: 6, nodesPerRackSpace: 9, nodesPerRack: 6, gpusPerRack: 96, rackAcLoadKw: 28.83,
      },
      {
        gpuId: "l4",
        name: "16× L4 · 4× 2400 W (2+2)",
        gpus: 16, gpuW: 72, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2400, psuInstalled: 4, psuRedundant: 2,
        gpuLoadW: 1152, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 2328, fansVrW: 186.24, estMaxDcLoadW: 2514.24, gpuShareOfDcPct: 45.82,
        estMaxAcInputW: 2646.57, psuRedundantOutputW: 4800, headroomW: 2285.76, psuUtilizationPct: 52.38,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 9030.09, acPerGpuKw: 0.165,
        nodesPerRackPower: 11, nodesPerRackSpace: 9, nodesPerRack: 9, gpusPerRack: 144, rackAcLoadKw: 23.82,
      },
      {
        gpuId: "l4",
        name: "8× L4 · 2× 2400 W (1+1)",
        gpus: 8, gpuW: 72, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2400, psuInstalled: 2, psuRedundant: 1,
        gpuLoadW: 576, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 1752, fansVrW: 140.16, estMaxDcLoadW: 1892.16, gpuShareOfDcPct: 30.44,
        estMaxAcInputW: 1991.75, psuRedundantOutputW: 2400, headroomW: 507.84, psuUtilizationPct: 78.84,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 6795.84, acPerGpuKw: 0.249,
        nodesPerRackPower: 15, nodesPerRackSpace: 9, nodesPerRack: 9, gpusPerRack: 72, rackAcLoadKw: 17.93,
      },
      {
        gpuId: "h200-nvl",
        name: "4× H200 NVL · 4× 3200 W (2+2)",
        gpus: 4, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 4, psuRedundant: 2,
        gpuLoadW: 2400, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 3576, fansVrW: 286.08, estMaxDcLoadW: 3862.08, gpuShareOfDcPct: 62.14,
        estMaxAcInputW: 4065.35, psuRedundantOutputW: 6400, headroomW: 2537.92, psuUtilizationPct: 60.35,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 13870.97, acPerGpuKw: 1.016,
        nodesPerRackPower: 7, nodesPerRackSpace: 9, nodesPerRack: 7, gpusPerRack: 28, rackAcLoadKw: 28.46,
      },
      {
        gpuId: "h200-nvl",
        name: "8× H200 NVL · 8× 3200 W (4+4) @220-240 VAC",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 6386, fansVrW: 510.88, estMaxDcLoadW: 6896.88, gpuShareOfDcPct: 69.6,
        estMaxAcInputW: 7259.87, psuRedundantOutputW: 12800, headroomW: 5903.12, psuUtilizationPct: 53.88,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24770.69, acPerGpuKw: 0.907,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.04,
      },
      {
        gpuId: "h200-nvl",
        name: "8× H200 NVL · 2900 W derate @200-220 VAC (4+4)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2900, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 6386, fansVrW: 510.88, estMaxDcLoadW: 6896.88, gpuShareOfDcPct: 69.6,
        estMaxAcInputW: 7259.87, psuRedundantOutputW: 11600, headroomW: 4703.12, psuUtilizationPct: 59.46,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24770.69, acPerGpuKw: 0.907,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.04,
      },
    ],
    openQuestions: [
      { item: "XE7740 PSU-GPU configuration matrix (Technical Guide ch.10)", why: "Required PSU count and redundancy per GPU population", resolveBy: "Dell XE7740 Technical Guide E118S" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "OEM power calculators: Dell EIPT" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (e.g. Supermicro SYS-522GA-NRT)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "D1", label: "Dell — PowerEdge XE series AI spec sheet (Rev A07)", url: "https://www.delltechnologies.com/asset/en-us/products/servers/technical-support/poweredge-xe-ai-spec-sheet.pdf" },
      { id: "D3", label: "Dell — PowerEdge XE7740 support overview", url: "https://www.dell.com/support/product-details/en-us/product/poweredge-xe7740/overview" },
      { id: "D4", label: "Dell — PowerEdge XE7740 Technical Guide E118S Rev A04 (Apr 2026)", url: "https://www.delltechnologies.com/asset/en-nz/products/servers/technical-support/poweredge-xe7740-technical-guide.pdf" },
      { id: "D6", label: "ServerMonkey / Network Devices — XE7740 listings", url: "https://www.servermonkey.com/servers/ai-ml-servers/dell-emc-gpu-servers/dell-poweredge-xe7740.html" },
    ],
    sourceNote: "Compiled from Dell's public XE series AI spec sheet, support overview, and Technical Guide (Sep 2026). Re-verify against delltechnologies.com before using in a bid.",
  },

  {
    id: "dell-xe9780",
    oem: "Dell",
    model: "PowerEdge XE9780",
    gpuIds: ["b300", "b200"],
    tagline: "10U air-cooled HGX — 8× B300 (1100 W) or B200 (1000 W) on 12× 3200 W PSUs",
    positioning: "Dell's HGX flagship and successor to the XE9680: a 10U air-cooled chassis for existing data centres. B300 NVL8 (1100 W) ships with 8× integrated ConnectX-8 and only 4 add-in slots; the same chassis with the B200 board (1000 W, full FP64/INT8) frees up to 12 PCIe slots for 400G east-west NICs (no integrated CX-8).",
    formFactor: "10U, air-cooled",
    rackUnits: 10,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE + " The XE9780LAP variant (two Xeon 6 up to 128 cores, 24 DIMM / 6 TB) is a separate 6900P platform.",
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Dell PowerEdge XE9780 (air) / XE9780L (liquid)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two 6th Gen Intel Xeon, up to 86 cores per processor" },
        { label: "Variant note", value: "XE9780LAP: two Xeon 6 up to 128 cores (6900P class), 24 DIMM / 6 TB" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "32 DDR5 RDIMM, 4 TB max (32× 128 GB), up to 6400 MT/s" },
      ] },
      { section: "Management", rows: [
        { label: "BMC / tools", value: "iDRAC10, iDRAC Direct, Redfish, iDRAC Service Module, RACADM, IPMI" },
      ] },
      { section: "Security", rows: [
        { label: "Features", value: "Signed firmware, SED encryption, Secure Boot, SCV, Secure Erase, Silicon RoT, System Lockdown, TPM on DC-SCM mezzanine, chassis intrusion" },
      ] },
      { section: "OS", rows: [
        { label: "Supported", value: "Ubuntu Server LTS, RHEL" },
      ] },
      { section: "GPU", rows: [
        { label: "Options", value: "8× NVIDIA HGX B300 NVL8 270 GB 1100 W SXM6 · 8× HGX B200 180 GB 1000 W SXM6 · or no GPU" },
      ] },
      { section: "Network", rows: [
        { label: "Embedded", value: "B300: 8× CX-8 OSFP (default)" },
      ] },
      { section: "Expansion", rows: [
        { label: "PCIe", value: "B300: 4× 150 W Gen5 x16 FHHL · B200: up to 12 (8× 75 W + 4× ≤150 W) Gen5 x16 FHHL · 1× OCP 3.0 (x8)" },
      ] },
      { section: "Storage", rows: [
        { label: "Drives", value: "16× E3.S NVMe direct (245.76 TB spec sheet / 122.88 TB dell.com) or 10× U.2 NVMe (153.6 TB)" },
        { label: "Boot", value: "BOSS-N1 DC-MHS, 2× 2280 M.2 SSD (HWRAID 1)" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "12× 3200 W Titanium, 200-240 VAC or 240 VDC, hot-swap redundant" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "15 standard-grade GPU fans (hot-swap) + 5 CPU fans (cold-swap)" },
      ] },
      { section: "Physical", rows: [
        { label: "Dimensions", value: "439.5 mm H × 482.3 mm W × 1044.7 mm D with bezel (1023 mm without)" },
        { label: "Max weight", value: "163.2 kg (spec sheet Rev A07) · 156 kg (dell.com page)" },
      ] },
      { section: "Ports", rows: [
        { label: "Front", value: "iDRAC Direct USB-C, 2× RJ45 iDRAC, 1× USB-A, 1× mDP; no rear ports" },
      ] },
      { section: "Rack density", rows: [
        { label: "Blackwell Ultra per rack", value: "Up to 192 GPUs (DLC) and customisable to 256 per Dell IR7000 rack (XE978xL)" },
      ] },
    ],
    components: [
      { subsystem: "Processor", component: "6th Gen Intel Xeon (6700P)", partCode: "CTO", maxQty: "2", spec: "≤86C, ≤350 W" },
      { subsystem: "Memory", component: "DDR5 RDIMM 128 GB", partCode: "CTO", maxQty: "32", spec: "6400 MT/s" },
      { subsystem: "GPU", component: "NVIDIA HGX B300 NVL8 8-GPU (270 GB, 1100 W SXM6)", partCode: "CTO", maxQty: "1" },
      { subsystem: "GPU", component: "NVIDIA HGX B200 8-GPU (180 GB, 1000 W SXM6)", partCode: "CTO", maxQty: "1" },
      { subsystem: "Network", component: "ConnectX-8 OSFP (B300)", partCode: "embedded", maxQty: "8", spec: "800 Gb/s" },
      { subsystem: "Network", component: "OCP 3.0 NIC", partCode: "CTO", maxQty: "1", spec: "x8" },
      { subsystem: "Storage", component: "E3.S NVMe", partCode: "CTO", maxQty: "16" },
      { subsystem: "Storage", component: "U.2 NVMe", partCode: "CTO", maxQty: "10" },
      { subsystem: "Boot", component: "BOSS-N1 DC-MHS", partCode: "CTO", maxQty: "1", spec: "2× M.2" },
      { subsystem: "Power", component: "3200 W Titanium PSU", partCode: "CTO", maxQty: "12", spec: "200-240 VAC / 240 VDC" },
      { subsystem: "Cooling", component: "GPU fans (hot-swap)", maxQty: "15" },
      { subsystem: "Cooling", component: "CPU fans (cold-swap)", maxQty: "5" },
    ],
    powerRules: [
      "12× 3200 W Titanium, 200-240 VAC or 240 VDC; redundancy scheme not stated in retrieved sources",
      "B300 config: add-in PCIe cards limited to 4× 150 W FHHL; B200 config: up to 12 (8× 75 W + 4× ≤150 W)",
      "12 PSUs can be run 6+6 (19.2 kW redundant output) or 10+2 (32 kW) — the redundancy scheme is not published, so both are modelled for B300; B200 is modelled at 6+6.",
    ],
    powerScenarios: [
      {
        gpuId: "b300",
        name: "XE9780 air · 8× B300 · 12× 3200 W (6+6)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 12, psuRedundant: 6,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11186, fansVrW: 1118.6, estMaxDcLoadW: 12304.6, gpuShareOfDcPct: 71.52,
        estMaxAcInputW: 12952.21, psuRedundantOutputW: 19200, headroomW: 6895.4, psuUtilizationPct: 64.09,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 44192.94, acPerGpuKw: 1.619,
        nodesPerRackPower: 2, nodesPerRackSpace: 3, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.9,
      },
      {
        gpuId: "b300",
        name: "XE9780 air · 8× B300 · 12× 3200 W (10+2)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 12, psuRedundant: 2,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11186, fansVrW: 1118.6, estMaxDcLoadW: 12304.6, gpuShareOfDcPct: 71.52,
        estMaxAcInputW: 12952.21, psuRedundantOutputW: 32000, headroomW: 19695.4, psuUtilizationPct: 38.45,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 44192.94, acPerGpuKw: 1.619,
        nodesPerRackPower: 2, nodesPerRackSpace: 3, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.9,
      },
      {
        gpuId: "b200",
        name: "XE9780 air · 8× B200 · 12× 3200 W (6+6)",
        gpus: 8, gpuW: 1000, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 12, psuRedundant: 6,
        gpuLoadW: 8000, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 225, baseboardW: 600,
        componentSubtotalW: 10061, fansVrW: 1006.1, estMaxDcLoadW: 11067.1, gpuShareOfDcPct: 72.29,
        estMaxAcInputW: 11649.58, psuRedundantOutputW: 19200, headroomW: 8132.9, psuUtilizationPct: 57.64,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 39748.36, acPerGpuKw: 1.456,
        nodesPerRackPower: 2, nodesPerRackSpace: 3, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 23.3,
      },
    ],
    openQuestions: [
      { item: "XE9780 12-PSU redundancy scheme", why: "6+6 → 19.2 kW vs 10+2 → 32 kW usable", resolveBy: "Dell XE9780 Technical Guide / EIPT" },
      { item: "Max weight 163.2 kg (spec sheet) vs 156 kg (dell.com)", why: "Floor loading", resolveBy: "Dell Technical Guide" },
      { item: "B200 availability window on XE9780 (air) as B300 ramps", why: "Procurement", resolveBy: "Dell configurator" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "OEM power calculators: Dell EIPT" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "D1", label: "Dell - PowerEdge XE series AI spec sheet (Rev A07)", url: "https://www.delltechnologies.com/asset/en-us/products/servers/technical-support/poweredge-xe-ai-spec-sheet.pdf" },
      { id: "D2", label: "Dell - PowerEdge XE9780 product page (dell.com)", url: "https://www.dell.com/en-us/shop/ipovw/poweredge-xe9780" },
      { id: "D5", label: "Dell - AI Factory with NVIDIA press release (19 May 2025)", url: "https://www.dell.com/en-us/dt/corporate/newsroom/announcements/detailpage.press-releases~usa~2025~05~dell-technologies-and-nvidia-unveil-next-generation-enterprise-ai-solutions.htm" },
    ],
    sourceNote: "Compiled from Dell's public XE series AI spec sheet, XE9780 product page, and AI Factory announcement (Sep 2026). Re-verify against delltechnologies.com before using in a bid.",
  },
  {
    id: "dell-xe9780l",
    oem: "Dell",
    model: "PowerEdge XE9780L",
    gpuIds: ["b300", "b200"],
    tagline: "3 OU liquid-cooled HGX node for the IR7000 rack — shared 33 kW power shelf",
    positioning: "The liquid-cooled XE9780 for density: a 3 OU compute node in a Dell IR7000 rack (44 or 50 OU) — up to 192 Blackwell Ultra GPUs per rack with DLC, customisable to 256. Nodes carry no PSUs of their own and draw from a shared 6× 5500 W rack power shelf (33 kW, 54 VDC bus), so per-node power headroom is really shelf-level headroom.",
    formFactor: "3 OU compute node in IR7000 rack (44 or 50 OU); IR7000 required",
    rackUnits: 3,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE + " The XE9780LAP variant (two Xeon 6 up to 128 cores, 24 DIMM / 6 TB) is a separate 6900P platform.",
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Dell PowerEdge XE9780 (air) / XE9780L (liquid)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two 6th Gen Intel Xeon, up to 86 cores per processor" },
        { label: "Variant note", value: "XE9780LAP: two Xeon 6 up to 128 cores (6900P class), 24 DIMM / 6 TB" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "32 DDR5 RDIMM, 4 TB max (32× 128 GB), up to 6400 MT/s" },
      ] },
      { section: "Management", rows: [
        { label: "BMC / tools", value: "iDRAC10, iDRAC Direct, Redfish, iDRAC Service Module, RACADM, IPMI" },
      ] },
      { section: "Security", rows: [
        { label: "Features", value: "Signed firmware, SED encryption, Secure Boot, SCV, Secure Erase, Silicon RoT, System Lockdown, TPM on DC-SCM mezzanine, chassis intrusion" },
      ] },
      { section: "OS", rows: [
        { label: "Supported", value: "Ubuntu Server LTS, RHEL" },
      ] },
      { section: "GPU", rows: [
        { label: "Options", value: "8× HGX B300 NVL8 270 GB 1100 W · 8× HGX B200 180 GB 1000 W (B200 on XE9780L only)" },
      ] },
      { section: "Network", rows: [
        { label: "Embedded", value: "B300: 8× CX-8 OSFP" },
      ] },
      { section: "Expansion", rows: [
        { label: "PCIe", value: "Up to 4 PCIe Gen5 x16 FHHL; 1× OCP 3.0 (x16)" },
      ] },
      { section: "Storage", rows: [
        { label: "Drives", value: "16× E1.S (122.88 TB) or 8× U.2 + 2× U.2 via PCIe CEM (307.2 TB)" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "6× 5500 W AC PSUs in rack power shelf (33 kW) - shared, not per node" },
      ] },
      { section: "Cooling", rows: [
        { label: "Method", value: "Liquid-cooled CPUs, CX-8, GPUs and NVLink Switches; fans 4 on UBB + 8 on HPM" },
      ] },
      { section: "Physical", rows: [
        { label: "Dimensions", value: "140.5 mm H × 537 mm W × 1047.95 mm D (UBB) / 889.65 mm (HPM)" },
        { label: "Max weight", value: "107.2 kg" },
      ] },
    ],
    components: [
      { subsystem: "Power", component: "5500 W AC PSU (rack power shelf)", partCode: "IR7000", maxQty: "6", spec: "33 kW per shelf", note: "Shared across nodes" },
      { subsystem: "Storage", component: "E1.S NVMe", partCode: "CTO", maxQty: "16" },
    ],
    powerRules: [
      "Power delivered from IR7000 rack power shelf: 6× 5500 W AC (33 kW), 54 VDC bus - node has no PSUs",
      "IR7000 rack required; up to 192 Blackwell Ultra GPUs with DLC, customisable to 256 per rack",
    ],
    powerScenarios: [
      {
        gpuId: "b300",
        name: "XE9780L liquid · 8× B300 · shared 6× 5500 W shelf (5+1)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 5500, psuInstalled: 6, psuRedundant: 1,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 336, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11306, fansVrW: 452.24, estMaxDcLoadW: 11758.24, gpuShareOfDcPct: 74.84,
        estMaxAcInputW: 12377.09, psuRedundantOutputW: 27500, headroomW: 15741.76, psuUtilizationPct: 42.76,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 42230.65, acPerGpuKw: 1.547,
        nodesPerRackPower: 2, nodesPerRackSpace: 14, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 24.75,
      },
      {
        gpuId: "b200",
        name: "XE9780L liquid · 8× B200 · shared 6× 5500 W shelf (5+1)",
        gpus: 8, gpuW: 1000, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 5500, psuInstalled: 6, psuRedundant: 1,
        gpuLoadW: 8000, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 336, networkLoadW: 100, baseboardW: 600,
        componentSubtotalW: 10056, fansVrW: 402.24, estMaxDcLoadW: 10458.24, gpuShareOfDcPct: 76.49,
        estMaxAcInputW: 11008.67, psuRedundantOutputW: 27500, headroomW: 17041.76, psuUtilizationPct: 38.03,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 37561.59, acPerGpuKw: 1.376,
        nodesPerRackPower: 2, nodesPerRackSpace: 14, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 22.02,
      },
    ],
    openQuestions: [
      { item: "XE9780L nodes per 33 kW power shelf", why: "Shelf capacity is shared — per-node headroom in the scenarios is shelf-level", resolveBy: "Dell IR7000 rack design guide" },
      { item: "Which chassis take B200: the XE9780L GPU row says 'B200 on XE9780L only' while the XE9780 row also lists B200", why: "Sources conflict on B200 availability by chassis", resolveBy: "Dell configurator / XE series AI spec sheet" },
      { item: "B200 availability window as B300 ramps", why: "Procurement", resolveBy: "Dell configurator" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "OEM power calculators: Dell EIPT" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "D1", label: "Dell - PowerEdge XE series AI spec sheet (Rev A07)", url: "https://www.delltechnologies.com/asset/en-us/products/servers/technical-support/poweredge-xe-ai-spec-sheet.pdf" },
      { id: "D2", label: "Dell - PowerEdge XE9780 product page (dell.com)", url: "https://www.dell.com/en-us/shop/ipovw/poweredge-xe9780" },
      { id: "D5", label: "Dell - AI Factory with NVIDIA press release (19 May 2025)", url: "https://www.dell.com/en-us/dt/corporate/newsroom/announcements/detailpage.press-releases~usa~2025~05~dell-technologies-and-nvidia-unveil-next-generation-enterprise-ai-solutions.htm" },
    ],
    sourceNote: "Compiled from Dell's public XE series AI spec sheet, XE9780 product page, and AI Factory announcement (Sep 2026). Re-verify against delltechnologies.com before using in a bid.",
  },

  // ── HPE ──────────────────────────────────────────────────────────────────────
  {
    id: "hpe-dl380a-gen12",
    oem: "HPE",
    model: "ProLiant Compute DL380a Gen12",
    gpuIds: ["rtx-pro-6000", "h200-nvl", "l4"],
    tagline: "Up to 8× RTX PRO 6000 in 4U with separate GPU power domains and iLO 7",
    positioning: "HPE's primary air-cooled dense PCIe GPU platform: up to 8× RTX PRO 6000 BSE in 4U with separate GPU power domains and iLO 7. StorageReview's validated 4-GPU / 5× 2400 W build is the sensible starting point.",
    formFactor: "4U, 2-socket rack",
    rackUnits: 4,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "HPE ProLiant Compute DL380a Gen12" },
        { label: "CTO base SKUs", value: "P74461-B21 (8DW, iLO 6 — not upgradable to iLO 7); P76706-B21 (8DW/16SW)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Up to 2× Intel Xeon 6; up to 144 cores at 250 W (E-core 6700E) — P-core 6700P options also offered" },
        { label: "Socket", value: "LGA-4710 (6700/6500 platform)" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / speed", value: "32 DDR5 DIMMs, up to 6400 MT/s" },
        { label: "Max capacity", value: "Up to 4 TB per the HPE store — 8 TB per the reseller part list (sources disagree)" },
      ] },
      { section: "GPU", rows: [
        { label: "Supported configurations", value: "Up to 16 single-wide NVIDIA L4, or 10 double-wide L40S/H100 NVL/H200 NVL, or 8 double-wide RTX PRO 6000 BSE" },
        { label: "Per-GPU power", value: "Double-wide GPUs up to 600 W each" },
        { label: "GPU interconnect", value: "NVIDIA 4-way NVLink bridge between neighbouring GPUs (H100/H200 NVL); PCIe Gen5 switch boards and captive risers" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "Up to 6× PCIe Gen5 x16 + 2× OCP 3.0 (rear)" },
      ] },
      { section: "Storage", rows: [
        { label: "Front bays", value: "8× SFF NVMe or 16× EDSFF E3.S; plus 2× NVMe boot (NS204i-u v2)" },
      ] },
      { section: "Power", rows: [
        { label: "PSU family", value: "HPE M-CRPS Titanium hot-plug: 1500 W / 2400 W / 3200 W; up to 96% efficiency" },
        { label: "PSU count", value: "Up to 8 PSUs" },
        { label: "Power domains", value: "Three power domains — two with six PSUs dedicated to GPUs" },
        { label: "Heat (2400 W PSU)", value: "8,572 BTU/hr @200 VAC · 8,540 @220 VAC · 8,539 @240 VAC" },
        { label: "Heat (3200 W PSU)", value: "10,577 BTU/hr @200 VAC · 11,713 @220 VAC · 11,699 @240 VAC" },
      ] },
      { section: "Cooling", rows: [
        { label: "Method", value: "Air-cooled; optional Direct Liquid Cooling (DLC)" },
        { label: "Fans", value: "4 hot-plug fan assemblies" },
      ] },
      { section: "Environment", rows: [
        { label: "Inlet temperature", value: "10-35 °C at sea level; derate 1.0 °C per 305 m to 3,050 m; extended 5-40 °C for approved configurations; performance may reduce above 30 °C with a fan fault" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "HPE iLO 7 (iLO 6 on P74461-B21); Silicon Root of Trust; detachable DC-MHS iLO module" },
      ] },
      { section: "Physical", rows: [
        { label: "Dimensions / weight", value: "Not captured in retrieved sources" },
      ] },
    ],
    components: [
      { subsystem: "Processor", component: "Intel Xeon 6 (6700P P-core or 6700E E-core)", partCode: "CTO", maxQty: "2", note: "E-core parts have no AMX — pick P-core for host-side AMX inference" },
      { subsystem: "Memory", component: "DDR5 RDIMM", partCode: "CTO", maxQty: "32", spec: "Up to 6400 MT/s" },
      { subsystem: "GPU", component: "NVIDIA RTX PRO 6000 Blackwell 96GB PCIe", partCode: "S6A73C", maxQty: "8", spec: "600 W DW" },
      { subsystem: "GPU", component: "NVIDIA RTX PRO 6000D Blackwell 48GB PCIe", partCode: "S6W21C", maxQty: "8", spec: "Regional variant" },
      { subsystem: "GPU", component: "NVIDIA H200 NVL 141GB PCIe", partCode: "S3U30C", maxQty: "10", spec: "600 W DW" },
      { subsystem: "GPU", component: "NVIDIA 2-way NVLink Bridge for H200 NVL", partCode: "S4A90C" },
      { subsystem: "GPU", component: "NVIDIA 4-way NVLink Bridge for H200 NVL", partCode: "S4A91C", spec: "900 GB/s" },
      { subsystem: "GPU", component: "HPE NVIDIA L4 SW 24GB 72W", partCode: "S0K89C", maxQty: "16", spec: "72 W SW" },
      { subsystem: "GPU", component: "HPE NVIDIA L40S DW 48GB 300W", partCode: "S2L70C", maxQty: "10" },
      { subsystem: "GPU", component: "HPE NVIDIA L20 48GB 300W", partCode: "S4A92C" },
      { subsystem: "Power", component: "HPE M-CRPS 1500W Titanium Hot Plug PSU Kit", partCode: "P67244-B21", maxQty: "8", spec: "Ships with C13-C14 2 m cord P67847-B21" },
      { subsystem: "Power", component: "HPE M-CRPS 2400W Titanium Hot Plug PSU Kit", partCode: "P67252-B21", maxQty: "8", spec: "C19 only; ships with C19-C20 2 m cord P67845-B21" },
      { subsystem: "Power", component: "HPE M-CRPS 3200W Titanium Hot Plug PSU Kit", partCode: "P67248-B21", maxQty: "8", spec: "C19 only" },
      { subsystem: "Power", component: "PDB kit", maxQty: "1", note: "Required on P74461-B21 when >5 PSUs" },
      { subsystem: "Boot", component: "HPE NS204i-u v2 Boot Optimized Storage Device", maxQty: "1", spec: "2× NVMe M.2 RAID1" },
      { subsystem: "Management", component: "HPE iLO 7", partCode: "embedded", maxQty: "1" },
    ],
    powerRules: [
      "2400 W or 3200 W PSUs are required for H100/H200 NVL GPUs.",
      "5 PSUs (2 for system board, 3 for GPUs) required for 2 or 4 double-wide GPU configurations.",
      "8 PSUs required for 8 or 10 double-wide GPU configurations.",
      "P74461-B21 (8DW CTO): more than 5 PSUs requires 1× PDB kit; P76706-B21 (8DW/16SW) needs no PDB.",
      "2400 W and 3200 W PSUs support C19/C19-C20 cords only; cord count must match PSU count on P76706-B21.",
      "Three power domains; two domains of six PSUs dedicated to GPUs.",
      "Run HPE Power Advisor before final PSU selection.",
      "Reviewed unit: 4× RTX PRO 6000 (600 W) on five 2400 W PSUs, N+1.",
      "L4 on this chassis: the GPU power domains (up to 6 PSUs dedicated to GPUs) are over-provisioned for L4's 72 W TDP — the 2U HPE DL380 Gen12 (below) is the density choice for L4 specifically, not this 4U chassis.",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "4× RTX PRO 6000 · 5× 2400 W (reviewed build)",
        gpus: 4, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2400, psuInstalled: 5, psuRedundant: 1,
        gpuLoadW: 2400, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 3576, fansVrW: 286.08, estMaxDcLoadW: 3862.08, gpuShareOfDcPct: 62.14,
        estMaxAcInputW: 4065.35, psuRedundantOutputW: 9600, headroomW: 5737.92, psuUtilizationPct: 40.23,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 13870.97, acPerGpuKw: 1.016,
        nodesPerRackPower: 7, nodesPerRackSpace: 9, nodesPerRack: 7, gpusPerRack: 28, rackAcLoadKw: 28.46,
      },
      {
        gpuId: "rtx-pro-6000",
        name: "8× RTX PRO 6000 · 8× 3200 W",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6411, fansVrW: 512.88, estMaxDcLoadW: 6923.88, gpuShareOfDcPct: 69.33,
        estMaxAcInputW: 7288.29, psuRedundantOutputW: 22400, headroomW: 15476.12, psuUtilizationPct: 30.91,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24867.66, acPerGpuKw: 0.911,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.15,
      },
      {
        gpuId: "l4",
        name: "16× L4",
        gpus: 16, gpuW: 72, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 1500, psuInstalled: 5, psuRedundant: 1,
        gpuLoadW: 1152, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 2588, fansVrW: 207.04, estMaxDcLoadW: 2795.04, gpuShareOfDcPct: 41.22,
        estMaxAcInputW: 2942.15, psuRedundantOutputW: 6000, headroomW: 3204.96, psuUtilizationPct: 46.58,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 10038.61, acPerGpuKw: 0.184,
        nodesPerRackPower: 10, nodesPerRackSpace: 9, nodesPerRack: 9, gpusPerRack: 144, rackAcLoadKw: 26.48,
      },
      {
        gpuId: "h200-nvl",
        name: "4× H200 NVL (one 4-way NVLink island) · 5× 3200 W",
        gpus: 4, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 5, psuRedundant: 1,
        gpuLoadW: 2400, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 150,
        componentSubtotalW: 3576, fansVrW: 286.08, estMaxDcLoadW: 3862.08, gpuShareOfDcPct: 62.14,
        estMaxAcInputW: 4065.35, psuRedundantOutputW: 12800, headroomW: 8937.92, psuUtilizationPct: 30.17,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 13870.97, acPerGpuKw: 1.016,
        nodesPerRackPower: 7, nodesPerRackSpace: 9, nodesPerRack: 7, gpusPerRack: 28, rackAcLoadKw: 28.46,
      },
      {
        gpuId: "h200-nvl",
        name: "8× H200 NVL (two 4-way islands) · 8× 3200 W",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 6386, fansVrW: 510.88, estMaxDcLoadW: 6896.88, gpuShareOfDcPct: 69.6,
        estMaxAcInputW: 7259.87, psuRedundantOutputW: 22400, headroomW: 15503.12, psuUtilizationPct: 30.79,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24770.69, acPerGpuKw: 0.907,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 29.04,
      },
      {
        gpuId: "h200-nvl",
        name: "10× H200 NVL (max) · 8× 3200 W",
        gpus: 10, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 1,
        gpuLoadW: 6000, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 50, baseboardW: 250,
        componentSubtotalW: 7536, fansVrW: 602.88, estMaxDcLoadW: 8138.88, gpuShareOfDcPct: 73.72,
        estMaxAcInputW: 8567.24, psuRedundantOutputW: 22400, headroomW: 14261.12, psuUtilizationPct: 36.33,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 29231.43, acPerGpuKw: 0.857,
        nodesPerRackPower: 3, nodesPerRackSpace: 9, nodesPerRack: 3, gpusPerRack: 30, rackAcLoadKw: 25.7,
      },
    ],
    openQuestions: [
      { item: "GPU-domain redundancy policy (is N+1 per domain or per system?)", why: "Determines usable GPU-domain capacity", resolveBy: "HPE Power Advisor / QuickSpecs power section" },
      { item: "DL380a Gen12 dimensions and weight", why: "Rack loading", resolveBy: "QuickSpecs physical section" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "HPE Power Advisor" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "H1", label: "HPE — ProLiant Compute DL380a Gen12 QuickSpecs (a00047453enw)", url: "https://www.hpe.com/psnow/doc/a00047453enw" },
      { id: "H2", label: "HPE — ProLiant Compute DL380a Gen12 product page", url: "https://www.hpe.com/us/en/compute/hpe-proliant-compute/dl380a-gen12.html" },
      { id: "H3", label: "StorageReview — HPE DL380a Gen12 review (24 Nov 2025)", url: "https://www.storagereview.com/review/hpe-proliant-dl380a-gen12-review-air-cooled-4u-server-for-dense-multi-gpu-ai" },
      { id: "H5", label: "Express Computer Systems — DL380a Gen12 configurable part list", url: "https://expresscomputersystems.com/products/hpe-proliant-dl380a-rack-server-gen-12-configurable" },
    ],
    sourceNote: "Compiled from HPE's public QuickSpecs, product page, and StorageReview's validated build review (Sep 2026). Re-verify against hpe.com before using in a bid.",
  },
  {
    id: "hpe-dl380-gen12",
    oem: "HPE",
    model: "ProLiant Compute DL380 Gen12",
    gpuIds: ["l4"],
    tagline: "2U density choice for slot-powered L4 — up to 8 single-wide cards",
    positioning: "HPE's entry path for L4: slot-powered cards in the 2U DL380 Gen12 (≤8). Ideal for video analytics and embeddings. The 4U DL380a Gen12's GPU power domains are over-provisioned for L4, so this 2U chassis is the density choice.",
    formFactor: "2U, 2-socket rack",
    rackUnits: 2,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "HPE ProLiant Compute DL380 Gen12" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Intel Xeon 6 (Gen12: up to 144 cores vs. 60 in Gen11)" },
      ] },
      { section: "Memory", rows: [
        { label: "Memory", value: "DDR5 up to 6400 MT/s" },
      ] },
      { section: "GPU", rows: [
        { label: "Supported configurations", value: "Up to 8 single-wide L4, or 3 double-wide L40S/H100 NVL/RTX PRO 6000 BSE" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "iLO 7, FIPS 140-3 L3, quantum-resistant security" },
      ] },
      { section: "Power", rows: [
        { label: "PSU options", value: "Not captured in retrieved sources — run HPE Power Advisor / QuickSpecs" },
      ] },
    ],
    components: [
      { subsystem: "GPU", component: "HPE NVIDIA L4 SW 24GB 72W", partCode: "S0K89C", maxQty: "8", spec: "72 W SW, slot-powered" },
    ],
    powerRules: [
      "PSU options/quantities for GPU configurations not captured in retrieved sources.",
    ],
    powerScenarios: [
      {
        gpuId: "l4",
        name: "8× L4 · PSU unpublished",
        gpus: 8, gpuW: 72, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 0, psuInstalled: 0, psuRedundant: 0,
        gpuLoadW: 576, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 50,
        componentSubtotalW: 1652, fansVrW: 132.16, estMaxDcLoadW: 1784.16, gpuShareOfDcPct: 32.28,
        estMaxAcInputW: 1878.06, psuRedundantOutputW: null, headroomW: null, psuUtilizationPct: null,
        redundancyStatus: "PSU data not published", heatLoadBtuHr: 6407.95, acPerGpuKw: 0.235,
        nodesPerRackPower: 15, nodesPerRackSpace: 19, nodesPerRack: 15, gpusPerRack: 120, rackAcLoadKw: 28.17,
      },
    ],
    openQuestions: [
      { item: "DL380 Gen12 PSU rating/quantity for 8× L4", why: "Entry-tier power envelope", resolveBy: "HPE DL380 Gen12 QuickSpecs" },
      { item: "L4 end-of-sale on HPE Gen12", why: "Entry SKU continuity", resolveBy: "HPE QuickSpecs revision history" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "HPE Power Advisor" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "H4", label: "VRLA Tech — HPE ProLiant Gen12 GPU configurations (Jun 2026)", url: "https://vrlatech.com/hp-servers/" },
    ],
    sourceNote: "Compiled from a third-party HPE Gen12 GPU-configuration reference (Sep 2026) — this chassis has the least first-party detail of any system in this set; PSU config is unconfirmed. Re-verify against hpe.com before using in a bid.",
  },

  // ── Lenovo ───────────────────────────────────────────────────────────────────
  {
    id: "lenovo-sr650a-v4",
    oem: "Lenovo",
    model: "ThinkSystem SR650a V4",
    gpuIds: ["rtx-pro-6000"],
    tagline: "Highest GPU-per-RU in the mid tier — 2U, tightest power envelope",
    positioning: "Lenovo's 2U dense PCIe GPU server. Four RTX PRO 6000 only with the 450 W slot-capped SKU (CHWT); two at full 600 W. Highest GPU-per-RU in the mid tier, tightest power envelope.",
    formFactor: "2U, 2-socket rack",
    rackUnits: 2,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Lenovo ThinkSystem SR650a V4 (SR650i V4 = inference configuration)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two Intel Xeon 6700-series or 6500-series P-core; up to 86 cores, ≤350 W" },
      ] },
      { section: "GPU", rows: [
        { label: "Front GPU options", value: "Four 400 W double-wide, or two 600 W double-wide, or eight single-wide GPUs" },
        { label: "RTX PRO 6000 BSE", value: "Slot-capped 450 W SKU (feature CHWT) allows 4× RTX PRO 6000 in this chassis" },
        { label: "Other named GPUs", value: "NVIDIA H100 NVL (4× DW) with NVLink" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "Up to 14× PCIe Gen5 + 2× OCP 3.0" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "8× 2.5\" hot-swap or up to 8× E3.S 1T" },
      ] },
      { section: "Power", rows: [
        { label: "PSU options", value: "800 W / 1300 W / 2000 W / 2700 W / 3200 W depending on configuration" },
      ] },
      { section: "Cooling", rows: [
        { label: "Options", value: "Air; Lenovo Neptune liquid-assist option" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "XClarity Controller" },
      ] },
    ],
    components: [
      { subsystem: "GPU", component: "ThinkSystem RTX PRO 6000 BSE 96GB PCIe Gen5 Passive (Slot Capped at 450W)", partCode: "CHWT", maxQty: "4", spec: "450 W cap" },
    ],
    powerRules: [
      "Front GPUs: 4× 400 W DW, or 2× 600 W DW, or 8× SW.",
      "RTX PRO 6000 BSE slot-capped at 450 W (feature CHWT) enables 4× in this chassis — this conflicts with the general 400 W/slot statement above; confirm with Lenovo before quoting.",
      "PSU options 800/1300/2000/2700/3200 W depending on configuration.",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "4× RTX PRO 6000 @450 W cap · 2× 3200 W (1+1)",
        gpus: 4, gpuW: 450, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 2, psuRedundant: 1,
        gpuLoadW: 1800, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 100,
        componentSubtotalW: 2926, fansVrW: 234.08, estMaxDcLoadW: 3160.08, gpuShareOfDcPct: 56.96,
        estMaxAcInputW: 3326.40, psuRedundantOutputW: 3200, headroomW: 39.92, psuUtilizationPct: 98.75,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 11349.68, acPerGpuKw: 0.832,
        nodesPerRackPower: 9, nodesPerRackSpace: 19, nodesPerRack: 9, gpusPerRack: 36, rackAcLoadKw: 29.94,
      },
      {
        gpuId: "rtx-pro-6000",
        name: "2× RTX PRO 6000 @600 W · 2× 2700 W (1+1)",
        gpus: 2, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 2700, psuInstalled: 2, psuRedundant: 1,
        gpuLoadW: 1200, cpuLoadW: 700, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 50, baseboardW: 100,
        componentSubtotalW: 2326, fansVrW: 186.08, estMaxDcLoadW: 2512.08, gpuShareOfDcPct: 47.77,
        estMaxAcInputW: 2644.29, psuRedundantOutputW: 2700, headroomW: 187.92, psuUtilizationPct: 93.04,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 9022.33, acPerGpuKw: 1.322,
        nodesPerRackPower: 11, nodesPerRackSpace: 19, nodesPerRack: 11, gpusPerRack: 22, rackAcLoadKw: 29.09,
      },
    ],
    openQuestions: [
      { item: "Whether a 4× 450 W config runs fully redundant on 1+1 PSUs or requires CPU/GPU power capping", why: "The 450 W-cap scenario shows very high PSU utilization (98.75%) at 1+1 redundancy", resolveBy: "Lenovo Capacity Planner in DCSC" },
      { item: "H200 NVL / L4 / RTX PRO 4500 support on SR650a V4", why: "Lenovo names these GPUs in other tiers but not confirmed for this chassis", resolveBy: "Lenovo Press LP2128 GPU table" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "Lenovo Capacity Planner" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "L2", label: "Lenovo Press LP2128 — ThinkSystem SR650a V4 / SR650i V4 Product Guide", url: "https://lenovopress.lenovo.com/lp2128-thinksystem-sr650a-v4-server" },
      { id: "L3", label: "Lenovo Press LP2263 — ThinkSystem RTX PRO 6000 BSE GPU Product Guide (13 Aug 2026)", url: "https://lenovopress.lenovo.com/lp2263-thinksystem-nvidia-rtx-pro-6000-blackwell-server-edition-pcie-gen5-gpu" },
      { id: "L5", label: "ITCreations — SR650a V4 listing (PSU options 800-3200W)", url: "https://www.itcreations.com/lenovo/lenovo-thinksystem-sr650a-v4-server" },
    ],
    sourceNote: "Compiled from Lenovo Press product guides and a third-party reseller listing (Sep 2026). The 450 W slot-cap vs. the general 400 W/slot statement is an unresolved conflict — see Open Questions. Re-verify against lenovopress.lenovo.com before using in a bid.",
  },

  {
    id: "lenovo-sr680a-v4",
    oem: "Lenovo",
    model: "ThinkSystem SR680a V4",
    gpuIds: ["b300"],
    tagline: "In-house 8U air-cooled HGX B300 — 3200 W AC vs 3800 W HVAC decided at order time",
    positioning: "Lenovo's in-house 8U air-cooled HGX B300 platform with an explicit Xeon 6700P qualified list and fully published PSU rules. Decide 3200 W AC vs 3800 W HVAC at order time — there is no field upgrade path.",
    formFactor: "8U 19-inch rack, air-cooled; designed in-house by Lenovo",
    rackUnits: 8,
    cpuSocket: "LGA-4710",
    cpuCompatibilityNote: LGA4710_NOTE + " Lenovo-qualified 6700P SKUs: 6740P, 6747P, 6760P, 6767P, 6776P, 6787P — the SKU workbook's 'Good' 6732P is not on Lenovo's list.",
    specSections: [
      { section: "Identity", rows: [
        { label: "Model / MT", value: "Lenovo ThinkSystem SR680a V4, machine type 7DMK (CTO 7DMKCTO1WW), base feature CBAD" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Two Intel Xeon 6700P-series (Granite Rapids); up to 86C/172T, up to 2.7 GHz base, ≤350 W; 1-CPU configs not supported" },
        { label: "PCIe lanes", value: "88 per CPU; UPI 2.0 ×4 @ 24 GT/s" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / speed", value: "32 DIMMs (16 per CPU, 8 ch × 2 DPC); 6400 MHz at 1 DPC, 5200 MHz at 2 DPC; 4 TB max (32× 128 GB); all DIMMs identical" },
        { label: "RAS", value: "ECC, SDDC, ADDDC, mirroring, Post Package Repair" },
      ] },
      { section: "GPU", rows: [
        { label: "Complex", value: "NVIDIA HGX B300 NVL8 1100 W 8-GPU board (feature CBAG); 288 GB HBM3e per GPU" },
        { label: "Interconnect", value: "NVLink full mesh 1.8 TB/s per GPU (links 128 GB/s bidirectional); PCIe Gen6 x16 per GPU (256 GB/s) to CX-8" },
      ] },
      { section: "Network", rows: [
        { label: "E-W", value: "8× OSFP 800 Gb/s (front), via 8 integrated ConnectX-8 switches on PCIe 6.0 x16" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "4× PCIe 5.0 x16 FHHL (2 per CPU) + 1× OCP 3.0 (PCIe 5.0 x16, CPU 1); all front" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "8× 2.5\" hot-swap PCIe 5.0 x4 NVMe (onboard, JBOD, no VROC); 122.88 TB max" },
        { label: "Boot", value: "2× front hot-swap M.2 with integrated Broadcom RAID (B550p-2HS / B540p-2HS)" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "6 or 8 hot-swap CRPS Premium: 3200 W AC (230 V only; N+1) or 3800 W HVAC/HVDC (N+1; N+N with 8 PSUs and >249 VAC / >260 VDC); 80 PLUS Titanium" },
        { label: "Field upgrade", value: "3200 W → 3800 W field upgrade NOT supported (internal power architecture differs) - decide at order" },
        { label: "Standby mode", value: "Zero-output / cold-redundancy mode not supported" },
        { label: "Connectors", value: "3200 W: C19 · 3800 W: Anderson 2007G" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "6× front 60 mm dual-rotor (≤20.9k RPM, CPU shuttle) + 15× rear 80 mm dual-rotor (≤19.5k RPM, GPU/drives/PCIe switches), N+1; one fan per PSU; front-to-rear" },
      ] },
      { section: "Physical", rows: [
        { label: "Dimensions", value: "447 mm W × 351 mm H × 924 mm D" },
        { label: "Max weight", value: "124.7 kg (275 lb) - material lift required" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "XClarity Controller 3 Premier (AST2600, OpenBMC); PFR hardware RoT; TPM 2.0; power capping; XClarity Energy Manager licence" },
      ] },
      { section: "Ports", rows: [
        { label: "Front only", value: "4× USB 3 (5 Gb/s), 1× VGA, 1× 1GbE XCC; no rear ports" },
      ] },
      { section: "OS", rows: [
        { label: "Supported", value: "RHEL, Ubuntu Server" },
      ] },
      { section: "Warranty", rows: [
        { label: "Base", value: "3-year CRU + onsite, 9×5 NBD" },
      ] },
    ],
    components: [
      { subsystem: "Processor", component: "Intel Xeon 6740P 48C 270W 2.1GHz", partCode: "C5R3", maxQty: "2", spec: "288 MB L3; no MRDIMM" },
      { subsystem: "Processor", component: "Intel Xeon 6747P 48C 330W 2.7GHz", partCode: "C5R8", maxQty: "2", spec: "MRDIMM 8000", note: "Workbook row 77" },
      { subsystem: "Processor", component: "Intel Xeon 6760P 64C 330W 2.2GHz", partCode: "C5R1", maxQty: "2" },
      { subsystem: "Processor", component: "Intel Xeon 6767P 64C 350W 2.4GHz", partCode: "C5QY", maxQty: "2", spec: "4× QAT/DLB/DSA/IAA", note: "Workbook row 80" },
      { subsystem: "Processor", component: "Intel Xeon 6776P 64C 350W 2.3GHz", partCode: "CC06", maxQty: "2", spec: "2× accelerators", note: "Workbook row 82" },
      { subsystem: "Processor", component: "Intel Xeon 6787P 86C 350W 2.0GHz", partCode: "C5QM", maxQty: "2", note: "Workbook row 86" },
      { subsystem: "Memory", component: "64GB TruDDR5 6400 2Rx4 RDIMM", partCode: "C0TQ / 4X77A90966", maxQty: "32" },
      { subsystem: "Memory", component: "96GB TruDDR5 6400 2Rx4 RDIMM", partCode: "BZ7D / 4X77A90997", maxQty: "32" },
      { subsystem: "Memory", component: "128GB TruDDR5 6400 2Rx4 RDIMM", partCode: "C0U1 / 4X77A90993", maxQty: "32", spec: "16 or 32" },
      { subsystem: "GPU", component: "ThinkSystem NVIDIA HGX B300 NVL8 1100W 8-GPU Board", partCode: "CBAG", maxQty: "1" },
      { subsystem: "Storage", component: "2U V4 8×2.5\" NVMe backplane", partCode: "C46P", maxQty: "1", spec: "Required" },
      { subsystem: "Storage", component: "U.2 PM9D3a 15.36TB RI NVMe Gen5", partCode: "C1WL / 4XB7A93095", maxQty: "8", note: "Largest listed" },
      { subsystem: "Boot", component: "M.2 RAID B550p-2HS NVMe enablement kit", partCode: "CCCZ", maxQty: "1" },
      { subsystem: "Boot", component: "M.2 VA 960GB / 1.92TB RI NVMe HS", partCode: "C287 / C288", maxQty: "2" },
      { subsystem: "Network", component: "Transceiver 800G XDR OSFP SM Solo", partCode: "CCVE / 4TC7B10008", maxQty: "8", spec: "NVIDIA 980-9IAT0-00XM00" },
      { subsystem: "Network", component: "Transceiver NDRx2 OSFP800 IB MM Twin", partCode: "BQMJ / 4TC7A83365", maxQty: "8", spec: "NVIDIA 980-9I51A-00NS00" },
      { subsystem: "Network", component: "BlueField-3 B3240 2P 400G Gen5 x16 crypto", partCode: "C4GD / 4XC7A96568", maxQty: "2", spec: "Slots 2,4; needs power cable C9K3" },
      { subsystem: "Network", component: "BlueField-3 B3220 2P 200G", partCode: "BVBG / 4XC7A87752", maxQty: "2", spec: "Slots 2,5" },
      { subsystem: "Network", component: "ConnectX-7 NDR400 OSFP 1P", partCode: "C51C / 4XC7A95508", maxQty: "4" },
      { subsystem: "Network", component: "Broadcom 57608 2×200/1×400GbE", partCode: "C4GA / 4XC7A95572", maxQty: "4" },
      { subsystem: "Network", component: "OCP ConnectX-6 Dx 100GbE 2P", partCode: "C62H / 4XC7A99190", maxQty: "1" },
      { subsystem: "Power", component: "3200W 230V Titanium CRPS Premium PSU", partCode: "CBAF / 4P57A89417", maxQty: "8", spec: "N+1; C19; 230 V only" },
      { subsystem: "Power", component: "3800W HVAC/HVDC Titanium CRPS Premium PSU", partCode: "CBAE / 4P57B06189", maxQty: "8", spec: "N+1 / N+N; 2007G" },
      { subsystem: "Cooling", component: "Front fan", partCode: "C9JR", maxQty: "6", spec: "60 mm dual-rotor" },
      { subsystem: "Cooling", component: "Rear fan", partCode: "C1FG", maxQty: "15", spec: "80 mm dual-rotor" },
    ],
    powerRules: [
      "3200 W AC PSU: 230 V only (no 115 V); N+1 with 6 or 8 PSUs",
      "3800 W HVAC/HVDC PSU: N+1 with 6 or 8 PSUs; N+N only with 8 PSUs AND input >249 VAC or >260 VDC",
      "Field upgrade from 3200 W to 3800 W PSUs is NOT supported - choose at order time",
      "All PSUs must be identical; zero-output (cold redundancy) mode not supported",
      "DCSC configurator computes power via Lenovo Capacity Planner - use it for the final PSU choice",
      "Connectors: C19 (3200 W) or Anderson 2007G (3800 W); cords not included with PSU options",
    ],
    powerScenarios: [
      {
        gpuId: "b300",
        name: "8× 3200 W AC, N+1 (230 V)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 8, psuRedundant: 1,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11186, fansVrW: 1118.6, estMaxDcLoadW: 12304.6, gpuShareOfDcPct: 71.52,
        estMaxAcInputW: 12952.21, psuRedundantOutputW: 22400, headroomW: 10095.4, psuUtilizationPct: 54.93,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 44192.94, acPerGpuKw: 1.619,
        nodesPerRackPower: 2, nodesPerRackSpace: 4, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.9,
      },
      {
        gpuId: "b300",
        name: "8× 3800 W HVAC, N+N (>249 VAC)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3800, psuInstalled: 8, psuRedundant: 4,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11186, fansVrW: 1118.6, estMaxDcLoadW: 12304.6, gpuShareOfDcPct: 71.52,
        estMaxAcInputW: 12952.21, psuRedundantOutputW: 15200, headroomW: 2895.4, psuUtilizationPct: 80.95,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 44192.94, acPerGpuKw: 1.619,
        nodesPerRackPower: 2, nodesPerRackSpace: 4, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.9,
      },
      {
        gpuId: "b300",
        name: "6× 3200 W AC, N+1",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 6, psuRedundant: 1,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 216, networkLoadW: 150, baseboardW: 1000,
        componentSubtotalW: 11186, fansVrW: 1118.6, estMaxDcLoadW: 12304.6, gpuShareOfDcPct: 71.52,
        estMaxAcInputW: 12952.21, psuRedundantOutputW: 16000, headroomW: 3695.4, psuUtilizationPct: 76.9,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 44192.94, acPerGpuKw: 1.619,
        nodesPerRackPower: 2, nodesPerRackSpace: 4, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.9,
      },
    ],
    openQuestions: [
      { item: "SR680a V4 physical & electrical section (max input power, inrush, operating environment) not retrieved", why: "Facility sizing", resolveBy: "Lenovo Press LP2264 PDF p.~55" },
      { item: "Only 6700P SKUs are qualified — the SKU workbook's 'Good' 6732P is not on the list", why: "Host CPU choice", resolveBy: "LP2264 Table 5" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "Lenovo Capacity Planner" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "L1", label: "Lenovo Press LP2264 - ThinkSystem SR680a V4 Product Guide (updated 28 Aug 2026)", url: "https://lenovopress.lenovo.com/lp2264-thinksystem-sr680a-v4-server" },
    ],
    sourceNote: "Compiled from Lenovo Press LP2264 (updated 28 Aug 2026). Re-verify against lenovopress.lenovo.com before using in a bid.",
  },

  // ── MSI (2 chassis) ─────────────────────────────────────────────────────────
  {
    id: "msi-cg480-s5063",
    oem: "MSI",
    model: "CG480-S5063",
    gpuIds: ["rtx-pro-6000", "h200-nvl"],
    tagline: "NVIDIA MGX modular 4U, 2× Xeon 6, 8 GPUs, 2-8-5-200 topology",
    positioning: "MSI's NVIDIA MGX RTX PRO Server: 4U, 2× Xeon 6, 8 GPUs, 2-8-5-200 topology. The most published detail on power and environment among MSI's MGX builds.",
    formFactor: "4U, NVIDIA MGX modular architecture",
    rackUnits: 4,
    cpuSocket: "LGA-4710 (Socket E2)",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "MSI CG480-S5063 (S5063G480RAE20), board MS-S405; NVIDIA-Certified" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Dual Intel Xeon 6700E/6500P/6700P, TDP ≤350 W; 2 air-cooling modules" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / speed", value: "32 DDR5 RDIMM/MRDIMM, 8 ch per CPU (2 DPC); 6400 MT/s at 1 DPC, 5200 MT/s at 2 DPC; up to 8 TB" },
      ] },
      { section: "GPU", rows: [
        { label: "Capacity", value: "Up to 8 double-wide PCIe GPUs ≤600 W: RTX PRO 6000 BSE or H200 NVL" },
        { label: "Topology", value: "2-8-5-200 CPU:GPU:NIC; PCIe switch board" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "Up to 13 PCIe 5.0 x16" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "20× hot-swap E1.S PCIe 5.0 x4 NVMe" },
      ] },
      { section: "Network", rows: [
        { label: "LAN", value: "2× 10GBase-T (Intel X710-AT2, NCSI) + 1× 1GbE BMC" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "(3+1) redundant 3200 W CRPS, 80 PLUS Titanium" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "10× 8080 hot-swap (5 upper for GPU, 5 lower for CPU)" },
      ] },
      { section: "Environment", rows: [
        { label: "Temperature", value: "Operating 0-35 °C; non-operating -20 to 70 °C; 5-85% RH non-condensing" },
      ] },
      { section: "Management", rows: [
        { label: "BMC", value: "ASPEED AST2600, IPMI 2.0, Redfish; dual BIOS & BMC; TPM 2.0; optional hardware RoT" },
      ] },
      { section: "Regulatory", rows: [
        { label: "Certs", value: "FCC Class A, CE" },
      ] },
    ],
    components: [
      { subsystem: "Power", component: "3200 W CRPS Titanium PSU", maxQty: "4", spec: "3+1" },
      { subsystem: "Cooling", component: "8080 hot-swap fan", maxQty: "10" },
      { subsystem: "Storage", component: "E1.S PCIe 5.0 x4 NVMe bay", maxQty: "20" },
      { subsystem: "Board", component: "PCIe switch board", maxQty: "1" },
    ],
    powerRules: [
      "(3+1) redundant 3200 W CRPS Titanium → 9.6 kW redundant output.",
      "Operating temperature 0-35 °C.",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "CG480 · 8× RTX PRO 6000 BSE · 4× 3200 W (3+1)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 4, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 160, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6355, fansVrW: 508.40, estMaxDcLoadW: 6863.40, gpuShareOfDcPct: 69.94,
        estMaxAcInputW: 7224.63, psuRedundantOutputW: 9600, headroomW: 2736.60, psuUtilizationPct: 71.49,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24650.44, acPerGpuKw: 0.903,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 28.90,
      },
      {
        gpuId: "h200-nvl",
        name: "CG480 · 8× H200 NVL · 4× 3200 W (3+1)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 3200, psuInstalled: 4, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 160, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6355, fansVrW: 508.4, estMaxDcLoadW: 6863.4, gpuShareOfDcPct: 69.94,
        estMaxAcInputW: 7224.63, psuRedundantOutputW: 9600, headroomW: 2736.6, psuUtilizationPct: 71.49,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 24650.44, acPerGpuKw: 0.903,
        nodesPerRackPower: 4, nodesPerRackSpace: 9, nodesPerRack: 4, gpusPerRack: 32, rackAcLoadKw: 28.9,
      },
    ],
    openQuestions: [
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "MSI sales tools" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "M1", label: "MSI — CG480-S5063 specification sheet (Version D, 14 Jul 2026)", url: "https://download-2.msi.com/archive/mnu_exe/server/CG480-S5063-Version-D07142026.pdf" },
      { id: "M2", label: "MSI — CG480-S5063 product page", url: "https://eps.msi.com/en/product/barebones/S5063G480RAE20" },
      { id: "M3", label: "MSI — RTX PRO Server lineup press release (26 Aug 2025)", url: "https://www.msi.com/news/detail/MSI-Expands-NVIDIA-RTX-PRO-Server-Lineup---Accelerated-by-RTX-PRO-6000-Blackwell-Server-Edition-GPU-146930" },
      { id: "M5", label: "MSI — CG480-S5063 Quick Start Guide", url: "https://download-2.msi.com/archive/mnu_exe/server/S405-CG480-S5063-v1.0-QG.pdf" },
    ],
    sourceNote: "Compiled from MSI's public specification sheet, product page, and Quick Start Guide (Sep 2026). Re-verify against msi.com before using in a bid.",
  },
  {
    id: "msi-cg290-s3063",
    oem: "MSI",
    model: "CG290-S3063",
    gpuIds: ["rtx-pro-6000", "h200-nvl"],
    tagline: "NVIDIA MGX 2U, single Xeon 6, 4 GPUs, 1-4-3 topology",
    positioning: "MSI's compact MGX build: 2U, 1× Xeon 6, 4 GPUs, 1-4-3 topology. Power and CPU socket are unpublished in retrieved sources — treat this one as directional only until confirmed.",
    formFactor: "2U, NVIDIA MGX",
    rackUnits: 2,
    cpuSocket: "Unverified (single Xeon 6)",
    cpuCompatibilityNote: "Socket not confirmed in retrieved sources — MSI names a single Xeon 6 but doesn't publish which socket/series. Don't assume LGA-4710 or LGA-7529 compatibility until confirmed with MSI.",
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "MSI CG290-S3063" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Single Intel Xeon 6" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots", value: "Up to 16 DDR5 DIMM" },
      ] },
      { section: "GPU", rows: [
        { label: "Capacity", value: "Four FHFL double-wide GPUs (RTX PRO 6000 BSE / H200 NVL); 1-4-3 topology; up to 8 PCIe 5.0 x16 slots" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "4× rear PCIe 5.0 U.2 NVMe + 2× M.2" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "Not captured in retrieved sources" },
      ] },
    ],
    components: [],
    powerRules: [
      "PSU configuration not captured in retrieved sources.",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "CG290 · 4× RTX PRO 6000 BSE · PSU unpublished",
        gpus: 4, gpuW: 600, cpuCount: 1, cpuTdpW: 350,
        psuRatingW: 0, psuInstalled: 0, psuRedundant: 0,
        gpuLoadW: 2400, cpuLoadW: 350, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 75, baseboardW: 150,
        componentSubtotalW: 3251, fansVrW: 260.08, estMaxDcLoadW: 3511.08, gpuShareOfDcPct: 68.36,
        estMaxAcInputW: 3695.87, psuRedundantOutputW: null, headroomW: null, psuUtilizationPct: null,
        redundancyStatus: "PSU data not published", heatLoadBtuHr: 12610.32, acPerGpuKw: 0.924,
        nodesPerRackPower: 8, nodesPerRackSpace: 19, nodesPerRack: 8, gpusPerRack: 32, rackAcLoadKw: 29.57,
      },
      {
        gpuId: "h200-nvl",
        name: "CG290 · 4× H200 NVL · PSU unpublished",
        gpus: 4, gpuW: 600, cpuCount: 1, cpuTdpW: 350,
        psuRatingW: 0, psuInstalled: 0, psuRedundant: 0,
        gpuLoadW: 2400, cpuLoadW: 350, memoryLoadW: 160, storageLoadW: 116, networkLoadW: 75, baseboardW: 150,
        componentSubtotalW: 3251, fansVrW: 260.08, estMaxDcLoadW: 3511.08, gpuShareOfDcPct: 68.36,
        estMaxAcInputW: 3695.87, psuRedundantOutputW: null, headroomW: null, psuUtilizationPct: null,
        redundancyStatus: "PSU data not published", heatLoadBtuHr: 12610.32, acPerGpuKw: 0.924,
        nodesPerRackPower: 8, nodesPerRackSpace: 19, nodesPerRack: 8, gpusPerRack: 32, rackAcLoadKw: 29.57,
      },
    ],
    openQuestions: [
      { item: "CG290-S3063 PSU and CPU socket", why: "Cannot close the power budget or confirm CPU-host compatibility without these", resolveBy: "MSI CG290-S3063 spec sheet" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "MSI sales tools" },
    ],
    sources: [
      { id: "M3", label: "MSI — RTX PRO Server lineup press release (26 Aug 2025)", url: "https://www.msi.com/news/detail/MSI-Expands-NVIDIA-RTX-PRO-Server-Lineup---Accelerated-by-RTX-PRO-6000-Blackwell-Server-Edition-GPU-146930" },
      { id: "M4", label: "MSI — NVIDIA MGX landing page", url: "https://www.msi.com/Landing/NVIDIA-MGX" },
    ],
    sourceNote: "Compiled from MSI's press release and MGX landing page (Sep 2026) — this chassis has the least published detail of any system in this set; PSU and CPU socket are unconfirmed. Re-verify against msi.com before using in a bid.",
  },

  // ── Supermicro ───────────────────────────────────────────────────────────────
  {
    id: "supermicro-sys-522ga-nrt",
    oem: "Supermicro",
    model: "SYS-522GA-NRT",
    gpuIds: ["rtx-pro-6000", "rtx-pro-4500", "h200-nvl"],
    tagline: "The only 6900P (LGA-7529) GPU host in this set — 8 DW GPUs, 24 NVMe bays",
    positioning: "The only 6900P (LGA-7529) GPU host in this library — the platform where the SKU workbook's 6960P/6962P rows apply. 8 DW or 10 SW GPUs, 24 NVMe bays, MRDIMM-8800.",
    formFactor: "5U rackmount, dual-root PCIe",
    rackUnits: 5,
    cpuSocket: "LGA-7529 (Socket BR)",
    cpuCompatibilityNote: LGA7529_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Supermicro GPU SuperServer SYS-522GA-NRT (X14; chassis CSE-528G2TS-R5K40P, board X14DBG-AP)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Dual Intel Xeon 6900 series P-cores, up to 128C/256T, up to 504 MB cache, ≤500 W (air); Socket BR LGA-7529" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "24 DIMM; up to 6 TB DDR5-6400 RDIMM or DDR5-8800 MRDIMM (1 DPC)" },
      ] },
      { section: "GPU", rows: [
        { label: "Capacity", value: "Up to 8 double-width or 10 single-width GPUs; PCIe 5.0 x16 switch, dual-root; optional NVLink bridge" },
        { label: "Supported NVIDIA", value: "RTX PRO 4500 BSE, RTX PRO 6000 BSE (datasheet); H200 NVL (EU eStore)" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "Up to 13 PCIe 5.0 x16 FHFL" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "24× front hot-swap 2.5\" PCIe 5.0 NVMe; 2× M.2 NVMe" },
      ] },
      { section: "Network", rows: [
        { label: "LAN", value: "2× RJ45 10GbE" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "6× 2700 W redundant Titanium" },
        { label: "Rack reference", value: "4-node rack at 36.6 kW (SYS-522GA-TNR variant, RTX PRO 6000 AI Factory datasheet)" },
      ] },
      { section: "Cooling", rows: [
        { label: "Fans", value: "10 heavy-duty PWM fans with air shroud" },
      ] },
      { section: "Physical", rows: [
        { label: "Enclosure", value: "438 × 222.5 × 786.1 mm (17.2\" × 8.75\" × 31\")" },
      ] },
      { section: "Security", rows: [
        { label: "Features", value: "TPM 2.0, Secure Boot, NIST 800-193 Silicon RoT, signed firmware, system lockdown" },
      ] },
    ],
    components: [
      { subsystem: "Power", component: "2700 W Titanium PSU", maxQty: "6" },
      { subsystem: "Storage", component: "2.5\" PCIe 5.0 NVMe", maxQty: "24" },
      { subsystem: "Memory", component: "DDR5 RDIMM / MRDIMM", maxQty: "24", spec: "6400 / 8800" },
    ],
    powerRules: [
      "6× 2700 W Titanium; redundancy scheme not stated in retrieved sources.",
      "Supermicro's own RTX PRO 6000 AI Factory reference cites 4 nodes/rack at 36.6 kW (≈9.15 kW/node) — above a 3+3 × 2700 W = 8.1 kW envelope, implying N+1-class operation at full load.",
      "RTX PRO 4500 on this chassis: a 6900P host is oversized for an entry-tier GPU — treat this as a mixed CPU-heavy + light-GPU node, not a GPU-density play.",
      "H200 NVL on this chassis: listed on Supermicro's EU eStore but not on the US datasheet GPU list — confirm before ordering. On 3+3 × 2700 W the 8× H200 NVL build runs at ~88% PSU utilization; the 5+1 scheme gives real headroom.",
    ],
    powerScenarios: [
      {
        gpuId: "rtx-pro-6000",
        name: "8× RTX PRO 6000 · 6× 2700 W (3+3 assumed)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 500,
        psuRatingW: 2700, psuInstalled: 6, psuRedundant: 3,
        gpuLoadW: 4800, cpuLoadW: 1000, memoryLoadW: 240, storageLoadW: 216, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6631, fansVrW: 530.48, estMaxDcLoadW: 7161.48, gpuShareOfDcPct: 67.03,
        estMaxAcInputW: 7538.40, psuRedundantOutputW: 8100, headroomW: 938.52, psuUtilizationPct: 88.41,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 25721.02, acPerGpuKw: 0.942,
        nodesPerRackPower: 3, nodesPerRackSpace: 7, nodesPerRack: 3, gpusPerRack: 24, rackAcLoadKw: 22.62,
      },
      {
        gpuId: "rtx-pro-6000",
        name: "8× RTX PRO 6000 · 6× 2700 W (5+1 assumed)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 500,
        psuRatingW: 2700, psuInstalled: 6, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 1000, memoryLoadW: 240, storageLoadW: 216, networkLoadW: 125, baseboardW: 250,
        componentSubtotalW: 6631, fansVrW: 530.48, estMaxDcLoadW: 7161.48, gpuShareOfDcPct: 67.03,
        estMaxAcInputW: 7538.40, psuRedundantOutputW: 13500, headroomW: 6338.52, psuUtilizationPct: 53.05,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 25721.02, acPerGpuKw: 0.942,
        nodesPerRackPower: 3, nodesPerRackSpace: 7, nodesPerRack: 3, gpusPerRack: 24, rackAcLoadKw: 22.62,
      },
      {
        gpuId: "rtx-pro-4500",
        name: "10× RTX PRO 4500 (SW max) · 6× 2700 W (3+3 assumed)",
        gpus: 10, gpuW: 165, cpuCount: 2, cpuTdpW: 500,
        psuRatingW: 2700, psuInstalled: 6, psuRedundant: 3,
        gpuLoadW: 1650, cpuLoadW: 1000, memoryLoadW: 240, storageLoadW: 216, networkLoadW: 50, baseboardW: 250,
        componentSubtotalW: 3406, fansVrW: 272.48, estMaxDcLoadW: 3678.48, gpuShareOfDcPct: 44.86,
        estMaxAcInputW: 3872.08, psuRedundantOutputW: 8100, headroomW: 4421.52, psuUtilizationPct: 45.41,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 13211.55, acPerGpuKw: 0.387,
        nodesPerRackPower: 7, nodesPerRackSpace: 7, nodesPerRack: 7, gpusPerRack: 70, rackAcLoadKw: 27.10,
      },
      {
        gpuId: "h200-nvl",
        name: "8× H200 NVL · 6× 2700 W (3+3 assumed)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 500,
        psuRatingW: 2700, psuInstalled: 6, psuRedundant: 3,
        gpuLoadW: 4800, cpuLoadW: 1000, memoryLoadW: 240, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 6606, fansVrW: 528.48, estMaxDcLoadW: 7134.48, gpuShareOfDcPct: 67.28,
        estMaxAcInputW: 7509.98, psuRedundantOutputW: 8100, headroomW: 965.52, psuUtilizationPct: 88.08,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 25624.05, acPerGpuKw: 0.939,
        nodesPerRackPower: 3, nodesPerRackSpace: 7, nodesPerRack: 3, gpusPerRack: 24, rackAcLoadKw: 22.53,
      },
      {
        gpuId: "h200-nvl",
        name: "8× H200 NVL · 6× 2700 W (5+1 assumed)",
        gpus: 8, gpuW: 600, cpuCount: 2, cpuTdpW: 500,
        psuRatingW: 2700, psuInstalled: 6, psuRedundant: 1,
        gpuLoadW: 4800, cpuLoadW: 1000, memoryLoadW: 240, storageLoadW: 216, networkLoadW: 100, baseboardW: 250,
        componentSubtotalW: 6606, fansVrW: 528.48, estMaxDcLoadW: 7134.48, gpuShareOfDcPct: 67.28,
        estMaxAcInputW: 7509.98, psuRedundantOutputW: 13500, headroomW: 6365.52, psuUtilizationPct: 52.85,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 25624.05, acPerGpuKw: 0.939,
        nodesPerRackPower: 3, nodesPerRackSpace: 7, nodesPerRack: 3, gpusPerRack: 24, rackAcLoadKw: 22.53,
      },
    ],
    openQuestions: [
      { item: "SYS-522GA-NRT PSU redundancy (3+3 vs N+1)", why: "3+3 caps the node at 8.1 kW output — the scenarios show whether an 8-GPU build fits", resolveBy: "Supermicro datasheet power section / sales engineering" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "Supermicro sales tools" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "This is the one chassis in the set where they ARE installable — 6700-series (6747P, 6732P, 6767P, 6776P*) is NOT installable here", resolveBy: "Adopt socket as first filter in capacity planning" },
      { item: "H200 NVL support on SYS-522GA-NRT", why: "Listed on Supermicro's EU eStore only, not on the US datasheet GPU list", resolveBy: "Supermicro sales engineering / US datasheet GPU list" },
    ],
    sources: [
      { id: "S3", label: "Supermicro — SYS-522GA-NRT datasheet / eStore", url: "https://www.supermicro.com/en/products/system/datasheet/sys-522ga-nrt" },
      { id: "S5", label: "Supermicro — AI Factory with RTX PRO 6000 datasheet (rack power per 4 nodes)", url: "https://www.supermicro.com/datasheet/Datasheet_Supermicro_NVIDIA_AI_Factories_RTX_PRO_6000.pdf" },
      { id: "S6", label: "Wiredzone — SYS-822GS-NB3RT-01-G2 / SYS-522GA-NRT listings", url: "https://www.wiredzone.com/shop/product/10034109-supermicro-sys-822gs-nb3rt-01-g2-hgx-b300-8-gpu-system-16806" },
    ],
    sourceNote: "Compiled from Supermicro's public datasheet/eStore and AI Factory reference (Sep 2026). Re-verify against supermicro.com before using in a bid.",
  },
  {
    id: "supermicro-sys-822gs-nb3rt",
    oem: "Supermicro",
    model: "SYS-822GS-NB3RT",
    gpuIds: ["b300"],
    tagline: "8U air-cooled Xeon HGX B300 — 3+3 × 6600 W, the most power headroom of the air-cooled B300 nodes",
    positioning: "Supermicro's air-cooled Xeon HGX B300 (8U) with published 3+3 × 6600 W — the most power headroom of the air-cooled B300 nodes in this set. A Gold Series build ships in 24 h per Supermicro.",
    formFactor: "8U rackmount, air-cooled, front I/O",
    rackUnits: 8,
    cpuSocket: "LGA-4710 (Socket E2)",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Supermicro GPU SuperServer SYS-822GS-NB3RT (X14); Gold Series SYS-822GS-NB3RT-01-G2" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Dual Intel Xeon 6700 series with P-cores, ≤350 W TDP (store copy says 'up to 128 cores' - conflicts with 86C max for 6700P)" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "32 DDR5 RDIMM; up to 8 TB ECC DDR5-6400 (4 TB at 1 DPC 6400 / 8 TB at 2 DPC 5200 per sister B200 datasheet)" },
      ] },
      { section: "GPU", rows: [
        { label: "Complex", value: "NVIDIA HGX B300 8-GPU, NVLink 5 1.8 TB/s, 2.3 TB HBM3e per system" },
      ] },
      { section: "Network", rows: [
        { label: "E-W", value: "8× NVIDIA ConnectX-8 SuperNICs, up to 800 Gb/s (8× OSFP)" },
        { label: "N-S / LAN", value: "Up to two North/South NICs; 2× 10GbE RJ45; 1× dedicated BMC LAN" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "8× hot-swap E1.S NVMe; 2× M.2 NVMe" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "6× 6600 W redundant (3+3) Titanium" },
      ] },
      { section: "Physical", rows: [
        { label: "Enclosure", value: "449 × 356 × 950 mm (17.6\" × 13.8\" × 37.4\")" },
      ] },
      { section: "Gold config", rows: [
        { label: "-01-G2 build", value: "2× Xeon '6768P' 64C 2.4 GHz (reseller; SKU name unverified), 2 TB DDR5-6400, 1× 960 GB M.2, 8-port 800G IB or 16-port 400GbE" },
      ] },
      { section: "Service", rows: [
        { label: "Onsite", value: "Onsite service required" },
      ] },
    ],
    components: [
      { subsystem: "GPU", component: "NVIDIA HGX B300 8-GPU board", partCode: "onboard", maxQty: "1", spec: "1100 W/GPU" },
      { subsystem: "Network", component: "ConnectX-8 SuperNIC 800G OSFP", partCode: "onboard", maxQty: "8" },
      { subsystem: "Power", component: "6600 W Titanium PSU", maxQty: "6", spec: "3+3" },
      { subsystem: "Storage", component: "E1.S NVMe", maxQty: "8" },
    ],
    powerRules: [
      "6× 6600 W Titanium, redundant 3+3.",
      "Onsite service required.",
    ],
    powerScenarios: [
      {
        gpuId: "b300",
        name: "8× B300 · 6× 6600 W (3+3)",
        gpus: 8, gpuW: 1100, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 6600, psuInstalled: 6, psuRedundant: 3,
        gpuLoadW: 8800, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 176, networkLoadW: 50, baseboardW: 1000,
        componentSubtotalW: 11046, fansVrW: 1104.6, estMaxDcLoadW: 12150.6, gpuShareOfDcPct: 72.42,
        estMaxAcInputW: 12790.11, psuRedundantOutputW: 19800, headroomW: 7649.4, psuUtilizationPct: 61.37,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 43639.84, acPerGpuKw: 1.599,
        nodesPerRackPower: 2, nodesPerRackSpace: 4, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 25.58,
      },
    ],
    openQuestions: [
      { item: "'Up to 128 cores' in the store copy vs the 86C 6700P maximum", why: "Host CPU qualification", resolveBy: "Supermicro datasheet CPU list" },
      { item: "Gold config CPU '6768P' is not an Intel SKU in the workbook", why: "Could be a Supermicro-specific or mistyped SKU", resolveBy: "Supermicro Gold Series BOM" },
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "Supermicro sales tools" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "S1", label: "Supermicro - SYS-822GS-NB3RT datasheet / eStore", url: "https://www.supermicro.com/en/products/system/datasheet/sys-822gs-nb3rt" },
      { id: "S2", label: "Supermicro - SYS-822GS-NBRT datasheet (HGX B200)", url: "https://www.supermicro.com/en/products/system/datasheet/sys-822gs-nbrt" },
      { id: "S6", label: "Wiredzone - SYS-822GS-NB3RT-01-G2 / SYS-522GA-NRT listings", url: "https://www.wiredzone.com/shop/product/10034109-supermicro-sys-822gs-nb3rt-01-g2-hgx-b300-8-gpu-system-16806" },
    ],
    sourceNote: "Compiled from Supermicro's public datasheet/eStore and a Wiredzone reseller listing for the Gold Series build (Sep 2026). Re-verify against supermicro.com before using in a bid.",
  },
  {
    id: "supermicro-sys-822gs-nbrt",
    oem: "Supermicro",
    model: "SYS-822GS-NBRT",
    gpuIds: ["b200"],
    tagline: "Same 8U air-cooled chassis family with HGX B200 — 8 low-profile slots for 400G E-W NICs",
    positioning: "The same 8U air-cooled chassis family with the HGX B200 board: 1000 W GPUs, 8 low-profile PCIe slots for 400G east-west NICs, 3+3 × 6600 W.",
    formFactor: "8U rackmount, air-cooled, front I/O",
    rackUnits: 8,
    cpuSocket: "LGA-4710 (Socket E2)",
    cpuCompatibilityNote: LGA4710_NOTE,
    specSections: [
      { section: "Identity", rows: [
        { label: "Model", value: "Supermicro GPU SuperServer SYS-822GS-NBRT (X14)" },
      ] },
      { section: "Processor", rows: [
        { label: "CPU", value: "Dual Intel Xeon 6700/6500 series P-cores, ≤350 W; up to 86C/172T, up to 336 MB cache; Socket E2 (LGA-4710)" },
      ] },
      { section: "Memory", rows: [
        { label: "Slots / max", value: "32 DIMM; up to 4 TB DDR5-6400 RDIMM (1 DPC) or 8 TB DDR5-5200 (2 DPC)" },
      ] },
      { section: "GPU", rows: [
        { label: "Complex", value: "HGX B200 8-GPU SXM6 (180 GB), 1000 W per GPU, air-cooled, NVLink with NVSwitch; CPU-GPU PCIe 5.0 x16" },
      ] },
      { section: "Expansion", rows: [
        { label: "Slots", value: "Up to 8× PCIe 5.0 x16 LP + 2× PCIe 5.0 x16 FHHL" },
      ] },
      { section: "Storage", rows: [
        { label: "Bays", value: "8× hot-swap E1.S NVMe; 2× M.2 PCIe 5.0 x4 NVMe (RAID via S3808N)" },
      ] },
      { section: "Network", rows: [
        { label: "LAN", value: "2× 10G (X710), 1× IPMI GbE" },
      ] },
      { section: "Power", rows: [
        { label: "PSUs", value: "6× redundant (3+3) 6600 W Titanium" },
      ] },
      { section: "Physical", rows: [
        { label: "Enclosure", value: "449 × 356 × 950 mm" },
      ] },
      { section: "Ports", rows: [
        { label: "Front", value: "1× USB 3.0, 1× USB 2.0, 1× mini-DP" },
      ] },
    ],
    components: [
      { subsystem: "GPU", component: "NVIDIA HGX B200 8-GPU (180 GB)", partCode: "onboard", maxQty: "1", spec: "1000 W/GPU" },
      { subsystem: "Network", component: "PCIe 5.0 x16 LP NIC slots (for 400G E-W)", maxQty: "8" },
      { subsystem: "Power", component: "6600 W Titanium PSU", maxQty: "6", spec: "3+3" },
    ],
    powerRules: [
      "6× 6600 W Titanium, redundant 3+3.",
    ],
    powerScenarios: [
      {
        gpuId: "b200",
        name: "8× B200 · 6× 6600 W (3+3)",
        gpus: 8, gpuW: 1000, cpuCount: 2, cpuTdpW: 350,
        psuRatingW: 6600, psuInstalled: 6, psuRedundant: 3,
        gpuLoadW: 8000, cpuLoadW: 700, memoryLoadW: 320, storageLoadW: 176, networkLoadW: 225, baseboardW: 600,
        componentSubtotalW: 10021, fansVrW: 1002.1, estMaxDcLoadW: 11023.1, gpuShareOfDcPct: 72.57,
        estMaxAcInputW: 11603.26, psuRedundantOutputW: 19800, headroomW: 8776.9, psuUtilizationPct: 55.67,
        redundancyStatus: "OK within redundant capacity", heatLoadBtuHr: 39590.33, acPerGpuKw: 1.45,
        nodesPerRackPower: 2, nodesPerRackSpace: 4, nodesPerRack: 2, gpusPerRack: 16, rackAcLoadKw: 23.21,
      },
    ],
    openQuestions: [
      { item: "Per-DIMM, per-drive, per-NIC and fan power are planning assumptions", why: "Non-GPU load is 15-30% of node power", resolveBy: "Supermicro sales tools" },
      { item: "Workbook CPU SKUs 6960P/6962P are LGA-7529", why: "Not installable in this LGA-4710 chassis — only 6900P platforms (SYS-522GA-NRT, XE9780LAP)", resolveBy: "Adopt socket as first filter in capacity planning" },
    ],
    sources: [
      { id: "S1", label: "Supermicro - SYS-822GS-NB3RT datasheet / eStore", url: "https://www.supermicro.com/en/products/system/datasheet/sys-822gs-nb3rt" },
      { id: "S2", label: "Supermicro - SYS-822GS-NBRT datasheet (HGX B200)", url: "https://www.supermicro.com/en/products/system/datasheet/sys-822gs-nbrt" },
    ],
    sourceNote: "Compiled from Supermicro's public SYS-822GS-NBRT and SYS-822GS-NB3RT datasheets (Sep 2026). Re-verify against supermicro.com before using in a bid.",
  },
];

export function systemsForGpu(gpuId: SystemGpuId): OemSystem[] {
  return OEM_SYSTEMS.filter(s => s.gpuIds.includes(gpuId));
}

export function systemsForOem(oem: OemSystem["oem"], gpuId?: SystemGpuId): OemSystem[] {
  return OEM_SYSTEMS.filter(s => s.oem === oem && (!gpuId || s.gpuIds.includes(gpuId)));
}

/** Scenarios on this system that apply to a specific GPU — a chassis carrying several GPUs
 *  (e.g. Dell XE7740) has scenarios for each mixed together in `powerScenarios`. */
export function scenariosForGpu(system: OemSystem, gpuId: SystemGpuId): PowerScenario[] {
  return system.powerScenarios.filter(s => s.gpuId === gpuId);
}

export const OEM_ORDER: OemSystem["oem"][] = ["Cisco", "Dell", "HPE", "Lenovo", "MSI", "Supermicro"];
