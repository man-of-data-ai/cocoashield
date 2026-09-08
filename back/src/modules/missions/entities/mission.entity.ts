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

  @Index()
  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  organizationId: string | null;

  @Column()
  name: string;

  @Column({ name: 'mission_date', type: 'timestamptz' })
  missionDate: Date;

  @Column({ name: 'drone_profile_id', type: 'varchar', nullable: true })
  droneProfileId: string | null;

  @Column({ name: 'parcel_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  parcelIds: string[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => Analysis, (analysis) => analysis.mission)
  analyses: Analysis[];
}
