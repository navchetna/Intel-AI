"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { racks, networkSwitch, ROLE_COLORS, totalPooledStorageTB, type RackDef, type RackDevice } from "./data";

const UNIT_PX = 20;

type ElevationRow =
  | { type: "device"; device: RackDevice }
  | { type: "empty"; unit: number };

/** Walks a rack top-down (NetBox convention), emitting one row per device (at its topmost U) and one row per empty U. */
function buildElevationRows(rack: RackDef): ElevationRow[] {
  const rows: ElevationRow[] = [];
  const covered = new Set<number>();
  for (let u = rack.uHeight; u >= 1; u--) {
    if (covered.has(u)) continue;
    const device = rack.devices.find(d => d.startUnit + d.uHeight - 1 === u);
    if (device) {
      rows.push({ type: "device", device });
      for (let k = device.startUnit; k <= device.startUnit + device.uHeight - 1; k++) covered.add(k);
    } else {
      rows.push({ type: "empty", unit: u });
    }
  }
  return rows;
}

type CableKind = "cpu" | "gpu" | "management";
type PortPoint = { x: number; y: number };

/** Every non-switch device gets a data cable (CPU/GPU) plus a separate management cable — both terminate at the shared switch. */
const CABLE_STYLE: Record<CableKind, { color: string; width: number; dash?: string; label: string }> = {
  cpu:        { color: "#38bdf8", width: 1.5, label: "CPU data" },
  gpu:        { color: "#c084fc", width: 1.5, label: "GPU data" },
  management: { color: "#facc15", width: 1,   dash: "2,3", label: "Management (BMC)" },
};

// ── Rack chrome ────────────────────────────────────────────────────────────────

function ScrewRail({ uHeight }: { uHeight: number }) {
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 8 }}>
      {Array.from({ length: uHeight }, (_, i) => (
        <div key={i} className="flex items-center justify-center" style={{ height: UNIT_PX }}>
          <div className="rounded-full bg-white/10" style={{ width: 3, height: 3 }} />
        </div>
      ))}
    </div>
  );
}

