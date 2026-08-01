# Agent 3 — Supplementary Financial Audit Agent
## Source Extract with Document References

**Source documents:**
- EOI No. CAG/AI-PLATFORM/EOI/05052026, "Establishment of a Sovereign AI & Data Platform with Agentic AI Applications," issued 05 May 2026
- Corrigendum No. 04, issued 09 June 2026

No interpretation, estimation, or inference has been added below. Every line is either a direct extract or a clearly marked verbatim quotation from the two source documents, with the section it was taken from.

---

## 1. Primary Definition — EOI §6.3

> "Use-Case: AI-assisted audit of supplementary financial statements and related compliance documents submitted by audited entities. CAG has identified this as a priority use-case and conducted preliminary scoping."

## 2. Core Agent Capabilities Required — EOI §6.3

> - Ingestion and analysis of supplementary financial statements, appropriation accounts, and related audit-relevant documents.
> - Automated reconciliation and consistency checks across financial data sets.
> - Detection of material misstatements, classification errors, and non-compliance with applicable accounting standards and government financial regulations.
> - Structured output of audit observations linked to source document sections for auditor review.
> - Support for multi-year trend analysis and comparative analytics across audit entities.
> - Tight integration with the ITR Audit Agent for unified, cross-domain financial audit workflows.

## 3. Other EOI References

**§1.2 Background and Context**
> "AI-Based Supplementary Financial Audit: An extension of the ITR audit capability to include supplementary financial statements and related compliance documents."

**§3 Scope Overview — Pillar 3 table**
> "Development, deployment, and integration of four priority agentic use-cases: (i) Pension Pre-Scrutiny Agent (AI-PARAS), (ii) ITR & Assessment Order Audit Agent, (iii) Supplementary Financial Audit Agent, and (iv) Commercial Financial Audit Agent — each operating as a native consumer of the common platform."
*(Applies to all four agents; Supplementary Financial Audit Agent is item (iii).)*

**§9 Indicative Scale and Capacity Requirements**
> "Number of Priority Agentic Applications | 4 (Phase 1); extensible"
*(Not agent-specific; applies to the set of four.)*

**§11 Section D — Proposed Approach to the Four Agentic Use-Cases (EOI Response Requirements)**
> "Approach to Supplementary Financial Audit Agent — cross-document reconciliation, anomaly detection, and integration with ITR Agent."

## 4. POC (Proof of Concept) References — EOI §12

**§12.4 Agentic Use-Case Demonstration — Bidder's Choice**
> "Each shortlisted bidder must select and demonstrate one of the four priority agentic use-cases. The bidder declares their chosen use-case at the time of submitting their written technical proposal. Changing the selected use-case after proposal submission is not permitted."
*(Generic across all four agents — applies to this agent only if it is the use-case the bidder selects to demonstrate.)*

**§12.5 Agentic Use-Case Scoring Criteria (applies to whichever of the four is selected for demonstration)**

| # | Scoring Dimension | What the Evaluator Looks For | Marks |
|---|---|---|---|
| A1 | End-to-end pipeline integration | Data flows from ingestion through the Lakehouse, through the AI services layer, into the agent orchestration layer, and produces a structured output — without manual intervention at any stage. | 10 |
| A2 | Accuracy and relevance of AI output | AI-generated findings, observations, or anomaly detections are accurate against the synthetic test dataset. Output is relevant, specific, and attributable to source data fields. | 15 |
| A3 | Explainability and source attribution | Every AI finding is traceable to a specific source document, field, or rule. The system can present a human-readable rationale for each finding. No black-box outputs. | 10 |
| A4 | Human-in-the-loop controls | A human reviewer can view, accept, modify, flag, or override any AI finding through a defined workflow. Override actions are logged. The system does not auto-finalise any output without officer action. | 8 |
| A5 | Platform-native operation | The agent uses the platform's shared services (ingestion pipeline, vector search, LLM inference, audit log) rather than independent or external components. No data leaves the platform boundary during operation. | 2 |

*Source: EOI §12.5. "Agent demonstration total: 45 marks."*

## 5. Corrigendum No. 04 References

No Corrigendum No. 04 item references the Supplementary Financial Audit Agent by name or clause specifically.

The only Corrigendum item applicable to this agent is the generic cross-agent item below.

**Ref P14 — Raised by NextGen — Clause §Agents 1–4 (applies to all four agents, including this one)**

Query:
> "Should accuracy/precision benchmarks be proposed by bidders, or will CAG specify them?"

CAG Response (Status: **CLARIFIED**):
> "Bidders are expected to propose their own accuracy and precision benchmarks for each agent as part of their EOI response and during EOI presentations. CAG has not prescribed specific benchmarks at this stage. Proposed benchmarks will inform the minimum thresholds specified in the RFP. Respondents who do not propose benchmarks will be at a disadvantage during evaluation."

## 6. Common Agent Requirements — EOI §6.5

*(Not specific to this agent — applies to all four agents. Included here as the governing cross-cutting requirement.)*

> - All agents must execute on the Sovereign AI & Data Platform and consume shared platform services (OCR, embedding, vector search, RAG, governance).
> - Each agent must implement human-in-the-loop controls — no automated output is to be treated as a final determination without officer review.
> - All agent outputs must be fully explainable, traceable to source data, and logged in the platform audit trail.
> - Agents must support configurable rule sets to accommodate jurisdictional and procedural variations.
> - Performance and accuracy benchmarks for each agent will be defined and agreed upon during the RFP stage.
