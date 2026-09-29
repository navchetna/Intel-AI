"use client";

import { useCallback, useMemo, useState } from "react";
import { useRegisterExport } from "@/contexts/ExportContext";
import {
  OEM_SYSTEMS, OEM_ORDER, SYSTEM_GPU_OPTIONS, systemsForGpu, systemsForOem, scenariosForGpu,
  type OemSystem, type PowerScenario, type SystemGpuId,
} from "./oem-systems-data";
import { exportOemSystemDetailToExcel, exportOemSystemsToExcel, exportOemSystemsMultiGpuToExcel } from "./oem-systems-export";

const OEM_ACCENTS: Record<OemSystem["oem"], string> = {
  Cisco:      "#049FD9",
  Dell:       "#0076CE",
  HPE:        "#01A982",
  Lenovo:     "#E4002B",
  MSI:        "#FF6600",
  Supermicro: "#F5A623",
};

function fmtW(n: number): string {
  return `${Math.round(n).toLocaleString()} W`;
}
function fmtKw(n: number): string {
  return `${n.toFixed(1)} kW`;
}
function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}
function bestScenario(system: OemSystem, gpuId: SystemGpuId): PowerScenario | null {
  const scenarios = scenariosForGpu(system, gpuId);
  return scenarios[scenarios.length - 1] ?? scenarios[0] ?? null;
}

function OemBadge({ oem }: { oem: OemSystem["oem"] }) {
  const accent = OEM_ACCENTS[oem];
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `${accent}20`, color: accent }}>
      {oem}
    </span>
  );
}

function SectionCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: "var(--dm-card-bg)", border: "1px solid var(--dm-card-border)" }}>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: "var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── System card (grid tile) ─────────────────────────────────────────────────────

