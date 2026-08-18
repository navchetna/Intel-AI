/**
 * DIRECTION CONTRACT - Network Architecture with SW-Stack Visual Language
 *
 * THESIS: Network plane requirements overlaid on the layered stack. Each workload icon shows
 * its network plane badges (color-coded 1-4+S) and NIC capacity. Full details appear on click
 * in the right detail panel. Matches Storage view's structure and styling.
 *
 * OWN-WORLD: Four-layer vertical stack (Agents/violet, Models/amber, Data/emerald, Infra/blue)
 * with hero-scale icons. Each workload displays plane badges and NIC capacity labels. Detail
 * panel shows plane reference or clicked workload's placement constraints.
 *
 * STORY: Architect scans the stack, sees network planes and NIC specs at a glance. Clicks a
 * workload to see placement constraints and network requirements.
 *
 * FIRST VIEWPORT: Full four-layer stack visible with plane badges and NIC labels integrated
 * into each workload card. Detail panel on right shows plane reference or workload details.
 *
 * FORM: Enhanced SW-Stack with network overlay.
 */
"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { type SubLayer } from "./layers";
import { NETWORK_PLANES, NETWORK_WORKLOADS, type NetworkWorkload } from "./network-data";

// Extended layer type with color for network view
interface NetworkLayer {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
  subLayers?: SubLayer[];
  icons?: { src: string; alt: string }[];
}

