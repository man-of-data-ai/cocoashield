import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

/**
 * Journal d'audit.
 *
 * Hérite de `deletedAt` comme toutes les entités, mais **aucun code ne le
 * supprime** : un registre d'audit effaçable ne prouve plus rien. La colonne
 * reste nulle, et aucune route n'expose de suppression.
 */
@Entity('audit_log')
export class AuditLog extends RestEntity {
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Index()
  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string | null;

  @Index()
  @Column()
  action: string;

  @Index()
  @Column({ name: 'target_type', type: 'varchar', nullable: true })
  targetType: string | null;

  @Index()
  @Column({ name: 'target_id', type: 'varchar', nullable: true })
  targetId: string | null;

  @Column({ name: 'target_label', type: 'varchar', nullable: true })
  targetLabel: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;
}
