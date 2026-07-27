"use client";

import { useMemo, useState } from "react";
import { AgenticStackView } from "./AgenticStackView";
import { AgenticSizingView } from "./AgenticSizingView";
import { SizingSheet } from "./SizingSheet";
import { SIZING_MAP, defaultInputsFor } from "./sizing-wiring";
import { useProject } from "@/contexts/ProjectContext";

type Tab = "stack" | "sizing";

/** Owns cross-tab UI state (active tab, open modal) for the Agentic Stack / Sizing pair. Selections and sizing inputs live in the current Project. */
export function AgenticStackPageView() {
  const { data, updateAgenticStack } = useProject();
  const [activeTab, setActiveTab]         = useState<Tab>("stack");
  const [selectionMode, setSelectionMode] = useState(false);
  const [openSizingId, setOpenSizingId]   = useState<string | null>(null);

  const { selectedWorkloads: selectedWorkloadIds, sizingInputs } = data.agenticStack;
  const selectedWorkloads = useMemo(() => new Set(selectedWorkloadIds), [selectedWorkloadIds]);

  function toggleWorkload(id: string) {
    const next = new Set(selectedWorkloadIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    updateAgenticStack({ selectedWorkloads: Array.from(next) });
  }

  function removeWorkload(id: string) {
    updateAgenticStack({ selectedWorkloads: selectedWorkloadIds.filter(w => w !== id) });
  }

  function openSizingFor(id: string) {
    if (!SIZING_MAP[id]) return; // no calculator wired up yet — inert
    setOpenSizingId(id);
  }

  const openTool = openSizingId ? SIZING_MAP[openSizingId] : undefined;

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10">
        {/* ── header ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#22d3ee]/80">Agentic AI</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Agentic Stack</h1>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pb-1">
            <span className="text-xs font-medium text-white/50">Select workloads</span>
            <span
              role="switch"
              aria-checked={selectionMode}
              onClick={() => setSelectionMode(v => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: selectionMode ? "#22d3ee" : "rgba(255,255,255,0.15)" }}
            >
              <span
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: selectionMode ? "translateX(18px)" : "translateX(3px)" }}
              />
            </span>
          </label>
        </div>

        {/* ── tab bar ── */}
        <div className="flex gap-1 mb-2 border-b border-white/[0.07]">
          {[
            { key: "stack" as const, label: "Stack" },
            { key: "sizing" as const, label: `Sizing${selectedWorkloads.size ? ` (${selectedWorkloads.size})` : ""}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={{
                color: activeTab === t.key ? "#22d3ee" : "var(--dm-txt-muted)",
                borderColor: activeTab === t.key ? "#22d3ee" : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "stack" ? (
        <AgenticStackView
          selectionMode={selectionMode}
          selectedWorkloads={selectedWorkloads}
          onToggleWorkload={toggleWorkload}
          onSizingClick={openSizingFor}
        />
      ) : (
        <AgenticSizingView
          selectedWorkloads={selectedWorkloads}
          sizingInputs={sizingInputs}
          onRemove={removeWorkload}
          onOpenSizing={openSizingFor}
          onBackToStack={() => setActiveTab("stack")}
        />
      )}

      {/* ── Sizing Sheet Modal — shared across both tabs ── */}
      {openSizingId && openTool && (
        <SizingSheet
          tool={openTool}
          inputs={sizingInputs[openSizingId] ?? defaultInputsFor(openTool)}
          onInputsChange={next => updateAgenticStack({ sizingInputs: { ...sizingInputs, [openSizingId]: next } })}
          onClose={() => setOpenSizingId(null)}
        />
      )}
    </main>
  );
}
