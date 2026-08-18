# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Intel presales architects sizing customer AI infrastructure deployments. Solutions engineers working with enterprise customers to design and cost complete AI solutions — selecting silicon, models, storage, and infrastructure to meet specific workload requirements and SLAs.

**Context:** Working from customer business requirements (e.g. "process 10K support tickets/day with AI agents"), the architect uses this tool to translate business needs into technical infrastructure: what models run what tasks, which Intel silicon runs those models, how much storage/networking/compute is needed, and what the complete BOM looks like. The output is a technical proposal and cost estimate.

## Product Purpose

Intel-AI is an integrated infrastructure sizing platform that connects business requirements to complete AI infrastructure designs optimized for Intel silicon. It automates the complex workflow of:
1. Business process → agentic workflow design (AI-assisted)
2. Workflow tasks → model selection and sizing
3. Model requirements → Intel silicon matching (Xeon 6, Gaudi, CRI)
4. Workload → storage, networking, and rack-level infrastructure

Success means a presales architect can confidently size a complete AI deployment in hours instead of days, with Intel silicon automatically matched to workload characteristics based on real benchmark data.

## Positioning

**Unique mechanism:** End-to-end project sizing that connects business processes to rack-level infrastructure in one coherent flow. Unlike generic cloud calculators or spreadsheets, Intel-AI understands:
- The entire Intel AI silicon portfolio and which processor fits which workload pattern
- How agentic workflows translate to LLM serving requirements
- Storage architecture patterns for different AI workload types (RAG, training, inference)
- Cross-dependencies between model choice, silicon, VRAM, concurrency, and latency

The tool embeds Intel's AI infrastructure expertise as a guided workflow, not just a blank calculator.

## Operating Context

**Customer engagement workflow:**
1. Gather customer business requirements (cases/day, latency SLAs, data volumes)
2. Map to agentic workflows (optionally AI-generated from process description)
3. Select models from catalog for each task type
4. Size infrastructure (silicon, storage, networking) based on workload
5. Generate technical proposal and BOM

**Key artifacts produced:**
- Sized infrastructure stack diagram (agentic layer → serving → silicon)
- Model deployment specifications (VRAM, concurrency, quantization)
- Storage architecture (RAG indices, training datasets, inference caching)
- Complete hardware BOM with Intel silicon recommendations

**Tools in the workflow:**
- Model catalog (50+ open-source models with deployment specs)
- Silicon comparison (Xeon 6 SKUs, Gaudi accelerators, CRI servers)
- Benchmark database (inference performance, training throughput)
- Sizing calculators (LLM serving, training, storage, networking)
- Project view (cross-tab state management for one customer engagement)

## Capabilities and Constraints

**Capabilities:**
- Model catalog with deployment specs (VRAM, quantization, serving options) for 50+ models across 7 categories (OCR, Vision, Speech, Translation, Embeddings, Safety, LLM)
- Intel silicon portfolio (Xeon 6 32c/64c, Gaudi B70, CRI servers) with benchmark data
- AI-suggested workflow generation from business process descriptions
- Multi-layer sizing: agentic workflows → model serving → silicon → storage → rack
- Project state management (selections, sizing inputs, calculated outputs persist across tabs)
- Excel export for model catalog and infrastructure BOMs

**Technical constraints:**
- Web application (Next.js frontend, FastAPI backend, PostgreSQL)
- Modular architecture: each feature (silicon, models, workflows, etc.) is independent
- No authentication currently — tool assumes trusted internal/customer use
- Static model/silicon data (manually curated, not live benchmark feeds)

**Terminology:**
- **Agentic stack:** The layered architecture (Business Process → Agents → LLM Serving → Silicon)
- **Presales architect:** The Intel solutions engineer sizing customer deployments
- **Sizing:** Calculating infrastructure requirements from workload specifications
- **BOM:** Bill of materials — the hardware shopping list for a deployment

## Brand Commitments

**Intel corporate identity:**
- Intel blue (#0071c5), Intel dark (#003c71), Intel energy cyan (#00c7fd)
- Professional engineering tone — technical precision, not marketing hype
- "Intel-AI" product name

**Established visual language:**
- Dark aerospace/technical aesthetic (deep blue-black gradients)
- Category-coded accent system (cyan/violet/emerald/amber/blue/rose/indigo)
- Dense information display prioritized over whitespace
- Modular page structure reflects workflow (Silicon → Models → Workflows → Projects)

## Evidence on Hand

**Real content:**
- 50+ production-ready open-source models with verified HuggingFace IDs
- Intel Xeon 6 processor specifications and benchmark data
- Gaudi accelerator performance characteristics
- Storage architecture patterns from real enterprise AI deployments

**Assets:**
- Category accent color system already implemented (see category-style.ts)
- Dark theme CSS variable system (globals.css)
- Intel stack diagram component (visual language reference)

**Absent (future work must not fabricate):**
- Customer testimonials or case studies
- Pricing data (silicon costs, cloud pricing)
- Specific customer names or deployment details
- Benchmark data beyond what's in the existing tables

## Product Principles

1. **Technical precision over marketing polish.** This tool is for working engineers sizing real infrastructure. Every number must be defensible; every recommendation must trace to benchmark data or architecture constraints. Dense, scannable data views beat minimal "consumer" aesthetics.

2. **Workflow coherence across modules.** The pages are not independent calculators — they're steps in one sizing workflow. Models selected on the Catalog tab flow to Sizing; silicon choices connect to benchmark data; business processes size agentic stacks. Cross-module state and navigation matter.

3. **Intel silicon as the answer, not the question.** The tool guides presales architects to the right Intel silicon for each workload pattern, automatically matching Xeon vs Gaudi vs CRI based on model characteristics, concurrency, and latency requirements. The workflow starts with customer needs, not silicon specs.

4. **Automation over manual assembly.** AI-suggested workflows, pre-filled model defaults, calculated infrastructure sizing — the tool reduces what the architect has to derive from scratch. Manual override is always available but the smart defaults accelerate the common path.

5. **One coherent project, many views.** The Project context holds selections and sizing inputs across all tabs. An architect can explore models, review silicon, design workflows, and size storage in any order — the project state keeps it consistent.
