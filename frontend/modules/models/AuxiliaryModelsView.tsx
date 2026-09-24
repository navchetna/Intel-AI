"use client";

import { useEffect, useMemo, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { AgenticLandingView } from "@/modules/agentic-ai/AgenticLandingView";
import { models as modelCatalog, CATEGORY_COLORS, type Model, type Category, type TaskModelDefault } from "./data";
import { fetchModelDefaults, createModelDefault, updateModelDefault } from "./model-defaults-api";
import { computeRequestVolumeRow, systemsCompositionCaption, socketsCaption } from "@/modules/workflows/task-sizing-calcs";

/** The two categories this page covers — everything an agent calls out to that isn't its own
 *  primary task model (see the Agents page's Models tab for that). */
const AUX_CATEGORIES: Category[] = ["Embeddings & Retrieval", "Safety & Guardrails"];

/** Task type a freshly-selected model is seeded with the first time its sizing is configured —
 *  just a starting point; editable afterwards on this page or on the Agents page's
 *  Task-Type-Model-Mapping tab. */
const SEED_TASK_TYPE: Record<string, string> = {
  "Embeddings & Retrieval": "Embedding",
  "Safety & Guardrails": "Guardrail",
};

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

function CategoryBadge({ category }: { category: Category }) {
  const accent = CATEGORY_COLORS[category].accent;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
    >
      {category}
    </span>
  );
}

/** The sizing half of a selected model's row — editable once a TaskModelDefault row exists;
 *  otherwise a prompt to create one. Mirrors RequestVolumeSizingView's RequestSizingRow. */
