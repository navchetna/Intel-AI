"use client";

import { useMemo } from "react";
import { fmt } from "@/components/ui";
import { SYSTEM_POWER_KW } from "./summary";
import type { GpuCpuSiliconRow } from "./summary";

// ── Distribution strategy ─────────────────────────────────────────────────────
// CRI systems are 4U, up to 5 per CRI Rack. B70 systems are 2U, up to 8 per B70
// Rack. Xeon-AI systems (CPU silicon serving models — 6767P/6737P) are 2U, up to
// 12 per Xeon-AI Rack. Harness systems are 1U, up to 14 per Harness Rack. Each
// rack type is packed independently — a clear separation between rack types.

type RackKind = "cri" | "b70" | "xeon-ai" | "harness";

interface RackRule {
  maxPerRack: number;
  uPerSystem: number;
  label: string;
  accent: string;
  accentRgb: string;
}

const RACK_RULES: Record<RackKind, RackRule> = {
  "cri":      { maxPerRack: 5,  uPerSystem: 4, label: "CRI Rack",     accent: "#f87171", accentRgb: "248,113,113" },
  "b70":      { maxPerRack: 8,  uPerSystem: 2, label: "B70 Rack",     accent: "#fb923c", accentRgb: "251,146,60" },
  "xeon-ai":  { maxPerRack: 12, uPerSystem: 2, label: "Xeon-AI Rack", accent: "#22d3ee", accentRgb: "34,211,238" },
  "harness":  { maxPerRack: 14, uPerSystem: 1, label: "Harness Rack", accent: "#818cf8", accentRgb: "129,140,248" },
};
const RACK_KIND_ORDER: RackKind[] = ["cri", "b70", "xeon-ai", "harness"];
const RACK_U_HEIGHT = 42;
const UNIT_PX = 20;

interface RackItem {
  silicon: string;
  powerKw: number;
}

interface PackedDevice {
  id: string;
  name: string;
  startUnit: number;
  uHeight: number;
  silicon: string;
  powerKw: number;
}

interface PackedRack {
  id: string;
  name: string;
  kind: RackKind;
  devices: PackedDevice[];
  provisionedKw: number;
}

function packRacks(kind: RackKind, items: RackItem[]): PackedRack[] {
  const rule = RACK_RULES[kind];
  const racks: PackedRack[] = [];
  for (let i = 0; i < items.length; i += rule.maxPerRack) {
    const chunk = items.slice(i, i + rule.maxPerRack);
    const rackNum = racks.length + 1;
    const devices: PackedDevice[] = chunk.map((item, idx) => ({
      id: `${kind}-r${rackNum}-d${idx + 1}`,
      name: `${rule.label.replace(" Rack", "")} System ${String(idx + 1).padStart(2, "0")}`,
      startUnit: 1 + idx * rule.uPerSystem,
      uHeight: rule.uPerSystem,
      silicon: item.silicon,
      powerKw: item.powerKw,
    }));
    racks.push({
      id: `${kind}-rack-${rackNum}`,
      name: `${rule.label} ${rackNum}`,
      kind,
      devices,
      provisionedKw: devices.reduce((sum, d) => sum + d.powerKw, 0),
    });
  }
  return racks;
}

// ── Rack elevation (visual style mirrors modules/rack/RackView.tsx) ────────────

type ElevationRow = { type: "device"; device: PackedDevice } | { type: "empty"; unit: number };

function buildElevationRows(devices: PackedDevice[]): ElevationRow[] {
  const rows: ElevationRow[] = [];
  const covered = new Set<number>();
  for (let u = RACK_U_HEIGHT; u >= 1; u--) {
    if (covered.has(u)) continue;
    const device = devices.find(d => d.startUnit + d.uHeight - 1 === u);
    if (device) {
      rows.push({ type: "device", device });
      for (let k = device.startUnit; k <= device.startUnit + device.uHeight - 1; k++) covered.add(k);
    } else {
      rows.push({ type: "empty", unit: u });
    }
  }
  return rows;
}

// Blends a rack type's accent color into the dark chassis base as fully OPAQUE rgb() — using
// rgba() directly here would let the light-mode page background bleed through the low-alpha
// stops, washing the rack out. Blending in JS keeps the rack chassis reliably dark in either theme.
const RACK_BASE_RGB = { r: 10, g: 17, b: 32 }; // matches #0a1120

