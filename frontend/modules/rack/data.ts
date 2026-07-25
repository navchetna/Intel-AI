export type DeviceRole = "compute" | "gpu" | "switch";

export interface RackDevice {
  id: string;
  name: string;
  /** Bottom-most U the device occupies (NetBox convention: U1 = bottom of the rack). */
  startUnit: number;
  uHeight: number;
  role: DeviceRole;
  detail: string;
  /** In-chassis NVMe contributed to the Hammerspace pool, in TB. */
  localStorageTB?: number;
}

export interface RackDef {
  id: string;
  name: string;
  uHeight: number;
  devices: RackDevice[];
}

const CPU_NODE_COUNT = 12;
const CPU_NODE_U = 2;
const CPU_NODE_STORAGE_TB = 15.36;

const cpuNodes: RackDevice[] = Array.from({ length: CPU_NODE_COUNT }, (_, i) => ({
  id: `cpu-node-${i + 1}`,
  name: `Xeon 6 Compute Node ${String(i + 1).padStart(2, "0")}`,
  startUnit: 1 + i * CPU_NODE_U,
  uHeight: CPU_NODE_U,
  role: "compute",
  detail: "2× Intel Xeon 6 processors · 1.5TB DDR5 · dual 100GbE",
  localStorageTB: CPU_NODE_STORAGE_TB,
}));

const GPU_NODE_COUNT = 6;
const GPU_NODE_U = 4;
const GPU_NODE_STORAGE_TB = 30.72;

const gpuNodes: RackDevice[] = Array.from({ length: GPU_NODE_COUNT }, (_, i) => ({
  id: `gpu-node-${i + 1}`,
  name: `GPU Node ${String(i + 1).padStart(2, "0")} — 8× Battlemage B70`,
  startUnit: 1 + i * GPU_NODE_U,
  uHeight: GPU_NODE_U,
  role: "gpu",
  detail: "8× Intel Battlemage B70 · 2× Intel Xeon 6 host CPUs · dual 100GbE",
  localStorageTB: GPU_NODE_STORAGE_TB,
}));

/** Lives at the top of CPU-Rack and uplinks both racks — not a separate rack. */
export const networkSwitch: RackDevice = {
  id: "tor-switch",
  name: "100GbE ToR Switch",
  startUnit: 42,
  uHeight: 1,
  role: "switch",
  detail: "32-port 100GbE top-of-rack switch · shared uplink for CPU-Rack and CRI-GPU-Rack",
};

export const racks: RackDef[] = [
  { id: "cpu-rack", name: "CPU-Rack", uHeight: 42, devices: [networkSwitch, ...cpuNodes] },
  { id: "cri-gpu-rack", name: "CRI-GPU-Rack", uHeight: 42, devices: gpuNodes },
];

export const ROLE_COLORS: Record<DeviceRole, { accent: string; accentRgb: string }> = {
  compute: { accent: "#38bdf8", accentRgb: "56,189,248" },
  gpu:     { accent: "#c084fc", accentRgb: "192,132,252" },
  switch:  { accent: "#94a3b8", accentRgb: "148,163,184" },
};

export function totalPooledStorageTB(): number {
  const allDevices = [...racks.flatMap(r => r.devices)];
  return allDevices.reduce((sum, d) => sum + (d.localStorageTB ?? 0), 0);
}
