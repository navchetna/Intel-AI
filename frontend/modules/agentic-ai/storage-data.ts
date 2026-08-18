// Storage architecture data extracted from "The Agentic Stack, Viewed as Storage" reference document

export interface StorageClass {
  id: string;
  code: string; // C0, C1, C2, C3, C4, C5
  name: string;
  latency: string;
  technologies: string;
  useCases: string;
  color: string;
  colorRgb: string;
}

export interface StorageWorkload {
  id: string;
  name: string;
  classId: string; // Maps to StorageClass code
  filesystem: string;
  keyDriver: string;
  criticalTech: string;
}

export interface FilesystemTech {
  category: string;
  technology: string;
  useFor: string;
  notes: string;
}

export interface VendorLandscape {
  classId: string;
  mediaVendors: string;
  systemVendors: string;
  software: string;
}

// Storage class definitions (C0-C5 hierarchy)
export const STORAGE_CLASSES: StorageClass[] = [
  {
    id: "c0",
    code: "C0",
    name: "Transactional block",
    latency: "50–200 μs",
    technologies: "TLC NVMe, direct-attach, PLP",
    useCases: "Durability-critical small writes: checkpoints, OLTP, etcd",
    color: "#b91c1c", // red-700
    colorRgb: "185,28,28",
  },
  {
    id: "c1",
    code: "C1",
    name: "Context memory (KV)",
    latency: "0.1–2 ms",
    technologies: "DRAM → TLC NVMe → pod flash",
    useCases: "KV cache / context memory. Ephemeral — no protection",
    color: "#ea580c", // orange-600
    colorRgb: "234,88,12",
  },
  {
    id: "c2",
    code: "C2",
    name: "Shared hot namespace",
    latency: "0.3–2 ms",
    technologies: "All-flash parallel filesystem",
    useCases: "Shared hot namespace, checkpoints, scratch",
    color: "#d97706", // amber-600
    colorRgb: "217,119,6",
  },
  {
    id: "c3",
    code: "C3",
    name: "Warm capacity",
    latency: "1–5 ms",
    technologies: "QLC NVMe, flash object",
    useCases: "Vector indexes, warm objects, registries",
    color: "#059669", // emerald-600
    colorRgb: "5,150,105",
  },
  {
    id: "c4",
    code: "C4",
    name: "Lake / bulk object",
    latency: "10–80 ms",
    technologies: "Nearline HDD object",
    useCases: "Lake, raw corpora, cold telemetry",
    color: "#0284c7", // sky-600
    colorRgb: "2,132,199",
  },
  {
    id: "c5",
    code: "C5",
    name: "Archive / WORM",
    latency: "s – hours",
    technologies: "Tape, cold object, WORM",
    useCases: "Audit, provenance, compliance retention",
    color: "#475569", // slate-600
    colorRgb: "71,85,105",
  },
];

