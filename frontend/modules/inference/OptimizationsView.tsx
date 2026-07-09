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
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">inference</p>
      <h1 className="mt-3 text-3xl font-bold text-intel-dark sm:text-4xl">Optimizations</h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">
        Runtime techniques to push inference throughput and efficiency on Intel silicon. Select a
        technique to read more.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[18rem_1fr]">
        {/* Left: selectable list */}
        <ul className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-2 shadow-sm">
          {optimizationSections.map((section) => {
            const active = section.id === selectedId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(section.id)}
                  aria-current={active ? "true" : undefined}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                    active
                      ? "bg-intel-haze text-intel-blue"
                      : "text-gray-700 hover:bg-intel-haze/50 hover:text-intel-blue"
                  }`}
                >
                  <span className="block text-sm font-semibold">{section.label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{section.summary}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Right: selected technique detail */}
        <section
          key={selected.id}
          className="animate-fade-slide-in rounded-xl border border-gray-100 bg-white p-8 shadow-sm"
        >
          <h2 className="text-2xl font-semibold text-intel-dark">{selected.label}</h2>
          <p className="mt-2 text-sm font-medium text-intel-blue">{selected.summary}</p>
          <p className="mt-5 text-base leading-relaxed text-gray-600">{selected.description}</p>
        </section>
      </div>
    </main>
  );
}
