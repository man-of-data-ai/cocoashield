import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Mission } from '../../missions/entities/mission.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { AnalysisImage } from './analysis-image.entity';
import { AnalysisResult } from './analysis-result.enum';

export enum AnalysisStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export { AnalysisResult };

@Entity('analysis')
export class Analysis extends RestEntity {
  @Index()
  @Column({ name: 'parcel_id' })
  parcelId: string;

  @ManyToOne(() => Parcel, (parcel) => parcel.analyses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({
    type: 'enum',
    enum: AnalysisStatus,
    default: AnalysisStatus.PENDING,
  })
  status: AnalysisStatus;

  @Column({
    type: 'enum',
    enum: AnalysisResult,
    nullable: true,
  })
  result: AnalysisResult | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'infection_percentage', type: 'float', nullable: true })
  infectionPercentage: number | null;

  @Column({ name: 'severity_level', type: 'varchar', nullable: true })
  severityLevel: string | null;

  @Column({ name: 'affected_zones', type: 'jsonb', nullable: true })
  affectedZones: Array<{
    latitude: number;
    longitude: number;
    severity: number;
    severityLevel?: 'faible' | 'modere' | 'eleve' | 'critique';
    surfaceSquareMeters?: number | null;
    geometry?: { type: 'Polygon'; coordinates: number[][][] } | null;
    infectionRate?: number;
    diagnosticCount?: number;
    averageConfidence?: number | null;
    lastDetectionAt?: string | null;
    zoneStatus?: 'active' | 'known' | 'regression';
    sourceImageIds?: string[];
  }> | null;

  @Column({ name: 'report_generated_at', type: 'timestamptz', nullable: true })
  reportGeneratedAt: Date | null;

  @Index()
  @Column({ name: 'profile_id', type: 'varchar', nullable: true })
  profileId: string | null;

  @Index()
  @Column({ name: 'mission_id', type: 'varchar', nullable: true })
  missionId: string | null;

  @ManyToOne(() => Mission, (mission) => mission.analyses, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'mission_id' })
  mission: Mission | null;

  @OneToMany(() => AnalysisImage, (image) => image.analysis)
  images: AnalysisImage[];
}
