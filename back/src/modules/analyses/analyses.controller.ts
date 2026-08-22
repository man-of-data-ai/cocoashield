import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
import { routes } from '../../routes';
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
@Controller(`${routes.version}${routes.parcels.root}`)
export class ParcelAnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post(routes.parcels.analyses)
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
@Controller(`${routes.version}${routes.analyses.root}`)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(routes.analyses.byId)
  @ApiOperation({ summary: 'Détail d’une analyse' })
  findOne(
    @Session() session: UserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analysesService.findOneForOwner(id, session.user.id);
  }

  @Patch(routes.analyses.byId)
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
}

@ApiTags('Analyses')
@AppRoles(
  UserRole.ADMINISTRATEUR,
  UserRole.AGRONOME_TERRAIN,
  UserRole.DIRECTION_CCC,
)
@Controller(`${routes.version}${routes.analysisImages.root}`)
export class AnalysisImagesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(routes.analysisImages.file)
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
