import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    // Allow pulling the Intel logo from Wikimedia.
    remotePatterns: [{ protocol: "https", hostname: "upload.wikimedia.org" }],
  },
  async rewrites() {
    // Proxy the /intel-bluelens route to the Intel-BlueLens container, which
    // serves its SPA under the same base path. Defaults to the docker-compose
    // service DNS name; override with BLUELENS_URL at build time if needed.
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
