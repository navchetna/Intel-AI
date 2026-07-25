"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--dm-page-bg)" }}>
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-3 py-1.5 mb-6">
          <div className="w-1.5 h-1.5 rounded-full bg-danger" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-danger">Something went wrong</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mb-3">This page hit an unexpected error</h1>
        <p className="text-sm text-white/45 mb-8 leading-relaxed">
          {error.message || "An unknown error occurred while rendering this page."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-intel-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-intel-dark transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
