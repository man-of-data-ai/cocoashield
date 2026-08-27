import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_ROLES_KEY } from '../decorators/app-roles.decorator';
import { UserRole, UserStatus } from '../entities/user-profile.entity';
import { UsersService } from '../users.service';
import { SESSION_RESOLVER, type SessionResolver } from './session-resolver';

/**
 * Applique l'autorisation métier côté serveur, sur chaque endpoint.
 *
 * Le contrôle d'accès vit ici, au plus près de la donnée : le middleware du
 * front (`web/proxy.ts`) ne fait que rediriger pour le confort de navigation
 * et ne constitue pas une frontière de sécurité (cf. CVE-2025-29927).
 *
 * Deux propriétés à préserver impérativement :
 *
 * 1. **Fermé par défaut.** Une route authentifiée qui ne déclare pas
 *    `@AppRoles(...)` est refusée. Oublier la déclaration ferme la route, ne
 *    l'ouvre pas.
 * 2. **Indépendant de l'ordre des gardes globaux.** La session est résolue
 *    explicitement plutôt que lue dans `request.session`. Se fier à cette
 *    propriété ouvrirait toutes les routes lorsque ce garde s'exécute avant
 *    celui de better-auth, qui la renseigne.
 */
@Injectable()
export class AppRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    @Inject(SESSION_RESOLVER)
    private readonly resolveSession: SessionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    // Route explicitement anonyme (@AllowAnonymous) : aucun rôle à vérifier.
    const isAnonymous = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isAnonymous) {
      return true;
    }

    const allowedRoles = this.reflector.getAllAndOverride<UserRole[]>(
      APP_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!allowedRoles) {
      throw new ForbiddenException(
        'Cette route ne déclare aucun rôle autorisé (@AppRoles).',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = await this.resolveSession(request);
    if (!userId) {
      throw new UnauthorizedException('Authentification requise.');
    }

    const profile = await this.usersService.resolveProfile(userId);

    // Un compte supprimé conserve sa ligne en base : sans ce refus explicite,
    // le soft delete n'aurait aucun effet sur l'API.
    if (profile.deletedAt !== null) {
      throw new ForbiddenException('Ce compte a été supprimé.');
    }

    if (profile.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Ce compte est désactivé.');
    }

    if (!allowedRoles.includes(profile.role)) {
      throw new ForbiddenException(
        "Votre rôle ne permet pas d'accéder à cette ressource.",
      );
    }

    return true;
  }
}
