import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('platform_settings')
@Index(['ownerId'], { unique: true, where: 'deleted_at IS NULL' })
export class PlatformSettings extends RestEntity {
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'severity_moderate', type: 'float', default: 0.1 })
  severityModerate: number;

  @Column({ name: 'severity_high', type: 'float', default: 0.25 })
  severityHigh: number;

  @Column({ name: 'severity_critical', type: 'float', default: 0.4 })
  severityCritical: number;

  @Column({ name: 'clustering_radius_m', type: 'float', default: 20 })
  clusteringRadiusM: number;

  @Column({ name: 'min_images_per_zone', type: 'int', default: 5 })
  minImagesPerZone: number;
}
