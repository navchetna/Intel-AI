"use client";

import { useProject } from "@/contexts/ProjectContext";
import type { KeySizingParameter } from "./types";
import { SectionHeader } from "@/components/ui";

function mkId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function emptyParam(): KeySizingParameter {
  return { id: mkId(), parameter: "", value: "", implication: "" };
}

const cellInputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

/** Editable project overview: free-text description plus the key sizing parameters that
 *  drive the stack/sizing sections further down the page. Autosaves like every other
 *  project field via ProjectContext's debounced save. */
export function ProjectSummaryEditor() {
  const { data, updateOverview } = useProject();
  const { description, keyParameters } = data.overview;

  function setParam(id: string, patch: Partial<KeySizingParameter>) {
    updateOverview({ keyParameters: keyParameters.map(p => (p.id === id ? { ...p, ...patch } : p)) });
  }
  function addParam() {
    updateOverview({ keyParameters: [...keyParameters, emptyParam()] });
  }
  function removeParam(id: string) {
    updateOverview({ keyParameters: keyParameters.filter(p => p.id !== id) });
  }

  return (
    <section className="mb-8">
      <SectionHeader index="0" title="Project Summary" subtitle="Editable — description and key sizing parameters" />
      <div className="rounded-2xl border p-5" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
        <textarea
          value={description}
          onChange={e => updateOverview({ description: e.target.value })}
          placeholder="Describe the project — scope, goals, applications being built…"
          rows={5}
          className="w-full rounded-lg px-3 py-2.5 text-sm leading-relaxed focus:outline-none resize-y"
          style={cellInputStyle}
        />

        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-muted)" }}>
              Key sizing parameters
            </span>
            <button
              type="button" onClick={addParam}
              className="text-xs font-semibold rounded-md px-2.5 py-1 transition-colors"
              style={{ color: "var(--dm-txt-secondary)", background: "var(--dm-surface-b)" }}
            >
              + Add parameter
            </button>
          </div>

          {keyParameters.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>No key sizing parameters yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--dm-border-a)" }}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "var(--dm-table-head)" }}>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider w-48" style={{ color: "var(--dm-txt-muted)" }}>Parameter</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider w-40" style={{ color: "var(--dm-txt-muted)" }}>Value</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Sizing implication</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {keyParameters.map(p => (
                    <tr key={p.id} style={{ borderTop: "1px solid var(--dm-border-a)" }}>
                      <td className="px-2 py-1.5">
                        <input value={p.parameter} onChange={e => setParam(p.id, { parameter: e.target.value })}
                          className="w-full rounded px-2 py-1.5 text-sm focus:outline-none" style={cellInputStyle} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={p.value} onChange={e => setParam(p.id, { value: e.target.value })}
                          className="w-full rounded px-2 py-1.5 text-sm focus:outline-none" style={cellInputStyle} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={p.implication} onChange={e => setParam(p.id, { implication: e.target.value })}
                          className="w-full rounded px-2 py-1.5 text-sm focus:outline-none" style={cellInputStyle} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button" onClick={() => removeParam(p.id)} aria-label="Remove parameter"
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:text-danger"
                          style={{ color: "var(--dm-txt-faint)" }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
