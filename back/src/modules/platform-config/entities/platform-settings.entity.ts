import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('platform_settings')
@Index(['ownerId'], { unique: true })
export class PlatformSettings extends RestEntity {
  @Column({ name: 'owner_id' }) ownerId: string;
  @Column({ name: 'severity_low', type: 'float', default: 0 }) severityLow: number;
  @Column({ name: 'severity_moderate', type: 'float', default: 0.1 }) severityModerate: number;
  @Column({ name: 'severity_high', type: 'float', default: 0.25 }) severityHigh: number;
  @Column({ name: 'severity_critical', type: 'float', default: 0.4 }) severityCritical: number;
  @Column({ name: 'minimum_confidence', type: 'float', default: 0.75 }) minimumConfidence: number;
  @Column({ name: 'clustering_radius_m', type: 'float', default: 20 }) clusteringRadiusM: number;
  @Column({ name: 'min_images_per_zone', type: 'int', default: 5 }) minImagesPerZone: number;
  @Column({ name: 'dedup_distance_m', type: 'float', default: 2 }) dedupDistanceM: number;
  @Column({ name: 'dedup_window_s', type: 'int', default: 10 }) dedupWindowS: number;
  @Column({ name: 'refresh_interval_connected_s', type: 'int', default: 2 }) refreshIntervalConnectedS: number;
  @Column({ name: 'batch_recalc_max_delay_min', type: 'int', default: 5 }) batchRecalcMaxDelayMin: number;
  @Column({ name: 'sync_retry_interval_min', type: 'int', default: 15 }) syncRetryIntervalMin: number;
  @Column({ name: 'offline_tile_cache_size_mb', type: 'int', default: 250 }) offlineTileCacheSizeMb: number;
  @Column({ name: 'history_retention_months', type: 'int', default: 36 }) historyRetentionMonths: number;
  @Column({ name: 'session_duration_minutes', type: 'int', default: 60 }) sessionDurationMinutes: number;
}
