"use client";

import { useState } from "react";

// ── Architecture — disaggregated Prefill/Decode serving topology, CXL-pooled KV cache ──────
// A static reference diagram (not driven by the page's model/use-case/silicon state) showing
// the physical cluster topology this whole Deep Analysis tab's math assumes is achievable:
// independently-scaled Prefill and Decode GPU pools, with KV cache handed off between them over
// a CXL-attached memory pool rather than the GPU fabric itself. Click any node card (P1..P4 /
// D1..D4) to expand it into its own 2-socket/8-GPU node-level topology below.

interface TopoBoxProps {
  x: number; y: number; w: number; h: number; rx?: number;
  title?: string; subtitle?: string;
  accent?: string; tint?: boolean; dashed?: boolean;
  onClick?: () => void; selected?: boolean;
}

/** A single labeled box — neutral by default (matches the app's existing surface/border tokens),
 *  or tinted toward an accent color for pool/fabric-specific elements. `selected` adds a bright
 *  accent ring, used for the currently-expanded node card. */
function TopoBox({ x, y, w, h, rx = 10, title, subtitle, accent, tint, dashed, onClick, selected }: TopoBoxProps) {
  const stroke = selected ? (accent ?? "#22d3ee") : accent && tint ? accent : "var(--dm-border-a)";
  const fill = accent && tint ? `${accent}14` : "var(--dm-surface-a)";
  return (
    <g onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <rect
        x={x} y={y} width={w} height={h} rx={rx}
        fill={fill} stroke={stroke} strokeWidth={selected ? 2.25 : 1.25}
        strokeDasharray={dashed ? "5 4" : undefined}
        style={selected ? { filter: `drop-shadow(0 0 6px ${accent}80)` } : undefined}
      />
      {title && (
        <text
          x={x + w / 2} y={y + h / 2 + (subtitle ? -3 : 4)} textAnchor="middle"
          fontSize={12.5} fontWeight={700}
          fill={accent && (tint || selected) ? accent : "var(--dm-txt-primary)"}
        >
          {title}
        </text>
      )}
      {subtitle && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)" fontStyle={subtitle === "expanded" ? "italic" : undefined}>
          {subtitle}
        </text>
      )}
    </g>
  );
}

function Conn({ x1, y1, x2, y2, marker, dashed }: { x1: number; y1: number; x2: number; y2: number; marker?: string; dashed?: boolean }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="var(--dm-txt-faint)" strokeWidth={1.4}
      strokeDasharray={dashed ? "4 3" : undefined}
      markerEnd={marker ? `url(#${marker})` : undefined}
    />
  );
}

const PREFILL_ACCENT = "#6366f1"; // indigo — matches STAGE_COLORS.prefill on the Comparisons tab
const DECODE_ACCENT = "#ec4899";  // pink — matches STAGE_COLORS.decode
const CXL_ACCENT = "#f59e0b";     // amber — matches this app's existing KV/memory color convention

interface PoolNode { id: string; pool: "prefill" | "decode"; }
const PREFILL_NODES: PoolNode[] = [{ id: "P1", pool: "prefill" }, { id: "P2", pool: "prefill" }, { id: "P3", pool: "prefill" }, { id: "P4", pool: "prefill" }];
const DECODE_NODES: PoolNode[] = [{ id: "D1", pool: "decode" }, { id: "D2", pool: "decode" }, { id: "D3", pool: "decode" }, { id: "D4", pool: "decode" }];

/** The cluster-level topology: Host fabric on top, Prefill/Decode pools left/right (4 nodes ·
 *  32 GPUs each), a CXL switch + CXL-pooled KV memory bridging the two pools in the middle, and
 *  the GPU fabric (RDMA scale-out, carrying NIXL's P→D KV transfer) underneath both pools. */
