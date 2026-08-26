import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Analysis } from './analysis.entity';
import { AnalysisResult } from './analysis-result.enum';

export enum AnalysisImageSource {
  MOBILE = 'mobile',
  UPLOAD = 'upload',
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

  // Version du modèle ayant produit le résultat (inférence serveur).
  // Null pour les images pré-classifiées côté mobile tant que l'app
  // ne remonte pas cette information.
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
}
