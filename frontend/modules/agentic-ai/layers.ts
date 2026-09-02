export interface LayerDetail {
  heading: string;
  body: string;
}

export interface SubLayer {
  id: string;
  title: string;
  icons: { src: string; alt: string }[];
  /** Extra tool names to display next to the title when no icon asset exists yet for them. */
  note?: string;
}

export interface ClickableItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  details: LayerDetail[];
  icons?: { src: string; alt: string }[];
  subLayers?: SubLayer[];
}

export const mainLayers: ClickableItem[] = [
  {
    id: "solutions",
    title: "Solutions",
    subtitle: "End-to-end apps & domain workflows",
    description:
      "The top-most application layer exposes high-level SDKs, REST/gRPC interfaces, and pre-built workflow templates that let developers consume the full agentic stack without needing to understand the underlying infrastructure.",
    details: [
      { heading: "Application SDKs", body: "Language-native SDKs (Python, TypeScript) for integrating agent capabilities into existing products with minimal boilerplate." },
      { heading: "Domain Workflow Templates", body: "Pre-built templates for RAG chatbots, code-gen assistants, document analysis, and structured data extraction." },
      { heading: "API Gateway", body: "Unified REST/gRPC facade with versioning, rate limiting, request tracing, and authentication hooks." },
      { heading: "End-to-End Apps", body: "Reference applications that demonstrate full-stack agentic patterns — from user input to model response to action execution." },
    ],
  },
  {
    id: "agents",
    title: "Agents",
    subtitle: "Workflow, tasks, observability, evaluation, sandboxes & tools",
    subLayers: [
      {
        id: "workflow",
        title: "Workflow",
        note: "LangGraph",
        icons: [
          { src: "/n8n.jpg", alt: "n8n" },
        ],
      },
      {
        id: "tasks",
        title: "Tasks",
        icons: [
          { src: "/pydantic-ai.jpg", alt: "Pydantic AI" },
        ],
      },
      {
        id: "mcp",
        title: "MCP",
        icons: [
          { src: "/mcp.jpg", alt: "MCP" },
        ],
      },
      {
        id: "tasks-observability",
        title: "Tasks Observability",
        icons: [
          { src: "/pydantic-logfire.jpg", alt: "Pydantic Logfire" },
          { src: "/langfuse.jpg", alt: "Langfuse" },
        ],
      },
      {
        id: "evaluation",
        title: "Evaluation",
        icons: [
          { src: "/pydantic-evals.png", alt: "Pydantic Evals" },
        ],
      },
      {
        id: "sandboxes",
        title: "Sandboxes",
        icons: [
          { src: "/agent-sanbox.png", alt: "Agent Sandbox" },
        ],
      },
    ],
    description:
      "The agent layer covers everything that plans and executes work: visual/code-first workflow orchestration, type-safe task frameworks, per-task observability, systematic evaluation, isolated code-execution sandboxes, and the MCP tool gateway that governs what agents are allowed to call.",
    details: [
      { heading: "Workflow (n8n, LangGraph)", body: "Visual and graph-based orchestration builders that connect agents, tools, triggers, and data sources into automated pipelines." },
      { heading: "Tasks (Pydantic AI)", body: "Type-safe agent/task framework built around Pydantic validation — structured outputs, tool call schemas, and runtime type enforcement." },
      { heading: "Tasks Observability (Pydantic Logfire, Langfuse)", body: "Per-task tracing and structured logging via Pydantic Logfire, plus LLM observability via Langfuse — prompt tracking, token cost, quality scores, and user feedback correlation." },
      { heading: "Evaluation", body: "LLM-as-judge and deterministic scorers, agent regression suites, and benchmark harnesses run automatically on every change." },
      { heading: "Sandboxes", body: "Isolated microVM/container execution environments for agent-generated code with network isolation and resource limits." },
      { heading: "MCP", body: "Model Context Protocol registry and runtime for tool discovery, schema validation, access policy, and rate limiting." },
    ],
  },
  {
    id: "models",
    title: "Models",
    subtitle: "Gateway, serving & memory",
    subLayers: [
      {
        id: "llm-gateway",
        title: "LLM Gateway & Token Observability",
        icons: [
          { src: "/litellm.svg", alt: "LiteLLM" },
        ],
      },
      {
        id: "model-serving",
        title: "Model Serving",
        icons: [
          { src: "/vllm.jpg",   alt: "vLLM" },
          { src: "/sgl.jpg",    alt: "SGLang" },
          { src: "/dynamo.jpg", alt: "Dynamo" },
          { src: "/llmd.jpg",   alt: "llm-d" },
        ],
      },
      {
        id: "memory",
        title: "Memory",
        icons: [
          { src: "/redis.jpg",    alt: "Redis" },
        ],
      },
    ],
    description:
      "Manages model lifecycle and traffic: a LiteLLM gateway that routes and meters every token, high-throughput serving backends (vLLM, SGLang, Dynamo, llm-d), and the memory layer — Redis — that gives agents working recall.",
    details: [
      { heading: "LLM Gateway & Token Observability (LiteLLM)", body: "Single OpenAI-compatible endpoint that fan-outs to multiple backends with load balancing, fallback chains, and per-token cost tracking." },
      { heading: "vLLM", body: "High-throughput inference server with PagedAttention and continuous batching for maximum token throughput." },
      { heading: "SGLang", body: "Optimised for low TTFT via RadixAttention prefix caching and constrained structured generation." },
      { heading: "Dynamo / llm-d", body: "Distributed disaggregated serving across multi-node GPU/Gaudi clusters with smart prefill/decode routing." },
      { heading: "Memory (Redis)", body: "Redis provides low-latency working-memory caching for agents." },
    ],
  },
  {
    id: "data-knowledge",
    title: "Data & knowledge",
    subtitle: "SQL, vector DB, pipelines, connectors",
    subLayers: [
      {
        id: "database",
        title: "Database",
        icons: [
          { src: "/mysql.jpg",     alt: "MySQL" },
          { src: "/postgre.jpg",   alt: "PostgreSQL" },
          { src: "/mongo.jpg",     alt: "MongoDB" },
          { src: "/neo4j.jpg",     alt: "Neo4J" },
          { src: "/clickhouse.jpg", alt: "ClickHouse" },
          { src: "/elastic.jpg",   alt: "Elastic" },
        ],
      },
      {
        id: "vector-db",
        title: "Vector DB",
        icons: [
          { src: "/redis.jpg",  alt: "Redis" },
          { src: "/qdrant.jpg", alt: "QDrant" },
          { src: "/milvus.jpg", alt: "Milvus" },
        ],
      },
      {
        id: "data-movers",
        title: "Pipelines",
        icons: [
          { src: "/kafka.jpg",   alt: "Kafka" },
          { src: "/spark.jpg",   alt: "Spark" },
          { src: "/airflow.jpg", alt: "Airflow" },
        ],
      },
      {
        id: "data-connectors",
        title: "Connectors",
        icons: [
          { src: "/fluents.jpg",   alt: "Fluentd" },
          { src: "/dabezium.jpg",  alt: "Debezium" },
        ],
      },
    ],
    description:
      "Connects agents to structured and unstructured enterprise knowledge — relational databases, vector indices, streaming pipelines, and data connectors — with access controls inherited from the governance layer.",
    details: [
      { heading: "Databases", body: "MySQL, PostgreSQL, MongoDB, and Neo4J provide relational, document, and graph storage with schema introspection and safe SQL generation. ClickHouse adds columnar OLAP storage for high-volume logs, traces, and analytical queries, and Elasticsearch adds full-text search." },
      { heading: "Vector Databases", body: "Redis, QDrant, and Milvus power AVX-512 / AMX-accelerated dense similarity search for sub-millisecond RAG and semantic retrieval." },
      { heading: "Pipelines", body: "Kafka streams real-time events, Spark handles batch analytics, and Airflow orchestrates end-to-end data pipelines with lineage tracking." },
      { heading: "Connectors", body: "Fluentd for log aggregation, and Debezium for database change capture to keep downstream stores in sync." },
    ],
  },
  {
    id: "infrastructure-orchestration",
    title: "Infrastructure Orchestration",
    subtitle: "Kubernetes, KVM, Slurm, Prometheus+Grafana+Loki",
    subLayers: [
      {
        id: "k8s",
        title: "Kubernetes",
        icons: [
          { src: "/k8s.jpg", alt: "Kubernetes" },
        ],
      },
      {
        id: "vm",
        title: "Virtualization",
        icons: [
          { src: "/kvm.jpg", alt: "KVM" },
        ],
      },
      {
        id: "batch",
        title: "Batch",
        icons: [
          { src: "/slurm.jpg", alt: "Slurm" },
        ],
      },
      {
        id: "monitoring",
        title: "Monitoring",
        icons: [
          { src: "/observability-stack.svg", alt: "Prometheus+Grafana+Loki" },
        ],
      },
    ],
    description:
      "The base layer provisions and manages compute, storage, and network resources on which all higher layers run — from bare-metal Intel Xeon and Gaudi nodes to Kubernetes clusters and high-speed interconnects.",
    details: [
      { heading: "Kubernetes", body: "Kubernetes-native scheduling with Intel Device Plugin for Gaudi, GPU, and QAT accelerators — full operator support for model servers." },
      { heading: "KVM", body: "Hardware-accelerated virtual machine management for isolated tenant environments and dev/test workload separation." },
      { heading: "Slurm", body: "HPC job scheduler for batch training and evaluation workloads across multi-node Gaudi and Xeon clusters." },
      { heading: "Prometheus + Grafana + Loki", body: "Cluster-level metrics scraping and dashboards (Prometheus/Grafana) plus centralised log aggregation (Loki) for every node and workload in the stack." },
      { heading: "Auto-Scaling", body: "Horizontal pod autoscaler driven by inference queue depth and TTFT SLO targets, with predictive scale-up based on traffic patterns." },
    ],
  },
];

