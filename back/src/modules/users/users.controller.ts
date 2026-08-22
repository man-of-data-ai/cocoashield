import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import {
  AnyAuthenticatedRole,
  AppRoles,
} from './decorators/app-roles.decorator';
import { UserRole } from './entities/user-profile.entity';
import { UpdateUserProfileDto } from './dtos/update-user-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Utilisateurs')
@UseInterceptors(AuditInterceptor)
@Controller(`${routes.version}${routes.users.root}`)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @AppRoles(UserRole.ADMINISTRATEUR)
  @ApiOperation({ summary: 'Lister les comptes et leurs profils applicatifs' })
  list() {
    return this.usersService.list();
  }

  @Get(routes.users.meProfile)
  @AnyAuthenticatedRole()
  @ApiOperation({ summary: 'Profil applicatif de l’utilisateur connecté' })
  me(@Session() session: UserSession) {
    return this.usersService.current(session.user.id);
  }

  @Patch(routes.users.profileById)
  @AppRoles(UserRole.ADMINISTRATEUR)
  @Audit({
    action: 'user.profile.updated',
    targetType: 'user',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Modifier le rôle ou le statut d’un compte' })
  update(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateAsAdmin(session.user.id, id, dto);
  }

  @Delete(routes.users.byId)
  @AppRoles(UserRole.ADMINISTRATEUR)
  @Audit({ action: 'user.deleted', targetType: 'user', targetIdParam: 'id' })
  @ApiOperation({ summary: 'Supprimer un compte' })
  remove(@Session() session: UserSession, @Param('id') id: string) {
    return this.usersService.deleteAsAdmin(session.user.id, id);
  }
}
