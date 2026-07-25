"use client";

import { useMemo, useState } from "react";
import { ModelsView } from "./ModelsView";
import { ProductionSizingView } from "./ProductionSizingView";
import { ModelBenchmarksView } from "./ModelBenchmarksView";
import { models, type Model } from "./data";
import { useProject } from "@/contexts/ProjectContext";
import type { ModelSizingConfig } from "@/modules/projects/types";

type Tab = "catalog" | "sizing" | "benchmarks";

/** Owns cross-tab UI state (active tab) for the Model Catalog / Production Sizing pair. Selections and sizing inputs live in the current Project. */
export function ModelsPageView() {
  const { data, updateModels } = useProject();
  const [activeTab, setActiveTab]         = useState<Tab>("catalog");
  const [selectionMode, setSelectionMode] = useState(false);

  const { selectedModels: selectedModelIds, modelSizing } = data.models;
  const selected = useMemo(() => new Set(selectedModelIds), [selectedModelIds]);

  function toggleSelect(hfId: string) {
    const next = new Set(selectedModelIds);
    if (next.has(hfId)) next.delete(hfId); else next.add(hfId);
    updateModels({ selectedModels: Array.from(next) });
  }

  function remove(hfId: string) {
    updateModels({ selectedModels: selectedModelIds.filter(m => m !== hfId) });
  }

  function updateSizingConfig(hfId: string, patch: Partial<ModelSizingConfig>) {
    updateModels({ modelSizing: { ...modelSizing, [hfId]: { ...modelSizing[hfId], ...patch } } });
  }

  const selectedModels: Model[] = models.filter(m => selected.has(m.hfId));

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10">
        {/* ── header ── */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#22d3ee]/80">Model Registry</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Model Catalog</h1>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pb-1">
            <span className="text-xs font-medium text-white/50">Select for deployment sizing</span>
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
        <div className="flex gap-1 mb-6 border-b border-white/[0.07]">
          {[
            { key: "catalog" as const, label: "Catalog" },
            { key: "sizing" as const, label: `Sizing${selected.size ? ` (${selected.size})` : ""}` },
            { key: "benchmarks" as const, label: "Benchmarks" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={{
                color: activeTab === t.key ? "#22d3ee" : "rgba(255,255,255,0.4)",
                borderColor: activeTab === t.key ? "#22d3ee" : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "catalog" && (
        <ModelsView selectionMode={selectionMode} selected={selected} onToggleSelect={toggleSelect} />
      )}
      {activeTab === "sizing" && (
        <ProductionSizingView
          selectedModels={selectedModels}
          modelSizing={modelSizing}
          onSizingChange={updateSizingConfig}
          onRemove={remove}
          onBackToCatalog={() => setActiveTab("catalog")}
        />
      )}
      {activeTab === "benchmarks" && <ModelBenchmarksView />}
    </main>
  );
}
