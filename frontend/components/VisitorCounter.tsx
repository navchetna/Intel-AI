"use client";

import { useEffect, useState } from "react";
import { endpoints } from "@/lib/api/endpoints";

/**
 * Records a page visit on mount and displays the cumulative visitor count.
 *
 * Mounts once per full page load (rendered in the root layout), so each load
 * increments the counter exactly once.
 */
export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    endpoints.visits
      .record()
      .then((res) => {
        if (active) setCount(res.count);
      })
      .catch(() => {
        if (active) setCount(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-500 shadow-lg shadow-black/10 ring-1 ring-white/60">
      <span
        className="h-2 w-2 rounded-full bg-intel-energy shadow-[0_0_6px_rgba(0,199,253,0.8)] animate-pulse"
        aria-hidden="true"
      />
      {count === null ? "—" : count.toLocaleString()} visitors
    </span>
  );
}
