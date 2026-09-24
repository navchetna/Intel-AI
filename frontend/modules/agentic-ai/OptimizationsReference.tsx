"use client";

import { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { allWorkloadIcons } from "./layers";
import {
  OPTIMIZATION_TAGS, OPTIMIZATION_CATEGORY_ORDER, OPTIMIZATION_CATEGORY_LABELS, OPTIMIZATION_CATEGORY_COLORS,
  workloadsForTag,
} from "./optimization-tags";

const ICON_SRC_BY_ALT: Record<string, string> = Object.fromEntries(
  allWorkloadIcons.map(w => [w.icon.alt, w.icon.src]),
);

interface OptimizationsReferenceProps {
  /** The single tag currently pinned by a click — dims non-matching workloads in the diagram. */
  activeTag: string | null;
  onToggleTag: (tagId: string) => void;
  /** Tags to softly highlight because a workload icon is currently hovered — transient, doesn't drive dimming. */
  hoverTagIds: Set<string>;
}

/** Reference panel for the Harness → Software stack's optimization catalog — Accelerators, ISA,
 *  and Libraries — mirroring the Storage tab's StorageClassReference. Every workload mapping shown
 *  here is derived live from optimizations-data.ts (see optimization-tags.ts), so it's automatically
 *  bidirectional: clicking a tag highlights the workloads that use it here and dims the rest in the
 *  diagram; hovering a workload icon in the diagram highlights its tags here. */
export function OptimizationsReference({ activeTag, onToggleTag, hoverTagIds }: OptimizationsReferenceProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(tagId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  }

  return (
    <div className="p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-1" style={{ color: isDark ? "#fff" : "#0f172a" }}>
        Optimizations Reference
      </h2>
      <p className="text-xs mb-4" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(71,85,105,0.7)" }}>
        Accelerators, ISA extensions, and libraries the stack&rsquo;s optimization notes document — click one to see (and highlight) every workload that uses it.
      </p>

      <div className="space-y-5">
        {OPTIMIZATION_CATEGORY_ORDER.map(category => {
          const color = OPTIMIZATION_CATEGORY_COLORS[category];
          const tags = OPTIMIZATION_TAGS.filter(t => t.category === category);
          return (
            <div key={category}>
              <h3
                className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
                style={{ color: isDark ? `${color}cc` : color }}
              >
                {OPTIMIZATION_CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-2">
                {tags.map(tag => {
                  const workloads = workloadsForTag(tag.id);
                  const isExpanded = expanded.has(tag.id);
                  const isActive = activeTag === tag.id;
                  const isHoverHighlighted = hoverTagIds.has(tag.id);

                  return (
                    <div
                      key={tag.id}
                      className="rounded-xl overflow-hidden border transition-shadow duration-200"
                      style={{
                        background: isActive
                          ? `${color}18`
                          : isHoverHighlighted
                            ? `${color}0d`
                            : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
                        borderColor: isActive || isHoverHighlighted ? color : `${color}35`,
                        boxShadow: isActive ? `0 0 0 1px ${color}` : isHoverHighlighted ? `0 0 0 1px ${color}80` : undefined,
                      }}
                    >
                      <button
                        onClick={() => { toggleExpand(tag.id); onToggleTag(tag.id); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                      >
                        <div
                          className="flex-shrink-0 transition-transform duration-200"
                          style={{ color, transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                        >
                          <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                            <path d="M6 3l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>

                        <div
                          className="px-2 py-0.5 flex items-center justify-center rounded font-bold text-[11px] flex-shrink-0"
                          style={{ background: color, color: "#fff" }}
                        >
                          {tag.label}
                        </div>

                        <span className="flex-1 min-w-0 text-xs truncate" style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(71,85,105,0.8)" }}>
                          {tag.description}
                        </span>

                        <span
                          className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: workloads.length > 0 ? `${color}20` : "transparent",
                            color: workloads.length > 0 ? color : isDark ? "rgba(255,255,255,0.25)" : "rgba(71,85,105,0.4)",
                          }}
                        >
                          {workloads.length}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-3 border-t" style={{ borderColor: `${color}20` }}>
                          <div className="pt-3 text-xs" style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.9)" }}>
                            {tag.description}
                          </div>
                          <div className="mt-3 text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(71,85,105,0.6)" }}>
                            {workloads.length === 0 ? "No workloads documented yet" : "Used by"}
                          </div>
                          {workloads.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {workloads.map(w => (
                                <div
                                  key={`${w.iconAlt}-${w.label}`}
                                  title={w.label}
                                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full border"
                                  style={{
                                    background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)",
                                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.3)",
                                  }}
                                >
                                  {ICON_SRC_BY_ALT[w.iconAlt] && (
                                    <div className="w-4 h-4 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                                      <Image src={ICON_SRC_BY_ALT[w.iconAlt]} alt={w.iconAlt} width={14} height={14} className="object-contain" />
                                    </div>
                                  )}
                                  <span className="text-[11px] font-medium" style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.8)" }}>
                                    {w.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-5 pt-4 border-t leading-relaxed" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(71,85,105,0.55)" }}>
        Hover a workload icon in the diagram to see its tags highlighted here; click a tag to highlight (and dim everything else) in the diagram.
      </p>
    </div>
  );
}
