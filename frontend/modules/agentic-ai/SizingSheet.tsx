"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  calcPG, PG_DEFAULTS, type PGInputs,
  calcQdrant, QDRANT_DEFAULTS, type QdrantInputs,
  calcNeo4j, NEO4J_DEFAULTS, type Neo4jInputs,
  calcMongoDB, MONGODB_DEFAULTS, type MongoDBInputs,
  calcElastic, ELASTIC_DEFAULTS, type ElasticInputs, type ElasticWorkload,
} from "./sizing-calcs";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SizingTool = "postgres" | "qdrant" | "neo4j" | "mongodb" | "elastic";

interface Props { tool: SizingTool; onClose: () => void; }

const TOOL_META: Record<SizingTool, { name: string; accent: string; accentRgb: string; logo: string; tagline: string }> = {
  postgres: { name: "PostgreSQL OLTP Sizing",  accent: "#38bdf8", accentRgb: "56,189,248",  logo: "/postgre.jpg", tagline: "Estimate CPU, RAM & postgresql.conf for production OLTP workloads" },
  qdrant:   { name: "Qdrant Vector DB Sizing",  accent: "#a78bfa", accentRgb: "167,139,250", logo: "/qdrant.jpg",  tagline: "Size a Qdrant cluster for ANN vector search at scale" },
  neo4j:    { name: "Neo4j Graph DB Sizing",    accent: "#34d399", accentRgb: "52,211,153",  logo: "/neo4j.jpg",   tagline: "Size a Neo4j cluster for graph analytics and traversal" },
  mongodb:  { name: "MongoDB WiredTiger Sizing",    accent: "#00ED64", accentRgb: "0,237,100",   logo: "/mongo.jpg",   tagline: "Size a MongoDB replica set or sharded cluster with WiredTiger storage engine" },
  elastic:  { name: "Elasticsearch Cluster Sizing", accent: "#F04E98", accentRgb: "240,78,152",  logo: "/elastic.jpg", tagline: "Size a hot/warm/cold Elastic cluster for logs or full-text search workloads" },
};

// ── Shared input primitives ────────────────────────────────────────────────────

function NumField({ label, value, onChange, min, step = 1, note }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: number; note?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      <input
        type="number" value={value} min={min} step={step}
        onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
        className="w-full rounded-lg px-3 py-2 text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-colors"
      />
      {note && <span className="text-[10px] text-white/30 leading-tight">{note}</span>}
    </label>
  );
}

