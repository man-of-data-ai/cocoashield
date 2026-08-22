import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { CreateMissionDto } from './dtos/create-mission.dto';
import { MissionsService } from './missions.service';

@ApiTags('Missions')
@AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
@UseInterceptors(AuditInterceptor)
@Controller(`${routes.version}${routes.missions.root}`)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  @Audit({ action: 'mission.created', targetType: 'mission' })
  @ApiOperation({ summary: 'Créer une mission de collecte' })
  create(@Session() session: UserSession, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(session.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les missions de l'utilisateur" })
  findAll(@Session() session: UserSession) {
    return this.missionsService.findAllForOwner(session.user.id);
  }

  @Delete(routes.missions.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({
    action: 'mission.deleted',
    targetType: 'mission',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Supprimer une mission (réversible)' })
  remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.missionsService.softDelete(id, session.user.id);
  }

  @Post(routes.missions.restoreById)
  @Audit({
    action: 'mission.restored',
    targetType: 'mission',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Restaurer une mission supprimée' })
  restore(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.missionsService.restore(id, session.user.id);
  }
}
