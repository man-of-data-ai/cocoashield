import { Column, Entity, Index } from 'typeorm';
import { RestEntity } from '../../../libs/infrastructure/persistence/entities/rest.entity';

export enum UserRole {
  ADMINISTRATEUR = 'administrateur',
  DIRECTION_CCC = 'direction_ccc',
  AGRONOME_TERRAIN = 'agronome_terrain',
  OPERATEUR_TERRAIN = 'operateur_terrain',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('app_user_profile')
export class UserProfile extends RestEntity {
  @Index({ unique: true })
  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGRONOME_TERRAIN })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  cooperative: string | null;

  @Index()
  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  organizationId: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'is_platform_admin', default: false })
  isPlatformAdmin: boolean;
}
