"use client";

/**
 * Simple landing page for the Agents section — prompts user to select a project.
 */
export function AgenticLandingView() {

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--dm-page-bg)" }}>
      <div className="max-w-md text-center px-6">
        <div className="mb-6">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)" }}
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#22d3ee" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-3">Select a Project</h1>
          <p className="text-base text-white/50 leading-relaxed">
            Choose a project from the dropdown in the top-right corner to start designing agentic workflows and business processes.
          </p>
        </div>

        <div
          className="mt-8 px-4 py-3 rounded-lg text-sm text-white/40 border"
          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "var(--dm-txt-muted)" }}>
            Tip
          </p>
          Projects let you save workflow designs, model selections, and sizing calculations for specific customer engagements.
        </div>
      </div>
    </main>
  );
}