// Layer-workload mappings from the reference document
export const STORAGE_WORKLOADS: StorageWorkload[] = [
  // AGENTS LAYER
  {
    id: "workflow-orchestration",
    name: "Workflow orchestration\nLangGraph · n8n",
    classId: "C0",
    filesystem: "XFS on PLP NVMe\nPostgres, synchronous_commit=on",
    keyDriver: "Checkpointer is the durability boundary.\np99 fsync < 1 ms gates every agent step",
    criticalTech: "PostgreSQL · Redis · Kioxia CM/CD, Micron 9550, Solidigm D7 · Dell / HPE / Supermicro",
  },
  {
    id: "tasks-mcp",
    name: "Tasks & MCP\nPydantic AI · MCP servers",
    classId: "C0",
    filesystem: "Local NVMe, quota-enforced\nnamespace per session",
    keyDriver: "Storage-inheriting. Scratch must be\nquota-capped; MCP is a data-egress surface",
    criticalTech: "Content-addressed tool cache ·\nseparately audited namespace",
  },
  {
    id: "evaluation",
    name: "Evaluation\nTrace evals · regression ·\nbenchmarks",
    classId: "C0",
    filesystem: "S3 object, content-addressed\nversioned corpora",
    keyDriver: "Immutable golden datasets.\nThe audit trail for every model change",
    criticalTech: "MinIO · Ceph RGW, cloud object ·\nLakeFS / DVC for versioning",
  },
  {
    id: "sandboxes",
    name: "Sandboxes\nE2B · Modal · Daytona ·\nFirecracker",
    classId: "C0",
    filesystem: "EROFS + fscache (base)\noverlayfs / thin-LVM (delta)\nvirtio-fs (shared toolchain)",
    keyDriver: "Cost shows up as latency, not capacity.\nBurst restore read, never network storage",
    criticalTech: "UFFD on-demand paging, CoW template fork,\nshared page cache · 3 DWPD TLC NVMe",
  },
  {
    id: "tasks-observability",
    name: "Tasks observability\nPydantic Logfire · Langfuse",
    classId: "C3, C4",
    filesystem: "ClickHouse MergeTree on NVMe\nTTL MOVE to S3",
    keyDriver: "Volume scales with steps per task,\nnot requests per second",
    criticalTech: "ClickHouse · MinIO / S3 ·\nasymmetric retention policy",
  },

  // MODELS LAYER
  {
    id: "model-serving-weights",
    name: "Model serving — weights\nvLLM · SGLang · Dynamo · llm-d",
    classId: "C1",
    filesystem: "XFS, noatime\nsafetensors mmap + page-cache prewarm",
    keyDriver: "≥10 GB/s sequential per node.\nNever fetch from object on the request path",
    criticalTech: "Local Gen5/Gen6 TLC NVMe ·\nparallel sharded load across TP ranks",
  },
  {
    id: "model-serving-kv",
    name: "Model serving — KV cache\nContext memory",
    classId: "C1",
    filesystem: "GPUDirect Storage / cuFile\nNVMe-oF, NFS-over-RDMA",
    keyDriver: "5–15 GB/s read per accelerator.\nEphemeral: no replication, EC or backup",
    criticalTech: "LMCache, Mooncake, NVIDIA KVBM+NIXL ·\nWEKA AMG, VAST VUA, Hammerspace Tier 0,\nPliops XDP, NVIDIA CMX + BlueField-4",
  },
  {
    id: "llm-gateway",
    name: "LLM gateway\nLiteLLM",
    classId: "C0, C3, C4",
    filesystem: "Postgres (config) + Redis (counters)\nClickHouse / object (payloads)",
    keyDriver: "Payload logs must never enter the OLTP DB.\n60 GB/day raw at 100k tasks",
    criticalTech: "PostgreSQL, Redis, ClickHouse ·\nsemantic cache in vector store",
  },
  {
    id: "agent-memory",
    name: "Agent memory\nRedis · Mem0",
    classId: "C0, C3",
    filesystem: "Redis AOF everysec on NVMe\nRDB snapshots to object",
    keyDriver: "Hot, permanently growing, on the critical\npath once per step. p99 < 5 ms",
    criticalTech: "Redis, Neo4j (entity graph), vector store ·\nevict dormant users to C3 — cuts DRAM 70–90%",
  },

  // DATA & KNOWLEDGE LAYER
  {
    id: "databases",
    name: "Databases\nPostgreSQL · MySQL · MongoDB ·\nNeo4j",
    classId: "C0",
    filesystem: "XFS, noatime\nLocal PV — never network block",
    keyDriver: "fsync p99 < 1 ms. CDC forces WAL retention:\n20 MB/s × 12 h outage = 864 GB",
    criticalTech: "PLP TLC NVMe · Neo4j page cache should\nhold the whole graph",
  },
  {
    id: "clickhouse-analytics",
    name: "ClickHouse\nTrace & token analytics",
    classId: "C0, C3, C4",
    filesystem: "XFS hot volume + s3 disk\nTTL MOVE policy",
    keyDriver: "Merge amplification: provision 2–4×\nwrite headroom over raw ingest",
    criticalTech: "ClickHouse tiered storage · MinIO / S3 ·\n10–30× columnar compression",
  },
  {
    id: "vector-db",
    name: "Vector DB\nRedis · Qdrant · Milvus",
    classId: "C0, C3",
    filesystem: "mmap segments on NVMe\nMilvus: object + etcd + MQ + local cache",
    keyDriver: "Index placement is the largest cost lever\nin the stack. 10k qps = 1M IOPS",
    criticalTech: "DiskANN, AiSAQ, CAGRA · Kioxia LC9,\nMicron 6600 ION, Solidigm D5 QLC\nMaidO · Elasticsearch",
  },
  {
    id: "pipelines",
    name: "Pipelines\nKafka · Spark",
    classId: "C0, C4",
    filesystem: "XFS + page cache (Kafka)\nLocal NVMe scratch (Spark shuffle)",
    keyDriver: "Kafka tiered storage cuts the hot tier\n80–95%. Shuffle never on network FS",
    criticalTech: "KIP-405 tiered storage · Celeborn / Uniffle\ndisaggregated shuffle · remote task logs",
  },
  {
    id: "pipelines-airflow",
    name: "Pipelines — orchestration\nAirflow",
    classId: "C3, C4",
    filesystem: "Metadata DB (task state)\nLogs and DAG artifacts on object",
    keyDriver: "Scheduler metadata is small and warm;\ntask logs and artifacts are large and cold",
    criticalTech: "Postgres/MySQL metadata store ·\nS3 / MinIO for logs and DAG artifacts",
  },
  {
    id: "connectors",
    name: "Connectors\nElastic · Fluentd · Debezium",
    classId: "C3, C4",
    filesystem: "Hot-warm-cold-frozen tiers\nSearchable snapshots on object",
    keyDriver: "Fluentd buffer sizing is a data-loss control.\nDebezium's cost lands on the source DB",
    criticalTech: "Elasticsearch ILM · object-backed frozen tier ·\nalarm on replication slot lag",
  },
  {
    id: "debezium",
    name: "Debezium\nChange data capture (CDC)",
    classId: "C0",
    filesystem: "No storage of its own — reads the source DB's\nWAL / binlog; offsets committed to Kafka",
    keyDriver: "Replication slot must never lag past WAL\nretention, or the source transactional DB fills disk",
    criticalTech: "Kafka Connect · Postgres logical replication /\nMySQL binlog · low-latency source-DB storage keeps the slot caught up",
  },

  // INFRASTRUCTURE ORCHESTRATION LAYER
  {
    id: "etcd",
    name: "etcd\nKubernetes control plane",
    classId: "C0",
    filesystem: "ext4 or XFS on a dedicated device\nNot a partition. Not network storage",
    keyDriver: "wal_fsync p99 < 10 ms (target < 2 ms).\nMost fsync-sensitive component in the stack",
    criticalTech: "Dedicated PLP TLC NVMe · 2–8 GB hard limit ·\nnever co-locate with sandbox or merge churn",
  },
  {
    id: "k8s-node-runtime",
    name: "Kubernetes node runtime\nImage cache · registry",
    classId: "C0",
    filesystem: "overlayfs; EROFS / Nydus for lazy pull\nSOCI / eStargz",
    keyDriver: "Pull-to-start under 10 s.\n100–400 GB cache per node",
    criticalTech: "Harbor / registry on object ·\nlazy-loading snapshotters",
  },
  {
    id: "kvm",
    name: "KVM\nVM images · live migration",
    classId: "C0",
    filesystem: "raw > qcow2 for performance\nLVM-thin for snapshots",
    keyDriver: "Local for performance, shared for migration.\nPick per node pool, not globally",
    criticalTech: "Local NVMe · parallel FS or NVMe-oF where\nmigration is required",
  },
  {
    id: "slurm",
    name: "Slurm\nBatch scheduling",
    classId: "C0",
    filesystem: "XFS (state save)\nLustre / GPFS / WEKA (home, scratch)",
    keyDriver: "State save is tiny and latency-critical;\nscratch is large and bandwidth-critical",
    criticalTech: "Lustre, IBM Storage Scale, BeeGFS,\nWEKA, DDN EXAScaler",
  },
  {
    id: "prometheus-grafana-loki",
    name: "Prometheus · Grafana · Loki\nPlatform telemetry",
    classId: "C0, C3, C4",
    filesystem: "XFS local TSDB\nObject-backed chunks (Loki)",
    keyDriver: "2M series at 15 s ≈ 590 GB for 30 days.\nBeyond that, remote-write not bigger disks",
    criticalTech: "Thanos / Mimir / Cortex on object ·\nLoki index on NVMe, chunks on S3",
  },
];

