/**
 * Service d'authentification.
 *
 * Point d'entrée unique pour toute opération liée à l'auth. Les composants
 * et hooks ne doivent jamais appeler `fetch` directement : ils passent par
 * ce service, ce qui permet de brancher une vraie API REST externe plus
 * tard en ne modifiant que ce fichier.
 */

import { apiRequest } from "@/lib/api-client";
import type { AuthResponse, LoginCredentials, User } from "@/types/auth";

export const authService = {
  /**
   * Authentifie l'utilisateur. Le jeton de session est posé par le serveur
   * dans un cookie httpOnly ; il n'est jamais manipulé côté client.
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const data = await apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    return data.user;
  },

  /** Invalide la session courante. */
  async logout(): Promise<void> {
    await apiRequest<{ success: boolean }>("/api/auth/logout", {
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
      const data = await apiRequest<AuthResponse>("/api/auth/me");
      return data.user;
    } catch {
      return null;
    }
  },
};
