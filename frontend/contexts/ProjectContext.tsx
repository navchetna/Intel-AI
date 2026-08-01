"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  createProject as apiCreateProject, fetchProject, fetchProjects, renameProject as apiRenameProject, updateProjectData,
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
  updateOverview: (patch: Partial<ProjectData["overview"]>) => void;
  updateAgenticStack: (patch: Partial<ProjectData["agenticStack"]>) => void;
  updateModels: (patch: Partial<ProjectData["models"]>) => void;
  updateAgents: (patch: Partial<ProjectData["agents"]>) => void;
  saveNow: () => Promise<void>;
  renameProject: (name: string) => Promise<void>;
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
  updateOverview: () => {},
  updateAgenticStack: () => {},
  updateModels: () => {},
  updateAgents: () => {},
  saveNow: async () => {},
  renameProject: async () => {},
});

/** Defensive against older/partial stored blobs — always yields a complete shape. */
function normalizeProjectData(raw: unknown): ProjectData {
  const d = (raw ?? {}) as Partial<ProjectData>;
  return {
    overview: { description: "", keyParameters: [], ...d.overview },
    agenticStack: { selectedWorkloads: [], sizingInputs: {}, ...d.agenticStack },
    models: { selectedModels: [], modelSizing: {}, ...d.models },
    agents: { businessProcesses: [], ...d.agents },
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

  async function performSave(id: number, next: ProjectData) {
    setSaveStatus("saving");
    try {
      const saved = await updateProjectData(id, next);
      setSaveStatus("saved");
      setCurrentProject(prev => prev && prev.id === id ? { ...prev, updated_at: saved.updated_at } : prev);
      setProjects(prev => prev.map(p => p.id === id ? { ...p, updated_at: saved.updated_at } : p));
    } catch {
      setSaveStatus("error");
    }
  }

  function scheduleSave(next: ProjectData) {
    if (!projectIdRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      const id = projectIdRef.current;
      if (id) performSave(id, next);
    }, 800);
  }

  /** Flushes any pending debounced save immediately — for an explicit "Save" button. */
  async function saveNow() {
    const id = projectIdRef.current;
    if (!id) return;
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    await performSave(id, data);
  }

  function updateOverview(patch: Partial<ProjectData["overview"]>) {
    setData(prev => {
      const next = { ...prev, overview: { ...prev.overview, ...patch } };
      scheduleSave(next);
      return next;
    });
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

  function updateAgents(patch: Partial<ProjectData["agents"]>) {
    setData(prev => {
      const next = { ...prev, agents: { ...prev.agents, ...patch } };
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

  async function renameProject(name: string) {
    const id = projectIdRef.current;
    if (!id) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const saved = await apiRenameProject(id, trimmed);
    setCurrentProject(prev => prev && prev.id === id ? { ...prev, name: saved.name, updated_at: saved.updated_at } : prev);
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: saved.name, updated_at: saved.updated_at } : p));
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
      updateOverview, updateAgenticStack, updateModels, updateAgents, saveNow, renameProject,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProject() { return useContext(Ctx); }