function SelField<T extends string>({ label, value, onChange, options, note }: {
  label: string; value: T; onChange: (v: T) => void; options: T[]; note?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full rounded-lg px-3 py-2 text-sm text-white bg-[#0d1f3c] border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {note && <span className="text-[10px] text-white/30 leading-tight">{note}</span>}
    </label>
  );
}

function BoolField({ label, value, onChange, note }: {
  label: string; value: boolean; onChange: (v: boolean) => void; note?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
      <select
        value={value ? "Yes" : "No"}
        onChange={e => onChange(e.target.value === "Yes")}
        className="w-full rounded-lg px-3 py-2 text-sm text-white bg-[#0d1f3c] border border-white/10 focus:outline-none focus:border-white/30 transition-colors"
      >
        <option>Yes</option>
        <option>No</option>
      </select>
      {note && <span className="text-[10px] text-white/30 leading-tight">{note}</span>}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 mt-5 mb-3 first:mt-0 pb-1.5 border-b border-white/[0.07]">{children}</h4>;
}

// ── Result display primitives ──────────────────────────────────────────────────

function MetricCard({ label, value, unit, accent }: { label: string; value: string | number; unit: string; accent: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl p-4"
      style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.2)` }}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-3xl font-extrabold leading-none" style={{ color: `rgb(${accent})` }}>{value}</span>
        <span className="text-sm font-medium text-white/50">{unit}</span>
      </div>
    </div>
  );
}

function ConfRow({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 border-b border-white/[0.05] last:border-0">
      <span className="font-mono text-[11px] text-white/45 min-w-0 flex-1 truncate">{k}</span>
      <span className="font-mono text-[12px] font-semibold text-white/80 flex-shrink-0">{v}</span>
    </div>
  );
}

function WorkingRow({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 text-[11px]">
      <span className="text-white/35">{label}</span>
      <span className="text-white/65 font-mono">{typeof value === "number" ? value.toFixed(2) : value}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

// ── PostgreSQL form + results ──────────────────────────────────────────────────

function PGForm({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const [inp, setInp] = useState<PGInputs>(PG_DEFAULTS);
  const r = useMemo(() => calcPG(inp), [inp]);
  const set = <K extends keyof PGInputs>(k: K, v: PGInputs[K]) => setInp(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
      {/* Inputs */}
      <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto px-6 py-5 border-r border-white/[0.07]">
        <SectionTitle>Workload profile</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Dataset size (GB)" value={inp.datasetGB} min={1} onChange={v => set("datasetGB", v)} />
          <NumField label="Concurrent connections" value={inp.connections} min={1} step={1} onChange={v => set("connections", v)} />
          <NumField label="Peak active fraction" value={inp.activeFraction} min={0.01} step={0.05} onChange={v => set("activeFraction", v)} note="0.01–1.0" />
          <NumField label="Avg query runtime (ms)" value={inp.avgQueryMs} min={0.1} step={0.5} onChange={v => set("avgQueryMs", v)} />
        </div>
        <SectionTitle>Data access</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Hot working-set %" value={inp.hotFraction} min={0.01} step={0.05} onChange={v => set("hotFraction", v)} note="0.01–1.0" />
          <SelField label="Storage type" value={inp.storageType} onChange={v => set("storageType", v)} options={["NVMe", "SSD", "HDD"]} />
          <SelField label="Write intensity" value={inp.writeIntensity} onChange={v => set("writeIntensity", v)} options={["Low", "Medium", "High"]} />
          <NumField label="Background CPU (cores)" value={inp.bgCpuAllowance} min={0} step={0.5} onChange={v => set("bgCpuAllowance", v)} note="Vacuum, replication, etc." />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Sizing output</p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <MetricCard label="Recommended cores" value={r.cpu.recommendedCores} unit="vCPU" accent={accentRgb} />
          <MetricCard label="Recommended RAM" value={r.memory.recommendedRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="QPS capacity" value={r.cpu.qpsCapacity.toLocaleString()} unit="queries/s" accent={accentRgb} />
          <MetricCard label="Minimum RAM" value={r.memory.minRAM} unit="GB" accent={accentRgb} />
        </div>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Working calculations</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label="Peak active queries" value={r.cpu.peakActiveQueries} />
            <WorkingRow label="Raw core estimate (+ bg CPU)" value={r.cpu.rawCoreEstimate} />
            <WorkingRow label="Hot working set" value={r.memory.hotWorkingSetGB} unit="GB" />
            <WorkingRow label="RAM needed to cache hot set" value={r.memory.ramNeededGB} unit="GB" />
          </div>
        </details>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">postgresql.conf</p>
        <div className="rounded-lg border border-white/[0.07] p-3 mb-4">
          <ConfRow k="max_connections"                  v={r.conf.maxConnections} />
          <ConfRow k="shared_buffers"                   v={`${r.conf.sharedBuffersGB} GB`} />
          <ConfRow k="effective_cache_size"             v={`${r.conf.effectiveCacheSizeGB} GB`} />
          <ConfRow k="maintenance_work_mem"             v={`${r.conf.maintenanceWorkMemMB} MB`} />
          <ConfRow k="work_mem"                         v={`${r.conf.workMemMB} MB`} />
          <ConfRow k="wal_buffers"                      v={`${r.conf.walBuffersMB} MB`} />
          <ConfRow k="max_wal_size"                     v={`${r.conf.maxWalSizeGB} GB`} />
          <ConfRow k="checkpoint_completion_target"     v={r.conf.checkpointCompletionTarget} />
          <ConfRow k="random_page_cost"                 v={r.conf.randomPageCost} />
          <ConfRow k="effective_io_concurrency"         v={r.conf.effectiveIOConcurrency} />
          <ConfRow k="max_worker_processes"             v={r.conf.maxWorkerProcesses} />
          <ConfRow k="max_parallel_workers"             v={r.conf.maxParallelWorkers} />
          <ConfRow k="max_parallel_workers_per_gather"  v={r.conf.maxParallelWorkersPerGather} />
          <ConfRow k="autovacuum_vacuum_scale_factor"   v={r.conf.autovacuumVacuumScaleFactor} />
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3 text-[11px] text-white/35 leading-relaxed">
          <strong className="text-white/50">Notes: </strong>
          Front <code className="text-[10px] bg-white/5 px-1 rounded">max_connections</code> with PgBouncer.
          <code className="text-[10px] bg-white/5 px-1 rounded ml-1">work_mem</code> is per-sort-operation — multiply by active connections for total potential usage.
          {inp.storageType === "HDD" && " HDD: random_page_cost=4.0 and low effective_io_concurrency applied."}
        </div>
      </div>
    </div>
  );
}

// ── Qdrant form + results ──────────────────────────────────────────────────────

function QdrantForm({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const [inp, setInp] = useState<QdrantInputs>(QDRANT_DEFAULTS);
  const r = useMemo(() => calcQdrant(inp), [inp]);
  const set = <K extends keyof QdrantInputs>(k: K, v: QdrantInputs[K]) => setInp(p => ({ ...p, [k]: v }));
  const fmt = (n: number) => n < 1 ? n.toFixed(3) : n.toFixed(1);

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
      {/* Inputs */}
      <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto px-6 py-5 border-r border-white/[0.07]">
        <SectionTitle>Vector data</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Number of vectors" value={inp.numVectors} min={1000} step={100000} onChange={v => set("numVectors", v)} />
          <NumField label="Dimensions" value={inp.dimensions} min={2} step={64} onChange={v => set("dimensions", v)} />
          <SelField label="Quantization" value={inp.quantMode} onChange={v => set("quantMode", v)} options={["None", "Scalar int8", "Binary", "Product"]} />
          {inp.quantMode === "Product" && (
            <NumField label="PQ bytes/dim" value={inp.productQuantBytesPerDim} min={0.125} step={0.125} onChange={v => set("productQuantBytesPerDim", v)} />
          )}
          <SelField label="Original vectors" value={inp.origVecsPlacement} onChange={v => set("origVecsPlacement", v)} options={["In-RAM", "On-disk"]} note="Full-precision placement" />
          <SelField label="HNSW graph" value={inp.hnswGraphPlacement} onChange={v => set("hnswGraphPlacement", v)} options={["In-RAM", "On-disk"]} />
        </div>
        <SectionTitle>Payload</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="HNSW m" value={inp.hnswM} min={4} step={4} onChange={v => set("hnswM", v)} note="Connections per node" />
          <NumField label="Payload (non-indexed, B)" value={inp.payloadPerVectorBytes} min={0} step={64} onChange={v => set("payloadPerVectorBytes", v)} />
          <SelField label="Non-indexed placement" value={inp.nonIndexedPayloadPlacement} onChange={v => set("nonIndexedPayloadPlacement", v)} options={["In-RAM", "On-disk"]} />
          <NumField label="Indexed payload (B)" value={inp.indexedPayloadPerVectorBytes} min={0} step={8} onChange={v => set("indexedPayloadPerVectorBytes", v)} note="Always in RAM" />
        </div>
        <SectionTitle>Cluster & overhead</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Replication factor" value={inp.replicationFactor} min={1} step={1} onChange={v => set("replicationFactor", v)} />
          <NumField label="Nodes" value={inp.nodes} min={1} step={1} onChange={v => set("nodes", v)} />
          <NumField label="RAM util. target" value={inp.ramUtilTarget} min={0.1} step={0.05} onChange={v => set("ramUtilTarget", v)} note="0.1–1.0" />
          <NumField label="Metadata overhead" value={inp.metadataOverhead} min={1} step={0.1} onChange={v => set("metadataOverhead", v)} note="Multiplier" />
          <NumField label="Disk overhead" value={inp.diskOverhead} min={1} step={0.25} onChange={v => set("diskOverhead", v)} note="Multiplier" />
        </div>
        <SectionTitle>Performance</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Target QPS" value={inp.targetQPS} min={1} step={100} onChange={v => set("targetQPS", v)} />
          <NumField label="QPS per core" value={inp.qpsPerCore} min={1} step={10} onChange={v => set("qpsPerCore", v)} />
          <NumField label="Indexing threads" value={inp.indexingThreads} min={1} step={1} onChange={v => set("indexingThreads", v)} note="Per node" />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Per-node recommendation</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="RAM per node" value={r.cluster.perNodeRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="vCPU per node" value={r.cluster.perNodeVCPU} unit="cores" accent={accentRgb} />
          <MetricCard label="Disk per node" value={r.cluster.perNodeDisk} unit="GB" accent={accentRgb} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Cluster totals ({inp.nodes} nodes × RF{inp.replicationFactor})</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Total cluster RAM" value={r.cluster.totalClusterRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="Total vCPU" value={r.cluster.totalClusterVCPU} unit="cores" accent={accentRgb} />
          <MetricCard label="Total disk" value={r.cluster.totalClusterDisk} unit="GB" accent={accentRgb} />
        </div>
        <MetricCard label="Sustained search QPS" value={r.cpu.sustainedQPS.toLocaleString()} unit="QPS" accent={accentRgb} />

        <details className="mt-5">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">RAM working calculations</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Quantized / resident vectors (${inp.quantMode})`} value={fmt(r.memory.quantCopyRAM)} unit="GB" />
            <WorkingRow label="HNSW graph (in-RAM)" value={fmt(r.memory.hnswRAM)} unit="GB" />
            <WorkingRow label="Indexed payload (always RAM)" value={fmt(r.memory.indexedPayloadRAM)} unit="GB" />
            <WorkingRow label="Non-indexed payload (if in-RAM)" value={fmt(r.memory.nonIndexedPayloadRAM)} unit="GB" />
            <WorkingRow label="Resident subtotal" value={fmt(r.memory.residentSubtotal)} unit="GB" />
            <WorkingRow label={`× ${inp.metadataOverhead} metadata overhead`} value={fmt(r.memory.ramWithOverhead)} unit="GB" />
            <WorkingRow label={`÷ ${inp.ramUtilTarget} RAM utilisation target`} value={fmt(r.memory.provisionedPerCopy)} unit="GB/copy" />
            <WorkingRow label={`× RF${inp.replicationFactor} → total cluster RAM`} value={fmt(r.memory.totalClusterRAM)} unit="GB" />
            <WorkingRow label={`÷ ${inp.nodes} nodes → raw per-node`} value={fmt(r.memory.perNodeRAM)} unit="GB" />
          </div>
        </details>

        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Disk working calculations</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label="Full-precision vectors (on-disk)" value={fmt(r.disk.fullPrecDisk)} unit="GB" />
            <WorkingRow label="Quantized copy (if any)" value={fmt(r.disk.quantDisk)} unit="GB" />
            <WorkingRow label="Payload (indexed + non-indexed)" value={fmt(r.disk.payloadDisk)} unit="GB" />
            <WorkingRow label="HNSW graph" value={fmt(r.disk.hnswDisk)} unit="GB" />
            <WorkingRow label={`× ${inp.diskOverhead} disk overhead → per copy`} value={fmt(r.disk.diskPerCopy)} unit="GB" />
            <WorkingRow label={`× RF${inp.replicationFactor} → total cluster disk`} value={fmt(r.disk.totalClusterDisk)} unit="GB" />
            <WorkingRow label={`÷ ${inp.nodes} nodes → raw per-node`} value={fmt(r.disk.perNodeDisk)} unit="GB" />
          </div>
        </details>
      </div>
    </div>
  );
}

