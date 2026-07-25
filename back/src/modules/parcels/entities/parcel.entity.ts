import { Column, Entity, Index, OneToMany } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Analysis } from '../../analyses/entities/analysis.entity';
import { PendingImport } from '../../analyses/entities/pending-import.entity';

export enum ParcelStatus {
  NOT_ANALYZED = 'not_analyzed',
  ANALYZING = 'analyzing',
  SICK = 'sick',
  HEALTHY = 'healthy',
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

@Entity('parcel')
export class Parcel extends RestEntity {
  @Index()
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column()
  name: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  boundary: PolygonGeometry;

  @Column({
    type: 'enum',
    enum: ParcelStatus,
    default: ParcelStatus.NOT_ANALYZED,
  })
  status: ParcelStatus;

  @OneToMany(() => Analysis, (analysis) => analysis.parcel)
  analyses: Analysis[];

  @OneToMany(() => PendingImport, (pendingImport) => pendingImport.parcel)
  imports: PendingImport[];
}