function ClusterTopologyDiagram({ expandedNode, onToggleNode }: { expandedNode: string | null; onToggleNode: (id: string) => void }) {
  const W = 1200, H = 800;
  const poolY = 160, poolH = 470;
  const prefillX = 60, decodeX = 680, poolW = 460;
  const prefillCx = prefillX + poolW / 2;   // 290
  const decodeCx = decodeX + poolW / 2;     // 910
  const cardW = 180, cardH = 110, gap = 20;
  const gridX0Prefill = prefillX + 30, gridX0Decode = decodeX + 30;
  const gridY0 = 250;

  function cardPos(i: number, baseX: number) {
    const col = i % 2, row = Math.floor(i / 2);
    return { x: baseX + col * (cardW + gap), y: gridY0 + row * (cardH + gap) };
  }

  const cxlX = 540, cxlY = 280, cxlW = 120, cxlH = 90;
  const kvY = 410, kvH = 90;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: "block" }}>
      <defs>
        <marker id="cluster-ar" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M2 2L8 5L2 8" fill="none" stroke="var(--dm-txt-faint)" strokeWidth={1.4} />
        </marker>
      </defs>

      <TopoBox x={60} y={20} w={1080} h={90} title="Host fabric" subtitle="Ethernet · frontend, orchestration" />
      <Conn x1={prefillCx} y1={110} x2={prefillCx} y2={poolY} />
      <Conn x1={decodeCx} y1={110} x2={decodeCx} y2={poolY} />

      {/* Prefill pool */}
      <TopoBox x={prefillX} y={poolY} w={poolW} h={poolH} accent={PREFILL_ACCENT} tint />
      <text x={prefillCx} y={poolY + 40} textAnchor="middle" fontSize={14} fontWeight={800} fill={PREFILL_ACCENT}>Prefill pool</text>
      <text x={prefillCx} y={poolY + 60} textAnchor="middle" fontSize={11} fill="var(--dm-txt-muted)">{PREFILL_NODES.length} nodes · {PREFILL_NODES.length * 8} GPUs</text>
      {PREFILL_NODES.map((n, i) => {
        const { x, y } = cardPos(i, gridX0Prefill);
        const isExpanded = expandedNode === n.id;
        return (
          <TopoBox
            key={n.id} x={x} y={y} w={cardW} h={cardH}
            title={n.id} subtitle={isExpanded ? "expanded" : "8 GPU"}
            accent={PREFILL_ACCENT} selected={isExpanded}
            onClick={() => onToggleNode(n.id)}
          />
        );
      })}

      {/* Decode pool */}
      <TopoBox x={decodeX} y={poolY} w={poolW} h={poolH} accent={DECODE_ACCENT} tint />
      <text x={decodeCx} y={poolY + 40} textAnchor="middle" fontSize={14} fontWeight={800} fill={DECODE_ACCENT}>Decode pool</text>
      <text x={decodeCx} y={poolY + 60} textAnchor="middle" fontSize={11} fill="var(--dm-txt-muted)">{DECODE_NODES.length} nodes · {DECODE_NODES.length * 8} GPUs</text>
      {DECODE_NODES.map((n, i) => {
        const { x, y } = cardPos(i, gridX0Decode);
        const isExpanded = expandedNode === n.id;
        return (
          <TopoBox
            key={n.id} x={x} y={y} w={cardW} h={cardH}
            title={n.id} subtitle={isExpanded ? "expanded" : "8 GPU"}
            accent={DECODE_ACCENT} selected={isExpanded}
            onClick={() => onToggleNode(n.id)}
          />
        );
      })}

      {/* CXL switch + CXL-pooled KV memory, bridging the two pools */}
      <Conn x1={prefillX + poolW} y1={cxlY + cxlH / 2} x2={cxlX} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={cxlX} y1={cxlY + cxlH / 2} x2={prefillX + poolW} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={cxlX + cxlW} y1={cxlY + cxlH / 2} x2={decodeX} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={decodeX} y1={cxlY + cxlH / 2} x2={cxlX + cxlW} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <TopoBox x={cxlX} y={cxlY} w={cxlW} h={cxlH} title="CXL switch" subtitle="CXL 2.0/3.x" accent={CXL_ACCENT} tint />
      <Conn x1={cxlX + cxlW / 2} y1={cxlY + cxlH} x2={cxlX + cxlW / 2} y2={kvY} marker="cluster-ar" />
      <Conn x1={cxlX + cxlW / 2} y1={kvY} x2={cxlX + cxlW / 2} y2={cxlY + cxlH} marker="cluster-ar" />
      <TopoBox x={cxlX} y={kvY} w={cxlW} h={kvH} title="KV pool" subtitle="Type-3 DDR5" accent={CXL_ACCENT} tint />

      <Conn x1={prefillCx} y1={poolY + poolH} x2={prefillCx} y2={680} />
      <Conn x1={decodeCx} y1={poolY + poolH} x2={decodeCx} y2={680} />
      <TopoBox x={60} y={680} w={1080} h={90} title="GPU fabric" subtitle="RDMA scale-out · NIXL KV transfer P→D" />
    </svg>
  );
}

/** One node's internal topology — 2-socket host, 4 PCIe switches, 8 GPUs, 4 scale-out NICs, a
 *  CXL x16 port off the second socket feeding the cluster-level CXL switch/KV pool. Generic
 *  across every Prefill/Decode node; only the node id, pool accent color, and "Prefill"/"Decode"
 *  label change per node clicked. */
