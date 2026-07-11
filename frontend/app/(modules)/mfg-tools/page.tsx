export default function MfgToolsPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--dm-page-bg)" }}
    >
      <div className="text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#fb923c] animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#fb923c]/80">Coming Soon</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Manufacturing Tools</h1>
        <p className="text-base text-white/40 max-w-md mx-auto">
          Design-rule checks, process simulation, and EDA integration tools for Intel manufacturing flows.
        </p>
      </div>
    </main>
  );
}
