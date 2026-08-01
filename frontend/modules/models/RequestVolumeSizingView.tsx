"use client";

import { useEffect, useMemo, useState } from "react";
import type { Model, TaskModelDefault } from "./data";
import { fetchModelDefaults, updateModelDefault } from "./model-defaults-api";
import {
  computeRequestVolumeRow, systemsCompositionCaption, socketsCaption,
  type ComputedRequestVolumeRow,
} from "@/modules/workflows/task-sizing-calcs";

const inputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

function fmt(n: number, d = 2): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

interface RequestSizingPatch {
  latency_sec?: number;
  requests_per_day?: number;
  processing_window_hrs?: number;
}

function RequestSizingRow({ computed, onChange }: {
  computed: ComputedRequestVolumeRow;
  onChange: (patch: RequestSizingPatch) => void;
}) {
  const { row, requestsPerSec, concurrency, siliconUnits, sockets, systems, b70Cards, criCards, hasAccelerator, unitsBySilicon } = computed;
  const [latencySec, setLatencySec] = useState(row.latency_sec != null ? String(row.latency_sec) : "");
  const [requestsPerDay, setRequestsPerDay] = useState(row.requests_per_day != null ? String(row.requests_per_day) : "");
  const [windowHrs, setWindowHrs] = useState(row.processing_window_hrs != null ? String(row.processing_window_hrs) : "");

  useEffect(() => { setLatencySec(row.latency_sec != null ? String(row.latency_sec) : ""); }, [row.latency_sec]);
  useEffect(() => { setRequestsPerDay(row.requests_per_day != null ? String(row.requests_per_day) : ""); }, [row.requests_per_day]);
  useEffect(() => { setWindowHrs(row.processing_window_hrs != null ? String(row.processing_window_hrs) : ""); }, [row.processing_window_hrs]);

  return (
    <tr style={{ borderTop: "1px solid var(--dm-border-a)" }}>
      <td className="px-3 py-2">
        <div className="text-sm font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{row.model_name}</div>
        <div className="text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>{row.task_type}</div>
      </td>
      <td className="px-3 py-2 w-24">
        <input
          type="number" min={0} value={latencySec} placeholder="—"
          onChange={e => setLatencySec(e.target.value)}
          onBlur={() => {
            const n = latencySec === "" ? null : Number(latencySec);
            if (n != null && !Number.isNaN(n) && n !== row.latency_sec) onChange({ latency_sec: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-36">
        <input
          type="number" min={0} value={requestsPerDay} placeholder="—"
          onChange={e => setRequestsPerDay(e.target.value)}
          onBlur={() => {
            const n = requestsPerDay === "" ? null : Number(requestsPerDay);
            if (n != null && !Number.isNaN(n) && n !== row.requests_per_day) onChange({ requests_per_day: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-28">
        <input
          type="number" min={0} max={24} value={windowHrs} placeholder="—"
          onChange={e => setWindowHrs(e.target.value)}
          onBlur={() => {
            const n = windowHrs === "" ? null : Number(windowHrs);
            if (n != null && !Number.isNaN(n) && n !== row.processing_window_hrs) onChange({ processing_window_hrs: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-28 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>
        {requestsPerSec != null ? fmt(requestsPerSec, 2) : "—"}
      </td>
      <td className="px-3 py-2 w-28 font-mono text-sm font-semibold" style={{ color: concurrency != null ? "#22d3ee" : "var(--dm-txt-faint)" }}>
        {concurrency != null ? fmt(concurrency, 0) : "—"}
      </td>
      <td className="px-3 py-2 w-32">
        {siliconUnits != null ? (
          <>
            <span className="font-mono text-sm font-semibold" style={{ color: "#34d399" }}>{fmt(siliconUnits, 0)}</span>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--dm-txt-faint)" }}>
              {row.silicon ?? "—"} · {row.default_concurrency}/unit
            </div>
          </>
        ) : (
          <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>
            {row.default_concurrency ? "—" : "No unit concurrency in Defaults"}
          </span>
        )}
      </td>
      <td className="px-3 py-2 w-32">
        {systems != null ? (
          <>
            <span className="font-mono text-sm font-semibold" style={{ color: "#a78bfa" }}>{fmt(systems, 0)}</span>
            <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{systemsCompositionCaption(unitsBySilicon)}</div>
          </>
        ) : <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>—</span>}
      </td>
      <td className="px-3 py-2 w-32">
        {sockets != null ? (
          <>
            <span className="font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{fmt(sockets, 0)}</span>
            {hasAccelerator && (
              <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{socketsCaption(unitsBySilicon)}</div>
            )}
          </>
        ) : <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>—</span>}
      </td>
      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{b70Cards > 0 ? fmt(b70Cards, 0) : "—"}</td>
      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{criCards > 0 ? fmt(criCards, 0) : "—"}</td>
    </tr>
  );
}

/** Request-volume based sizing: Latency, Requests/day, and Processing-window are editable per
 *  task type (the same rows as Models > Defaults); Request/sec and Concurrency follow via
 *  Little's Law, and Silicon Units divides that concurrency by the unit-concurrency configured
 *  in Models > Defaults for that task type's silicon, rounded up. Systems/Sockets/B70/CRI use
 *  the same packaging rules as the Agents > Agent-Model-Serving table. */
export function RequestVolumeSizingView({ selectedModels, onBackToCatalog, showBlurb = true }: {
  selectedModels: Model[];
  onBackToCatalog: () => void;
  /** Whether the explanatory paragraph is shown — off on read-only summaries like the Project view. */
  showBlurb?: boolean;
}) {
  const [rows, setRows] = useState<TaskModelDefault[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModelDefaults()
      .then(data => { if (!cancelled) setRows(data); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  const selectedNames = useMemo(() => new Set(selectedModels.map(m => m.name)), [selectedModels]);
  const visibleRows = useMemo(() => (rows ?? []).filter(r => selectedNames.has(r.model_name)), [rows, selectedNames]);
  const computedRows = useMemo(() => visibleRows.map(computeRequestVolumeRow), [visibleRows]);

  const totals = useMemo(() => computedRows.reduce((acc, c) => ({
    siliconUnits: acc.siliconUnits + (c.siliconUnits ?? 0),
    systems: acc.systems + (c.systems ?? 0),
    sockets: acc.sockets + (c.sockets ?? 0),
    b70: acc.b70 + c.b70Cards,
    cri: acc.cri + c.criCards,
  }), { siliconUnits: 0, systems: 0, sockets: 0, b70: 0, cri: 0 }), [computedRows]);

  async function handleChange(row: TaskModelDefault, patch: RequestSizingPatch) {
    try {
      const saved = await updateModelDefault(row.id, patch);
      setRows(prev => (prev ?? []).map(r => (r.id === row.id ? saved : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (selectedModels.length === 0) {
    return (
      <div className="mx-auto max-w-screen-2xl px-6 pb-12">
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm mb-3">No models selected yet.</p>
          <button onClick={onBackToCatalog} className="text-sm font-semibold text-[#22d3ee] hover:underline">
            Go to Catalog and turn on &ldquo;Select for deployment sizing&rdquo;
          </button>
        </div>
      </div>
    );
  }

  const tiles: { label: string; value: string; accent: string }[] = [
    { label: "Models", value: fmt(visibleRows.length, 0), accent: "129,140,248" },
    { label: "Systems", value: fmt(totals.systems, 0), accent: "52,211,153" },
    { label: "Sockets", value: fmt(totals.sockets, 0), accent: "94,234,212" },
    { label: "B70", value: fmt(totals.b70, 0), accent: "251,146,60" },
    { label: "CRI", value: fmt(totals.cri, 0), accent: "248,113,113" },
  ];

  return (
    <section className="mx-auto max-w-screen-2xl px-6 pb-8">
      {showBlurb && (
        <p className="mb-4 text-sm" style={{ color: "var(--dm-txt-muted)" }}>
          Latency, Requests/day, and Processing-window are editable per task type&rsquo;s default model. Request/sec is
          requests/day compressed into the processing window; Concurrency follows via Little&rsquo;s Law (Latency ×
          Request/sec); Silicon Units divides Concurrency by the unit-concurrency configured in Models &gt; Defaults,
          rounded up. Systems, Sockets, B70, and CRI follow the same packaging rules as Agents &gt;
          Agent-Model-Serving (2 CPU sockets per system).
        </p>
      )}

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      {rows === null ? (
        <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>Loading…</p>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-white/40 text-sm">None of the selected models are mapped to a task type in Models &gt; Defaults yet.</p>
        </div>
      ) : (
        <>
          {/* ── summary ── */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-6">
            {tiles.map(t => (
              <div key={t.label} className="rounded-xl p-4" style={{ background: `rgba(${t.accent},0.08)`, border: `1px solid rgba(${t.accent},0.2)` }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--dm-txt-faint)" }}>{t.label}</span>
                <div className="text-2xl font-extrabold mt-0.5" style={{ color: `rgb(${t.accent})` }}>{t.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: "var(--dm-table-head)" }}>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Model</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Latency (s)</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Requests/day</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Process-window (hrs)</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Requests/sec</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Concurrency</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Silicon Units</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Systems</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Sockets</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>B70</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>CRI</th>
                  </tr>
                </thead>
                <tbody>
                  {computedRows.map(c => (
                    <RequestSizingRow key={c.row.id} computed={c} onChange={patch => handleChange(c.row, patch)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
