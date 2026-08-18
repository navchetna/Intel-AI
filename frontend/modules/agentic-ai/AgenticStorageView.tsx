/**
 * DIRECTION CONTRACT - Storage Architecture with SW-Stack Visual Language
 *
 * THESIS: Storage requirements overlaid on the beautiful layered stack. Each workload icon shows
 * its storage class (thermal colored badge) and filesystem. Full details appear on click in the
 * right detail panel. Maintains SW-Stack's dramatic visual impact while adding storage context.
 *
 * OWN-WORLD: Four-layer vertical stack (Agents/violet, Models/amber, Data/emerald, Infra/blue)
 * with hero-scale icons. Each workload displays thermal-colored storage class badge (C0-C5) and
 * filesystem label below. Detail panel shows design drivers and vendor tech when workload clicked.
 *
 * STORY: Architect scans the beautiful stack, sees storage classes and filesystems at a glance
 * below each icon. Clicks a workload to see full design drivers and critical tech in detail panel.
 *
 * FIRST VIEWPORT: Full four-layer stack visible with storage class badges and filesystem labels
 * integrated into each workload card. Detail panel on right shows overview or clicked workload.
 *
 * FORM: Enhanced SW-Stack with storage overlay.
 */
"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { type SubLayer } from "./layers";
import { STORAGE_CLASSES, STORAGE_WORKLOADS, type StorageWorkload } from "./storage-data";
import { StorageClassReference } from "./StorageClassReference";

// Extended layer type with color for storage view
interface StorageLayer {
  id: string;
  title: string;
  subtitle?: string;
  color?: string;
  subLayers?: SubLayer[];
  icons?: { src: string; alt: string }[];
}

