import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user-profile.entity';

export const APP_ROLES_KEY = 'APP_ROLES';

/**
 * Déclare les rôles métier Cocoashield autorisés sur une route (ou sur tout
 * un contrôleur).
 *
 * L'`AppRolesGuard` refuse par défaut (`deny by default`) : une route
 * authentifiée qui ne porte ni `@AppRoles(...)` ni `@AllowAnonymous()` est
 * rejetée. Oublier la déclaration ferme la route, il n'est donc pas possible
 * d'exposer un endpoint par inadvertance.
 */
export const AppRoles = (...roles: UserRole[]) =>
  SetMetadata(APP_ROLES_KEY, roles);

/** Raccourci : accessible à tout utilisateur authentifié et actif. */
export const AnyAuthenticatedRole = () => AppRoles(...Object.values(UserRole));
