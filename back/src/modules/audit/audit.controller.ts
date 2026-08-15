import { Controller, Get, Query } from '@nestjs/common';
import { routes } from '../../routes';
import { AuditService } from './audit.service';

@Controller(`${routes.version}${routes.audit.root}`)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query('user') user?: string,
    @Query('action') action?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('target') target?: string,
  ) {
    return this.auditService.list({ user, action, dateFrom, dateTo, target });
  }

  @Get('facets')
  facets() {
    return this.auditService.facets();
  }
}
