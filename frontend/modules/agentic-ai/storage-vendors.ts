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
  // C0 - Transactional block
  {
    name: "NetApp AFF / ONTAP",
    platform: "NetApp AFF / ONTAP",
    mapping: ["C0", "C2"],
    description: "Unified enterprise NAS/SAN with FabricPool tiering",
    intelMapping: "Xeon4; AES-NI",
  },
  {
    name: "Pure / Everpure",
    platform: "Pure / Everpure",
    mapping: ["C0", "C2"],
    description: "FlashArray at C0, FlashBlade at C2/C3",
    intelMapping: "Xeon4; AES-NI",
  },
  {
    name: "IBM FlashSystem",
    platform: "IBM FlashSystem",
    mapping: ["C0"],
    description: "Transactional block",
    intelMapping: "AES-NI on controller",
  },
  {
    name: "Kaminario / Silk (historical)",
    platform: "Kaminario / Silk (historical)",
    mapping: ["C0"],
    description: "Retained only as the cleanest published QAT proof point",
    intelMapping: "Xeon-SP + C6268 chipset; QAT DEFLATE",
  },
  {
    name: "Dell PowerStore",
    platform: "Dell PowerStore",
    mapping: ["C0"],
    description: "Transactional block array",
    intelMapping: "Xeon; AES-NI — at-rest encryption; QAT — in-line compression",
  },

  // C1 - Hot shared namespace + context memory
  {
    name: "WEKA",
    platform: "WEKA",
    mapping: ["C1", "C2"],
    description: "Hot shared namespace + context memory",
    intelMapping: "SIMD — data path",
  },
  {
    name: "VAST Data",
    platform: "VAST Data",
    mapping: ["C1", "C2", "C3"],
    description: "QLC economics at flash latency — spans C2/C3",
    intelMapping: "SPDK / DPDK",
  },
  {
    name: "Hammerspace",
    platform: "Hammerspace",
    mapping: ["C1", "C2"],
    description: "Namespace orchestration across tiers",
    intelMapping: "SPDK — NVMe-oF; Optane-PMEM design-in, CXL candidate",
  },

  // C2 - HPC/AI parallel object store
  {
    name: "DAOS",
    platform: "DAOS",
    mapping: ["C2"],
    description: "HPC/AI parallel object store",
    intelMapping: "SIMD via ISA-L and EC; ISA-L, SPDK; Optane PMEM design-in, CXL fit",
  },
  {
    name: "IBM Storage Scale",
    platform: "IBM Storage Scale",
    mapping: ["C2", "C4", "C5"],
    description: "Parallel FS with policy-driven tape tiering",
    intelMapping: "ISA-L for EC",
  },
  {
    name: "Dell PowerScale",
    platform: "Dell PowerScale",
    mapping: ["C2"],
    description: "Scale-out NAS",
  },
  {
    name: "DDN (EXAScaler / Infinia)",
    platform: "DDN (EXAScaler / Infinia)",
    mapping: ["C2", "C3"],
    description: "HPC throughput; Infinia targets C3 and KV",
    intelMapping: "Lustre SIMD, ISA-L",
  },

  // C4/C5 - Warm bulk and cold archive object
  {
    name: "MinIO (AIStor)",
    platform: "MinIO (AIStor)",
    mapping: ["C4", "C5"],
    description: "Object store spanning warm flash and bulk HDD",
    intelMapping: "Xeon6+; AVX-512/AVX2 Reed-Solomon EC & bitrot hashing (no ISA-L); AES-NI via Go runtime",
  },
  {
    name: "Ceph",
    platform: "Ceph (RBD / CephFS / RGW)",
    mapping: ["C4", "C5"],
    description: "Unified block/file/object; strongest as RGW object",
    intelMapping: "Xeon6+; AES-NI via isa-l and OpenSSL crypto paths; SIMD through the ISA-L plugin; QAT compression zlib/QATzip; QAT crypto offload AES-GCM and DEFLATE",
  },
  {
    name: "Cloudian",
    platform: "Cloudian",
    mapping: ["C4", "C5"],
    description: "Bulk object with strong WORM/object-lock",
    intelMapping: "AES-NI",
  },
  {
    name: "Scality",
    platform: "Scality (RING / ARTESCA)",
    mapping: ["C4", "C5"],
    description: "RING at C4, ARTESCA at flash-object C3",
    intelMapping: "AES-NI",
  },
  {
    name: "Quantum ActiveScale",
    platform: "Quantum ActiveScale",
    mapping: ["C4", "C5"],
    description: "Object with integrated tape tier",
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
