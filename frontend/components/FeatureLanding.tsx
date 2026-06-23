import Link from "next/link";

export interface FeatureHighlight {
  title: string;
  body: string;
}

/**
 * Shape of a feature route's landing content. Each module under
 * `frontend/modules/<name>/` exports one of these from its `content.ts`.
 */
export interface FeatureContent {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  /** Backend API prefix this feature will call. */
  apiPrefix: string;
  highlights: FeatureHighlight[];
}

/** Reusable Intel-themed landing page for a feature route. */
export function FeatureLanding({ content }: { content: FeatureContent }) {
  return (
    <main>
      <section className="bg-gradient-to-b from-intel-haze to-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">
            {content.tagline}
          </p>
          <h1 className="mt-3 text-4xl font-bold text-intel-dark sm:text-5xl">
            {content.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-600">{content.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-md bg-intel-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-intel-dark"
            >
              Back home
            </Link>
            <code className="rounded-md bg-white px-3 py-2 text-sm text-gray-500 ring-1 ring-gray-200">
              API prefix: {content.apiPrefix}
            </code>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {content.highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-intel-dark">{highlight.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{highlight.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
