import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { CreateParcelDto } from './dtos/create-parcel.dto';
import { UpdateParcelVerificationDto } from './dtos/update-parcel-verification.dto';
import { ParcelsService } from './parcels.service';

@ApiTags('Parcelles')
@AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
@UseInterceptors(AuditInterceptor)
@Controller(`${routes.version}${routes.parcels.root}`)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @Audit({ action: 'parcel.created', targetType: 'parcel' })
  @ApiOperation({ summary: 'Créer une parcelle' })
  @ApiCreatedResponse({ description: 'Parcelle créée.' })
  create(@Session() session: UserSession, @Body() dto: CreateParcelDto) {
    return this.parcelsService.create(session.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lister les parcelles de l'utilisateur" })
  findAll(@Session() session: UserSession) {
    return this.parcelsService.findAllForOwner(session.user.id);
  }

  @Get(routes.parcels.byId)
  @ApiOperation({ summary: 'Détail d’une parcelle' })
  @ApiOkResponse({ description: 'Parcelle, analyses et images associées.' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parcelsService.findOneForOwner(id, session.user.id);
  }

  @Patch(routes.parcels.verification)
  @Audit({
    action: 'parcel.verification.updated',
    targetType: 'parcel',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Mettre à jour la vérification terrain' })
  updateVerification(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParcelVerificationDto,
  ) {
    return this.parcelsService.updateVerification(
      id,
      session.user.id,
      dto.status,
      dto.comment,
    );
  }

  @Delete(routes.parcels.byId)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit({
    action: 'parcel.deleted',
    targetType: 'parcel',
    targetIdParam: 'id',
  })
  @ApiOperation({
    summary: 'Supprimer une parcelle (réversible)',
    description:
      'Suppression logique : la parcelle disparaît des listes mais reste en base, ' +
      'avec ses analyses. Restaurable via POST /:id/restore.',
  })
  @ApiNoContentResponse({ description: 'Parcelle supprimée.' })
  remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parcelsService.softDelete(id, session.user.id);
  }

  @Post(routes.parcels.restoreById)
  @Audit({
    action: 'parcel.restored',
    targetType: 'parcel',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Restaurer une parcelle supprimée' })
  restore(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parcelsService.restore(id, session.user.id);
  }
}
