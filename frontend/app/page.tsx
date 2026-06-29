import { navRoutes } from "@/lib/navigation";
import { withBase } from "@/lib/deployment";

export default function Home() {
  return (
    <main>
      <section className="bg-gradient-to-b from-intel-haze to-white">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <span className="inline-block rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-wide text-intel-blue ring-1 ring-intel-blue/20">
            Powered by Intel
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-intel-dark sm:text-6xl">
            Intel-AI Platform
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
            A modular workbench for benchmarking, serving, and profiling AI models on Intel
            silicon. Pick a workspace below to get started.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={withBase("/llm-bench")}
              className="rounded-md bg-intel-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-intel-dark"
            >
              Explore LLM Bench
            </a>
            <a
              href={withBase("/intel-bluelens")}
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-intel-blue ring-1 ring-intel-blue/30 transition-colors hover:bg-intel-haze"
            >
              Open BlueLens
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-intel-dark">Workspaces</h2>
        <p className="mt-1 text-sm text-gray-500">Each route is a self-contained feature module.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {navRoutes.map((route) => {
            const cardClassName =
              "group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-intel-blue/40 hover:shadow-md";
            const cardBody = (
              <>
                <div className="h-1.5 w-10 rounded-full bg-intel-energy transition-all group-hover:w-16" />
                <h3 className="mt-4 text-lg font-semibold text-intel-dark">{route.label}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  <code className="rounded bg-gray-100 px-1">/{route.slug}</code>
                </p>
              </>
            );
            return (
              <a key={route.slug} href={withBase(`/${route.slug}`)} className={cardClassName}>
                {cardBody}
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
