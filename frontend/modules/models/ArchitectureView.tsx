"use client";

import { useState } from "react";

// ── Architecture — disaggregated Prefill/Decode serving topology, CXL-pooled KV cache ──────
// A static reference diagram (not driven by the page's model/use-case/silicon state) showing
// the physical cluster topology this whole Deep Analysis tab's math assumes is achievable:
// independently-scaled Prefill and Decode GPU pools, with KV cache handed off between them over
// a CXL-attached memory pool rather than the GPU fabric itself. Click any node card (P1..P4 /
// D1..D4) to expand it into its own 2-socket/8-GPU node-level topology below.
//
// Deliberately plain black-on-white, not themed to the app's dark/light mode — every box is a
// white or light-gray fill with a black border, every label is black. A fixed white backdrop is
// drawn behind each diagram so it stays legible even when the page itself is in dark mode.

const INK = "#000000";
const SHADE = "#e5e5e5"; // light gray fill for pool/CXL/node-boundary containers
const FAINT_LINE = "#9ca3af"; // connector lines — gray, not black, so labels stay the strongest thing on the page

interface TopoBoxProps {
  x: number; y: number; w: number; h: number; rx?: number;
  title?: string; subtitle?: string;
  shaded?: boolean; dashed?: boolean;
  onClick?: () => void; selected?: boolean;
}

/** A single labeled box — white fill with a black border by default, or light-gray shaded for
 *  pool/fabric-level containers. `selected` just thickens the border (no color), used for the
 *  currently-expanded node card. */
