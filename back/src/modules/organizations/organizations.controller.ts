import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dtos';
import { OrganizationsService } from './organizations.service';

@Controller('/v1/organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}
  @Get() list(@Session() session: UserSession, @Query('includeInactive') includeInactive?: string) { return this.service.listForActor(session.user.id, includeInactive === 'true'); }
  @Post() create(@Session() session: UserSession, @Body() dto: CreateOrganizationDto) { return this.service.createForPlatformAdmin(session.user.id, dto); }
  @Patch('/:id') update(@Session() session: UserSession, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) { return this.service.updateForPlatformAdmin(session.user.id, id, dto); }
}
