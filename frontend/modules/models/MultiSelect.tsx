"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { selectStyle, panelStyle } from "./benchmarks-ui";

export interface Option { value: string; label: string }

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function Chevron() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3 flex-shrink-0 opacity-60">
      <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function summarize(selected: Set<string>, options: Option[], allLabel: string): string {
  if (selected.size === 0) return allLabel;
  if (selected.size === 1) return options.find(o => selected.has(o.value))?.label ?? "1 selected";
  return `${selected.size} selected`;
}

/** Flat checklist dropdown for multi-selecting values (e.g. models, token profiles). */
export function MultiSelect({ label, options, selected, onChange, allLabel = "All" }: {
  label: string; options: Option[]; selected: Set<string>; onChange: (next: Set<string>) => void; allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const { theme } = useTheme();
  const isDark = theme === "dark";

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="py-2 px-3 text-sm rounded-lg min-w-[160px] flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={selectStyle(isDark)}
      >
        <span className="truncate">{summarize(selected, options, allLabel)}</span>
        <Chevron />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg p-1.5 shadow-2xl" style={panelStyle(isDark)}>
          <button type="button" onClick={() => onChange(new Set())}
            className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold mb-1"
            style={{ color: "#38bdf8" }}>
            {allLabel}
          </button>
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-white/5">
              <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
              <span className="truncate" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#1e293b" }}>{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Two-level checklist dropdown: category header, models nested underneath. */
export function GroupedMultiSelect({ label, groups, selected, onChange, allLabel = "All" }: {
  label: string;
  groups: { category: string; options: Option[] }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const allOptions = groups.flatMap(g => g.options);

  function toggle(value: string) {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange(next);
  }

  function toggleCategory(group: { category: string; options: Option[] }) {
    const allSelected = group.options.every(o => selected.has(o.value));
    const next = new Set(selected);
    group.options.forEach(o => (allSelected ? next.delete(o.value) : next.add(o.value)));
    onChange(next);
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className="py-2 px-3 text-sm rounded-lg min-w-[160px] flex items-center justify-between gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        style={selectStyle(isDark)}
      >
        <span className="truncate">{summarize(selected, allOptions, allLabel)}</span>
        <Chevron />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-72 max-h-96 overflow-y-auto rounded-lg p-1.5 shadow-2xl" style={panelStyle(isDark)}>
          <button type="button" onClick={() => onChange(new Set())}
            className="w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold mb-1"
            style={{ color: "#38bdf8" }}>
            {allLabel}
          </button>
          {groups.map(g => (
            <div key={g.category} className="mb-1.5 last:mb-0">
              <button type="button" onClick={() => toggleCategory(g)}
                className="w-full text-left px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-white/5"
                style={{ color: isDark ? "rgba(56,189,248,0.75)" : "#0369a1" }}>
                {g.category}
              </button>
              {g.options.map(o => (
                <label key={o.value} className="flex items-center gap-2 pl-4 pr-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-white/5">
                  <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} />
                  <span className="truncate" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#1e293b" }}>{o.label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
