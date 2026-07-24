import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/token";

/**
 * Protège les routes de l'application nécessitant une authentification.
 * S'exécute côté serveur avant le rendu de la page : un utilisateur non
 * connecté ne voit jamais le HTML de /map, il est redirigé vers /login.
 *
 * Note : dans les versions récentes de Next.js, le fichier `middleware.ts`
 * a été renommé `proxy.ts` (export `proxy` au lieu de `middleware`).
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/map/:path*"],
};
