export default function ProjectsLandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--dm-page-bg)" }}>
      <div className="text-center max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#22c55e]/80">Projects</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-3">Select a project</h1>
        <p className="text-base text-white/40">
          Pick a project from the sidebar on the left to see its sizing summary, or create a new one with the + button.
        </p>
      </div>
    </main>
  );
}
