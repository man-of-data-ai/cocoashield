import {
  BadRequestException,
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
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { createReadStream } from 'fs';
import {
  analysis_image_routes,
  analysis_routes,
  parcel_routes,
} from '../../routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { AnalysesService } from './analyses.service';
import { AnalysisImageMeta } from './dtos/create-analysis.dto';
import { CreateAnalysisRequestDto } from './dtos/create-analysis-request.dto';
import { UpdateAnalysisNotesDto } from './dtos/update-analysis-notes.dto';

@ApiTags('Analyses')
@AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
@UseInterceptors(AuditInterceptor)
@Controller()
export class ParcelAnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post(parcel_routes.analyses)
  @UseInterceptors(FilesInterceptor('images'))
  @Audit({
    action: 'analysis.created',
    targetType: 'parcel',
    targetIdParam: 'id',
  })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Lancer une analyse sur une parcelle' })
  create(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) parcelId: string,
    @UploadedFiles() images: Express.Multer.File[],
    @Body() dto: CreateAnalysisRequestDto,
  ) {
    return this.analysesService.create(
      parcelId,
      session.user.id,
      images,
      this.parseResults(dto.results),
      dto.missionId,
      dto.missionName,
      dto.profileId,
    );
  }

  private parseResults(resultsJson?: string): AnalysisImageMeta[] {
    if (!resultsJson) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(resultsJson);
      if (!Array.isArray(parsed)) {
        throw new Error('results doit être un tableau JSON');
      }
      return parsed as AnalysisImageMeta[];
    } catch {
      throw new BadRequestException(
        'results doit être un tableau JSON valide.',
      );
    }
  }
}

@ApiTags('Analyses')
@AppRoles(
  UserRole.ADMINISTRATEUR,
  UserRole.AGRONOME_TERRAIN,
  UserRole.DIRECTION_CCC,
)
@UseInterceptors(AuditInterceptor)
@Controller()
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(analysis_routes.details)
  @ApiOperation({ summary: 'Détail d’une analyse' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analysesService.findOneForOwner(id, session.user.id);
  }

  @Patch(analysis_routes.details)
  @Audit({
    action: 'analysis.notes.updated',
    targetType: 'analysis',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Mettre à jour les notes d’une analyse' })
  updateNotes(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnalysisNotesDto,
  ) {
    return this.analysesService.updateNotes(id, session.user.id, dto.notes);
  }

  @Delete(analysis_routes.details)
  @HttpCode(HttpStatus.NO_CONTENT)
  @AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
  @Audit({
    action: 'analysis.deleted',
    targetType: 'analysis',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Supprimer une analyse (réversible)' })
  remove(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analysesService.softDelete(id, session.user.id);
  }

  @Post(analysis_routes.restore)
  @AppRoles(UserRole.ADMINISTRATEUR, UserRole.AGRONOME_TERRAIN)
  @Audit({
    action: 'analysis.restored',
    targetType: 'analysis',
    targetIdParam: 'id',
  })
  @ApiOperation({ summary: 'Restaurer une analyse supprimée' })
  restore(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analysesService.restore(id, session.user.id);
  }
}

@ApiTags('Analyses')
@AppRoles(
  UserRole.ADMINISTRATEUR,
  UserRole.AGRONOME_TERRAIN,
  UserRole.DIRECTION_CCC,
)
@Controller()
export class AnalysisImagesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(analysis_image_routes.file)
  @ApiOperation({ summary: 'Servir le fichier image d’une analyse' })
  @ApiProduces('image/*')
  async getFile(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StreamableFile> {
    const { absolutePath, filename } =
      await this.analysesService.getImageFilePathForOwner(id, session.user.id);
    return new StreamableFile(createReadStream(absolutePath), {
      disposition: `inline; filename="${filename}"`,
    });
  }
}
