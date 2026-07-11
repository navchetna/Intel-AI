"use client";

import { useState } from "react";
import Image from "next/image";
import { mainLayers, sidePanels, type ClickableItem, type SubLayer } from "./layers";
import { SizingSheet, type SizingTool } from "./SizingSheet";

// Two visual families matching the image's blue / warm distinction
// Blue family (platform layers): cyan → azure → royal blue
// Warm family (tooling layers):  periwinkle → violet → indigo
const LAYER_COLORS: string[] = [
  "#22d3ee",  // 1  APIs & solutions          — Cyan (blue family)
  "#818cf8",  // 2  Agent frameworks          — Periwinkle (warm family)
  "#7c6fff",  // 3  Workflow automation       — Violet-blue (warm family)
  "#9370db",  // 4  Tool gateway & MCP        — Medium purple (warm family)
  "#a78bfa",  // 5  Evaluation & testing      — Soft violet (warm family)
  "#38bdf8",  // 6  Memory & feedback         — Sky blue (blue family)
  "#8b5cf6",  // 7  Model gateway & serving   — Purple (warm family)
  "#60a5fa",  // 8  Data & knowledge          — Blue (blue family)
  "#c084fc",  // 9  Sandbox & code execution  — Lavender (warm family)
  "#3a77cc",  // 10 Infrastructure            — Intel Royal Blue (blue family)
];

