"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { NavCluster } from "@/lib/navigation";

const STORAGE_KEY = "intel-ai-nav-visibility";

/** Clusters the user can hide from the navbar. Hardware, Enterprise Transformation, and
 *  Catalog are always shown. */
export type HideableCluster = Extract<NavCluster, "manufacturing" | "tools" | "ai-training">;

interface NavSettingsCtx {
  visibility: Record<HideableCluster, boolean>;
  setVisible: (cluster: HideableCluster, visible: boolean) => void;
}

const DEFAULTS: Record<HideableCluster, boolean> = { manufacturing: true, tools: true, "ai-training": true };

const Ctx = createContext<NavSettingsCtx>({ visibility: DEFAULTS, setVisible: () => {} });

export function NavSettingsProvider({ children }: { children: React.ReactNode }) {
  const [visibility, setVisibility] = useState<Record<HideableCluster, boolean>>(DEFAULTS);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      setVisibility(v => ({ ...v, ...parsed }));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  }, [visibility]);

  const setVisible = (cluster: HideableCluster, visible: boolean) =>
    setVisibility(v => ({ ...v, [cluster]: visible }));

  return <Ctx.Provider value={{ visibility, setVisible }}>{children}</Ctx.Provider>;
}

export function useNavSettings() { return useContext(Ctx); }
