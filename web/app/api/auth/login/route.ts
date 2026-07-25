import { NextResponse } from "next/server";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/constants";
import { MOCK_USERS } from "@/lib/mock-data";
import { signSessionToken } from "@/lib/token";
import type { AuthResponse, LoginCredentials } from "@/types/auth";

/**
 * POST /api/auth/login
 *
 * Authentifie l'utilisateur et stocke le jeton de session dans un cookie
 * httpOnly + Secure + SameSite=Lax. Le jeton n'est donc jamais exposé au
 * JavaScript côté client (protection contre le vol de session via XSS),
 * ce qui répond à l'exigence de "stockage sécurisé du token".
 *
 * Corps attendu : { email: string, password: string }
 * Réponse 200  : { user: { id, email, name } }
 * Réponse 400  : { message } — champs manquants
 * Réponse 401  : { message } — identifiants invalides
 */
export async function POST(request: Request) {
  let body: Partial<LoginCredentials>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Corps de requête JSON invalide." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { message: "L'email et le mot de passe sont requis." },
      { status: 400 }
    );
  }

  const account = MOCK_USERS.find((user) => user.email === email);

  if (!account || account.password !== password) {
    return NextResponse.json(
      { message: "Email ou mot de passe incorrect." },
      { status: 401 }
    );
  }

  const user = { id: account.id, email: account.email, name: account.name };

  const token = await signSessionToken({
    user,
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  const response = NextResponse.json<AuthResponse>({ user });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
