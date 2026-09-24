// Purely informational — every element below is static (no links, no hover affordances).

// ── Primitives ─────────────────────────────────────────────────────────────────

function RowLabel({ text }: { text: string }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{ width: 52, background: "linear-gradient(180deg, #FFE640 0%, #FFD400 100%)" }}
    >
      <span
        className="text-[13px] font-black text-gray-900 uppercase select-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.18em" }}
      >
        {text}
      </span>
    </div>
  );
}

function BandTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-center text-[14px] font-semibold mb-4 tracking-wide"
      style={{ color: "var(--diag-band-title)" }}
    >
      {children}
    </p>
  );
}

type ChipVariant = "primary" | "dark" | "sambanova" | "sub";
type ChipProps = {
  label: string;
  sub?: string;
  grayed?: boolean;
  variant?: ChipVariant;
  className?: string;
};

const CHIP_GRADIENTS: Record<ChipVariant, string> = {
  primary:   "linear-gradient(145deg, #1877D6 0%, #0E4E9C 100%)",
  dark:      "linear-gradient(145deg, #14488A 0%, #082B54 100%)",
  sambanova: "linear-gradient(135deg, #1262B5 0%, #6941B5 50%, #B05AB0 100%)",
  sub:       "linear-gradient(145deg, #1568B8 0%, #0A4A8C 100%)",
};

function Chip({ label, sub, grayed = false, variant = "primary", className = "" }: ChipProps) {
  const background = grayed ? "#9EA8B3" : CHIP_GRADIENTS[variant];
  return (
    <div
      className={`select-none rounded-lg flex flex-col items-center justify-center text-center px-4 py-2.5 text-white ${className}`}
      style={{
        background,
        boxShadow: grayed ? "none" : "0 1px 2px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.14)",
      }}
    >
      <span className={`font-semibold leading-tight ${sub ? "text-[13px]" : "text-[14px]"}`}>{label}</span>
      {sub && <span className="text-[11px] opacity-75 mt-0.5 leading-tight">{sub}</span>}
    </div>
  );
}

function BandDivider() {
  return <div style={{ borderBottom: "1px solid var(--diag-border)" }} />;
}

// ── Silicon group box ──────────────────────────────────────────────────────────