// ── Neo4j form + results ───────────────────────────────────────────────────────

function Neo4jForm({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const [inp, setInp] = useState<Neo4jInputs>(NEO4J_DEFAULTS);
  const r = useMemo(() => calcNeo4j(inp), [inp]);
  const set = <K extends keyof Neo4jInputs>(k: K, v: Neo4jInputs[K]) => setInp(p => ({ ...p, [k]: v }));
  const fmt2 = (n: number) => n.toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
      {/* Inputs */}
      <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto px-6 py-5 border-r border-white/[0.07]">
        <SectionTitle>Graph data model</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Nodes" value={inp.numNodes} min={1000} step={1000000} onChange={v => set("numNodes", v)} />
          <NumField label="Relationships" value={inp.numRelationships} min={1000} step={1000000} onChange={v => set("numRelationships", v)} />
          <NumField label="Props per node" value={inp.avgPropsPerNode} min={0} step={1} onChange={v => set("avgPropsPerNode", v)} />
          <NumField label="Props per relationship" value={inp.avgPropsPerRel} min={0} step={1} onChange={v => set("avgPropsPerRel", v)} />
          <NumField label="Bytes per property" value={inp.avgBytesPerProp} min={1} step={1} onChange={v => set("avgBytesPerProp", v)} note="avg across all types" />
          <NumField label="Native index fraction" value={inp.nativeIndexFraction} min={0} step={0.05} onChange={v => set("nativeIndexFraction", v)} note="0–1" />
        </div>
        <SectionTitle>Storage options</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Vector index (GB)" value={inp.vectorIndexGB} min={0} step={1} onChange={v => set("vectorIndexGB", v)} />
          <NumField label="Format overhead" value={inp.storeFormatOverhead} min={1} step={0.1} onChange={v => set("storeFormatOverhead", v)} note="1.0 = standard" />
          <NumField label="Growth headroom" value={inp.storeGrowthHeadroom} min={0} step={0.05} onChange={v => set("storeGrowthHeadroom", v)} note="0.2 = 20%" />
          <NumField label="Page cache margin" value={inp.pageCacheMargin} min={0} step={0.05} onChange={v => set("pageCacheMargin", v)} note="0.1 = 10%" />
        </div>
        <SectionTitle>Query workload</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Peak concurrent reads" value={inp.peakConcurrentReads} min={1} step={1} onChange={v => set("peakConcurrentReads", v)} />
          <NumField label="Read QPS per core" value={inp.readQPSPerCore} min={1} step={10} onChange={v => set("readQPSPerCore", v)} />
          <NumField label="Target read throughput" value={inp.targetReadThroughput} min={1} step={100} onChange={v => set("targetReadThroughput", v)} note="QPS" />
          <NumField label="Peak write txns" value={inp.peakConcurrentWriteTxns} min={0} step={1} onChange={v => set("peakConcurrentWriteTxns", v)} />
          <NumField label="Avg write tx size" value={inp.avgWriteTxSizeEntities} min={1} step={500} onChange={v => set("avgWriteTxSizeEntities", v)} note="entities/txn" />
          <SelField label="Write intensity" value={inp.writeIntensity} onChange={v => set("writeIntensity", v)} options={["Low", "Medium", "High"]} />
        </div>
        <SectionTitle>Cluster & system</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <BoolField label="High availability" value={inp.highAvailability} onChange={v => set("highAvailability", v)} note="3-primary cluster if Yes" />
          <NumField label="Max read cores/node" value={inp.maxReadCoresPerNode} min={1} step={1} onChange={v => set("maxReadCoresPerNode", v)} />
          <NumField label="OS + off-heap (GB)" value={inp.osOffHeapReserveGB} min={1} step={0.5} onChange={v => set("osOffHeapReserveGB", v)} />
          <BoolField label="Graph Data Science" value={inp.hasGDS} onChange={v => set("hasGDS", v)} note="GDS needs extra heap" />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Per-node recommendation</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="RAM per node" value={r.cluster.perNodeRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="vCPU per node" value={r.cluster.perNodeVCPU} unit="cores" accent={accentRgb} />
          <MetricCard label="Disk per node" value={r.cluster.perNodeDisk} unit="GB" accent={accentRgb} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
          Cluster topology — {r.cluster.primaries}P + {r.cluster.secondaries}S = {r.cluster.totalMembers} members
        </p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Total cluster RAM" value={r.cluster.totalClusterRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="Total vCPU" value={r.cluster.totalClusterVCPU} unit="cores" accent={accentRgb} />
          <MetricCard label="Total disk" value={r.cluster.totalClusterDisk} unit="GB" accent={accentRgb} />
        </div>
        <MetricCard label="Sustained read QPS" value={r.cpu.sustainedReadQPS.toLocaleString()} unit="QPS" accent={accentRgb} />

        <details className="mt-5">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Store size breakdown</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label="Node store (15B/node)" value={fmt2(r.store.nodeStoreGB)} unit="GB" />
            <WorkingRow label="Relationship store (34B/rel)" value={fmt2(r.store.relStoreGB)} unit="GB" />
            <WorkingRow label="Property store" value={fmt2(r.store.propStoreGB)} unit="GB" />
            <WorkingRow label={`Native index (${(inp.nativeIndexFraction*100).toFixed(0)}% of data)`} value={fmt2(r.store.nativeIndexGB)} unit="GB" />
            <WorkingRow label={`Format overhead × ${inp.storeFormatOverhead}`} value={fmt2(r.store.formattedStoreGB)} unit="GB" />
            <WorkingRow label={`Growth headroom +${(inp.storeGrowthHeadroom*100).toFixed(0)}%`} value={fmt2(r.store.storeWithGrowthGB)} unit="GB" />
          </div>
        </details>

        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Memory breakdown</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Page cache (+${(inp.pageCacheMargin*100).toFixed(0)}% margin)`} value={fmt2(r.memory.pageCacheGB)} unit="GB" />
            <WorkingRow label="Query / planner heap" value={fmt2(r.memory.queryHeapGB)} unit="GB" />
            <WorkingRow label="Tx state heap" value={fmt2(r.memory.txHeapGB)} unit="GB" />
            <WorkingRow label="Recommended heap (JVM)" value={r.memory.recommendedHeapGB} unit="GB" />
            <WorkingRow label="OS + off-heap reserve" value={inp.osOffHeapReserveGB} unit="GB" />
            <WorkingRow label="Vector index" value={inp.vectorIndexGB} unit="GB" />
            <WorkingRow label="Raw per-node RAM" value={fmt2(r.memory.perNodeRAMRawGB)} unit="GB" />
          </div>
        </details>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-5 mb-2">neo4j.conf</p>
        <div className="rounded-lg border border-white/[0.07] p-3">
          <ConfRow k="server.memory.heap.initial_size"       v={`${r.conf.heapInitialGB}g`} />
          <ConfRow k="server.memory.heap.max_size"           v={`${r.conf.heapMaxGB}g`} />
          <ConfRow k="server.memory.pagecache.size"          v={`${r.conf.pagecacheSizeGB.toFixed(1)}g`} />
          <ConfRow k="db.memory.transaction.total.max"       v={`${r.conf.txMemoryTotalMaxGB}g`} />
          <ConfRow k="db.tx_log.rotation.retention_policy"   v={r.conf.txLogRotation} />
          <ConfRow k="initial.server.mode_constraint"        v={inp.highAvailability ? "PRIMARY" : "SINGLE"} />
        </div>
      </div>
    </div>
  );
}

// ── Elasticsearch form + results ──────────────────────────────────────────────

function ElasticForm({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const [inp, setInp] = useState<ElasticInputs>(ELASTIC_DEFAULTS);
  const r = useMemo(() => calcElastic(inp), [inp]);
  const set = <K extends keyof ElasticInputs>(k: K, v: ElasticInputs[K]) => setInp(p => ({ ...p, [k]: v }));
  const fmt = (n: number) => n < 1 ? n.toFixed(3) : n.toFixed(1);
  const isSearch = inp.workloadType === "Search";

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
      {/* Inputs */}
      <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto px-6 py-5 border-r border-white/[0.07]">
        <SectionTitle>Workload profile</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <SelField<ElasticWorkload> label="Workload type" value={inp.workloadType} onChange={v => set("workloadType", v)} options={["Logs", "Search"]} note="Logs = ILM tiers; Search = single corpus" />
          {isSearch
            ? <NumField label="Corpus size (GB)" value={inp.searchCorpusGB} min={1} step={100} onChange={v => set("searchCorpusGB", v)} note="Raw JSON corpus" />
            : <NumField label="Daily ingest (GB)" value={inp.dailyIngestGB} min={1} step={50} onChange={v => set("dailyIngestGB", v)} note="Raw JSON / day today" />
          }
          <NumField label="Avg doc size (B)" value={inp.avgDocSizeB} min={100} step={100} onChange={v => set("avgDocSizeB", v)} />
          <NumField label="Annual growth" value={inp.annualGrowthPct} min={0} step={0.1} onChange={v => set("annualGrowthPct", v)} note="0.4 = 40%/yr" />
          <NumField label="Horizon (years)" value={inp.horizonYears} min={1} step={1} onChange={v => set("horizonYears", v)} />
          <NumField label="Index expansion ratio" value={inp.indexExpansionRatio} min={1} step={0.05} onChange={v => set("indexExpansionRatio", v)} note="indexed / raw (1.0–1.5)" />
        </div>

        {!isSearch && (
          <>
            <SectionTitle>ILM tiers &amp; replicas</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Hot retention (days)" value={inp.hotRetentionDays} min={1} step={1} onChange={v => set("hotRetentionDays", v)} />
              <NumField label="Hot replicas" value={inp.hotReplicas} min={0} step={1} onChange={v => set("hotReplicas", v)} note="1 = HA minimum" />
              <NumField label="Warm retention (days)" value={inp.warmRetentionDays} min={0} step={1} onChange={v => set("warmRetentionDays", v)} note="0 = no warm tier" />
              <NumField label="Warm replicas" value={inp.warmReplicas} min={0} step={1} onChange={v => set("warmReplicas", v)} />
              <NumField label="Cold retention (days)" value={inp.coldRetentionDays} min={0} step={1} onChange={v => set("coldRetentionDays", v)} note="0 = no cold tier" />
              <NumField label="Cold replicas" value={inp.coldReplicas} min={0} step={1} onChange={v => set("coldReplicas", v)} note="0 = searchable snapshots" />
            </div>
          </>
        )}

        <SectionTitle>Storage parameters</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Force-merge gain" value={inp.forceMergeGain} min={1} step={0.05} onChange={v => set("forceMergeGain", v)} note="warm/cold size reduction" />
          <NumField label="Disk util. target" value={inp.diskUtilTarget} min={0.5} step={0.05} onChange={v => set("diskUtilTarget", v)} note="0.8 = 80%" />
          <NumField label="Merge headroom" value={inp.mergeHeadroom} min={1} step={0.05} onChange={v => set("mergeHeadroom", v)} note="transient space multiplier" />
          <NumField label="FS cache target" value={inp.fsCacheTargetFraction} min={0.01} step={0.01} onChange={v => set("fsCacheTargetFraction", v)} note="logs 0.03; search 0.5" />
        </div>

        <SectionTitle>Performance</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Peak/avg ingest ratio" value={inp.peakToAvgIngestRatio} min={1} step={0.1} onChange={v => set("peakToAvgIngestRatio", v)} />
          <NumField label="Ingest MB/s per vCPU" value={inp.ingestThroughputPerVcpu} min={0.5} step={0.5} onChange={v => set("ingestThroughputPerVcpu", v)} note="simple logs ≈3, ML ≈0.5" />
          <NumField label="Peak search QPS" value={inp.peakSearchQPS} min={1} step={10} onChange={v => set("peakSearchQPS", v)} />
          <NumField label="Search QPS per vCPU" value={inp.searchQPSPerVcpu} min={1} step={5} onChange={v => set("searchQPSPerVcpu", v)} />
        </div>

        <SectionTitle>Node shape &amp; shards</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Max RAM/node (GB)" value={inp.maxRamPerNodeGB} min={16} step={16} onChange={v => set("maxRamPerNodeGB", v)} />
          <NumField label="Max vCPU/node" value={inp.maxVcpuPerNode} min={4} step={4} onChange={v => set("maxVcpuPerNode", v)} />
          <NumField label="Max disk/node (GB)" value={inp.maxDiskPerNodeGB} min={500} step={500} onChange={v => set("maxDiskPerNodeGB", v)} />
          <NumField label="JVM heap fraction" value={inp.jvmHeapFraction} min={0.3} step={0.05} onChange={v => set("jvmHeapFraction", v)} note="max 31 GB hard ceiling" />
          <NumField label="Target shard size (GB)" value={inp.targetShardSizeGB} min={5} step={5} onChange={v => set("targetShardSizeGB", v)} note="10–50 GB typical" />
          <NumField label="Max shards / GB heap" value={inp.maxShardsPerGBHeap} min={5} step={5} onChange={v => set("maxShardsPerGBHeap", v)} note="Elastic limit = 20" />
        </div>

        <SectionTitle>Cluster options</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <BoolField label="Dedicated masters" value={inp.dedicatedMasters} onChange={v => set("dedicatedMasters", v)} note="3 master-eligible nodes" />
          <BoolField label="Coordinating nodes" value={inp.dedicatedCoordinating} onChange={v => set("dedicatedCoordinating", v)} note="query routers for agg fan-out" />
          <NumField label="Snapshot retention (days)" value={inp.snapshotRetentionDays} min={1} step={30} onChange={v => set("snapshotRetentionDays", v)} />
          <NumField label="Hot disk:RAM ratio" value={inp.hotDiskRamRatio} min={5} step={5} onChange={v => set("hotDiskRamRatio", v)} note="GB disk / GB RAM" />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Data-node recommendation</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Hot nodes" value={r.hotTier.recommendedHotNodes} unit="nodes" accent={accentRgb} />
          <MetricCard label="Warm nodes" value={r.warmColdTier.recommendedWarmNodes} unit="nodes" accent={accentRgb} />
          <MetricCard label="Cold nodes" value={r.warmColdTier.recommendedColdNodes} unit="nodes" accent={accentRgb} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
          Per-node shape — {inp.maxRamPerNodeGB} GB RAM · {r.hotTier.perHotNodeVcpu} vCPU (hot) · {r.hotTier.diskPerHotNodeGB.toLocaleString()} GB NVMe (hot)
        </p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Total data nodes" value={r.cluster.totalDataNodes} unit="nodes" accent={accentRgb} />
          <MetricCard label={`+ ${r.cluster.masterNodes} master${r.cluster.coordinatingNodes ? ` + ${r.cluster.coordinatingNodes} coord` : ""}`} value={r.cluster.totalNodes} unit="total nodes" accent={accentRgb} />
          <MetricCard label="Total provisioned disk" value={Math.round(r.cluster.totalDataTierDisk).toLocaleString()} unit="GB" accent={accentRgb} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Total data-tier RAM" value={r.cluster.totalDataTierRAM} unit="GB" accent={accentRgb} />
          <MetricCard label="Total data-tier vCPU" value={r.cluster.totalDataTierVcpu} unit="cores" accent={accentRgb} />
          <MetricCard label="Total shards" value={Math.round(r.cluster.totalShards).toLocaleString()} unit="shards" accent={accentRgb} />
        </div>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Data footprint breakdown</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            {isSearch ? (
              <>
                <WorkingRow label={`Corpus at horizon (${inp.horizonYears}yr)`} value={fmt(r.dataFootprint.searchCorpusAtHorizon)} unit="GB raw" />
                <WorkingRow label={`Hot primary (× ${inp.indexExpansionRatio} expansion)`} value={fmt(r.dataFootprint.hotPrimaryGB)} unit="GB" />
              </>
            ) : (
              <>
                <WorkingRow label={`Daily ingest at horizon`} value={fmt(r.dataFootprint.dailyIngestAtHorizon)} unit="GB/day" />
                <WorkingRow label={`Daily indexed (× ${inp.indexExpansionRatio})`} value={fmt(r.dataFootprint.dailyIndexedGB)} unit="GB/day" />
                <WorkingRow label={`Hot primary (${inp.hotRetentionDays}d)`} value={fmt(r.dataFootprint.hotPrimaryGB)} unit="GB" />
                <WorkingRow label={`Hot + replicas (× ${1 + inp.hotReplicas})`} value={fmt(r.dataFootprint.hotWithReplicasGB)} unit="GB" />
                {inp.warmRetentionDays > 0 && <WorkingRow label={`Warm + replicas (${inp.warmRetentionDays}d, force-merged)`} value={fmt(r.dataFootprint.warmWithReplicasGB)} unit="GB" />}
                {inp.coldRetentionDays > 0 && <WorkingRow label={`Cold + replicas (${inp.coldRetentionDays}d)`} value={fmt(r.dataFootprint.coldWithReplicasGB)} unit="GB" />}
              </>
            )}
            <WorkingRow label="Total on disk (all tiers)" value={fmt(r.dataFootprint.totalOnDiskGB)} unit="GB" />
            <WorkingRow label={`Provisioned (+ ${((inp.mergeHeadroom-1)*100).toFixed(0)}% headroom ÷ ${(inp.diskUtilTarget*100).toFixed(0)}% target)`} value={fmt(r.dataFootprint.totalProvisionedGB)} unit="GB" />
            <WorkingRow label="Snapshot repository (object store)" value={fmt(r.dataFootprint.snapshotRepositoryGB)} unit="GB" />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">CPU demand</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Indexing cores (peak MB/s × ${1 + inp.hotReplicas} copies ÷ ${inp.ingestThroughputPerVcpu} MB/s/core)`} value={r.cpu.indexingCores} />
            <WorkingRow label={`Search cores (${inp.peakSearchQPS} QPS ÷ ${inp.searchQPSPerVcpu} QPS/core)`} value={r.cpu.searchCores} />
            <WorkingRow label="Merge &amp; background allowance (20%)" value={r.cpu.mergeAllowanceCores} />
            <WorkingRow label="Total vCPU demand" value={r.cpu.totalVcpuDemand} />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Hot-tier node sizing rationale</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`JVM heap / node (min(${inp.maxJvmHeapGB}, RAM×${inp.jvmHeapFraction}))`} value={fmt(r.hotTier.jvmHeapPerNodeGB)} unit="GB" />
            <WorkingRow label="Free RAM / node (page cache)" value={fmt(r.hotTier.freeRamPerNodeGB)} unit="GB" />
            <WorkingRow label="Disk / hot node" value={r.hotTier.diskPerHotNodeGB.toLocaleString()} unit="GB" />
            <WorkingRow label={`Primary shards / ${isSearch ? "corpus" : "day-index"}`} value={r.hotTier.primaryShardsPerIndex} />
            <WorkingRow label="Hot-tier shards total" value={Math.round(r.hotTier.hotTierShards)} />
            <WorkingRow label={`Shard capacity / node (heap × ${inp.maxShardsPerGBHeap})`} value={Math.round(r.hotTier.shardCapacityPerNode)} />
            <WorkingRow label="Nodes by disk" value={r.hotTier.hotNodesByDisk} />
            <WorkingRow label="Nodes by CPU" value={r.hotTier.hotNodesByCPU} />
            <WorkingRow label="Nodes by shard count" value={r.hotTier.hotNodesByShardCount} />
            <WorkingRow label="Nodes by page cache" value={r.hotTier.hotNodesByPageCache} />
            <WorkingRow label="Achieved page-cache coverage" value={(r.hotTier.achievedPageCacheCoverage * 100).toFixed(1)} unit="%" />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Shard summary</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label="Hot-tier shards" value={Math.round(r.hotTier.hotTierShards)} />
            <WorkingRow label="Warm-tier shards" value={Math.round(r.warmColdTier.warmTierShards)} />
            <WorkingRow label="Cold-tier shards" value={Math.round(r.warmColdTier.coldTierShards)} />
            <WorkingRow label="Total cluster shards" value={Math.round(r.cluster.totalShards)} />
            <WorkingRow label="Avg shards per data node" value={r.cluster.shardsPerDataNode.toFixed(1)} />
          </div>
        </details>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">elasticsearch.yml / ILM</p>
        <div className="rounded-lg border border-white/[0.07] p-3 mb-4">
          <ConfRow k="-Xms / -Xmx (jvm.options)"                    v={`${r.conf.jvmXmxGB}g`} />
          <ConfRow k="index.number_of_shards"                        v={r.conf.primaryShardsPerIndex} />
          <ConfRow k="index.number_of_replicas"                      v={r.conf.replicas} />
          <ConfRow k="index.refresh_interval"                        v={r.conf.refreshInterval} />
          <ConfRow k="ILM rollover: max_primary_shard_size"          v={`${r.conf.ilmRolloverSizeGB}GB`} />
          <ConfRow k="ILM rollover: max_age"                         v="1d" />
          {!isSearch && <>
            <ConfRow k="ILM: warm phase at"                          v={`${r.conf.ilmWarmPhaseAtDays}d`} />
            <ConfRow k="ILM: cold phase at"                          v={`${r.conf.ilmColdPhaseAtDays}d`} />
            <ConfRow k="ILM: delete at"                              v={`${r.conf.ilmDeleteAtDays}d`} />
          </>}
          <ConfRow k="bootstrap.memory_lock"                         v="true" />
          <ConfRow k="disk watermarks (low/high/flood)"              v="85% / 90% / 95%" />
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3 text-[11px] text-white/35 leading-relaxed">
          <strong className="text-white/50">Notes: </strong>
          Never set <code className="text-[10px] bg-white/5 px-1 rounded">-Xmx</code> to 32 GB or above — compressed OOPs are lost and usable heap actually drops.
          Half of RAM must stay free for the Lucene page cache; the heap and the page cache together decide query latency.
          {isSearch ? " For a search corpus, aim for page-cache coverage ≥ 0.5 (whole index in RAM)." : " Over-sharding is the commonest Elasticsearch failure: keep ≤20 shards/GB heap."}
        </div>
      </div>
    </div>
  );
}

