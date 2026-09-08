import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { CreateDroneProfileDto } from './dtos/create-drone-profile.dto';
import { UpdateDroneProfileDto } from './dtos/update-drone-profile.dto';
import { UpdatePlatformSettingsDto } from './dtos/update-platform-settings.dto';
import { PlatformConfigService } from './platform-config.service';

@Controller(`${routes.version}${routes.configuration.root}`)
export class PlatformConfigController {
  constructor(private readonly configService: PlatformConfigService) {}

  @Get('settings')
  getSettings(@Session() session: UserSession) {
    return this.configService.getSettings(session.user.id);
  }

  @Patch('settings')
  updateSettings(@Session() session: UserSession, @Req() request: Request, @Body() dto: UpdatePlatformSettingsDto) {
    return this.configService.updateSettings(session.user.id, dto, {
      userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null,
    });
  }

  @Get('drone-profiles')
  listProfiles(@Session() session: UserSession, @Query('activeOnly') activeOnly?: string) {
    return this.configService.listDroneProfiles(session.user.id, activeOnly === 'true');
  }

  @Post('drone-profiles')
  createProfile(@Session() session: UserSession, @Req() request: Request, @Body() dto: CreateDroneProfileDto) {
    return this.configService.createDroneProfile(session.user.id, dto, {
      userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null,
    });
  }

  @Patch('drone-profiles/:id')
  updateProfile(@Session() session: UserSession, @Req() request: Request, @Param('id') id: string, @Body() dto: UpdateDroneProfileDto) {
    return this.configService.updateDroneProfile(session.user.id, id, dto, {
      userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null,
    });
  }
}
