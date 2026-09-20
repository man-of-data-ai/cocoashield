import {
  BaseEntity,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class RestEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Colonne du soft delete TypeORM, créée par 20260822_soft_delete.sql.
   * Déclarée ici pour que `synchronize` (développement) ne supprime pas une
   * colonne que la migration vient de poser. Les services de cette branche
   * suppriment encore en dur : tant qu'ils n'utilisent pas `softDelete`, la
   * colonne reste nulle et les `find*` ne filtrent rien.
   */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt: Date | null;
}
