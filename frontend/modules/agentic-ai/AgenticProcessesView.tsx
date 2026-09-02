"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useProject } from "@/contexts/ProjectContext";
import type { BusinessProcess, ProcessParticipant } from "@/modules/projects/types";
import { TextAreaField } from "@/components/ui";
import { calcRequiredConcurrency, TASK_TYPES } from "@/modules/workflows/task-sizing-calcs";
import { withBase } from "@/lib/deployment";
import { extractImplementationWorkflow } from "@/modules/projects/implementation-extract-api";
import { AiSuggestedFlowPanel } from "./AiSuggestedFlowPanel";

function fmt(n: number, d = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyParticipant(): ProcessParticipant {
  return { id: newId(), name: "", role: "" };
}

function emptyProcess(): BusinessProcess {
  return { id: newId(), name: "", description: "", casesPerDay: 0, peakHoursPerDay: 24, agents: [], humans: [], collaboration: "" };
}

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Matches a suggested task_type to the fixed TASK_TYPES vocabulary case-insensitively — the
 *  Agents table's task-type dropdown only renders as selected on an exact string match. */
function normalizeTaskType(taskType: string): string {
  return TASK_TYPES.find(t => t.toLowerCase() === taskType.trim().toLowerCase()) ?? taskType;
}

/** Upserts by (case-insensitive) name: an existing participant keeps its id and every other
 *  field (callsPerCase, taskSizing, ...) and only has `role` (task-type for agents, role for
 *  humans) refreshed from the suggestion; a name with no match is added as a new participant. */
function upsertParticipantsByName(existing: ProcessParticipant[], suggested: { name: string; role: string }[]): ProcessParticipant[] {
  let next = [...existing];
  for (const s of suggested) {
    if (!s.name.trim()) continue;
    const idx = next.findIndex(p => p.name.trim().toLowerCase() === s.name.trim().toLowerCase());
    if (idx === -1) {
      next = [...next, { id: newId(), name: s.name, role: s.role }];
    } else {
      next[idx] = { ...next[idx], role: s.role };
    }
  }
  return next;
}

/** Copies the AI-Suggested-Flow's agents/humans into the Business Process tab's rosters,
 *  mapping each suggested agent's task_type onto the agent's role (task-type) field. */
function copyFromAiSuggestedFlow(process: BusinessProcess): BusinessProcess {
  const suggestion = process.aiSuggestedFlow;
  if (!suggestion) return process;
  const agents = upsertParticipantsByName(
    process.agents,
    suggestion.agents.map(a => ({ name: a.name, role: normalizeTaskType(a.task_type) }))
  );
  const humans = upsertParticipantsByName(
    process.humans,
    suggestion.humans.map(h => ({ name: h.name, role: h.role }))
  );
  return { ...process, agents, humans };
}

// ── participant roster (Humans) ─────────────────────────────────────────────────

function ParticipantRoster({ title, accent, participants, onChange, emptyHint }: {
  title: string; accent: string; participants: ProcessParticipant[];
  onChange: (next: ProcessParticipant[]) => void; emptyHint: string;
}) {
  function update(id: string, patch: Partial<ProcessParticipant>) {
    onChange(participants.map(p => p.id === id ? { ...p, ...patch } : p));
  }
  function remove(id: string) {
    onChange(participants.filter(p => p.id !== id));
  }
  function add() {
    onChange([...participants, emptyParticipant()]);
  }
  function move(index: number, dir: -1 | 1) {
    onChange(moveItem(participants, index, dir));
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `rgb(${accent})` }}>
          {title} <span className="text-white/30 font-normal normal-case tracking-normal">({participants.length})</span>
        </h4>
        <button
          type="button" onClick={add}
          className="text-[11px] font-semibold rounded-md px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: `rgba(${accent},0.12)`, color: `rgb(${accent})` }}
        >
          + Add
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-[12px] text-white/30 leading-relaxed">{emptyHint}</p>
      ) : (
        <div className="space-y-2">
          {participants.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="flex flex-col flex-shrink-0">
                <button
                  type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  aria-label={`Move ${p.name || title.slice(0, -1)} up`}
                  className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
                >
                  ▲
                </button>
                <button
                  type="button" onClick={() => move(i, 1)} disabled={i === participants.length - 1}
                  aria-label={`Move ${p.name || title.slice(0, -1)} down`}
                  className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
                >
                  ▼
                </button>
              </div>
              <input
                type="text" value={p.name} placeholder="Name"
                onChange={e => update(p.id, { name: e.target.value })}
                className="w-[35%] flex-shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25"
              />
              <input
                type="text" value={p.role} placeholder="Role / responsibility"
                onChange={e => update(p.id, { role: e.target.value })}
                className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-[13px] text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25"
              />
              <button
                type="button" onClick={() => remove(p.id)}
                aria-label={`Remove ${p.name || title.slice(0, -1)}`}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── agent roster (table: Name, Task-Type, Calls/Case, Calls/Day, Peak-Calls, Latency, Concurrency) ──

const AGENT_ACCENT = "34,211,238";

function AgentRoster({ participants, onChange, emptyHint, casesPerDay, peakHoursPerDay }: {
  participants: ProcessParticipant[];
  onChange: (next: ProcessParticipant[]) => void; emptyHint: string; casesPerDay: number; peakHoursPerDay: number;
}) {
  function update(id: string, patch: Partial<ProcessParticipant>) {
    onChange(participants.map(p => p.id === id ? { ...p, ...patch } : p));
  }
  function remove(id: string) {
    onChange(participants.filter(p => p.id !== id));
  }
  function add() {
    onChange([...participants, emptyParticipant()]);
  }
  function move(index: number, dir: -1 | 1) {
    onChange(moveItem(participants, index, dir));
  }

  const cellInput = "w-full rounded-lg px-2 py-1.5 text-[12px] text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#818cf8]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25";

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: `rgb(${AGENT_ACCENT})` }}>
          Agents <span className="text-white/30 font-normal normal-case tracking-normal">({participants.length})</span>
        </h4>
        <button
          type="button" onClick={add}
          className="text-[11px] font-semibold rounded-md px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: `rgba(${AGENT_ACCENT},0.12)`, color: `rgb(${AGENT_ACCENT})` }}
        >
          + Add
        </button>
      </div>

      {participants.length === 0 ? (
        <p className="text-[12px] text-white/30 leading-relaxed">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="w-5" />
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Name</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Task-Type</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Calls/Case</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Calls/Day</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Peak-Calls</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Latency</th>
                <th className="px-2 pb-1.5 text-left font-semibold text-white/30 text-[10px] uppercase tracking-wider">Concurrency</th>
                <th className="w-7" />
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => {
                const callsPerCase = p.callsPerCase ?? 0;
                const cfg = p.taskSizing ?? { modelHfId: "" };
                const result = calcRequiredConcurrency({
                  casesPerDay, callsPerCase, role: p.role ?? "", peakHoursPerDay, latencyOverrideSec: cfg.latencySec,
                });
                return (
                  <tr key={p.id} className="align-middle">
                    <td className="pr-1">
                      <div className="flex flex-col">
                        <button
                          type="button" onClick={() => move(i, -1)} disabled={i === 0}
                          aria-label={`Move ${p.name || "agent"} up`}
                          className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
                        >
                          ▲
                        </button>
                        <button
                          type="button" onClick={() => move(i, 1)} disabled={i === participants.length - 1}
                          aria-label={`Move ${p.name || "agent"} down`}
                          className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
                        >
                          ▼
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1 w-40">
                      <input
                        type="text" value={p.name} placeholder="Name"
                        onChange={e => update(p.id, { name: e.target.value })}
                        className={cellInput}
                      />
                    </td>
                    <td className="px-2 py-1 w-44">
                      <select value={p.role} onChange={e => update(p.id, { role: e.target.value })} className={cellInput}>
                        <option value="">Select task type…</option>
                        {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1 w-24">
                      <input
                        type="number" min={0} value={p.callsPerCase ?? ""} placeholder="0"
                        onChange={e => update(p.id, { callsPerCase: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className={cellInput}
                      />
                    </td>
                    <td className="px-2 py-1 font-mono text-white/70 whitespace-nowrap">{fmt(result.callsPerDay, 0)}</td>
                    <td className="px-2 py-1 font-mono text-white/70 whitespace-nowrap">{fmt(result.callsPerSec, 2)}</td>
                    <td className="px-2 py-1 w-20">
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0} value={result.latencySec ?? ""} placeholder="—"
                          title="Task latency (seconds) — defaults from the task type, editable per agent"
                          onChange={e => update(p.id, { taskSizing: { ...cfg, latencySec: e.target.value === "" ? undefined : Number(e.target.value) } })}
                          className={cellInput}
                        />
                        <span className="text-white/25 flex-shrink-0">s</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 font-mono font-semibold whitespace-nowrap" style={{ color: result.requiredConcurrency != null ? "#22d3ee" : undefined }}>
                      {result.requiredConcurrency != null ? result.requiredConcurrency : "—"}
                    </td>
                    <td className="px-1 py-1">
                      <button
                        type="button" onClick={() => remove(p.id)}
                        aria-label={`Remove ${p.name || "agent"}`}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-white/30 hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── save button (flushes the debounced project autosave immediately) ───────────

function SaveButton() {
  const { saveStatus, saveNow } = useProject();
  const label = saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Retry save" : saveStatus === "saved" ? "Saved ✓" : "Save";
  const isError = saveStatus === "error";
  return (
    <button
      type="button" onClick={() => saveNow()}
      disabled={saveStatus === "saving"}
      title="Save this project now"
      className="flex-shrink-0 h-9 px-3 flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      style={{
        background: isError ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.10)",
        color: isError ? "#f87171" : "#34d399",
      }}
    >
      💾 {label}
    </button>
  );
}

// ── reference documents (source-extract markdown from /public, one per business process) ──

/** The Nth business process (0-indexed) is documented by the "0(N+1)_...md" file in /public —
 *  discovered dynamically (rather than hardcoded) so it stays correct as files are renamed or
 *  more business processes/reference docs are added. */
function useReferenceFiles(): string[] {
  const [files, setFiles] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(withBase("/reference-docs"))
      .then(res => res.json())
      .then((data: { files: string[] }) => { if (!cancelled) setFiles(data.files ?? []); })
      .catch(() => { if (!cancelled) setFiles([]); });
    return () => { cancelled = true; };
  }, []);
  return files;
}

/** The Implementation Workflow tab — on demand, asks GROQ to write up an implementation
 *  approach for this business process from the project's documents, notes, and discussion
 *  log (see Documents/Notes/Discussions on the project's summary page). Result is persisted
 *  on the business process itself, same pattern as the AI-Suggested-Flow tab. */
function ImplementationWorkflowPanel({ process, onChange }: {
  process: BusinessProcess; onChange: (next: BusinessProcess) => void;
}) {
  const { currentProject } = useProject();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workflow = process.implementationWorkflow;

  async function handleExtract() {
    if (!currentProject) return;
    setLoading(true); setError(null);
    try {
      const result = await extractImplementationWorkflow(currentProject.id, process.name, process.description);
      onChange({ ...process, implementationWorkflow: { content: result.content, generatedAt: new Date().toISOString() } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[12px] max-w-xl leading-relaxed" style={{ color: "var(--dm-txt-faint)" }}>
          Reads this project&rsquo;s Documents, Notes, and Discussion log and asks an LLM (via GROQ) to write up
          an implementation approach for this business process, grounded in that material.
        </p>
        <button
          type="button" onClick={handleExtract} disabled={loading}
          className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: "#0891b2" }}
        >
          {loading ? "Extracting…" : workflow ? "Re-extract" : "Extract"}
        </button>
      </div>

      {error && (
        <p className="mb-4 text-[12px] rounded-lg px-3 py-2" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)" }}>
          {error}
        </p>
      )}

      {!workflow && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No implementation workflow extracted yet.</p>
          <p className="text-xs mt-1" style={{ color: "var(--dm-txt-muted)" }}>Click Extract to generate one from this project&rsquo;s documents, notes, and discussions.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/[0.07] py-16 text-center" style={{ background: "var(--dm-card-bg)" }}>
          <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>Calling GROQ…</p>
        </div>
      )}

      {workflow && !loading && (
        <div>
          <p className="text-[11px] mb-3" style={{ color: "var(--dm-txt-faint)" }}>Generated {new Date(workflow.generatedAt).toLocaleString()}</p>
          <div className="md-reference rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 max-h-[640px] overflow-y-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{workflow.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ── one business process card (accordion row) ───────────────────────────────────

type ProcessTab = "design" | "reference" | "ai-suggested-flow";

function BusinessProcessCard({ process, expanded, onToggleExpand, onChange, onDelete, referenceFile }: {
  process: BusinessProcess; expanded: boolean; onToggleExpand: () => void; referenceFile: string | undefined;
  onChange: (next: BusinessProcess) => void; onDelete: () => void;
}) {
  const agentCount = process.agents.length;
  const humanCount = process.humans.length;
  const [tab, setTab] = useState<ProcessTab>("design");

  return (
    <div className="rounded-2xl border border-white/[0.07] overflow-hidden" style={{ background: "var(--dm-card-bg)" }}>
      <div className="flex items-center gap-3 p-4">
        <button
          type="button" onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse business process" : "Expand business process"}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          <span className="inline-block transition-transform text-[11px]" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        </button>

        <input
          type="text" value={process.name} placeholder="Business process name — e.g. Invoice Reconciliation"
          onChange={e => onChange({ ...process, name: e.target.value })}
          className="flex-1 min-w-0 rounded-lg px-3 py-2 text-base font-bold text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#22d3ee]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25"
        />

        {!expanded && (
          <span className="flex-shrink-0 text-[11px] text-white/30 hidden sm:inline">
            {process.casesPerDay > 0 ? `${process.casesPerDay.toLocaleString()} cases/day · ` : ""}
            {agentCount} agent{agentCount === 1 ? "" : "s"} · {humanCount} human{humanCount === 1 ? "" : "s"}
          </span>
        )}

        <SaveButton />
        <button
          type="button" onClick={onDelete}
          aria-label="Delete business process"
          title="Delete business process"
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white/30 hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          🗑
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5">
          <div className="flex gap-1 mb-4 border-b border-white/[0.07]">
            {([
              { key: "design" as const, label: "Business Process" },
              { key: "ai-suggested-flow" as const, label: "AI Suggested Workflow" },
              { key: "reference" as const, label: "Implementation Workflow" },
            ]).map(t => (
              <button
                key={t.key}
                type="button" onClick={() => setTab(t.key)}
                className="px-3 py-2 text-xs font-semibold transition-colors -mb-px border-b-2"
                style={{
                  color: tab === t.key ? "#22d3ee" : "var(--dm-txt-faint)",
                  borderColor: tab === t.key ? "#22d3ee" : "transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "design" ? (
            <>
              <div className="mb-4">
                <TextAreaField
                  label="What is this process, and why is it being modernized with agents?"
                  value={process.description}
                  onChange={v => onChange({ ...process, description: v })}
                  placeholder="e.g. Manually matching vendor invoices against purchase orders and flagging discrepancies for finance to review."
                  rows={2}
                />
              </div>

              {process.aiSuggestedFlow && (
                <div className="mb-4 flex items-center gap-3 flex-wrap rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
                  <p className="text-[12px] flex-1 min-w-[220px]" style={{ color: "var(--dm-txt-faint)" }}>
                    Copy the agents and humans from the AI Suggested Workflow tab into the rosters below,
                    mapping each agent to its suggested task-type. Existing entries with a matching name are
                    updated in place (task-type/role only) — nothing else is overwritten; new ones are added.
                  </p>
                  <button
                    type="button" onClick={() => onChange(copyFromAiSuggestedFlow(process))}
                    className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                    style={{ background: "#0891b2" }}
                  >
                    Copy from AI Suggested Workflow
                  </button>
                </div>
              )}

              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40" htmlFor={`cases-per-day-${process.id}`}>
                  Cases / day
                </label>
                <input
                  id={`cases-per-day-${process.id}`}
                  type="number" min={0} value={process.casesPerDay || ""} placeholder="0"
                  onChange={e => onChange({ ...process, casesPerDay: e.target.value === "" ? 0 : Number(e.target.value) })}
                  className="w-28 rounded-lg px-2.5 py-1.5 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#22d3ee]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors"
                />

                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40" htmlFor={`peak-hours-${process.id}`}>
                  Peak hours / day
                </label>
                <input
                  id={`peak-hours-${process.id}`}
                  type="number" min={1} max={24} value={process.peakHoursPerDay || 24}
                  onChange={e => onChange({ ...process, peakHoursPerDay: e.target.value === "" ? 24 : Number(e.target.value) })}
                  className="w-20 rounded-lg px-2.5 py-1.5 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#22d3ee]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors"
                />

                <span className="text-[11px] text-white/25 leading-snug">
                  Expected case volume/day for this process, and how many of the 24 hours that volume lands in — together
                  with each agent&rsquo;s calls/case below, these size the LLM layer. Reducing peak hours concentrates the
                  same daily volume into a shorter window, raising peak calls/sec. Manually entered for now; a future
                  LLM-based estimate can populate these, with the Presales architect always able to override them.
                </span>
              </div>

              <div className="mb-4">
                <AgentRoster
                  participants={process.agents}
                  onChange={agents => onChange({ ...process, agents })}
                  emptyHint="No agents added yet. Add the AI agents that will handle steps of this process."
                  casesPerDay={process.casesPerDay || 0}
                  peakHoursPerDay={process.peakHoursPerDay || 24}
                />
              </div>

              <div className="mb-4">
                <ParticipantRoster
                  title="Humans" accent="167,139,250"
                  participants={process.humans}
                  onChange={humans => onChange({ ...process, humans })}
                  emptyHint="No humans added yet. Add the people who review, approve, or handle exceptions alongside the agents."
                />
              </div>

              <TextAreaField
                label="How do the agents and humans co-work on this process?"
                value={process.collaboration}
                onChange={v => onChange({ ...process, collaboration: v })}
                placeholder="e.g. The Extraction Agent parses each invoice and hands mismatches over $500 to the AP Clerk for review; everything else is auto-approved by the Reconciliation Agent."
                rows={3}
              />
            </>
          ) : tab === "reference" ? (
            <ImplementationWorkflowPanel process={process} onChange={onChange} />
          ) : (
            <AiSuggestedFlowPanel process={process} referenceFile={referenceFile} onChange={onChange} />
          )}
        </div>
      )}
    </div>
  );
}

// ── page-level view ───────────────────────────────────────────────────────────────

export function AgenticProcessesView({ businessProcesses, onChange }: {
  businessProcesses: BusinessProcess[];
  onChange: (next: BusinessProcess[]) => void;
}) {
  // Tracks which processes are *collapsed* (not expanded) — starting empty means every
  // process, including ones just loaded from a different project, is fully expanded by
  // default; collapsing is an explicit per-card opt-out.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const referenceFiles = useReferenceFiles();

  function updateProcess(id: string, next: BusinessProcess) {
    onChange(businessProcesses.map(p => p.id === id ? next : p));
  }
  function deleteProcess(id: string) {
    onChange(businessProcesses.filter(p => p.id !== id));
    setCollapsedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
  }
  function addProcess() {
    const p = emptyProcess();
    onChange([...businessProcesses, p]);
  }
  function toggleExpand(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function expandAll() {
    setCollapsedIds(new Set());
  }
  function collapseAll() {
    setCollapsedIds(new Set(businessProcesses.map(p => p.id)));
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <p className="text-[13px] text-white/40 max-w-2xl leading-relaxed">
          Describe the business processes this project is modernizing with agents — for each one, list the agents
          and humans involved and how they work together.
        </p>
        <div className="flex-shrink-0 flex items-center gap-2">
          {businessProcesses.length > 0 && (
            <div className="flex items-center rounded-lg overflow-hidden border border-white/10">
              <button
                type="button" onClick={expandAll}
                className="px-3 py-2 text-xs font-semibold text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                Expand all
              </button>
              <div className="w-px self-stretch bg-white/10" />
              <button
                type="button" onClick={collapseAll}
                className="px-3 py-2 text-xs font-semibold text-white/60 hover:text-white/90 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                Collapse all
              </button>
            </div>
          )}
          <button
            type="button" onClick={addProcess}
            className="flex-shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            style={{ background: "#0891b2" }}
          >
            + Add business process
          </button>
        </div>
      </div>

      {businessProcesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm mb-3">No business processes described yet.</p>
          <button type="button" onClick={addProcess} className="text-sm font-semibold text-[#22d3ee] hover:underline">
            Add your first business process
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {businessProcesses.map((p, i) => (
            <BusinessProcessCard
              key={p.id} process={p}
              expanded={!collapsedIds.has(p.id)}
              onToggleExpand={() => toggleExpand(p.id)}
              onChange={next => updateProcess(p.id, next)}
              onDelete={() => deleteProcess(p.id)}
              referenceFile={referenceFiles[i]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
