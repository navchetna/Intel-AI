/**
 * DIRECTION CONTRACT - SW-Stack Agentic Infrastructure View (Bold Edition)
 *
 * THESIS: The agentic stack as a precision layered architecture diagram. Icons are hero-scale
 * product cards with dramatic lighting; layers are visually distinct bands with pronounced separation;
 * the whole composition reads as the technical centerpiece of the application.
 *
 * OWN-WORLD: Five-layer vertical stack (Solutions, Agents, Models, Data, Infrastructure) each with
 * distinct accent color (cyan/violet/amber/emerald/blue). Icons rendered as product cards with rim
 * lighting, soft shadows, and white backing. Layer dividers are thick gradient bands. Cross-cutting
 * concerns (Security, Governance, Observability) in left rail with horizontal text.
 *
 * STORY: Architect scans the stack top-to-bottom, sees each layer's tools at hero scale with clear
 * visual separation. Clicks a layer to expand sub-categories. Hovers icons to see sizing action.
 * Selection mode for choosing workloads to size.
 *
 * FIRST VIEWPORT: Full five-layer stack visible, icons at 56-64px with dramatic depth and rim light,
 * thick 6px gradient dividers between layers, left rail cross-cutting panels with accent bars, layer
 * colors at full saturation with glowing accent bars and radial gradients on active state.
 *
 * FORM: Enhanced layered architecture diagram - chosen for visual impact and technical precision.
 *
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
 * verdict, and DESIGN.md
 */
"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import { mainLayers, sidePanels, type ClickableItem, type SubLayer } from "./layers";
import { SIZING_MAP } from "./sizing-wiring";
import { useTheme } from "@/contexts/ThemeContext";

// One distinct color per top-level layer, in stack order top → bottom.
const LAYER_COLORS: string[] = [
  "#22d3ee",  // 1  Solutions                  — Cyan
  "#a78bfa",  // 2  Agents                     — Violet
  "#f59e0b",  // 3  Models                     — Amber
  "#34d399",  // 4  Data & knowledge           — Emerald
  "#3a77cc",  // 5  Infrastructure orchestration — Intel Royal Blue
];

const EMPTY_SELECTION: Set<string> = new Set();

/** Layer-click detail panel is pending accurate content — flip back on once it's ready. */
const SHOW_LAYER_DETAILS = false;

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Cross-cutting panel (left column, horizontal text) ────────────────────────

