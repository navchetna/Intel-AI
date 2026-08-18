"use client";

import { AgenticLandingView } from "./AgenticLandingView";
import { AgenticStackPageView } from "./AgenticStackPageView";
import { useProject } from "@/contexts/ProjectContext";

/** Entry point for the Agents nav item — shows the project-scoped stack once a
 *  project is selected, otherwise the "Select a Project" landing screen. */
export function AgenticAiEntryView() {
  const { currentProject } = useProject();
  return currentProject ? <AgenticStackPageView /> : <AgenticLandingView />;
}
