import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { UpdateParcelVerificationDto } from './dtos/update-parcel-verification.dto';
import { ParcelsService } from './parcels.service';

@Controller(`${routes.version}${routes.parcels.root}`)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  create(@Session() session: UserSession, @Req() request: Request, @Body() dto: CreateParcelDto) {
    return this.parcelsService.create(session.user.id, dto, {
      userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null,
    });
  }

  @Get('summary')
  summary(@Session() session: UserSession) {
    return this.parcelsService.summaryForOwner(session.user.id);
  }

  @Get()
  findAll(@Session() session: UserSession) {
    return this.parcelsService.findAllForOwner(session.user.id);
  }

  @Get(routes.parcels.byId)
  findOne(@Session() session: UserSession, @Req() request: Request, @Param('id') id: string) {
    return this.parcelsService.findOneForOwner(id, session.user.id, {
      userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null,
    });
  }


  @Patch(routes.parcels.verification)
  updateVerification(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Req() request: Request,
    @Body() dto: UpdateParcelVerificationDto,
  ) {
    return this.parcelsService.updateVerification(
      id,
      session.user.id,
      dto.status,
      dto.comment,
      { userId: session.user.id, userEmail: session.user.email ?? null, ipAddress: request.ip ?? null },
    );
  }
}
