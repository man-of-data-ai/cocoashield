import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';

/**
 * A file uploaded to "process later" (e.g. a .rar archive) — stored as-is,
 * no per-image AnalysisImage rows are created for it. Processing it into a
 * real analysis is out of scope for now.
 */
@Entity('pending_import')
export class PendingImport extends RestEntity {
  @Index()
  @Column({ name: 'parcel_id' })
  parcelId: string;

  @ManyToOne(() => Parcel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parcel_id' })
  parcel: Parcel;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string | null;
}
