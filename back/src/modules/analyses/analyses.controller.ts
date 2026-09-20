import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { createReadStream } from 'fs';
import { routes } from '../../routes';
import { AnalysesService } from './analyses.service';
import { AnalysisImageMeta } from './dtos/create-analysis.dto';
import { UpdateAnalysisNotesDto } from './dtos/update-analysis-notes.dto';

function parseImageMetas(resultsJson?: string): AnalysisImageMeta[] {
  if (!resultsJson) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(resultsJson);
    if (!Array.isArray(parsed)) {
      throw new Error('results must be a JSON array');
    }
    return parsed as AnalysisImageMeta[];
  } catch {
    throw new BadRequestException('results must be a valid JSON array');
  }
}

@Controller(`${routes.version}${routes.parcels.root}`)
export class ParcelAnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post(routes.parcels.analyses)
  @UseInterceptors(FilesInterceptor('images'))
  create(
    @Session() session: UserSession,
    @Param('id') parcelId: string,
    @UploadedFiles() images: Express.Multer.File[],
    @Body('results') resultsJson?: string,
    @Body('missionId') missionId?: string,
    @Body('missionName') missionName?: string,
    @Body('profileId') profileId?: string,
  ) {
    const results = parseImageMetas(resultsJson);
    return this.analysesService.create(
      parcelId,
      session.user.id,
      images,
      results,
      missionId,
      missionName,
      profileId,
    );
  }

}

@Controller(`${routes.version}${routes.analyses.root}`)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  createFromCapture(
    @Session() session: UserSession,
    @UploadedFiles() images: Express.Multer.File[],
    @Body('results') resultsJson?: string,
    @Body('missionId') missionId?: string,
    @Body('missionName') missionName?: string,
    @Body('profileId') profileId?: string,
  ) {
    return this.analysesService.createFromCapture(
      session.user.id,
      images,
      parseImageMetas(resultsJson),
      missionId,
      missionName,
      profileId,
    );
  }

  @Get(routes.analyses.byId)
  findOne(@Session() session: UserSession, @Param('id') id: string) {
    return this.analysesService.findOneForOwner(id, session.user.id);
  }

  @Patch(routes.analyses.byId)
  updateNotes(
    @Session() session: UserSession,
    @Param('id') id: string,
    @Body() dto: UpdateAnalysisNotesDto,
  ) {
    return this.analysesService.updateNotes(id, session.user.id, dto.notes);
  }
}

@Controller(`${routes.version}${routes.analysisImages.root}`)
export class AnalysisImagesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get(routes.analysisImages.file)
  async getFile(
    @Session() session: UserSession,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { absolutePath, filename } =
      await this.analysesService.getImageFilePathForOwner(id, session.user.id);
    return new StreamableFile(createReadStream(absolutePath), {
      disposition: `inline; filename="${filename}"`,
    });
  }
}
