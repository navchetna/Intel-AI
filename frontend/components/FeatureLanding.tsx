import { withBase } from "@/lib/deployment";

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
    <main className="min-h-screen" style={{ background: "var(--dm-page-bg)" }}>
      <section>
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-wide text-intel-blue">
            {content.tagline}
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl" style={{ color: "var(--dm-txt-primary)" }}>
            {content.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg" style={{ color: "var(--dm-txt-secondary)" }}>{content.description}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={withBase("/")}
              className="rounded-md bg-intel-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-intel-dark"
            >
              Back home
            </a>
            <code
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: "var(--dm-surface-b)", color: "var(--dm-txt-muted)", boxShadow: "inset 0 0 0 1px var(--dm-border-b)" }}
            >
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
              className="rounded-xl border p-6 shadow-sm"
              style={{ borderColor: "var(--dm-card-border)", background: "var(--dm-card-bg)" }}
            >
              <h3 className="text-lg font-semibold" style={{ color: "var(--dm-txt-primary)" }}>{highlight.title}</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--dm-txt-secondary)" }}>{highlight.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
