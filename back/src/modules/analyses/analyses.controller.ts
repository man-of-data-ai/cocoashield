import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { createReadStream } from 'fs';
import { routes } from '../../routes';
import { AnalysesService } from './analyses.service';
import { AnalysisImageMeta } from './dtos/create-analysis.dto';
import { UpdateAnalysisNotesDto } from './dtos/update-analysis-notes.dto';

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
  ) {
    const results = this.parseResults(resultsJson);
    return this.analysesService.create(
      parcelId,
      session.user.id,
      images,
      results,
    );
  }

  @Post(routes.parcels.imports)
  @UseInterceptors(FileInterceptor('file'))
  createImport(
    @Session() session: UserSession,
    @Param('id') parcelId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    return this.analysesService.createImport(parcelId, session.user.id, file);
  }

  private parseResults(resultsJson?: string): AnalysisImageMeta[] {
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
}

@Controller(`${routes.version}${routes.analyses.root}`)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

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
