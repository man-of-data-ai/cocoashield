import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/token";
import type { AuthResponse } from "@/types/auth";

/**
 * GET /api/auth/me
 *
 * Permet au client de savoir s'il est authentifié sans jamais avoir accès
 * lui-même au jeton (celui-ci reste dans un cookie httpOnly). Utilisé au
 * chargement de l'application pour restaurer l'état de session.
 *
 * Réponse 200 : { user }
 * Réponse 401 : { message } — pas de session valide
 */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json(
      { message: "Non authentifié." },
      { status: 401 }
    );
  }

  return NextResponse.json<AuthResponse>({ user: session.user });
}
