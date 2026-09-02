import type { WorkflowDef } from "./data";

/** The kind of model call a task makes — shown alongside Impl/Category so the catalog
 *  also answers "what kind of model would run this?", not just "does it call one". */
export type LlmType =
  | "OCR" | "Vision" | "Speech-to-Text" | "Text-to-Speech" | "Translation"
  | "Classification" | "Extraction" | "Generation" | "Reason" | "None";

/** SLM = a small/specialized model is sufficient (classification, extraction, narrow
 *  transcription/vision). LLM = needs a general-purpose large model for open-ended
 *  judgment, drafting, or multi-step reasoning. N/A = deterministic, no model at all. */
export type ModelClass = "SLM" | "LLM" | "N/A";

export interface LlmProfile { llmType: LlmType; modelClass: ModelClass }

const NONE: LlmProfile = { llmType: "None", modelClass: "N/A" };

/** Explicit per-task profile for every Model/Hybrid task in the catalog. Deterministic
 *  tasks are never listed here — they fall through to NONE below. */
const PROFILES: Record<string, LlmProfile> = {
  "process-pdf":                { llmType: "OCR",            modelClass: "SLM" },
  "transcribe-speech":          { llmType: "Speech-to-Text",  modelClass: "SLM" },
  "read-handwriting":           { llmType: "OCR",             modelClass: "LLM" },
  "assess-document-quality":    { llmType: "Classification",  modelClass: "SLM" },
  "classify-document":          { llmType: "Classification",  modelClass: "SLM" },
  "compare-document-versions":  { llmType: "Reason",          modelClass: "LLM" },
  "detect-layout":               { llmType: "Vision",          modelClass: "SLM" },
  "extract-clauses":             { llmType: "Extraction",      modelClass: "LLM" },
  "extract-document-metadata":   { llmType: "Extraction",      modelClass: "SLM" },
  "extract-signatures":          { llmType: "Vision",          modelClass: "SLM" },
  "extract-tables":              { llmType: "Vision",          modelClass: "SLM" },
  "verify-document-completeness":{ llmType: "Reason",          modelClass: "LLM" },
  "create-tags":                  { llmType: "Classification",  modelClass: "SLM" },
  "determine-entities":           { llmType: "Extraction",      modelClass: "SLM" },
  "determine-intent":             { llmType: "Classification",  modelClass: "SLM" },
  "fill-json":                    { llmType: "Extraction",      modelClass: "SLM" },
  "summarize":                    { llmType: "Generation",      modelClass: "LLM" },
  "classify-text":                { llmType: "Classification",  modelClass: "SLM" },
  "detect-contradiction":         { llmType: "Reason",          modelClass: "LLM" },
  "detect-sentiment":             { llmType: "Classification",  modelClass: "SLM" },
  "detect-text-anomaly":          { llmType: "Classification",  modelClass: "SLM" },
  "detect-urgency":               { llmType: "Classification",  modelClass: "SLM" },
  "extract-key-values":           { llmType: "Extraction",      modelClass: "SLM" },
  "rank-relevance":                { llmType: "Reason",          modelClass: "SLM" },
  "rewrite-simplify":              { llmType: "Generation",      modelClass: "LLM" },
  "align-documents":               { llmType: "Reason",          modelClass: "LLM" },
  "check-compliance":              { llmType: "Reason",          modelClass: "LLM" },
  "cross-validate-sources":        { llmType: "Reason",          modelClass: "LLM" },
  "detect-deviation":              { llmType: "Reason",          modelClass: "LLM" },
  "detect-missing-obligation":     { llmType: "Reason",          modelClass: "LLM" },
  "text-to-speech":                { llmType: "Text-to-Speech",  modelClass: "SLM" },
  "translate-text":                { llmType: "Translation",     modelClass: "LLM" },
  "detect-audio-language":         { llmType: "Speech-to-Text",  modelClass: "SLM" },
  "detect-emotion-voice":          { llmType: "Classification",  modelClass: "SLM" },
  "diarize-speakers":              { llmType: "Speech-to-Text",  modelClass: "SLM" },
  "extract-action-items":          { llmType: "Extraction",      modelClass: "LLM" },
  "identify-speaker":              { llmType: "Speech-to-Text",  modelClass: "SLM" },
  "normalize-transcript":          { llmType: "Generation",      modelClass: "SLM" },
  "redact-audio":                  NONE,
  "score-call-quality":            { llmType: "Reason",          modelClass: "LLM" },
  "spot-keywords-audio":           { llmType: "Classification",  modelClass: "SLM" },
  "summarize-meeting":             { llmType: "Generation",      modelClass: "LLM" },
  "translate-speech":              { llmType: "Translation",     modelClass: "LLM" },
  "rerank-context":                { llmType: "Classification",  modelClass: "SLM" },
  "maintain-taxonomy":             { llmType: "Reason",          modelClass: "LLM" },
  "query-structured-store":        { llmType: "Generation",      modelClass: "LLM" },
  "route-request":                 { llmType: "Classification",  modelClass: "SLM" },
  "request-clarification":         { llmType: "Generation",      modelClass: "SLM" },
  "compose-reply":                 { llmType: "Generation",      modelClass: "LLM" },
  "generate-document":             { llmType: "Generation",      modelClass: "LLM" },
  "generate-presentation":         { llmType: "Generation",      modelClass: "LLM" },
  "check-guardrails":              { llmType: "Classification",  modelClass: "SLM" },
  "mask-pii":                      { llmType: "Extraction",      modelClass: "SLM" },
  "classify-data-sensitivity":     { llmType: "Classification",  modelClass: "SLM" },
  "detect-prompt-injection":       { llmType: "Classification",  modelClass: "SLM" },
  "detect-toxicity-bias":          { llmType: "Classification",  modelClass: "SLM" },
  "screen-sanctions":              { llmType: "Reason",          modelClass: "LLM" },
};

/** Deterministic tasks never call a model; everything else falls back to a conservative
 *  "general LLM reasoning" guess if a new task is added here before its profile is set. */
export function llmProfileFor(wf: WorkflowDef): LlmProfile {
  if (wf.impl === "Deterministic") return NONE;
  return PROFILES[wf.id] ?? { llmType: "Reason", modelClass: "LLM" };
}
