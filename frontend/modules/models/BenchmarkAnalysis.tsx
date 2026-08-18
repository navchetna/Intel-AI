"use client";

import { useEffect, useMemo, useState } from "react";
import type { BenchmarkRecord } from "@/modules/inference/benchmarks/types";
import type { JoinedRow } from "./ModelBenchmarksView";

/**
 * Reference list prices (USD) used only for the cross-platform cost/value
 * comparison. Sourced from the Silicon → Compute catalog (Arc Pro B70 list
 * price and the documented 4-card bundle price). Xeon6 is deliberately
 * omitted: the Xeon 6 catalog spans many SKUs ($500s–$10,000s) with no single
 * reference price, so cost-ranking is skipped for it rather than guessed.
 */
const PLATFORM_COST_USD: Partial<Record<string, number>> = {
  B70x1: 949,
  B70x2: 1898,
  B70x4: 3800,
};

interface ConcurrencyPoint {
  concurrency: number;
  ttftMs: number;
  tokPerUser: number;
  outputThroughput: number;
}

interface Series {
  key: string;
  modelName: string;
  platform: string;
  profileLabel: string;
  color: string;
  points: ConcurrencyPoint[];
}

const PALETTE = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24", "#f472b6", "#fb923c", "#22d3ee", "#f87171"];

function fmt(n: number, digits = 1): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function seriesLabel(s: { modelName: string; platform: string; profileLabel: string }, showProfile: boolean): string {
  return showProfile ? `${s.modelName} · ${s.platform} · ${s.profileLabel}` : `${s.modelName} · ${s.platform}`;
}

// ── Mini dependency-free SVG line chart, theme-aware ───────────────────────────

