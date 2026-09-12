"use client";

/** Lets a page request that the project sidebar stay collapsed for as long as it's mounted —
 *  e.g. Models → Deep Analysis, which needs the horizontal real estate and has nothing to do
 *  with picking a project. Uses a request count rather than a single flag so it's safe even if
 *  more than one such page were ever mounted at once; the sidebar is force-collapsed whenever
 *  the count is > 0, on top of (never overriding) the user's own manual collapse toggle. */

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const Ctx = createContext<{ count: number; setCount: React.Dispatch<React.SetStateAction<number>> }>({
  count: 0,
  setCount: () => {},
});

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const value = useMemo(() => ({ count, setCount }), [count]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** True while at least one mounted page has requested the sidebar stay collapsed. */
export function useSidebarForceCollapsed(): boolean {
  const { count } = useContext(Ctx);
  return count > 0;
}

/** Call with `active: true` for as long as the current page wants the sidebar force-collapsed;
 *  the request is automatically withdrawn on unmount or when `active` flips to false. */
export function useRequestSidebarCollapsed(active: boolean): void {
  const { setCount } = useContext(Ctx);
  useEffect(() => {
    if (!active) return;
    setCount(c => c + 1);
    return () => setCount(c => c - 1);
  }, [active, setCount]);
}