// Filesystem and data-path decision matrix
export const FILESYSTEM_TECHNOLOGIES: FilesystemTech[] = [
  // Local block
  { category: "Local block", technology: "XFS", useFor: "Databases, ClickHouse, Kafka, vector DB, container storage", notes: "noatime, logbsize=256k, 4K/8K alignment" },
  { category: "Local block", technology: "ext4", useFor: "Small root volumes, etcd", notes: "data=ordered, noatime" },
  { category: "Local block", technology: "ZFS / Btrfs", useFor: "Artifact stores, dev sandboxes (CoW + compression)", notes: "Avoid for latency-critical DB and KV cache" },

  // Parallel / shared
  { category: "Parallel / shared", technology: "WEKA", useFor: "Best small-file and metadata performance; KV integration", notes: "40–120 GB/s per node; needs dedicated cores" },
  { category: "Parallel / shared", technology: "VAST Data", useFor: "QLC economics at flash latency", notes: "30–80 GB/s; single-vendor hardware" },
  { category: "Parallel / shared", technology: "Lustre / DDN EXAScaler", useFor: "Extreme sequential throughput, HPC lineage", notes: "Poor small-file and metadata; fragile MDS" },
  { category: "Parallel / shared", technology: "IBM Storage Scale", useFor: "Mature policy engine, tiering, tape integration", notes: "Operational complexity" },
  { category: "Parallel / shared", technology: "Hammerspace Tier 0", useFor: "Makes in-server NVMe a shared parallel namespace", notes: "No new hardware; metadata-plane dependency" },

  // Object
  { category: "Object", technology: "MinIO · Ceph RGW", useFor: "Self-hosted S3 for ClickHouse, Milvus, Loki tiering", notes: "Pair with QLC for C3, HDD for C4" },

  // Container / sandbox
  { category: "Container / sandbox", technology: "EROFS + fscache", useFor: "Read-only base images, lazy pull, shared page cache", notes: "Cuts image-pull-to-start dramatically" },
  { category: "Container / sandbox", technology: "overlayfs · thin-LVM", useFor: "Writable microVM and container deltas", notes: "Watch inode exhaustion and CoW amplification" },

  // Disaggregated block
  { category: "Disaggregated block", technology: "NVMe-oF / TCP", useFor: "Decouples capacity from compute", notes: "Adds ~50–100 μs; Lightbits, Simplyblock" },

  // GPU-direct
  { category: "GPU-direct", technology: "GDS / cuFile", useFor: "KV cache and weight movement into GPU memory", notes: "Mandatory for C1 — else 1–2 cores per 10 GB/s" },
];

