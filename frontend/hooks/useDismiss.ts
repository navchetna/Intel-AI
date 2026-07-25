"use client";

import { useEffect, useRef } from "react";

/**
 * Click-outside + Escape-to-close for a dropdown/menu/panel.
 * Attach the returned ref to the menu's outer container (the element that
 * should NOT count as "outside" — typically wraps both the trigger button
 * and the panel content). Callers that want focus returned to the trigger
 * on close should do so inside `onClose` itself (e.g. `triggerRef.current?.focus()`).
 */
export function useDismiss<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  return ref;
}