function rackChassisBg(accentRgb: string): string {
  const [r, g, b] = accentRgb.split(",").map(Number);
  const mix = (channel: number, amt: number, base: number) => Math.round(channel * amt + base * (1 - amt));
  const top = `rgb(${mix(r, 0.32, RACK_BASE_RGB.r)}, ${mix(g, 0.32, RACK_BASE_RGB.g)}, ${mix(b, 0.32, RACK_BASE_RGB.b)})`;
  const mid = `rgb(${mix(r, 0.14, RACK_BASE_RGB.r)}, ${mix(g, 0.14, RACK_BASE_RGB.g)}, ${mix(b, 0.14, RACK_BASE_RGB.b)})`;
  return `linear-gradient(180deg, ${top} 0%, ${mid} 40%, #0a1120 100%)`;
}

function ScrewRail() {
  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 8 }}>
      {Array.from({ length: RACK_U_HEIGHT }, (_, i) => (
        <div key={i} className="flex items-center justify-center" style={{ height: UNIT_PX }}>
          <div className="rounded-full bg-white/10" style={{ width: 3, height: 3 }} />
        </div>
      ))}
    </div>
  );
}

function DeviceFaceplate({ device, accent, accentRgb }: { device: PackedDevice; accent: string; accentRgb: string }) {
  const ventCount = Math.min(device.uHeight * 3, 10);
  return (
    <div
      className="relative flex items-center gap-2 w-full px-2 border-b border-black/40"
      style={{
        height: device.uHeight * UNIT_PX,
        background: `linear-gradient(180deg, rgba(${accentRgb},0.14) 0%, rgba(${accentRgb},0.04) 100%)`,
      }}
      title={`${device.name} · ${device.silicon} · ${fmt(device.powerKw, 1)}kW`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accent }} />
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <div className="rounded-full" style={{ width: 3, height: 3, background: "#4ade80", boxShadow: "0 0 3px #4ade80" }} />
        <div className="rounded-full bg-amber-400/50" style={{ width: 3, height: 3 }} />
      </div>
      <span className="text-[10px] font-mono font-semibold truncate flex-shrink-0 max-w-[50%]" style={{ color: accent }}>
        {device.name}
      </span>
      <div className="flex-1 flex items-center gap-[3px] min-w-[12px] opacity-25">
        {Array.from({ length: ventCount }, (_, i) => (
          <div key={i} className="flex-1 h-px" style={{ background: accent }} />
        ))}
      </div>
      <span className="flex-shrink-0 text-[9px] font-mono opacity-70" style={{ color: accent }}>
        {fmt(device.powerKw, 1)}kW
      </span>
    </div>
  );
}

