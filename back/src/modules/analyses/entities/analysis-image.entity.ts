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
}
