import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { Constants } from '../../core/constants/constants';
import { export_routes } from './routes';
import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit } from '../audit/decorators/audit.decorator';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { CreateExportDto } from './dtos/create-export.dto';
import { ExportsService } from './exports.service';

@ApiTags('Exports')
@AppRoles(UserRole.ADMINISTRATEUR)
@UseInterceptors(AuditInterceptor)
@Controller(Constants.API.VERSION)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get(export_routes.root)
  @ApiOperation({ summary: 'Historique des exports générés' })
  list(@Session() session: UserSession) {
    return this.exportsService.list(session.user.id);
  }

  @Post(export_routes.generate)
  @Audit({ action: 'export.generated', targetType: 'export' })
  @ApiOperation({ summary: 'Générer une archive d’export' })
  @ApiProduces('application/zip')
  async generate(
    @Session() session: UserSession,
    @Body() dto: CreateExportDto,
    @Res() response: Response,
  ): Promise<void> {
    const { filename, archive } = await this.exportsService.generate(
      session.user.id,
      session.user.email ?? null,
      dto,
    );

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    archive.pipe(response);
  }
}