export const sidePanels: ClickableItem[] = [
  {
    id: "observability-telemetry",
    title: "Observability & telemetry",
    subtitle: "+ Langfuse",
    description:
      "Cross-cutting monitoring, tracing, and continual performance analysis spanning every layer of the stack.",
    details: [
      { heading: "Distributed Tracing", body: "OpenTelemetry spans propagated through every agent step, tool call, and model inference for end-to-end latency breakdown." },
      { heading: "Metrics & Dashboards", body: "Prometheus metrics scraped from each service, visualised in Grafana with pre-built Intel-AI dashboards." },
      { heading: "Langfuse Integration", body: "LLM observability via Langfuse — prompt tracking, token cost, quality scores, and user feedback correlation." },
      { heading: "Continual Performance Analysis", body: "Automated regression detection comparing inference latency and throughput across software versions and hardware targets." },
    ],
  },
  {
    id: "security-governance",
    title: "Security & governance",
    subtitle: "+ guardrails",
    description:
      "A cross-cutting vertical that enforces trust, identity, and policy across every layer — from infrastructure access through to API-level governance and model output validation.",
    details: [
      { heading: "Identity & Access", body: "OAuth2/OIDC integration with fine-grained role-based permissions scoped to individual tool and model calls." },
      { heading: "Policy Enforcement", body: "Declarative OPA policies evaluated at runtime to gate sensitive tool use or restrict data access by classification level." },
      { heading: "Guardrails", body: "Input and output filters that block PII leakage, prompt injection, and policy-violating content before it reaches the model or user." },
      { heading: "Compliance Reporting", body: "Automated evidence collection and export for SOC 2, ISO 27001, and GDPR requirements." },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    description:
      "End-to-end automation layer that orchestrates recurring workflows, scheduled jobs, event-driven triggers, and self-healing runbooks across the entire agentic stack.",
    details: [
      { heading: "Workflow Scheduling", body: "Cron and event-driven triggers for recurring agent jobs, data refresh pipelines, and model retraining cycles." },
      { heading: "Self-Healing Runbooks", body: "Automated remediation playbooks that detect anomalies and take corrective action without human intervention." },
      { heading: "Pipeline Orchestration", body: "DAG-based task graphs with dependency resolution, parallel execution, and conditional branching across services." },
    ],
  },
  {
    id: "cicd",
    title: "CI/CD lifecycle & build",
    description:
      "The continuous integration and deployment pipeline that validates, packages, and ships every component of the agentic stack.",
    details: [
      { heading: "Build System", body: "Reproducible container builds with SBOM generation and multi-arch manifests targeting x86-64 and Intel Gaudi." },
      { heading: "Test Gates", body: "Unit, integration, and benchmark gates that must pass before any component is promoted to staging." },
      { heading: "Canary Deploys", body: "Traffic-split rollouts with automatic rollback triggered by SLO violations detected by the observability layer." },
      { heading: "Model Promotion", body: "Automated model evaluation pipeline that gates promotion from the model registry to production serving." },
    ],
  },
];

// ── flat, stack-ordered list of every icon (used for workload selection/sizing) ──

export interface WorkloadLocation {
  icon: { src: string; alt: string };
  /** The owning main layer or cross-cutting panel. */
  layer: ClickableItem;
  /** Set when the icon lives inside a sub-layer (e.g. Data & knowledge → Database). */
  subLayer?: SubLayer;
}

export const allWorkloadIcons: WorkloadLocation[] = [
  ...mainLayers.flatMap(layer => {
    if (layer.subLayers) {
      return layer.subLayers.flatMap(subLayer =>
        subLayer.icons.map(icon => ({ icon, layer, subLayer })));
    }
    return (layer.icons ?? []).map(icon => ({ icon, layer }));
  }),
  ...sidePanels.flatMap(panel => (panel.icons ?? []).map(icon => ({ icon, layer: panel }))),
];