// ── MongoDB form + results ─────────────────────────────────────────────────────

function MongoDBForm({ accent, accentRgb }: { accent: string; accentRgb: string }) {
  const [inp, setInp] = useState<MongoDBInputs>(MONGODB_DEFAULTS);
  const r = useMemo(() => calcMongoDB(inp), [inp]);
  const set = <K extends keyof MongoDBInputs>(k: K, v: MongoDBInputs[K]) => setInp(p => ({ ...p, [k]: v }));
  const fmt = (n: number) => n.toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-0 flex-1 min-h-0">
      {/* Inputs */}
      <div className="lg:w-[340px] flex-shrink-0 overflow-y-auto px-6 py-5 border-r border-white/[0.07]">
        <SectionTitle>Document model &amp; growth</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Documents today" value={inp.docCount} min={1000} step={1000000} onChange={v => set("docCount", v)} />
          <NumField label="Avg doc size (B)" value={inp.avgDocSizeB} min={100} step={100} onChange={v => set("avgDocSizeB", v)} />
          <NumField label="Annual growth" value={inp.annualGrowthPct} min={0} step={0.1} onChange={v => set("annualGrowthPct", v)} note="0.5 = 50%/yr" />
          <NumField label="Horizon (years)" value={inp.horizonYears} min={1} step={1} onChange={v => set("horizonYears", v)} />
          <NumField label="Indexes / collection" value={inp.indexesPerCollection} min={1} step={1} onChange={v => set("indexesPerCollection", v)} />
          <NumField label="Avg index entry (B)" value={inp.avgIndexEntrySizeB} min={8} step={4} onChange={v => set("avgIndexEntrySizeB", v)} />
        </div>
        <SectionTitle>Storage &amp; caching</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Data compression" value={inp.dataCompressionRatio} min={1} step={0.5} onChange={v => set("dataCompressionRatio", v)} note="snappy ≈3, zstd ≈5" />
          <NumField label="Index compression" value={inp.indexCompressionRatio} min={1} step={0.5} onChange={v => set("indexCompressionRatio", v)} />
          <NumField label="Hot working set %" value={inp.workingSetFraction} min={0.01} step={0.05} onChange={v => set("workingSetFraction", v)} note="0–1 fraction" />
          <NumField label="Cache hit ratio" value={inp.cacheHitRatio} min={0.5} step={0.01} onChange={v => set("cacheHitRatio", v)} note="0–1" />
        </div>
        <SectionTitle>Throughput</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <NumField label="Peak connections" value={inp.peakConnections} min={10} step={100} onChange={v => set("peakConnections", v)} />
          <NumField label="Read ops/sec" value={inp.readOpsPerSec} min={1} step={1000} onChange={v => set("readOpsPerSec", v)} />
          <NumField label="Write ops/sec" value={inp.writeOpsPerSec} min={1} step={1000} onChange={v => set("writeOpsPerSec", v)} />
          <NumField label="Write amplification" value={inp.writeAmplification} min={1} step={1} onChange={v => set("writeAmplification", v)} note="journal + oplog" />
          <NumField label="Read ops/core" value={inp.readOpsPerCore} min={100} step={500} onChange={v => set("readOpsPerCore", v)} />
          <NumField label="Write ops/core" value={inp.writeOpsPerCore} min={100} step={250} onChange={v => set("writeOpsPerCore", v)} />
        </div>
        <SectionTitle>Cluster &amp; HA</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <BoolField label="High availability" value={inp.haRequired} onChange={v => set("haRequired", v)} note="3-member replica set" />
          <BoolField label="Aggregation heavy" value={inp.aggregationHeavy} onChange={v => set("aggregationHeavy", v)} note="Adds CPU + cache buffer" />
          <NumField label="Oplog retention (hrs)" value={inp.oplogRetentionHrs} min={1} step={1} onChange={v => set("oplogRetentionHrs", v)} />
          <NumField label="Max RAM/node (GB)" value={inp.maxRamPerNodeGB} min={32} step={32} onChange={v => set("maxRamPerNodeGB", v)} />
          <NumField label="Max disk/node (GB)" value={inp.maxDiskPerNodeGB} min={100} step={500} onChange={v => set("maxDiskPerNodeGB", v)} />
          <NumField label="Max vCPU/node" value={inp.maxVcpuPerNode} min={4} step={4} onChange={v => set("maxVcpuPerNode", v)} />
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Per-node recommendation</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="RAM per node" value={r.perNode.recommendedRAMGB} unit="GB" accent={accentRgb} />
          <MetricCard label="vCPU per node" value={r.perNode.recommendedVcpu} unit="cores" accent={accentRgb} />
          <MetricCard label="Disk per node" value={r.perNode.recommendedDiskGB} unit="GB" accent={accentRgb} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
          Cluster — {r.sharding.recommendedShards} shard{r.sharding.recommendedShards > 1 ? "s" : ""} × {r.cluster.membersPerShard} member{r.cluster.membersPerShard > 1 ? "s" : ""} = {r.cluster.dataBearingNodes} data-bearing nodes
          {r.sharding.recommendedShards > 1 ? ` + ${r.cluster.configNodes} config + ${r.cluster.mongosRouters} mongos` : ""}
        </p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MetricCard label="Total cluster RAM" value={r.cluster.totalRAMGB} unit="GB" accent={accentRgb} />
          <MetricCard label="Total vCPU" value={r.cluster.totalVcpu} unit="cores" accent={accentRgb} />
          <MetricCard label="Total disk" value={r.cluster.totalDiskGB} unit="GB" accent={accentRgb} />
        </div>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Data footprint breakdown</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Docs at horizon (${inp.horizonYears}yr @ +${(inp.annualGrowthPct*100).toFixed(0)}%/yr)`} value={Math.round(r.dataFootprint.docsAtHorizon / 1e6)} unit="M docs" />
            <WorkingRow label="Logical data (uncompressed)" value={fmt(r.dataFootprint.logicalDataGB)} unit="GB" />
            <WorkingRow label="Indexes (uncompressed)" value={fmt(r.dataFootprint.indexSizeUncompGB)} unit="GB" />
            <WorkingRow label={`Compressed data (÷${inp.dataCompressionRatio})`} value={fmt(r.dataFootprint.storedDataGB)} unit="GB" />
            <WorkingRow label={`Compressed indexes (÷${inp.indexCompressionRatio})`} value={fmt(r.dataFootprint.storedIndexGB)} unit="GB" />
            <WorkingRow label="Provisioned disk (+ oplog + 70% target)" value={fmt(r.dataFootprint.provisionedDiskGB)} unit="GB" />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Memory (WiredTiger cache) breakdown</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Hot working set (${(inp.workingSetFraction*100).toFixed(0)}% of logical)`} value={fmt(r.memoryDemand.hotWorkingSetGB)} unit="GB" />
            <WorkingRow label="Index working set (all indexes, uncompressed)" value={fmt(r.memoryDemand.indexWorkingSetGB)} unit="GB" />
            {inp.aggregationHeavy && <WorkingRow label="Aggregation pipeline allowance" value={fmt(r.memoryDemand.aggAllowanceGB)} unit="GB" />}
            <WorkingRow label="Required WT cache" value={fmt(r.memoryDemand.requiredWTCacheGB)} unit="GB" />
            <WorkingRow label="Connection memory (~1 MB each)" value={fmt(r.memoryDemand.connectionMemGB)} unit="GB" />
            <WorkingRow label="Implied server RAM (cache ÷ 0.5 + reserves)" value={fmt(r.memoryDemand.impliedRAMGB)} unit="GB" />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">Shard sizing rationale</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Shards by RAM (÷${inp.maxRamPerNodeGB} GB)`} value={r.sharding.shardsByRAM} />
            <WorkingRow label={`Shards by disk (÷${inp.maxDiskPerNodeGB} GB)`} value={r.sharding.shardsByDisk} />
            <WorkingRow label={`Shards by CPU (÷${inp.maxVcpuPerNode} vCPU)`} value={r.sharding.shardsByCPU} />
            <WorkingRow label="Recommended shards" value={r.sharding.recommendedShards} />
          </div>
        </details>

        <details className="mb-4">
          <summary className="cursor-pointer text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors mb-2">IOPS estimate (per shard primary)</summary>
          <div className="rounded-lg border border-white/[0.07] p-3 mt-2">
            <WorkingRow label={`Read IOPS (cache miss × 2 ÷ ${r.sharding.recommendedShards} shards)`} value={fmt(r.perNode.readIOPS)} />
            <WorkingRow label={`Write IOPS (× ${inp.writeAmplification} amp ÷ ${r.sharding.recommendedShards} shards)`} value={fmt(r.perNode.writeIOPS)} />
            <WorkingRow label="Total IOPS per shard" value={r.perNode.totalIOPS} />
          </div>
        </details>

        <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">mongod configuration</p>
        <div className="rounded-lg border border-white/[0.07] p-3 mb-4">
          <ConfRow k="storage.wiredTiger.engineConfig.cacheSizeGB" v={r.conf.cacheSizeGB} />
          <ConfRow k="storage.wiredTiger.collectionConfig.blockCompressor" v={r.conf.blockCompressor} />
          <ConfRow k="replication.oplogSizeMB" v={r.conf.oplogSizeMB} />
          <ConfRow k="net.maxIncomingConnections" v={r.conf.maxIncomingConnections} />
        </div>

        <div className="rounded-lg border border-white/[0.07] p-3 text-[11px] text-white/35 leading-relaxed">
          <strong className="text-white/50">Notes: </strong>
          WT cache holds <em>uncompressed</em> pages — size it to fit the hot working set plus all indexes.
          Set <code className="text-[10px] bg-white/5 px-1 rounded">cacheSizeGB</code> to ~50% of available RAM.
          Use <code className="text-[10px] bg-white/5 px-1 rounded">zstd</code> compression for analytics-heavy workloads; <code className="text-[10px] bg-white/5 px-1 rounded">snappy</code> for low-latency OLTP.
        </div>
      </div>
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

