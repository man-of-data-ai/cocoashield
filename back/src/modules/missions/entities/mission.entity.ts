import { Column, Entity, Index, OneToMany } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Analysis } from '../../analyses/entities/analysis.entity';

/**
 * Une mission représente une campagne de collecte terrain (ex: "Tournée
 * Nord - Semaine 12") regroupant une ou plusieurs analyses réalisées à
 * cette occasion. Permet de filtrer la carte par campagne plutôt que
 * uniquement par parcelle ou par date brute.
 */
@Entity('mission')
export class Mission extends RestEntity {
  @Index()
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column()
  name: string;

  /** Date de la mission (par défaut, date de création si non fournie). */
  @Column({ name: 'mission_date', type: 'timestamptz', nullable: true })
  missionDate: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Analysis, (analysis) => analysis.mission)
  analyses: Analysis[];
}
