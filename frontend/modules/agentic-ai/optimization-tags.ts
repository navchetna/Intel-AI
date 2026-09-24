import { OPTIMIZATIONS } from "./optimizations-data";

export type OptimizationTagCategory = "accelerator" | "isa" | "library";

export interface OptimizationTag {
  /** Stable key — matches the vocabulary the Harness → Software optimization notes use. */
  id: string;
  label: string;
  category: OptimizationTagCategory;
  description: string;
  /** Matches a mention of this tag inside an OptimizationDetail.isa free-text string. */
  match: RegExp;
}

export const OPTIMIZATION_CATEGORY_LABELS: Record<OptimizationTagCategory, string> = {
  accelerator: "Accelerators",
  isa: "ISA",
  library: "Libraries",
};

export const OPTIMIZATION_CATEGORY_COLORS: Record<OptimizationTagCategory, string> = {
  accelerator: "#fb923c",
  isa: "#38bdf8",
  library: "#e879f9",
};

export const OPTIMIZATION_CATEGORY_ORDER: OptimizationTagCategory[] = ["accelerator", "isa", "library"];

/**
 * The fixed catalog of Intel accelerators / ISA extensions / libraries the Harness → Software
 * stack's optimization notes can reference. Membership — which workloads use which tag — is
 * intentionally never hand-maintained here. `tagsForText`/`tagsForWorkload`/`workloadsForTag`
 * below derive it live from each workload's existing `OptimizationDetail.isa` free text in
 * optimizations-data.ts, so the panel and the diagram badges read from one source of truth:
 * editing a workload's `isa` string is the only thing needed to update the mapping, in both
 * directions, everywhere it's shown.
 */
export const OPTIMIZATION_TAGS: OptimizationTag[] = [
  // ── Accelerators ──────────────────────────────────────────────────────────
  {
    id: "AMX", label: "AMX", category: "accelerator", match: /\bAMX\b/i,
    description: "Advanced Matrix Extensions — tiled matrix-multiply units for AI/ML GEMM kernels.",
  },
  {
    id: "QAT", label: "QAT", category: "accelerator", match: /\bQAT\b/i,
    description: "QuickAssist Technology — cryptography and (de)compression offload.",
  },
  {
    id: "DSA", label: "DSA", category: "accelerator", match: /\bDSA\b/i,
    description: "Data Streaming Accelerator — memory-move and data-transformation offload.",
  },
  {
    id: "DLB", label: "DLB", category: "accelerator", match: /\bDLB\b/i,
    description: "Dynamic Load Balancer — hardware queue management for packet/event distribution.",
  },
  {
    id: "IAA", label: "IAA", category: "accelerator", match: /\bIAA\b/i,
    description: "In-Memory Analytics Accelerator — (de)compression and analytics offload (DEFLATE).",
  },
  // ── ISA ───────────────────────────────────────────────────────────────────
  {
    id: "AVX512", label: "AVX-512", category: "isa", match: /AVX[-_]?512/i,
    description: "512-bit SIMD vector instructions for wide floating-point/integer kernels.",
  },
  {
    id: "AES-NI", label: "AES-NI", category: "isa", match: /AES[-]?NI/i,
    description: "Hardware-accelerated AES encryption/decryption instructions.",
  },
  {
    id: "SHA", label: "SHA", category: "isa", match: /\bSHA(?:-?\d+)?\b/i,
    description: "Hardware SHA hashing instructions.",
  },
  {
    id: "CLMUL", label: "CLMUL", category: "isa", match: /CLMUL/i,
    description: "Carry-less multiplication instruction — accelerates CRC and GCM.",
  },
  // ── Libraries ─────────────────────────────────────────────────────────────
  {
    id: "isa-l", label: "isa-l", category: "library", match: /\bisa-?l\b/i,
    description: "Intelligent Storage Acceleration Library — erasure coding, CRC, and compression kernels.",
  },
  {
    id: "SPDK", label: "SPDK", category: "library", match: /\bSPDK\b/i,
    description: "Storage Performance Development Kit — userspace NVMe storage stack.",
  },
  {
    id: "DPDK", label: "DPDK", category: "library", match: /\bDPDK\b/i,
    description: "Data Plane Development Kit — userspace packet processing.",
  },
  {
    id: "QATzip", label: "QATzip", category: "library", match: /QAT[-]?zip/i,
    description: "QAT-accelerated zlib-compatible compression library.",
  },
];

/** Every catalog tag whose `match` fires against a workload's documented ISA/accelerator text. */
export function tagsForText(text: string | undefined): OptimizationTag[] {
  if (!text) return [];
  return OPTIMIZATION_TAGS.filter(t => t.match.test(text));
}

export interface TaggedWorkload {
  /** Icon `alt` — the same key optimizations-data.ts and layers.ts use. */
  iconAlt: string;
  /** Sub-label, for combined icons (e.g. "Prometheus+Grafana+Loki" → "Prometheus"). */
  label: string;
}

/** The full set of catalog tags a workload icon's optimization notes mention, across every
 *  entry under that icon (a combined icon like Prometheus+Grafana+Loki has several). */
export function tagsForWorkload(iconAlt: string): OptimizationTag[] {
  const entries = OPTIMIZATIONS[iconAlt];
  if (!entries) return [];
  const seen = new Set<string>();
  const out: OptimizationTag[] = [];
  for (const entry of entries) {
    for (const tag of tagsForText(entry.detail.isa)) {
      if (!seen.has(tag.id)) { seen.add(tag.id); out.push(tag); }
    }
  }
  return out;
}

/** Every workload (icon + sub-label) whose optimization notes mention this tag — the reverse
 *  of `tagsForWorkload`, derived from the same free text so the two can never drift apart. */
export function workloadsForTag(tagId: string): TaggedWorkload[] {
  const out: TaggedWorkload[] = [];
  for (const [iconAlt, entries] of Object.entries(OPTIMIZATIONS)) {
    for (const entry of entries) {
      if (tagsForText(entry.detail.isa).some(t => t.id === tagId)) {
        out.push({ iconAlt, label: entry.label });
      }
    }
  }
  return out;
}
