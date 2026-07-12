export default function RackPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--dm-page-bg)" }}
    >
      <div className="text-center px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#60a5fa]/80">Coming Soon</span>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight mb-3">Rack Scale Designs</h1>
        <p className="text-base text-white/40 max-w-md mx-auto">
          Configure and explore Intel rack-scale reference architectures for AI inference, training, and data pipelines.
        </p>
      </div>
    </main>
  );
}
