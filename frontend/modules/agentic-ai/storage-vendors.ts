// Vendor mapping across storage classes
// Based on the storage class vendor landscape reference table

export interface VendorMapping {
  name: string;
  platform: string; // The full platform name (e.g., "NetApp AFF / ONTAP")
  mapping: string[]; // Storage class codes this vendor maps to, e.g. ["C0", "C2"]
  description: string; // Natural center of gravity
  intelMapping?: string; // Intel silicon stickiness: instructions, accelerators, CXL, runtime libraries
}

export const STORAGE_VENDORS: VendorMapping[] = [
  // C2 - Shared hot storage
  {
    name: "NetApp AFF / ONTAP",
    platform: "NetApp AFF / ONTAP",
    mapping: ["C2"],
    description: "Unified enterprise NAS/SAN with FabricPool tiering",
    intelMapping: "Xeon4; AES-NI",
  },
  {
    name: "Pure / Everpure",
    platform: "Pure / Everpure",
    mapping: ["C2"],
    description: "FlashBlade unified fast file and object",
    intelMapping: "Xeon4; AES-NI",
  },
  {
    name: "IBM FlashSystem",
    platform: "IBM FlashSystem",
    mapping: ["C2"],
    description: "Shared hot storage array",
    intelMapping: "AES-NI on controller",
  },
  {
    name: "Dell PowerStore",
    platform: "Dell PowerStore",
    mapping: ["C2"],
    description: "Shared hot storage array",
    intelMapping: "Xeon; AES-NI — at-rest encryption; QAT — in-line compression",
  },

  // C1 - Context memory (KV-cache)
  {
    name: "WEKA",
    platform: "WEKA",
    mapping: ["C1"],
    description: "Context memory / KV-cache namespace",
    intelMapping: "SIMD — data path",
  },
  {
    name: "VAST Data",
    platform: "VAST Data",
    mapping: ["C1"],
    description: "QLC economics at flash latency — context memory tier",
    intelMapping: "SPDK / DPDK",
  },
  {
    name: "Hammerspace",
    platform: "Hammerspace",
    mapping: ["C1"],
    description: "Namespace orchestration across tiers",
    intelMapping: "SPDK — NVMe-oF; Optane-PMEM design-in, CXL candidate",
  },
  {
    name: "DAOS",
    platform: "DAOS",
    mapping: ["C1"],
    description: "HPC/AI parallel object store — context memory tier",
    intelMapping: "SIMD via ISA-L and EC; ISA-L, SPDK; Optane PMEM design-in, CXL fit",
  },

  // C3/C4 - Lake house and archive object
  {
    name: "MinIO (AIStor)",
    platform: "MinIO (AIStor)",
    mapping: ["C3", "C4"],
    description: "Object store spanning bulk HDD and cold archive",
    intelMapping: "Xeon6+; AVX-512/AVX2 Reed-Solomon EC & bitrot hashing (no ISA-L); AES-NI via Go runtime",
  },
  {
    name: "Ceph",
    platform: "Ceph (RBD / CephFS / RGW)",
    mapping: ["C3", "C4"],
    description: "Unified block/file/object; strongest as RGW object",
    intelMapping: "Xeon6+; AES-NI via isa-l and OpenSSL crypto paths; SIMD through the ISA-L plugin; QAT compression zlib/QATzip; QAT crypto offload AES-GCM and DEFLATE",
  },
  {
    name: "Cloudian",
    platform: "Cloudian",
    mapping: ["C3", "C4"],
    description: "Bulk object with strong WORM/object-lock",
    intelMapping: "AES-NI",
  },
  {
    name: "Scality",
    platform: "Scality (RING / ARTESCA)",
    mapping: ["C3", "C4"],
    description: "RING at C3, bulk/cold object with ARTESCA",
    intelMapping: "AES-NI",
  },
  {
    name: "Quantum ActiveScale",
    platform: "Quantum ActiveScale",
    mapping: ["C4"],
    description: "Object with integrated tape tier — cold archive",
    intelMapping: "AES-NI",
  },
];

// Helper function to get vendors for a specific storage class
export function getVendorsForClass(classCode: string): VendorMapping[] {
  return STORAGE_VENDORS.filter(v => v.mapping.includes(classCode));
}

// Helper to get unique vendor names (kept for backward compatibility;
// vendors are already deduplicated per class in STORAGE_VENDORS)
export function getUniqueVendorsForClass(classCode: string): VendorMapping[] {
  const vendors = getVendorsForClass(classCode);
  const seen = new Set<string>();
  return vendors.filter(v => {
    if (seen.has(v.platform)) return false;
    seen.add(v.platform);
    return true;
  });
}
