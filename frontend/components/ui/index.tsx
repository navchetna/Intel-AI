// Shared dark-dashboard UI primitives (metric cards, panels, config axes, form fields).
// Promoted from modules/training/shared.tsx — the first module to have consolidated
// its own duplicated primitives. New dark-dashboard screens should import from here;
// existing ones can migrate opportunistically.

export const fmt = (n: number, d = 2) => n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const fmtInt = (n: number) => Math.round(n).toLocaleString();
export const fmtFlops = (n: number) => {
  if (n === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / Math.pow(10, exp);
  return `${mantissa.toFixed(2)} × 10^${exp}`;
};
export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function AxisCard({ label, question, value, options, onChange, accent, columns = 2 }: {
  label: string; question: string; value: string; accent: string;
  options: { value: string; title: string; description: string }[];
  onChange: (v: string) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
      <div className="mb-3.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: `rgb(${accent})` }}>{label}</span>
        <p className="text-[13px] text-white/50 mt-1 leading-snug">{question}</p>
      </div>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""} gap-3 flex-1`}>
        {options.map(o => {
          const selected = o.value === value;
          return (
            <button
              key={o.value} type="button" onClick={() => onChange(o.value)}
              className="text-left rounded-xl p-4 transition-all border flex flex-col"
              style={{
                borderColor: selected ? `rgb(${accent})` : "var(--dm-border-b)",
                background: selected ? `rgba(${accent},0.12)` : "var(--dm-surface-a)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: selected ? `rgb(${accent})` : "var(--dm-border-b)",
                    background: selected ? `rgb(${accent})` : "transparent",
                  }}
                />
                <span className="text-sm font-bold text-white">{o.title}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-white/55">{o.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SectionHeader({ index, title, subtitle }: { index: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 mt-12 first:mt-0">
      <span className="text-[11px] font-mono font-bold text-white/25">{index}</span>
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      {subtitle && <span className="text-[12px] text-white/35">— {subtitle}</span>}
    </div>
  );
}

export function Field({ label, value, onChange, min, max, step = 1, unit, note, activeWhen, activeHint }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string;
  note?: string; activeWhen?: boolean; activeHint?: string;
}) {
  const dimmed = activeWhen === false;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-3 transition-opacity" style={{ opacity: dimmed ? 0.5 : 1, background: "var(--dm-surface-a)" }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-white/75">{label}</span>
        {unit && <span className="text-[10px] text-white/30 uppercase tracking-wide flex-shrink-0">{unit}</span>}
      </div>
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#818cf8]/50 transition-colors"
        style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
      />
      {note && <p className="text-[11px] text-white/35 leading-snug">{note}</p>}
      {activeHint && <p className="text-[10.5px] font-semibold" style={{ color: dimmed ? "#fbbf24" : "#34d399" }}>{activeHint}</p>}
    </div>
  );
}

export function SelField<T extends string>({ label, value, onChange, options, note }: {
  label: string; value: T; onChange: (v: T) => void; options: T[]; note?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: "var(--dm-surface-a)" }}>
      <span className="text-[12px] font-semibold text-white/75">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#818cf8]/50 transition-colors"
        style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {note && <p className="text-[11px] text-white/35 leading-snug">{note}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, note }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; note?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: "var(--dm-surface-a)" }}>
      <span className="text-[12px] font-semibold text-white/75">{label}</span>
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25"
        style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
      />
      {note && <p className="text-[11px] text-white/35 leading-snug">{note}</p>}
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 3, note }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; note?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-3" style={{ background: "var(--dm-surface-a)" }}>
      <span className="text-[12px] font-semibold text-white/75">{label}</span>
      <textarea
        value={value} placeholder={placeholder} rows={rows}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25 resize-y"
        style={{ background: "var(--dm-input-bg)", border: "1px solid var(--dm-input-border)", color: "var(--dm-input-color)" }}
      />
      {note && <p className="text-[11px] text-white/35 leading-snug">{note}</p>}
    </div>
  );
}

export function Panel({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: `rgba(${accent},0.2)`, background: `rgba(${accent},0.04)` }}>
      <h3 className="text-[12px] font-bold uppercase tracking-widest mb-1" style={{ color: `rgb(${accent})` }}>{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function StatRow({ label, value, unit, note }: { label: string; value: string | number; unit?: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.06] last:border-0">
      <div className="min-w-0">
        <div className="text-[12px] text-white/60">{label}</div>
        {note && <div className="text-[10.5px] text-white/30 mt-0.5 leading-snug">{note}</div>}
      </div>
      <div className="text-[13px] font-mono font-semibold text-white/90 flex-shrink-0 text-right whitespace-nowrap">
        {value}{unit ? <span className="text-white/40 font-sans"> {unit}</span> : null}
      </div>
    </div>
  );
}

export function MetricCard({ label, value, unit, accent }: { label: string; value: string | number; unit: string; accent: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl p-4" style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.2)` }}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-2xl font-extrabold leading-none" style={{ color: `rgb(${accent})` }}>{value}</span>
        <span className="text-xs font-medium text-white/50">{unit}</span>
      </div>
    </div>
  );
}

export function StatusChip({ ok, textOk, textBad }: { ok: boolean; textOk: string; textBad: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? "bg-success" : "bg-danger"}`} />
      {ok ? textOk : textBad}
    </span>
  );
}
