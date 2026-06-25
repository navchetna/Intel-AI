"use client";

import { useState } from "react";
import Link from "next/link";
import { mainLayers, sidePanels, type ClickableItem } from "./layers";

/* ── sub-components (defined outside to avoid re-creation on every render) ── */

interface LayerCardProps {
  layer: ClickableItem;
  active: boolean;
  onToggle: (item: ClickableItem) => void;
}

function LayerCard({ layer, active, onToggle }: LayerCardProps) {
  return (
    <button
      onClick={() => onToggle(layer)}
      className={`
        group relative flex-1 w-full text-left flex items-center gap-4 px-10 py-7
        border-b border-white/[0.04] last:border-0
        transition-all duration-200 focus:outline-none overflow-hidden
        ${active
          ? "bg-gradient-to-r from-cyan-950/70 via-blue-950/40 to-transparent"
          : "hover:bg-gradient-to-r hover:from-blue-950/60 hover:via-blue-950/20 hover:to-transparent"
        }
      `}
    >
      {/* Left accent bar */}
      <div
        className={`
          absolute left-0 top-0 h-full w-[3px] transition-all duration-300
          ${active
            ? "bg-[#00c7fd] shadow-[0_0_14px_4px_rgba(0,199,253,0.5)]"
            : "bg-white/10 group-hover:bg-[#00c7fd]/40 group-hover:shadow-[0_0_6px_rgba(0,199,253,0.25)]"
          }
        `}
      />

      {/* Subtle background shimmer on hover */}
      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
        style={{ background: "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(0,199,253,0.04), transparent)" }}
      />

      <div className="relative pl-2 flex-1 min-w-0">
        <p className={`font-bold text-xl leading-tight tracking-wide transition-colors duration-200 ${active ? "text-[#00c7fd]" : "text-white/90 group-hover:text-white"}`}>
          {layer.title}
        </p>
        <p className="text-blue-300/55 text-sm mt-2 leading-snug font-medium">
          {layer.subtitle}
        </p>
      </div>

      {/* Right chevron */}
      <div className={`relative flex-shrink-0 text-[#00c7fd] transition-all duration-200 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
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
      {/* ── Page header ── */}
      <section className="bg-gradient-to-b from-intel-haze to-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">
            agentic-stack
          </p>
          <h1 className="mt-3 text-4xl font-bold text-intel-dark sm:text-5xl">
            Agentic Stack
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">
            A composable runtime for building, deploying, and orchestrating AI agents
            on Intel hardware. Click any layer to explore its details.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-md bg-intel-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-intel-dark"
            >
              Back home
            </Link>
            <code className="rounded-md bg-white px-3 py-2 text-sm text-gray-500 ring-1 ring-gray-200">
              API prefix: /agentic-stack
            </code>
          </div>
        </div>
      </section>

      {/* ── Diagram + details ── */}
      <section className="mx-auto max-w-screen-2xl px-6 py-10">
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
              <div className="relative flex" style={{ minHeight: 780 }}>

                {/* ── LEFT panels: Observability + Security ── */}
                <div className="flex border-r border-white/[0.05] flex-shrink-0">
                  <SidePanel
                    item={obsPanel}
                    active={selected?.id === obsPanel.id}
                    onToggle={toggle}
                    rotate
                    className="w-28 border-r border-white/[0.04]"
                  />
                  <SidePanel
                    item={securityPanel}
                    active={selected?.id === securityPanel.id}
                    onToggle={toggle}
                    rotate
                    className="w-28"
                  />
                </div>

                {/* ── CENTER: 6 horizontal layers ── */}
                <div className="flex flex-col flex-1 min-w-0">
                  {mainLayers.map((layer) => (
                    <LayerCard
                      key={layer.id}
                      layer={layer}
                      active={selected?.id === layer.id}
                      onToggle={toggle}
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
