import type ExcelJS from "exceljs";
import type { AnyInputs, SizingTool } from "@/modules/agentic-ai/sizing-calcs";
import { buildPostgresSheet, type WorkloadSheetResult } from "./postgres";
import { buildQdrantSheet } from "./qdrant";
import { buildNeo4jSheet } from "./neo4j";
import { buildMongoDBSheet } from "./mongodb";
import { buildElasticSheet } from "./elastic";
import { buildPydanticAISheet } from "./pydanticAi";
import { buildLogfireSheet } from "./logfire";
import { buildClickHouseSheet } from "./clickhouse";
import type {
  PGInputs, QdrantInputs, Neo4jInputs, MongoDBInputs, ElasticInputs, PydanticAIInputs, LogfireInputs, ClickHouseInputs,
} from "@/modules/agentic-ai/sizing-calcs";

export type { WorkloadSheetResult };

/** Builds the detailed live-formula sheet for one workload tool onto an already-created worksheet.
 *  Returns undefined for tools without a dedicated sheet builder yet (e.g. litellm, observability) —
 *  callers should skip adding a sheet for those rather than fail the export. */
export function buildWorkloadSheet(ws: ExcelJS.Worksheet, tool: SizingTool, inputs: AnyInputs): WorkloadSheetResult | undefined {
  switch (tool) {
    case "postgres": return buildPostgresSheet(ws, inputs as PGInputs);
    case "qdrant": return buildQdrantSheet(ws, inputs as QdrantInputs);
    case "neo4j": return buildNeo4jSheet(ws, inputs as Neo4jInputs);
    case "mongodb": return buildMongoDBSheet(ws, inputs as MongoDBInputs);
    case "elastic": return buildElasticSheet(ws, inputs as ElasticInputs);
    case "pydantic-ai": return buildPydanticAISheet(ws, inputs as PydanticAIInputs);
    case "logfire": return buildLogfireSheet(ws, inputs as LogfireInputs);
    case "clickhouse": return buildClickHouseSheet(ws, inputs as ClickHouseInputs);
    default: return undefined;
  }
}
