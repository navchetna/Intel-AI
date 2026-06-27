"use client";

import { useState } from "react";
import Image from "next/image";
import { mainLayers, sidePanels, type ClickableItem, type SubLayer } from "./layers";

// Intel blue family — bright cyan (user-facing API layer) → deep royal blue (infrastructure base)
const LAYER_COLORS: string[] = [
  "#00DFFF",  // APIs & Solutions         — Bright Cyan
  "#00AAEE",  // Agent Orchestration      — Sky Blue
  "#3399FF",  // Memory & Feedback        — Azure
  "#5577EE",  // Models & Serving         — Periwinkle Blue
  "#55AADD",  // Data & Knowledge         — Steel Cyan
  "#3A77CC",  // Infrastructure           — Intel Royal Blue
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ── sub-components (defined outside to avoid re-creation on every render) ── */

interface LayerCardProps {
  layer: ClickableItem;
  active: boolean;
  onToggle: (item: ClickableItem) => void;
  color: string;
}

function LayerCard({ layer, active, onToggle, color }: LayerCardProps) {
  const [hovered, setHovered] = useState(false);
  const rgb = hexToRgb(color);
  const hasSubLayers = layer.subLayers && layer.subLayers.length > 0;

  const bgStyle = {
    background: active
      ? `linear-gradient(to right, rgba(${rgb},0.13), rgba(${rgb},0.05), transparent)`
      : hovered
        ? `linear-gradient(to right, rgba(${rgb},0.08), rgba(${rgb},0.03), transparent)`
        : `rgba(${rgb},0.03)`,
    transition: "background 0.2s ease",
  };

  /* Shared decorative elements */
  const accentBar = (
    <div
      className="absolute left-0 top-0 h-full w-[3px] transition-all duration-300"
      style={{
        background: active || hovered ? color : `rgba(${rgb},0.25)`,
        boxShadow: active ? `0 0 14px 4px rgba(${rgb},0.5)` : hovered ? `0 0 6px rgba(${rgb},0.3)` : undefined,
      }}
    />
  );
  const shimmer = (
    <div
      className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${active ? "opacity-100" : "opacity-0"}`}
      style={{ background: `radial-gradient(ellipse 60% 50% at 20% 50%, rgba(${rgb},0.06), transparent)` }}
    />
  );
  const chevron = (
    <div
      className={`relative flex-shrink-0 transition-all duration-200 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"}`}
      style={{ color }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );

  if (hasSubLayers) {
    return (
      <button
        onClick={() => onToggle(layer)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative w-full text-left flex flex-col border-b border-white/[0.08] last:border-0 focus:outline-none overflow-hidden"
        style={bgStyle}
      >
        {accentBar}
        {shimmer}

        {/* Title row */}
        <div className="relative flex items-center gap-4 px-10 pt-5 pb-3 w-full">
          <div className="pl-2 flex-1 min-w-0">
            <p
              className="font-bold text-xl leading-tight tracking-wide transition-colors duration-200"
              style={{ color: active ? color : hovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.88)" }}
            >
              {layer.title}
            </p>
            <p className="text-blue-300/55 text-sm mt-1 leading-snug font-medium">
              {layer.subtitle}
            </p>
          </div>
          {chevron}
        </div>

        {/* Sub-layers strip */}
        <div className="relative flex flex-wrap items-start gap-x-8 gap-y-4 px-12 pb-8 border-t border-white/[0.06]">
          {(layer.subLayers as SubLayer[]).map((sub) => (
            <div key={sub.id} className="flex flex-col gap-3 pt-5">
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: `rgba(${rgb},0.7)` }}
              >
                {sub.title}
              </span>
              <div className="flex items-center gap-3">
                {sub.icons.map((icon) => (
                  <div
                    key={icon.alt}
                    className="flex flex-col items-center gap-1.5"
                    title={icon.alt}
                  >
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center"
                      style={{
                        border: `1px solid rgba(${rgb},0.22)`,
                        background: `rgba(${rgb},0.07)`,
                      }}
                    >
                      <Image
                        src={icon.src}
                        alt={icon.alt}
                        width={56}
                        height={56}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="text-[10px] text-blue-300/50 font-medium leading-none">
                      {icon.alt}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onToggle(layer)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex-1 w-full text-left flex items-center gap-4 px-10 py-7 border-b border-white/[0.08] last:border-0 focus:outline-none overflow-hidden"
      style={bgStyle}
    >
      {accentBar}
      {shimmer}

      <div className="relative pl-2 flex-1 min-w-0">
        <p
          className="font-bold text-xl leading-tight tracking-wide transition-colors duration-200"
          style={{ color: active ? color : hovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.88)" }}
        >
          {layer.title}
        </p>
        <p className="text-blue-300/55 text-sm mt-2 leading-snug font-medium">
          {layer.subtitle}
        </p>
      </div>

      {/* Workload icons (e.g. K8S, KVM) */}
      {layer.icons && layer.icons.length > 0 && (
        <div className="relative flex items-center gap-4 flex-shrink-0">
          {layer.icons.map((icon) => (
            <div
              key={icon.alt}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              title={icon.alt}
            >
              <div
                className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-200"
                style={{
                  border: `1px solid rgba(${rgb},${active ? 0.45 : 0.22})`,
                  background: `rgba(${rgb},${active ? 0.1 : 0.06})`,
                  boxShadow: active ? `0 0 12px rgba(${rgb},0.25)` : undefined,
                }}
              >
                <Image
                  src={icon.src}
                  alt={icon.alt}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className="text-[10px] font-semibold tracking-wide uppercase transition-colors duration-200"
                style={{ color: active ? color : "rgba(147,197,253,0.6)" }}
              >
                {icon.alt}
              </span>
            </div>
          ))}
        </div>
      )}

      {chevron}
    </button>
  );
}

interface SidePanelProps {
  item: ClickableItem;
  active: boolean;
  onToggle: (item: ClickableItem) => void;
  /** true → bottom-to-top reading direction (left panels) */
  rotate?: boolean;
  className?: string;
}

function SidePanel({ item, active, onToggle, rotate = false, className = "" }: SidePanelProps) {
  const dir: React.CSSProperties = {
    writingMode: "vertical-rl",
    transform: rotate ? "rotate(180deg)" : undefined,
  };
  return (
    <button
      onClick={() => onToggle(item)}
      title={item.title}
      className={`
        group relative flex flex-col items-center justify-center gap-3 px-2
        transition-all duration-200 focus:outline-none overflow-hidden
        ${active ? "bg-gradient-to-b from-cyan-950/50 via-blue-950/30 to-transparent" : "hover:bg-white/[0.04]"}
        ${className}
      `}
    >
      {/* Glow backdrop when active */}
      {active && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 40% at 50% 50%, rgba(0,199,253,0.08), transparent)" }}
        />
      )}

      {/* Active indicator line */}
      <div className={`absolute ${rotate ? "left-0 top-0 bottom-0 w-[3px]" : "right-0 top-0 bottom-0 w-[3px]"} transition-all duration-300
        ${active ? "bg-[#00c7fd] shadow-[0_0_10px_rgba(0,199,253,0.6)]" : "bg-transparent group-hover:bg-white/10"}`}
      />

      <span
        className={`relative font-bold text-xl tracking-wide select-none whitespace-nowrap transition-colors duration-200 leading-tight
          ${active ? "text-[#00c7fd]" : "text-white/90 group-hover:text-white"}`}
        style={dir}
      >
        {item.title}
      </span>
      {item.subtitle && (
        <span
          className={`relative text-sm font-medium select-none whitespace-nowrap transition-colors duration-200 leading-snug
            ${active ? "text-[#00c7fd]/55" : "text-blue-300/55 group-hover:text-blue-300/70"}`}
          style={dir}
        >
          {item.subtitle}
        </span>
      )}
    </button>
  );
}

/* ── main component ── */

export function AgenticStackView() {
  const [selected, setSelected] = useState<ClickableItem | null>(null);

  const obsPanel      = sidePanels.find((p) => p.id === "observability-telemetry")!;
  const securityPanel = sidePanels.find((p) => p.id === "security-governance")!;
  const automationPanel = sidePanels.find((p) => p.id === "automation")!;
  const cicdPanel     = sidePanels.find((p) => p.id === "cicd")!;

  const toggle = (item: ClickableItem) =>
    setSelected((prev) => (prev?.id === item.id ? null : item));

  return (
    <main>
      {/* ── Diagram + details ── */}
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-stretch">

          {/* Architecture diagram — 4/6 width on xl */}
          <div className="xl:flex-[4] min-w-0">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: "linear-gradient(155deg, #020C1F 0%, #071535 55%, #0A1D42 100%)",
                boxShadow: "0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,199,253,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Dot-grid texture */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(0,199,253,0.07) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />

              {/* Window chrome */}
              <div
                className="relative flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]"
                style={{ background: "rgba(2,10,26,0.8)", backdropFilter: "blur(4px)" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80 shadow-[0_0_4px_rgba(255,95,87,0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]/80 shadow-[0_0_4px_rgba(254,188,46,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]/80 shadow-[0_0_4px_rgba(40,200,64,0.4)]" />
                </div>
                <span className="ml-2 text-[11px] font-mono text-blue-400/40 tracking-wide">
                  intel-ai · agentic-stack · architecture
                </span>
              </div>

              {/* Diagram grid */}
              <div className="relative flex" style={{ minHeight: 980 }}>

                {/* ── LEFT panels: Observability + Security ── */}
                <div className="flex flex-col border-r border-white/[0.05] flex-shrink-0">
                  <SidePanel
                    item={obsPanel}
                    active={selected?.id === obsPanel.id}
                    onToggle={toggle}
                    rotate
                    className="flex-1 w-28 border-b border-white/[0.04]"
                  />
                  <SidePanel
                    item={securityPanel}
                    active={selected?.id === securityPanel.id}
                    onToggle={toggle}
                    rotate
                    className="flex-1 w-28"
                  />
                </div>

                {/* ── CENTER: 6 horizontal layers ── */}
                <div className="flex flex-col flex-1 min-w-0">
                  {mainLayers.map((layer, index) => (
                    <LayerCard
                      key={layer.id}
                      layer={layer}
                      active={selected?.id === layer.id}
                      onToggle={toggle}
                      color={LAYER_COLORS[index]}
                    />
                  ))}
                </div>

                {/* ── RIGHT panels: Automation + CICD ── */}
                <div className="flex flex-col border-l border-white/[0.05] flex-shrink-0">
                  <SidePanel
                    item={automationPanel}
                    active={selected?.id === automationPanel.id}
                    onToggle={toggle}
                    className="flex-1 w-24 border-b border-white/[0.04]"
                  />
                  <SidePanel
                    item={cicdPanel}
                    active={selected?.id === cicdPanel.id}
                    onToggle={toggle}
                    className="flex-1 w-24"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Details panel — fixed 420px wide, stretches to diagram height ── */}
          <div className="xl:w-[420px] xl:flex-shrink-0 min-w-0 flex flex-col">
            {selected ? (
              <div
                key={selected.id}
                className="animate-fade-slide-in flex-1 overflow-y-auto rounded-2xl border border-intel-blue/15 bg-white shadow-xl shadow-blue-950/10 flex flex-col"
              >
                {/* Panel header — sticky within the scroll area */}
                <div className="sticky top-0 z-10 px-6 pt-6 pb-5 border-b border-gray-100/80 bg-gradient-to-br from-intel-haze/60 to-white flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-8 rounded-full bg-intel-energy" />
                        <div className="h-1 w-3 rounded-full bg-intel-energy/40" />
                      </div>
                      <h2 className="text-xl font-bold text-intel-dark leading-tight">
                        {selected.title}
                      </h2>
                      {selected.subtitle && (
                        <p className="mt-1 text-xs font-semibold text-intel-blue/80 tracking-wide">
                          {selected.subtitle}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      aria-label="Close"
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {selected.description}
                  </p>
                </div>

                {/* Detail cards — fills remaining height */}
                <div className="flex-1 p-5 grid gap-3 sm:grid-cols-2 auto-rows-min bg-gray-50/50">
                  {selected.details.map((d) => (
                    <div
                      key={d.heading}
                      className="group rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-intel-blue/20 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-intel-energy flex-shrink-0" />
                        <h4 className="text-sm font-semibold text-intel-dark">{d.heading}</h4>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed pl-3.5">{d.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-2xl border border-dashed border-gray-200 bg-white/40 flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-1.5 mb-4 opacity-30">
                  <div className="h-1 w-6 rounded-full bg-intel-energy" />
                  <div className="h-1 w-3 rounded-full bg-intel-energy" />
                  <div className="h-1 w-1.5 rounded-full bg-intel-energy" />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  Select a layer to explore
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Click any block in the diagram
                </p>
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
