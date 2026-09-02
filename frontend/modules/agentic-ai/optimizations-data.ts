// Intel software-optimization notes per workload, sourced from the internal ISA/accelerator
// audit of the optimization repository. Keyed by the workload's icon `alt` text in layers.ts
// so the Harness → Software diagram can look this up directly off the icon that was clicked.

export interface OptimizationDetail {
  /** ISA / accelerator the workload can use (AMX, AVX-512, QAT, IAA, ...), or "Not documented" / "TBD". */
  isa: string;
  /** Platform, NUMA, kernel or SKU constraints called out for getting the ISA benefit. */
  hardwareMustKnows: string;
  /** Whether a guide exists in the optimization repository. */
  inRepo: "Yes" | "No";
  /** Free-text detail after the Yes/No — repo path, or a caveat like "dedicated guide pending". */
  inRepoNote?: string;
}

export interface OptimizationEntry {
  /** Sub-label when a single icon covers multiple tools (e.g. "Prometheus+Grafana+Loki"). */
  label: string;
  detail: OptimizationDetail;
}

/** Keyed by icon.alt. Most workloads resolve to exactly one entry; combined icons list
 *  each underlying tool separately. */
export const OPTIMIZATIONS: Record<string, OptimizationEntry[]> = {
  "LiteLLM": [{
    label: "LiteLLM",
    detail: {
      isa: "None (I/O-bound Python proxy, no compute kernels)",
      hardwareMustKnows: "Benefits from network/NIC tuning, not CPU ISA",
      inRepo: "No",
    },
  }],
  "vLLM": [{
    label: "vLLM",
    detail: {
      isa: "Intel AMX (amx_tile, amx_bf16, amx_int8); AVX-512 fallback (avx512f, avx512_bf16)",
      hardwareMustKnows: "Requires 4th-Gen Xeon+ (Sapphire Rapids) for AMX; NUMA-local; OpenMP thread binding (VLLM_CPU_OMP_THREADS_BIND); KV-cache per NUMA node; tensor-parallel-size = NUMA node count",
      inRepo: "Yes",
      inRepoNote: "software/vllm/",
    },
  }],
  "SGLang": [{
    label: "SGLang",
    detail: {
      isa: "Intel AMX (GEMM) + AVX-512 (attention pointwise ops); Intel/LMSYS work",
      hardwareMustKnows: "Needs Xeon 6/AMX-capable silicon; dynamically switches AMX (prefill) vs AVX-512 (decode)",
      inRepo: "No",
      inRepoNote: "Upstream project has AMX support, but no guide here",
    },
  }],
  "llm-d": [{
    label: "llm-d",
    detail: {
      isa: "Inherits vLLM's AMX/AVX-512 CPU path when applicable",
      hardwareMustKnows: "Kubernetes-native — would pair with the NRI Topology-aware/Balloons NUMA pinning already documented",
      inRepo: "No",
    },
  }],
  "Redis": [{
    label: "Redis",
    detail: {
      isa: "AVX-512 for Intel LVQ/LeanVec vector compression kernels; falls back to SQ8 without AVX-512",
      hardwareMustKnows: "Memory-bound, not offload-bound",
      inRepo: "Yes",
      inRepoNote: "software/similarity-search/redis/",
    },
  }],
  "MySQL": [{
    label: "MySQL",
    detail: {
      isa: "AVX-512",
      hardwareMustKnows: "Sub-NUMA Clustering (SNC), numactl -N/-m, hugepages, NIC-to-socket alignment; Xeon 6 P-core family (6737P/6747P/6767P/6972P)",
      inRepo: "Yes",
      inRepoNote: "software/mysql-postgresql/",
    },
  }],
  "PostgreSQL": [{
    label: "PostgreSQL",
    detail: {
      isa: "AVX-512",
      hardwareMustKnows: "Same NUMA/SNC/hugepage guidance as MySQL; compression offload (QAT/IAA) covered separately, not in this doc",
      inRepo: "Yes",
      inRepoNote: "software/mysql-postgresql/",
    },
  }],
  "MongoDB": [{
    label: "MongoDB",
    detail: {
      isa: "WiredTiger compression (snappy/zlib) is the same class of workload as zlib-accel's QAT/IAA shim targets",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Neo4J": [{
    label: "Neo4j",
    detail: {
      isa: "Not documented — graph traversal has no vectorized/AMX analog elsewhere in repo",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "ClickHouse": [{
    label: "ClickHouse",
    detail: {
      isa: "AVX-512; DEFLATE-IAA",
      hardwareMustKnows: "—",
      inRepo: "No",
      inRepoNote: "Dedicated guide pending; mentioned in software/gluten/README.md",
    },
  }],
  "QDrant": [{
    label: "Qdrant",
    detail: {
      isa: "Not documented — same HNSW/SIMD distance-kernel shape as Redis vector search",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Milvus": [{
    label: "Milvus",
    detail: {
      isa: "Not documented — same class as Qdrant",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Kafka": [{
    label: "Kafka",
    detail: {
      isa: "None",
      hardwareMustKnows: "NUMA-bound brokers/controllers, hyperthread-aware core lists, PerfSpect-optimized latency profile (Granite Rapids-only), tuned latency-performance profile",
      inRepo: "Yes",
      inRepoNote: "software/kafka/",
    },
  }],
  "Spark": [{
    label: "Spark (Gluten accelerator)",
    detail: {
      isa: "AVX-512 (Velox vectorized exec, SIMDJSON); QAT (QAT-zstd/QAT-zip Columnar Shuffle codecs); IAA (supported, no measured gain yet)",
      hardwareMustKnows: "Xeon 6960P (GNR), 8592+ (EMR), 6780E (SRF), 8358 (ICX); 2.7–3.3x speedup vs vanilla Spark on GNR",
      inRepo: "Yes",
      inRepoNote: "software/gluten/",
    },
  }],
  "Airflow": [{
    label: "Airflow",
    detail: {
      isa: "Not documented — orchestration/scheduling layer, not compute",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Elastic": [{
    label: "Elasticsearch",
    detail: {
      isa: "Not documented",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Fluentd": [{
    label: "Fluentd",
    detail: {
      isa: "Not documented — I/O-bound log shipper, same class as Kafka but uncovered",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Debezium": [{
    label: "Debezium",
    detail: {
      isa: "Not documented directly — runs as a Kafka Connect plugin",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Kubernetes": [{
    label: "Kubernetes",
    detail: {
      isa: "TBD",
      hardwareMustKnows: "NRI plugins expose NUMA/cache alignment (Topology-aware) and PCT/C-states/real-time scheduling (Balloons) as CRDs to containers",
      inRepo: "Yes",
      inRepoNote: "software/kubernetes/ + software/kubernetes/nri-resource-policies/",
    },
  }],
  "KVM": [{
    label: "KVM",
    detail: {
      isa: "TBD",
      hardwareMustKnows: "None in repo",
      inRepo: "No",
    },
  }],
  "Slurm": [{
    label: "Slurm",
    detail: {
      isa: "TBD",
      hardwareMustKnows: "None",
      inRepo: "No",
    },
  }],
  "Prometheus+Grafana+Loki": [
    {
      label: "Prometheus",
      detail: {
        isa: "Not documented",
        hardwareMustKnows: "PCM exposes metrics to collectors such as Prometheus",
        inRepo: "No",
        inRepoNote: "Dedicated guide pending; mentioned in tools/pcm/README.md, tools/README.md",
      },
    },
    {
      label: "Grafana",
      detail: {
        isa: "Not documented",
        hardwareMustKnows: "None",
        inRepo: "No",
      },
    },
    {
      label: "Loki",
      detail: {
        isa: "Not documented",
        hardwareMustKnows: "None",
        inRepo: "No",
      },
    },
  ],
};
