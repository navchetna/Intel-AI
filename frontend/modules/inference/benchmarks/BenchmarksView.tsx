"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPanel } from "./AdminPanel";
import { fetchCharts, fetchPlatforms, fetchRecords, getToken, getUsername } from "./api";
import { DataTable } from "./DataTable";
import { FiltersPanel } from "./FiltersPanel";
import { colorForIndex, LineChart, type ChartSeries } from "./LineChart";
import {
  DEFAULT_HARDWARE,
  EMPTY_FILTERS,
  type BenchmarkFilters,
  type BenchmarkRecord,
  type ChartsResponse,
} from "./types";

type Tab = "online" | "offline";

export function BenchmarksView() {
  const [tab, setTab] = useState<Tab>("online");
  const [adminOpen, setAdminOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const refreshAuth = useCallback(() => {
    setAuthed(Boolean(getToken()));
    setUsername(getUsername());
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">inference</p>
          <h1 className="mt-2 text-3xl font-bold text-intel-dark sm:text-4xl">Benchmarks</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Explore online and offline inference benchmark results across models and hardware.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="rounded-md border border-intel-blue/30 bg-white px-4 py-2 text-sm font-semibold text-intel-blue transition-colors hover:bg-intel-haze"
        >
          {authed ? "Admin Panel" : "Admin"}
        </button>
      </header>

      {/* Online / Offline tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        {(["online", "offline"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-intel-blue text-intel-blue"
                : "border-transparent text-gray-500 hover:text-intel-blue"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "online" ? <OnlineView /> : <OfflineView />}

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        authed={authed}
        username={username}
        onAuthChange={refreshAuth}
        onDataChanged={() => window.dispatchEvent(new Event("ib:data-changed"))}
      />
    </main>
  );
}

function OnlineView() {
  const [filters, setFilters] = useState<BenchmarkFilters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<BenchmarkRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [charts, setCharts] = useState<ChartsResponse>({ ttft_vs_batch: [], itl_vs_batch: [] });
  const [hardware, setHardware] = useState<string[]>(DEFAULT_HARDWARE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the hardware dropdown options once.
  useEffect(() => {
    fetchPlatforms()
      .then((platforms) => {
        const merged = Array.from(new Set([...DEFAULT_HARDWARE, ...platforms])).sort();
        setHardware(merged);
      })
      .catch(() => setHardware(DEFAULT_HARDWARE));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsRes, chartsRes] = await Promise.all([
        fetchRecords(filters),
        fetchCharts(filters),
      ]);
      setRows(recordsRes.rows);
      setTotal(recordsRes.total);
      setCharts(chartsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load benchmark data");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounced reload on filter change.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Reload when an upload reports new data.
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("ib:data-changed", handler);
    return () => window.removeEventListener("ib:data-changed", handler);
  }, [load]);

  const ttftSeries: ChartSeries[] = charts.ttft_vs_batch.map((s, i) => ({
    label: `${s.input_tokens} input tokens`,
    color: colorForIndex(i),
    points: s.points.map((p) => ({ x: p.batch_size, y: p.value })),
  }));

  const itlSeries: ChartSeries[] = [
    {
      label: "Mean ITL",
      color: colorForIndex(0),
      points: charts.itl_vs_batch.map((p) => ({ x: p.batch_size, y: p.value })),
    },
  ];

  return (
    <div className="mt-6 flex flex-col gap-6 md:flex-row">
      <FiltersPanel
        value={filters}
        onChange={setFilters}
        onReset={() => setFilters(EMPTY_FILTERS)}
        hardwareOptions={hardware}
      />

      <div className="min-w-0 flex-1">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        {loading && <p className="mb-2 text-sm text-gray-400">Loading…</p>}

        <div className="grid gap-6 lg:grid-cols-2">
          <LineChart
            title="TTFT vs Batch Size (grouped by input tokens)"
            series={ttftSeries}
            xLabel="Batch Size"
            yLabel="Mean TTFT (ms)"
          />
          <LineChart
            title="Inter-Token Latency vs Batch Size"
            series={itlSeries}
            xLabel="Batch Size"
            yLabel="Mean ITL (ms)"
          />
        </div>

        <DataTable rows={rows} total={total} />
      </div>
    </div>
  );
}

function OfflineView() {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-intel-haze/30 p-10 text-center">
      <h2 className="text-lg font-semibold text-intel-dark">Offline Benchmarks</h2>
      <p className="mt-2 text-sm text-gray-500">This section is coming soon.</p>
    </div>
  );
}
