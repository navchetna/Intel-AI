"use client";

import { useState } from "react";
import { withBase } from "@/lib/deployment";
import { generateAgentSuggestions } from "./agent-suggestions-api";
import type { BusinessProcess } from "@/modules/projects/types";

const AGENT_ACCENT = "34,211,238";
const HUMAN_ACCENT = "167,139,250";

async function fetchReferenceText(filename: string | undefined): Promise<string> {
  if (!filename) return "";
  try {
    const res = await fetch(withBase(`/${filename}`));
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

function FlowStepCard({ actor, name, description, badge, isLast }: {
  actor: "agent" | "human"; name: string; description: string; badge: string; isLast: boolean;
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
        </div>
        {description && (
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: "var(--dm-txt-faint)" }}>{description}</p>
        )}
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
  const suggestion = process.aiSuggestedFlow;

  async function handleGenerate() {
    setLoading(true); setError(null);
    try {
      const referenceText = await fetchReferenceText(referenceFile);
      const result = await generateAgentSuggestions({
        business_process_name: process.name,
        description: process.description,
        reference_text: referenceText,
      });
      onChange({ ...process, aiSuggestedFlow: { ...result, generatedAt: new Date().toISOString() } });
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
          Reads this process&rsquo;s Reference document and asks an LLM (via GROQ) to propose the agents, task
          types, and human checkpoints needed — and the order they&rsquo;d run in. Ground truth, not a
          substitute for the Design tab; nothing here is applied automatically.
        </p>
        <button
          type="button" onClick={handleGenerate} disabled={loading}
          className="flex-shrink-0 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: "#0891b2" }}
        >
          {loading ? "Generating…" : suggestion ? "Regenerate" : "Generate"}
        </button>
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
          <div className="flex items-center gap-4 mb-5 text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>
            <span>Generated {new Date(suggestion.generatedAt).toLocaleString()}</span>
            <span>·</span>
            <span>{suggestion.agents.length} agent{suggestion.agents.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{suggestion.humans.length} human check{suggestion.humans.length === 1 ? "" : "s"}</span>
          </div>

          {suggestion.flow.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>The model didn&rsquo;t return any flow steps.</p>
          ) : (
            <div>
              {[...suggestion.flow].sort((a, b) => a.step - b.step).map((step, i) => {
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
                    isLast={i === suggestion.flow.length - 1}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
