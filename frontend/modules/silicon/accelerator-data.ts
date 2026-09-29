// Shared shape for accelerator detail pages (SambaNova SN40L, Intel Crescent Island).

export interface SpecRow { label: string; value: string }
export interface TflopsRow { dataType: string; value: string; note?: string }
export interface SwStackRow { layer: string; component: string; role: string }
/** A publicly-checkable citation — `url` omitted only for a source with no public page. */
export interface SourceRef { id: string; label: string; url?: string }

export interface AcceleratorDetail {
  id: string;
  name: string;
  codeName: string;
  tagline: string;
  accent: string;
  accentRgb: string;
  statusBadge: string;
  overview: string[];
  hwSpecs: SpecRow[];
  memorySpecs: SpecRow[];
  /** GPU-to-GPU fabric (NVLink, or PCIe-only) and the arithmetic behind any bandwidth figures. */
  interconnect?: SpecRow[];
  tflops: TflopsRow[];
  tflopsCaveat?: string;
  swStack: SwStackRow[];
  /** Best-fit Xeon 6 host CPU pairing and the host-side sizing rules that follow from it. */
  hostRecommendation?: SpecRow[];
  /** What the GPU itself brings to virtualization/multi-tenancy — MIG/vGPU slicing floors and
   *  ceilings, which sharing technologies the silicon+driver support, and per-GPU licensing
   *  (e.g. NVIDIA AI Enterprise). Deliberately GPU-only: how an orchestrator (Kubernetes,
   *  OpenShift, VCF, ...) combines multiple GPUs/nodes is a separate concern, not covered here. */
  virtualization?: SpecRow[];
  caveats: string[];
  sourceNote: string;
  /** Public citations only — internal/companion-file references are left out of this list. */
  sources?: SourceRef[];
}
