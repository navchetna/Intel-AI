"use client";

import { useEffect, useState } from "react";
import { models as modelCatalog } from "./data";
import type { TaskModelDefault } from "./data";
import { fetchModelDefaults, createModelDefault, updateModelDefault, deleteModelDefault } from "./model-defaults-api";
import { SILICON_OPTIONS } from "@/modules/workflows/task-sizing-calcs";

/** Tools that show up as sensible defaults but aren't transformer models in the Model
 *  Catalog (no VRAM-sizing spec fields to speak of) — kept as a small separate list
 *  rather than forced into the catalog. */
const NON_CATALOG_MODEL_OPTIONS = ["Presidio"];

const CATALOG_MODEL_NAMES = modelCatalog.map(m => m.name);

const inputStyle: React.CSSProperties = {
  background: "var(--dm-input-bg)",
  border: "1px solid var(--dm-input-border)",
  color: "var(--dm-input-color)",
};

interface DefaultPatch {
  task_type?: string; model_name?: string;
  latency_sec?: number; silicon?: string; default_concurrency?: number;
}

function ModelDefaultRow({ row, onChange, onDelete }: {
  row: TaskModelDefault;
  onChange: (patch: DefaultPatch) => void;
  onDelete: () => void;
}) {
  const [taskType, setTaskType] = useState(row.task_type);
  const [latencySec, setLatencySec] = useState(row.latency_sec != null ? String(row.latency_sec) : "");
  const [concurrency, setConcurrency] = useState(row.default_concurrency != null ? String(row.default_concurrency) : "");

  useEffect(() => { setTaskType(row.task_type); }, [row.task_type]);
  useEffect(() => { setLatencySec(row.latency_sec != null ? String(row.latency_sec) : ""); }, [row.latency_sec]);
  useEffect(() => { setConcurrency(row.default_concurrency != null ? String(row.default_concurrency) : ""); }, [row.default_concurrency]);

  const options = CATALOG_MODEL_NAMES.includes(row.model_name) || NON_CATALOG_MODEL_OPTIONS.includes(row.model_name)
    ? [...CATALOG_MODEL_NAMES, ...NON_CATALOG_MODEL_OPTIONS]
    : [row.model_name, ...CATALOG_MODEL_NAMES, ...NON_CATALOG_MODEL_OPTIONS];

  const siliconOptions = row.silicon && !SILICON_OPTIONS.includes(row.silicon as typeof SILICON_OPTIONS[number])
    ? [row.silicon, ...SILICON_OPTIONS]
    : SILICON_OPTIONS;

  return (
    <tr style={{ borderTop: "1px solid var(--dm-border-a)" }}>
      <td className="px-3 py-2">
        <input
          value={taskType}
          onChange={e => setTaskType(e.target.value)}
          onBlur={() => { if (taskType.trim() && taskType !== row.task_type) onChange({ task_type: taskType.trim() }); }}
          placeholder="Task type — e.g. OCR, Reason, Generate"
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={row.model_name}
          onChange={e => onChange({ model_name: e.target.value })}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        >
          {options.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 w-28">
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
      <td className="px-3 py-2 w-40">
        <select
          value={row.silicon ?? ""}
          onChange={e => onChange({ silicon: e.target.value })}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        >
          <option value="" disabled>Select silicon…</option>
          {siliconOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 w-28">
        <input
          type="number" min={0} value={concurrency} placeholder="—"
          onChange={e => setConcurrency(e.target.value)}
          onBlur={() => {
            const n = concurrency === "" ? null : Number(concurrency);
            if (n != null && !Number.isNaN(n) && n !== row.default_concurrency) onChange({ default_concurrency: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none"
          style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <button
          type="button" onClick={onDelete} aria-label={`Remove ${row.task_type} default`}
          className="w-7 h-7 rounded-md flex items-center justify-center text-base transition-colors hover:text-danger"
          style={{ color: "var(--dm-txt-faint)" }}
        >
          ×
        </button>
      </td>
    </tr>
  );
}

/** Global (app-wide) task-type → default-model mapping. Manually curated today — a
 *  placeholder for a future LLM-based recommendation, which a Presales architect will
 *  always be able to override right here. */
export function ModelDefaultsView() {
  const [rows, setRows] = useState<TaskModelDefault[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModelDefaults()
      .then(data => { if (!cancelled) setRows(data); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  async function handleChange(row: TaskModelDefault, patch: DefaultPatch) {
    try {
      const saved = await updateModelDefault(row.id, patch);
      setRows(prev => (prev ?? []).map(r => (r.id === row.id ? saved : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleAdd() {
    try {
      const created = await createModelDefault("New task type", CATALOG_MODEL_NAMES[0] ?? "");
      setRows(prev => [...(prev ?? []), created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(row: TaskModelDefault) {
    try {
      await deleteModelDefault(row.id);
      setRows(prev => (prev ?? []).filter(r => r.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <p className="text-[13px] text-white/40 max-w-2xl leading-relaxed">
          The default model, latency SLA, silicon, and concurrency chosen for each type of task — manually set for
          now, but this is the same slot a future LLM-based recommendation will populate, with a Presales architect
          always able to override it here.
        </p>
        <button
          type="button" onClick={handleAdd}
          className="flex-shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          style={{ background: "#0891b2" }}
        >
          + Add task type
        </button>
      </div>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      {rows === null ? (
        <p className="text-sm" style={{ color: "var(--dm-txt-faint)" }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-white/40 text-sm mb-3">No task-type defaults yet.</p>
          <button type="button" onClick={handleAdd} className="text-sm font-semibold text-[#22d3ee] hover:underline">
            Add your first task type
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--dm-table-head)" }}>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider w-56" style={{ color: "var(--dm-txt-muted)" }}>Task type</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Default model</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Latency (s)</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Silicon</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Concurrency</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <ModelDefaultRow
                  key={row.id} row={row}
                  onChange={patch => handleChange(row, patch)}
                  onDelete={() => handleDelete(row)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
