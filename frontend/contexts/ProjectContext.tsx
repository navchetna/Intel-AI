"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  createProject as apiCreateProject, fetchProject, fetchProjects, updateProjectData,
} from "@/modules/projects/api";
import { EMPTY_PROJECT_DATA, type ProjectData, type ProjectSummary } from "@/modules/projects/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface ProjectCtx {
  currentProject: ProjectSummary | null;
  data: ProjectData;
  projects: ProjectSummary[];
  saveStatus: SaveStatus;
  listError: string | null;
  projectsLoading: boolean;
  refreshProjects: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  loadProject: (id: number) => Promise<void>;
  updateAgenticStack: (patch: Partial<ProjectData["agenticStack"]>) => void;
  updateModels: (patch: Partial<ProjectData["models"]>) => void;
}

const Ctx = createContext<ProjectCtx>({
  currentProject: null,
  data: EMPTY_PROJECT_DATA,
  projects: [],
  saveStatus: "idle",
  listError: null,
  projectsLoading: true,
  refreshProjects: async () => {},
  createProject: async () => {},
  loadProject: async () => {},
  updateAgenticStack: () => {},
  updateModels: () => {},
});

/** Defensive against older/partial stored blobs — always yields a complete shape. */
function normalizeProjectData(raw: unknown): ProjectData {
  const d = (raw ?? {}) as Partial<ProjectData>;
  return {
    agenticStack: { selectedWorkloads: [], sizingInputs: {}, ...d.agenticStack },
    models: { selectedModels: [], modelSizing: {}, ...d.models },
  };
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<ProjectSummary | null>(null);
  const [data, setData]           = useState<ProjectData>(EMPTY_PROJECT_DATA);
  const [projects, setProjects]   = useState<ProjectSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [listError, setListError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const projectIdRef = useRef<number | null>(null);
  const saveTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      setProjects(await fetchProjects());
      setListError(null);
    } catch {
      setListError("Couldn't load projects — check your connection and try again.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  useEffect(() => { refreshProjects(); }, [refreshProjects]);

  function scheduleSave(next: ProjectData) {
    if (!projectIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      const id = projectIdRef.current;
      if (!id) return;
      try {
        const saved = await updateProjectData(id, next);
        setSaveStatus("saved");
        setCurrentProject(prev => prev && prev.id === id ? { ...prev, updated_at: saved.updated_at } : prev);
        setProjects(prev => prev.map(p => p.id === id ? { ...p, updated_at: saved.updated_at } : p));
      } catch {
        setSaveStatus("error");
      }
    }, 800);
  }

  function updateAgenticStack(patch: Partial<ProjectData["agenticStack"]>) {
    setData(prev => {
      const next = { ...prev, agenticStack: { ...prev.agenticStack, ...patch } };
      scheduleSave(next);
      return next;
    });
  }

  function updateModels(patch: Partial<ProjectData["models"]>) {
    setData(prev => {
      const next = { ...prev, models: { ...prev.models, ...patch } };
      scheduleSave(next);
      return next;
    });
  }

  async function createProject(name: string) {
    const project = await apiCreateProject(name, data);
    projectIdRef.current = project.id;
    setCurrentProject({ id: project.id, name: project.name, updated_at: project.updated_at });
    setData(normalizeProjectData(project.data));
    setSaveStatus("saved");
    await refreshProjects();
  }

  async function loadProject(id: number) {
    const project = await fetchProject(id);
    projectIdRef.current = project.id;
    setCurrentProject({ id: project.id, name: project.name, updated_at: project.updated_at });
    setData(normalizeProjectData(project.data));
    setSaveStatus("saved");
  }

  return (
    <Ctx.Provider value={{
      currentProject, data, projects, saveStatus, listError, projectsLoading,
      refreshProjects, createProject, loadProject,
      updateAgenticStack, updateModels,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProject() { return useContext(Ctx); }