function DeviceFaceplate({ device, selected, onSelect, portRef }: {
  device: RackDevice;
  selected: boolean;
  onSelect: () => void;
  portRef: (el: HTMLDivElement | null) => void;
}) {
  const c = ROLE_COLORS[device.role];
  const portCount = device.role === "switch" ? 6 : 2;
  const ventCount = Math.min(device.uHeight * 3, 10);

  return (
    <button
      onClick={onSelect}
      className="group relative flex items-center gap-2 w-full px-2 text-left border-b border-black/40 transition-colors"
      style={{
        height: device.uHeight * UNIT_PX,
        background: selected
          ? `linear-gradient(180deg, rgba(${c.accentRgb},0.32) 0%, rgba(${c.accentRgb},0.14) 100%)`
          : `linear-gradient(180deg, rgba(${c.accentRgb},0.14) 0%, rgba(${c.accentRgb},0.04) 100%)`,
        boxShadow: selected ? `inset 0 0 0 1px rgba(${c.accentRgb},0.55)` : undefined,
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: c.accent }} />

      {/* Status LEDs */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <div className="rounded-full" style={{ width: 3, height: 3, background: "#4ade80", boxShadow: "0 0 3px #4ade80" }} />
        <div className="rounded-full bg-amber-400/50" style={{ width: 3, height: 3 }} />
      </div>

      {/* Label */}
      <span className="text-[10px] font-mono font-semibold truncate flex-shrink-0 max-w-[45%]" style={{ color: c.accent }}>
        {device.name}
      </span>

      {/* Vent slits */}
      <div className="flex-1 flex items-center gap-[3px] min-w-[12px] opacity-25">
        {Array.from({ length: ventCount }, (_, i) => (
          <div key={i} className="flex-1 h-px" style={{ background: c.accent }} />
        ))}
      </div>

      {/* Port cluster — also the cabling anchor point */}
      <div ref={portRef} className="flex-shrink-0 flex items-center gap-[2px]">
        {Array.from({ length: portCount }, (_, i) => (
          <div key={i} className="rounded-[1px]" style={{ width: 3, height: 6, background: c.accent, opacity: 0.85 }} />
        ))}
      </div>
    </button>
  );
}

function RackElevation({ rack, selectedId, onSelect, portRefSetter }: {
  rack: RackDef;
  selectedId: string | null;
  onSelect: (d: RackDevice) => void;
  portRefSetter: (id: string) => (el: HTMLDivElement | null) => void;
}) {
  const rows = useMemo(() => buildElevationRows(rack), [rack]);
  return (
    <div
      className="flex flex-col flex-1 min-w-[260px] rounded-md overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #141d33 0%, #0a1120 100%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {/* Nameplate */}
      <div
        className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/80">{rack.name}</span>
        <span className="text-[9px] font-mono text-white/35 rounded px-1.5 py-0.5 border border-white/10">{rack.uHeight}U</span>
      </div>

      {/* Body */}
      <div
        className="flex px-1 py-1"
        style={{ background: "repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(255,255,255,0.015) 4px)" }}
      >
        <ScrewRail uHeight={rack.uHeight} />
        <div className="flex-1 flex flex-col min-w-0">
          {rows.map(row => row.type === "empty" ? (
            <div key={`empty-${row.unit}`} className="flex items-center justify-end border-b border-black/20 pr-1" style={{ height: UNIT_PX }}>
              <span className="text-[7px] text-white/10 font-mono">{row.unit}</span>
            </div>
          ) : (
            <DeviceFaceplate
              key={row.device.id}
              device={row.device}
              selected={selectedId === row.device.id}
              onSelect={() => onSelect(row.device)}
              portRef={portRefSetter(row.device.id)}
            />
          ))}
        </div>
        <ScrewRail uHeight={rack.uHeight} />
      </div>

      {/* Base cap */}
      <div className="h-1.5 flex-shrink-0" style={{ background: "rgba(0,0,0,0.4)" }} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</p>
      <p className="text-lg font-black text-white/85 mt-0.5">{value}</p>
    </div>
  );
}

export function RackView() {
  const [selected, setSelected] = useState<RackDevice | null>(null);
  const [showCabling, setShowCabling] = useState(false);

  const totalStorage = useMemo(() => totalPooledStorageTB(), []);
  const nodeCount = useMemo(() => racks.reduce((n, r) => n + r.devices.length, 0), []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const portRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [portPoints, setPortPoints] = useState<Record<string, PortPoint>>({});
  const portRefSetter = (id: string) => (el: HTMLDivElement | null) => { portRefs.current[id] = el; };

  useLayoutEffect(() => {
    if (!showCabling) return;
    function measure() {
      const container = overlayRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const next: Record<string, PortPoint> = {};
      for (const [id, el] of Object.entries(portRefs.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next[id] = { x: r.left + r.width / 2 - cRect.left, y: r.top + r.height / 2 - cRect.top };
      }
      setPortPoints(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (overlayRef.current) ro.observe(overlayRef.current);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [showCabling]);

  const cables = useMemo(() => {
    if (!showCabling) return [];
    const list: { id: string; from: string; to: string; kind: CableKind }[] = [];
    for (const rack of racks) {
      for (const device of rack.devices) {
        if (device.role === "switch") continue;
        list.push({ id: `${device.id}-data`, from: device.id, to: networkSwitch.id, kind: device.role === "gpu" ? "gpu" : "cpu" });
        list.push({ id: `${device.id}-mgmt`, from: device.id, to: networkSwitch.id, kind: "management" });
      }
    }
    return list;
  }, [showCabling]);

  return (
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="mx-auto max-w-screen-2xl px-6 pt-10 pb-16">
        {/* ── header ── */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-[#60a5fa]/80">Rack Scale Designs</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Rack View</h1>
            <p className="mt-1 text-base text-white/40">
              CPU-Rack and CRI-GPU-Rack on a shared switch, with in-chassis storage unified via Hammerspace.
            </p>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pb-1">
            <span className="text-xs font-medium text-white/50">Show cabling</span>
            <span
              role="switch"
              aria-checked={showCabling}
              onClick={() => setShowCabling(v => !v)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ background: showCabling ? "#22d3ee" : "rgba(255,255,255,0.15)" }}
            >
              <span
                className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: showCabling ? "translateX(18px)" : "translateX(3px)" }}
              />
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
          {/* ── Diagram ── */}
          <div className="xl:flex-[4] min-w-0">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                background: "var(--dm-page-bg)",
                boxShadow: "0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,199,253,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {/* Dot-grid texture */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(rgba(0,199,253,0.06) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }} />

              {/* Window chrome */}
              <div className="relative flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05]"
                style={{ background: "rgba(2,10,26,0.8)", backdropFilter: "blur(4px)" }}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f57]/80 shadow-[0_0_4px_rgba(255,95,87,0.5)]" />
                  <div className="w-3 h-3 rounded-full bg-[#febc2e]/80 shadow-[0_0_4px_rgba(254,188,46,0.4)]" />
                  <div className="w-3 h-3 rounded-full bg-[#28c840]/80 shadow-[0_0_4px_rgba(40,200,64,0.4)]" />
                </div>
                <span className="ml-2 text-[11px] font-mono text-blue-400/40 tracking-wide">
                  intel-ai · rack-view · cpu + gpu
                </span>
              </div>

              <div className="relative p-6 flex flex-col gap-6">
                {/* Elevations + cabling overlay */}
                <div ref={overlayRef} className="relative flex flex-col md:flex-row gap-6 items-stretch">
                  <RackElevation rack={racks[0]} selectedId={selected?.id ?? null} onSelect={setSelected} portRefSetter={portRefSetter} />
                  <RackElevation rack={racks[1]} selectedId={selected?.id ?? null} onSelect={setSelected} portRefSetter={portRefSetter} />

                  {showCabling && (
                    <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                      {cables.map(cable => {
                        const p1 = portPoints[cable.from];
                        const p2 = portPoints[cable.to];
                        if (!p1 || !p2) return null;
                        const style = CABLE_STYLE[cable.kind];
                        const midX = (p1.x + p2.x) / 2;
                        const d = `M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`;
                        return (
                          <path
                            key={cable.id} d={d} stroke={style.color} strokeWidth={style.width}
                            strokeDasharray={style.dash} fill="none" opacity={0.55} strokeLinecap="round"
                          />
                        );
                      })}
                    </svg>
                  )}
                </div>

                {showCabling && (
                  <div className="flex items-center justify-center gap-5 text-[11px] font-mono text-white/40 flex-wrap">
                    {Object.entries(CABLE_STYLE).map(([kind, s]) => (
                      <span key={kind} className="flex items-center gap-1.5">
                        <span className="inline-block w-4 h-0.5" style={{ background: s.color, opacity: 0.8 }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                )}

                {/* Connector row */}
                <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-white/40 flex-wrap">
                  <span style={{ color: ROLE_COLORS.compute.accent }}>CPU-Rack</span>
                  <span className="text-white/20">— 100GbE —</span>
                  <span style={{ color: ROLE_COLORS.gpu.accent }}>CRI-GPU-Rack</span>
                  <span className="text-white/20 ml-2">
                    (uplinked via {networkSwitch.name}, top-of-rack in CPU-Rack)
                  </span>
                </div>

                {/* Hammerspace band */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.18)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-[#60a5fa] mb-1.5">
                    Hammerspace Unified Data Environment
                  </p>
                  <p className="text-xs text-white/50 leading-relaxed mb-4 max-w-2xl">
                    No separate storage rack — every compute and GPU node&apos;s in-chassis NVMe is orchestrated into
                    one logical namespace by Hammerspace, spanning CPU-Rack and CRI-GPU-Rack.
                  </p>
                  <div className="flex gap-8">
                    <Stat label="Total pooled capacity" value={`${totalStorage.toLocaleString()} TB`} />
                    <Stat label="Contributing nodes" value={String(nodeCount)} />
                    <Stat label="Racks unified" value="2" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Detail panel ── */}
          <div className="xl:w-[380px] xl:flex-shrink-0 min-w-0 flex flex-col">
            {selected ? (
              <div
                key={selected.id}
                className="rounded-2xl border border-intel-blue/15 bg-white shadow-xl shadow-blue-950/10 flex flex-col overflow-hidden"
              >
                <div className="px-6 pt-6 pb-5 border-b border-gray-100/80 bg-gradient-to-br from-intel-haze/60 to-white">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h2 className="text-lg font-bold text-intel-dark leading-tight">{selected.name}</h2>
                    <button
                      onClick={() => setSelected(null)}
                      aria-label="Close"
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: `rgba(${ROLE_COLORS[selected.role].accentRgb},0.15)`,
                      color: ROLE_COLORS[selected.role].accent,
                    }}
                  >
                    {selected.role}
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Rack Position</p>
                    <p className="text-sm text-intel-dark font-mono">
                      {selected.uHeight === 1
                        ? `U${selected.startUnit}`
                        : `U${selected.startUnit}–U${selected.startUnit + selected.uHeight - 1}`}
                      <span className="text-gray-400"> · {selected.uHeight}U</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Specification</p>
                    <p className="text-sm text-gray-600 leading-relaxed">{selected.detail}</p>
                  </div>
                  {selected.localStorageTB != null && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Hammerspace Contribution</p>
                      <p className="text-sm text-gray-600">{selected.localStorageTB} TB local NVMe</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="flex-1 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center py-16"
                style={{ borderColor: "var(--dm-border-b)", background: "var(--dm-surface-b)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--dm-txt-muted)" }}>Select a device to explore</p>
                <p className="text-xs mt-1" style={{ color: "var(--dm-txt-faint)" }}>Click any unit in the rack elevation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
