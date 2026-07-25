"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecords } from "@/modules/inference/benchmarks/api";
import type { BenchmarkRecord } from "@/modules/inference/benchmarks/types";
import type { Model } from "./data";
import { calcKvCacheGB, calcVramGB, findSlaMatch, groupResourceConfigs, type ResourceConfig } from "./sizing-calcs";
import type { ModelSizingConfig } from "@/modules/projects/types";

function defaultConfigFor(model: Model): ModelSizingConfig {
  return { ttftMs: 500, tokensPerSec: 20, configKey: "", quant: model.quantization[0] ?? "BF16" };
}

const inputStyle = {
  background: "var(--dm-input-bg, #0e1d38)",
  border: "1px solid var(--dm-input-border, rgba(255,255,255,0.12))",
  color: "var(--dm-input-color, rgba(255,255,255,0.85))",
  colorScheme: "dark",
} as React.CSSProperties;

function fmtGB(n: number): string {
  return n < 10 ? n.toFixed(2) : n.toFixed(1);
}

function resourceLabel(cfg: ResourceConfig): string {
  const cards = cfg.tp != null && cfg.num_deployments != null ? cfg.tp * cfg.num_deployments : null;
  const topo = `tp=${cfg.tp ?? "—"} × ${cfg.num_deployments ?? "—"} deployments`;
  return cards != null ? `${cfg.platform} · ${topo} (≈${cards} accelerators)` : `${cfg.platform} · ${topo}`;
}

// ── one row per selected model ─────────────────────────────────────────────────

