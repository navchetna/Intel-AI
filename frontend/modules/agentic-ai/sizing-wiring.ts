import {
  PG_DEFAULTS, QDRANT_DEFAULTS, NEO4J_DEFAULTS, MONGODB_DEFAULTS, ELASTIC_DEFAULTS,
  PYDANTIC_AI_DEFAULTS, LOGFIRE_DEFAULTS, CLICKHOUSE_DEFAULTS,
  LITELLM_DEFAULTS, OBSERVABILITY_STACK_DEFAULTS,
  type AnyInputs, type SizingTool,
} from "./sizing-calcs";

/**
 * Workload (icon alt text) → sizing calculator. The single place to wire up a new
 * calculator: add the mapping here, a `..._DEFAULTS` case below, and a form in
 * SizingSheet.tsx. Workloads absent from this map show as "sizing not available yet".
 */
export const SIZING_MAP: Partial<Record<string, SizingTool>> = {
  "PostgreSQL":               "postgres",
  "QDrant":                   "qdrant",
  "Neo4J":                    "neo4j",
  "MongoDB":                  "mongodb",
  "Elastic":                  "elastic",
  "Pydantic AI":              "pydantic-ai",
  "Pydantic Logfire":         "logfire",
  "ClickHouse":               "clickhouse",
  "LiteLLM":                  "litellm",
  "Prometheus+Grafana+Loki":  "observability",
};

export function defaultInputsFor(tool: SizingTool): AnyInputs {
  switch (tool) {
    case "postgres":     return PG_DEFAULTS;
    case "qdrant":        return QDRANT_DEFAULTS;
    case "neo4j":         return NEO4J_DEFAULTS;
    case "mongodb":       return MONGODB_DEFAULTS;
    case "elastic":       return ELASTIC_DEFAULTS;
    case "pydantic-ai":   return PYDANTIC_AI_DEFAULTS;
    case "logfire":       return LOGFIRE_DEFAULTS;
    case "clickhouse":    return CLICKHOUSE_DEFAULTS;
    case "litellm":       return LITELLM_DEFAULTS;
    case "observability": return OBSERVABILITY_STACK_DEFAULTS;
  }
}
