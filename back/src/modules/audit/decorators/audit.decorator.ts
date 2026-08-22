import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'AUDIT_ACTION';

export type AuditTargetDescriptor = {
  /** Type de ressource visée (`parcel`, `export`, `drone_profile`, …). */
  targetType: string;
  /** Nom du paramètre de route portant l'identifiant, si applicable. */
  targetIdParam?: string;
};

export type AuditMetadata = AuditTargetDescriptor & {
  /** Action journalisée (`parcel.created`, `export.generated`, …). */
  action: string;
};

/**
 * Journalise l'appel de la route dans le registre d'audit.
 *
 * L'audit est une préoccupation transverse : il est porté par
 * l'`AuditInterceptor`, pas par un paramètre optionnel propagé dans les
 * signatures de service. Une route annotée est auditée systématiquement,
 * sans que l'appelant puisse l'oublier.
 *
 * Seules les routes qui **modifient** l'état sont annotées : journaliser
 * chaque lecture ferait grossir la table sans limite et transformerait un
 * `GET` en écriture.
 */
export const Audit = (metadata: AuditMetadata) =>
  SetMetadata(AUDIT_ACTION_KEY, metadata);
