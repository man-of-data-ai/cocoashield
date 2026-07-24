/**
 * Types liés à l'authentification.
 */

export type User = {
  id: string;
  email: string;
  name: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  user: User;
};

/**
 * Forme normalisée d'une erreur renvoyée par l'API.
 */
export type ApiErrorPayload = {
  message: string;
};
