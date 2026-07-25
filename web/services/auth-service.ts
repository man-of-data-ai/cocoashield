/**
 * Service d'authentification. Appelle directement les endpoints better-auth
 * du backend (proxifiés en same-origin via next.config.ts `rewrites`), afin
 * que le cookie de session httpOnly reste utilisable sans configuration CORS.
 */

import { apiRequest } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  User,
} from "@/types/auth";

type SessionResponse = {
  session: unknown;
  user: User;
} | null;

export const authService = {
  /**
   * Authentifie l'utilisateur. Le jeton de session est posé par le serveur
   * dans un cookie httpOnly ; il n'est jamais manipulé côté client.
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const data = await apiRequest<AuthResponse>("/v1/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return data.user;
  },

  /** Crée le compte (avec vérification de confirmation de mot de passe côté serveur). */
  async register(credentials: RegisterCredentials): Promise<User> {
    const data = await apiRequest<AuthResponse>("/v1/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return data.user;
  },

  /** Invalide la session courante. */
  async logout(): Promise<void> {
    await apiRequest<{ success: boolean }>("/v1/auth/sign-out", {
      method: "POST",
    });
  },

  /**
   * Récupère l'utilisateur courant à partir de la session active.
   * Retourne `null` plutôt que de lever une erreur si non authentifié,
   * car "ne pas être connecté" est un état normal, pas une panne.
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await apiRequest<SessionResponse>("/v1/auth/get-session");
      return data?.user ?? null;
    } catch {
      return null;
    }
  },
};