function SystemCard({ system, gpuId, onClick }: { system: OemSystem; gpuId: SystemGpuId; onClick: () => void }) {
  const accent = OEM_ACCENTS[system.oem];
  const best = bestScenario(system, gpuId);
  return (
    <div
      onClick={onClick}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] cursor-pointer group"
      style={{ background: "var(--dm-card-bg)", boxShadow: `0 0 0 1px var(--dm-card-ring), var(--dm-card-depth), 0 0 40px ${accent}18` }}
    >
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 60%, transparent 100%)` }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between">
          <OemBadge oem={system.oem} />
          <span className="text-[10px] font-semibold" style={{ color: "var(--dm-txt-faint)" }}>{system.rackUnits}U</span>
        </div>
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--dm-txt-primary)" }}>{system.model}</h3>
          <p className="mt-1 text-xs leading-snug" style={{ color: "var(--dm-txt-faint)" }}>{system.tagline}</p>
        </div>
        <div className="mt-auto pt-3 border-t flex items-center justify-between" style={{ borderColor: "var(--dm-border-a)" }}>
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--dm-txt-faintest)" }}>Best-fit config</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: "var(--dm-txt-secondary)" }}>
              {best ? `${best.gpus}× GPU · ${fmtKw(best.estMaxDcLoadW / 1000)} DC` : "No published scenario"}
            </div>
          </div>
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" style={{ color: accent }}>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Detail view ─────────────────────────────────────────────────────────────────

function SpecGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
          style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
          <span style={{ color: "var(--dm-txt-faint)" }}>{r.label}</span>
          <span className="text-right" style={{ color: "var(--dm-txt-body)", maxWidth: "60%" }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function PowerScenarioTable({ scenarios }: { scenarios: PowerScenario[] }) {
  const rows: { label: string; render: (s: PowerScenario) => string }[] = [
    { label: "GPUs installed", render: s => `${s.gpus} × ${s.gpuW} W` },
    { label: "CPUs", render: s => `${s.cpuCount} × ${s.cpuTdpW} W TDP` },
    { label: "PSU", render: s => s.psuRatingW ? `${s.psuInstalled} × ${fmtW(s.psuRatingW)} (${s.psuRedundant} redundant)` : "Not published" },
    { label: "Component subtotal", render: s => fmtW(s.componentSubtotalW) },
    { label: "Fans / VR / conversion", render: s => fmtW(s.fansVrW) },
    { label: "Est. max DC load", render: s => fmtW(s.estMaxDcLoadW) },
    { label: "GPU share of DC load", render: s => fmtPct(s.gpuShareOfDcPct) },
    { label: "Est. max AC input", render: s => fmtW(s.estMaxAcInputW) },
    { label: "PSU output (redundant mode)", render: s => s.psuRedundantOutputW != null ? fmtW(s.psuRedundantOutputW) : "n/a" },
    { label: "Headroom (redundant)", render: s => s.headroomW != null ? fmtW(s.headroomW) : "n/a" },
    { label: "PSU utilization (redundant)", render: s => s.psuUtilizationPct != null ? fmtPct(s.psuUtilizationPct) : "n/a" },
    { label: "Redundancy check", render: s => s.redundancyStatus },
    { label: "Heat load", render: s => `${Math.round(s.heatLoadBtuHr).toLocaleString()} BTU/hr` },
    { label: "AC power per GPU (all-in)", render: s => `${s.acPerGpuKw.toFixed(2)} kW` },
    { label: "Nodes per rack (power / space limited)", render: s => `${s.nodesPerRackPower} / ${s.nodesPerRackSpace}` },
    { label: "Nodes per rack", render: s => `${s.nodesPerRack}` },
    { label: "GPUs per rack", render: s => `${s.gpusPerRack}` },
    { label: "Rack AC load at that fit", render: s => fmtKw(s.rackAcLoadKw) },
  ];
  if (scenarios.length === 0) {
    return <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No published power scenario for this GPU on this system.</p>;
  }
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)", minWidth: 200 }}>
                Node power budget
              </th>
              {scenarios.map((s, i) => (
                <th key={i} className="px-3 py-2.5 text-left text-xs font-bold" style={{ color: "var(--dm-txt-primary)", minWidth: 220 }}>
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--dm-txt-secondary)" }}>{row.label}</td>
                {scenarios.map((s, j) => (
                  <td key={j} className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--dm-txt-body)" }}>{row.render(s)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-[11px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)", borderTop: "1px solid var(--dm-border-a)" }}>
        Planning ceiling at nameplate GPU/CPU power, not a measured draw. Sustained inference typically runs below nameplate; training and burn-in approach it. PSU ratings are OUTPUT watts at the stated input voltage — check derates (e.g. Dell 3200 W → 2900 W at 200-220 VAC; Lenovo 3200 W is 230 V-only).
      </p>
    </div>
  );
}

function SystemDetailView({ system, gpuId, onBack }: { system: OemSystem; gpuId: SystemGpuId; onBack: () => void }) {
  const accent = OEM_ACCENTS[system.oem];
  const scenarios = scenariosForGpu(system, gpuId);
  const gpuLabel = SYSTEM_GPU_OPTIONS.find(g => g.id === gpuId)?.label ?? gpuId;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors" style={{ color: "var(--dm-txt-faint)" }}>
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Systems
        </button>
        <span style={{ color: "var(--dm-txt-faintest)" }}>/</span>
        <span className="text-sm font-semibold" style={{ color: accent }}>{system.oem} {system.model}</span>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <OemBadge oem={system.oem} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--dm-txt-faint)" }}>{system.formFactor} · {system.cpuSocket} · {gpuLabel}</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>{system.model}</h1>
        <p className="mt-2 text-base leading-relaxed max-w-3xl" style={{ color: "var(--dm-txt-secondary)" }}>{system.positioning}</p>
      </div>

      <SectionCard title="System Specifications" accent={accent}>
        <div className="space-y-5">
          {system.specSections.map(sec => (
            <div key={sec.section}>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>{sec.section}</h3>
              <SpecGrid rows={sec.rows} />
            </div>
          ))}
        </div>
      </SectionCard>

      {system.components.length > 0 && (
        <SectionCard title="Component & Option List" accent={accent}>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                    {["Subsystem", "Component", "Part/feature code", "Max qty", "Spec / note"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {system.components.map((c, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "var(--dm-txt-secondary)" }}>{c.subsystem}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "var(--dm-txt-body)" }}>{c.component}</td>
                      <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "var(--dm-txt-body)" }}>{c.partCode ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "var(--dm-txt-body)" }}>{c.maxQty ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[11px] leading-snug" style={{ color: "var(--dm-txt-faint)" }}>{[c.spec, c.note].filter(Boolean).join(" — ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Power Rules" accent={accent}>
        <ul className="space-y-2.5">
          {system.powerRules.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: accent }} />
              {r}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title={`Node Power Budget & Rack Fit — ${gpuLabel}`} accent={accent}>
        <PowerScenarioTable scenarios={scenarios} />
      </SectionCard>

      <SectionCard title="Host CPU Socket" accent={accent}>
        <p className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>{system.cpuCompatibilityNote}</p>
      </SectionCard>

      <SectionCard title="Open Questions" accent={accent}>
        <ul className="space-y-3">
          {system.openQuestions.map((q, i) => (
            <li key={i} className="text-[13px] leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              <span className="font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{q.item}.</span>{" "}
              <span style={{ color: "var(--dm-txt-faint)" }}>{q.why} — resolve by: {q.resolveBy}.</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Sources" accent={accent}>
        <ul className="space-y-1.5">
          {system.sources.map(s => (
            <li key={s.id} className="text-[12px] leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              <span className="font-mono text-[10px] font-bold mr-1.5" style={{ color: accent }}>[{s.id}]</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline" style={{ color: "var(--dm-txt-secondary)" }}>{s.label}</a>
              ) : s.label}
            </li>
          ))}
        </ul>
      </SectionCard>

      <p className="text-[11px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>{system.sourceNote}</p>
    </div>
  );
}

// ── Compare table (high-level, across all systems for the chosen GPU) ───────────

function CompareTable({ systems, gpuId }: { systems: OemSystem[]; gpuId: SystemGpuId }) {
  const rows: { label: string; render: (s: OemSystem) => React.ReactNode }[] = [
    { label: "OEM", render: s => <OemBadge oem={s.oem} /> },
    { label: "Form factor", render: s => s.formFactor },
    { label: "CPU socket", render: s => s.cpuSocket },
    { label: "Best-fit config", render: s => {
      const best = bestScenario(s, gpuId);
      return best ? `${best.gpus} × ${best.gpuW} W GPU` : "—";
    } },
    { label: "Max DC load (best config)", render: s => { const b = bestScenario(s, gpuId); return b ? fmtW(b.estMaxDcLoadW) : "—"; } },
    { label: "Redundant PSU output", render: s => { const b = bestScenario(s, gpuId); return b?.psuRedundantOutputW != null ? fmtW(b.psuRedundantOutputW) : "n/a"; } },
    { label: "Redundancy status", render: s => bestScenario(s, gpuId)?.redundancyStatus ?? "—" },
    { label: "GPUs per rack (best config)", render: s => `${bestScenario(s, gpuId)?.gpusPerRack ?? "—"}` },
    { label: "Rack AC load at that fit", render: s => { const b = bestScenario(s, gpuId); return b ? fmtKw(b.rackAcLoadKw) : "—"; } },
  ];
  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)", minWidth: 180 }}>
                System
              </th>
              {systems.map(s => (
                <th key={s.id} className="px-3 py-2.5 text-left align-bottom" style={{ minWidth: 170 }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: OEM_ACCENTS[s.oem] }}>{s.oem}</div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: "var(--dm-txt-primary)" }}>{s.model}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} style={{ borderTop: "1px solid var(--dm-border-a)", background: i % 2 === 0 ? "var(--dm-surface-a)" : "transparent" }}>
                <td className="px-3 py-2.5 text-xs font-bold" style={{ color: "var(--dm-txt-secondary)" }}>{row.label}</td>
                {systems.map(s => (
                  <td key={s.id} className="px-3 py-2.5 font-mono text-xs" style={{ color: "var(--dm-txt-body)" }}>{row.render(s)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── GPU section heading — used to separate per-GPU groups once more than one GPU is selected ──

function GpuSectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-8 first:mt-0">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#76b900" }} />
      <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-secondary)" }}>{label}</h3>
      <div className="flex-1 h-px" style={{ background: "var(--dm-border-a)" }} />
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

type SystemsTab = "systems" | "compare" | "by-oem";

export function SystemsView() {
  const [gpuIds, setGpuIds] = useState<SystemGpuId[]>([SYSTEM_GPU_OPTIONS[0].id]);
  const [tab, setTab] = useState<SystemsTab>("systems");
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedSystemGpu, setSelectedSystemGpu] = useState<SystemGpuId | null>(null);
  const [selectedOems, setSelectedOems] = useState<OemSystem["oem"][]>(["Dell"]);

  // Canonical (SYSTEM_GPU_OPTIONS / OEM_ORDER) order, filtered to what's selected — click order doesn't matter.
  const selectedGpuOptions = useMemo(
    () => SYSTEM_GPU_OPTIONS.filter(g => gpuIds.includes(g.id)),
    [gpuIds],
  );
  const multiGpu = selectedGpuOptions.length > 1;
  const selectedOemOptions = useMemo(
    () => OEM_ORDER.filter(o => selectedOems.includes(o)),
    [selectedOems],
  );
  const multiOem = selectedOemOptions.length > 1;

  function toggleGpu(id: SystemGpuId) {
    setGpuIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // keep at least one GPU selected
        return prev.filter(g => g !== id);
      }
      return [...prev, id];
    });
  }

  function toggleOem(oem: OemSystem["oem"]) {
    setSelectedOems(prev => {
      if (prev.includes(oem)) {
        if (prev.length === 1) return prev; // keep at least one OEM selected
        return prev.filter(o => o !== oem);
      }
      return [...prev, oem];
    });
  }

  const systemsByGpu = useMemo(
    () => selectedGpuOptions.map(g => ({ gpuId: g.id, label: g.label, systems: systemsForGpu(g.id) })),
    [selectedGpuOptions],
  );
  // Nested gpu → oem → systems, for rendering "By OEM" grouped by both axes.
  const oemGroupsByGpu = useMemo(
    () => selectedGpuOptions.map(g => ({
      gpuId: g.id,
      label: g.label,
      byOem: selectedOemOptions.map(oem => ({ oem, systems: systemsForOem(oem, g.id) })),
    })),
    [selectedGpuOptions, selectedOemOptions],
  );
  // Flattened gpu → systems (union across selected OEMs) — feeds the export handler, which
  // exports per GPU regardless of how many OEMs are selected within "By OEM".
  const oemSystemsByGpu = useMemo(
    () => oemGroupsByGpu.map(g => ({ gpuId: g.gpuId, label: g.label, systems: g.byOem.flatMap(o => o.systems) })),
    [oemGroupsByGpu],
  );
  const selectedSystemObj = useMemo(
    () => (selectedSystem ? OEM_SYSTEMS.find(s => s.id === selectedSystem) ?? null : null),
    [selectedSystem],
  );
  // The system may not carry every selected GPU — fall back to the first one it does carry.
  const detailGpuId = selectedSystemObj
    ? (selectedSystemGpu && selectedSystemObj.gpuIds.includes(selectedSystemGpu) ? selectedSystemGpu : selectedSystemObj.gpuIds[0])
    : null;

  function openSystem(id: string, gpuId: SystemGpuId) {
    setSelectedSystem(id);
    setSelectedSystemGpu(gpuId);
  }

  // Single registration point (rather than one in this component and another in
  // SystemDetailView) — avoids a mount/unmount race between the two when navigating between
  // the list and a detail view, since ExportContext only ever holds one active registration.
  const exportHandler = useCallback(() => {
    if (selectedSystemObj && detailGpuId) return exportOemSystemDetailToExcel(selectedSystemObj, detailGpuId);
    if (multiGpu) {
      const byGpu = (tab === "by-oem" ? oemSystemsByGpu : systemsByGpu).map(({ gpuId, systems }) => ({ gpuId, systems }));
      return exportOemSystemsMultiGpuToExcel(byGpu);
    }
    const single = tab === "by-oem" ? oemSystemsByGpu[0] : systemsByGpu[0];
    return exportOemSystemsToExcel(single?.systems ?? [], single?.gpuId ?? gpuIds[0]);
  }, [selectedSystemObj, detailGpuId, multiGpu, tab, oemSystemsByGpu, systemsByGpu, gpuIds]);
  const exportLabel = selectedSystemObj
    ? `Export ${selectedSystemObj.oem} ${selectedSystemObj.model}`
    : multiGpu
      ? `Export ${selectedGpuOptions.length} GPUs' Systems`
      : `Export ${selectedGpuOptions[0]?.label ?? "GPU"} Systems`;
  useRegisterExport(exportHandler, exportLabel);

  if (selectedSystemObj && detailGpuId) {
    return (
      <div className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
        <div className="px-6 pt-8 pb-16 max-w-screen-xl mx-auto">
          <SystemDetailView
            system={selectedSystemObj}
            gpuId={detailGpuId}
            onBack={() => { setSelectedSystem(null); setSelectedSystemGpu(null); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="px-6 pt-8 pb-16 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>Systems</h1>
          <p className="mt-3 text-base leading-relaxed max-w-4xl" style={{ color: "var(--dm-txt-secondary)" }}>
            OEM chassis options for one or more chosen GPUs — full spec and node power budget per system, a high-level comparison across OEMs (one table per GPU once you pick more than one), and a per-OEM browser. Compiled from each OEM's own system reference; the GPU silicon itself is covered on the Silicon page.
          </p>
        </div>

        {/* GPU selector — multi-select */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: "var(--dm-txt-faint)" }}>GPU</span>
          {SYSTEM_GPU_OPTIONS.map(g => {
            const active = gpuIds.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGpu(g.id)}
                aria-pressed={active}
                className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border"
                style={{
                  background: active ? "rgba(118,185,0,0.15)" : "transparent",
                  borderColor: active ? "#76b900" : "var(--dm-card-border)",
                  color: active ? "#76b900" : "var(--dm-txt-secondary)",
                }}
              >
                {active && "✓ "}{g.label}
              </button>
            );
          })}
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.07]">
          {([
            { id: "systems" as const, label: "All Systems" },
            { id: "compare" as const, label: "Compare" },
            { id: "by-oem" as const, label: "By OEM" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={{
                color: tab === t.id ? "#fbbf24" : "var(--dm-txt-faint)",
                borderColor: tab === t.id ? "#fbbf24" : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "systems" && (
          systemsByGpu.every(g => g.systems.length === 0) ? (
            <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No system references for the selected GPU(s) yet.</p>
          ) : (
            <div>
              {systemsByGpu.map(({ gpuId, label, systems }) => (
                <div key={gpuId}>
                  {multiGpu && <GpuSectionHeading label={label} />}
                  {systems.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No system references for {label} yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {systems.map(s => (
                        <SystemCard key={s.id} system={s} gpuId={gpuId} onClick={() => openSystem(s.id, gpuId)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "compare" && (
          <div>
            <p className="text-xs mb-4" style={{ color: "var(--dm-txt-faint)" }}>
              Best-fit config is each system's densest OEM-published power scenario for that GPU.{multiGpu ? " Each GPU gets its own table below." : ""} Click a system under "All Systems" for the full node power budget across every published scenario.
            </p>
            {systemsByGpu.map(({ gpuId, label, systems }) => (
              <div key={gpuId}>
                {multiGpu && <GpuSectionHeading label={label} />}
                <CompareTable systems={systems} gpuId={gpuId} />
              </div>
            ))}
          </div>
        )}

        {tab === "by-oem" && (
          <div>
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-widest mr-1" style={{ color: "var(--dm-txt-faint)" }}>OEM</span>
              {OEM_ORDER.map(oem => {
                const accent = OEM_ACCENTS[oem];
                const active = selectedOems.includes(oem);
                return (
                  <button
                    key={oem}
                    onClick={() => toggleOem(oem)}
                    aria-pressed={active}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors border"
                    style={{
                      background: active ? `${accent}20` : "transparent",
                      borderColor: active ? accent : "var(--dm-card-border)",
                      color: active ? accent : "var(--dm-txt-secondary)",
                    }}
                  >
                    {active && "✓ "}{oem}
                  </button>
                );
              })}
            </div>
            {oemGroupsByGpu.every(g => g.byOem.every(o => o.systems.length === 0)) ? (
              <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No system references for the selected GPU(s)/OEM(s) yet.</p>
            ) : (
              <div>
                {oemGroupsByGpu.map(({ gpuId, label, byOem }) => (
                  <div key={gpuId}>
                    {multiGpu && <GpuSectionHeading label={label} />}
                    {byOem.map(({ oem, systems }) => (
                      <div key={oem} className="mb-6 last:mb-0">
                        {multiOem && (
                          <div className="flex items-center gap-2 mb-3">
                            <OemBadge oem={oem} />
                          </div>
                        )}
                        {systems.length === 0 ? (
                          <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>{oem} has no system references for {label} yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                            {systems.map(s => (
                              <SystemCard key={s.id} system={s} gpuId={gpuId} onClick={() => openSystem(s.id, gpuId)} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
