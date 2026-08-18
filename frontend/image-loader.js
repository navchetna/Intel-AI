// Custom next/image loader.
//
// Bypasses the `/_next/image` optimizer (which cannot fetch local sources when
// the app is served under a reverse-proxied URL prefix, yielding 400s) and
// returns the raw public asset path prefixed with the deployment base path.
// The browser then requests e.g. `/intel-ai/intel-logo.webp`, served directly
// from /public. Remote URLs are returned unchanged.
//
// Keep the prefix logic in sync with next.config.ts / lib/deployment.ts.
function normalizePrefix(value) {
  const raw = (value ?? "/intel-ai").trim().replace(/\/+$/, "");
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

const PREFIX = normalizePrefix(process.env.NEXT_PUBLIC_BASE_PATH);

export default function intelImageLoader({ src, width }) {
  if (/^https?:\/\//.test(src)) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  // The static file server always returns the same asset regardless of this
  // query param — it exists only so the URL varies by width, which is what
  // Next's dev-mode loader check requires to recognize width support.
  return `${PREFIX}${path}?w=${width}`;
}
