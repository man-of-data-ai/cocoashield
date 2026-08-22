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
import { Constants } from '../../core/constants/constants';
import { mission_routes } from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { CreateMissionDto } from './dtos/create-mission.dto';
import { MissionsService } from './missions.service';

@ApiTags('Missions')
@AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
@UseInterceptors(AuditInterceptor)
@Controller(Constants.API.VERSION)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post(mission_routes.root)
  @Audit({ action: 'mission.created', targetType: 'mission' })
  @ApiOperation({ summary: 'Créer une mission de collecte' })
  create(@Session() session: UserSession, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(session.user.id, dto);
  }

  @Get(mission_routes.root)
  @ApiOperation({ summary: "Lister les missions de l'utilisateur" })
  findAll(@Session() session: UserSession) {
    return this.missionsService.findAllForOwner(session.user.id);
  }

  @Delete(mission_routes.details)
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

  @Post(mission_routes.restore)
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
