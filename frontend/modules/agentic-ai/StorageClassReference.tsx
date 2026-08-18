"use client";

import { useState } from "react";
import Image from "next/image";
import { useTheme } from "@/contexts/ThemeContext";
import { STORAGE_CLASSES, STORAGE_CLASS_MEDIA } from "./storage-data";
import { getUniqueVendorsForClass } from "./storage-vendors";

interface StorageClassReferenceProps {
  selectedVendors: Record<string, string>; // classCode -> vendor platform
  onVendorSelect: (classCode: string, vendorPlatform: string) => void;
  highlightedClass: string | null;
  onClassHighlight: (classCode: string) => void;
}

export function StorageClassReference({ selectedVendors, onVendorSelect, highlightedClass, onClassHighlight }: StorageClassReferenceProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(classId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold mb-4" style={{ color: isDark ? "#fff" : "#0f172a" }}>
        Storage Class Reference
      </h2>

      {STORAGE_CLASSES.map(sc => {
        const isExpanded = expanded.has(sc.id);
        const vendors = getUniqueVendorsForClass(sc.code);
        const selected = selectedVendors[sc.code];
        const media = STORAGE_CLASS_MEDIA[sc.code] ?? [];

        const isHighlighted = highlightedClass === sc.code;

        return (
          <div
            key={sc.id}
            className="rounded-xl overflow-hidden border transition-shadow duration-200"
            style={{
              background: isHighlighted ? `${sc.color}0d` : isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
              borderColor: isHighlighted ? sc.color : `${sc.color}40`,
              boxShadow: isHighlighted ? `0 0 0 1px ${sc.color}` : undefined,
            }}
          >
            {/* Header - Always visible */}
            <button
              onClick={() => {
                toggleExpand(sc.id);
                onClassHighlight(sc.code);
              }}
              className="w-full flex flex-col gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex-shrink-0 transition-transform duration-200"
                  style={{
                    color: sc.color,
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                    <path
                      d="M6 3l6 5-6 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div
                  className="w-12 h-6 flex items-center justify-center rounded font-bold text-xs flex-shrink-0"
                  style={{ background: sc.color, color: "#fff" }}
                >
                  {sc.code}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: sc.color }}>
                      {sc.name}
                    </span>
                    <span className="text-xs font-mono" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(71,85,105,0.6)" }}>
                      {sc.latency}
                    </span>
                  </div>
                  {selected && (
                    <div className="mt-1 text-xs" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(71,85,105,0.7)" }}>
                      Selected: <span className="font-semibold" style={{ color: sc.color }}>{selected}</span>
                    </div>
                  )}
                </div>
              </div>

              {media.length > 0 && (
                <div className="flex items-start gap-3 flex-wrap pl-[3.375rem]">
                  {media.map(m => (
                    <div key={m.path} title={`${m.label} — ${m.latency}, ${m.bandwidth}, ${m.costPerTB}`} className="flex flex-col items-center gap-1 w-[5.5rem]">
                      <div
                        className="w-12 h-12 flex items-center justify-center rounded-lg border"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.7)",
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(148,163,184,0.35)",
                        }}
                      >
                        <Image src={m.path} alt={m.label} width={30} height={30} />
                      </div>
                      <span
                        className="text-[10px] font-semibold text-center leading-tight"
                        style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.8)" }}
                      >
                        {m.label}
                      </span>
                      <span
                        className="text-[9px] font-mono text-center leading-tight"
                        style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(71,85,105,0.65)" }}
                      >
                        {m.latency}
                      </span>
                      <span
                        className="text-[9px] font-mono text-center leading-tight"
                        style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(71,85,105,0.65)" }}
                      >
                        {m.bandwidth}
                      </span>
                      <span
                        className="text-[9px] font-mono text-center leading-tight"
                        style={{ color: sc.color }}
                      >
                        {m.costPerTB}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: `${sc.color}20` }}>
                {/* Class details */}
                <div className="pt-3 pb-3 space-y-2">
                  <div className="text-xs">
                    <span className="font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>
                      Technologies:{" "}
                    </span>
                    <span style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.9)" }}>
                      {sc.technologies}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>
                      Use Cases:{" "}
                    </span>
                    <span style={{ color: isDark ? "rgba(255,255,255,0.8)" : "rgba(15,23,42,0.9)" }}>
                      {sc.useCases}
                    </span>
                  </div>
                </div>

                {/* Vendor list */}
                {vendors.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(71,85,105,0.8)" }}>
                      Vendors & Platforms
                    </div>
                    <div className="space-y-2" role="radiogroup" aria-label={`Vendor for ${sc.name}`}>
                      {vendors.map(vendor => {
                        const isSelected = selected === vendor.platform;
                        const inputId = `vendor-${sc.code}-${vendor.platform}`;
                        return (
                          <label
                            key={vendor.platform}
                            htmlFor={inputId}
                            className="flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors"
                            style={{
                              background: isSelected
                                ? `${sc.color}15`
                                : isDark
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(255,255,255,0.5)",
                              borderColor: isSelected ? `${sc.color}60` : isDark ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.3)",
                            }}
                          >
                            <input
                              type="radio"
                              id={inputId}
                              name={`vendor-${sc.code}`}
                              checked={isSelected}
                              onChange={() => onVendorSelect(sc.code, isSelected ? "" : vendor.platform)}
                              className="mt-0.5 flex-shrink-0 w-4 h-4 cursor-pointer"
                              style={{ accentColor: sc.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold" style={{ color: isDark ? "#fff" : "#0f172a" }}>
                                {vendor.platform}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(71,85,105,0.7)" }}>
                                {vendor.description}
                              </div>
                              {vendor.intelMapping && (
                                <div
                                  className="flex items-start gap-1.5 mt-1.5 pt-1.5"
                                  style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)" }}
                                >
                                  <span
                                    className="flex-shrink-0 mt-[1px] text-[9px] font-black uppercase tracking-wide px-1 py-0.5 rounded"
                                    style={{ background: "#0071c515", color: "#38bdf8" }}
                                  >
                                    Intel
                                  </span>
                                  <span
                                    className="text-[10.5px] leading-relaxed font-mono"
                                    style={{ color: isDark ? "rgba(147,197,253,0.7)" : "rgba(0,60,113,0.75)" }}
                                  >
                                    {vendor.intelMapping}
                                  </span>
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
