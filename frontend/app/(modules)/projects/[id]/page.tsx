"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/contexts/ProjectContext";
import { ProjectSummaryView } from "@/modules/projects/ProjectSummaryView";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const { currentProject, loadProject } = useProject();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) { setError("Invalid project id."); setLoading(false); return; }
    if (currentProject?.id === id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    loadProject(id)
      .then(() => { if (!cancelled) setLoading(false); })
      .catch(e => { if (!cancelled) { setError(e instanceof Error ? e.message : String(e)); setLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--dm-page-bg)" }}>
        <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading project">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(129,140,248,0.25)", borderTopColor: "transparent" }} />
          <span className="text-[12px] text-white/35">Loading project…</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--dm-page-bg)" }}>
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-3 py-1.5 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-danger" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-danger">Couldn&rsquo;t load project</span>
          </div>
          <p className="text-sm text-white/45">{error}</p>
        </div>
      </main>
    );
  }

  return <ProjectSummaryView />;
}