// Vendor landscape by storage class
export const VENDOR_LANDSCAPE: VendorLandscape[] = [
  {
    classId: "C0",
    mediaVendors: "Kioxia CM/CD · Micron 9550/9650 · Samsung PM-series · SK hynix PS/PEB · Solidigm D7",
    systemVendors: "Dell · HPE · Supermicro · Lenovo · QCT",
    software: "PostgreSQL · Redis · etcd · XFS",
  },
  {
    classId: "C1",
    mediaVendors: "Same TLC as C0; Gen6 where available",
    systemVendors: "WEKA · VAST · Hammerspace · Pliops · DDN · NVIDIA CMX/STX partners",
    software: "LMCache · Mooncake · NVIDIA KVBM + NIXL · Dynamo · llm-d",
  },
  {
    classId: "C2",
    mediaVendors: "TLC NVMe",
    systemVendors: "WEKA · VAST · DDN EXAScaler · IBM Storage Scale · Pure FlashBlade · NetApp AFF · Dell PowerScale",
    software: "Lustre · BeeGFS · CephFS · DAOS",
  },
  {
    classId: "C3",
    mediaVendors: "Kioxia LC9 · Micron 6600 ION · Solidigm D5 · SK hynix PS1012 · Phison Pascari",
    systemVendors: "VAST · Pure · MinIO AIStor · Cloudian · Scality ARTESCA",
    software: "MinIO · Ceph RGW · JuiceFS · DiskANN / AiSAQ",
  },
  {
    classId: "C4",
    mediaVendors: "Seagate · Toshiba · WD nearline HDD",
    systemVendors: "Cloudian · Scality RING · Dell ObjectScale · Quantum ActiveScale · NetApp StorageGRID",
    software: "Ceph · MinIO · cloud object",
  },
  {
    classId: "C5",
    mediaVendors: "LTO tape",
    systemVendors: "Spectra Logic · Quantum Scalar · IBM TS4500",
    software: "S3 Object Lock · Glacier-class",
  },
];

