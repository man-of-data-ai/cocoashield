import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Sortie autonome : l'image de production ne copie que .next/standalone,
  // et Caddy proxifie web:3000 (voir deploy/Caddyfile).
  output: "standalone",
  turbopack: { root: __dirname },
  async rewrites() {
    return [
      {
        source: "/v1/:path*",
        destination: `${BACKEND_URL}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
