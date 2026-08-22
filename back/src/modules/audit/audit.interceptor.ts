import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { AUDIT_ACTION_KEY, AuditMetadata } from './decorators/audit.decorator';

type AuditedRequest = Request & {
  session?: { user?: { id?: string; email?: string | null } } | null;
};

/** Ressource renvoyée par un handler audité, dont on extrait un libellé. */
type LabelledResource = { id?: string; name?: string };

/**
 * Écrit une entrée d'audit après l'exécution réussie d'une route annotée
 * `@Audit(...)`.
 *
 * L'écriture a lieu après la réponse (`tap`) et son échec n'est jamais
 * propagé au client : un incident du registre d'audit ne doit pas faire
 * échouer une opération métier déjà validée.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.getAllAndOverride<AuditMetadata>(
      AUDIT_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata || context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditedRequest>();
    const user = request.session?.user;

    if (!user?.id) {
      return next.handle();
    }

    const routeTargetId = metadata.targetIdParam
      ? (request.params as Record<string, string>)[metadata.targetIdParam]
      : undefined;

    return next.handle().pipe(
      tap((result: unknown) => {
        const resource = (result ?? {}) as LabelledResource;
        void this.auditService.log({
          userId: user.id!,
          userEmail: user.email ?? null,
          ipAddress: request.ip ?? null,
          action: metadata.action,
          targetType: metadata.targetType,
          targetId: routeTargetId ?? resource.id ?? null,
          targetLabel: resource.name ?? null,
        });
      }),
    );
  }
}
