import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { audit_routes } from '../../routes';
import { AppRoles } from '../users/decorators/app-roles.decorator';
import { UserRole } from '../users/entities/user-profile.entity';
import { AuditService } from './audit.service';
import { ListAuditDto } from './dtos/list-audit.dto';

@ApiTags('Audit')
@AppRoles(UserRole.ADMINISTRATEUR, UserRole.DIRECTION_CCC)
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get(audit_routes.root)
  @ApiOperation({ summary: "Journal d'audit paginé et filtrable" })
  @ApiOkResponse({
    description: 'Page d’évènements, du plus récent au plus ancien.',
  })
  list(@Query() filters: ListAuditDto) {
    return this.auditService.list(filters);
  }

  @Get(audit_routes.facets)
  @ApiOperation({ summary: 'Valeurs distinctes disponibles comme filtres' })
  facets() {
    return this.auditService.facets();
  }
}
