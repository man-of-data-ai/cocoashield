/**
 * Client HTTP générique.
 *
 * Centralise la logique d'appel réseau (credentials, parsing JSON, gestion
 * d'erreur uniforme) afin que les services (services/*.ts) restent de
 * simples déclarations d'endpoints, sans dupliquer de logique fetch.
 */

import type { ApiErrorPayload } from "@/types/auth";

/** Erreur normalisée levée par le client API, exploitable par l'UI. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    // Le corps n'est pas du JSON exploitable, on retombe sur un message générique.
  }
  return `Erreur inattendue (${response.status}).`;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit;
  headers?: Record<string, string>;
};

/**
 * Effectue un appel HTTP vers l'API et retourne le JSON typé.
 * `credentials: "include"` garantit que le cookie httpOnly de session est
 * bien envoyé, y compris en environnement de déploiement multi-domaine.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    body: options.body,
    headers: options.headers,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  return (await response.json()) as TResponse;
}