function SizingCells({ defaultRow, onCreate, onChange }: {
  defaultRow: TaskModelDefault | undefined;
  onCreate: () => void;
  onChange: (patch: RequestSizingPatch) => void;
}) {
  // Hooks must run every render regardless of whether defaultRow exists yet (it can appear
  // later, once "+ Configure sizing" is clicked) — so they're declared before the early return,
  // not after it.
  const [latencySec, setLatencySec] = useState(defaultRow?.latency_sec != null ? String(defaultRow.latency_sec) : "");
  const [requestsPerDay, setRequestsPerDay] = useState(defaultRow?.requests_per_day != null ? String(defaultRow.requests_per_day) : "");
  const [windowHrs, setWindowHrs] = useState(defaultRow?.processing_window_hrs != null ? String(defaultRow.processing_window_hrs) : "");

  useEffect(() => { setLatencySec(defaultRow?.latency_sec != null ? String(defaultRow.latency_sec) : ""); }, [defaultRow?.latency_sec]);
  useEffect(() => { setRequestsPerDay(defaultRow?.requests_per_day != null ? String(defaultRow.requests_per_day) : ""); }, [defaultRow?.requests_per_day]);
  useEffect(() => { setWindowHrs(defaultRow?.processing_window_hrs != null ? String(defaultRow.processing_window_hrs) : ""); }, [defaultRow?.processing_window_hrs]);

  if (!defaultRow) {
    return (
      <td colSpan={9} className="px-3 py-2.5">
        <button
          type="button" onClick={onCreate}
          className="text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
          style={{ color: "#22d3ee", background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}
        >
          + Configure sizing
        </button>
      </td>
    );
  }

  const computed = computeRequestVolumeRow(defaultRow);
  const { requestsPerSec, concurrency, siliconUnits, sockets, systems, b70Cards, criCards, hasAccelerator, unitsBySilicon } = computed;
  const row = defaultRow;

  return (
    <>
      <td className="px-3 py-2 w-24">
        <input
          type="number" min={0} value={latencySec} placeholder="—"
          onChange={e => setLatencySec(e.target.value)}
          onBlur={() => {
            const n = latencySec === "" ? null : Number(latencySec);
            if (n != null && !Number.isNaN(n) && n !== row.latency_sec) onChange({ latency_sec: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none" style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-32">
        <input
          type="number" min={0} value={requestsPerDay} placeholder="—"
          onChange={e => setRequestsPerDay(e.target.value)}
          onBlur={() => {
            const n = requestsPerDay === "" ? null : Number(requestsPerDay);
            if (n != null && !Number.isNaN(n) && n !== row.requests_per_day) onChange({ requests_per_day: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none" style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-24">
        <input
          type="number" min={0} max={24} value={windowHrs} placeholder="—"
          onChange={e => setWindowHrs(e.target.value)}
          onBlur={() => {
            const n = windowHrs === "" ? null : Number(windowHrs);
            if (n != null && !Number.isNaN(n) && n !== row.processing_window_hrs) onChange({ processing_window_hrs: n });
          }}
          className="w-full rounded-lg px-2.5 py-1.5 text-sm focus:outline-none" style={inputStyle}
        />
      </td>
      <td className="px-3 py-2 w-24 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>
        {requestsPerSec != null ? fmt(requestsPerSec, 2) : "—"}
      </td>
      <td className="px-3 py-2 w-24 font-mono text-sm font-semibold" style={{ color: concurrency != null ? "#22d3ee" : "var(--dm-txt-faint)" }}>
        {concurrency != null ? fmt(concurrency, 0) : "—"}
      </td>
      <td className="px-3 py-2 w-28">
        {siliconUnits != null ? (
          <>
            <span className="font-mono text-sm font-semibold" style={{ color: "#34d399" }}>{fmt(siliconUnits, 0)}</span>
            <div className="text-[10px] mt-0.5" style={{ color: "var(--dm-txt-faint)" }}>{row.silicon ?? "—"} · {row.default_concurrency}/unit</div>
          </>
        ) : <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>{row.default_concurrency ? "—" : "No unit concurrency in Defaults"}</span>}
      </td>
      <td className="px-3 py-2 w-28">
        {systems != null ? (
          <>
            <span className="font-mono text-sm font-semibold" style={{ color: "#a78bfa" }}>{fmt(systems, 0)}</span>
            <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{systemsCompositionCaption(unitsBySilicon)}</div>
          </>
        ) : <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>—</span>}
      </td>
      <td className="px-3 py-2 w-28">
        {sockets != null ? (
          <>
            <span className="font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{fmt(sockets, 0)}</span>
            {hasAccelerator && <div className="text-[10px] text-white/35 mt-0.5 leading-snug">{socketsCaption(unitsBySilicon)}</div>}
          </>
        ) : <span className="text-xs" style={{ color: "var(--dm-txt-faint)" }}>—</span>}
      </td>
      <td className="px-3 py-2 font-mono text-sm" style={{ color: "var(--dm-txt-secondary)" }}>
        {b70Cards > 0 ? fmt(b70Cards, 0) : "—"}{criCards > 0 ? ` · CRI ${fmt(criCards, 0)}` : ""}
      </td>
    </>
  );
}

function AuxModelRow({ model, isSelected, defaultRow, onToggleSelect, onCreateSizing, onChangeSizing }: {
  model: Model;
  isSelected: boolean;
  defaultRow: TaskModelDefault | undefined;
  onToggleSelect: () => void;
  onCreateSizing: () => void;
  onChangeSizing: (patch: RequestSizingPatch) => void;
}) {
  return (
    <tr style={{ borderTop: "1px solid var(--dm-border-a)", background: isSelected ? "rgba(34,211,238,0.04)" : undefined }}>
      <td className="px-3 py-2.5 w-10">
        <input
          type="checkbox" checked={isSelected} onChange={onToggleSelect}
          className="w-4 h-4 cursor-pointer" style={{ accentColor: "#22d3ee" }}
          aria-label={`Select ${model.name}`}
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="text-sm font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{model.name}</div>
        <div className="text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>{model.hfId}</div>
      </td>
      <td className="px-3 py-2.5 w-48">
        <CategoryBadge category={model.category} />
      </td>
      {isSelected ? (
        <SizingCells defaultRow={defaultRow} onCreate={onCreateSizing} onChange={onChangeSizing} />
      ) : (
        <td colSpan={9} className="px-3 py-2.5 text-xs" style={{ color: "var(--dm-txt-faint)" }}>
          Select to size
        </td>
      )}
    </tr>
  );
}

/** Enterprise Transformation > Auxiliary Models — every Embeddings & Retrieval / Safety &
 *  Guardrails catalog model, with selection and (once selected) inline request-volume sizing,
 *  combined into one table. Selected models float to the top; selection writes to the same
 *  project-scoped `data.models.selectedModels` the rest of the app reads (e.g. the Business
 *  Process page's dashboard "Models" count). */
export function AuxiliaryModelsView() {
  const { currentProject, data, updateModels } = useProject();
  const [rows, setRows] = useState<TaskModelDefault[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModelDefaults()
      .then(r => { if (!cancelled) setRows(r); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  const auxModels = useMemo(() => modelCatalog.filter(m => AUX_CATEGORIES.includes(m.category)), []);
  const selectedIds = data.models.selectedModels;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Selected models float to the top; catalog order otherwise preserved within each group.
  const ordered = useMemo(() => {
    const selected = auxModels.filter(m => selectedSet.has(m.hfId));
    const unselected = auxModels.filter(m => !selectedSet.has(m.hfId));
    return [...selected, ...unselected];
  }, [auxModels, selectedSet]);

  const defaultsByModelName = useMemo(() => {
    const map = new Map<string, TaskModelDefault>();
    for (const r of rows ?? []) if (!map.has(r.model_name)) map.set(r.model_name, r);
    return map;
  }, [rows]);

  function toggleSelect(hfId: string) {
    const next = new Set(selectedIds);
    if (next.has(hfId)) next.delete(hfId); else next.add(hfId);
    updateModels({ selectedModels: Array.from(next) });
  }

  async function handleCreateSizing(model: Model) {
    setError(null);
    try {
      const created = await createModelDefault(SEED_TASK_TYPE[model.category] ?? "Embedding", model.name);
      setRows(prev => [...(prev ?? []), created]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleChangeSizing(row: TaskModelDefault, patch: RequestSizingPatch) {
    setError(null);
    try {
      const saved = await updateModelDefault(row.id, patch);
      setRows(prev => (prev ?? []).map(r => (r.id === row.id ? saved : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!currentProject) return <AgenticLandingView />;

  const selectedCount = auxModels.filter(m => selectedSet.has(m.hfId)).length;

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-12">
        <div className="mb-6">
          <h1 className="text-4xl font-black text-white tracking-tight">Auxiliary Models</h1>
          <p className="text-[13px] text-white/40 mt-1">
            Embeddings &amp; Retrieval and Safety &amp; Guardrails — {currentProject.name}
            {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
          </p>
        </div>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}

        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "var(--dm-table-head)" }}>
                  <th className="px-3 py-2.5 w-10" />
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Model</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Classification</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Latency (s)</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Requests/day</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Window (hrs)</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Requests/sec</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Concurrency</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Silicon Units</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Systems</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Sockets</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--dm-txt-muted)" }}>Cards</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map(model => (
                  <AuxModelRow
                    key={model.hfId}
                    model={model}
                    isSelected={selectedSet.has(model.hfId)}
                    defaultRow={defaultsByModelName.get(model.name)}
                    onToggleSelect={() => toggleSelect(model.hfId)}
                    onCreateSizing={() => handleCreateSizing(model)}
                    onChangeSizing={patch => handleChangeSizing(defaultsByModelName.get(model.name)!, patch)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
