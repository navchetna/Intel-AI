"use client";

import Link from "next/link";
import { useProject } from "@/contexts/ProjectContext";

const SAVE_LABEL: Record<string, string> = {
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

/** Compact current-project + save-status badge. Switching/creating/exporting projects lives in the left sidebar and the project summary page — this just shows which project you're in, from anywhere. */
export function ProjectSelector() {
  const { currentProject, saveStatus } = useProject();

  if (!currentProject) return null;

  return (
    <Link
      href={`/projects/${currentProject.id}`}
      title={`Current project: ${currentProject.name}`}
      className="nav-link flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
      <span className="max-w-[180px] truncate">{currentProject.name}</span>
      <span
        className={`text-[10px] ${saveStatus === "error" ? "text-danger" : ""}`}
        style={saveStatus === "error" ? undefined : { color: "var(--dm-nav-text-dim)" }}
      >
        {SAVE_LABEL[saveStatus] ?? ""}
      </span>
    </Link>
  );
}
