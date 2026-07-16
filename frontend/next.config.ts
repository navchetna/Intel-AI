import type { NextConfig } from "next";

// ---------------------------------------------------------------------------
// Single, configurable URL prefix for the whole app.
//
// `basePath` makes Next.js serve EVERY route, page and static asset
// (`_next/static/*` CSS + JS) as well as `next/image` URLs under this prefix.
// Because Next owns the prefix end-to-end, the reverse proxy must forward the
// path as-is (do NOT strip the prefix) — this is what fixes broken CSS.
//
// Configure at build time via NEXT_PUBLIC_BASE_PATH:
//   - "/intel-ai" (default) serves the app under https://host/intel-ai/...
//   - ""          serves the app at the root (deploy on a server with no prefix)
// The value is normalized below, so "intel-ai", "/intel-ai" and "/intel-ai/"
// are all treated the same. Set to "" to remove the prefix entirely.
// ---------------------------------------------------------------------------
function normalizePrefix(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).trim().replace(/\/+$/, "");
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

const basePath = normalizePrefix(process.env.NEXT_PUBLIC_BASE_PATH, "/intel-ai");

const bluelensUrl = process.env.BLUELENS_URL ?? "http://intel-bluelens:3003";
// The backend is internal-only (no host port). Browser API calls hit this app
// same-origin under the prefix and are proxied to the backend service DNS name.
const backendUrl = process.env.BACKEND_URL ?? "http://backend:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // basePath alone prefixes routes, next/link, next/router, next/image and all
  // `_next/static` assets. We deliberately do NOT set `assetPrefix`: combined
  // with basePath it makes the image optimizer fetch sources at the un-prefixed
  // path (e.g. `/logo.webp` -> 404) and return 400.
  ...(basePath ? { basePath } : {}),
  images: {
    // A custom loader prepends the deployment prefix and returns the raw public
    // path, bypassing `/_next/image`. The optimizer can't fetch local sources
    // behind a prefixed reverse proxy (400s), and basePath is NOT applied to
    // raw <img src>, so the loader is what carries the prefix onto image URLs.
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
  async rewrites() {
    // Intel BlueLens runs in a separate container whose Vite `base` is `/intel-bluelens/`.
    // Browser requests `${basePath}/intel-bluelens/*` for pages, but assets use absolute `/intel-bluelens/*` paths.
    // Both need to be proxied to the container at `/intel-bluelens/*`.
    // `basePath: false` matches the fully-qualified source path so this keeps working whatever prefix is configured.
    return {
      beforeFiles: [
        {
          // Proxy `${basePath}/api/*` to the internal backend (no host port).
          source: `${basePath}/api/:path*`,
          destination: `${backendUrl}/api/:path*`,
          basePath: false,
        },
        // Intel BlueLens: prefixed paths (for page navigation)
        {
          source: `${basePath}/intel-bluelens`,
          destination: `${bluelensUrl}/intel-bluelens/`,
          basePath: false,
        },
        {
          source: `${basePath}/intel-bluelens/`,
          destination: `${bluelensUrl}/intel-bluelens/`,
          basePath: false,
        },
        {
          source: `${basePath}/intel-bluelens/:path*`,
          destination: `${bluelensUrl}/intel-bluelens/:path*`,
          basePath: false,
        },
        // Intel BlueLens: non-prefixed paths (for assets referenced in the HTML)
        {
          source: `/intel-bluelens`,
          destination: `${bluelensUrl}/intel-bluelens/`,
          basePath: false,
        },
        {
          source: `/intel-bluelens/`,
          destination: `${bluelensUrl}/intel-bluelens/`,
          basePath: false,
        },
        {
          source: `/intel-bluelens/:path*`,
          destination: `${bluelensUrl}/intel-bluelens/:path*`,
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;
