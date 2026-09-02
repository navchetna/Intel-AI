/** Network architecture data - planes and workload mappings for the agentic stack */

export interface NetworkPlane {
  id: string;
  code: string; // "1", "2", "3", "4", "S"
  name: string;
  latency: string;
  carries: string;
  sizingProperty: string;
  failureSignature: string;
  color: string;
  colorRgb: string;
}

export interface NetworkWorkload {
  id: string;
  name: string;
  planes: string[]; // ["3"], ["3", "4"], ["2"], etc.
  nic: string; // "400G RDMA", "25G", "node-local", "stdio", etc.
  placementConstraint: string;
}

// Network plane definitions (Plane 1-4 + Support/Telemetry)
export const NETWORK_PLANES: NetworkPlane[] = [
  {
    id: "plane1",
    code: "1",
    name: "Plane 1 · Scale-up",
    latency: "1–5 µs",
    carries: "TP all-reduce, MoE expert all-to-all",
    sizingProperty: "Coherent domain size",
    failureSignature: "Per-token latency floor rises",
    color: "#22d3ee", // cyan/teal
    colorRgb: "34,211,238",
  },
  {
    id: "plane2",
    code: "2",
    name: "Plane 2 · Scale-out",
    latency: "5–50 µs",
    carries: "KV transfer, pipeline, cross-node EP",
    sizingProperty: "GB/s of KV movement",
    failureSignature: "TTFT collapse; disagg net-negative",
    color: "#3b82f6", // blue
    colorRgb: "59,130,246",
  },
  {
    id: "plane3",
    code: "3",
    name: "Plane 3 · Service E–W",
    latency: "0.05–2 ms",
    carries: "Agent, router, tools, DB, vector DB",
    sizingProperty: "Per-hop latency × hop count",
    failureSignature: "Compounding latency — silent",
    color: "#f59e0b", // amber/orange
    colorRgb: "245,158,11",
  },
  {
    id: "plane4",
    code: "4",
    name: "Plane 4 · North–south",
    latency: "20–200 ms",
    carries: "External tool calls, client traffic",
    sizingProperty: "Connections per second",
    failureSignature: "Conntrack & NAT exhaustion",
    color: "#991b1b", // dark red/maroon
    colorRgb: "153,27,27",
  },
  {
    id: "planeS",
    code: "S",
    name: "Support · Telemetry",
    latency: "deferrable",
    carries: "Traces, metrics, prompt/completion logs",
    sizingProperty: "Sustained Gb/s, isolated",
    failureSignature: "Steals capacity from planes 1–2",
    color: "#64748b", // slate/gray
    colorRgb: "100,116,139",
  },
];

// Workload to network mapping (based on placement matrix)
export const NETWORK_WORKLOADS: NetworkWorkload[] = [
  // Agents layer
  {
    id: "workflow-orchestration",
    name: "Workflow orchestration\nLangGraph · n8n",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same-rack deployment for workflow state coordination",
  },
  {
    id: "tasks-mcp-stdio",
    name: "Tasks & MCP\nstdio local",
    planes: [], // none - local only
    nic: "stdio",
    placementConstraint: "stdio sidecar wherever the tool permits it",
  },
  {
    id: "tasks-mcp-remote",
    name: "MCP remote",
    planes: ["4"],
    nic: "node-local",
    placementConstraint: "External MCP servers via north-south traffic",
  },
  {
    id: "evaluation",
    name: "Evaluation\nTrace evals",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same-AZ for low-latency eval harness access",
  },
  {
    id: "sandboxes",
    name: "Sandboxes\nE2B · Modal · Firecracker",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Per-VM rate limits; policy egress proxy; pre-allocated TAPs",
  },
  {
    id: "tasks-observability",
    name: "Tasks observability\nLogfire · Langfuse",
    planes: ["4", "S"],
    nic: "100G",
    placementConstraint: "Separate NIC, lowest DSCP, batched and compressed at source",
  },

  // Models layer
  {
    id: "model-serving-weights",
    name: "Model serving\nvLLM · SGLang · Dynamo · llm-d",
    planes: ["1", "2"],
    nic: "400G RDMA",
    placementConstraint: "SR-IOV VF; EP domain inside the scale-up boundary",
  },
  {
    id: "model-serving-dynamo-etcd",
    name: "Dynamo etcd / NATS",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same-AZ, quorum-latency sensitive, never starved",
  },
  {
    id: "llm-gateway",
    name: "LLM gateway\nLiteLLM",
    planes: ["3"],
    nic: "node-local",
    placementConstraint: "DaemonSet or sidecar — not a central Deployment",
  },
  {
    id: "guardrail-models",
    name: "Guardrail models",
    planes: ["3"],
    nic: "node-local",
    placementConstraint: "In-process or node-local — never centralised",
  },
  {
    id: "agent-memory",
    name: "Agent memory\nRedis · Mem0",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same rack, pipelined, cluster-aware client",
  },

  // Data & knowledge layer
  {
    id: "databases",
    name: "Databases\nPostgreSQL · MySQL · MongoDB · Neo4j",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same rack; sync replica same-AZ; node-local pooler",
  },
  {
    id: "clickhouse-analytics",
    name: "ClickHouse / Loki\nAnalytics · Logs",
    planes: ["3"],
    nic: "100G ingest",
    placementConstraint: "Separate NIC, lowest DSCP, batched and compressed at source",
  },
  {
    id: "vector-db",
    name: "Vector DB\nQdrant · Milvus",
    planes: ["3"],
    nic: "100G",
    placementConstraint: "Real bandwidth to object storage — size as a distributed system",
  },
  {
    id: "pipelines",
    name: "Pipelines\nKafka · Spark · Airflow",
    planes: ["3"],
    nic: "25–100G",
    placementConstraint: "Rack-aware replica selection; never shares queue with serving traffic",
  },
  {
    id: "connectors",
    name: "Connectors\nElastic · Fluentd · Debezium",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same-rack for data ingestion coordination",
  },

  // Infrastructure orchestration
  {
    id: "k8s-control",
    name: "Kubernetes control plane\netcd",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "Same-AZ, quorum-latency sensitive, never starved",
  },
  {
    id: "k8s-node-runtime",
    name: "Kubernetes node\ncontainer runtime",
    planes: ["2", "3"],
    nic: "node-local",
    placementConstraint: "Node-local CNI, service mesh sidecar",
  },
  {
    id: "kvm",
    name: "KVM\nVirtual machines",
    planes: ["3"],
    nic: "25G",
    placementConstraint: "SR-IOV passthrough for high-performance workloads",
  },
  {
    id: "slurm",
    name: "Slurm\nBatch scheduling",
    planes: ["3"],
    nic: "25–100G",
    placementConstraint: "Rack-aware job placement; bandwidth-aware scheduling",
  },
  {
    id: "prometheus-grafana-loki",
    name: "Prometheus · Grafana · Loki\nObservability stack",
    planes: ["3"],
    nic: "100G",
    placementConstraint: "Separate NIC, lowest DSCP, batched and compressed at source",
  },
  {
    id: "image-distribution",
    name: "Image & weight distribution",
    planes: ["3"],
    nic: "off-peak",
    placementConstraint: "P2P or node-local mirror — never central pull on scale-out",
  },
];
