import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { APP_ROLES_KEY } from '../decorators/app-roles.decorator';
import { UserRole, UserStatus } from '../entities/user-profile.entity';
import { UsersService } from '../users.service';
import { AppRolesGuard } from './app-roles.guard';

function contextFor(userId: string | null): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ session: userId ? { user: { id: userId } } : null }),
    }),
  } as unknown as ExecutionContext;
}

function guardFor(
  allowedRoles: UserRole[] | undefined,
  profile: { role: UserRole; status: UserStatus },
) {
  const reflector = {
    getAllAndOverride: (key: string) =>
      key === APP_ROLES_KEY ? allowedRoles : undefined,
  } as unknown as Reflector;
  const usersService = {
    resolveProfile: () => Promise.resolve(profile),
  } as unknown as UsersService;
  return new AppRolesGuard(reflector, usersService);
}

const activeAdmin = {
  role: UserRole.ADMINISTRATEUR,
  status: UserStatus.ACTIVE,
};

describe('AppRolesGuard', () => {
  it('refuse une route authentifiée qui ne déclare aucun rôle', async () => {
    const guard = guardFor(undefined, activeAdmin);
    await expect(guard.canActivate(contextFor('user-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuse un rôle non listé', async () => {
    const guard = guardFor([UserRole.ADMINISTRATEUR], {
      role: UserRole.AGRONOME_TERRAIN,
      status: UserStatus.ACTIVE,
    });
    await expect(guard.canActivate(contextFor('user-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuse un compte désactivé, même avec le bon rôle', async () => {
    const guard = guardFor([UserRole.ADMINISTRATEUR], {
      role: UserRole.ADMINISTRATEUR,
      status: UserStatus.INACTIVE,
    });
    await expect(guard.canActivate(contextFor('user-1'))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('autorise un rôle listé sur un compte actif', async () => {
    const guard = guardFor([UserRole.ADMINISTRATEUR], activeAdmin);
    await expect(guard.canActivate(contextFor('user-1'))).resolves.toBe(true);
  });

  it('laisse passer les routes anonymes (aucune session)', async () => {
    const guard = guardFor(undefined, activeAdmin);
    await expect(guard.canActivate(contextFor(null))).resolves.toBe(true);
  });
});