// Layer data - skip Solutions (index 0), show Agents through Infrastructure
const STORAGE_LAYERS: StorageLayer[] = [
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

// Get storage workload by icon alt text
function getStorageWorkload(iconAlt: string): StorageWorkload | undefined {
  const iconToWorkload: Record<string, string> = {
    "n8n": "workflow-orchestration",
    "Pydantic AI": "tasks-mcp",
    "MCP": "tasks-mcp",
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
    "Airflow": "pipelines-airflow",
    "Elastic": "connectors",
    "Fluentd": "connectors",
    "Debezium": "debezium",
    "Kubernetes": "k8s-node-runtime",
    "KVM": "kvm",
    "Slurm": "slurm",
    "Prometheus+Grafana+Loki": "prometheus-grafana-loki",
  };

  const workloadId = iconToWorkload[iconAlt];
  return workloadId ? STORAGE_WORKLOADS.find(w => w.id === workloadId) : undefined;
}

// A workload's classId can be composite (e.g. "C0, C3, C4") — resolve every class it
// touches, in order, so each can be shown as its own separately-colored box.
function getStorageClasses(classId: string) {
  const codes = classId.split(/[,→/+]/).map(s => s.trim().toLowerCase());
  return codes.map(code => STORAGE_CLASSES.find(c => c.id === code)).filter((c): c is (typeof STORAGE_CLASSES)[number] => !!c);
}

// A workload's classId can be composite (e.g. "C0, C3, C4", "C0 → C4", "C0 / C2") —
// match against any code it touches, not just the primary one.
function workloadMatchesClass(workload: StorageWorkload, classCode: string): boolean {
  return workload.classId.split(/[,→/+]/).map(s => s.trim()).includes(classCode);
}

// ── Workload icon with storage class badge and filesystem ─────────────────────

function WorkloadIconWithStorage({
  icon, rgb, size = 52, onIconClick, isDark, highlightedClass,
}: {
  icon: { src: string; alt: string };
  rgb: string;
  size?: number;
  onIconClick: (iconAlt: string) => void;
  isDark: boolean;
  highlightedClass: string | null;
}) {
  const [hov, setHov] = useState(false);
  const dim = size >= 52 ? "w-[52px] h-[52px]" : "w-12 h-12";
  const workload = getStorageWorkload(icon.alt);
  const storageClasses = workload ? getStorageClasses(workload.classId) : [];
  const isDimmed = highlightedClass !== null && !(workload && workloadMatchesClass(workload, highlightedClass));

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

        {/* Storage class badges - top right corner, one box per class, in that class's color */}
        {storageClasses.length > 0 && (
          <div className="absolute -top-1 -right-1 flex flex-col items-end gap-0.5">
            {storageClasses.map(sc => (
              <div
                key={sc.code}
                className="px-1.5 py-0.5 rounded text-[9px] font-black leading-none"
                style={{
                  background: sc.color,
                  color: "white",
                  boxShadow: `0 2px 6px rgba(${hexToRgb(sc.color)},0.5)`,
                }}
              >
                {sc.code}
              </div>
            ))}
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

      {/* Filesystem badge */}
      {workload && (
        <span
          className="text-[8px] font-mono font-semibold leading-none px-1.5 py-0.5 rounded text-center max-w-[72px] truncate"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(148,163,184,0.15)",
            color: isDark ? "rgba(255,255,255,0.4)" : "rgba(51,65,85,0.7)",
            border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(148,163,184,0.25)",
          }}
          title={workload.filesystem}
        >
          {workload.filesystem.split('\n')[0].split(',')[0].trim()}
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

function StorageLayerRow({
  layer, onIconClick, isDark, highlightedClass,
}: {
  layer: StorageLayer;
  onIconClick: (iconAlt: string) => void;
  isDark: boolean;
  highlightedClass: string | null;
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
                      <WorkloadIconWithStorage
                        key={icon.alt}
                        icon={icon}
                        rgb={rgb}
                        size={52}
                        onIconClick={onIconClick}
                        isDark={isDark}
                        highlightedClass={highlightedClass}
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
              <WorkloadIconWithStorage icon={icon} rgb={rgb} size={60} onIconClick={onIconClick} isDark={isDark} highlightedClass={highlightedClass} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────────────────

function DetailPanel({ selectedIcon, selectedVendors, onVendorSelect, highlightedClass, onClassHighlight }: {
  selectedIcon: string | null;
  selectedVendors: Record<string, string>;
  onVendorSelect: (classCode: string, vendorPlatform: string) => void;
  highlightedClass: string | null;
  onClassHighlight: (classCode: string) => void;
}) {
  const workload = selectedIcon ? getStorageWorkload(selectedIcon) : undefined;
  const storageClasses = workload ? getStorageClasses(workload.classId) : [];

  if (!workload || storageClasses.length === 0) {
    // Default view: storage class overview with vendor selection
    return (
      <div className="p-6 flex flex-col h-full overflow-y-auto">
        <StorageClassReference
          selectedVendors={selectedVendors}
          onVendorSelect={onVendorSelect}
          highlightedClass={highlightedClass}
          onClassHighlight={onClassHighlight}
        />
        <p className="text-xs text-white/40 mt-4 leading-relaxed pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          Click a workload icon to see its specific storage requirements, filesystem configuration, and design drivers.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Storage class badges header - one box per class, separately colored */}
      <div className="mb-6 flex flex-wrap gap-2">
        {storageClasses.map(sc => {
          const rgb = hexToRgb(sc.color);
          return (
            <div
              key={sc.code}
              className="p-3 rounded-lg border"
              style={{ background: `rgba(${rgb},0.1)`, borderColor: `rgba(${rgb},0.3)` }}
            >
              <div className="text-2xl font-black mb-0.5" style={{ color: sc.color }}>
                {sc.code}
              </div>
              <div className="text-xs font-semibold text-white/80">{sc.name}</div>
              <div className="text-[10px] font-mono text-white/50 mt-0.5">{sc.latency}</div>
            </div>
          );
        })}
      </div>

      {/* Workload name */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Workload
        </h3>
        <div className="text-lg font-bold text-white leading-tight whitespace-pre-line">
          {workload.name}
        </div>
      </div>

      {/* Filesystem */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Filesystem / Data Path
        </h3>
        <div
          className="text-sm font-mono text-white/70 leading-relaxed whitespace-pre-line p-3 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {workload.filesystem}
        </div>
      </div>

      {/* Key design driver */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Key Design Driver
        </h3>
        <div className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
          {workload.keyDriver}
        </div>
      </div>

      {/* Critical tech & vendors */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/50 mb-2">
          Critical Tech & Vendors
        </h3>
        <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
          {workload.criticalTech}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AgenticStorageView() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Record<string, string>>({});
  const [highlightedClass, setHighlightedClass] = useState<string | null>(null);

  function handleClassHighlight(classCode: string) {
    setHighlightedClass(prev => (prev === classCode ? null : classCode));
  }

  function handleVendorSelect(classCode: string, vendorPlatform: string) {
    setSelectedVendors(prev => ({
      ...prev,
      [classCode]: vendorPlatform
    }));
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
                storage-architecture · layer-mapping
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            {STORAGE_LAYERS.map((layer, idx) => (
              <Fragment key={layer.id}>
                {idx > 0 && (
                  <LayerDivider
                    topColor={STORAGE_LAYERS[idx - 1].color || "#3a77cc"}
                    bottomColor={layer.color || "#3a77cc"}
                  />
                )}
                <StorageLayerRow layer={layer} onIconClick={setSelectedIcon} isDark={isDark} highlightedClass={highlightedClass} />
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
            selectedVendors={selectedVendors}
            onVendorSelect={handleVendorSelect}
            highlightedClass={highlightedClass}
            onClassHighlight={handleClassHighlight}
          />
        </div>
      </div>
    </section>
  );
}
