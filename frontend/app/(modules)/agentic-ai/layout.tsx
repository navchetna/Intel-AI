import { AgenticSubNav } from "@/modules/agentic-ai";

export default function AgenticAiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgenticSubNav />
      {children}
    </>
  );
}
