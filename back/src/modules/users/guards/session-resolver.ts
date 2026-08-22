import type { Request } from 'express';

export const SESSION_RESOLVER = 'SESSION_RESOLVER';

/**
 * Résout l'identifiant de l'utilisateur authentifié pour une requête.
 *
 * Injecté plutôt qu'importé afin que l'`AppRolesGuard` ne dépende pas
 * directement de better-auth : le garde reste testable unitairement, et la
 * mécanique d'authentification peut changer sans toucher à l'autorisation.
 */
export type SessionResolver = (request: Request) => Promise<string | undefined>;
