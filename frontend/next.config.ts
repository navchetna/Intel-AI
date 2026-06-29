import type { NextConfig } from "next";

// The deployment proxy (nginx) STRIPS the `/intel-ai/` prefix before forwarding
// (`proxy_pass http://localhost:3005/;`), so Next.js runs at the root path and
// CANNOT use `basePath`. Static assets are prefixed via `assetPrefix` (and
// images via ./image-loader.js); internal navigation uses full-page links built
// with `withBase()` (see lib/deployment.ts). Override with ASSET_PREFIX.
const assetPrefix = process.env.ASSET_PREFIX ?? "/intel-ai";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  assetPrefix,
  images: {
    // `assetPrefix` is NOT applied to next/image URLs, so a custom loader
    // (./image-loader.js) prepends the `/intel-ai` prefix and returns the raw
    // asset path. The browser requests `/intel-ai/intel-logo.webp`, which nginx
    // strips back to `/intel-logo.webp`.
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
  async rewrites() {
    // The browser requests `/intel-ai/intel-bluelens`; nginx strips the prefix
    // to `/intel-bluelens`, which matches the `source` below. Defaults to the
    // docker-compose service DNS name; override with BLUELENS_URL if needed.
    const bluelensUrl = process.env.BLUELENS_URL ?? "http://intel-bluelens:3003";
    return {
      beforeFiles: [
        { source: "/intel-bluelens", destination: `${bluelensUrl}/intel-bluelens/` },
        { source: "/intel-bluelens/", destination: `${bluelensUrl}/intel-bluelens/` },
        { source: "/intel-bluelens/:path*", destination: `${bluelensUrl}/intel-bluelens/:path*` },
      ],
    };
  },
};

export default nextConfig;