function MiniLineChart({ series, yLabel, yFmt, showProfile }: {
  series: Series[]; yLabel: string; yFmt: (n: number) => string; showProfile: boolean;
}) {
  const W = 720, H = 260;
  const M = { top: 12, right: 16, bottom: 34, left: 56 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const allX = Array.from(new Set(series.flatMap(s => s.points.map(p => p.concurrency)))).sort((a, b) => a - b);
  const hasData = allX.length > 0 && series.some(s => s.points.length > 0);

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-surface-a)" }}>
      {!hasData ? (
        <div className="flex h-[200px] items-center justify-center text-sm" style={{ color: "var(--dm-txt-faint)" }}>
          No matching data for the selected models &amp; token profile(s).
        </div>
      ) : (
        <ChartBody W={W} H={H} M={M} plotW={plotW} plotH={plotH} series={series} allX={allX} yFmt={yFmt} />
      )}
      <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: "var(--dm-txt-faintest)" }}>{yLabel} vs concurrency</p>
      {hasData && (
        <div className="mt-3 flex flex-wrap gap-3">
          {series.map(s => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
              <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />
              {seriesLabel(s, showProfile)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartBody({ W, H, M, plotW, plotH, series, allX, yFmt }: {
  W: number; H: number; M: { top: number; right: number; bottom: number; left: number };
  plotW: number; plotH: number; series: Series[]; allX: number[];
  yFmt: (n: number) => string;
}) {
  const yValues = series.flatMap(s => s.points.map(p => p.ttftMs));
  const yMax = Math.max(...yValues, 1) * 1.1;
  const xPos = (x: number) => allX.length <= 1 ? M.left + plotW / 2 : M.left + (allX.indexOf(x) / (allX.length - 1)) * plotW;
  const yPos = (y: number) => M.top + plotH - (y / yMax) * plotH;
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const val = (yMax / yTicks) * i;
        const y = yPos(val);
        return (
          <g key={i}>
            <line x1={M.left} y1={y} x2={W - M.right} y2={y} stroke="var(--dm-border-a)" />
            <text x={M.left - 8} y={y + 4} textAnchor="end" style={{ fill: "var(--dm-txt-faintest)", fontSize: 10 }}>{yFmt(val)}</text>
          </g>
        );
      })}
      {allX.map(x => (
        <text key={x} x={xPos(x)} y={H - M.bottom + 18} textAnchor="middle" style={{ fill: "var(--dm-txt-faintest)", fontSize: 10 }}>{x}</text>
      ))}
      <text x={M.left + plotW / 2} y={H - 6} textAnchor="middle" style={{ fill: "var(--dm-txt-faint)", fontSize: 11 }}>Concurrency</text>
      {series.map(s => {
        const pts = [...s.points].sort((a, b) => a.concurrency - b.concurrency);
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.concurrency)} ${yPos(p.ttftMs)}`).join(" ");
        return (
          <g key={s.key}>
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
            {pts.map(p => <circle key={p.concurrency} cx={xPos(p.concurrency)} cy={yPos(p.ttftMs)} r={3} fill={s.color} />)}
          </g>
        );
      })}
    </svg>
  );
}

// Second chart (tok/s/user) needs its own y-accessor — build a thin wrapper reusing the same primitives.
function MiniLineChartTokPerUser({ series, showProfile }: { series: Series[]; showProfile: boolean }) {
  const remapped: Series[] = series.map(s => ({ ...s, points: s.points.map(p => ({ ...p, ttftMs: p.tokPerUser })) }));
  return <MiniLineChart series={remapped} yLabel="Tokens / sec / user" yFmt={n => n.toFixed(0)} showProfile={showProfile} />;
}

// ── Section 3: best achievable concurrency under TTFT + tok/s/user thresholds ──

interface BestConcResult {
  key: string; modelName: string; platform: string; profileLabel: string;
  best: ConcurrencyPoint | null;
}

function bestConcurrency(points: ConcurrencyPoint[], ttftMaxMs: number, tokPerUserMin: number): ConcurrencyPoint | null {
  const passing = points.filter(p => p.ttftMs <= ttftMaxMs && p.tokPerUser >= tokPerUserMin);
  if (passing.length === 0) return null;
  return passing.reduce((best, p) => (p.concurrency > best.concurrency ? p : best));
}

// ── Main panel ──────────────────────────────────────────────────────────────

export function BenchmarkAnalysis({ allRows, ttftThreshold, tokPerUserThreshold, onClose }: {
  allRows: JoinedRow[]; ttftThreshold: number; tokPerUserThreshold: number; onClose: () => void;
}) {
  const modelsByCategory = useMemo(() => {
    const byId = new Map<string, JoinedRow["model"]>();
    allRows.forEach(r => { if (!byId.has(r.model.hfId)) byId.set(r.model.hfId, r.model); });
    const grouped = new Map<string, JoinedRow["model"][]>();
    Array.from(byId.values()).forEach(m => {
      if (!grouped.has(m.category)) grouped.set(m.category, []);
      grouped.get(m.category)!.push(m);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, ms]) => ({ category, models: ms.sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [allRows]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());

  function toggle(hfId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(hfId)) next.delete(hfId); else next.add(hfId);
      return next;
    });
  }

  function toggleCategory(models: JoinedRow["model"][]) {
    const allOn = models.every(m => selected.has(m.hfId));
    setSelected(prev => {
      const next = new Set(prev);
      models.forEach(m => (allOn ? next.delete(m.hfId) : next.add(m.hfId)));
      return next;
    });
  }

  const selectedRows = useMemo(() => allRows.filter(r => selected.has(r.model.hfId)), [allRows, selected]);

  const availableProfiles = useMemo(() => {
    const set = new Set<string>();
    const list: { input: number; output: number }[] = [];
    selectedRows.forEach(r => {
      const { input_tokens, output_tokens } = r.record;
      if (input_tokens === null || output_tokens === null) return;
      const key = `${input_tokens}x${output_tokens}`;
      if (!set.has(key)) { set.add(key); list.push({ input: input_tokens, output: output_tokens }); }
    });
    return list.sort((a, b) => a.input - b.input || a.output - b.output);
  }, [selectedRows]);

  // Default to every available profile selected; re-derive when the available set changes.
  useEffect(() => {
    const availableKeys = new Set(availableProfiles.map(p => `${p.input}x${p.output}`));
    const stillValid = Array.from(selectedProfiles).some(k => availableKeys.has(k));
    if (!stillValid) setSelectedProfiles(availableKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableProfiles]);

  function toggleProfile(key: string) {
    setSelectedProfiles(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const showProfileInLabels = selectedProfiles.size > 1;

  const seriesList: Series[] = useMemo(() => {
    if (selectedProfiles.size === 0) return [];
    const filtered = selectedRows.filter(r => {
      const { input_tokens, output_tokens } = r.record;
      if (input_tokens === null || output_tokens === null) return false;
      return selectedProfiles.has(`${input_tokens}x${output_tokens}`);
    });
    const byKey = new Map<string, Series>();
    let colorIdx = 0;
    filtered.forEach(r => {
      const rec: BenchmarkRecord = r.record;
      if (rec.concurrency === null || rec.mean_ttft_ms === null) return;
      const profileLabel = `${rec.input_tokens}/${rec.output_tokens}`;
      const key = `${r.model.hfId}::${rec.platform}::${profileLabel}`;
      if (!byKey.has(key)) {
        byKey.set(key, { key, modelName: r.model.name, platform: rec.platform, profileLabel, color: PALETTE[colorIdx++ % PALETTE.length], points: [] });
      }
      byKey.get(key)!.points.push({
        concurrency: rec.concurrency,
        ttftMs: rec.mean_ttft_ms,
        tokPerUser: rec.interactivity_tokens_per_sec_per_user ?? 0,
        outputThroughput: rec.output_token_throughput ?? 0,
      });
    });
    return Array.from(byKey.values());
  }, [selectedRows, selectedProfiles]);

  const stability = useMemo(() => {
    return seriesList.map(s => {
      const vals = s.points.map(p => p.tokPerUser);
      const min = Math.min(...vals), max = Math.max(...vals);
      const dropPct = max > 0 ? ((max - min) / max) * 100 : 0;
      const verdict = dropPct <= 15 ? "Stable" : dropPct <= 35 ? "Moderate degradation" : "Degrades sharply";
      return { key: s.key, label: seriesLabel(s, showProfileInLabels), min, max, dropPct, verdict };
    });
  }, [seriesList, showProfileInLabels]);

  const bestConcResults: BestConcResult[] = useMemo(() => {
    return seriesList.map(s => ({
      key: s.key, modelName: s.modelName, platform: s.platform, profileLabel: s.profileLabel,
      best: bestConcurrency(s.points, ttftThreshold, tokPerUserThreshold),
    }));
  }, [seriesList, ttftThreshold, tokPerUserThreshold]);

  const crossPlatform = useMemo(() => {
    const byGroup = new Map<string, { modelName: string; profileLabel: string; rows: BestConcResult[] }>();
    bestConcResults.forEach(r => {
      const gKey = `${r.modelName}::${r.profileLabel}`;
      if (!byGroup.has(gKey)) byGroup.set(gKey, { modelName: r.modelName, profileLabel: r.profileLabel, rows: [] });
      byGroup.get(gKey)!.rows.push(r);
    });
    return Array.from(byGroup.values())
      .filter(g => new Set(g.rows.map(r => r.platform)).size > 1)
      .map(({ modelName, profileLabel, rows }) => {
        const withCost = rows.map(r => {
          const cost = PLATFORM_COST_USD[r.platform];
          const throughput = r.best?.outputThroughput ?? null;
          const costPerThroughput = cost && throughput ? cost / throughput : null;
          return { ...r, cost: cost ?? null, throughput, costPerThroughput };
        });
        const ranked = withCost.filter(r => r.costPerThroughput !== null).sort((a, b) => a.costPerThroughput! - b.costPerThroughput!);
        const bestKey = ranked.length > 0 ? ranked[0].key : null;
        return { modelName, profileLabel, rows: withCost, bestKey };
      });
  }, [bestConcResults]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex flex-col w-full max-w-[1400px] rounded-2xl overflow-hidden"
        style={{ background: "var(--dm-card-bg)", border: "1px solid rgba(56,189,248,0.18)", boxShadow: "0 40px 80px rgba(0,0,0,0.7)", maxHeight: "94vh" }}>

        <div className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "var(--dm-border-b)", background: "rgba(56,189,248,0.04)" }}>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold" style={{ color: "var(--dm-txt-primary)" }}>Benchmark Analysis</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--dm-txt-faint)" }}>
              Select one or more models to compare concurrency behaviour, SLA-achievable concurrency, and cross-platform value.
              SLA thresholds (TTFT ≤ {ttftThreshold} ms, ≥ {tokPerUserThreshold} tok/s/user) come from the filter bar on the Benchmarks page.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xl leading-none transition-colors"
            style={{ color: "var(--dm-txt-faint)" }}>×</button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0" style={{ height: "calc(94vh - 89px)" }}>
          {/* Left: model picker + controls */}
          <div className="lg:w-[300px] flex-shrink-0 overflow-y-auto px-5 py-5 border-r" style={{ borderColor: "var(--dm-border-a)" }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>
              Models ({selected.size} selected)
            </p>
            <div className="space-y-1.5 mb-5">
              {modelsByCategory.map(({ category, models: ms }) => (
                <div key={category}>
                  <button type="button" onClick={() => toggleCategory(ms)}
                    className="w-full text-left px-1 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest hover:opacity-80"
                    style={{ color: "#38bdf8" }}>
                    {category}
                  </button>
                  <div className="mt-0.5">
                    {ms.map(m => (
                      <label key={m.hfId} className="flex items-center gap-2 pl-3 pr-2 py-0.5 rounded-lg cursor-pointer text-xs leading-tight"
                        style={{ background: selected.has(m.hfId) ? "rgba(56,189,248,0.10)" : "transparent" }}>
                        <input type="checkbox" checked={selected.has(m.hfId)} onChange={() => toggle(m.hfId)} />
                        <span style={{ color: "var(--dm-txt-secondary)" }}>{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {availableProfiles.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--dm-txt-faint)" }}>
                  Token profile ({selectedProfiles.size} selected)
                </p>
                <div className="space-y-0.5 mb-2">
                  {availableProfiles.map(p => {
                    const key = `${p.input}x${p.output}`;
                    return (
                      <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs"
                        style={{ background: selectedProfiles.has(key) ? "rgba(56,189,248,0.10)" : "transparent" }}>
                        <input type="checkbox" checked={selectedProfiles.has(key)} onChange={() => toggleProfile(key)} />
                        <span style={{ color: "var(--dm-txt-secondary)" }}>{p.input} in / {p.output} out</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right: analysis sections */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {selected.size === 0 ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--dm-txt-faint)" }}>
                Select one or more models on the left to begin.
              </div>
            ) : seriesList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--dm-txt-faint)" }}>
                No benchmark rows for the selected model(s) / token profile(s).
              </div>
            ) : (
              <>
                <section className="mb-8">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>1 · TTFT vs. concurrency</h3>
                  <p className="text-xs mb-3" style={{ color: "var(--dm-txt-faint)" }}>How much does time-to-first-token grow as concurrent requests increase?</p>
                  <MiniLineChart series={seriesList} yLabel="Mean TTFT (ms)" yFmt={n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0)} showProfile={showProfileInLabels} />
                </section>

                <section className="mb-8">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>2 · Tokens/sec/user stability vs. concurrency</h3>
                  <p className="text-xs mb-3" style={{ color: "var(--dm-txt-faint)" }}>Does per-user generation speed hold up as more requests share the server?</p>
                  <MiniLineChartTokPerUser series={seriesList} showProfile={showProfileInLabels} />
                  <div className="mt-3 rounded-lg border overflow-hidden" style={{ borderColor: "var(--dm-border-a)" }}>
                    {stability.map((s, i) => (
                      <div key={s.key} className="flex items-center justify-between px-3 py-2 text-xs"
                        style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                        <span style={{ color: "var(--dm-txt-secondary)" }}>{s.label}</span>
                        <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>
                          {fmt(s.min, 1)} → {fmt(s.max, 1)} tok/s/user (−{fmt(s.dropPct, 0)}%)
                        </span>
                        <span className="font-semibold" style={{
                          color: s.verdict === "Stable" ? "#34d399" : s.verdict === "Moderate degradation" ? "#fbbf24" : "#f87171",
                        }}>{s.verdict}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mb-8">
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>
                    3 · Best achievable concurrency (TTFT ≤ {ttftThreshold} ms, ≥ {tokPerUserThreshold} tok/s/user)
                  </h3>
                  <p className="text-xs mb-3" style={{ color: "var(--dm-txt-faint)" }}>The highest tested concurrency that still meets both SLA thresholds.</p>
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--dm-border-a)" }}>
                    <div className="grid grid-cols-6 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: "var(--dm-table-head, #0e1d38)", color: "var(--dm-txt-faint)" }}>
                      <span>Model</span><span>Platform</span><span>Profile</span><span>Best concurrency</span><span>TTFT at that point</span><span>Tok/s/user at that point</span>
                    </div>
                    {bestConcResults.map((r, i) => (
                      <div key={r.key} className="grid grid-cols-6 gap-2 px-3 py-2 text-xs items-center"
                        style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
                        <span style={{ color: "var(--dm-txt-secondary)" }}>{r.modelName}</span>
                        <span style={{ color: "var(--dm-txt-secondary)" }}>{r.platform}</span>
                        <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{r.profileLabel}</span>
                        {r.best ? (
                          <>
                            <span className="font-mono font-semibold" style={{ color: "#38bdf8" }}>{r.best.concurrency}</span>
                            <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{fmt(r.best.ttftMs, 0)} ms</span>
                            <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{fmt(r.best.tokPerUser, 1)}</span>
                          </>
                        ) : (
                          <span className="col-span-3" style={{ color: "#f87171" }}>No tested concurrency meets both thresholds</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--dm-txt-primary)" }}>4 · Cross-platform value (cost-aware)</h3>
                  <p className="text-xs mb-3" style={{ color: "var(--dm-txt-faint)" }}>
                    For models benchmarked on more than one platform at the same token profile: cost ÷ output tok/s at the best SLA-meeting concurrency.
                    Lower is better. Xeon6 has no single reference price across its SKU family, so it is shown without a cost-per-throughput rank.
                  </p>
                  {crossPlatform.length === 0 ? (
                    <div className="rounded-lg border p-4 text-xs" style={{ borderColor: "var(--dm-border-a)", color: "var(--dm-txt-faint)" }}>
                      None of the selected models have benchmark data on more than one platform at the same token profile yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {crossPlatform.map(({ modelName, profileLabel, rows, bestKey }) => (
                        <div key={`${modelName}::${profileLabel}`} className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--dm-border-a)" }}>
                          <div className="px-3 py-2 text-xs font-bold flex items-center justify-between" style={{ background: "var(--dm-table-head, #0e1d38)", color: "var(--dm-txt-primary)" }}>
                            <span>{modelName}</span>
                            <span className="font-mono font-normal" style={{ color: "var(--dm-txt-faint)" }}>{profileLabel}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: "var(--dm-txt-faint)" }}>
                            <span>Platform</span><span>Best concurrency</span><span>Output tok/s</span><span>List cost</span><span>$ / tok/s</span>
                          </div>
                          {rows.map(r => (
                            <div key={r.key} className="grid grid-cols-5 gap-2 px-3 py-2 text-xs items-center"
                              style={{ background: r.key === bestKey ? "rgba(52,211,153,0.10)" : "transparent" }}>
                              <span style={{ color: "var(--dm-txt-secondary)" }}>
                                {r.platform} {r.key === bestKey && <span className="ml-1 text-[10px] font-bold" style={{ color: "#34d399" }}>BEST VALUE</span>}
                              </span>
                              <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{r.best?.concurrency ?? "—"}</span>
                              <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{r.throughput ? fmt(r.throughput, 1) : "—"}</span>
                              <span className="font-mono" style={{ color: "var(--dm-txt-faint)" }}>{r.cost ? `$${r.cost.toLocaleString()}` : "no ref. price"}</span>
                              <span className="font-mono font-semibold" style={{ color: r.key === bestKey ? "#34d399" : "var(--dm-txt-faint)" }}>
                                {r.costPerThroughput ? `$${fmt(r.costPerThroughput, 2)}` : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
