"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { AcceleratorDetail } from "./accelerator-data";

function darkenRgb(rgb: string, amount = 0.42): string {
  const [r, g, b] = rgb.split(",").map(Number);
  return `rgb(${Math.round(r * (1 - amount))},${Math.round(g * (1 - amount))},${Math.round(b * (1 - amount))})`;
}

function accentText(isDark: boolean, hex: string, rgb: string): string {
  return isDark ? hex : darkenRgb(rgb);
}

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: "var(--dm-card-bg)", border: "1px solid var(--dm-card-border)" }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SpecGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
          style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
          <span style={{ color: "var(--dm-txt-faint)" }}>{r.label}</span>
          <span className="text-right font-mono" style={{ color: "var(--dm-txt-body)" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AcceleratorDetailView({ detail, onBack }: { detail: AcceleratorDetail; onBack: () => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const accent = accentText(isDark, detail.accent, detail.accentRgb);

  return (
    <div className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="px-6 pt-8 pb-16 max-w-screen-xl mx-auto">

        {/* breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--dm-txt-faint)" }}>
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Silicon
          </button>
          <span style={{ color: "var(--dm-txt-faintest)" }}>/</span>
          <span className="text-sm font-semibold" style={{ color: accent }}>{detail.name}</span>
        </div>

        {/* header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 mb-3"
            style={{ borderColor: `rgba(${detail.accentRgb},0.3)`, background: `rgba(${detail.accentRgb},0.08)` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: detail.accent }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: accent }}>
              {detail.statusBadge}
            </span>
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>{detail.name}</h1>
          <p className="mt-1 text-sm font-mono" style={{ color: "var(--dm-txt-faint)" }}>{detail.codeName}</p>
          <p className="mt-1.5 text-base font-semibold" style={{ color: accent }}>{detail.tagline}</p>
          <div className="mt-3 max-w-3xl space-y-2.5">
            {detail.overview.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>{p}</p>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6">
          <SectionCard title="Hardware Specifications" accent={accent}>
            <SpecGrid rows={detail.hwSpecs} />
          </SectionCard>

          <SectionCard title="Memory Specifications" accent={accent}>
            <SpecGrid rows={detail.memorySpecs} />
          </SectionCard>
        </div>

        <SectionCard title="TFLOPS by Data Type" accent={accent}>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
            <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--dm-table-head)", color: "var(--dm-txt-faint)" }}>
              <span>Data type</span>
              <span>Peak throughput</span>
            </div>
            {detail.tflops.map((row, i) => (
              <div key={row.dataType} className="px-4 py-2.5"
                style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                <div className="grid grid-cols-[1fr_auto] gap-4 items-baseline">
                  <span className="text-sm" style={{ color: "var(--dm-txt-body)" }}>{row.dataType}</span>
                  <span className="text-sm font-mono font-semibold text-right" style={{ color: accent }}>{row.value}</span>
                </div>
                {row.note && <p className="mt-0.5 text-[11px]" style={{ color: "var(--dm-txt-faintest)" }}>{row.note}</p>}
              </div>
            ))}
          </div>
          {detail.tflopsCaveat && (
            <p className="mt-3 text-[11px] leading-relaxed rounded-lg p-3" style={{ color: "var(--dm-txt-faint)", background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
              <strong style={{ color: accent }}>Note: </strong>{detail.tflopsCaveat}
            </p>
          )}
        </SectionCard>

        <SectionCard title="Software Stack" accent={accent}>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
            <div className="grid grid-cols-[140px_1fr_2fr] gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
              style={{ background: "var(--dm-table-head)", color: "var(--dm-txt-faint)" }}>
              <span>Layer</span>
              <span>Component</span>
              <span>Role</span>
            </div>
            {detail.swStack.map((row, i) => (
              <div key={row.component} className="grid grid-cols-[140px_1fr_2fr] gap-4 px-4 py-2.5 items-start text-sm"
                style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--dm-txt-faint)" }}>{row.layer}</span>
                <span className="font-mono font-semibold" style={{ color: "var(--dm-txt-body)" }}>{row.component}</span>
                <span style={{ color: "var(--dm-txt-secondary)" }}>{row.role}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {detail.caveats.length > 0 && (
          <SectionCard title="Notes & Open Questions" accent={accent}>
            <ul className="space-y-2.5">
              {detail.caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
                  <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: detail.accent }} />
                  {c}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>{detail.sourceNote}</p>
      </div>
    </div>
  );
}
