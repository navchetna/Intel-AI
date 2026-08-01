"use client";

import { useState } from "react";
import { optimizationSections } from "./content";

/**
 * Tabular, one-at-a-time selector for inference optimization techniques: a list
 * of techniques on the left, the selected technique's description on the right.
 */
export function OptimizationsView() {
  const [selectedId, setSelectedId] = useState(optimizationSections[0].id);
  const selected =
    optimizationSections.find((s) => s.id === selectedId) ?? optimizationSections[0];

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">inference</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl" style={{ color: "var(--dm-txt-primary)" }}>Optimizations</h1>
        <p className="mt-4 max-w-2xl text-lg" style={{ color: "var(--dm-txt-secondary)" }}>
          Runtime techniques to push inference throughput and efficiency on Intel silicon. Select a
          technique to read more.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[18rem_1fr]">
          {/* Left: selectable list */}
          <ul
            className="flex flex-col gap-1 rounded-xl border p-2 shadow-sm"
            style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}
          >
            {optimizationSections.map((section) => {
              const active = section.id === selectedId;
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(section.id)}
                    aria-current={active ? "true" : undefined}
                    className="w-full rounded-lg px-4 py-3 text-left transition-colors nav-menu-item"
                    style={{
                      background: active ? "var(--dm-nav-active-bg)" : undefined,
                      color: active ? "var(--dm-nav-active-text)" : "var(--dm-txt-secondary)",
                    }}
                  >
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--dm-txt-muted)" }}>{section.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right: selected technique detail */}
          <section
            key={selected.id}
            className="animate-fade-slide-in rounded-xl border p-8 shadow-sm"
            style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}
          >
            <h2 className="text-2xl font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{selected.label}</h2>
            <p className="mt-2 text-sm font-medium text-intel-blue">{selected.summary}</p>
            <p className="mt-5 text-base leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>{selected.description}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