function TopoBox({ x, y, w, h, rx = 10, title, subtitle, shaded, dashed, onClick, selected }: TopoBoxProps) {
  return (
    <g onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <rect
        x={x} y={y} width={w} height={h} rx={rx}
        fill={shaded ? SHADE : "#ffffff"} stroke={INK} strokeWidth={selected ? 3 : 1.25}
        strokeDasharray={dashed ? "5 4" : undefined}
      />
      {title && (
        <text x={x + w / 2} y={y + h / 2 + (subtitle ? -3 : 4)} textAnchor="middle" fontSize={12.5} fontWeight={700} fill={INK}>
          {title}
        </text>
      )}
      {subtitle && (
        <text x={x + w / 2} y={y + h / 2 + 15} textAnchor="middle" fontSize={10} fill={INK} fontStyle={subtitle === "expanded" ? "italic" : undefined}>
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
      stroke={FAINT_LINE} strokeWidth={1.4}
      strokeDasharray={dashed ? "4 3" : undefined}
      markerEnd={marker ? `url(#${marker})` : undefined}
    />
  );
}

interface PoolNode { id: string; pool: "prefill" | "decode"; }
const PREFILL_NODES: PoolNode[] = [{ id: "P1", pool: "prefill" }, { id: "P2", pool: "prefill" }, { id: "P3", pool: "prefill" }, { id: "P4", pool: "prefill" }];
const DECODE_NODES: PoolNode[] = [{ id: "D1", pool: "decode" }, { id: "D2", pool: "decode" }, { id: "D3", pool: "decode" }, { id: "D4", pool: "decode" }];

/** The cluster-level topology: Host fabric on top, Prefill/Decode pools left/right (4 nodes ·
 *  32 GPUs each), a CXL switch + CXL-pooled KV memory bridging the two pools in the middle, and
 *  the GPU fabric (RDMA scale-out, carrying NIXL's P→D KV transfer) underneath both pools. */
/** Sentinel `expandedNode` id for the CXL memory pool's own detail view — shares the same
 *  click-to-expand state as the P1..P4/D1..D4 node cards, just resolved to a different diagram
 *  by the caller (ArchitectureSection) instead of a NodeTopologyDiagram. */
const CXL_POOL_ID = "CXL";

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
          <path d="M2 2L8 5L2 8" fill="none" stroke={FAINT_LINE} strokeWidth={1.4} />
        </marker>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      <TopoBox x={60} y={20} w={1080} h={90} title="Host fabric" subtitle="Ethernet · frontend, orchestration" />
      <Conn x1={prefillCx} y1={110} x2={prefillCx} y2={poolY} />
      <Conn x1={decodeCx} y1={110} x2={decodeCx} y2={poolY} />

      {/* Prefill pool */}
      <TopoBox x={prefillX} y={poolY} w={poolW} h={poolH} shaded />
      <text x={prefillCx} y={poolY + 40} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>Prefill pool</text>
      <text x={prefillCx} y={poolY + 60} textAnchor="middle" fontSize={11} fill={INK}>{PREFILL_NODES.length} nodes · {PREFILL_NODES.length * 8} GPUs</text>
      {PREFILL_NODES.map((n, i) => {
        const { x, y } = cardPos(i, gridX0Prefill);
        const isExpanded = expandedNode === n.id;
        return (
          <TopoBox
            key={n.id} x={x} y={y} w={cardW} h={cardH}
            title={n.id} subtitle={isExpanded ? "expanded" : "8 GPU"}
            selected={isExpanded}
            onClick={() => onToggleNode(n.id)}
          />
        );
      })}

      {/* Decode pool */}
      <TopoBox x={decodeX} y={poolY} w={poolW} h={poolH} shaded />
      <text x={decodeCx} y={poolY + 40} textAnchor="middle" fontSize={14} fontWeight={800} fill={INK}>Decode pool</text>
      <text x={decodeCx} y={poolY + 60} textAnchor="middle" fontSize={11} fill={INK}>{DECODE_NODES.length} nodes · {DECODE_NODES.length * 8} GPUs</text>
      {DECODE_NODES.map((n, i) => {
        const { x, y } = cardPos(i, gridX0Decode);
        const isExpanded = expandedNode === n.id;
        return (
          <TopoBox
            key={n.id} x={x} y={y} w={cardW} h={cardH}
            title={n.id} subtitle={isExpanded ? "expanded" : "8 GPU"}
            selected={isExpanded}
            onClick={() => onToggleNode(n.id)}
          />
        );
      })}

      {/* CXL switch + CXL-pooled KV memory, bridging the two pools — click either box for the
          CXL memory appliance's own internal topology (switch fabric, EDSFF modules, fabric manager). */}
      <Conn x1={prefillX + poolW} y1={cxlY + cxlH / 2} x2={cxlX} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={cxlX} y1={cxlY + cxlH / 2} x2={prefillX + poolW} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={cxlX + cxlW} y1={cxlY + cxlH / 2} x2={decodeX} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <Conn x1={decodeX} y1={cxlY + cxlH / 2} x2={cxlX + cxlW} y2={cxlY + cxlH / 2} marker="cluster-ar" />
      <TopoBox
        x={cxlX} y={cxlY} w={cxlW} h={cxlH} title="CXL switch" subtitle={expandedNode === CXL_POOL_ID ? "expanded" : "CXL 2.0/3.x"}
        shaded selected={expandedNode === CXL_POOL_ID} onClick={() => onToggleNode(CXL_POOL_ID)}
      />
      <Conn x1={cxlX + cxlW / 2} y1={cxlY + cxlH} x2={cxlX + cxlW / 2} y2={kvY} marker="cluster-ar" />
      <Conn x1={cxlX + cxlW / 2} y1={kvY} x2={cxlX + cxlW / 2} y2={cxlY + cxlH} marker="cluster-ar" />
      <TopoBox
        x={cxlX} y={kvY} w={cxlW} h={kvH} title="KV pool" subtitle={expandedNode === CXL_POOL_ID ? "expanded" : "Type-3 DDR5"}
        shaded selected={expandedNode === CXL_POOL_ID} onClick={() => onToggleNode(CXL_POOL_ID)}
      />

      <Conn x1={prefillCx} y1={poolY + poolH} x2={prefillCx} y2={680} />
      <Conn x1={decodeCx} y1={poolY + poolH} x2={decodeCx} y2={680} />
      <TopoBox x={60} y={680} w={1080} h={90} title="GPU fabric" subtitle="RDMA scale-out · NIXL KV transfer P→D" />
    </svg>
  );
}

/** One node's internal topology — 2-socket host, 4 PCIe switches, 8 GPUs, 4 scale-out NICs, a
 *  CXL x16 port off the second socket feeding the cluster-level CXL switch/KV pool. Generic
 *  across every Prefill/Decode node; only the node id and "Prefill"/"Decode" label change per
 *  node clicked. */