function NodeTopologyDiagram({ nodeId, pool }: { nodeId: string; pool: "prefill" | "decode" }) {
  const accent = pool === "prefill" ? PREFILL_ACCENT : DECODE_ACCENT;
  const W = 1220, H = 970;

  const hostNicX = 310, hostNicY = 180, hostNicW = 340, hostNicH = 70;
  const cxlPortX = 760, cxlPortY = 180, cxlPortW = 280, cxlPortH = 70;
  const cpuY = 310, cpuH = 90;
  const ddr0X = 70, ddr0W = 170;
  const cpu0X = 280, cpu0W = 220;
  const cpu1X = 680, cpu1W = 220;
  const ddr1X = 940, ddr1W = 210;
  const swY = 460, swH = 90, swW = 210;
  const switches = [
    { x: 70, cpu: 0 }, { x: 300, cpu: 0 },
    { x: 650, cpu: 1 }, { x: 880, cpu: 1 },
  ];
  const gpuY = 600, gpuH = 80, gpuW = 95;
  const nicY = 730, nicH = 70;

  function gpuPair(swX: number): [number, number] { return [swX, swX + gpuW + 20]; }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: "block" }}>
      <defs>
        <marker id="node-ar" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M2 2L8 5L2 8" fill="none" stroke="var(--dm-txt-faint)" strokeWidth={1.4} />
        </marker>
      </defs>

      <TopoBox x={hostNicX} y={20} w={hostNicW} h={80} title="Host fabric" />
      <TopoBox x={cxlPortX} y={20} w={cxlPortW} h={80} title="CXL switch" accent={CXL_ACCENT} tint />
      <Conn x1={hostNicX + hostNicW / 2} y1={100} x2={hostNicX + hostNicW / 2} y2={hostNicY} />
      <Conn x1={cxlPortX + cxlPortW / 2} y1={100} x2={cxlPortX + cxlPortW / 2} y2={cxlPortY} />

      <rect x={40} y={150} width={1140} height={670} rx={14} fill={`${accent}08`} stroke={accent} strokeWidth={1.25} strokeDasharray="6 5" />
      <text x={70} y={205} fontSize={14} fontWeight={800} fill={accent}>Node {nodeId}</text>
      <text x={70} y={225} fontSize={11} fill="var(--dm-txt-muted)">{pool === "prefill" ? "Prefill" : "Decode"} · 2S/8G</text>

      <TopoBox x={hostNicX} y={hostNicY} w={hostNicW} h={hostNicH} title="Host NIC" />
      <TopoBox x={cxlPortX} y={cxlPortY} w={cxlPortW} h={cxlPortH} title="CXL x16 port" accent={CXL_ACCENT} tint />

      <TopoBox x={ddr0X} y={cpuY} w={ddr0W} h={cpuH} title="DDR0" subtitle="DDR5 RDIMM" />
      <TopoBox x={cpu0X} y={cpuY} w={cpu0W} h={cpuH} title="CPU0" subtitle="PCIe Gen5 / CXL" accent={accent} />
      <TopoBox x={cpu1X} y={cpuY} w={cpu1W} h={cpuH} title="CPU1" subtitle="PCIe Gen5 / CXL" accent={accent} />
      <TopoBox x={ddr1X} y={cpuY} w={ddr1W} h={cpuH} title="DDR1" subtitle="DDR5 RDIMM" />

      <Conn x1={hostNicX + hostNicW / 2} y1={hostNicY + hostNicH} x2={cpu0X + cpu0W / 2} y2={cpuY} />
      <Conn x1={cxlPortX + cxlPortW / 2} y1={cxlPortY + cxlPortH} x2={cpu1X + cpu1W / 2} y2={cpuY} />
      <Conn x1={ddr0X + ddr0W} y1={cpuY + cpuH / 2} x2={cpu0X} y2={cpuY + cpuH / 2} />
      <Conn x1={cpu1X + cpu1W} y1={cpuY + cpuH / 2} x2={ddr1X} y2={cpuY + cpuH / 2} />
      <Conn x1={cpu0X + cpu0W} y1={cpuY + cpuH / 2 - 12} x2={cpu1X} y2={cpuY + cpuH / 2 - 12} />
      <text x={(cpu0X + cpu0W + cpu1X) / 2} y={cpuY + cpuH / 2 - 18} textAnchor="middle" fontSize={10} fill="var(--dm-txt-faint)">UPI</text>

      {switches.map((s, i) => {
        const cpuCx = s.cpu === 0 ? cpu0X + cpu0W / 2 : cpu1X + cpu1W / 2;
        return <Conn key={i} x1={cpuCx} y1={cpuY + cpuH} x2={s.x + swW / 2} y2={swY} />;
      })}
      {switches.map((s, i) => (
        <TopoBox key={i} x={s.x} y={swY} w={swW} h={swH} title={`PCIe switch ${i}`} subtitle="Gen5 x16 uplink" />
      ))}

      {switches.map((s, i) => {
        const [gx0, gx1] = gpuPair(s.x);
        return (
          <g key={i}>
            <Conn x1={s.x + swW / 2} y1={swY + swH} x2={gx0 + gpuW / 2} y2={gpuY} />
            <Conn x1={s.x + swW / 2} y1={swY + swH} x2={gx1 + gpuW / 2} y2={gpuY} />
          </g>
        );
      })}
      {switches.flatMap((s, i) => {
        const [gx0, gx1] = gpuPair(s.x);
        return [
          <TopoBox key={`${i}-0`} x={gx0} y={gpuY} w={gpuW} h={gpuH} title={`GPU${i * 2}`} accent={accent} tint />,
          <TopoBox key={`${i}-1`} x={gx1} y={gpuY} w={gpuW} h={gpuH} title={`GPU${i * 2 + 1}`} accent={accent} tint />,
        ];
      })}

      {switches.map((s, i) => {
        const [gx0, gx1] = gpuPair(s.x);
        return (
          <g key={i}>
            <Conn x1={gx0 + gpuW / 2} y1={gpuY + gpuH} x2={s.x + swW / 2} y2={nicY} />
            <Conn x1={gx1 + gpuW / 2} y1={gpuY + gpuH} x2={s.x + swW / 2} y2={nicY} />
            <TopoBox x={s.x} y={nicY} w={swW} h={nicH} title="Scale-out NIC" />
          </g>
        );
      })}

      {switches.map((s, i) => (
        <Conn key={i} x1={s.x + swW / 2} y1={nicY + nicH} x2={s.x + swW / 2} y2={860} marker="node-ar" />
      ))}
      <TopoBox x={40} y={860} w={1140} h={90} title="GPU fabric" subtitle="RDMA scale-out · NIXL KV transfer P→D" />
    </svg>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--dm-txt-muted)" }}>
      <i style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block", boxShadow: `0 0 6px ${color}90` }} />
      {label}
    </span>
  );
}

