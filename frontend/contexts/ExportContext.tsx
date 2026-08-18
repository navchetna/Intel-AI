"use client";

/** Lets the currently-mounted page register an "Export to Excel" action that the Navbar renders
 *  and drives — so the button lives in one place (the navbar) but its behavior comes from
 *  whichever page is active. A page with no export capability leaves the registry empty and the
 *  navbar shows nothing. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface ExportRegistration {
  label: string;
  handler: () => Promise<void>;
}

interface ExportCtx {
  registration: ExportRegistration | null;
  register: (reg: ExportRegistration | null) => void;
}

const Ctx = createContext<ExportCtx>({ registration: null, register: () => {} });

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [registration, setRegistration] = useState<ExportRegistration | null>(null);
  const register = useCallback((reg: ExportRegistration | null) => setRegistration(reg), []);
  const value = useMemo(() => ({ registration, register }), [registration, register]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExportRegistry() {
  return useContext(Ctx);
}

/** Registers `handler` as the navbar's Export-to-Excel action for as long as the calling
 *  component is mounted; unregisters on unmount. Pass `null` to temporarily hide the button
 *  (e.g. while a page's export isn't ready yet, such as no project selected). */
export function useRegisterExport(handler: (() => Promise<void>) | null, label = "Export to Excel"): void {
  // `register` is `setRegistration` from useState, which React guarantees is stable, so it's
  // safe to depend on directly.
  const { register } = useExportRegistry();

  useEffect(() => {
    if (!handler) { register(null); return; }
    register({ label, handler });
    return () => register(null);
  }, [handler, label, register]);
}
