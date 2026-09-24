import { IntelStackDiagram } from "@/modules/home/IntelStackDiagram";

export default function Home() {
  return (
    <main className="mx-auto max-w-screen-xl px-6 py-10">
      <div className="mb-8">
        <div className="w-10 h-1 rounded-full mb-3" style={{ background: "linear-gradient(90deg, #0071c5, #00c7fd)" }} />
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--dm-txt-primary)" }}>
          Intel-AI Platform
        </h1>
      </div>
      <IntelStackDiagram />
    </main>
  );
}
