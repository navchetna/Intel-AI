"use client";

// ── Shared presentational primitives for the Deep Analysis rail panels — used by both
// DeepAnalysisView.tsx (Architecture/Use Case/GPU Compute/Memory/Interconnect) and RoutingView.tsx
// (Serving/Host-CPU/CPU coefficients), so every rail panel on every tab looks and behaves
// identically (same compact row striping, same click-to-highlight glow) without either file
// importing from the other. ─────────────────────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

export const compactInputStyle: React.CSSProperties = {
  ...inputStyle,
  width: "5.5rem",
  textAlign: "right",
};

export function CompactPanel({ title, subtitle, accent, children }: { title: string; subtitle?: string; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", borderColor: accent ? `${accent}59` : "var(--dm-border-a)" }}
    >
      <div className="px-4 pt-2.5 pb-2" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold" style={{ color: accent ?? "var(--dm-txt-primary)" }}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-[11px] text-[var(--dm-txt-muted)] leading-snug">{subtitle}</p>}
      </div>
      <div className="py-1">{children}</div>
    </div>
  );
}

/** One compact label ↔ control/value row — striping and sizing match the Architecture panel's
 *  rows exactly. `hint` becomes a hover tooltip instead of always-rendered helper text. `lit`
 *  applies the same "light up" treatment as a matched Architecture row, for the same reason:
 *  a clicked row highlighting the Use Case/Silicon/Routing inputs its formula actually reads.
 *  `litRgb` is an "r,g,b" triplet — defaults to the cyan used for compute; pass the green
 *  triplet ("52,211,153") for rows that light up because of an interconnect/network dependency. */
export function CompactRow({ label, hint, index, lit, litRgb = "34,211,238", children }: {
  label: string; hint?: string; index: number; lit?: boolean; litRgb?: string; children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-0.5 transition-colors duration-200"
      style={{
        background: lit ? `rgba(${litRgb},0.16)` : index % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)",
        boxShadow: lit ? `inset 2px 0 0 rgb(${litRgb})` : "none",
      }}
      title={hint}
    >
      <span className="text-[11px] truncate" style={{ color: lit ? "var(--dm-txt-primary)" : "var(--dm-txt-faint)" }}>{label}</span>
      <div
        className="flex-shrink-0 rounded transition-all duration-200"
        style={{ boxShadow: lit ? `0 0 0 1px rgb(${litRgb}), 0 0 8px rgba(${litRgb},0.5)` : "none" }}
      >
        {children}
      </div>
    </div>
  );
}
