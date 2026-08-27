import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { configuration_routes, drone_profile_routes } from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { CreateDroneProfileDto } from './dtos/create-drone-profile.dto';
import { UpdateDroneProfileDto } from './dtos/update-drone-profile.dto';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import { PlatformConfigService } from './platform-config.service';

@ApiTags('Configuration')
@AppRoles(UserRole.ADMINISTRATEUR)
@UseInterceptors(AuditInterceptor)
@Controller()
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get(configuration_routes.settings)
  @ApiOperation({ summary: 'Seuils de sévérité et paramètres de clustering' })
  getSettings(@Session() session: UserSession) {
    return this.configService.getSettings(session.user.id);
  }

  @Patch(configuration_routes.settings)
  @Audit({
    action: 'configuration.settings.updated',
    targetType: 'configuration',
  })
  @ApiOperation({ summary: 'Mettre à jour les seuils de sévérité' })
  updateSettings(
    @Session() session: UserSession,
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.configService.updateSettings(session.user.id, dto);
  }

  @Get(drone_profile_routes.root)
  @ApiOperation({ summary: 'Lister les profils drone' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  listProfiles(
    @Session() session: UserSession,
    @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe)
    activeOnly: boolean,
  ) {
    return this.configService.listDroneProfiles(session.user.id, activeOnly);
  }

  @Post(drone_profile_routes.root)
  @Audit({ action: 'drone_profile.created', targetType: 'drone_profile' })
  @ApiOperation({ summary: 'Créer un profil drone' })
  createProfile(
    @Session() session: UserSession,
    @Body() dto: CreateDroneProfileDto,
  ) {
    return this.configService.createDroneProfile(session.user.id, dto);
  }

  @Patch(drone_profile_routes.details)
  @Audit({
    action: 'drone_profile.updated',
    targetType: 'drone_profile',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Mettre à jour un profil drone' })
  updateProfile(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDroneProfileDto,
  ) {
    return this.configService.updateDroneProfile(session.user.id, id, dto);
  }

  @Delete(drone_profile_routes.details)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({
    action: 'drone_profile.deleted',
    targetType: 'drone_profile',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Supprimer un profil drone (réversible)' })
  removeProfile(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.configService.softDeleteDroneProfile(session.user.id, id);
  }

  @Post(drone_profile_routes.restore)
  @Audit({
    action: 'drone_profile.restored',
    targetType: 'drone_profile',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Restaurer un profil drone supprimé' })
  restoreProfile(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.configService.restoreDroneProfile(session.user.id, id);
  }
}
