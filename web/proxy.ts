import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/**
 * Protège les routes de l'application nécessitant une authentification.
 * S'exécute côté serveur avant le rendu de la page : un utilisateur non
 * connecté ne voit jamais le HTML de /parcels, il est redirigé vers /login.
 *
 * La session est vérifiée en interrogeant directement le endpoint
 * better-auth du backend (le cookie reçu par ce proxy est retransmis tel
 * quel) plutôt qu'en revalidant un jeton localement : l'authentification
 * réelle vit entièrement côté backend.
 *
 * Note : dans les versions récentes de Next.js, le fichier `middleware.ts`
 * a été renommé `proxy.ts` (export `proxy` au lieu de `middleware`).
 */
export async function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";

  const response = await fetch(`${BACKEND_URL}/v1/auth/get-session`, {
    headers: { cookie },
  });

  const session = response.ok ? await response.json() : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/parcels/:path*"],
};