export function SizingSheet({ tool, onClose }: Props) {
  const meta = TOOL_META[tool];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(1,6,18,0.88)", backdropFilter: "blur(8px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col w-full max-w-[1100px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(150deg, #050f22 0%, #070d1e 100%)",
          border: `1px solid rgba(${meta.accentRgb},0.18)`,
          boxShadow: `0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(${meta.accentRgb},0.06), inset 0 1px 0 rgba(255,255,255,0.04)`,
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-white/[0.07]"
          style={{ background: `rgba(${meta.accentRgb},0.04)` }}
        >
          <div
            className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ border: `1px solid rgba(${meta.accentRgb},0.3)`, background: `rgba(${meta.accentRgb},0.1)` }}
          >
            <Image src={meta.logo} alt={tool} width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight">{meta.name}</h2>
            <p className="text-[11px] text-white/40 mt-0.5">{meta.tagline}</p>
          </div>
          <div
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ color: meta.accent, background: `rgba(${meta.accentRgb},0.12)`, border: `1px solid rgba(${meta.accentRgb},0.25)` }}
          >
            Intel-AI Sizing Tool
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form + Results (fills remaining height) */}
        <div className="flex flex-col flex-1 min-h-0" style={{ height: "calc(92vh - 72px)" }}>
          {tool === "postgres" && <PGForm      accent={meta.accent} accentRgb={meta.accentRgb} />}
          {tool === "qdrant"   && <QdrantForm  accent={meta.accent} accentRgb={meta.accentRgb} />}
          {tool === "neo4j"    && <Neo4jForm   accent={meta.accent} accentRgb={meta.accentRgb} />}
          {tool === "mongodb"  && <MongoDBForm accent={meta.accent} accentRgb={meta.accentRgb} />}
          {tool === "elastic"  && <ElasticForm accent={meta.accent} accentRgb={meta.accentRgb} />}
        </div>
      </div>
    </div>
  );
}
