import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { ParcelsService } from './parcels.service';

@Controller(`${routes.version}${routes.parcels.root}`)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  create(@Session() session: UserSession, @Body() dto: CreateParcelDto) {
    return this.parcelsService.create(session.user.id, dto);
  }

  @Get()
  findAll(@Session() session: UserSession) {
    return this.parcelsService.findAllForOwner(session.user.id);
  }

  @Get(routes.parcels.byId)
  findOne(@Session() session: UserSession, @Param('id') id: string) {
    return this.parcelsService.findOneForOwner(id, session.user.id);
  }
}