function RackElevation({ rack, accent, accentRgb }: { rack: PackedRack; accent: string; accentRgb: string }) {
  const rows = useMemo(() => buildElevationRows(rack.devices), [rack.devices]);
  return (
    <div
      className="flex flex-col flex-1 min-w-[260px] max-w-[320px] rounded-md overflow-hidden"
      style={{
        // Tinted per rack type so CRI/B70/Xeon-AI/Harness racks are visually distinct at a glance.
        background: rackChassisBg(accentRgb),
        border: `1px solid rgba(${accentRgb},0.3)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {/* Nameplate — provisioned TDP called out above the rack */}
      <div
        className="flex flex-col gap-1 px-3 py-2 flex-shrink-0"
        style={{ background: "rgba(0,0,0,0.35)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: accent }}>{rack.name}</span>
          <span className="text-[9px] font-mono text-white/35 rounded px-1.5 py-0.5 border border-white/10">{RACK_U_HEIGHT}U</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-white/40">{rack.devices.length} system{rack.devices.length === 1 ? "" : "s"}</span>
          <span className="text-[10px] font-mono font-bold" style={{ color: accent }}>Provisioned: {fmt(rack.provisionedKw, 1)} kW</span>
        </div>
      </div>

      {/* Body */}
      <div
        className="flex px-1 py-1"
        style={{ background: "repeating-linear-gradient(180deg, transparent, transparent 3px, rgba(255,255,255,0.015) 4px)" }}
      >
        <ScrewRail />
        <div className="flex-1 flex flex-col min-w-0">
          {rows.map(row => row.type === "empty" ? (
            <div key={`empty-${row.unit}`} className="flex items-center justify-end border-b border-black/20 pr-1" style={{ height: UNIT_PX }}>
              <span className="text-[7px] text-white/10 font-mono">{row.unit}</span>
            </div>
          ) : (
            <DeviceFaceplate key={row.device.id} device={row.device} accent={accent} accentRgb={accentRgb} />
          ))}
        </div>
        <ScrewRail />
      </div>

      <div className="h-1.5 flex-shrink-0" style={{ background: "rgba(0,0,0,0.4)" }} />
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

/** Packs each system type from the GPU/CPU Summary (CRI, B70, Xeon-AI CPU-serving, and Harness)
 *  into its own rack type, per the distribution strategy above, and renders each as a rack
 *  elevation — mirroring the visual style of modules/rack/RackView.tsx. */
export function ProjectRackView({ bySilicon, harnessSystems }: {
  bySilicon: GpuCpuSiliconRow[];
  harnessSystems: number;
}) {
  const groups = useMemo(() => {
    const expand = (rows: GpuCpuSiliconRow[]): RackItem[] =>
      rows.flatMap(row => Array.from({ length: row.systems }, () => ({
        silicon: row.silicon, powerKw: SYSTEM_POWER_KW[row.silicon] ?? 0,
      })));

    const criItems = expand(bySilicon.filter(r => r.silicon === "CRIx1"));
    const b70Items = expand(bySilicon.filter(r => r.silicon === "B70x2"));
    const xeonAiItems = expand(bySilicon.filter(r => r.silicon !== "CRIx1" && r.silicon !== "B70x2"));
    const harnessItems: RackItem[] = Array.from({ length: harnessSystems }, () => ({
      silicon: "32c*6530P", powerKw: SYSTEM_POWER_KW["32c*6530P"] ?? 0,
    }));

    return {
      "cri": packRacks("cri", criItems),
      "b70": packRacks("b70", b70Items),
      "xeon-ai": packRacks("xeon-ai", xeonAiItems),
      "harness": packRacks("harness", harnessItems),
    } satisfies Record<RackKind, PackedRack[]>;
  }, [bySilicon, harnessSystems]);

  const allRacks = RACK_KIND_ORDER.flatMap(k => groups[k]);
  const totalProvisionedKw = allRacks.reduce((sum, r) => sum + r.provisionedKw, 0);

  if (allRacks.length === 0) {
    return (
      <section className="mx-auto max-w-screen-2xl px-6 pb-8">
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-white/40 text-sm">No systems to rack yet — size the Harness, Agent Model, and Embedding/Re-Ranking/Security sections above first.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-screen-2xl px-6 pb-8">
      <p className="mb-6 text-sm" style={{ color: "var(--dm-txt-muted)" }}>
        {allRacks.length} rack{allRacks.length === 1 ? "" : "s"} · {fmt(totalProvisionedKw, 1)} kW provisioned overall.
        CRI systems (4U) pack up to 5 per CRI Rack, B70 systems (2U) up to 8 per B70 Rack, Xeon-AI
        CPU-serving systems (2U) up to 12 per Xeon-AI Rack, and Harness systems (1U) up to 14 per
        Harness Rack — a clear separation between rack types.
      </p>

      {/* Legend — one swatch per rack type, since all racks now sit in a single row together */}
      <div className="flex flex-wrap gap-4 mb-5">
        {RACK_KIND_ORDER.map(kind => {
          const racks = groups[kind];
          if (racks.length === 0) return null;
          const rule = RACK_RULES[kind];
          const groupSystems = racks.reduce((sum, r) => sum + r.devices.length, 0);
          const groupKw = racks.reduce((sum, r) => sum + r.provisionedKw, 0);
          return (
            <div
              key={kind}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5"
              style={{ background: `rgba(${rule.accentRgb},0.1)`, border: `1px solid rgba(${rule.accentRgb},0.3)` }}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rule.accent }} />
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: rule.accent }}>{rule.label}s</span>
              <span className="text-[11px]" style={{ color: "var(--dm-txt-faint)" }}>
                {racks.length} rack{racks.length === 1 ? "" : "s"} · {groupSystems} system{groupSystems === 1 ? "" : "s"} · {fmt(groupKw, 1)} kW
              </span>
            </div>
          );
        })}
      </div>

      {/* All racks side by side, in one row (wraps only when the viewport runs out of width) */}
      <div className="flex flex-wrap gap-6">
        {RACK_KIND_ORDER.flatMap(kind => {
          const rule = RACK_RULES[kind];
          return groups[kind].map(rack => (
            <RackElevation key={rack.id} rack={rack} accent={rule.accent} accentRgb={rule.accentRgb} />
          ));
        })}
      </div>
    </section>
  );
}
