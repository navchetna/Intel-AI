"use client";

import Link from "next/link";

// ── Primitives ─────────────────────────────────────────────────────────────────

function RowLabel({ text }: { text: string }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{ width: 52, background: "#FFE000" }}
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
  href?: string;
  grayed?: boolean;
  variant?: ChipVariant;
  className?: string;
};

const CHIP_STYLES: Record<ChipVariant, string> = {
  primary:   "bg-[#1262B5] hover:bg-[#0D52A0] text-white",
  dark:      "bg-[#0B3E72] hover:bg-[#092F58] text-white",
  sambanova: "text-white",
  sub:       "bg-[#0E5BA8] hover:bg-[#0A4A8C] text-white",
};

function Chip({ label, sub, href, grayed = false, variant = "primary", className = "" }: ChipProps) {
  const base = "rounded-lg flex flex-col items-center justify-center text-center px-4 py-2.5 transition-all duration-150 select-none";
  const color = grayed
    ? "bg-[#9EA8B3] text-white cursor-not-allowed"
    : variant === "sambanova"
      ? "cursor-pointer hover:opacity-90 hover:shadow-lg hover:-translate-y-[1px]"
      : `${CHIP_STYLES[variant]} ${href ? "cursor-pointer hover:shadow-lg hover:-translate-y-[1px]" : "cursor-default"}`;

  const sambanovaStyle = variant === "sambanova" && !grayed
    ? { background: "linear-gradient(135deg, #1262B5 0%, #6941B5 50%, #B05AB0 100%)" }
    : {};

  const inner = (
    <div className={`${base} ${color} ${className}`} style={sambanovaStyle}>
      <span className={`font-semibold leading-tight ${sub ? "text-[13px]" : "text-[14px]"}`}>{label}</span>
      {sub && <span className="text-[11px] opacity-75 mt-0.5 leading-tight">{sub}</span>}
    </div>
  );

  if (href && !grayed) return <Link href={href}>{inner}</Link>;
  return inner;
}

function BandDivider() {
  return <div style={{ borderBottom: "1px solid var(--diag-border)" }} />;
}

// ── Silicon group box ──────────────────────────────────────────────────────────

function SiliconGroup({
  title, subtitle, chips, samba = false, href,
}: {
  title: string; subtitle: string;
  chips: { label: string; href?: string }[];
  samba?: boolean; href?: string;
}) {
  const borderColor = samba ? "rgba(180,130,210,0.40)" : "rgba(18,98,181,0.28)";
  const bgStyle = samba
    ? { background: "linear-gradient(145deg, rgba(180,130,210,0.18) 0%, rgba(100,60,180,0.12) 100%)" }
    : { background: "var(--diag-group-bg)" };

  const titleEl = href
    ? (
      <Link href={href} className="hover:underline">
        <span className="text-xl font-black hover:text-[#1262B5]" style={{ color: "var(--diag-group-title)" }}>
          {title}
        </span>
      </Link>
    )
    : <span className="text-xl font-black" style={{ color: "var(--diag-group-title)" }}>{title}</span>;

  return (
    <div
      className="flex-1 rounded-xl p-4 flex flex-col gap-3"
      style={{ border: `1px solid ${borderColor}`, ...bgStyle }}
    >
      <div className="text-center">
        {titleEl}
        <div className="text-[12px] mt-0.5" style={{ color: "var(--diag-group-sub)" }}>{subtitle}</div>
      </div>
      <div className="flex gap-2 justify-center flex-wrap">
        {chips.map(c => (
          <Chip key={c.label} label={c.label} href={c.href} variant={samba ? "sambanova" : "primary"} />
        ))}
      </div>
    </div>
  );
}

// ── Main diagram ───────────────────────────────────────────────────────────────

export function IntelStackDiagram() {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md w-full"
      style={{ background: "var(--diag-bg)", border: "1px solid var(--diag-border)" }}
    >

      {/* ── SOFTWARE ── */}
      <div className="flex">
        <RowLabel text="SOFTWARE" />
        <div className="flex-1 px-6 py-5" style={{ borderLeft: "1px solid var(--diag-border)" }}>
          <BandTitle>Agents, Inference, Retrieval, System-Management</BandTitle>
          <div className="flex gap-3 flex-wrap">
            <Chip label="Agentic Toolkit" href="/agentic-stack" />
            <Chip label="Serving: vllm, vllmd, dynamo, sglang" href="/serving-engines" />
            <Chip label="Multi-Modal Pipelines" />
            <Chip label="Search, Data Pipelines" />
            <Chip label="Models: SoC, SW Consulting" href="/models" grayed />
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
            style={{ background: "#0B3E72" }}
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
              href="/silicon"
              chips={[
                { label: "Diamond Rapids", href: "/silicon" },
                { label: "Coral Rapids",   href: "/silicon" },
                { label: "Iron Rapids",    href: "/silicon" },
              ]}
            />
            <SiliconGroup
              title="Island GPU"
              subtitle="inference"
              href="/silicon"
              chips={[
                { label: "Crescent Island", href: "/silicon" },
                { label: "Next Island",     href: "/silicon" },
              ]}
            />
            <SiliconGroup
              title="SambaNova RDU"
              subtitle="decode – dataflow"
              href="/silicon"
              samba
              chips={[
                { label: "SN50", href: "/silicon" },
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
            <div className="rounded-lg overflow-hidden flex flex-col items-center"
              style={{ background: "#1262B5" }}>
              <span className="text-white font-semibold text-[14px] px-6 py-2">IPU</span>
              <div className="flex gap-1 px-2 pb-2">
                {["E2100", "E2200", "MMG800"].map(s => (
                  <span key={s} className="rounded px-2 py-1 text-[11px] font-medium text-white"
                    style={{ background: "#0A4D96" }}>{s}</span>
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
