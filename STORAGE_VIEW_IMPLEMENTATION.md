# Storage Architecture View Implementation Summary

## Overview
Created a comprehensive, interactive Storage Architecture view for the Agentic AI section, following the structure and design patterns from "The Agentic Stack, Viewed as Storage" reference document.

## Implementation Details

### Files Created

1. **`frontend/modules/agentic-ai/storage-data.ts`**
   - Complete storage architecture data model
   - 6 storage classes (C0-C5) aligned to G-tier hierarchy
   - 23 workload mappings across 4 layers (Agents, Models, Data & Knowledge, Infrastructure)
   - Filesystem technology decision matrix
   - Vendor landscape by storage class
   - All data extracted from reference document

2. **`frontend/modules/agentic-ai/AgenticStorageView.tsx`**
   - Interactive storage architecture visualization
   - Filterable by storage class
   - Click-through workload details
   - Responsive grid layout
   - Modal detail panel for deep-dive

3. **`frontend/app/(modules)/agentic-ai/storage/page.tsx`**
   - Route for Storage architecture page
   - Metadata configuration

### Files Modified

1. **`frontend/modules/agentic-ai/content.ts`**
   - Added "Storage" to agenticNav navigation

2. **`frontend/modules/agentic-ai/index.ts`**
   - Exported AgenticStorageView component

## Data Structure

### Storage Classes (C0-C5)

| Class | Name | Latency | Technologies | Use Cases |
|-------|------|---------|--------------|-----------|
| **C0** | Transactional block | 50–200 μs | TLC NVMe, PLP | Checkpoints, OLTP, etcd |
| **C1** | Context memory (KV) | 0.1–2 ms | DRAM → TLC NVMe → pod flash | KV cache, ephemeral |
| **C2** | Shared hot namespace | 0.3–2 ms | All-flash parallel filesystem | Checkpoints, scratch |
| **C3** | Warm capacity | 1–5 ms | QLC NVMe, flash object | Vector indexes, registries |
| **C4** | Lake / bulk object | 10–80 ms | Nearline HDD object | Raw corpora, cold telemetry |
| **C5** | Archive / WORM | s – hours | Tape, cold object | Audit, compliance retention |

### Layer Workload Mapping

#### Agents Layer (5 workloads)
- **Workflow orchestration** (C0) - LangGraph, n8n, Flowise
- **Tasks & MCP** (C0) - Pydantic AI, MCP servers
- **Evaluation** (C3) - Trace evals, regression, benchmarks
- **Sandboxes** (C0) - E2B, Modal, Daytona, Firecracker
- **Tasks observability** (C1) - Pydantic Logfire, Langfuse

#### Models Layer (4 workloads)
- **Model serving — weights** (C0) - vLLM, SGLang, Dynamo, llm-d
- **Model serving — KV cache** (C1) - GPUDirect Storage / cuFile
- **LLM gateway** (C0) - LiteLLM
- **Agent memory** (C0) - Langfuse, Redis, Mem0

#### Data & Knowledge Layer (5 workloads)
- **Databases** (C0) - PostgreSQL, MySQL, MongoDB, Neo4j
- **ClickHouse analytics** (C1) - Trace & token analytics
- **Vector DB** (C3) - Redis, Qdrant, Milvus
- **Pipelines** (C0 → C4) - Kafka, Spark, Airflow
- **Connectors** (C3) - Elastic, Fluentd, Debezium

#### Infrastructure Orchestration Layer (5 workloads)
- **etcd** (C0) - Kubernetes control plane
- **K8s node runtime** (C0 → C3) - Image cache, registry
- **KVM** (C0 / C2) - VM images, live migration
- **Slurm** (C0 + C2) - Batch scheduling
- **Prometheus, Grafana, Loki** (C0 → C4) - Platform telemetry

## Interactive Features

### 1. Storage Class Legend
- Visual cards for all 6 storage classes (C0-C5)
- Color-coded by class
- Click to filter workloads
- Shows latency, technologies, and use cases
- Clear filtering with visual feedback

### 2. Workload Cards
- Organized by stack layer (Agents, Models, Data & Knowledge, Infrastructure)
- Each card shows:
  - Storage class badge
  - Workload name and tools
  - Filesystem/data path configuration
  - Key design driver
  - Critical tech & vendors
- Click for detailed modal view
- Visual highlighting based on filter state

### 3. Workload Detail Modal
- Full-screen overlay with detailed information
- All specifications and recommendations
- Storage class context
- Critical technology callouts
- Close on backdrop click or X button

### 4. Filesystem Decision Matrix
- Comprehensive table of filesystem technologies
- Organized by category:
  - Local block (XFS, ext4, ZFS/Btrfs)
  - Parallel/shared (WEKA, VAST, Lustre, IBM Storage Scale, Hammerspace)
  - Object (MinIO, Ceph RGW)
  - Container/sandbox (EROFS, overlayfs, thin-LVM)
  - Disaggregated block (NVMe-oF)
  - GPU-direct (GDS/cuFile)
- Use cases and tuning notes for each

