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
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
      <span
        className="h-2 w-2 rounded-full bg-intel-energy"
        aria-hidden="true"
      />
      {count === null ? "—" : count.toLocaleString()} visitors
    </span>
  );
}