function SiliconGroup({
  title, subtitle, chips, samba = false,
}: {
  title: string; subtitle: string;
  chips: { label: string }[];
  samba?: boolean;
}) {
  const borderColor = samba ? "rgba(180,130,210,0.40)" : "rgba(18,98,181,0.28)";
  const bgStyle = samba
    ? { background: "linear-gradient(145deg, rgba(180,130,210,0.18) 0%, rgba(100,60,180,0.12) 100%)" }
    : { background: "var(--diag-group-bg)" };

  return (
    <div
      className="flex-1 rounded-xl p-4 flex flex-col gap-3"
      style={{ border: `1px solid ${borderColor}`, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", ...bgStyle }}
    >
      <div className="text-center">
        <span className="text-xl font-black" style={{ color: "var(--diag-group-title)" }}>{title}</span>
        <div className="text-[12px] mt-0.5" style={{ color: "var(--diag-group-sub)" }}>{subtitle}</div>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {chips.map(c => (
          <Chip key={c.label} label={c.label} variant={samba ? "sambanova" : "primary"} />
        ))}
      </div>
    </div>
  );
}

// ── Main diagram ───────────────────────────────────────────────────────────────

export function IntelStackDiagram() {
  return (
    <div
      className="intel-stack-diagram rounded-2xl overflow-hidden w-full"
      style={{
        background: "var(--diag-bg)",
        border: "1px solid var(--diag-border)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
      }}
    >

      {/* ── SOFTWARE ── */}
      <div className="flex">
        <RowLabel text="SOFTWARE" />
        <div className="flex-1 px-6 py-5" style={{ borderLeft: "1px solid var(--diag-border)" }}>
          <BandTitle>Agents, Inference, Retrieval, System-Management</BandTitle>
          <div className="flex gap-3 flex-wrap">
            <Chip label="Agentic Toolkit" />
            <Chip label="Serving: vllm, vllmd, dynamo, sglang" />
            <Chip label="Multi-Modal Pipelines" />
            <Chip label="Search, Data Pipelines" />
            <Chip label="Models: SoC, SW Consulting" grayed />
          </div>
          <div className="flex gap-3 mt-3 justify-center">
            <Chip label="IET SDK" />
            <Chip label="vTune" />
            <Chip label="RAS" />
          </div>
        </div>
      </div>

      <BandDivider />

      {/* ── SYSTEM ── */}
      <div className="flex">
        <RowLabel text="SYSTEM" />
        <div className="flex-1 px-6 py-5 flex items-center" style={{ borderLeft: "1px solid var(--diag-border)" }}>
          <div
            className="w-full rounded-lg flex items-center justify-center py-3 text-white font-semibold text-[15px]"
            style={{ background: "linear-gradient(145deg, #14488A 0%, #082B54 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
          >
            Rack Scale Designs
          </div>
        </div>
      </div>

      <BandDivider />

      {/* ── TRUST (no label) ── */}
      <div className="flex">
        <div
          className="flex-shrink-0"
          style={{ width: 52, borderRight: "1px solid var(--diag-border)", background: "var(--diag-label-col)" }}
        />
        <div className="flex-1 px-6 py-5">
          <BandTitle>Sovereign, Confidential Compute for Agents, Trusted Agent Identities</BandTitle>
          <div className="flex gap-3 justify-center">
            <Chip label="TDX" />
            <Chip label="Intel Trust Authority" />
          </div>
        </div>
      </div>

      <BandDivider />

      {/* ── SILICON ── */}
      <div className="flex" style={{ background: "var(--diag-silicon-bg)" }}>
        <RowLabel text="SILICON" />
        <div className="flex-1 px-6 py-5" style={{ borderLeft: "1px solid var(--diag-border)" }}>
          <BandTitle>
            Heterogeneous silicon: Encoders, Prefill, Decoder, Agentic Orchestration, Classic DC workloads
          </BandTitle>
          <div className="flex gap-4 items-stretch">
            <SiliconGroup
              title="Xeon"
              subtitle="host + orchestrate"
              chips={[
                { label: "Diamond Rapids" },
                { label: "Coral Rapids" },
                { label: "Iron Rapids" },
              ]}
            />
            <SiliconGroup
              title="Island GPU"
              subtitle="inference"
              chips={[
                { label: "Crescent Island" },
                { label: "Next Island" },
              ]}
            />
            <SiliconGroup
              title="SambaNova RDU"
              subtitle="decode – dataflow"
              samba
              chips={[
                { label: "SN50" },
              ]}
            />
          </div>
        </div>
      </div>

      <BandDivider />

      {/* ── NETWORKING (no label) ── */}
      <div className="flex">
        <div
          className="flex-shrink-0"
          style={{ width: 52, borderRight: "1px solid var(--diag-border)", background: "var(--diag-label-col)" }}
        />
        <div className="flex-1 px-6 py-5">
          <BandTitle>
            Ethernet leaf-spine · CXL · NVMe-oF · UALink · Silicon Photonics (optical I/O) · IPU offload
          </BandTitle>
          <div className="flex gap-3 flex-wrap items-start">
            <Chip label="Chiplets" />
            {/* IPU: outer card with inner sub-chips */}
            <div
              className="rounded-lg overflow-hidden flex flex-col items-center"
              style={{ background: "linear-gradient(145deg, #1877D6 0%, #0E4E9C 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14)" }}
            >
              <span className="text-white font-semibold text-[14px] px-6 py-2">IPU</span>
              <div className="flex gap-1 px-2 pb-2">
                {["E2100", "E2200", "MMG800"].map(s => (
                  <span key={s} className="rounded px-2 py-1 text-[11px] font-medium text-white"
                    style={{ background: "rgba(0,0,0,0.18)" }}>{s}</span>
                ))}
              </div>
            </div>
            <Chip label="CXL" />
            <Chip label="Ethernet" />
            <Chip label="Photonics" />
            <Chip label="Loihi" />
          </div>
        </div>
      </div>

      <BandDivider />

      {/* ── MFG. ── */}
      <div className="flex">
        <RowLabel text="MFG." />
        <div className="flex-1 px-6 py-5" style={{ borderLeft: "1px solid var(--diag-border)" }}>
          <BandTitle>Customer silicon engineering &amp; services</BandTitle>
          <div className="flex gap-3 justify-center flex-wrap">
            <Chip label="Packaging" />
            <Chip label="IP Blocks" />
            <Chip label="Model on Silicon" />
            <Chip label="Process &amp; Tools" />
          </div>
        </div>
      </div>

    </div>
  );
}
