"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "intel-ai-app-mode";

/** Which half of the app the Navbar shows.
 *  planning    : everything except Silicon and the Model Inferencing Calculator — Business
 *                Process, Agents, Auxiliary Models, Harness, Catalog, AI-Training, Manufacturing, Tools.
 *  inferencing : just Silicon and the Model Inferencing Calculator (formerly Models > Deep Analysis). */
export type AppMode = "planning" | "inferencing";

export const APP_MODE_LABELS: Record<AppMode, string> = {
  planning: "Agentic Capacity Planning & Solutioning",
  inferencing: "Model Inferencing Calculator",
};

interface AppModeCtx {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const DEFAULT_MODE: AppMode = "planning";

const Ctx = createContext<AppModeCtx>({ mode: DEFAULT_MODE, setMode: () => {} });

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AppMode>(DEFAULT_MODE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "planning" || stored === "inferencing") setMode(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export function useAppMode() { return useContext(Ctx); }
