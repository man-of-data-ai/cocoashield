import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request } from 'express';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { routes } from '../../routes';
import { CreateExportDto } from './dtos/create-export.dto';
import { ExportsService } from './exports.service';

@Controller(`${routes.version}${routes.exports.root}`)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get()
  list(@Session() session: UserSession) {
    return this.exportsService.list(session.user.id);
  }

  @Post(routes.exports.generate)
  async generate(
    @Session() session: UserSession,
    @Body() dto: CreateExportDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const file = await this.exportsService.generate(
      session.user.id,
      session.user.email ?? null,
      dto,
      request.ip ?? null,
    );
    response.setHeader('Content-Type', file.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    response.setHeader('Content-Length', file.buffer.length);
    response.send(file.buffer);
  }
}
