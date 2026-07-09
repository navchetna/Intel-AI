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
    title: "APIs & solutions",
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
    id: "agent-frameworks",
    title: "Agent frameworks",
    subtitle: "LangGraph, CrewAI, AutoGen, Pydantic AI",
    description:
      "High-level orchestration frameworks that implement agent patterns — ReAct, plan-and-execute, multi-agent debate — and expose them via a unified API optimised for Intel hardware.",
    details: [
      { heading: "LangGraph", body: "Graph-based state machine for complex agent workflows with cycles, conditional branching, and persistent checkpointing across steps." },
      { heading: "CrewAI", body: "Role-based multi-agent teams where specialised agents collaborate on task decomposition and parallel sub-task execution." },
      { heading: "AutoGen", body: "Microsoft's conversational multi-agent framework supporting both autonomous and human-in-the-loop workflows." },
      { heading: "Pydantic AI", body: "Type-safe agent framework built around Pydantic validation — structured outputs, tool call schemas, and runtime type enforcement." },
    ],
  },
  {
    id: "workflow-automation",
    title: "Workflow automation",
    subtitle: "n8n, Zapier, Flowise, ActivePieces",
    icons: [
      { src: "/n8n.jpg",          alt: "n8n" },
      { src: "/zapier.jpg",       alt: "Zapier" },
      { src: "/flowise.jpg",      alt: "Flowise" },
      { src: "/activepieces.jpg", alt: "ActivePieces" },
    ],
    description:
      "Visual and code-first workflow builders that connect agents, tools, triggers, and data sources into automated pipelines without requiring deep engineering for every integration.",
    details: [
      { heading: "n8n", body: "Self-hosted visual workflow automation with 400+ built-in integrations and a native AI agent node for inline model calls." },
      { heading: "Zapier", body: "Cloud-based trigger-action automation connecting thousands of SaaS tools with AI step support." },
      { heading: "Flowise", body: "Open-source drag-and-drop LLM flow builder for chatbots, RAG chains, and multi-agent pipelines with a visual canvas." },
      { heading: "ActivePieces", body: "Open-source Zapier alternative with self-hosted deployment, custom piece creation, and enterprise SSO." },
    ],
  },
  {
    id: "tool-gateway-mcp",
    title: "Tool gateway & MCP catalog",
    subtitle: "Registry, tool governance, access control",
    icons: [
      { src: "/mcp.jpg", alt: "MCP" },
    ],
    description:
      "Centralised registry and runtime for all tools available to agents — discovery, versioning, schema validation, access policies, and rate limiting — exposed via the Model Context Protocol.",
    details: [
      { heading: "Tool Registry", body: "Version-controlled catalog of all tools, their input/output schemas, and capability metadata for agent discovery." },
      { heading: "MCP Interface", body: "Native Model Context Protocol server that exposes registered tools to any MCP-compatible agent framework." },
      { heading: "Access Control", body: "Per-tool permission policies scoped to agent roles, enforced at the gateway layer before execution." },
      { heading: "Rate Limiting", body: "Per-tool and per-agent rate limits with backpressure signalling to prevent runaway tool-call loops." },
    ],
  },
  {
    id: "evaluation-testing",
    title: "Evaluation & testing",
    subtitle: "Trace evals, agent regression suites",
    description:
      "Systematic evaluation of agent and model outputs through trace-based scoring, regression harnesses, and benchmark suites that run on every CI push.",
    details: [
      { heading: "Trace Evaluations", body: "LLM-as-judge and deterministic scorers applied to captured trace data for end-to-end output quality measurement." },
      { heading: "Agent Regression Suites", body: "Replay previous agent runs against updated models or prompts and assert output consistency within tolerance bounds." },
      { heading: "Benchmark Harnesses", body: "Standard benchmarks (MMLU, HumanEval, MTEB) run automatically on CI to catch model quality regressions before promotion." },
      { heading: "A/B Experimentation", body: "Traffic-split experiments between model versions with statistical significance tracking and automatic rollback on quality drops." },
    ],
  },
  {
    id: "memory-feedback",
    title: "Memory & feedback",
    subtitle: "Mem0, feedback capture, fine-tuning",
    icons: [
      { src: "/mem0.jpg",     alt: "Mem0" },
      { src: "/langfuse.jpg", alt: "Langfuse" },
    ],
    description:
      "Gives agents persistent context and a continuous improvement loop: short-term working memory within a session, long-term episodic stores across sessions, and feedback pipelines that feed into fine-tuning.",
    details: [
      { heading: "Working Memory", body: "In-context scratch-pad with automatic summarisation when the context window nears capacity." },
      { heading: "Long-Term Store (Mem0)", body: "Vector-indexed episodic memory backed by pgvector or FAISS for cross-session recall and personalisation." },
      { heading: "Feedback Capture", body: "Thumbs-up/down and free-text correction signals captured inline and routed to a preference dataset via Langfuse." },
      { heading: "Fine-Tuning Pipeline", body: "Automated DPO/RLHF dataset construction and fine-tuning trigger on accumulated feedback batches." },
    ],
  },
  {
    id: "model-gateway-serving",
    title: "Model gateway & serving",
    subtitle: "LiteLLM router → vLLM, SGLang, Dynamo",
    icons: [
      { src: "/vllm.jpg",    alt: "vLLM" },
      { src: "/sgl.jpg",     alt: "SGLang" },
      { src: "/dynamo.jpg",  alt: "Dynamo" },
      { src: "/llmd.jpg",    alt: "llm-d" },
    ],
    description:
      "Manages model lifecycle and routes inference traffic through a LiteLLM gateway to the optimal backend — vLLM, SGLang, or Dynamo — based on load, latency SLOs, and hardware availability.",
    details: [
      { heading: "LiteLLM Router", body: "Single OpenAI-compatible endpoint that fan-outs to multiple backends with load balancing, fallback chains, and cost tracking." },
      { heading: "vLLM Backend", body: "High-throughput inference server with PagedAttention and continuous batching for maximum token throughput." },
      { heading: "SGLang Backend", body: "Optimised for low TTFT via RadixAttention prefix caching and constrained structured generation." },
      { heading: "Dynamo Backend", body: "Distributed disaggregated serving across multi-node GPU/Gaudi clusters with smart prefill/decode routing." },
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
          { src: "/mysql.jpg",   alt: "MySQL" },
          { src: "/postgre.jpg", alt: "PostgreSQL" },
          { src: "/mongo.jpg",   alt: "MongoDB" },
          { src: "/neo4j.jpg",   alt: "Neo4J" },
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
          { src: "/elastic.jpg",   alt: "Elastic" },
          { src: "/fluents.jpg",   alt: "Fluentd" },
          { src: "/dabezium.jpg",  alt: "Debezium" },
        ],
      },
    ],
    description:
      "Connects agents to structured and unstructured enterprise knowledge — relational databases, vector indices, streaming pipelines, and data connectors — with access controls inherited from the governance layer.",
    details: [
      { heading: "Databases", body: "MySQL, PostgreSQL, MongoDB, and Neo4J provide relational, document, and graph storage with schema introspection and safe SQL generation." },
      { heading: "Vector Databases", body: "Redis, QDrant, and Milvus power AVX-512 / AMX-accelerated dense similarity search for sub-millisecond RAG and semantic retrieval." },
      { heading: "Pipelines", body: "Kafka streams real-time events, Spark handles batch analytics, and Airflow orchestrates end-to-end data pipelines with lineage tracking." },
      { heading: "Connectors", body: "Elasticsearch for full-text search, Fluentd for log aggregation, and Debezium for database change capture to keep downstream stores in sync." },
    ],
  },
  {
    id: "sandbox-execution",
    title: "Sandbox & code execution",
    subtitle: "E2B, Modal, Daytona, Firecracker",
    description:
      "Isolated execution environments for agent-generated code and tool testing — providing safe multi-tenant workload separation with network isolation and resource limits.",
    details: [
      { heading: "E2B", body: "Cloud-based secure microVM sandboxes for Python/JS code execution with sub-second cold-start and filesystem persistence." },
      { heading: "Modal", body: "Serverless GPU/CPU compute for ephemeral workloads — scales to zero between runs and supports custom container images." },
      { heading: "Daytona", body: "Standardised developer environments with OCI snapshot/restore for reproducible agent code execution contexts." },
      { heading: "Firecracker", body: "AWS-developed microVM hypervisor for multi-tenant isolation — each agent code run gets its own kernel with sub-125ms boot." },
    ],
  },
  {
    id: "infrastructure-orchestration",
    title: "Infrastructure & orchestration",
    subtitle: "Kubernetes, KVM, Slurm",
    icons: [
      { src: "/k8s.jpg",   alt: "Kubernetes" },
      { src: "/kvm.jpg",   alt: "KVM" },
      { src: "/slurm.jpg", alt: "Slurm" },
    ],
    description:
      "The base layer provisions and manages compute, storage, and network resources on which all higher layers run — from bare-metal Intel Xeon and Gaudi nodes to Kubernetes clusters and high-speed interconnects.",
    details: [
      { heading: "Kubernetes", body: "Kubernetes-native scheduling with Intel Device Plugin for Gaudi, GPU, and QAT accelerators — full operator support for model servers." },
      { heading: "KVM", body: "Hardware-accelerated virtual machine management for isolated tenant environments and dev/test workload separation." },
      { heading: "Slurm", body: "HPC job scheduler for batch training and evaluation workloads across multi-node Gaudi and Xeon clusters." },
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
