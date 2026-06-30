"use client";

import { BATCH_SIZES, type BenchmarkFilters } from "./types";

interface FiltersProps {
  value: BenchmarkFilters;
  onChange: (next: BenchmarkFilters) => void;
  onReset: () => void;
  hardwareOptions: string[];
}

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-intel-blue focus:outline-none focus:ring-1 focus:ring-intel-blue";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-gray-500";

/** Left-hand filter panel for the online benchmarks view. */
export function FiltersPanel({ value, onChange, onReset, hardwareOptions }: FiltersProps) {
  const set = (patch: Partial<BenchmarkFilters>) => onChange({ ...value, ...patch });

  return (
    <aside className="w-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:w-72 md:shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-intel-dark">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-intel-blue hover:underline"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className={labelClass} htmlFor="f-model">
            Model Name
          </label>
          <input
            id="f-model"
            type="text"
            value={value.model}
            onChange={(e) => set({ model: e.target.value })}
            placeholder="e.g. Llama-3-8B"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="f-input">
            Input Tokens
          </label>
          <input
            id="f-input"
            type="number"
            min={0}
            value={value.input_tokens}
            onChange={(e) => set({ input_tokens: e.target.value })}
            placeholder="e.g. 128"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="f-output">
            Output Tokens
          </label>
          <input
            id="f-output"
            type="number"
            min={0}
            value={value.output_tokens}
            onChange={(e) => set({ output_tokens: e.target.value })}
            placeholder="e.g. 256"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="f-batch">
            Batch Size
          </label>
          <select
            id="f-batch"
            value={value.batch_size}
            onChange={(e) => set({ batch_size: e.target.value })}
            className={inputClass}
          >
            <option value="">All</option>
            {BATCH_SIZES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="f-hardware">
            Hardware
          </label>
          <select
            id="f-hardware"
            value={value.platform}
            onChange={(e) => set({ platform: e.target.value })}
            className={inputClass}
          >
            <option value="">All</option>
            {hardwareOptions.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>
    </aside>
  );
}
