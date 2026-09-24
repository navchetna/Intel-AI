"use client";

import { useCallback, useState } from "react";
import { ModelsView } from "./ModelsView_reimagined";
import { ModelBenchmarksView } from "./ModelBenchmarksView";
import { models } from "./data";
import { exportModelCatalogToExcel } from "./export";
import { useRegisterExport } from "@/contexts/ExportContext";

type Tab = "catalog" | "benchmarks";

const TAB_TITLES: Record<Tab, string> = {
  catalog: "Model Catalog",
  benchmarks: "Model Benchmarks",
};

/** Owns cross-tab UI state (active tab) for the Model Catalog. Task-Type-Model-Mapping lives on the
 *  Agents page (its first tab); model selection and sizing live on the Auxiliary Models page. */
export function ModelsPageView() {
  const [activeTab, setActiveTab] = useState<Tab>("catalog");

  const exportHandler = useCallback(() => exportModelCatalogToExcel(models), []);
  useRegisterExport(exportHandler, "Export Model Catalog");

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10">
        {/* ── header ── */}
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight">{TAB_TITLES[activeTab]}</h1>
        </div>

        {/* ── tab bar ── */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.07]">
          {[
            { key: "catalog" as const, label: "Catalog" },
            { key: "benchmarks" as const, label: "Benchmarks" },
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

      {activeTab === "catalog" && <ModelsView />}
      {activeTab === "benchmarks" && <ModelBenchmarksView />}
    </main>
  );
}
