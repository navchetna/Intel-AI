import { withBase } from "@/lib/deployment";

/** Minimal placeholder for not-yet-built Inference sub-sections. */
export function SectionPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">inference</p>
      <h1 className="mt-3 text-3xl font-bold text-intel-dark sm:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-gray-600">{description}</p>
      <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-intel-haze/30 p-8 text-center">
        <p className="text-sm text-gray-500">This section is coming soon.</p>
      </div>
      <a
        href={withBase("/inference")}
        className="mt-8 inline-block rounded-md bg-intel-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-intel-dark"
      >
        Back to Inference
      </a>
    </main>
  );
}
