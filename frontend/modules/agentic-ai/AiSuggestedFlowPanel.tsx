"use client";

import { useMemo, useState } from "react";
import { withBase } from "@/lib/deployment";
import { generateAgentSuggestions } from "./agent-suggestions-api";
import type { AiSuggestedFlow, BusinessProcess } from "@/modules/projects/types";
import { timeAgo } from "@/modules/projects/format";

const AGENT_ACCENT = "34,211,238";
const HUMAN_ACCENT = "167,139,250";

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

async function fetchReferenceText(filename: string | undefined): Promise<string> {
  if (!filename) return "";
  try {
    const res = await fetch(withBase(`/${filename}`));
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

function FlowStepCard({ actor, name, description, badge, isLast, canMoveUp, canMoveDown, onMove }: {
  actor: "agent" | "human"; name: string; description: string; badge: string; isLast: boolean;
  canMoveUp: boolean; canMoveDown: boolean; onMove: (dir: -1 | 1) => void;
}) {
  const accent = actor === "agent" ? AGENT_ACCENT : HUMAN_ACCENT;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
          style={{ background: `rgba(${accent},0.15)`, border: `1px solid rgba(${accent},0.4)` }}
          aria-hidden
        >
          {actor === "agent" ? "\u{1F916}" : "\u{1F9D1}"}
        </span>
        {!isLast && <span className="flex-1 w-px my-1" style={{ background: `rgba(${accent},0.3)`, minHeight: 20 }} />}
      </div>
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm" style={{ color: "var(--dm-txt-primary)" }}>{name}</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: `rgb(${accent})`, background: `rgba(${accent},0.1)` }}
          >
            {badge}
          </span>
          <div className="flex flex-col ml-auto flex-shrink-0">
            <button
              type="button" onClick={() => onMove(-1)} disabled={!canMoveUp}
              aria-label={`Move ${name} earlier in the flow`}
              className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
            >
              ▲
            </button>
            <button
              type="button" onClick={() => onMove(1)} disabled={!canMoveDown}
              aria-label={`Move ${name} later in the flow`}
              className="w-5 h-3.5 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 disabled:hover:text-white/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 leading-none text-[9px]"
            >
              ▼
            </button>
          </div>
        </div>
        {description && (
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--dm-txt-faint)" }}>{description}</p>
        )}
      </div>
    </div>
  );
}

function historyEntryFrom(suggestion: AiSuggestedFlow): AiSuggestedFlow {
  return { ...suggestion };
}

