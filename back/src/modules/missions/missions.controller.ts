import { Body, Controller, Get, Post } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { CreateMissionDto } from './dtos/create-mission.dto';
import { MissionsService } from './missions.service';

@Controller(`${routes.version}${routes.missions.root}`)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Post()
  create(@Session() session: UserSession, @Body() dto: CreateMissionDto) {
    return this.missionsService.create(session.user.id, dto);
  }

  @Get()
  findAll(@Session() session: UserSession) {
    return this.missionsService.findAllForOwner(session.user.id);
  }
}