/** Top-level "Architecture" tab — a static reference for the disaggregated-serving cluster
 *  topology this app's Prefill/Decode/KV-Pool math is modeling stage-by-stage: independently
 *  scaled Prefill and Decode GPU pools that hand KV cache off over a CXL-pooled memory tier
 *  (rather than replaying prefill or shipping KV over the GPU fabric itself) — the "why" behind
 *  Prefill-TP's and Decode's separate communication models, and KV Pool's park/promote tiers,
 *  sitting one level up from any of those tabs' math. */
export function ArchitectureSection() {
  const [expandedNode, setExpandedNode] = useState<string | null>("P1");
  const allNodes = [...PREFILL_NODES, ...DECODE_NODES];
  const expanded = allNodes.find(n => n.id === expandedNode) ?? null;

  function toggleNode(id: string) {
    setExpandedNode(prev => (prev === id ? null : id));
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-6"
      style={{ borderColor: "var(--dm-border-a)", background: "var(--dm-table-bg)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid var(--dm-border-a)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--dm-txt-primary)" }}>Disaggregated Serving Architecture</h2>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: "var(--dm-txt-muted)" }}>
          Prefill and Decode run as independently-scaled GPU pools rather than one monolithic fleet — each sized and scheduled
          for its own bottleneck (Prefill: compute-bound; Decode: memory-bandwidth-bound, per the Decode tab's model). KV cache
          moves between them over a CXL-attached memory pool, not by replaying prefill or shipping KV across the GPU fabric.
          Click a node card below to see its internal topology.
        </p>
      </div>

      <div className="p-5">
        <ClusterTopologyDiagram expandedNode={expandedNode} onToggleNode={toggleNode} />

        <div className="flex flex-wrap gap-4 mt-4 mb-2">
          <Swatch color={PREFILL_ACCENT} label="Prefill pool" />
          <Swatch color={DECODE_ACCENT} label="Decode pool" />
          <Swatch color={CXL_ACCENT} label="CXL switch / KV pool" />
        </div>

        {expanded && (
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold" style={{ color: "var(--dm-txt-primary)" }}>
                Node {expanded.id} — {expanded.pool === "prefill" ? "Prefill" : "Decode"} node topology
              </p>
              <button
                type="button" onClick={() => setExpandedNode(null)}
                className="text-[11px] font-semibold rounded-lg px-2.5 py-1 transition-colors"
                style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-muted)" }}
              >
                Collapse
              </button>
            </div>
            <NodeTopologyDiagram nodeId={expanded.id} pool={expanded.pool} />
            <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
              2-socket host, 8 GPUs split across 4 PCIe Gen5 switches (2 GPUs/switch), each switch backed by its own scale-out
              RDMA NIC for GPU-fabric traffic. CPU1 carries the node's CXL x16 uplink to the cluster's CXL switch — the path KV
              cache actually takes out of this node, independent of the GPU-to-GPU RDMA fabric below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