function HistoryPanel({ history, onRestore, onDelete }: {
  history: AiSuggestedFlow[];
  onRestore: (entry: AiSuggestedFlow) => void;
  onDelete: (entry: AiSuggestedFlow) => void;
}) {
  if (history.length === 0) return null;
  return (
    <div className="mt-5">
      <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-muted)" }}>
        Prior versions <span className="font-normal normal-case tracking-normal">({history.length})</span>
      </h4>
      <div className="space-y-2">
        {history.map(entry => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-lg border border-white/[0.07] px-3 py-2.5"
            style={{ background: "var(--dm-card-bg)" }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[12px]" style={{ color: entry.prompt ? "var(--dm-txt-secondary)" : "var(--dm-txt-faint)" }}>
                {entry.prompt || "Initial generation (no nudge)"}
              </p>
              <p className="text-[10.5px] mt-1" style={{ color: "var(--dm-txt-faint)" }}>
                {timeAgo(entry.generatedAt)} · {entry.agents.length} agent{entry.agents.length === 1 ? "" : "s"} · {entry.humans.length} human check{entry.humans.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button" onClick={() => onRestore(entry)}
              className="flex-shrink-0 text-[11px] font-semibold rounded-md px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
            >
              Revert to this
            </button>
            <button
              type="button" onClick={() => onDelete(entry)}
              aria-label="Delete this prior version"
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiSuggestedFlowPanel({ process, referenceFile, onChange }: {
  process: BusinessProcess;
  referenceFile: string | undefined;
  onChange: (next: BusinessProcess) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState("");
  // `id` was added after this feature shipped, so data generated earlier has none — backfill a
  // stable one here (rather than at rest) so keys below are always unique without a migration.
  const suggestion = useMemo(() => {
    const s = process.aiSuggestedFlow;
    return s && !s.id ? { ...s, id: newId() } : s;
  }, [process.aiSuggestedFlow]);
  const history = useMemo(() => {
    const raw = process.aiSuggestedFlowHistory ?? [];
    return raw.map(h => (h.id ? h : { ...h, id: newId() }));
  }, [process.aiSuggestedFlowHistory]);

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const referenceText = await fetchReferenceText(referenceFile);
      const trimmedNudge = nudge.trim();
      const result = await generateAgentSuggestions({
        business_process_name: process.name,
        description: process.description,
        reference_text: referenceText,
        nudge_prompt: trimmedNudge,
        previous_flow: suggestion ? { agents: suggestion.agents, humans: suggestion.humans, flow: suggestion.flow } : undefined,
      });
      const nextSuggestion: AiSuggestedFlow = {
        id: newId(),
        prompt: trimmedNudge || undefined,
        ...result,
        generatedAt: new Date().toISOString(),
      };
      const nextHistory = suggestion ? [historyEntryFrom(suggestion), ...history] : history;
      onChange({ ...process, aiSuggestedFlow: nextSuggestion, aiSuggestedFlowHistory: nextHistory });
      setNudge("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleRestore(entry: AiSuggestedFlow) {
    const rest = history.filter(h => h.id !== entry.id);
    const nextHistory = suggestion ? [historyEntryFrom(suggestion), ...rest] : rest;
    onChange({ ...process, aiSuggestedFlow: entry, aiSuggestedFlowHistory: nextHistory });
  }

  function handleDeleteHistoryEntry(entry: AiSuggestedFlow) {
    onChange({ ...process, aiSuggestedFlowHistory: history.filter(h => h.id !== entry.id) });
  }

  function moveFlowStep(index: number, dir: -1 | 1) {
    if (!suggestion) return;
    const sorted = [...suggestion.flow].sort((a, b) => a.step - b.step);
    const reordered = moveItem(sorted, index, dir).map((step, i) => ({ ...step, step: i + 1 }));
    onChange({ ...process, aiSuggestedFlow: { ...suggestion, flow: reordered } });
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-[12px] max-w-xl leading-relaxed mb-3" style={{ color: "var(--dm-txt-faint)" }}>
          Reads this process&rsquo;s Reference document and asks an LLM (via GROQ) to propose the agents, task
          types, and human checkpoints needed — and the order they&rsquo;d run in. Ground truth, not a
          substitute for the Design tab; nothing here is applied automatically.
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--dm-txt-muted)" }}>
              Nudge {suggestion ? "(optional — refine the current proposal, e.g. per customer feedback)" : "(optional)"}
            </label>
            <input
              value={nudge} onChange={e => setNudge(e.target.value)}
              placeholder={suggestion ? "e.g. Add a human check before the final approval step" : "e.g. Keep it to at most 3 agents"}
              className="w-full rounded-lg px-3 py-2 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-[#22d3ee]/50 focus-visible:ring-1 focus-visible:ring-white/40 transition-colors placeholder-white/25"
            />
          </div>
          <button
            type="button" onClick={handleGenerate} disabled={loading}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            style={{ background: "#0891b2" }}
          >
            {loading ? "Generating…" : suggestion ? "Regenerate" : "Generate"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-[12px] rounded-lg px-3 py-2" style={{ color: "#f87171", background: "rgba(248,113,113,0.08)" }}>
          {error}
        </p>
      )}

      {!suggestion && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>No AI-suggested flow generated yet.</p>
          <p className="text-xs mt-1" style={{ color: "var(--dm-txt-muted)" }}>Click Generate to propose one from this process&rsquo;s reference material.</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/[0.07] py-16 text-center" style={{ background: "var(--dm-card-bg)" }}>
          <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>Calling GROQ…</p>
        </div>
      )}

      {suggestion && !loading && (
        <div className="rounded-2xl border border-white/[0.07] p-5" style={{ background: "var(--dm-card-bg)" }}>
          <div className="flex items-center gap-4 mb-2 text-[11px] flex-wrap" style={{ color: "var(--dm-txt-faint)" }}>
            <span>Generated {new Date(suggestion.generatedAt).toLocaleString()}</span>
            <span>·</span>
            <span>{suggestion.agents.length} agent{suggestion.agents.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{suggestion.humans.length} human check{suggestion.humans.length === 1 ? "" : "s"}</span>
          </div>
          {suggestion.prompt && (
            <p className="text-[12px] mb-4 rounded-lg px-3 py-2" style={{ color: "#22d3ee", background: "rgba(34,211,238,0.08)" }}>
              Nudge applied: {suggestion.prompt}
            </p>
          )}

          {suggestion.flow.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>The model didn&rsquo;t return any flow steps.</p>
          ) : (
            <div>
              {[...suggestion.flow].sort((a, b) => a.step - b.step).map((step, i, sorted) => {
                const agentMeta = suggestion.agents.find(a => a.name === step.name);
                const humanMeta = suggestion.humans.find(h => h.name === step.name);
                const badge = step.actor === "agent" ? (agentMeta?.task_type ?? "Agent") : (humanMeta?.role ?? "Human");
                return (
                  <FlowStepCard
                    key={`${step.step}-${step.name}`}
                    actor={step.actor}
                    name={step.name}
                    description={step.description}
                    badge={badge}
                    isLast={i === sorted.length - 1}
                    canMoveUp={i > 0}
                    canMoveDown={i < sorted.length - 1}
                    onMove={dir => moveFlowStep(i, dir)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {!loading && <HistoryPanel history={history} onRestore={handleRestore} onDelete={handleDeleteHistoryEntry} />}
    </div>
  );
}
