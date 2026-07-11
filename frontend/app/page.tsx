import { IntelStackDiagram } from "@/modules/home/IntelStackDiagram";

export default function Home() {
  return (
    <main className="mx-auto max-w-screen-xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--dm-txt-primary)" }}>
          Intel-AI Platform
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--dm-txt-secondary)" }}>
          Click any component to explore its workspace
        </p>
      </div>
      <IntelStackDiagram />
    </main>
  );
}
