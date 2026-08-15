import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

export enum ExportScope {
  ZONE = 'zone',
  MISSION = 'mission',
  PERIOD = 'period',
}

export enum ExportFormat {
  GEOJSON = 'geojson',
  SHAPEFILE = 'shapefile',
  KML_KMZ = 'kml-kmz',
  CSV = 'csv',
  PDF = 'pdf',
}

@Entity('exports')
export class ExportRecord extends RestEntity {
  @Index()
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string | null;

  @Column({ type: 'enum', enum: ExportScope })
  scope: ExportScope;

  @Column({ name: 'scope_label' })
  scopeLabel: string;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ name: 'include_source_images', default: false })
  includeSourceImages: boolean;

  @Column({ name: 'verified_only', default: false })
  verifiedOnly: boolean;
}
