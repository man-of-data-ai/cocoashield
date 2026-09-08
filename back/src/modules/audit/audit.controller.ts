import { Controller, Get, Query } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { routes } from '../../routes';
import { AuditService } from './audit.service';

@Controller(`${routes.version}${routes.audit.root}`)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Session() session: UserSession,
    @Query('user') user?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('target') target?: string,
  ) {
    return this.auditService.listForActor(session.user.id, { user, action, dateFrom, dateTo, target });
  }

  @Get('facets')
  facets(@Session() session: UserSession) {
    return this.auditService.facetsForActor(session.user.id);
  }
}
