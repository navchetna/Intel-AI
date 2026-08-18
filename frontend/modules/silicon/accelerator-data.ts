// Shared shape for accelerator detail pages (SambaNova SN40L, Intel Crescent Island).

export interface SpecRow { label: string; value: string }
export interface TflopsRow { dataType: string; value: string; note?: string }
export interface SwStackRow { layer: string; component: string; role: string }

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
  tflops: TflopsRow[];
  tflopsCaveat?: string;
  swStack: SwStackRow[];
  caveats: string[];
  sourceNote: string;
}
