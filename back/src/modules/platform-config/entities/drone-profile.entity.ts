import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

@Entity('drone_profile')
@Index(['ownerId', 'profileId'], { unique: true })
export class DroneProfile extends RestEntity {
  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'profile_id' })
  profileId: string;

  @Column()
  manufacturer: string;

  @Column()
  model: string;

  @Column({ name: 'vector_type', default: 'drone_aile_tournante' })
  vectorType: string;

  @Column({ name: 'supports_rtk', default: false })
  supportsRtk: boolean;

  @Column({ name: 'rtk_precision_cm', type: 'float', nullable: true })
  rtkPrecisionCm: number | null;

  @Column({ name: 'rtk_float_precision_cm', type: 'float', nullable: true })
  rtkFloatPrecisionCm: number | null;

  @Column({ name: 'no_correction_precision_m', type: 'float', default: 0.5 })
  noCorrectionPrecisionM: number;

  @Column({ name: 'metadata_format' })
  metadataFormat: string;

  @Column({ name: 'latitude_field', default: 'XMP-drone-dji:GpsLatitude' })
  latitudeField: string;

  @Column({ name: 'longitude_field', default: 'XMP-drone-dji:GpsLongitude' })
  longitudeField: string;

  @Column({ name: 'absolute_altitude_field', type: 'varchar', nullable: true })
  absoluteAltitudeField: string | null;

  @Column({ name: 'relative_altitude_field', type: 'varchar', nullable: true })
  relativeAltitudeField: string | null;

  @Column({ name: 'orientation_fields', default: 'GimbalYawDegree,GimbalPitchDegree,GimbalRollDegree' })
  orientationFields: string;

  @Column({ name: 'timestamp_field', default: 'EXIF:DateTimeOriginal' })
  timestampField: string;

  @Column({ name: 'rtk_status_field', type: 'varchar', nullable: true })
  rtkStatusField: string | null;

  @Column({ name: 'rtk_status_mapping', type: 'text', nullable: true })
  rtkStatusMapping: string | null;

  @Column({ name: 'native_mission_export', type: 'varchar', nullable: true })
  nativeMissionExport: string | null;

  @Column({ default: true })
  active: boolean;
}