// Media types referenced by storage classes. Latency, bandwidth and cost/TB are sourced
// from the memory/storage tier reference sheet (memory-storage-tiers-mono-with-bw.svg) —
// approximate, order-of-magnitude figures, not vendor-specific pricing.
export interface MediaType {
  label: string;
  path: string;
  latency: string;
  bandwidth: string;
  costPerTB: string;
}

export const MEDIA_TYPES: Record<string, MediaType> = {
  hbm: { label: "HBM", path: "/hbm (1).svg", latency: "~100 ns", bandwidth: "~1.2 TB/s · stack", costPerTB: "~$8,600/TB" },
  dram: { label: "DRAM", path: "/dram (1).svg", latency: "~80 ns", bandwidth: "~51 GB/s · DIMM", costPerTB: "~$30,000/TB" },
  cxl: { label: "CXL", path: "/cxl (1).svg", latency: "~180 ns", bandwidth: "~32 GB/s · module", costPerTB: "~$33,000/TB" },
  tlcNvme: { label: "TLC NVMe", path: "/tlc-nvme (1).svg", latency: "~80 µs", bandwidth: "~14 GB/s · drive", costPerTB: "~$580/TB" },
  qlcNvme: { label: "QLC NVMe", path: "/qlc-nvme (1).svg", latency: "~150 µs", bandwidth: "~7 GB/s · drive", costPerTB: "~$500/TB" },
  podFlash: { label: "Pod Flash", path: "/pod-flash (1).svg", latency: "~500 µs", bandwidth: "~40 GB/s · pod", costPerTB: "~$800/TB" },
  nearlineHdd: { label: "Nearline HDD", path: "/nearline-hdd (1).svg", latency: "~8 ms", bandwidth: "~275 MB/s · drive", costPerTB: "~$22/TB" },
  tape: { label: "Tape", path: "/tape (1).svg", latency: "~60 s", bandwidth: "~400 MB/s · drive", costPerTB: "~$10/TB" },
};

// Media icons for each storage class
export const STORAGE_CLASS_MEDIA: Record<string, MediaType[]> = {
  "C0": [MEDIA_TYPES.tlcNvme],
  "C1": [MEDIA_TYPES.hbm, MEDIA_TYPES.dram, MEDIA_TYPES.cxl, MEDIA_TYPES.tlcNvme, MEDIA_TYPES.podFlash],
  "C2": [MEDIA_TYPES.podFlash],
  "C3": [MEDIA_TYPES.qlcNvme],
  "C4": [MEDIA_TYPES.nearlineHdd],
  "C5": [MEDIA_TYPES.tape],
};

export const STORAGE_GOVERNING_CONSTRAINT =
  "Governing constraint — storage is 3–5% of an accelerator node's cost and can idle 100% of it. Size storage so compute and memory are never starved; never optimise it in isolation.";

export const STORAGE_PROCUREMENT_CAUTION =
  "Procurement caution — the C1 category is not settled. NVIDIA positions G3.5 pod flash as a replacement for node-local G3, which cuts against vendors who bet on in-server NVMe. Standardise on the connector layer (LMCache / NIXL) so the backing store stays swappable.";
