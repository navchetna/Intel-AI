# Silicon Page Implementation Summary

## Overview
The Silicon page has been fully implemented with detailed specifications for SambaNova SN40L and Intel Crescent Island accelerators, extracted from the provided technical PDFs.

## Data Sources
1. **SambaNova**: `SambaNova_RDU_Platform_Reference.pdf` (compiled Aug 2026)
2. **Crescent Island**: `Intel_Crescent_Island_Xe3P_Technical_Reference_v1.0.pdf` (compiled 9 Aug 2026)

## Implementation Structure

### Main Components
- **SiliconView.tsx** - Main view with card grid and category tabs
- **AcceleratorDetailView.tsx** - Detailed view template for accelerators
- **sambanova-data.ts** - SambaNova SN40L complete specifications
- **crescent-island-data.ts** - Intel Crescent Island complete specifications
- **accelerator-data.ts** - TypeScript interfaces for type safety

### Silicon Detail Pages Include:

#### 1. Overview Section
- Product positioning and tagline
- Development status badge
- High-level architecture description
- Key differentiators

#### 2. Hardware Specifications
**SambaNova SN40L:**
- Architecture: Reconfigurable Dataflow Unit (PCU + PMU array)
- Process: 5nm TSMC, CoWoS-S dual die
- Transistors: 102 billion
- TDP: 7-14.5 kW (rack-level, 16 sockets)
- Host CPU: 2× 64-core, 2 TB DDR4
- Interconnect: Peer-to-peer across 16 sockets

**Intel Crescent Island:**
- Architecture: Xe3P (Xe3 performance variant)
- TDP: 350W air-cooled
- Form factor: PCIe Gen5 x16 add-in card
- Power connector: Single 16-pin 12V-2×6
- Status: Pre-launch (sampling H2 2026, volume 2027)

#### 3. Memory Specifications
**SambaNova SN40L (Three-tier architecture):**
- Tier 0 - On-chip SRAM: 520 MiB (hundreds of TBps)
- Tier 1 - On-package HBM: 64 GiB HBM3 (~2 TB/s)
- Tier 2 - Off-package DDR: Up to 1.5 TiB DDR
- 16-socket rack: 1 TB HBM + 12 TB DDR

**Intel Crescent Island:**
- Type: LPDDR5X (no HBM, no GDDR)
- Capacity: 160 GB (reference) / 480 GB (partner ceiling)
- Bandwidth: 1.54 TB/s (disputed - may be 684 GB/s)
- Memory sites: 20 LPDDR5X packages
- 8-card node: Up to 3,840 GB total

#### 4. TFLOPS by Data Type
**SambaNova SN40L:**
- BF16/FP32: 638-640 TFLOPS/socket
- INT8/INT32: Supported (SIMD ALU)
- FP8: Not native (arrives with SN50)
- 16-socket rack: 10.2 PFLOPS BF16

**Intel Crescent Island (CI-B derived estimates):**
- FP64: ~6.1 TFLOPS
- FP32: ~49.2 TFLOPS
- TF32: ~197 TFLOPS
- BF16/FP16: ~393 TFLOPS
- FP8/INT8: ~786 TFLOPS
- FP4/MXFP4/INT4: ~1,573 TFLOPS

**Important Note**: Crescent Island figures are derived estimates (±40% band), not Intel specifications.

#### 5. Software Stack
**SambaNova:**
- SambaFlow (compiler/runtime)
- SambaStudio (model lifecycle management)
- SambaCloud (hosted inference with OpenAI-compatible API)
- SambaNova Composer (inference compiler)
- PyTorch framework support
- Integration with CrewAI, Hugging Face, Cline, AWS

**Intel Crescent Island:**
- Linux xe DRM driver
- Intel Compute Runtime (Level Zero, OpenCL)
- oneAPI / SYCL (DPC++)
- PyTorch native backend (torch.xpu)
- OpenVINO inference runtime
- vLLM XPU backend
- intel/llm-scaler (containerized vLLM)
- LangChain / Hugging Face / OPEA integration

#### 6. Additional Information
- **Caveats and Open Questions**: Known limitations, software maturity notes
- **Source Attribution**: Provenance tracking with [I] Intel-published, [D] Derived, [L] Leaked, [3P] Third-party tags
- **Workload Recommendations**: Optimal use cases for each platform

## Key Features

### Design System
- Consistent color-coded accent system
- Dark/light theme support
- Responsive grid layout
- Status badges indicating product availability
- Interactive cards with drill-down capability

### Navigation
- Breadcrumb navigation from detail pages back to main Silicon view
- Click-through from card overview to detailed specifications
- Tabbed interface for future categories (Compute, Memory, Networking, Storage, Cables, PDU)

### Data Presentation
- Specification tables with alternating row backgrounds
- TFLOPS comparison tables
- Multi-tier memory architecture visualization
- Comprehensive software stack layers
- Caveat sections with important notes highlighted

## Technical Implementation

### Type Safety
```typescript
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
```

### Detail Page ID Registry
```typescript
const DETAIL_PAGE_IDS = new Set(["xeon6-sp", "sambanova", "crescent-island"]);
```

Currently implemented:
- ✅ xeon6-sp (Xeon 6 SP)
- ✅ sambanova (SambaNova SN40L)
- ✅ crescent-island (Intel Crescent Island)

## Next Steps (Future Enhancements)

1. **Additional Silicon Categories**
   - Memory catalog (DDR5, MRDIMM, HBM)
   - Networking components
   - Storage solutions
   - Cables and PDU specifications

2. **Comparison Tools**
   - Side-by-side silicon comparisons
   - TCO calculators
   - Performance benchmarking views

3. **Interactive Features**
   - Filtering and sorting capabilities
   - Search functionality
   - Export specifications to PDF/CSV

4. **Integration**
   - Link from silicon specs to project sizing calculators
   - Reference from agentic workflow recommendations
   - Cross-reference with benchmark data

## Files Modified/Created

### Created:
- `frontend/modules/silicon/sambanova-data.ts`
- `frontend/modules/silicon/crescent-island-data.ts`
- `frontend/modules/silicon/AcceleratorDetailView.tsx`
- `frontend/modules/silicon/accelerator-data.ts`

### Modified:
- `frontend/modules/silicon/SiliconView.tsx` - Added drill-down navigation

## Testing Recommendations

1. Verify all detail page links work correctly
2. Test theme switching (dark/light mode) on detail pages
3. Validate responsive layout on mobile devices
4. Check table rendering with various screen sizes
5. Confirm breadcrumb navigation flow
6. Test accent color rendering across both accelerators

## Documentation References

- SambaNova Platform Reference: Vendor-published specs with provenance tagging
- Crescent Island Technical Reference: Pre-launch specs with explicit derived-estimate disclaimers
- All numerical figures include source attribution and confidence levels