function CrossCuttingPanel({
  item, active, onToggle, className = "", onSizingClick = () => {}, selectionMode, selectedWorkloads, onToggleWorkload, isDark,
}: {
  item: ClickableItem;
  active: boolean;
  onToggle: (i: ClickableItem) => void;
  className?: string;
  onSizingClick?: (workloadId: string) => void;
  selectionMode?: boolean;
  selectedWorkloads?: Set<string>;
  onToggleWorkload?: (workloadId: string) => void;
  isDark: boolean;
}) {
  const accentColor = "#818cf8";
  const accentRgb   = "129,140,248";
  const activeTextColor = isDark ? accentColor : "#0f172a";
  return (
    <button
      onClick={() => onToggle(item)}
      className={`group relative flex flex-col items-start justify-center gap-0.5 px-3 py-3 text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 transition-all duration-250 ${className}`}
      style={{
        background: active
          ? `rgba(${accentRgb},0.14)`
          : undefined,
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb},0.07)`; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {/* Active left bar - thicker */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300"
        style={{
          background: active ? accentColor : "transparent",
          boxShadow: active ? `0 0 16px rgba(${accentRgb},0.7), 0 0 4px rgba(${accentRgb},1)` : undefined,
        }}
      />
      <span
        className="relative text-[13px] font-bold leading-tight transition-colors duration-200"
        style={{ color: active ? activeTextColor : "var(--dm-txt-secondary)" }}
      >
        {item.title}
      </span>
      {item.subtitle && (
        <span
          className="relative text-[11px] font-medium leading-tight transition-colors duration-200"
          style={{ color: active ? (isDark ? `rgba(${accentRgb},0.7)` : "rgba(15,23,42,0.7)") : "var(--dm-txt-faint)" }}
        >
          {item.subtitle}
        </span>
      )}
      {item.icons && item.icons.length > 0 && (
        <div className="relative flex items-center gap-2.5 mt-2">
          {item.icons.map(icon => (
            <HeroIcon
              key={icon.alt}
              icon={icon}
              rgb={accentRgb}
              size={52}
              onSizingClick={onSizingClick}
              selectionMode={selectionMode}
              selectedWorkloads={selectedWorkloads}
              onToggleWorkload={onToggleWorkload}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </button>
  );
}

// ── Hero-scale icon with dramatic depth and rim lighting ──────────────────────

function HeroIcon({
  icon, rgb, size = 56, onSizingClick, selectionMode = false, selectedWorkloads = EMPTY_SELECTION, onToggleWorkload = () => {}, isDark,
}: {
  icon: { src: string; alt: string };
  rgb: string;
  size?: number;
  onSizingClick: (workloadId: string) => void;
  selectionMode?: boolean;
  selectedWorkloads?: Set<string>;
  onToggleWorkload?: (workloadId: string) => void;
  isDark: boolean;
}) {
  const [hov, setHov] = useState(false);
  const tool = SIZING_MAP[icon.alt];
  const dim = size >= 60 ? "w-[60px] h-[60px]" : size >= 56 ? "w-14 h-14" : size >= 52 ? "w-[52px] h-[52px]" : "w-12 h-12";
  const isSelected = selectedWorkloads.has(icon.alt);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${tool ? "cursor-pointer" : ""}`}
      title={tool ? `Open ${icon.alt} sizing tool` : icon.alt}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={tool ? e => { e.stopPropagation(); onSizingClick(icon.alt); } : undefined}
    >
      <div className={`relative ${dim}`}>
        {/* Selection checkmark */}
        {selectionMode && (
          <div
            role="checkbox"
            aria-checked={isSelected}
            onClick={e => { e.stopPropagation(); onToggleWorkload(icon.alt); }}
            className="absolute -top-2.5 -left-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200"
            style={{
              background: isSelected ? "#22d3ee" : "transparent",
              border: isSelected ? "2.5px solid rgba(255,255,255,0.95)" : `2.5px solid ${isDark ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)"}`,
              boxShadow: isSelected ? "0 0 12px rgba(34,211,238,0.8), 0 2px 8px rgba(0,0,0,0.3)" : "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </div>
        )}
        <div
          className="w-full h-full rounded-xl overflow-hidden flex items-center justify-center transition-all duration-250"
          style={{
            border: `1.5px solid rgba(${rgb},${tool && hov ? 0.7 : 0.35})`,
            background: `linear-gradient(135deg, rgba(${rgb},${tool && hov ? 0.2 : 0.1}) 0%, rgba(${rgb},${tool && hov ? 0.12 : 0.06}) 100%)`,
            boxShadow: tool && hov
              ? `0 8px 24px rgba(${rgb},0.4), 0 0 0 1px rgba(${rgb},0.3), inset 0 1px 0 rgba(255,255,255,0.15)`
              : `0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(${rgb},0.15), inset 0 1px 0 rgba(255,255,255,0.1)`,
            transform: tool && hov ? "translateY(-2px) scale(1.02)" : undefined,
          }}
        >
          {/* White card backing with product image */}
          <div
            className="w-[80%] h-[80%] rounded-lg overflow-hidden flex items-center justify-center relative"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 100%)",
              boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
            }}
          >
            <Image
              src={icon.src} alt={icon.alt}
              width={size} height={size}
              className="w-full h-full object-contain p-1"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
            />
          </div>

          {/* Sizing hover overlay */}
          {tool && (
            <div
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
              style={{
                background: `linear-gradient(135deg, rgba(${rgb},0.85) 0%, rgba(${rgb},0.75) 100%)`,
                opacity: hov ? 1 : 0,
                backdropFilter: "blur(2px)",
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
                  <path d="M3 3l18 18M8 16l2-2M13 11l2-2M18 6l-2 2" />
                </svg>
                <span className="text-[9px] font-black text-white tracking-[0.12em]" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                  SIZE
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      <span
        className="text-[11px] font-semibold leading-none transition-colors duration-150 text-center max-w-[72px]"
        style={{ color: tool && hov ? `rgba(${rgb},1)` : isDark ? "rgba(147,197,253,0.55)" : "#0f172a" }}
      >
        {icon.alt}
      </span>
    </div>
  );
}

// ── Thick gradient divider between layers ─────────────────────────────────────

function LayerDivider({ topColor, bottomColor }: { topColor: string; bottomColor: string }) {
  const topRgb = hexToRgb(topColor);
  const bottomRgb = hexToRgb(bottomColor);

  return (
    <div
      className="relative h-2 w-full flex-shrink-0"
      style={{
        background: `linear-gradient(to bottom,
          rgba(${topRgb},0.15) 0%,
          rgba(${topRgb},0.08) 30%,
          rgba(0,0,0,0.1) 50%,
          rgba(${bottomRgb},0.08) 70%,
          rgba(${bottomRgb},0.15) 100%)`,
        boxShadow: `inset 0 1px 0 rgba(${topRgb},0.25), inset 0 -1px 0 rgba(${bottomRgb},0.25)`,
      }}
    />
  );
}

// ── Vertical separator between sibling groups within a layer row ──────────────

function GroupDivider({ rgb }: { rgb: string }) {
  return (
    <div
      className="self-stretch w-px flex-shrink-0 my-2"
      style={{ background: `rgba(${rgb},0.25)` }}
    />
  );
}

// ── Layer row (right column) with pronounced visual weight ────────────────────

function LayerRow({
  layer, active, onToggle, color, onSizingClick, selectionMode, selectedWorkloads, onToggleWorkload, isDark,
}: {
  layer: ClickableItem;
  active: boolean;
  onToggle: (i: ClickableItem) => void;
  color: string;
  onSizingClick: (workloadId: string) => void;
  selectionMode?: boolean;
  selectedWorkloads?: Set<string>;
  onToggleWorkload?: (workloadId: string) => void;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const rgb = hexToRgb(color);
  const hasSubLayers = layer.subLayers && layer.subLayers.length > 0;

  const bgStyle = {
    background: active
      ? `linear-gradient(to right, rgba(${rgb},0.18), rgba(${rgb},0.08), rgba(${rgb},0.02), transparent)`
      : hovered
        ? `linear-gradient(to right, rgba(${rgb},0.12), rgba(${rgb},0.04), transparent)`
        : `rgba(${rgb},0.04)`,
    transition: "background 0.25s ease",
  };

  const accentBar = (
    <div
      className="absolute left-0 top-0 h-full w-1 transition-all duration-300"
      style={{
        background: active || hovered ? color : `rgba(${rgb},0.3)`,
        boxShadow: active
          ? `0 0 20px 6px rgba(${rgb},0.5), 0 0 8px rgba(${rgb},0.8)`
          : hovered
            ? `0 0 10px rgba(${rgb},0.35)`
            : undefined,
      }}
    />
  );

  const shimmer = (
    <div
      className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${active ? "opacity-100" : "opacity-0"}`}
      style={{ background: `radial-gradient(ellipse 65% 55% at 12% 50%, rgba(${rgb},0.1), transparent)` }}
    />
  );

  const chevron = (
    <div
      className={`relative flex-shrink-0 transition-all duration-250 ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3 group-hover:opacity-50 group-hover:translate-x-0"}`}
      style={{ color, filter: active ? `drop-shadow(0 0 6px rgba(${rgb},0.7))` : undefined }}
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
        className="group relative w-full text-left flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 overflow-hidden"
        style={bgStyle}
      >
        {accentBar}
        {shimmer}
        {/* Title row */}
        <div className="relative flex items-center gap-3 px-8 pt-5 pb-3 w-full">
          <div className="pl-2 flex-1 min-w-0">
            <p className="font-black text-base leading-tight tracking-wide transition-colors duration-200"
              style={{
                color: active ? color : hovered ? "var(--dm-txt-primary)" : "var(--dm-txt-body)",
                textShadow: active ? `0 0 12px rgba(${rgb},0.35)` : undefined,
              }}>
              {layer.title}
            </p>
            <p className="text-blue-300/60 text-[13px] mt-1 font-medium">{layer.subtitle}</p>
          </div>
          {chevron}
        </div>
        {/* Sub-layers strip */}
        <div className="relative flex flex-wrap items-stretch gap-x-6 gap-y-4 px-10 pb-5 pt-1 border-t"
          style={{ borderColor: `rgba(${rgb},0.12)`, background: `linear-gradient(to bottom, transparent 0%, rgba(${rgb},0.02) 100%)` }}>
          {(layer.subLayers as SubLayer[]).map((sub, idx) => (
            <Fragment key={sub.id}>
              {idx > 0 && <GroupDivider rgb={rgb} />}
              <div className="flex flex-col gap-3 pt-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: isDark ? `rgba(${rgb},0.75)` : "#0f172a" }}>
                  {sub.title}
                  {sub.note && (
                    <span className="normal-case tracking-normal font-medium opacity-65 text-[10px]"> · {sub.note}</span>
                  )}
                </span>
                {sub.icons.length > 0 && (
                <div className="flex items-center gap-3">
                  {sub.icons.map(icon => (
                    <HeroIcon
                      key={icon.alt}
                      icon={icon}
                      rgb={rgb}
                      size={52}
                      onSizingClick={onSizingClick}
                      selectionMode={selectionMode}
                      selectedWorkloads={selectedWorkloads}
                      onToggleWorkload={onToggleWorkload}
                      isDark={isDark}
                    />
                  ))}
                </div>
                )}
              </div>
            </Fragment>
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
      className="group relative w-full text-left flex items-center gap-3 px-8 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 overflow-hidden"
      style={bgStyle}
    >
      {accentBar}
      {shimmer}
      <div className="relative pl-2 flex-1 min-w-0">
        <p className="font-black text-base leading-tight tracking-wide transition-colors duration-200"
          style={{
            color: active ? color : hovered ? "var(--dm-txt-primary)" : "var(--dm-txt-body)",
            textShadow: active ? `0 0 12px rgba(${rgb},0.35)` : undefined,
          }}>
          {layer.title}
        </p>
        <p className="text-blue-300/60 text-[13px] mt-1 font-medium">{layer.subtitle}</p>
      </div>
      {/* Inline icons */}
      {layer.icons && layer.icons.length > 0 && (
        <div className="relative flex items-stretch gap-4 flex-shrink-0">
          {layer.icons.map((icon, idx) => (
            <Fragment key={icon.alt}>
              {idx > 0 && <GroupDivider rgb={rgb} />}
              <HeroIcon
                icon={icon}
                rgb={rgb}
                size={60}
                onSizingClick={onSizingClick}
                selectionMode={selectionMode}
                selectedWorkloads={selectedWorkloads}
                onToggleWorkload={onToggleWorkload}
                isDark={isDark}
              />
            </Fragment>
          ))}
        </div>
      )}
      {chevron}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AgenticStackViewProps {
  selectionMode?: boolean;
  selectedWorkloads?: Set<string>;
  onToggleWorkload?: (workloadId: string) => void;
  onSizingClick?: (workloadId: string) => void;
}

export function AgenticStackView({
  selectionMode = false,
  selectedWorkloads = EMPTY_SELECTION,
  onToggleWorkload = () => {},
  onSizingClick = () => {},
}: AgenticStackViewProps = {}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selected, setSelected]       = useState<ClickableItem | null>(null);

  const toggle = (item: ClickableItem) =>
    setSelected(prev => prev?.id === item.id ? null : item);

  return (
    <div>
      <section className="mx-auto max-w-[1800px] px-6 py-4">
        {/* ── Architecture diagram ── */}
        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: "var(--dm-page-bg)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Window chrome */}
          <div className="relative flex items-center gap-3 px-5 py-2.5 border-b border-white/[0.05]"
            style={{ background: "rgba(2,10,26,0.8)", backdropFilter: "blur(4px)" }}>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80 shadow-[0_0_4px_rgba(255,95,87,0.5)]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]/80 shadow-[0_0_4px_rgba(254,188,46,0.4)]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]/80 shadow-[0_0_4px_rgba(40,200,64,0.4)]" />
            </div>
            <span className="ml-2 text-[11px] font-mono text-blue-400/40 tracking-wide">
              intel-ai · agentic-stack · architecture
            </span>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-white/25">
              <span>Hover an icon to size it</span>
            </div>
          </div>

          {/* ── Two-column diagram body ── */}
          <div className="relative flex">

            {/* LEFT: Cross-cutting planes column */}
            <div
              className="flex-shrink-0 flex flex-col border-r border-white/[0.06]"
              style={{ width: 180, background: "rgba(129,140,248,0.03)" }}
            >
              {/* Column header */}
              <div className="px-3 py-2 border-b border-white/[0.06] text-center">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: isDark ? "#818cf8cc" : "#0f172a" }}>
                  Cross-cutting
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
                    onSizingClick={onSizingClick}
                    selectionMode={selectionMode}
                    selectedWorkloads={selectedWorkloads}
                    onToggleWorkload={onToggleWorkload}
                    isDark={isDark}
                  />
                ))}
              </div>
            </div>

            {/* RIGHT: 5 horizontal layers */}
            <div className="flex flex-col flex-1 min-w-0">
              {mainLayers.map((layer, idx) => (
                <Fragment key={layer.id}>
                  {idx > 0 && <LayerDivider topColor={LAYER_COLORS[idx - 1]} bottomColor={LAYER_COLORS[idx]} />}
                  <LayerRow
                    layer={layer}
                    active={selected?.id === layer.id}
                    onToggle={toggle}
                    color={LAYER_COLORS[idx]}
                    onSizingClick={onSizingClick}
                    selectionMode={selectionMode}
                    selectedWorkloads={selectedWorkloads}
                    onToggleWorkload={onToggleWorkload}
                    isDark={isDark}
                  />
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Layer detail panel (conditionally shown) */}
      {SHOW_LAYER_DETAILS && selected && (
        <section className="mx-auto max-w-[1800px] px-6 pb-6">
          <div
            className="rounded-2xl p-8"
            style={{
              background: "var(--dm-card-bg)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h3 className="text-2xl font-black text-white mb-2">{selected.title}</h3>
            <p className="text-white/50 text-sm">{selected.subtitle}</p>
            <p className="text-white/30 text-xs mt-4">
              Detailed content for this layer coming soon.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
