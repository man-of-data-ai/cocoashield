import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  ILike,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ListAuditDto } from './dtos/list-audit.dto';
import { AuditLog } from './entities/audit-log.entity';

export type AuditEvent = {
  userId: string;
  userEmail?: string | null;
  ipAddress?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  details?: Record<string, unknown> | null;
};

export type AuditPage = {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  /**
   * Enregistre un évènement. Appelé par l'`AuditInterceptor`.
   *
   * L'échec est journalisé mais jamais propagé : une panne du registre
   * d'audit ne doit pas faire échouer une opération métier déjà validée.
   */
  async log(event: AuditEvent): Promise<void> {
    try {
      await this.repository.save(
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
    } catch (error) {
      this.logger.error(
        `Écriture du journal d'audit impossible (${event.action})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(filters: ListAuditDto): Promise<AuditPage> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (filters.user) {
      // Le sélecteur du front envoie un email ; un identifiant reste accepté.
      if (filters.user.includes('@')) where.userEmail = filters.user;
      else where.userId = filters.user;
    }
    if (filters.action) where.action = filters.action;
    if (filters.target?.trim()) {
      where.targetLabel = ILike(`%${filters.target.trim()}%`);
    }

    const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const to = filters.dateTo ? new Date(filters.dateTo) : null;
    if (from && to) where.createdAt = Between(from, to);
    else if (from) where.createdAt = MoreThanOrEqual(from);
    else if (to) where.createdAt = LessThanOrEqual(to);

    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = filters.offset ?? 0;

    const [items, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { items, total, limit, offset };
  }

  /** Valeurs distinctes proposées comme filtres dans l'interface. */
  async facets(): Promise<{ users: string[]; actions: string[] }> {
    const [userRows, actionRows] = await Promise.all([
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
      users: userRows.map((row) => row.value).filter(Boolean),
      actions: actionRows.map((row) => row.value).filter(Boolean),
    };
  }
}