// Icons that have a sizing sheet — keyed by the icon's alt text
const SIZING_MAP: Partial<Record<string, SizingTool>> = {
  "PostgreSQL": "postgres",
  "QDrant":     "qdrant",
  "Neo4J":      "neo4j",
  "MongoDB":    "mongodb",
  "Elastic":    "elastic",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Cross-cutting panel (left column, horizontal text) ────────────────────────

function CrossCuttingPanel({
  item, active, onToggle, className = "",
}: {
  item: ClickableItem; active: boolean; onToggle: (i: ClickableItem) => void; className?: string;
}) {
  const accentColor = "#818cf8";
  const accentRgb   = "129,140,248";
  return (
    <button
      onClick={() => onToggle(item)}
      className={`group relative flex flex-col items-start justify-center gap-0.5 px-3 py-3 text-left w-full focus:outline-none transition-all duration-200 ${className}`}
      style={{
        background: active
          ? `rgba(${accentRgb},0.10)`
          : undefined,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb},0.05)`; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {/* Active left bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300"
        style={{
          background: active ? accentColor : "transparent",
          boxShadow: active ? `0 0 10px rgba(${accentRgb},0.6)` : undefined,
        }}
      />
      <span
        className="relative text-[13px] font-bold leading-tight transition-colors duration-200"
        style={{ color: active ? accentColor : "var(--dm-txt-secondary)" }}
      >
        {item.title}
      </span>
      {item.subtitle && (
        <span
          className="relative text-[11px] font-medium leading-tight transition-colors duration-200"
          style={{ color: active ? `rgba(${accentRgb},0.6)` : "var(--dm-txt-faint)" }}
        >
          {item.subtitle}
        </span>
      )}
    </button>
  );
}

// ── Selectable icon (with optional sizing badge) ───────────────────────────────

function SizableIcon({
  icon, rgb, size = 44, onSizingClick,
}: {
  icon: { src: string; alt: string };
  rgb: string;
  size?: number;
  onSizingClick: (tool: SizingTool) => void;
}) {
  const [hov, setHov] = useState(false);
  const tool = SIZING_MAP[icon.alt];
  const dim = size === 44 ? "w-11 h-11" : "w-12 h-12";

  return (
    <div
      className={`flex flex-col items-center gap-1 ${tool ? "cursor-pointer" : ""}`}
      title={tool ? `Open ${icon.alt} sizing tool` : icon.alt}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={tool ? e => { e.stopPropagation(); onSizingClick(tool); } : undefined}
    >
      <div
        className={`relative ${dim} rounded-lg overflow-hidden flex items-center justify-center transition-all duration-200`}
        style={{
          border: `1px solid rgba(${rgb},${tool && hov ? 0.55 : 0.2})`,
          background: `rgba(${rgb},${tool && hov ? 0.15 : 0.07})`,
          boxShadow: tool && hov ? `0 0 14px rgba(${rgb},0.35)` : undefined,
        }}
      >
        <Image
          src={icon.src} alt={icon.alt}
          width={size} height={size}
          className="w-full h-full object-contain"
        />

        {/* Hover overlay for sizeable icons */}
        {tool && (
          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity duration-150"
            style={{
              background: `rgba(${rgb},0.72)`,
              opacity: hov ? 1 : 0,
            }}
          >
            <div className="flex flex-col items-center gap-0.5">
              {/* Ruler SVG */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3l18 18M8 16l2-2M13 11l2-2M18 6l-2 2" />
              </svg>
              <span className="text-[8px] font-bold text-white tracking-widest">SIZE</span>
            </div>
          </div>
        )}

        {/* Sizing badge (bottom-right corner) — always visible when has tool */}
        {tool && !hov && (
          <div
            className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-[3px] flex items-center justify-center"
            style={{ background: `rgba(${rgb},0.9)`, boxShadow: `0 0 6px rgba(${rgb},0.5)` }}
          >
            <svg width="7" height="7" viewBox="0 0 24 24" fill="white">
              <path d="M4 4h16v3H4zM4 10h5v3H4zM4 16h5v3H4zM11 10h5v3h-5zM11 16h5v3h-5zM18 10h2v3h-2zM18 16h2v3h-2z" />
            </svg>
          </div>
        )}
      </div>
      <span
        className="text-[9px] font-medium leading-none transition-colors duration-150"
        style={{ color: tool && hov ? `rgba(${rgb},0.9)` : "rgba(147,197,253,0.45)" }}
      >
        {icon.alt}
      </span>
    </div>
  );
}

// ── Layer row (right column) ──────────────────────────────────────────────────

function LayerRow({
  layer, active, onToggle, color, onSizingClick,
}: {
  layer: ClickableItem;
  active: boolean;
  onToggle: (i: ClickableItem) => void;
  color: string;
  onSizingClick: (tool: SizingTool) => void;
}) {
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

  const accentBar = (
    <div
      className="absolute left-0 top-0 h-full w-[3px] transition-all duration-300"
      style={{
        background: active || hovered ? color : `rgba(${rgb},0.2)`,
        boxShadow: active ? `0 0 14px 4px rgba(${rgb},0.45)` : hovered ? `0 0 6px rgba(${rgb},0.25)` : undefined,
      }}
    />
  );

  const shimmer = (
    <div
      className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${active ? "opacity-100" : "opacity-0"}`}
      style={{ background: `radial-gradient(ellipse 60% 50% at 15% 50%, rgba(${rgb},0.06), transparent)` }}
    />
  );

  const chevron = (
    <div
      className={`relative flex-shrink-0 transition-all duration-200 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0"}`}
      style={{ color }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        className="group relative w-full text-left flex flex-col border-b border-white/[0.06] last:border-0 focus:outline-none overflow-hidden"
        style={bgStyle}
      >
        {accentBar}
        {shimmer}
        {/* Title row */}
        <div className="relative flex items-center gap-3 px-8 pt-4 pb-2 w-full">
          <div className="pl-2 flex-1 min-w-0">
            <p className="font-bold text-[15px] leading-tight tracking-wide transition-colors duration-200"
              style={{ color: active ? color : hovered ? "var(--dm-txt-primary)" : "var(--dm-txt-body)" }}>
              {layer.title}
            </p>
            <p className="text-blue-300/50 text-xs mt-0.5 font-medium">{layer.subtitle}</p>
          </div>
          {chevron}
        </div>
        {/* Sub-layers strip */}
        <div className="relative flex flex-wrap items-start gap-x-6 gap-y-3 px-10 pb-5 border-t border-white/[0.05]">
          {(layer.subLayers as SubLayer[]).map(sub => (
            <div key={sub.id} className="flex flex-col gap-2 pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: `rgba(${rgb},0.65)` }}>
                {sub.title}
              </span>
              <div className="flex items-center gap-2">
                {sub.icons.map(icon => (
                  <SizableIcon
                    key={icon.alt}
                    icon={icon}
                    rgb={rgb}
                    size={44}
                    onSizingClick={onSizingClick}
                  />
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
      className="group relative w-full text-left flex items-center gap-3 px-8 py-4 border-b border-white/[0.06] last:border-0 focus:outline-none overflow-hidden"
      style={bgStyle}
    >
      {accentBar}
      {shimmer}
      <div className="relative pl-2 flex-1 min-w-0">
        <p className="font-bold text-[15px] leading-tight tracking-wide transition-colors duration-200"
          style={{ color: active ? color : hovered ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.88)" }}>
          {layer.title}
        </p>
        <p className="text-blue-300/50 text-xs mt-0.5 font-medium">{layer.subtitle}</p>
      </div>
      {/* Inline icons */}
      {layer.icons && layer.icons.length > 0 && (
        <div className="relative flex items-center gap-3 flex-shrink-0">
          {layer.icons.map(icon => (
            <SizableIcon
              key={icon.alt}
              icon={icon}
              rgb={rgb}
              size={48}
              onSizingClick={onSizingClick}
            />
          ))}
        </div>
      )}
      {chevron}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AgenticStackView() {
  const [selected, setSelected]       = useState<ClickableItem | null>(null);
  const [openSizing, setOpenSizing]   = useState<SizingTool | null>(null);

  const toggle = (item: ClickableItem) =>
    setSelected(prev => prev?.id === item.id ? null : item);

  return (
    <main>
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-stretch">

          {/* ── Architecture diagram ── */}
          <div className="xl:flex-[4] min-w-0">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: "var(--dm-page-bg)",
                boxShadow: "0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,199,253,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Dot-grid texture */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(0,199,253,0.06) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }} />

              {/* Window chrome */}
              <div className="relative flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]"
                style={{ background: "rgba(2,10,26,0.8)", backdropFilter: "blur(4px)" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80 shadow-[0_0_4px_rgba(255,95,87,0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]/80 shadow-[0_0_4px_rgba(254,188,46,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]/80 shadow-[0_0_4px_rgba(40,200,64,0.4)]" />
                </div>
                <span className="ml-2 text-[11px] font-mono text-blue-400/40 tracking-wide">
                  intel-ai · agentic-stack · architecture
                </span>
                {/* Legend */}
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25">
                  <div className="w-2 h-2 rounded-sm" style={{ background: "rgba(96,165,250,0.7)" }} />
                  <span>= sizing tool available</span>
                </div>
              </div>

              {/* ── Two-column diagram body ── */}
              <div className="relative flex">

                {/* LEFT: Cross-cutting planes column */}
                <div
                  className="flex-shrink-0 flex flex-col border-r border-white/[0.06]"
                  style={{ width: 160, background: "rgba(129,140,248,0.03)" }}
                >
                  {/* Column header */}
                  <div className="px-3 py-3 border-b border-white/[0.06] text-center">
                    <span className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: "#818cf8cc" }}>
                      Cross-cutting planes
                    </span>
                  </div>

                  {/* 4 cross-cutting panels */}
                  <div className="flex flex-col flex-1 divide-y divide-white/[0.05]">
                    {sidePanels.map(panel => (
                      <CrossCuttingPanel
                        key={panel.id}
                        item={panel}
                        active={selected?.id === panel.id}
                        onToggle={toggle}
                        className="flex-1"
                      />
                    ))}
                  </div>
                </div>

                {/* RIGHT: 10 horizontal layers */}
                <div className="flex flex-col flex-1 min-w-0">
                  {mainLayers.map((layer, index) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      active={selected?.id === layer.id}
                      onToggle={toggle}
                      color={LAYER_COLORS[index]}
                      onSizingClick={setOpenSizing}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Details panel ── */}
          <div className="xl:w-[420px] xl:flex-shrink-0 min-w-0 flex flex-col">
            {selected ? (
              <div
                key={selected.id}
                className="animate-fade-slide-in flex-1 overflow-y-auto rounded-2xl border border-intel-blue/15 bg-white shadow-xl shadow-blue-950/10 flex flex-col"
              >
                {/* Panel header */}
                <div className="sticky top-0 z-10 px-6 pt-6 pb-5 border-b border-gray-100/80 bg-gradient-to-br from-intel-haze/60 to-white flex-shrink-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-1 w-8 rounded-full bg-intel-energy" />
                        <div className="h-1 w-3 rounded-full bg-intel-energy/40" />
                      </div>
                      <h2 className="text-xl font-bold text-intel-dark leading-tight">{selected.title}</h2>
                      {selected.subtitle && (
                        <p className="mt-1 text-xs font-semibold text-intel-blue/80 tracking-wide">{selected.subtitle}</p>
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
                  <p className="text-sm text-gray-500 leading-relaxed">{selected.description}</p>
                </div>
                {/* Detail cards */}
                <div className="flex-1 p-5 grid gap-3 sm:grid-cols-2 auto-rows-min bg-gray-50/50">
                  {selected.details.map(d => (
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
                <p className="text-gray-400 text-sm font-medium">Select a layer to explore</p>
                <p className="text-gray-300 text-xs mt-1">Click any block in the diagram</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Sizing Sheet Modal ── */}
      {openSizing && (
        <SizingSheet
          tool={openSizing}
          onClose={() => setOpenSizing(null)}
        />
      )}
    </main>
  );
}
