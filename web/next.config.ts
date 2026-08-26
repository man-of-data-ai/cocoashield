import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
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