function NodeTopologyDiagram({ nodeId, pool }: { nodeId: string; pool: "prefill" | "decode" }) {
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
          <path d="M2 2L8 5L2 8" fill="none" stroke={FAINT_LINE} strokeWidth={1.4} />
        </marker>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      <TopoBox x={hostNicX} y={20} w={hostNicW} h={80} title="Host fabric" />
      <TopoBox x={cxlPortX} y={20} w={cxlPortW} h={80} title="CXL switch" shaded />
      <Conn x1={hostNicX + hostNicW / 2} y1={100} x2={hostNicX + hostNicW / 2} y2={hostNicY} />
      <Conn x1={cxlPortX + cxlPortW / 2} y1={100} x2={cxlPortX + cxlPortW / 2} y2={cxlPortY} />

      <rect x={40} y={150} width={1140} height={670} rx={14} fill={SHADE} stroke={INK} strokeWidth={1.25} strokeDasharray="6 5" />
      <text x={70} y={205} fontSize={14} fontWeight={800} fill={INK}>Node {nodeId}</text>
      <text x={70} y={225} fontSize={11} fill={INK}>{pool === "prefill" ? "Prefill" : "Decode"} · 2S/8G</text>

      <TopoBox x={hostNicX} y={hostNicY} w={hostNicW} h={hostNicH} title="Host NIC" />
      <TopoBox x={cxlPortX} y={cxlPortY} w={cxlPortW} h={cxlPortH} title="CXL x16 port" shaded />

      <TopoBox x={ddr0X} y={cpuY} w={ddr0W} h={cpuH} title="DDR0" subtitle="DDR5 RDIMM" />
      <TopoBox x={cpu0X} y={cpuY} w={cpu0W} h={cpuH} title="CPU0" subtitle="PCIe Gen5 / CXL" />
      <TopoBox x={cpu1X} y={cpuY} w={cpu1W} h={cpuH} title="CPU1" subtitle="PCIe Gen5 / CXL" />
      <TopoBox x={ddr1X} y={cpuY} w={ddr1W} h={cpuH} title="DDR1" subtitle="DDR5 RDIMM" />

      <Conn x1={hostNicX + hostNicW / 2} y1={hostNicY + hostNicH} x2={cpu0X + cpu0W / 2} y2={cpuY} />
      <Conn x1={cxlPortX + cxlPortW / 2} y1={cxlPortY + cxlPortH} x2={cpu1X + cpu1W / 2} y2={cpuY} />
      <Conn x1={ddr0X + ddr0W} y1={cpuY + cpuH / 2} x2={cpu0X} y2={cpuY + cpuH / 2} />
      <Conn x1={cpu1X + cpu1W} y1={cpuY + cpuH / 2} x2={ddr1X} y2={cpuY + cpuH / 2} />
      <Conn x1={cpu0X + cpu0W} y1={cpuY + cpuH / 2 - 12} x2={cpu1X} y2={cpuY + cpuH / 2 - 12} />
      <text x={(cpu0X + cpu0W + cpu1X) / 2} y={cpuY + cpuH / 2 - 18} textAnchor="middle" fontSize={10} fill={INK}>UPI</text>

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
          <TopoBox key={`${i}-0`} x={gx0} y={gpuY} w={gpuW} h={gpuH} title={`GPU${i * 2}`} shaded />,
          <TopoBox key={`${i}-1`} x={gx1} y={gpuY} w={gpuW} h={gpuH} title={`GPU${i * 2 + 1}`} shaded />,
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

/** A small multi-line label — SVG text doesn't wrap on its own, so callouts/long subtitles are
 *  broken into explicit lines here rather than left to overflow. */
function TextLines({ x, y, lines, size = 10, weight = 400, anchor = "start", lineHeight = 14 }: {
  x: number; y: number; lines: string[]; size?: number; weight?: number; anchor?: "start" | "middle"; lineHeight?: number;
}) {
  return (
    <>
      {lines.map((line, i) => (
        <text key={i} x={x} y={y + i * lineHeight} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={INK}>
          {line}
        </text>
      ))}
    </>
  );
}

/** The CXL memory appliance's own internals — what "KV pool" and "CXL switch" in the cluster
 *  diagram actually are physically: each compute node reaches a switch-attached, Type-3 DRAM
 *  pool over CXL lanes off its CPU's native root ports (no separate "CXL card" needed — the
 *  slot card is just a retimer). The switch fans upstream (host-facing) ports to downstream
 *  (memory-facing) ports and partitions one physical pool into per-host slices (MLD) that a
 *  Fabric Manager binds/reassigns live; the DRAM itself lives on EDSFF modules, each fronted by
 *  its own CXL controller ASIC translating CXL.mem to/from DDR — there's no CPU on that side. */
function CxlPoolDetailDiagram() {
  const W = 1440, H = 980;

  const nodeW = 440, nodeH = 190, nodeX = 40;
  const nodeYs = [40, 260, 480];

  const applianceX = 720, applianceY = 40, applianceW = 680, applianceH = 700;
  const switchX = 940, switchY = 130, switchW = 200, switchH = 380;
  const usX = 760, usW = 110, usH = 70;
  const usYs = [150, 290, 430];
  const dsX = 1200, dsW = 90, dsH = 60;
  const dsYs = [140, 295, 450, 605]; // top edge of each DS port box
  const moduleX0 = 1330, moduleW = 90, moduleH = 70, moduleGapY = 10;
  // Two Type-3 modules per DS port, the pair vertically centered on that port.
  const moduleYs = dsYs.flatMap(dy => {
    const center = dy + dsH / 2;
    return [center - moduleGapY / 2 - moduleH, center + moduleGapY / 2];
  });
  const fmX = 940, fmY = 560, fmW = 200, fmH = 90;

  const calloutY = 800, calloutH = 150, calloutW = 440, calloutGap = 30;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: "block" }}>
      <defs>
        <marker id="cxl-ar" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
          <path d="M2 2L8 5L2 8" fill="none" stroke={FAINT_LINE} strokeWidth={1.4} />
        </marker>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#ffffff" />

      <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight={800} fill={INK}>CXL memory pooling — the physical view</text>

      {/* compute nodes */}
      {nodeYs.map((ny, i) => {
        const cpuX = nodeX + 20, cpuY = ny + 35, cpuW = 230, cpuH = 115;
        const ddrX = nodeX + 260, ddrW = 70, ddrH = 40;
        const cardX = nodeX + 260, cardY = ny + 90, cardW = 150, cardH = 60;
        const usIdx = i;
        return (
          <g key={i}>
            <rect x={nodeX} y={ny} width={nodeW} height={nodeH} rx={10} fill="#ffffff" stroke={INK} strokeWidth={1.25} />
            <text x={nodeX + 16} y={ny + 22} fontSize={12} fontWeight={700} fill={INK}>Compute node {i} — CPU + GPUs</text>

            <rect x={cpuX} y={cpuY} width={cpuW} height={cpuH} rx={8} fill={SHADE} stroke={INK} strokeWidth={1.1} />
            <TextLines x={cpuX + cpuW / 2} y={cpuY + 16} anchor="middle" size={11} weight={700} lines={["CPU package"]} />
            <TextLines x={cpuX + cpuW / 2} y={cpuY + 30} anchor="middle" size={8.5} lines={["root complex · CXL root ports"]} />
            <TopoBox x={cpuX + 12} y={cpuY + 45} w={95} h={55} title="GPUs" />
            <TopoBox x={cpuX + 122} y={cpuY + 45} w={95} h={55} title="HBM" />

            <TopoBox x={ddrX} y={cpuY} w={ddrW} h={ddrH} title="local DDR" />

            <TopoBox x={cardX} y={cardY} w={cardW} h={cardH} title="CXL retimer / adapter" subtitle="(PCIe slot)" />
            <Conn x1={cardX + cardW} y1={cardY + cardH / 2} x2={usX} y2={usYs[usIdx] + usH / 2} marker="cxl-ar" />
          </g>
        );
      })}

      <TextLines x={(nodeX + nodeW + usX) / 2} y={310} anchor="middle" size={10} weight={700} lines={["x16 CXL lanes"]} />
      <TextLines x={(nodeX + nodeW + usX) / 2} y={324} anchor="middle" size={8.5} lines={["PCIe Gen5/6 PHY · CXL.io + CXL.mem"]} />

      {/* CXL memory appliance */}
      <rect x={applianceX} y={applianceY} width={applianceW} height={applianceH} rx={14} fill="none" stroke={INK} strokeWidth={1.25} strokeDasharray="6 5" />
      <text x={applianceX + 16} y={applianceY + 24} fontSize={13} fontWeight={800} fill={INK}>CXL Memory Appliance</text>
      <TextLines x={applianceX + 16} y={applianceY + 40} size={9} lines={["switch + Type-3 modules + BMC — no host CPU"]} />

      {usYs.map((uy, i) => (
        <g key={i}>
          <TopoBox x={usX} y={uy} w={usW} h={usH} title="US port" subtitle="+ retimer" />
          <Conn x1={usX + usW} y1={uy + usH / 2} x2={switchX} y2={switchY + (switchH / (usYs.length + 1)) * (i + 1)} />
        </g>
      ))}

      <rect x={switchX} y={switchY} width={switchW} height={switchH} rx={10} fill={SHADE} stroke={INK} strokeWidth={2} />
      <TextLines x={switchX + switchW / 2} y={switchY + 28} anchor="middle" size={13} weight={800} lines={["CXL SWITCH"]} />
      <TextLines x={switchX + switchW / 2} y={switchY + 46} anchor="middle" size={9.5} lines={["ASIC (fabric)"]} />
      <TextLines
        x={switchX + switchW / 2} y={switchY + 80} anchor="middle" size={9}
        lines={["upstream ports ↑", "downstream ports ↓", "", "virtual hierarchies", "MLD partitioning", "routing + QoS"]}
      />

      {dsYs.map((dy, i) => (
        <g key={i}>
          <Conn x1={switchX + switchW} y1={switchY + (switchH / (dsYs.length + 1)) * (i + 1)} x2={dsX} y2={dy + dsH / 2} />
          <TopoBox x={dsX} y={dy} w={dsW} h={dsH} title="DS port" />
        </g>
      ))}
      {moduleYs.map((my, i) => {
        const dsBoxY = dsYs[Math.floor(i / 2)];
        return <Conn key={i} x1={dsX + dsW} y1={dsBoxY + dsH / 2} x2={moduleX0} y2={my + moduleH / 2} />;
      })}
      {moduleYs.map((my, i) => (
        <g key={i}>
          <rect x={moduleX0} y={my} width={moduleW} height={moduleH} rx={6} fill={SHADE} stroke={INK} strokeWidth={1.1} />
          <TextLines x={moduleX0 + moduleW / 2} y={my + 20} anchor="middle" size={8.5} weight={700} lines={["CXL controller"]} />
          <TextLines x={moduleX0 + moduleW / 2} y={my + 36} anchor="middle" size={8} lines={["DRAM chips"]} />
          <TextLines x={moduleX0 + moduleW / 2} y={my + moduleH - 10} anchor="middle" size={7} lines={["E3.S EDSFF"]} />
        </g>
      ))}

      <Conn x1={switchX + switchW / 2} y1={switchY + switchH} x2={fmX + fmW / 2} y2={fmY} dashed />
      <TopoBox x={fmX} y={fmY} w={fmW} h={fmH} title="Fabric Manager" subtitle="binds pool slices → hosts" />

      {/* callouts */}
      {[
        { title: "The host doesn't need a CXL ‘controller’ card", body: ["CXL runs natively on the CPU's root ports.", "The slot card is a retimer / cable adapter —", "signal integrity plus the physical connector", "to run x16 lanes out of the box."] },
        { title: "The switch pools across nodes", body: ["Fans host-facing upstream ports to memory-", "facing downstream ports and partitions one", "physical pool (MLD) so each host gets its own", "slice — reassignable live by the Fabric Manager."] },
        { title: "The DRAM is hosted on the module", body: ["No CPU on the memory side. A CXL controller", "ASIC fronts the DRAM chips on each E3.S", "module and translates CXL.mem to/from DDR.", "Modules sit in the appliance's EDSFF bays."] },
      ].map((c, i) => {
        const cx = nodeX + i * (calloutW + calloutGap);
        return (
          <g key={i}>
            <rect x={cx} y={calloutY} width={calloutW} height={calloutH} rx={10} fill="#ffffff" stroke={INK} strokeWidth={1.1} />
            <TextLines x={cx + 16} y={calloutY + 24} size={11} weight={700} lines={[c.title]} />
            <TextLines x={cx + 16} y={calloutY + 46} size={9.5} lineHeight={16} lines={c.body} />
          </g>
        );
      })}
    </svg>
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
  const showCxlPool = expandedNode === CXL_POOL_ID;

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
          Click a node card, or the CXL switch / KV pool, to see its internal topology.
        </p>
      </div>

      <div className="p-5">
        <ClusterTopologyDiagram expandedNode={expandedNode} onToggleNode={toggleNode} />

        {(expanded || showCxlPool) && (
          <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--dm-border-a)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold" style={{ color: "var(--dm-txt-primary)" }}>
                {showCxlPool ? "CXL Memory Appliance — physical topology" : `Node ${expanded!.id} — ${expanded!.pool === "prefill" ? "Prefill" : "Decode"} node topology`}
              </p>
              <button
                type="button" onClick={() => setExpandedNode(null)}
                className="text-[11px] font-semibold rounded-lg px-2.5 py-1 transition-colors"
                style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)", color: "var(--dm-txt-muted)" }}
              >
                Collapse
              </button>
            </div>
            {showCxlPool ? (
              <CxlPoolDetailDiagram />
            ) : (
              <>
                <NodeTopologyDiagram nodeId={expanded!.id} pool={expanded!.pool} />
                <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "var(--dm-txt-faintest)" }}>
                  2-socket host, 8 GPUs split across 4 PCIe Gen5 switches (2 GPUs/switch), each switch backed by its own scale-out
                  RDMA NIC for GPU-fabric traffic. CPU1 carries the node's CXL x16 uplink to the cluster's CXL switch — the path KV
                  cache actually takes out of this node, independent of the GPU-to-GPU RDMA fabric below.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
