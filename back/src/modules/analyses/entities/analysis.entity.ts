import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
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

  @OneToMany(() => AnalysisImage, (image) => image.analysis)
  images: AnalysisImage[];
}
