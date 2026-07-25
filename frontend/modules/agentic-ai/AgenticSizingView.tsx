"use client";

import Image from "next/image";
import { allWorkloadIcons } from "./layers";
import { SIZING_MAP, defaultInputsFor } from "./sizing-wiring";
import { summarizeResources, type AnyInputs } from "./sizing-calcs";

function fmt(n: number): string {
  return n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString();
}

export function AgenticSizingView({
  selectedWorkloads, sizingInputs, onRemove, onOpenSizing, onBackToStack,
}: {
  selectedWorkloads: Set<string>;
  sizingInputs: Partial<Record<string, AnyInputs>>;
  onRemove: (workloadId: string) => void;
  onOpenSizing: (workloadId: string) => void;
  onBackToStack: () => void;
}) {
  const rows = allWorkloadIcons.filter(w => selectedWorkloads.has(w.icon.alt));

  if (rows.length === 0) {
    return (
      <section className="mx-auto max-w-screen-2xl px-6 py-6">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm mb-3">No workloads selected yet.</p>
          <button
            onClick={onBackToStack}
            className="text-sm font-semibold text-[#22d3ee] hover:underline"
          >
            Go to Stack and turn on &ldquo;Select workloads&rdquo;
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: "var(--dm-table-bg, #0a1730)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head, #0e1d38)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Workload</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Layer</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">CPU Cores</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">RAM (GB)</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">GPU</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ icon, layer, subLayer }) => {
                const tool = SIZING_MAP[icon.alt];
                const summary = tool
                  ? summarizeResources(tool, sizingInputs[icon.alt] ?? defaultInputsFor(tool))
                  : null;
                const thumb = (
                  <span className="relative w-7 h-7 rounded-md overflow-hidden flex-shrink-0 border border-white/10 bg-white/5">
                    <Image src={icon.src} alt={icon.alt} width={28} height={28} className="w-full h-full object-contain" />
                  </span>
                );
                return (
                  <tr key={icon.alt} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="px-4 py-3">
                      {tool ? (
                        <button
                          onClick={() => onOpenSizing(icon.alt)}
                          className="flex items-center gap-2.5 group"
                        >
                          {thumb}
                          <span className="text-sm font-semibold text-white/90 group-hover:text-[#22d3ee] transition-colors underline decoration-dotted underline-offset-2">
                            {icon.alt}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          {thumb}
                          <span className="text-sm font-semibold text-white/70">{icon.alt}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50">
                      {layer.title}{subLayer && <span className="text-white/30"> · {subLayer.title}</span>}
                    </td>
                    {summary ? (
                      <>
                        <td className="px-3 py-3 font-mono text-sm text-white/85">{fmt(summary.cores)}</td>
                        <td className="px-3 py-3 font-mono text-sm text-white/85">{fmt(summary.ramGB)}</td>
                        <td className="px-3 py-3 font-mono text-sm text-white/85">{summary.gpuCount > 0 ? fmt(summary.gpuCount) : "—"}</td>
                      </>
                    ) : (
                      <td className="px-3 py-3 text-xs text-white/25" colSpan={3}>Sizing not available yet</td>
                    )}
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => onRemove(icon.alt)}
                        className="text-white/30 hover:text-danger transition-colors text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
