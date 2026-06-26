export interface LayerDetail {
  heading: string;
  body: string;
}

export interface SubLayer {
  id: string;
  title: string;
  icons: { src: string; alt: string }[];
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
    id: "apis-solutions",
    title: "APIs & Solutions",
    subtitle: "End to end applications and domain specific workflows",
    description:
      "The top-most application layer exposes high-level SDKs, REST/gRPC interfaces, and pre-built workflow templates that let application developers consume the full agentic stack without needing to understand the underlying infrastructure.",
    details: [
      {
        heading: "Application SDKs",
        body: "Language-native SDKs (Python, TypeScript) for integrating agent capabilities into existing products with minimal boilerplate.",
      },
      {
        heading: "Domain Workflow Templates",
        body: "Pre-built templates for common enterprise scenarios: RAG chatbots, code-gen assistants, document analysis, and structured data extraction.",
      },
      {
        heading: "API Gateway",
        body: "Unified REST/gRPC facade with versioning, rate limiting, request tracing, and authentication hooks.",
      },
    ],
  },
  {
    id: "agent-orchestration",
    title: "Agent Orchestration & Reasoning",
    subtitle: "Agent Orchestrators, planning, MCP tool interaction",
    description:
      "The orchestration layer coordinates single and multi-agent workflows — deciding which tools to call, in what order, with what fallback strategies — using planning algorithms that run efficiently on Intel hardware.",
    subLayers: [
      {
        id: "orchestration-tools",
        title: "Orchestration",
        icons: [
          { src: "/n8n.jpg", alt: "N8N" },
          { src: "/zapier.jpg", alt: "Zapier" },
          { src: "/flowise.jpg", alt: "Flowise" },
          { src: "/activepieces.jpg", alt: "ActivePieces" },
        ],
      },
      {
        id: "mcp",
        title: "MCP Toolkit & Catalog",
        icons: [
          { src: "/mcp.jpg", alt: "MCP" },
        ],
      },
    ],
    details: [
      {
        heading: "Multi-Agent Coordination",
        body: "Supervisor/worker patterns, peer-to-peer agent messaging, and shared blackboard memory for complex task decomposition.",
      },
      {
        heading: "Orchestration Frameworks",
        body: "N8N, Zapier, Flowise, and ActivePieces provide visual and code-first workflow builders for connecting agents, tools, and data sources.",
      },
      {
        heading: "MCP Toolkit & Catalog",
        body: "Native Model Context Protocol support for plugging in external tools, APIs, and data sources via a standardised interface, backed by a curated tool catalog.",
      },
      {
        heading: "Retry & Fault Tolerance",
        body: "Configurable retry policies, circuit breakers, and agent checkpointing for long-running workflows.",
      },
    ],
  },
  {
    id: "memory-feedback",
    title: "Memory & Feedback",
    subtitle: "Pipeline memory, user-feedback, finetuning",
    icons: [
      { src: "/mem0.jpg", alt: "Mem0" },
      { src: "/langfuse.jpg", alt: "Langfuse" },
    ],
    description:
      "Gives agents persistent context and a continuous improvement loop: short-term working memory within a session, long-term episodic stores across sessions, and feedback pipelines that feed into fine-tuning.",
    details: [
      {
        heading: "Working Memory",
        body: "In-context scratch-pad with automatic summarisation when the context window nears capacity.",
      },
      {
        heading: "Long-Term Store",
        body: "Vector-indexed episodic memory backed by pgvector or FAISS for cross-session recall.",
      },
      {
        heading: "User Feedback Loop",
        body: "Thumbs-up/down and free-text correction signals captured inline and routed to a preference dataset.",
      },
      {
        heading: "Fine-Tuning Pipeline",
        body: "Automated DPO/RLHF dataset construction and fine-tuning trigger on accumulated feedback batches.",
      },
    ],
  },
  {
    id: "models-serving",
    title: "Models & Serving",
    subtitle: "AI Lifecycle management and AI Pipeline construction",
    icons: [
      { src: "/vllm.jpg", alt: "vLLM" },
      { src: "/llmd.jpg", alt: "llm-d" },
      { src: "/dynamo.jpg", alt: "Dynamo" },
      { src: "/sgl.jpg", alt: "SGLang" },
    ],
    description:
      "Manages the full lifecycle of models used by agents: registration, versioning, optimisation for Intel silicon, and serving through a unified inference API that spans local and cloud deployments.",
    details: [
      {
        heading: "Model Registry",
        body: "Version-controlled store of model weights, configs, and evaluation results with full lineage tracking.",
      },
      {
        heading: "Intel Optimisation",
        body: "Automated quantisation and graph compilation via OpenVINO and IPEX for Xeon and Gaudi targets.",
      },
      {
        heading: "Pipeline Construction",
        body: "Code-first composition of pre/post-processing, embedding, and generation stages with visual DAG preview.",
      },
      {
        heading: "Inference API",
        body: "OpenAI-compatible endpoint with batching, streaming, and disaggregated prefill/decode scheduling.",
      },
    ],
  },
  {
    id: "data-knowledge",
    title: "Data & Knowledge",
    subtitle: "Persistent storage, and enterprise knowledge access",
    description:
      "Connects agents to structured and unstructured enterprise knowledge — relational databases, document stores, vector indices, streaming pipelines, and data connectors — all with access controls inherited from the governance layer.",
    subLayers: [
      {
        id: "database",
        title: "Database",
        icons: [
          { src: "/mysql.jpg", alt: "MySQL" },
          { src: "/postgre.jpg", alt: "PostgreSQL" },
          { src: "/mongo.jpg", alt: "MongoDB" },
          { src: "/neo4j.jpg", alt: "Neo4J" },
        ],
      },
      {
        id: "vector-db",
        title: "Vector DB",
        icons: [
          { src: "/redis.jpg", alt: "Redis" },
          { src: "/qdrant.jpg", alt: "QDrant" },
          { src: "/milvus.jpg", alt: "Milvus" },
        ],
      },
      {
        id: "data-movers",
        title: "Data Movers / Analytics",
        icons: [
          { src: "/kafka.jpg", alt: "Kafka" },
          { src: "/spark.jpg", alt: "Spark" },
          { src: "/elastic.jpg", alt: "Elastic" },
        ],
      },
      {
        id: "data-connectors",
        title: "Data Connectors",
        icons: [
          { src: "/fluents.jpg", alt: "Fluentd" },
          { src: "/dabezium.jpg", alt: "Debezium" },
        ],
      },
      {
        id: "data-orchestrators",
        title: "Data Orchestrators",
        icons: [
          { src: "/airflow.jpg", alt: "Airflow" },
        ],
      },
    ],
    details: [
      {
        heading: "Databases",
        body: "MySQL, PostgreSQL, MongoDB, and Neo4J provide relational, document, and graph storage for structured enterprise data with schema introspection and safe SQL generation.",
      },
      {
        heading: "Vector Databases",
        body: "Redis, QDrant, and Milvus power AVX-512 / AMX-accelerated dense similarity search for sub-millisecond RAG and semantic retrieval workloads.",
      },
      {
        heading: "Data Movers & Analytics",
        body: "Kafka streams real-time events, Spark handles large-scale batch analytics, and Elasticsearch provides full-text search across enterprise datasets.",
      },
      {
        heading: "Data Connectors",
        body: "Fluentd aggregates logs from every service tier, while Debezium captures database change events to keep downstream stores in sync.",
      },
      {
        heading: "Data Orchestration",
        body: "Apache Airflow schedules and monitors end-to-end data pipelines with dependency resolution, conditional branching, retries, and lineage tracking.",
      },
    ],
  },
  {
    id: "infrastructure-orchestration",
    title: "Infrastructure & Orchestration",
    subtitle: "Compute, Storage, Network",
    icons: [
      { src: "/k8s.jpg", alt: "Kubernetes" },
      { src: "/kvm.jpg", alt: "KVM" },
      { src: "/slurm.jpg", alt: "Slurm" },
    ],
    description:
      "The base layer provisions and manages the compute, storage, and network resources on which all higher layers run — from bare-metal Intel Xeon and Gaudi nodes to Kubernetes clusters and high-speed interconnects.",
    details: [
      {
        heading: "Compute Management",
        body: "Kubernetes-native scheduling with Intel Device Plugin for Gaudi, GPU, and QAT accelerators.",
      },
      {
        heading: "Storage",
        body: "Distributed block and object storage with tiered caching optimised for large model weight loading.",
      },
      {
        heading: "Networking",
        body: "RDMA / RoCE high-bandwidth interconnects between inference nodes; NIC-offloaded encryption via QAT.",
      },
      {
        heading: "Auto-Scaling",
        body: "Horizontal pod autoscaler driven by inference queue depth and TTFT SLO targets.",
      },
    ],
  },
];

