import { Column, Entity, Index, OneToMany } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';
import { Analysis } from '../../analyses/entities/analysis.entity';

export enum TerrainVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FALSE_POSITIVE = 'false_positive',
}

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

  @Column({
    name: 'terrain_verification_status',
    type: 'enum',
    enum: TerrainVerificationStatus,
    default: TerrainVerificationStatus.PENDING,
  })
  terrainVerificationStatus: TerrainVerificationStatus;

  @Column({
    name: 'terrain_verification_comment',
    type: 'text',
    nullable: true,
  })
  terrainVerificationComment: string | null;

  @Column({ name: 'terrain_verified_at', type: 'timestamptz', nullable: true })
  terrainVerifiedAt: Date | null;

  @OneToMany(() => Analysis, (analysis) => analysis.parcel)
  analyses: Analysis[];
}
