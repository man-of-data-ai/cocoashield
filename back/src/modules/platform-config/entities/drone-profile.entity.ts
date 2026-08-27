import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('drone_profile')
// L'unicité ne porte que sur les lignes vivantes : un profil supprimé ne
// doit pas empêcher de recréer le même `profile_id`.
@Index(['ownerId', 'profileId'], {
  unique: true,
  where: 'deleted_at IS NULL',
})
export class DroneProfile extends RestEntity {
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'profile_id' })
  profileId: string;

  @Column()
  manufacturer: string;

  @Column()
  model: string;

  @Column({ name: 'rtk_precision_cm', type: 'float', nullable: true })
  rtkPrecisionCm: number | null;

  @Column({ name: 'metadata_format' })
  metadataFormat: string;

  @Column({ default: true })
  active: boolean;
}
