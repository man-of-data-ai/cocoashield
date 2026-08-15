import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('drone_profile')
@Index(['ownerId', 'profileId'], { unique: true })
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
