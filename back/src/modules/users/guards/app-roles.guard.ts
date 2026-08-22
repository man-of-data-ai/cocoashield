import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { APP_ROLES_KEY } from '../decorators/app-roles.decorator';
import { UserRole, UserStatus } from '../entities/user-profile.entity';
import { UsersService } from '../users.service';

type AuthenticatedRequest = Request & {
  session?: { user?: { id?: string } } | null;
};

/**
 * Applique l'autorisation métier côté serveur, sur chaque endpoint.
 *
 * Le contrôle d'accès vit ici, au plus près de la donnée : le middleware du
 * front (`web/proxy.ts`) ne fait que rediriger pour le confort de navigation
 * et ne constitue pas une frontière de sécurité (cf. CVE-2025-29927).
 *
 * Enregistré globalement après l'`AuthGuard` de better-auth, qui a déjà
 * renseigné `request.session`.
 */
@Injectable()
export class AppRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.session?.user?.id;

    // Route anonyme : l'AuthGuard l'a déjà laissée passer sans session.
    if (!userId) {
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

    const profile = await this.usersService.resolveProfile(userId);

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