### 5. Vendor Landscape Table
- Organized by storage class
- Three vendor categories:
  - Media vendors (drive manufacturers)
  - System vendors (storage systems)
  - Software/OSS (open source and commercial software)
- Procurement caution callout for C1 class

## Design Patterns

### Visual Consistency
- Matches existing AgenticStackView styling
- Consistent color scheme across storage classes
- Responsive grid layouts
- Dark theme optimized
- Smooth transitions and hover states

### Color System
```typescript
C0: #b91c1c (red-700)    - Transactional block
C1: #ea580c (orange-600) - Context memory
C2: #d97706 (amber-600)  - Shared hot namespace
C3: #059669 (emerald-600) - Warm capacity
C4: #0284c7 (sky-600)    - Lake / bulk object
C5: #475569 (slate-600)  - Archive / WORM
```

### Typography
- Section headers: 11px bold uppercase tracking-widest
- Card titles: 12-14px bold
- Body text: 11-12px
- Monospace for technical specs
- Whitespace-pre-line for multi-line data

### Interaction Patterns
- Click storage class → filter workloads
- Click workload → open detail modal
- Hover effects on all interactive elements
- Visual feedback for active states
- Keyboard accessible (focus-visible rings)

## Key Design Drivers (Per Workload)

### Examples:
- **Workflow orchestration**: "Checkpointer is the durability boundary. p99 fsync < 1 ms gates every agent step"
- **Model serving — KV cache**: "5–15 GB/s read per accelerator. Ephemeral: no replication, EC or backup"
- **etcd**: "wal_fsync p99 < 10 ms (target < 2 ms). Most fsync-sensitive component in the stack"
- **Vector DB**: "Index placement is the largest cost lever in the stack. 10k qps = 1M IOPS"

## Critical Technology Callouts

Each workload includes specific vendor and technology recommendations:
- **PostgreSQL, Redis, Kioxia CM/CD, Micron 9550** (Workflow orchestration)
- **LMCache, Mooncake, NVIDIA KVBM+NIXL, WEKA AMG** (KV cache)
- **DiskANN, AiSAQ, CAGRA, Kioxia LC9, Solidigim D5 QLC** (Vector DB)
- **Dedicated PLP TLC NVMe, never co-locate with sandbox** (etcd)

## Governing Constraints

### Storage Cost Constraint
> "Storage is 3–5% of an accelerator node's cost and can idle 100% of it. Size storage so compute and memory are never starved; never optimise it in isolation."

### Procurement Caution (C1 Class)
> "The C1 category is not settled. NVIDIA positions G3.5 pod flash as a replacement for node-local G3, which cuts against vendors who bet on in-server NVMe. Standardise on the connector layer (LMCache / NIXL) so the backing store stays swappable."

## Navigation Structure

```
/agentic-ai/
  ├── (main page)
  ├── /agentic-stack
  │   ├── Stack visualization
  │   ├── Business processes
  │   └── Agent sizing
  └── /storage  ← NEW
      ├── Storage class legend
      ├── Layer workload mapping
      ├── Filesystem decision matrix
      └── Vendor landscape
```

## Future Enhancements (Planned)

1. **Network Architecture View**
   - Network planes and bandwidth requirements
   - Switch and NIC recommendations
   - RDMA and InfiniBand configuration

2. **Security Architecture View**
   - Security layers and controls
   - Authentication and authorization
   - Compliance requirements

3. **Cross-Reference Integration**
   - Link storage recommendations to silicon choices
   - Connect to project sizing calculations
   - Reference from workflow definitions

## Testing Recommendations

1. **Visual Testing**
   - Verify all 6 storage classes render correctly
   - Test color differentiation in light/dark themes
   - Check responsive breakpoints (mobile, tablet, desktop)
   - Validate modal overlay behavior

2. **Interaction Testing**
   - Click each storage class filter
   - Open detail modals for each workload
   - Test keyboard navigation
   - Verify filter clear functionality

3. **Data Integrity**
   - Validate all 23 workloads are present
   - Check class-to-workload mapping accuracy
   - Verify vendor landscape completeness
   - Confirm filesystem matrix coverage

4. **Performance**
   - Test with all workloads visible
   - Check modal open/close smoothness
   - Validate filter state transitions

## Technical Debt / Known Limitations

1. No search/filter by workload name yet
2. No export to PDF/CSV functionality
3. Vendor landscape static (not dynamically updated)
4. No integration with pricing/cost calculator yet
5. Mobile experience could be further optimized for tables

## Documentation References

- Source: "The Agentic Stack, Viewed as Storage" (Aug 2026)
- Companion: Storage Architecture for the Agentic Stack v1.0
- Related: Intel Xeon 6 SKU Workbook, Networking Reference, Memory Technology specs

## Maintenance Notes

- Storage class definitions in `storage-data.ts`
- Update workload mappings as new stack components are added
- Refresh vendor landscape quarterly
- Keep filesystem technologies current with latest releases
- Monitor C1 class evolution (NVIDIA pod flash vs. in-server NVMe debate)
