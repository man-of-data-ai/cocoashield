import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
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
import { routes } from '../../routes';
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
@Controller(`${routes.version}${routes.configuration.root}`)
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get(routes.configuration.settings)
  @ApiOperation({ summary: 'Seuils de sévérité et paramètres de clustering' })
  getSettings(@Session() session: UserSession) {
    return this.configService.getSettings(session.user.id);
  }

  @Patch(routes.configuration.settings)
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

  @Get(routes.configuration.droneProfiles)
  @ApiOperation({ summary: 'Lister les profils drone' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  listProfiles(
    @Session() session: UserSession,
    @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe)
    activeOnly: boolean,
  ) {
    return this.configService.listDroneProfiles(session.user.id, activeOnly);
  }

  @Post(routes.configuration.droneProfiles)
  @Audit({ action: 'drone_profile.created', targetType: 'drone_profile' })
  @ApiOperation({ summary: 'Créer un profil drone' })
  createProfile(
    @Session() session: UserSession,
    @Body() dto: CreateDroneProfileDto,
  ) {
    return this.configService.createDroneProfile(session.user.id, dto);
  }

  @Patch(routes.configuration.droneProfileById)
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
}
