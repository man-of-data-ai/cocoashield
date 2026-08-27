import {
  BaseEntity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Base commune à toutes les entités applicatives.
 *
 * Identifiants : UUID générés en base, jamais de séquence numérique — un id
 * séquentiel est énumérable et facilite l'accès horizontal à des ressources
 * qui ne vous appartiennent pas.
 *
 * Suppression : `deletedAt` active le **soft delete** de TypeORM. Une ligne
 * supprimée reste en base et disparaît automatiquement de tous les `find*`
 * (TypeORM ajoute `deleted_at IS NULL`). Pour la voir explicitement, il faut
 * passer `withDeleted: true` — l'oubli ferme l'accès, il ne l'ouvre pas.
 */
export abstract class RestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
