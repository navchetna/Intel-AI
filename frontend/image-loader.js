// Custom next/image loader.
//
// The deployment proxy (nginx) strips the `/intel-ai/` prefix before forwarding
// to this app, and Next.js does NOT apply `assetPrefix` to next/image URLs.
// This loader returns the raw asset path with the prefix prepended, so the
// browser requests `/intel-ai/intel-logo.webp` and nginx strips it back to
// `/intel-logo.webp` (served from /public). Remote URLs are returned unchanged.
// Override with NEXT_PUBLIC_ASSET_PREFIX.
const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "/intel-ai";

export default function intelImageLoader({ src }) {
  if (/^https?:\/\//.test(src)) return src;
  return `${ASSET_PREFIX}${src}`;
}