// Layer data - skip Solutions (index 0), show Agents through Infrastructure
const NETWORK_LAYERS: NetworkLayer[] = [
  {
    id: "agents",
    title: "Agents layer",
    subtitle: "Workflow, tasks, observability, evaluation, sandboxes & tools",
    color: "#a78bfa",
    subLayers: [
      {
        id: "workflow",
        title: "Workflow",
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
        id: "observability",
        title: "Observability",
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
  },
  {
    id: "models",
    title: "Models layer",
    subtitle: "Gateway, serving & memory",
    color: "#f59e0b",
    subLayers: [
      {
        id: "gateway",
        title: "LLM gateway",
        icons: [
          { src: "/litellm.svg", alt: "LiteLLM" },
        ],
      },
      {
        id: "serving",
        title: "Model serving",
        icons: [
          { src: "/vllm.jpg", alt: "vLLM" },
          { src: "/sgl.jpg", alt: "SGLang" },
          { src: "/dynamo.jpg", alt: "Dynamo" },
          { src: "/llmd.jpg", alt: "llm-d" },
        ],
      },
      {
        id: "memory",
        title: "Memory",
        icons: [
          { src: "/redis.jpg", alt: "Redis" },
        ],
      },
    ],
  },
  {
    id: "data",
    title: "Data & knowledge layer",
    subtitle: "SQL, vector DB, pipelines, connectors",
    color: "#34d399",
    subLayers: [
      {
        id: "databases",
        title: "Databases",
        icons: [
          { src: "/mysql.jpg", alt: "MySQL" },
          { src: "/postgre.jpg", alt: "PostgreSQL" },
          { src: "/mongo.jpg", alt: "MongoDB" },
          { src: "/neo4j.jpg", alt: "Neo4J" },
          { src: "/clickhouse.jpg", alt: "ClickHouse" },
        ],
      },
      {
        id: "vector",
        title: "Vector DB",
        icons: [
          { src: "/redis.jpg", alt: "Redis" },
          { src: "/qdrant.jpg", alt: "Qdrant" },
          { src: "/milvus.jpg", alt: "Milvus" },
        ],
      },
      {
        id: "pipelines",
        title: "Pipelines",
        icons: [
          { src: "/kafka.jpg", alt: "Kafka" },
          { src: "/spark.jpg", alt: "Spark" },
          { src: "/airflow.jpg", alt: "Airflow" },
        ],
      },
      {
        id: "connectors",
        title: "Connectors",
        icons: [
          { src: "/elastic.jpg", alt: "Elastic" },
          { src: "/fluents.jpg", alt: "Fluentd" },
          { src: "/dabezium.jpg", alt: "Debezium" },
        ],
      },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure orchestration",
    subtitle: "Kubernetes, KVM, Slurm, Prometheus+Grafana+Loki",
    color: "#3a77cc",
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
  },
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// Get network workload by icon alt text
function getNetworkWorkload(iconAlt: string): NetworkWorkload | undefined {
  const iconToWorkload: Record<string, string> = {
    "n8n": "workflow-orchestration",
    "Pydantic AI": "tasks-mcp-stdio",
    "MCP": "tasks-mcp-remote",
    "Pydantic Logfire": "tasks-observability",
    "Langfuse": "tasks-observability",
    "Pydantic Evals": "evaluation",
    "Agent Sandbox": "sandboxes",
    "vLLM": "model-serving-weights",
    "SGLang": "model-serving-weights",
    "Dynamo": "model-serving-weights",
    "llm-d": "model-serving-weights",
    "Redis": "agent-memory",
    "LiteLLM": "llm-gateway",
    "MySQL": "databases",
    "PostgreSQL": "databases",
    "MongoDB": "databases",
    "Neo4J": "databases",
    "ClickHouse": "clickhouse-analytics",
    "Qdrant": "vector-db",
    "Milvus": "vector-db",
    "Kafka": "pipelines",
    "Spark": "pipelines",
    "Airflow": "pipelines",
    "Elastic": "connectors",
    "Fluentd": "connectors",
    "Debezium": "connectors",
    "Kubernetes": "k8s-control",
    "KVM": "kvm",
    "Slurm": "slurm",
    "Prometheus+Grafana+Loki": "prometheus-grafana-loki",
  };

  const workloadId = iconToWorkload[iconAlt];
  return workloadId ? NETWORK_WORKLOADS.find(w => w.id === workloadId) : undefined;
}

// Get network plane by code
function getNetworkPlane(code: string) {
  return NETWORK_PLANES.find(p => p.code === code);
}

// Does this workload touch the given plane code?
function workloadMatchesPlane(workload: NetworkWorkload, planeCode: string): boolean {
  return workload.planes.includes(planeCode);
}

// ── Workload icon with plane badges and NIC label ─────────────────────

function WorkloadIconWithNetwork({
  icon, rgb, size = 52, onIconClick, isDark, highlightedPlane,
}: {
  icon: { src: string; alt: string };
  rgb: string;
  size?: number;
  onIconClick: (iconAlt: string) => void;
  isDark: boolean;
  highlightedPlane: string | null;
}) {
  const [hov, setHov] = useState(false);
  const dim = size >= 52 ? "w-[52px] h-[52px]" : "w-12 h-12";
  const workload = getNetworkWorkload(icon.alt);
  const isDimmed = highlightedPlane !== null && !(workload && workloadMatchesPlane(workload, highlightedPlane));

  return (
    <div
      className="flex flex-col items-center gap-1 cursor-pointer"
      style={{ opacity: isDimmed ? 0.25 : 1, filter: isDimmed ? "grayscale(70%)" : undefined, transition: "opacity 0.25s ease, filter 0.25s ease" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onIconClick(icon.alt)}
    >
      <div className={`relative ${dim}`}>
        <div
          className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200"
          style={{
            border: `1.5px solid rgba(${rgb},${hov ? 0.5 : 0.35})`,
            background: `linear-gradient(135deg, rgba(${rgb},${hov ? 0.15 : 0.1}) 0%, rgba(${rgb},${hov ? 0.08 : 0.06}) 100%)`,
            boxShadow: hov
              ? `0 6px 20px rgba(${rgb},0.3), 0 0 0 1px rgba(${rgb},0.2), inset 0 1px 0 rgba(255,255,255,0.12)`
              : `0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.1)`,
            transform: hov ? "translateY(-1px)" : undefined,
          }}
        >
          {/* White card backing */}
          <div
            className="w-[80%] h-[80%] rounded-lg overflow-hidden flex items-center justify-center relative"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
            }}
          >
            <Image
              src={icon.src}
              alt={icon.alt}
              width={size}
              height={size}
              className="w-full h-full object-contain p-1"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
            />
          </div>
        </div>

        {/* Plane badges - top right corner, stacked if multiple */}
        {workload && workload.planes.length > 0 && (
          <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
            {workload.planes.map((planeCode, idx) => {
              const plane = getNetworkPlane(planeCode);
              if (!plane) return null;
              return (
                <div
                  key={idx}
                  className="px-1.5 py-0.5 rounded text-[9px] font-black"
                  style={{
                    background: plane.color,
                    color: "white",
                    boxShadow: `0 2px 6px rgba(${plane.colorRgb},0.5)`,
                  }}
                >
                  P{planeCode}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Icon name */}
      <span
        className="text-[10px] font-semibold leading-none text-center max-w-[60px]"
        style={{
          color: hov
            ? `rgba(${rgb},1)`
            : isDark ? "rgba(147,197,253,0.55)" : "rgba(51,65,85,0.7)"
        }}
      >
        {icon.alt}
      </span>

      {/* NIC badge */}
      {workload && workload.nic && (
        <span
          className="text-[8px] font-mono font-semibold leading-none px-1.5 py-0.5 rounded text-center max-w-[72px] truncate"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.15)",
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(51,65,85,0.7)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.25)",
          }}
          title={workload.nic}
        >
          {workload.nic}
        </span>
      )}
    </div>
  );
}

// ── Layer divider ──────────────────────────────────────────────────────────────

function LayerDivider({ topColor, bottomColor }: { topColor: string; bottomColor: string }) {
  const topRgb = hexToRgb(topColor);
  const bottomRgb = hexToRgb(bottomColor);
  return (
    <div
      className="relative h-1.5 w-full flex-shrink-0"
      style={{
        background: `linear-gradient(to bottom, rgba(${topRgb},0.15) 0%, rgba(${topRgb},0.08) 30%, rgba(0,0,0,0.1) 50%, rgba(${bottomRgb},0.08) 70%, rgba(${bottomRgb},0.15) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(${topRgb},0.25), inset 0 -1px 0 rgba(${bottomRgb},0.25)`,
      }}
    />
  );
}

// ── Layer row ──────────────────────────────────────────────────────────────────

function NetworkLayerRow({
  layer, onIconClick, isDark, highlightedPlane,
}: {
  layer: NetworkLayer;
  onIconClick: (iconAlt: string) => void;
  isDark: boolean;
  highlightedPlane: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const color = layer.color || "#3a77cc";
  const rgb = hexToRgb(color);
  const hasSubLayers = layer.subLayers && layer.subLayers.length > 0;

  const bgStyle = {
    background: hovered
      ? `linear-gradient(to right, rgba(${rgb},0.08), rgba(${rgb},0.03), transparent)`
      : `rgba(${rgb},0.03)`,
    transition: "background 0.25s ease",
  };

  const accentBar = (
    <div
      className="absolute left-0 top-0 h-full w-1 transition-all duration-300"
      style={{
        background: hovered ? color : `rgba(${rgb},0.25)`,
        boxShadow: hovered ? `0 0 12px rgba(${rgb},0.4)` : undefined,
      }}
    />
  );

  if (hasSubLayers) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full flex flex-col"
        style={bgStyle}
      >
        {accentBar}
        {/* Title row */}
        <div className="relative flex items-center gap-3 px-8 pt-4 pb-3 w-full">
          <div className="pl-2 flex-1 min-w-0">
            <p
              className="font-black text-base leading-tight tracking-wide transition-colors duration-200"
              style={{ color: hovered ? color : "var(--dm-txt-body)" }}
            >
              {layer.title}
            </p>
            <p className="text-blue-300/60 text-[13px] mt-1 font-medium">{layer.subtitle}</p>
          </div>
        </div>
        {/* Sub-layers */}
        <div className="relative flex flex-wrap items-stretch gap-x-6 gap-y-4 px-10 pb-5 pt-1 border-t"
          style={{ borderColor: `rgba(${rgb},0.12)` }}>
          {(layer.subLayers as SubLayer[]).map((sub, idx) => (
            <Fragment key={sub.id}>
              {idx > 0 && <div className="self-stretch w-px my-2" style={{ background: `rgba(${rgb},0.2)` }} />}
              <div className="flex flex-col gap-3 pt-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: `rgba(${rgb},0.75)` }}>
                  {sub.title}
                  {sub.note && <span className="normal-case tracking-normal font-medium opacity-65 text-[10px]"> · {sub.note}</span>}
                </span>
                {sub.icons.length > 0 && (
                  <div className="flex items-center gap-3">
                    {sub.icons.map(icon => (
                      <WorkloadIconWithNetwork
                        key={icon.alt}
                        icon={icon}
                        rgb={rgb}
                        size={52}
                        onIconClick={onIconClick}
                        isDark={isDark}
                        highlightedPlane={highlightedPlane}
                      />
                    ))}
                  </div>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full flex items-center gap-3 px-8 py-5"
      style={bgStyle}
    >
      {accentBar}
      <div className="relative pl-2 flex-1 min-w-0">
        <p className="font-black text-base leading-tight tracking-wide" style={{ color: hovered ? color : "var(--dm-txt-body)" }}>
          {layer.title}
        </p>
        <p className="text-blue-300/60 text-[13px] mt-1 font-medium">{layer.subtitle}</p>
      </div>
      {layer.icons && layer.icons.length > 0 && (
        <div className="relative flex items-stretch gap-4 flex-shrink-0">
          {layer.icons.map((icon: { src: string; alt: string }, idx: number) => (
            <Fragment key={icon.alt}>
              {idx > 0 && <div className="self-stretch w-px my-2" style={{ background: `rgba(${rgb},0.2)` }} />}
              <WorkloadIconWithNetwork icon={icon} rgb={rgb} size={60} onIconClick={onIconClick} isDark={isDark} highlightedPlane={highlightedPlane} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Network plane reference (accordion) ────────────────────────────────────────
// Header row: Key (Pcode), Title, Latency — always visible. Expanding a plane also
// highlights the workloads that ride it in the layered stack on the left.

function NetworkPlaneReference({
  highlightedPlane, onPlaneHighlight,
}: {
  highlightedPlane: string | null;
  onPlaneHighlight: (code: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(planeId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(planeId)) next.delete(planeId);
      else next.add(planeId);
      return next;
    });
  }

  return (
    <div className="p-6 flex flex-col h-full overflow-y-auto">
      <h3 className="text-sm font-black uppercase tracking-[0.15em] text-white/50 mb-6">
        Network Plane Reference
      </h3>
      <div className="space-y-3 flex-1">
        {NETWORK_PLANES.map(plane => {
          const rgb = hexToRgb(plane.color);
          const isExpanded = expanded.has(plane.id);
          const isHighlighted = highlightedPlane === plane.code;
          return (
            <div
              key={plane.id}
              className="rounded-xl overflow-hidden border transition-shadow duration-200"
              style={{
                background: isHighlighted ? `rgba(${rgb},0.13)` : `rgba(${rgb},0.08)`,
                borderColor: isHighlighted ? plane.color : `rgba(${rgb},0.3)`,
                boxShadow: isHighlighted ? `0 0 0 1px ${plane.color}` : undefined,
              }}
            >
              {/* Header — always visible */}
              <button
                onClick={() => { toggleExpand(plane.id); onPlaneHighlight(plane.code); }}
                className="w-full flex items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <div
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{ color: plane.color, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                    <path d="M6 3l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div
                  className="w-12 h-8 flex items-center justify-center rounded font-black text-sm flex-shrink-0"
                  style={{ background: plane.color, color: "#fff" }}
                >
                  P{plane.code}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white/90 truncate">{plane.name}</div>
                  {isHighlighted && (
                    <div className="mt-0.5 text-[11px]" style={{ color: plane.color }}>
                      Workloads on this plane are highlighted
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-xs font-mono text-white/50">{plane.latency}</div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t space-y-2" style={{ borderColor: `rgba(${rgb},0.2)` }}>
                  <div className="text-xs text-white/60 leading-relaxed pt-3">
                    <span className="font-semibold text-white/70">Carries:</span> {plane.carries}
                  </div>
                  <div className="text-xs text-white/60 leading-relaxed">
                    <span className="font-semibold text-white/70">Sizing:</span> {plane.sizingProperty}
                  </div>
                  <div className="text-xs text-white/60 leading-relaxed">
                    <span className="font-semibold text-white/70">Failure:</span> {plane.failureSignature}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-white/40 mt-4 leading-relaxed pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        Click a plane to focus its workloads in the stack, or a workload icon to see its network requirements and placement constraints.
      </p>
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function DetailPanel({
  selectedIcon, highlightedPlane, onPlaneHighlight,
}: {
  selectedIcon: string | null;
  highlightedPlane: string | null;
  onPlaneHighlight: (code: string) => void;
}) {
  const workload = selectedIcon ? getNetworkWorkload(selectedIcon) : undefined;

  if (!workload) {
    return <NetworkPlaneReference highlightedPlane={highlightedPlane} onPlaneHighlight={onPlaneHighlight} />;
  }

  // Workload details view
  const planes = workload.planes.map(code => getNetworkPlane(code)).filter(Boolean);

  return (
    <div className="p-6">
      {/* Plane badges header */}
      {planes.length > 0 && (
        <div className="mb-6 flex gap-2">
          {planes.map((plane, idx) => {
            if (!plane) return null;
            const rgb = hexToRgb(plane.color);
            return (
              <div
                key={idx}
                className="p-4 rounded-lg border flex-1"
                style={{
                  background: `rgba(${rgb},0.1)`,
                  borderColor: `rgba(${rgb},0.3)`,
                }}
              >
                <div
                  className="text-2xl font-black mb-1"
                  style={{ color: plane.color }}
                >
                  Plane {plane.code}
                </div>
                <div className="text-xs font-semibold text-white/80">
                  {plane.name}
                </div>
                <div className="text-xs font-mono text-white/50 mt-1">
                  {plane.latency}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Workload name */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Workload
        </h3>
        <div className="text-lg font-bold text-white leading-tight whitespace-pre-line">
          {workload.name}
        </div>
      </div>

      {/* NIC specification */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          NIC Specification
        </h3>
        <div
          className="text-sm font-mono text-white/70 leading-relaxed p-3 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {workload.nic}
        </div>
      </div>

      {/* Placement constraint */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Placement Constraint
        </h3>
        <div className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
          {workload.placementConstraint}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AgenticNetworkView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [highlightedPlane, setHighlightedPlane] = useState<string | null>(null);

  function handlePlaneHighlight(code: string) {
    setHighlightedPlane(prev => (prev === code ? null : code));
  }

  return (
    <section className="mx-auto max-w-[1800px] px-6 py-4">
      <div className="relative flex gap-6">
        {/* LEFT: Layered stack */}
        <div
          className="flex-1 rounded-2xl overflow-hidden border"
          style={{
            background: "var(--dm-card-bg)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <div className="relative px-2 py-3 border-b" style={{ background: "var(--dm-table-head)", borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 px-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]/80" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]/80" />
              </div>
              <span className="text-xs font-mono text-blue-400/40 tracking-wide">
                network-architecture · layer-mapping
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            {NETWORK_LAYERS.map((layer, idx) => (
              <Fragment key={layer.id}>
                {idx > 0 && (
                  <LayerDivider
                    topColor={NETWORK_LAYERS[idx - 1].color || "#3a77cc"}
                    bottomColor={layer.color || "#3a77cc"}
                  />
                )}
                <NetworkLayerRow layer={layer} onIconClick={setSelectedIcon} isDark={isDark} highlightedPlane={highlightedPlane} />
              </Fragment>
            ))}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div
          className="flex-shrink-0 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            width: 480,
            background: "var(--dm-card-bg)",
            borderColor: "rgba(255,255,255,0.08)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          }}
        >
          <DetailPanel
            selectedIcon={selectedIcon}
            highlightedPlane={highlightedPlane}
            onPlaneHighlight={handlePlaneHighlight}
          />
        </div>
      </div>
    </section>
  );
}
