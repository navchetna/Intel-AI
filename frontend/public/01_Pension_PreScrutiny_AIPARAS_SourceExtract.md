# Agent 1 — Pension Pre-Scrutiny Agent (AI-PARAS)
## Source Extract with Document References

**Source documents:**
- EOI No. CAG/AI-PLATFORM/EOI/05052026, "Establishment of a Sovereign AI & Data Platform with Agentic AI Applications," issued 05 May 2026
- Corrigendum No. 04, issued 09 June 2026

No interpretation, estimation, or inference has been added below. Every line is either a direct extract or a clearly marked verbatim quotation from the two source documents, with the section it was taken from.

---

## 1. Primary Definition — EOI §6.1

> "Use-Case: Automated first-level scrutiny of pension proposals submitted to Accountant General (A&E) offices across States. CAG has conducted internal assessments and exploratory work on this use-case. This EOI invites organisations to demonstrate their capability to deliver a production-grade implementation on the unified platform."

## 2. Core Agent Capabilities Required — EOI §6.1

> - Ingestion of pension case documents (service books, salary certificates, PPO forms, pension calculation sheets) — both digitally submitted and scanned physical documents.
> - OCR and semantic extraction of structured fields from multi-format pension documents.
> - Automated validation against pension rules — CCS Pension Rules, state-specific adaptations, and variants for Family Pension, DCRG, Commutation, Disability, and Special Pension.
> - Detection of document gaps, calculation errors, rule mismatches, and inconsistencies with explainable findings presented to pension processing officers.
> - Multi-state, multi-office deployment with logical data isolation per state.
> - Integration with existing case management workflows and officer hierarchy (Dealing Hand, AAO, SAO, DAG).
> - Human-in-the-loop design — the agent assists but does not sanction; all final decisions remain with designated officers.
> - Full audit trail of agent findings, officer reviews, and case outcomes.

## 3. Other EOI References

**§1.2 Background and Context**
> "Pension Pre-Scrutiny (AI-PARAS): An AI-enabled system to automate first-level scrutiny of pension proposals across Accountant General (A&E) offices, reducing processing time and improving detection of document deficiencies."

**§3 Scope Overview — Pillar 3 table**
> "Development, deployment, and integration of four priority agentic use-cases: (i) Pension Pre-Scrutiny Agent (AI-PARAS), (ii) ITR & Assessment Order Audit Agent, (iii) Supplementary Financial Audit Agent, and (iv) Commercial Financial Audit Agent — each operating as a native consumer of the common platform."
*(Applies to all four agents; AI-PARAS is item (i).)*

**§9 Indicative Scale and Capacity Requirements**
> "Number of Priority Agentic Applications | 4 (Phase 1); extensible"
*(Not agent-specific; applies to the set of four.)*

**§11 Section D — Proposed Approach to the Four Agentic Use-Cases (EOI Response Requirements)**
> "High-level approach to designing and deploying the Pension Pre-Scrutiny Agent (AI-PARAS) on the platform including document processing architecture, pension rule engine design, and multi-state data model."

## 4. POC (Proof of Concept) References — EOI §12

**§12.4 Agentic Use-Case Demonstration — Bidder's Choice**
> "Each shortlisted bidder must select and demonstrate one of the four priority agentic use-cases. The bidder declares their chosen use-case at the time of submitting their written technical proposal. Changing the selected use-case after proposal submission is not permitted."
*(Generic across all four agents — applies to AI-PARAS only if it is the use-case the bidder selects to demonstrate.)*

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

**Ref P13 — Raised by NextGen — Clause §6.1 Agent 1**

Query:
> "Will CAG provide API access to existing pension case management systems, or will AI-PARAS be a standalone input validation layer?"

CAG Response (Status: **CLARIFIED**):
> "AI-PARAS is not standalone - it integrates with existing AG office case management infrastructure. The agentic platform should provide shared services (OCR, LLM inference, observability) that existing applications consume. Integration with existing pension case management workflows will be via secure APIs. API specifications and integration details will be provided at RFP onboarding."

**Ref P14 — Raised by NextGen — Clause §Agents 1–4 (applies to all four agents, including AI-PARAS)**

Query:
> "Should accuracy/precision benchmarks be proposed by bidders, or will CAG specify them?"

CAG Response (Status: **CLARIFIED**):
> "Bidders are expected to propose their own accuracy and precision benchmarks for each agent as part of their EOI response and during EOI presentations. CAG has not prescribed specific benchmarks at this stage. Proposed benchmarks will inform the minimum thresholds specified in the RFP. Respondents who do not propose benchmarks will be at a disadvantage during evaluation."

No other Corrigendum No. 04 items reference AI-PARAS or Agent 1 specifically.

## 6. Common Agent Requirements — EOI §6.5

*(Not specific to AI-PARAS — applies to all four agents. Included here as the governing cross-cutting requirement.)*

> - All agents must execute on the Sovereign AI & Data Platform and consume shared platform services (OCR, embedding, vector search, RAG, governance).
> - Each agent must implement human-in-the-loop controls — no automated output is to be treated as a final determination without officer review.
> - All agent outputs must be fully explainable, traceable to source data, and logged in the platform audit trail.
> - Agents must support configurable rule sets to accommodate jurisdictional and procedural variations.
> - Performance and accuracy benchmarks for each agent will be defined and agreed upon during the RFP stage.
