"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface AccordionSection {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
  content: React.ReactNode;
}

function AccordionItem({ section, isOpen, onToggle }: {
  section: AccordionSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="mb-4 rounded-2xl border overflow-hidden" style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-6 py-5 text-left transition-colors"
        style={{ background: isOpen ? `${section.accent}15` : "transparent" }}
      >
        <div
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: section.accent, transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M6 3l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold" style={{ color: section.accent }}>{section.title}</h2>
          {section.subtitle && (
            <p className="mt-1 text-xs" style={{ color: "var(--dm-txt-faint)" }}>{section.subtitle}</p>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-1">
          {section.content}
        </div>
      )}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--dm-border-a)" }}>
      <table className="w-full text-sm">
        <thead style={{ background: "var(--dm-table-head)" }}>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "var(--dm-txt-faint)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "var(--dm-surface-a)" : "var(--dm-surface-b)" }}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3" style={{ color: "var(--dm-txt-body)" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Highlight({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded font-mono text-sm font-semibold" style={{ background: `${color}20`, color }}>
      {children}
    </span>
  );
}

export function StorageView({ onBack }: { onBack: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["instruction-set"]));
  const { theme } = useTheme();
  const isDark = theme === "dark";

  function toggleSection(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const sections: AccordionSection[] = [
    {
      id: "instruction-set",
      title: "Instruction-set plays",
      subtitle: "CPU ISA features that accelerate storage operations",
      accent: "#38bdf8",
      content: (
        <div className="space-y-4">
          <Table
            headers={["ISA Feature", "Storage Use", "Notes"]}
            rows={[
              ["AVX-512", "Reed-Solomon erasure coding, NAND parity, fingerprinting", "P-core only. Not on Xeon 6+. Universal fallback."],
              ["AES-NI", "Inline encryption, encrypt and fly, sector width", "Universal fallback"],
              ["AES-NI / VAES", "At-rest and in-flight encryption", "Universal; invisible but heat bearing"],
              [
                "SHA-NI, SHA-512, SHA3, SHA4",
                "Content-addressed keys, integrity, NAND detection, regional crypto compliance",
                <>E.g. 125/234/15M/4M on Xeon 6+ <Highlight color="#22d3ee">[3P]</Highlight></>
              ],
              ["CLMUL", "CRC and Galois-field math with/beneath erasure coding", "Foundational"],
            ]}
          />
          <p className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
            These instruction sets are hardware-accelerated on Intel Xeon processors and enable efficient implementation of storage primitives
            like erasure coding, encryption, and integrity verification without requiring discrete accelerators.
          </p>
        </div>
      ),
    },
    {
      id: "accelerator",
      title: "Accelerator complex",
      subtitle: "On-die accelerators for storage-adjacent workloads",
      accent: "#a78bfa",
      content: (
        <div className="space-y-4">
          <Table
            headers={["Accelerator", "Function", "Agentic Storage Relevance", "Design in Maturity"]}
            rows={[
              [
                <>QAT (<Highlight color="#a78bfa">QuickAssist</Highlight>)</>,
                "Symmetric/asymmetric crypto, SIP/AES/ZSTD compression",
                <>Highest. Object-store compression, at-rest/in-transit encryption; TLS termination on E3 endpoints</>,
                <>Deep — Ceph, Dadi <Highlight color="#22d3ee">OpenZero</Highlight>, hotlines at <Highlight color="#22d3ee">QATEngine</Highlight></>
              ],
              [
                <>IAA (<Highlight color="#a78bfa">In-Memory Analytics</Highlight>)</>,
                "Decompression, filter/scan primitives",
                <>
                  <Highlight color="#22d3ee">CANonical</Highlight>-class trace analytics, columnar scan on telemetry (C2{'='}{'>'} C3). SLA gap: zstd
                </>,
                "Thin in storage: genuine opportunity"
              ],
              [
                <>DSA (<Highlight color="#a78bfa">Data Streaming</Highlight>)</>,
                "Memory copy/fill/compare offload",
                <>Thin, strategically interesting for C1 endpoint; staging, <Highlight color="#22d3ee">upAPI</Highlight>, DMA offload to get under request latency target</>,
                "Thin"
              ],
              [
                <>DLB (<Highlight color="#a78bfa">Dynamic Load Balancer</Highlight>)</>,
                "Packet/work distribution across cores",
                "S3 gateway request steering, NVMe-oF target work",
                "Thin"
              ],
              [
                "AMX",
                "Matrix math (P-core only)",
                <>Not a storage play; relevant to embedding+generation co-located with ingest</>,
                "N/A"
              ],
            ]}
          />
          <p className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
            QAT integration is the primary accelerator opportunity for agentic storage — compression and encryption are on every write path.
            IAA remains underutilized despite strong fit for log analytics and telemetry aggregation.
          </p>
        </div>
      ),
    },
    {
      id: "cxl-fmm",
      title: "CXL and Intel Flat Memory Mode",
      subtitle: "Memory expansion and resource disaggregation",
      accent: "#22d3ee",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-body)" }}>
            Intel Flat Memory Mode is a memory configuration feature for Xeon 6 processors that allows the use of lower-cost memory to
            improve TCO without requiring OS or application changes to manage the DDR and CXL memory tiers — both the DDR and CXL memory are
            exposed to the system as combined physical memory.
          </p>
          <div className="p-4 rounded-lg" style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "#22d3ee" }}>
              Storage KV Cache Tier (warm)
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              This lands directly on the tier of the KV cache hierarchy (warm). If OCI productises the KV cache hierarchy gains a rung between DRAM and
              pod flash. That is a <strong>genuine architectural play</strong>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}>
              <div className="text-xs font-bold mb-1" style={{ color: "#22d3ee" }}>OCI Integration</div>
              <div className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
                OCI is still an ingredient that has to be worked into an offering. Intel positions it as enabling coherent memory expansion and resource disaggregation.
              </div>
            </div>
            <div className="p-3 rounded" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)" }}>
              <div className="text-xs font-bold mb-1" style={{ color: "#22d3ee" }}>Memory Disaggregation</div>
              <div className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
                "Why this matters to the agentic storage architecture": at "14 Gbps inbound" (Battlematrix), memory disaggregation becomes a genuine planning surface.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "ipu",
      title: "Infrastructure Processing Unit",
      subtitle: "IPU Adapter E2100 for packet processing and storage acceleration",
      accent: "#fb923c",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-body)" }}>
            The Intel IPU Adapter E2100 delivers infrastructure acceleration, virtual storage enablement and enhanced security, with a rich
            packet-processing pipeline, 200GbE bandwidth, and <Highlight color="#fb923c">NVMe</Highlight>, compression and crypto accelerators; an Arm Neoverse N1 compute
            complex runs customer-provided software for packet-processing, storage transport, device management and telemetry.
          </p>
          <div className="p-4 rounded-lg" style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "#fb923c" }}>Positioning Context</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              Positioning is to replace local disk with detached virtualized storage. The E2100's Lookaside Crypto Engine provides device-level
              and storage-level encryption for data at rest, alongside in-flight protocols (DTLS, QUIC, IPSec, PSP).
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
            <strong>The successor, IPU E2200</strong> codenamed Mount Morgan, was presented at Hot Chips 2025 — a 7SND N5 chip and the update to the
            E2100. Google used the E2100 series as a DPU solution.
          </p>
        </div>
      ),
    },
    {
      id: "ethernet",
      title: "Ethernet",
      subtitle: "E830 series network adapters for storage fabric",
      accent: "#34d399",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-body)" }}>
            The Intel Ethernet E830 series supports up to four ports of 50 GbE or a single 200 Gigabit link over PCIe 5.0 x8, and Intel
            introduced <Highlight color="#34d399">E835</Highlight> networking products alongside Xeon 6+, aimed at agentic AI orchestration and telecom/cloud workloads.
          </p>
          <div className="p-4 rounded-lg" style={{ background: "var(--dm-surface-a)", border: "1px solid var(--dm-border-a)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "#34d399" }}>Storage Relevance</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--dm-txt-secondary)" }}>
              The service east-west plane and the S3/NFS front-end. Not the scale-up or context-memory fabric, where InfiniBand and 800G Ethernet dominate.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "oci",
      title: "Silicon photonics / Optical Compute Interconnect",
      subtitle: "Integrated optical I/O for next-generation fabrics",
      accent: "#f472b6",
      content: (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--dm-txt-body)" }}>
            At OFC 2024 Intel demonstrated a fully integrated OCI chiplet co-packaged with an Intel CPU running live data:
          </p>
          <ul className="space-y-2 ml-4">
            <li className="text-sm flex items-start gap-2" style={{ color: "var(--dm-txt-body)" }}>
              <span className="text-pink-400 mt-1">•</span>
              <span>supporting up to 4 <Highlight color="#f472b6">Tbps</Highlight> bidirectional transfer and compatible with PCIe Gen5;</span>
            </li>
            <li className="text-sm flex items-start gap-2" style={{ color: "var(--dm-txt-body)" }}>
              <span className="text-pink-400 mt-1">•</span>
              <span>the chiplet can also be integrated with next-generation CPUs, GPUs, IPUs and other SoCs;</span>
            </li>
            <li className="text-sm flex items-start gap-2" style={{ color: "var(--dm-txt-body)" }}>
              <span className="text-pink-400 mt-1">•</span>
              <span>it supports 64 channels of 32 Gbps in each direction up to 100 metres using eight fibre pairs each carrying eight DWDM
              wavelengths, at <Highlight color="#f472b6">5 μJ/bit</Highlight> versus roughly <Highlight color="#f472b6">15 pJ/bit</Highlight> for pluggable optical transceivers.</span>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "software",
      title: "Software plays",
      subtitle: "Intel-maintained and Intel-originated storage software projects",
      accent: "#fbbf24",
      content: (
        <div className="space-y-4">
          <Table
            headers={["Project", "Role", "Intel's Current Relationship"]}
            rows={[
              [
                <Highlight color="#fbbf24">isa-l</Highlight>,
                "Erasure coding, CRC, compression primitives",
                "Intel-maintained; embedded in Ceph, SPDK, DAOS"
              ],
              [
                <Highlight color="#fbbf24">SPDK</Highlight>,
                <>User-space <Highlight color="#fbbf24">NVMe</Highlight>/<Highlight color="#fbbf24">NVMe-oF</Highlight>, poll-mode drivers</>,
                "Intel-originated, breadth adopted"
              ],
              [
                <Highlight color="#fbbf24">DPDK</Highlight>,
                "User-space packet processing",
                "Intel-originated; industry defacto"
              ],
              [
                <>
                  <Highlight color="#fbbf24">QATzip</Highlight> / QAT Engine for OpenSSL
                </>,
                "The integration surface for QAT",
                "Intel-maintained"
              ],
              [
                <Highlight color="#fbbf24">DaOS</Highlight>,
                "Distributed async object store",
                "Originated at Intel in 2015 as a HPC research project, v2.6 in July 2024 was the last intel release, with v2.8 the first community release and v3.0 in development"
              ],
              [
                <Highlight color="#fbbf24">oneAPI</Highlight>,
                "Toolkit",
                <>
                  <Highlight color="#fbbf24">oneAPI</Highlight> 2025.0 ships with full Clearwater Forest support
                </>
              ],
            ]}
          />
          <p className="text-xs" style={{ color: "var(--dm-txt-secondary)" }}>
            These projects form the reference integration surface for Intel hardware features in storage stacks. SPDK and isa-l are the two
            most broadly embedded; QATzip and QAT Engine gate QAT adoption.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <div className="px-6 pt-8 pb-16 max-w-screen-xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack}
            className="flex items-center gap-2 text-sm transition-colors"
            style={{ color: "var(--dm-txt-faint)" }}>
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Silicon
          </button>
          <span style={{ color: "var(--dm-txt-faintest)" }}>/</span>
          <span className="text-sm font-semibold" style={{ color: "#fbbf24" }}>Storage</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>Storage</h1>
          <p className="mt-3 text-base leading-relaxed max-w-4xl" style={{ color: "var(--dm-txt-secondary)" }}>
            Intel technologies for agentic AI storage — from instruction-set acceleration and on-die accelerators to CXL memory expansion,
            IPU packet processing, high-speed Ethernet fabrics, and the software projects that integrate them. This catalog maps hardware
            features to storage workloads and tracks commercial and open-source vendor adoption.
          </p>
        </div>

        {/* Accordion sections */}
        <div className="space-y-0">
          {sections.map(section => (
            <AccordionItem
              key={section.id}
              section={section}
              isOpen={expanded.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
