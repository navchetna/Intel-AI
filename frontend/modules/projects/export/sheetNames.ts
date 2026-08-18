/** Central registry of sheet names used in cross-sheet formulas — keeps every reference in sync
 *  with whatever the sheets are actually titled when added to the workbook. */
export const SHEET = {
  businessProcesses: "Business Processes",
  references: "References",
  modelDefaults: "Model-Defaults",
  agentTaskSizing: "Agent Task Sizing",
  agentModelServing: "Agent-Model-Serving",
  embeddingRerankingSecurity: "Embedding-ReRanking-Security",
  harness: "Harness",
  summary: "Summary",
} as const;