export const sidePanels: ClickableItem[] = [
  {
    id: "observability-telemetry",
    title: "Observability & Telemetry",
    description:
      "Cross-cutting monitoring, tracing, and continual performance analysis that spans every layer of the stack.",
    details: [
      {
        heading: "Distributed Tracing",
        body: "OpenTelemetry spans propagated through every agent step, tool call, and model inference for end-to-end latency breakdown.",
      },
      {
        heading: "Metrics & Dashboards",
        body: "Prometheus metrics scraped from each service, visualised in Grafana with pre-built Intel-AI dashboards.",
      },
      {
        heading: "Structured Logging",
        body: "JSON log events with trace correlation IDs shipped to an ELK stack for full-text search and alerting.",
      },
      {
        heading: "Continual Performance Analysis",
        body: "Automated regression detection comparing inference latency and throughput across software versions and hardware targets.",
      },
    ],
  },
  {
    id: "security-governance",
    title: "Security, Identities, Governance",
    description:
      "A cross-cutting vertical that enforces trust, identity, and policy across every layer of the stack — from infrastructure access controls through to API-level governance and model output validation.",
    details: [
      {
        heading: "Identity & Access",
        body: "OAuth2/OIDC integration with fine-grained role-based permissions scoped down to individual tool and model calls.",
      },
      {
        heading: "Policy Enforcement",
        body: "Declarative OPA policies evaluated at runtime to gate sensitive tool use or restrict data access by classification level.",
      },
      {
        heading: "Data Protection",
        body: "Encryption in transit and at rest, PII scrubbing pipelines, and immutable audit trails for every agent action.",
      },
      {
        heading: "Compliance Reporting",
        body: "Automated evidence collection and export for SOC 2, ISO 27001, and GDPR requirements.",
      },
    ],
  },
  {
    id: "automation",
    title: "Automation",
    description:
      "End-to-end automation layer that orchestrates recurring workflows, scheduled jobs, event-driven triggers, and self-healing runbooks across the entire agentic stack.",
    details: [
      {
        heading: "Workflow Scheduling",
        body: "Cron and event-driven triggers for recurring agent jobs, data refresh pipelines, and model retraining cycles.",
      },
      {
        heading: "Self-Healing Runbooks",
        body: "Automated remediation playbooks that detect anomalies via the observability layer and take corrective action without human intervention.",
      },
      {
        heading: "Pipeline Orchestration",
        body: "DAG-based task graphs with dependency resolution, parallel execution, and conditional branching across services.",
      },
    ],
  },
  {
    id: "cicd",
    title: "CI/CD — Lifecycle & Build",
    description:
      "The continuous integration and deployment pipeline that validates, packages, and ships every component of the agentic stack.",
    details: [
      {
        heading: "Build System",
        body: "Reproducible container builds with SBOM generation and multi-arch manifests targeting x86-64 and Intel Gaudi.",
      },
      {
        heading: "Test Gates",
        body: "Unit, integration, and benchmark gates that must pass before any component is promoted to staging.",
      },
      {
        heading: "Canary Deploys",
        body: "Traffic-split rollouts with automatic rollback triggered by SLO violations detected by the observability layer.",
      },
      {
        heading: "Model Promotion",
        body: "Automated model evaluation pipeline that gates promotion from the model registry to production serving.",
      },
    ],
  },
];
