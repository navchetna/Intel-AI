import type { Metadata } from "next";
import { withBase } from "@/lib/deployment";
import { inferenceNav } from "@/modules/inference";

export const metadata: Metadata = { title: "Optimizations — Inference — Intel-AI" };

const optimizations =
  inferenceNav.find((item) => item.href === "/inference/optimizations")?.children ?? [];

export default function OptimizationsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">inference</p>
      <h1 className="mt-3 text-3xl font-bold text-intel-dark sm:text-4xl">Optimizations</h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">
        Runtime techniques to push inference throughput and efficiency on Intel silicon.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {optimizations.map((opt) => (
          <li key={opt.href}>
            <a
              href={withBase(opt.href)}
              className="group flex items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-intel-blue/40 hover:shadow-md"
            >
              <span className="text-base font-semibold text-intel-dark">{opt.label}</span>
              <span aria-hidden className="text-intel-blue transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
