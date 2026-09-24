"use client";

import { DeepAnalysisView } from "./DeepAnalysisView";

/** Formerly Models > Deep Analysis — promoted to its own top-level page (Silicon's sibling in
 *  AppModeContext's "inferencing" mode). Content is unchanged; DeepAnalysisView itself renders
 *  no header of its own, so this just supplies the page chrome around it. */
export function ModelInferencingCalculatorView() {
  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-6">
        <h1 className="text-4xl font-black text-white tracking-tight">Model Inferencing Calculator</h1>
      </div>
      <DeepAnalysisView />
    </main>
  );
}
