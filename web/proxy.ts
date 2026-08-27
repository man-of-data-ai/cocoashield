import { NextRequest, NextResponse } from "next/server";

import {
  areaForPath,
  canAccess,
  defaultPathForRole,
} from "@/lib/access-control";
import type { UserRole } from "@/types/user-profile";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

/**
 * Redirige la navigation des utilisateurs non connectés ou dont le rôle ne
 * couvre pas la page demandée.
 *
 * Rôle exact de ce fichier : **confort de navigation**. Il évite d'afficher
 * le squelette d'une page à laquelle l'utilisateur n'a pas droit avant que
 * l'API ne renvoie 403.
 *
 * Ce n'est **pas** une frontière de sécurité. L'autorisation qui fait foi est
 * appliquée côté serveur, endpoint par endpoint, par l'`AppRolesGuard` du
 * backend (`back/src/modules/users/guards/app-roles.guard.ts`) : le proxy
 * Next.js peut être contourné — CVE-2025-29927 l'a démontré en faisant sauter
 * l'exécution du middleware via un simple en-tête forgé.
 *
 * La session est vérifiée en interrogeant directement le endpoint better-auth
 * du backend (le cookie reçu est retransmis tel quel) plutôt qu'en revalidant
 * un jeton localement : l'authentification réelle vit entièrement côté
 * backend.
 *
 * Note : dans les versions récentes de Next.js, le fichier `middleware.ts` a
 * été renommé `proxy.ts` (export `proxy` au lieu de `middleware`).
 */
export async function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";

  const sessionResponse = await fetch(`${BACKEND_URL}/v1/auth/get-session`, {
    headers: { cookie },
    cache: "no-store",
  });
  const session = sessionResponse.ok ? await sessionResponse.json() : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestedArea = areaForPath(request.nextUrl.pathname);
  if (!requestedArea) {
    return NextResponse.next();
  }

  const profileResponse = await fetch(`${BACKEND_URL}/v1/users/me/profile`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { role } = (await profileResponse.json()) as { role: UserRole };
  if (!canAccess(role, requestedArea)) {
    return NextResponse.redirect(new URL(defaultPathForRole(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/parcels/:path*",
    "/map/:path*",
    "/comparaison/:path*",
    "/missions/:path*",
    "/exports/:path*",
    "/rapports/:path*",
    "/configuration/:path*",
    "/utilisateurs/:path*",
    "/audit/:path*",
  ],
};