function SizingRow({ model, config, onConfigChange, onRemove }: {
  model: Model;
  config: ModelSizingConfig;
  onConfigChange: (patch: Partial<ModelSizingConfig>) => void;
  onRemove: () => void;
}) {
  const [records, setRecords]   = useState<BenchmarkRecord[] | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const { ttftMs, tokensPerSec, configKey, quant } = config;

  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    setError(null);
    fetchRecords({ model: model.hfId, input_tokens: "", output_tokens: "", batch_size: "", platform: "", serving_engine: "" })
      .then(res => { if (!cancelled) setRecords(res.rows); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [model.hfId]);

  const configs = useMemo(() => groupResourceConfigs(records ?? []), [records]);
  const activeConfig = configs.find(c => `${c.platform} ${c.tp} ${c.num_deployments}` === configKey) ?? configs[0];

  const match = activeConfig ? findSlaMatch(activeConfig.records, ttftMs, tokensPerSec) : null;

  const hasSpec = model.paramsB != null && model.numLayers != null && model.numKvHeads != null && model.headDim != null;
  const vramGB = hasSpec ? calcVramGB(model.paramsB!, quant) : null;
  const kvCacheGB = hasSpec && match
    ? calcKvCacheGB(model.numLayers!, model.numKvHeads!, model.headDim!, match.concurrency ?? 0, (match.input_tokens ?? 0) + (match.output_tokens ?? 0))
    : null;

  return (
    <tr className="align-top" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <td className="px-4 py-3">
        <div className="font-semibold text-white/90 text-sm leading-tight">{model.name}</div>
        <div className="text-[11px] text-white/30 font-mono">{model.hfId}</div>
      </td>

      <td className="px-3 py-3 w-24">
        <input
          type="number" min={1} value={ttftMs}
          onChange={e => onConfigChange({ ttftMs: Number(e.target.value) || 0 })}
          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40" style={inputStyle}
        />
        <div className="text-[10px] text-white/25 mt-0.5">ms max TTFT</div>
      </td>

      <td className="px-3 py-3 w-24">
        <input
          type="number" min={1} value={tokensPerSec}
          onChange={e => onConfigChange({ tokensPerSec: Number(e.target.value) || 0 })}
          className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40" style={inputStyle}
        />
        <div className="text-[10px] text-white/25 mt-0.5">tok/s/user min</div>
      </td>

      <td className="px-3 py-3 w-64">
        {records === null && !error && <span className="text-xs text-white/30">Loading benchmark data…</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
        {records !== null && !error && configs.length === 0 && (
          <span className="text-xs text-white/30">No benchmark data uploaded for this model yet.</span>
        )}
        {configs.length > 0 && (
          <select
            value={activeConfig ? `${activeConfig.platform} ${activeConfig.tp} ${activeConfig.num_deployments}` : ""}
            onChange={e => onConfigChange({ configKey: e.target.value })}
            className="w-full py-1.5 px-2 text-xs rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            style={inputStyle}
          >
            {configs.map(c => {
              const key = `${c.platform} ${c.tp} ${c.num_deployments}`;
              return <option key={key} value={key}>{resourceLabel(c)}</option>;
            })}
          </select>
        )}
      </td>

      <td className="px-3 py-3 w-28">
        {configs.length > 0 ? (
          match
            ? <span className="font-mono text-sm font-semibold text-[#22d3ee]">{match.concurrency}</span>
            : <span className="text-xs text-white/30">No config meets this SLA</span>
        ) : <span className="text-xs text-white/20">—</span>}
      </td>

      <td className="px-3 py-3 w-28">
        {!hasSpec
          ? <span className="text-xs text-white/25">Spec unavailable</span>
          : kvCacheGB != null
            ? <span className="font-mono text-sm text-white/80">{fmtGB(kvCacheGB)} GB</span>
            : <span className="text-xs text-white/20">—</span>}
      </td>

      <td className="px-3 py-3 w-40">
        {!hasSpec ? (
          <span className="text-xs text-white/25">Spec unavailable</span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-white/80">{fmtGB(vramGB!)} GB</span>
            <select
              value={quant} onChange={e => onConfigChange({ quant: e.target.value })}
              className="py-1 px-1.5 text-[10px] rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40" style={inputStyle}
            >
              {model.quantization.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
        )}
      </td>

      <td className="px-3 py-3 w-28">
        {hasSpec && vramGB != null && kvCacheGB != null
          ? <span className="font-mono text-sm font-semibold text-white/90">{fmtGB(vramGB + kvCacheGB)} GB</span>
          : <span className="text-xs text-white/20">—</span>}
      </td>

      <td className="px-3 py-3 text-right">
        <button
          onClick={onRemove}
          className="text-white/30 hover:text-danger transition-colors text-xs"
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

// ── main view ────────────────────────────────────────────────────────────────

export function ProductionSizingView({
  selectedModels, modelSizing, onSizingChange, onRemove, onBackToCatalog,
}: {
  selectedModels: Model[];
  modelSizing: Record<string, ModelSizingConfig>;
  onSizingChange: (hfId: string, patch: Partial<ModelSizingConfig>) => void;
  onRemove: (hfId: string) => void;
  onBackToCatalog: () => void;
}) {
  if (selectedModels.length === 0) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 pb-12">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm mb-3">No models selected yet.</p>
          <button
            onClick={onBackToCatalog}
            className="text-sm font-semibold text-[#22d3ee] hover:underline"
          >
            Go to Catalog and turn on &ldquo;Select for deployment sizing&rdquo;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl px-6 pb-12">
      <p className="mb-4 text-sm text-white/40">
        Set an SLA and pick a benchmarked hardware config per model to size it for production.
      </p>
      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)", borderBottom: "1px solid var(--dm-border-a)" }}>
                <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Model</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">SLA: TTFT</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">SLA: Tok/s/user</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Resource config</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Concurrency</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">KV Cache</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">VRAM to load</th>
                <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Total VRAM</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {selectedModels.map(model => (
                <SizingRow
                  key={model.hfId}
                  model={model}
                  config={modelSizing[model.hfId] ?? defaultConfigFor(model)}
                  onConfigChange={patch => onSizingChange(model.hfId, patch)}
                  onRemove={() => onRemove(model.hfId)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-white/25 leading-relaxed">
        Concurrency is read directly from uploaded benchmark records — it is the highest measured
        concurrency for the chosen hardware config where both TTFT and tokens/sec/user meet your
        SLA. &ldquo;≈N accelerators&rdquo; on a resource config is <code className="text-white/35">tp × num_deployments</code> from
        the benchmark record, used as a proxy for card count since the benchmarks schema has no
        dedicated field for it. KV cache assumes FP16 cache regardless of weight quantization.
      </p>
    </div>
  );
}
