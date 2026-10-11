import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Sortie autonome : l'image de production ne copie que .next/standalone,
  // et Caddy proxifie web:3000 (voir deploy/Caddyfile).
  output: "standalone",
  turbopack: { root: __dirname },
  // Dev uniquement : hôtes autorisés à charger les ressources du serveur de dev
  // (accès depuis le réseau local), ex. ALLOWED_DEV_ORIGINS=192.168.1.105
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").filter(Boolean),
  experimental: {
    // Avec proxy.ts, Next recopie le corps de chaque requête pour la réécriture
    // /v1 et le coupe sans erreur à 10 Mo : un envoi de photos plus gros
    // arrivait tronqué au back. Le web découpe les envois en lots de 90 Mo au
    // plus (UPLOAD_LIMITS côté back), sous le max_size de Caddy.
    proxyClientMaxBodySize: "100mb",
    // 30 s par défaut : le back lit l'EXIF de chaque photo avant de répondre.
    proxyTimeout: 10 * 60 * 1000,
  },
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
