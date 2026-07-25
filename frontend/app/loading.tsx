export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--dm-page-bg)" }}>
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(129,140,248,0.25)", borderTopColor: "transparent" }}
        />
        <span className="text-[12px] text-white/35">Loading…</span>
      </div>
    </main>
  );
}
