/** Types and column metadata for the inference benchmarks feature. */

/** A stored benchmark row as returned by the backend (snake_case keys). */
export interface BenchmarkRecord {
  id: number;
  timestamp: string;
  platform: string;
  serving_engine: string | null;
  model: string;
  tp: number | null;
  num_deployments: number | null;
  dataset: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  concurrency: number | null;
  request_rate: number | null;
  mean_ttft_ms: number | null;
  median_ttft_ms: number | null;
  p90_ttft_ms: number | null;
  mean_tpot_ms: number | null;
  median_tpot_ms: number | null;
  p90_tpot_ms: number | null;
  mean_itl_ms: number | null;
  median_itl_ms: number | null;
  p90_itl_ms: number | null;
  request_throughput: number | null;
  output_token_throughput: number | null;
  interactivity_tokens_per_sec_per_user: number | null;
}

export interface RecordsResponse {
  total: number;
  rows: BenchmarkRecord[];
}

export interface ChartPoint {
  batch_size: number;
  value: number;
}

export interface TtftSeries {
  input_tokens: number;
  points: ChartPoint[];
}

export interface ChartsResponse {
  ttft_vs_batch: TtftSeries[];
  itl_vs_batch: ChartPoint[];
}

export interface BenchmarkFilters {
  model: string;
  input_tokens: string;
  output_tokens: string;
  batch_size: string;
  platform: string;
  serving_engine: string;
}

export const EMPTY_FILTERS: BenchmarkFilters = {
  model: "",
  input_tokens: "",
  output_tokens: "",
  batch_size: "",
  platform: "",
  serving_engine: "",
};

/** Batch-size options (powers of two, 1 → 1024). Maps to the `concurrency` column. */
export const BATCH_SIZES: number[] = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

/** Default hardware options; merged with distinct platforms loaded from the API. */
export const DEFAULT_HARDWARE: string[] = ["Xeon", "Battlemage B70"];

/** Serving engines the Models-page Benchmarks tab filters by. */
export const SERVING_ENGINES: string[] = ["vLLM", "SGLang"];

/**
 * Canonical Excel/template column headers, in order. Used to build the
 * downloadable template and to map uploaded cells to record fields.
 */
export const EXCEL_COLUMNS = [
  "Timestamp",
  "Platform",
  "Serving_Engine",
  "Model",
  "TP",
  "Num_Deployments",
  "Dataset",
  "Input_Tokens",
  "Output_Tokens",
  "Concurrency",
  "Request_Rate",
  "Mean_TTFT_ms",
  "Median_TTFT_ms",
  "P90_TTFT_ms",
  "Mean_TPOT_ms",
  "Median_TPOT_ms",
  "P90_TPOT_ms",
  "Mean_ITL_ms",
  "Median_ITL_ms",
  "P90_ITL_ms",
  "Request_Throughput",
  "Output_Token_Throughput",
  "Interactivity_tokens_per_sec_per_user",
] as const;

/** Table columns: snake_case record key paired with its Excel header label. */
export const TABLE_COLUMNS: { key: keyof BenchmarkRecord; label: string }[] = [
  { key: "timestamp", label: "Timestamp" },
  { key: "platform", label: "Platform" },
  { key: "serving_engine", label: "Serving_Engine" },
  { key: "model", label: "Model" },
  { key: "tp", label: "TP" },
  { key: "num_deployments", label: "Num_Deployments" },
  { key: "dataset", label: "Dataset" },
  { key: "input_tokens", label: "Input_Tokens" },
  { key: "output_tokens", label: "Output_Tokens" },
  { key: "concurrency", label: "Concurrency" },
  { key: "request_rate", label: "Request_Rate" },
  { key: "mean_ttft_ms", label: "Mean_TTFT_ms" },
  { key: "median_ttft_ms", label: "Median_TTFT_ms" },
  { key: "p90_ttft_ms", label: "P90_TTFT_ms" },
  { key: "mean_tpot_ms", label: "Mean_TPOT_ms" },
  { key: "median_tpot_ms", label: "Median_TPOT_ms" },
  { key: "p90_tpot_ms", label: "P90_TPOT_ms" },
  { key: "mean_itl_ms", label: "Mean_ITL_ms" },
  { key: "median_itl_ms", label: "Median_ITL_ms" },
  { key: "p90_itl_ms", label: "P90_ITL_ms" },
  { key: "request_throughput", label: "Request_Throughput" },
  { key: "output_token_throughput", label: "Output_Token_Throughput" },
  {
    key: "interactivity_tokens_per_sec_per_user",
    label: "Interactivity_tokens_per_sec_per_user",
  },
];

export interface LoginResponse {
  token: string;
  username: string;
}

export interface RowError {
  row: number;
  errors: string[];
}

export interface BulkUploadResponse {
  inserted: number;
  failed: number;
  errors: RowError[];
}
