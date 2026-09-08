import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user-profile.entity';
import { AuditLog } from './entities/audit-log.entity';

export type AuditActor = { userId: string; userEmail?: string | null; ipAddress?: string | null };
export type AuditEvent = AuditActor & { action: string; targetType?: string | null; targetId?: string | null; targetLabel?: string | null; details?: Record<string, unknown> | null };
export type AuditFilters = { user?: string; action?: string; dateFrom?: string; dateTo?: string; target?: string };

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly repository: Repository<AuditLog>,
    private readonly usersService: UsersService,
  ) {}

  async log(event: AuditEvent): Promise<AuditLog> {
    return this.repository.save(this.repository.create({
      userId: event.userId,
      userEmail: event.userEmail ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      targetLabel: event.targetLabel ?? null,
      ipAddress: event.ipAddress ?? null,
      details: event.details ?? null,
    }));
  }

  async listForActor(actorId: string, filters: AuditFilters): Promise<AuditLog[]> {
    const scope = await this.usersService.getAccessScope(actorId);
    if (![UserRole.ADMINISTRATEUR, UserRole.DIRECTION_CCC].includes(scope.role)) throw new ForbiddenException('Audit access is not allowed for this role');
    const visibleIds = await this.usersService.visibleUserIdsForActor(actorId);
    if (!visibleIds.length) return [];
    const where: FindOptionsWhere<AuditLog> = { userId: In(visibleIds) };
    if (filters.user) {
      if (filters.user.includes('@')) where.userEmail = filters.user;
      else if (visibleIds.includes(filters.user)) where.userId = filters.user;
      else return [];
    }
    if (filters.action) where.action = filters.action;
    if (filters.target?.trim()) where.targetLabel = ILike(`%${filters.target.trim()}%`);
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null;
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);
    return this.repository.find({ where, order: { createdAt: 'DESC' }, take: 500 });
  }

  async facetsForActor(actorId: string): Promise<{ users: string[]; actions: string[] }> {
    const scope = await this.usersService.getAccessScope(actorId);
    if (![UserRole.ADMINISTRATEUR, UserRole.DIRECTION_CCC].includes(scope.role)) throw new ForbiddenException('Audit access is not allowed for this role');
    const visibleIds = await this.usersService.visibleUserIdsForActor(actorId);
    if (!visibleIds.length) return { users: [], actions: [] };
    const [usersRows, actionRows] = await Promise.all([
      this.repository.createQueryBuilder('audit')
        .select('DISTINCT COALESCE(audit.user_email, audit.user_id)', 'value')
        .where('audit.user_id IN (:...visibleIds)', { visibleIds })
        .orderBy('value', 'ASC')
        .getRawMany<{ value: string }>(),
      this.repository.createQueryBuilder('audit')
        .select('DISTINCT audit.action', 'value')
        .where('audit.user_id IN (:...visibleIds)', { visibleIds })
        .orderBy('value', 'ASC')
        .getRawMany<{ value: string }>(),
    ]);
    return { users: usersRows.map((row) => row.value).filter(Boolean), actions: actionRows.map((row) => row.value).filter(Boolean) };
  }
}
