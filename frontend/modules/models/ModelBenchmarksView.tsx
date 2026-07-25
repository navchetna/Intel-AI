"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecords } from "@/modules/inference/benchmarks/api";
import { SERVING_ENGINES, type BenchmarkRecord } from "@/modules/inference/benchmarks/types";
import { models, type Model } from "./data";

const PLATFORMS = ["Xeon6", "B70"];

const TOKEN_PROFILES = [
  { label: "1k / 1k", input: 1024, output: 1024 },
  { label: "2k / 2k", input: 2048, output: 2048 },
  { label: "4k / 4k", input: 4096, output: 4096 },
  { label: "8k / 8k", input: 8192, output: 8192 },
];

const selectStyle = {
  background: "#0e1d38",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.85)",
  colorScheme: "dark",
} as React.CSSProperties;

function Select({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="py-2 px-3 text-sm rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 min-w-[160px]"
        style={selectStyle}
      >
        {children}
      </select>
    </div>
  );
}

/** Best-effort match of an uploaded benchmark `model` string against a catalog entry. */
function findCatalogModel(rowModel: string): Model | undefined {
  const needle = rowModel.trim().toLowerCase();
  if (!needle) return undefined;
  return models.find(m => {
    const hfId = m.hfId.toLowerCase();
    return hfId === needle || hfId.includes(needle) || needle.includes(hfId);
  });
}

export function ModelBenchmarksView() {
  const [modelFilter, setModelFilter]     = useState("");
  const [engineFilter, setEngineFilter]   = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [profileIdx, setProfileIdx]       = useState("");

  const [records, setRecords] = useState<BenchmarkRecord[] | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRecords(null);
    setError(null);
    const profile = profileIdx === "" ? null : TOKEN_PROFILES[Number(profileIdx)];
    fetchRecords({
      model: modelFilter,
      serving_engine: engineFilter,
      platform: platformFilter,
      input_tokens: profile ? String(profile.input) : "",
      output_tokens: profile ? String(profile.output) : "",
      batch_size: "",
    }, 500)
      .then(res => { if (!cancelled) setRecords(res.rows); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, [modelFilter, engineFilter, platformFilter, profileIdx]);

  const rows = useMemo(() => {
    if (!records) return [];
    return records
      .map(r => ({ record: r, model: findCatalogModel(r.model) }))
      .filter((r): r is { record: BenchmarkRecord; model: Model } => r.model !== undefined);
  }, [records]);

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <div
        className="rounded-2xl border border-white/[0.07] p-5 mb-6"
        style={{ background: "var(--dm-filterbar-bg, #0a1730)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
      >
        <div className="flex flex-wrap gap-3 items-end">
          <Select label="Model" value={modelFilter} onChange={setModelFilter}>
            <option value="">All models</option>
            {models.map(m => <option key={m.hfId} value={m.hfId}>{m.name}</option>)}
          </Select>
          <Select label="Serving Engine" value={engineFilter} onChange={setEngineFilter}>
            <option value="">All engines</option>
            {SERVING_ENGINES.map(e => <option key={e} value={e}>{e}</option>)}
          </Select>
          <Select label="Platform" value={platformFilter} onChange={setPlatformFilter}>
            <option value="">All platforms</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select label="Token profile" value={profileIdx} onChange={setProfileIdx}>
            <option value="">All profiles</option>
            {TOKEN_PROFILES.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
          </Select>
        </div>
      </div>

      <div
        className="rounded-2xl border border-white/[0.07] overflow-hidden"
        style={{ background: "var(--dm-table-bg, #0a1730)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        {records === null && !error && (
          <div className="py-16 text-center text-white/30 text-sm">Loading benchmark data…</div>
        )}
        {error && (
          <div className="py-16 text-center text-danger text-sm">{error}</div>
        )}
        {records !== null && !error && rows.length === 0 && (
          <div className="py-16 text-center text-white/30 text-sm">
            No benchmark data uploaded yet for this filter combination.
          </div>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "var(--dm-table-head, #0e1d38)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <th className="px-4 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Model</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Engine</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Platform</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">In / Out Tokens</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Concurrency</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Mean TTFT (ms)</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Mean TPOT (ms)</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Output Tok/s</th>
                  <th className="px-3 py-3 text-left font-semibold text-white/50 text-xs uppercase tracking-wider">Tok/s/user</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ record: r, model: m }) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white/90 text-sm leading-tight">{m.name}</div>
                      <div className="text-[11px] text-white/30 font-mono">{m.hfId}</div>
                    </td>
                    <td className="px-3 py-3 text-white/70 text-xs">{r.serving_engine ?? "—"}</td>
                    <td className="px-3 py-3 text-white/70 text-xs">{r.platform}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/70">{r.input_tokens ?? "—"} / {r.output_tokens ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/70">{r.concurrency ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/85">{r.mean_ttft_ms?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/85">{r.mean_tpot_ms?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/85">{r.output_token_throughput?.toFixed(1) ?? "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs text-white/85">{r.interactivity_tokens_per_sec_per_user?.toFixed(1) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
