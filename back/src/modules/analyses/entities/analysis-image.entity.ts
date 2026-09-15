import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Analysis } from './analysis.entity';
import { AnalysisResult } from './analysis-result.enum';

export enum AnalysisImageSource {
  DRONE = 'drone',
  ROBOT = 'robot',
  MOBILE = 'mobile',
  UPLOAD = 'upload', // compatibilité des anciens imports web ; le profileId précise le vecteur réel
}

export enum AnalysisImageStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

/**
 * Fiabilité de la position géographique attachée à l'image :
 * - PRECISE : coordonnées GPS lues depuis les métadonnées EXIF du fichier.
 * - APPROXIMATE : position fournie par une source dont la précision est limitée.
 * - NONE : aucune coordonnée géographique fiable disponible.
 */
export enum GeolocationQuality {
  RTK_FIX = 'rtk_fix',
  RTK_FLOAT = 'rtk_float',
  GNSS_ONLY = 'gnss_seul',
  MANUAL = 'saisie_manuelle',
  PRECISE = 'precise',
  APPROXIMATE = 'approximate',
  NONE = 'none',
}

@Entity('analysis_image')
export class AnalysisImage extends RestEntity {
  @Index()
  @Column({ name: 'analysis_id' })
  analysisId: string;

  @ManyToOne(() => Analysis, (analysis) => analysis.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis: Analysis;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ type: 'enum', enum: AnalysisImageSource })
  source: AnalysisImageSource;

  @Column({
    type: 'enum',
    enum: AnalysisImageStatus,
    default: AnalysisImageStatus.PENDING,
  })
  status: AnalysisImageStatus;

  @Column({
    type: 'enum',
    enum: AnalysisResult,
    nullable: true,
  })
  result: AnalysisResult | null;

  @Column({ type: 'float', nullable: true })
  confidence: number | null;

  /**
   * Version du modèle ayant produit `result` (colonne posée par
   * 20260826_model_version.sql). Reste nulle tant que l'inférence ONNX n'est
   * pas rétablie sur cette branche, mais la colonne porte des valeurs en
   * production : la déclarer évite que `synchronize` la supprime en dev.
   */
  @Column({ name: 'model_version', type: 'varchar', nullable: true })
  modelVersion: string | null;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({
    name: 'geolocation_quality',
    type: 'enum',
    enum: GeolocationQuality,
    default: GeolocationQuality.NONE,
  })
  geolocationQuality: GeolocationQuality;

  @Column({ name: 'altitude_m', type: 'float', nullable: true })
  altitudeM: number | null;

  @Column({ name: 'gimbal_yaw', type: 'float', nullable: true })
  gimbalYaw: number | null;

  @Column({ name: 'gimbal_pitch', type: 'float', nullable: true })
  gimbalPitch: number | null;

  @Column({ name: 'gimbal_roll', type: 'float', nullable: true })
  gimbalRoll: number | null;

  @Column({ name: 'capture_timestamp', type: 'timestamptz', nullable: true })
  captureTimestamp: Date | null;

  @Column({ name: 'geolocation_precision_m', type: 'float', nullable: true })
  geolocationPrecisionM: number | null;
}
