import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, ILike, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export type AuditActor = {
  userId: string;
  userEmail?: string | null;
  ipAddress?: string | null;
};

export type AuditEvent = AuditActor & {
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  details?: Record<string, unknown> | null;
};

export type AuditFilters = {
  user?: string;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  target?: string;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async log(event: AuditEvent): Promise<AuditLog> {
    return this.repository.save(
      this.repository.create({
        userId: event.userId,
        userEmail: event.userEmail ?? null,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        targetLabel: event.targetLabel ?? null,
        ipAddress: event.ipAddress ?? null,
        details: event.details ?? null,
      }),
    );
  }

  async list(filters: AuditFilters): Promise<AuditLog[]> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.user) {
      // Le sélecteur du front envoie actuellement un email. L'ID reste accepté.
      if (filters.user.includes('@')) where.userEmail = filters.user;
      else where.userId = filters.user;
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

  async facets(): Promise<{ users: string[]; actions: string[] }> {
    const [usersRows, actionRows] = await Promise.all([
      this.repository
        .createQueryBuilder('audit')
        .select('DISTINCT COALESCE(audit.user_email, audit.user_id)', 'value')
        .orderBy('value', 'ASC')
        .getRawMany<{ value: string }>(),
      this.repository
        .createQueryBuilder('audit')
        .select('DISTINCT audit.action', 'value')
        .orderBy('value', 'ASC')
        .getRawMany<{ value: string }>(),
    ]);
    return {
      users: usersRows.map((row) => row.value).filter(Boolean),
      actions: actionRows.map((row) => row.value).filter(Boolean),
    };
  }
}
